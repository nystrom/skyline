/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { WeatherData } from '../../../types';
import { fetchWithRateLimit } from '../../http';
import { isApiKeyValid } from '../../validation';
import { TARGET_FORECAST_DAYS } from '../forecastConstants';
import { buildForecast } from '../forecastNormalize';
import { getMoonriseMoonset } from '../moonUtils';
import type { ProviderFetchContext, ProviderRawBundle, RawHourlySlot, StandardDailyPoint, WeatherLocationInput } from '../sharedTypes';
import type { WeatherProviderAdapter } from '../providerTypes';

function iconMap(oWeatherIcon: string): string {
  if (oWeatherIcon.startsWith('01')) return 'sun';
  if (oWeatherIcon.startsWith('02')) return 'cloud';
  if (oWeatherIcon.startsWith('03') || oWeatherIcon.startsWith('04')) return 'cloud';
  if (oWeatherIcon.startsWith('09') || oWeatherIcon.startsWith('10')) return 'cloud-rain';
  if (oWeatherIcon.startsWith('11')) return 'cloud-lightning';
  if (oWeatherIcon.startsWith('13')) return 'snowflake';
  if (oWeatherIcon.startsWith('50')) return 'cloud';
  return 'cloud';
}

async function fetchOpenWeatherRawBundle(
  location: WeatherLocationInput,
  apiKey: string,
  signal?: AbortSignal
): Promise<ProviderRawBundle> {
  const { lat, lon, label, country } = location;
  const cityResolved = label.split(',')[0].trim();
  const countryResolved = country || '';
  const cleanKey = apiKey.trim();
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${cleanKey}&units=metric`;
  const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${cleanKey}&units=metric`;

  const [forecastRes, currentRes] = await Promise.all([
    fetchWithRateLimit('openweather', forecastUrl, { signal }),
    fetchWithRateLimit('openweather', currentUrl, { signal }),
  ]);

  if (!forecastRes.ok || !currentRes.ok) {
    const failedRes = !forecastRes.ok ? forecastRes : currentRes;
    if (failedRes.status === 401) {
      throw new Error('Invalid OpenWeather API Key (401). Check your key or try keyless providers.');
    }
    if (failedRes.status === 429) {
      throw new Error('OpenWeather rate limit reached (429). Please try again soon.');
    }
    throw new Error(`OpenWeather API Error (${failedRes.status}).`);
  }

  const forecastData = await forecastRes.json();
  const currentData = await currentRes.json();
  const list = forecastData.list as Array<Record<string, unknown>>;
  const timezoneOffsetSec = (forecastData.city as { timezone?: number })?.timezone || 0;

  const rawHourly: RawHourlySlot[] = [];
  list.forEach((item) => {
    const main = item.main as Record<string, number>;
    const weather = (item.weather as Array<{ main?: string; icon?: string }>) || [];
    const wind = item.wind as { speed: number; deg: number };
    const rain = item.rain as Record<string, number> | undefined;
    const snow = item.snow as Record<string, number> | undefined;
    const rainHour = rain?.['3h'] || rain?.['1h'] || 0;
    const snowHour = snow?.['3h'] || snow?.['1h'] || 0;
    rawHourly.push({
      time: new Date((item.dt as number) * 1000),
      temp: main.temp,
      description: weather[0]?.main || 'Clear',
      iconName: iconMap(weather[0]?.icon || '01d'),
      windSpeed: wind.speed,
      windDeg: wind.deg,
      precipProb: ((item.pop as number) || 0) * 100,
      precipAccum: rainHour + snowHour,
      humidity: main.humidity,
    });
  });

  const groupedDays: Record<string, typeof list> = {};
  list.forEach((item) => {
    const localDate = new Date(((item.dt as number) + timezoneOffsetSec) * 1000);
    const dayKey = localDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    if (!groupedDays[dayKey]) groupedDays[dayKey] = [];
    groupedDays[dayKey].push(item);
  });

  const dayKeys = Object.keys(groupedDays).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  const dailyPoints: StandardDailyPoint[] = [];

  for (let d = 0; d < Math.min(TARGET_FORECAST_DAYS, dayKeys.length); d++) {
    const items = groupedDays[dayKeys[d]];
    let tempMin = Infinity;
    let tempMax = -Infinity;
    let maxPrecipProb = 0;
    let totalPrecipAccum = 0;
    let totalWindSpeed = 0;
    let avgWindDeg = 0;

    items.forEach((it) => {
      const main = it.main as Record<string, number>;
      const wind = it.wind as { speed: number; deg: number };
      const rain = it.rain as Record<string, number> | undefined;
      const snow = it.snow as Record<string, number> | undefined;
      if (main.temp_min < tempMin) tempMin = main.temp_min;
      if (main.temp_max > tempMax) tempMax = main.temp_max;
      if (it.pop && (it.pop as number) > maxPrecipProb) maxPrecipProb = it.pop as number;
      totalPrecipAccum += (rain?.['3h'] || rain?.['1h'] || 0) + (snow?.['3h'] || snow?.['1h'] || 0);
      totalWindSpeed += wind.speed;
      avgWindDeg = wind.deg;
    });

    const repItem = items[Math.floor(items.length / 2)] || items[0];
    const dateObj = new Date((repItem.dt as number) * 1000);
    const sys = currentData.sys as { sunrise?: number; sunset?: number };
    const sunriseTime = new Date((sys?.sunrise || Date.now() / 1000 - 15000) * 1000);
    const sunsetTime = new Date((sys?.sunset || Date.now() / 1000 + 15000) * 1000);
    const daySunrise = new Date(dateObj);
    daySunrise.setHours(sunriseTime.getHours(), sunriseTime.getMinutes(), sunriseTime.getSeconds());
    const daySunset = new Date(dateObj);
    daySunset.setHours(sunsetTime.getHours(), sunsetTime.getMinutes(), sunsetTime.getSeconds());
    const { moonriseTime, moonsetTime } = getMoonriseMoonset(dateObj, d);
    const repWeather = (repItem.weather as Array<{ description?: string; icon?: string }>) || [];

    dailyPoints.push({
      date: dateObj,
      tempMin: tempMin === Infinity ? (currentData.main as { temp_min: number }).temp_min : tempMin,
      tempMax: tempMax === -Infinity ? (currentData.main as { temp_max: number }).temp_max : tempMax,
      description: repWeather[0]?.description || 'Clear sky',
      iconName: iconMap(repWeather[0]?.icon || '01d'),
      precipProb: maxPrecipProb * 100,
      precipAccum: totalPrecipAccum,
      windSpeed: totalWindSpeed / items.length,
      windDeg: avgWindDeg,
      sunrise: daySunrise,
      sunset: daySunset,
      moonrise: moonriseTime,
      moonset: moonsetTime,
    });
  }

  const sys = currentData.sys as { sunrise?: number; sunset?: number; country?: string };
  const curMain = currentData.main as Record<string, number>;
  const curWeather = (currentData.weather as Array<{ description?: string; icon?: string }>) || [];
  const curWind = currentData.wind as { speed: number; deg: number };
  const curRain = currentData.rain as Record<string, number> | undefined;
  const curSnow = currentData.snow as Record<string, number> | undefined;
  const currentSunrise = new Date((sys?.sunrise || Date.now() / 1000 - 15000) * 1000);
  const currentSunset = new Date((sys?.sunset || Date.now() / 1000 + 15000) * 1000);
  const { moonriseTime: curMoonrise, moonsetTime: curMoonset } = getMoonriseMoonset(new Date(), 0);
  const currentPrecip = (curRain?.['1h'] || curRain?.['3h'] || 0) + (curSnow?.['1h'] || curSnow?.['3h'] || 0);

  return {
    rawHourly,
    dailyPoints,
    currentTemp: curMain.temp,
    current: {
      temp: Math.round(curMain.temp),
      description: curWeather[0]?.description || 'Clear',
      iconName: iconMap(curWeather[0]?.icon || '01d'),
      humidity: curMain.humidity,
      windSpeed: curWind.speed,
      windDeg: curWind.deg,
      precipProb: Math.round(((list[0]?.pop as number) || 0) * 100),
      precipAccum: currentPrecip,
      feelsLike: Math.round(curMain.feels_like),
      sunriseTime: currentSunrise,
      sunsetTime: currentSunset,
      moonriseTime: curMoonrise,
      moonsetTime: curMoonset,
    },
  };
}

async function fetchOpenWeatherData(
  location: WeatherLocationInput,
  apiKey: string,
  signal?: AbortSignal
): Promise<WeatherData> {
  const { lat, lon, label, country } = location;
  const cityResolved = label.split(',')[0].trim();
  const countryResolved = country || '';
  const bundle = await fetchOpenWeatherRawBundle(location, apiKey, signal);
  const { data } = buildForecast({
    location: { lat, lon, label, country },
    ...bundle,
  });

  return {
    ...data,
    city: cityResolved,
    country: countryResolved,
  };
}

export const openWeatherAdapter: WeatherProviderAdapter = {
  id: 'openweather',
  async fetchRaw(location, ctx) {
    if (!ctx.apiKey || !isApiKeyValid(ctx.apiKey)) {
      throw new Error('OpenWeather API Key is not set or invalid.');
    }
    return fetchOpenWeatherRawBundle(location, ctx.apiKey, ctx.signal);
  },
  async fetch(location, ctx) {
    if (!ctx.apiKey || !isApiKeyValid(ctx.apiKey)) {
      throw new Error('OpenWeather API Key is not set or invalid.');
    }
    return fetchOpenWeatherData(location, ctx.apiKey, ctx.signal);
  },
};

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

import { owIconToKind, owIdToKind, owWeatherArrayToKind, weatherKindToIcon } from '../weatherKind';

function iconMap(oWeatherIcon: string): string {
  return weatherKindToIcon(owIconToKind(oWeatherIcon), oWeatherIcon.endsWith('d'));
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
    const weather = (item.weather as Array<{ id?: number; main?: string; description?: string; icon?: string }>) || [];
    const wind = item.wind as { speed: number; deg: number };
    const rain = item.rain as Record<string, number> | undefined;
    const snow = item.snow as Record<string, number> | undefined;
    const rainHour = rain?.['3h'] || rain?.['1h'] || 0;
    const snowHour = snow?.['3h'] || snow?.['1h'] || 0;
    const owIcon = weather[0]?.icon || '01d';

    const kind = owWeatherArrayToKind(weather);
    const selectedElement = weather.find((w) => w.id !== undefined && owIdToKind(w.id) === kind) || weather[0];
    const description = selectedElement?.description || selectedElement?.main || 'Clear';
    const isDay = owIcon.endsWith('d');
    const iconName = weatherKindToIcon(kind, isDay);

    rawHourly.push({
      time: new Date((item.dt as number) * 1000),
      temp: main.temp,
      kind,
      description,
      iconName,
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
    const repWeather = (repItem.weather as Array<{ id?: number; description?: string; main?: string; icon?: string }>) || [];
    const repIcon = repWeather[0]?.icon || '01d';

    const kind = owWeatherArrayToKind(repWeather);
    const selectedElement = repWeather.find((w) => w.id !== undefined && owIdToKind(w.id) === kind) || repWeather[0];
    const description = selectedElement?.description || selectedElement?.main || 'Clear sky';
    const isDay = repIcon.endsWith('d');
    const iconName = weatherKindToIcon(kind, isDay);

    dailyPoints.push({
      date: dateObj,
      tempMin: tempMin === Infinity ? (currentData.main as { temp_min: number }).temp_min : tempMin,
      tempMax: tempMax === -Infinity ? (currentData.main as { temp_max: number }).temp_max : tempMax,
      kind,
      description,
      iconName,
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
  const curWeather = (currentData.weather as Array<{ id?: number; description?: string; main?: string; icon?: string }>) || [];
  const curWind = currentData.wind as { speed: number; deg: number };
  const curRain = currentData.rain as Record<string, number> | undefined;
  const curSnow = currentData.snow as Record<string, number> | undefined;
  const currentSunrise = new Date((sys?.sunrise || Date.now() / 1000 - 15000) * 1000);
  const currentSunset = new Date((sys?.sunset || Date.now() / 1000 + 15000) * 1000);
  const { moonriseTime: curMoonrise, moonsetTime: curMoonset } = getMoonriseMoonset(new Date(), 0);
  const currentPrecip = (curRain?.['1h'] || curRain?.['3h'] || 0) + (curSnow?.['1h'] || curSnow?.['3h'] || 0);

  const curIcon = curWeather[0]?.icon || '01d';
  const curKind = owWeatherArrayToKind(curWeather);
  const curSelectedElement = curWeather.find((w) => w.id !== undefined && owIdToKind(w.id) === curKind) || curWeather[0];
  const curDescription = curSelectedElement?.description || curSelectedElement?.main || 'Clear';
  const curIsDay = curIcon.endsWith('d');
  const curIconName = weatherKindToIcon(curKind, curIsDay);

  return {
    rawHourly,
    dailyPoints,
    currentTemp: curMain.temp,
    timeZoneOffsetMinutes: Math.round(timezoneOffsetSec / 60),
    current: {
      temp: Math.round(curMain.temp),
      description: curDescription,
      iconName: curIconName,
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

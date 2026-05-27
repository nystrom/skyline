/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { WeatherData } from '../../types';
import { fetchWithRateLimit } from '../http';
import { TARGET_FORECAST_DAYS } from './forecastConstants';
import { buildForecast, mergeOpenMeteoHourlyRaw } from './forecastNormalize';
import { getMoonriseMoonset } from './moonUtils';
import { coalesceNumber } from './numbers';
import type { ProviderRawBundle, StandardDailyPoint, WeatherLocationInput } from './sharedTypes';
import { wmoToDesc, wmoToIcon } from './wmoUtils';

const BASE_PARAMS =
  'current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day,cloud_cover&hourly=temperature_2m,relative_humidity_2m,weather_code,precipitation_probability,precipitation,is_day,cloud_cover,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,wind_speed_10m_max,wind_direction_10m_dominant&timezone=auto&forecast_days=16&wind_speed_unit=ms&timeformat=unixtime';

interface ExtensionDay {
  time: number;
  weather_code: number;
  temp_max: number;
  temp_min: number;
  precip_prob: number;
  sunrise: number;
  sunset: number;
  wind_speed: number;
  wind_deg: number;
}

function parseOpenMeteoRawBundle(
  primaryData: {
    current: Record<string, number>;
    hourly: Record<string, Array<number | null>>;
    daily: Record<string, number[]>;
  },
  extensionDays: ExtensionDay[]
): ProviderRawBundle {
  const current = primaryData.current;
  const hourly = primaryData.hourly;
  const daily = primaryData.daily;

  const rawHourly = mergeOpenMeteoHourlyRaw(hourly, wmoToDesc, wmoToIcon);

  const primaryDailyPoints: StandardDailyPoint[] = daily.time.map((t: number, i: number) => {
    const d = new Date(t * 1000);
    const dk = d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const extMatch = extensionDays.find((ext) => {
      const extDate = new Date(ext.time * 1000);
      return extDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) === dk;
    });
    const sunriseVal = extMatch
      ? new Date(extMatch.sunrise * 1000)
      : daily.sunrise?.[i]
        ? new Date(daily.sunrise[i] * 1000)
        : new Date(d.getTime() + 6 * 3600 * 1000);
    const sunsetVal = extMatch
      ? new Date(extMatch.sunset * 1000)
      : daily.sunset?.[i]
        ? new Date(daily.sunset[i] * 1000)
        : new Date(d.getTime() + 18 * 3600 * 1000);
    const { moonriseTime, moonsetTime } = getMoonriseMoonset(d, i);
    return {
      date: d,
      tempMin: coalesceNumber(daily.temperature_2m_min[i], NaN),
      tempMax: coalesceNumber(daily.temperature_2m_max[i], NaN),
      description: wmoToDesc(coalesceNumber(daily.weather_code[i], 0)),
      iconName: wmoToIcon(coalesceNumber(daily.weather_code[i], 0), true),
      precipProb: coalesceNumber(daily.precipitation_probability_max[i]),
      precipAccum: 0,
      windSpeed: coalesceNumber(daily.wind_speed_10m_max[i]),
      windDeg: coalesceNumber(daily.wind_direction_10m_dominant[i]),
      sunrise: sunriseVal,
      sunset: sunsetVal,
      moonrise: moonriseTime,
      moonset: moonsetTime,
    };
  });

  const validPrimary = primaryDailyPoints.filter(
    (d) => Number.isFinite(d.tempMin) && Number.isFinite(d.tempMax)
  );
  const lastValidT =
    validPrimary.length > 0 ? Math.floor(validPrimary[validPrimary.length - 1].date.getTime() / 1000) : 0;
  const mergedDailyPoints = [...validPrimary];
  extensionDays.forEach((ext) => {
    if (ext.time > lastValidT && mergedDailyPoints.length < TARGET_FORECAST_DAYS) {
      const d = new Date(ext.time * 1000);
      const { moonriseTime, moonsetTime } = getMoonriseMoonset(d, mergedDailyPoints.length);
      mergedDailyPoints.push({
        date: d,
        tempMin: ext.temp_min,
        tempMax: ext.temp_max,
        description: wmoToDesc(ext.weather_code),
        iconName: wmoToIcon(ext.weather_code, true),
        precipProb: ext.precip_prob || 0,
        precipAccum: 0,
        windSpeed: ext.wind_speed,
        windDeg: ext.wind_deg,
        sunrise: new Date(ext.sunrise * 1000),
        sunset: new Date(ext.sunset * 1000),
        moonrise: moonriseTime,
        moonset: moonsetTime,
      });
    }
  });

  const firstDay = mergedDailyPoints[0];

  return {
    rawHourly,
    dailyPoints: mergedDailyPoints,
    currentTemp: coalesceNumber(current.temperature_2m),
    current: {
      temp: Math.round(coalesceNumber(current.temperature_2m)),
      description: wmoToDesc(coalesceNumber(current.weather_code, 0)),
      iconName: wmoToIcon(coalesceNumber(current.weather_code, 0), current.is_day === 1),
      humidity: coalesceNumber(current.relative_humidity_2m, 60),
      windSpeed: coalesceNumber(current.wind_speed_10m),
      windDeg: coalesceNumber(current.wind_direction_10m),
      precipProb: firstDay ? Math.round(firstDay.precipProb) : 0,
      precipAccum: 0,
      feelsLike: Math.round(coalesceNumber(current.temperature_2m)),
      sunriseTime: firstDay ? firstDay.sunrise : new Date(Date.now() - 15000),
      sunsetTime: firstDay ? firstDay.sunset : new Date(Date.now() + 15000),
      moonriseTime: firstDay?.moonrise,
      moonsetTime: firstDay?.moonset,
    },
  };
}

async function fetchExtensionDays(lat: number, lon: number, rateLimitKey: string): Promise<ExtensionDay[]> {
  try {
    const extUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,wind_speed_10m_max,wind_direction_10m_dominant&timezone=auto&forecast_days=16&wind_speed_unit=ms&timeformat=unixtime&models=best_match`;
    const extRes = await fetchWithRateLimit(rateLimitKey, extUrl);
    if (!extRes.ok) return [];
    const extData = await extRes.json();
    if (!extData?.daily) return [];
    return extData.daily.time.map((t: number, i: number) => ({
      time: t,
      weather_code: extData.daily.weather_code?.[i] ?? 0,
      temp_max: extData.daily.temperature_2m_max?.[i] ?? 15,
      temp_min: extData.daily.temperature_2m_min?.[i] ?? 10,
      precip_prob: extData.daily.precipitation_probability_max?.[i] ?? 0,
      sunrise: extData.daily.sunrise?.[i] ?? t + 6 * 3600,
      sunset: extData.daily.sunset?.[i] ?? t + 18 * 3600,
      wind_speed: extData.daily.wind_speed_10m_max?.[i] ?? 0,
      wind_deg: extData.daily.wind_direction_10m_dominant?.[i] ?? 0,
    }));
  } catch (e) {
    console.warn('Open-Meteo extension fetch failed', e);
    return [];
  }
}

export async function fetchOpenMeteoRawBundle(
  location: WeatherLocationInput,
  options: {
    rateLimitKey: string;
    primaryUrls: string[];
    errorLabel: string;
    signal?: AbortSignal;
  }
): Promise<ProviderRawBundle> {
  const { lat, lon } = location;
  let primaryData: Record<string, unknown> | null = null;
  let lastError = '';

  for (const url of options.primaryUrls) {
    try {
      const res = await fetchWithRateLimit(options.rateLimitKey, url, { signal: options.signal });
      if (res.ok) {
        const json = (await res.json()) as Record<string, unknown>;
        if (json.error === true) {
          lastError =
            typeof json.reason === 'string' ? json.reason : `${options.errorLabel} returned no data`;
          continue;
        }
        if (!json.hourly || !json.daily || !json.current) {
          lastError = `${options.errorLabel} response missing forecast fields`;
          continue;
        }
        primaryData = json;
        break;
      }
      lastError = `${options.errorLabel} status: ${res.status}`;
    } catch (e: unknown) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  if (!primaryData) {
    throw new Error(`${options.errorLabel} fetch failed. Details: ${lastError}`);
  }

  const extensionDays = await fetchExtensionDays(lat, lon, options.rateLimitKey);
  return parseOpenMeteoRawBundle(
    primaryData as {
      current: Record<string, number>;
      hourly: Record<string, Array<number | null>>;
      daily: Record<string, number[]>;
    },
    extensionDays
  );
}

export async function fetchOpenMeteoForecast(
  location: WeatherLocationInput,
  options: {
    rateLimitKey: string;
    primaryUrls: string[];
    errorLabel: string;
    signal?: AbortSignal;
  }
): Promise<WeatherData> {
  const bundle = await fetchOpenMeteoRawBundle(location, options);
  const { data } = buildForecast({
    location,
    ...bundle,
  });
  return data;
}

export function openMeteoForecastUrl(lat: number, lon: number, models?: string): string {
  const base = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&${BASE_PARAMS}`;
  return models ? `${base}&models=${models}` : base;
}

export function openMeteoArpaeUrl(lat: number, lon: number): string {
  return `https://api.open-meteo.com/v1/arpae?latitude=${lat}&longitude=${lon}&${BASE_PARAMS}`;
}

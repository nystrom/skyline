/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { WeatherData } from '../../types';
import { assembleTimelineAndForecasts } from './assembleTimeline';
import {
  MIN_REAL_HOURS_PER_DAY,
  TARGET_FORECAST_DAYS,
} from './forecastConstants';
import { coalesceNumber } from './numbers';
import {
  hourKey,
  interpolateAngleDeg,
  interpolateLinear,
} from './dateUtils';
import { formatDayKeyAtLocation } from '../../utils/unitConverter';
import type {
  ForecastBuildInput,
  ForecastBuildResult,
  RawHourlySlot,
  StandardDailyPoint,
  StandardHourlyPoint,
} from './sharedTypes';
import { wmoCodeToKind, weatherKindToIcon, WeatherKind, weatherKindToDesc } from './weatherKind';
import { wmoToDesc, wmoToIcon } from './wmoUtils';

function isObservedSlot(slot: RawHourlySlot): boolean {
  return slot.temp != null && Number.isFinite(slot.temp);
}

export function mergeRawHourlyLayers(layers: RawHourlySlot[][]): RawHourlySlot[] {
  if (layers.length === 0) return [];
  const observed = new Map<number, RawHourlySlot>();
  const allKeys = new Set<number>();

  for (const layer of layers) {
    for (const slot of layer) {
      allKeys.add(hourKey(slot.time));
    }
  }

  for (let i = layers.length - 1; i >= 0; i--) {
    for (const slot of layers[i]) {
      if (!isObservedSlot(slot)) continue;
      observed.set(hourKey(slot.time), slot);
    }
  }

  return [...allKeys].sort((a, b) => a - b).map((k) => {
    const hit = observed.get(k);
    if (hit) return hit;
    return {
      time: new Date(k),
      temp: null,
      windSpeed: null,
      windDeg: null,
      precipProb: null,
      precipAccum: null,
      humidity: null,
    };
  });
}

export function mergeDailyLayers(
  layers: StandardDailyPoint[][],
  timeZone?: string,
  timeZoneOffsetMinutes?: number
): StandardDailyPoint[] {
  if (layers.length === 0) return [];
  const byDay = new Map<string, StandardDailyPoint>();
  const tzOpts = { timeZone, offsetMinutes: timeZoneOffsetMinutes };

  for (let i = layers.length - 1; i >= 0; i--) {
    for (const day of layers[i]) {
      const key = formatDayKeyAtLocation(day.date, tzOpts);
      if (!byDay.has(key)) byDay.set(key, day);
    }
  }

  for (const day of layers[0]) {
    byDay.set(formatDayKeyAtLocation(day.date, tzOpts), day);
  }

  return [...byDay.values()]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, TARGET_FORECAST_DAYS);
}

function rawSlotToStandard(slot: RawHourlySlot, interpolated: boolean): StandardHourlyPoint {
  const code = coalesceNumber(slot.weatherCode, 0);
  const isDay = slot.isDay === true;
  const kind = slot.kind ?? wmoCodeToKind(code);

  let description = weatherKindToDesc(kind);
  const precipProb = coalesceNumber(slot.precipProb);

  const isRainKind = [
    WeatherKind.Drizzle,
    WeatherKind.RainLight,
    WeatherKind.RainModerate,
    WeatherKind.RainHeavy,
    WeatherKind.Showers,
    WeatherKind.FreezingRain,
    WeatherKind.Sleet,
    WeatherKind.IcePellets
  ].includes(kind);

  if (isRainKind) {
    if (precipProb < 30) {
      description = 'Slight chance of rain';
    } else if (precipProb < 50) {
      description = 'Chance of rain';
    } else if (precipProb < 75) {
      description = 'Likely rain';
    } else {
      description = 'Rain';
    }
  }

  return {
    time: slot.time,
    temp: coalesceNumber(slot.temp),
    kind,
    description,
    iconName: slot.iconName ?? weatherKindToIcon(kind, isDay),
    windSpeed: coalesceNumber(slot.windSpeed),
    windDeg: coalesceNumber(slot.windDeg),
    precipProb,
    precipAccum: coalesceNumber(slot.precipAccum),
    humidity: coalesceNumber(slot.humidity, 60),
    interpolated,
  };
}

function findDailyForTime(
  daily: StandardDailyPoint[],
  timeMs: number,
  timeZone?: string,
  timeZoneOffsetMinutes?: number
): StandardDailyPoint | undefined {
  const tzOpts = { timeZone, offsetMinutes: timeZoneOffsetMinutes };
  const key = formatDayKeyAtLocation(new Date(timeMs), tzOpts);
  return daily.find((d) => formatDayKeyAtLocation(d.date, tzOpts) === key);
}

function findNearestObserved(
  anchorMap: Map<number, RawHourlySlot>,
  sortedKeys: number[],
  timeMs: number,
  direction: 'before' | 'after'
): RawHourlySlot | null {
  if (direction === 'before') {
    for (let i = sortedKeys.length - 1; i >= 0; i--) {
      if (sortedKeys[i] < timeMs) return anchorMap.get(sortedKeys[i]) ?? null;
    }
    return null;
  }
  for (const k of sortedKeys) {
    if (k > timeMs) return anchorMap.get(k) ?? null;
  }
  return null;
}

export function interpolateHourlyGrid(
  raw: RawHourlySlot[],
  daily: StandardDailyPoint[],
  numDays: number,
  timeZone?: string,
  timeZoneOffsetMinutes?: number
): StandardHourlyPoint[] {
  const anchorMap = new Map<number, RawHourlySlot>();
  raw.forEach((slot) => {
    if (isObservedSlot(slot)) {
      anchorMap.set(hourKey(slot.time), slot);
    }
  });
  const sortedKeys = [...anchorMap.keys()].sort((a, b) => a - b);

  if (daily.length === 0 || sortedKeys.length === 0) {
    return raw.filter(isObservedSlot).map((s) => rawSlotToStandard(s, false));
  }

  const gridStart = daily[0].date;

  const lastDay = daily[Math.min(numDays, daily.length) - 1];
  const gridEnd = new Date(lastDay.date);
  gridEnd.setHours(23, 0, 0, 0);

  const result: StandardHourlyPoint[] = [];

  for (let t = gridStart.getTime(); t <= gridEnd.getTime(); t += 3600_000) {
    const existing = anchorMap.get(t);
    if (existing) {
      result.push(rawSlotToStandard(existing, false));
      continue;
    }

    const prevKey = sortedKeys.filter((k) => k < t).pop();
    const nextKey = sortedKeys.find((k) => k > t);
    const prev = prevKey != null ? anchorMap.get(prevKey)! : null;
    const next = nextKey != null ? anchorMap.get(nextKey)! : null;
    const skySource =
      findNearestObserved(anchorMap, sortedKeys, t, 'before') ??
      findNearestObserved(anchorMap, sortedKeys, t, 'after');
    const dailyForDay = findDailyForTime(daily, t, timeZone, timeZoneOffsetMinutes);

    let temp: number;
    if (prev && next && prev.temp != null && next.temp != null) {
      const ratio = (t - prevKey!) / (nextKey! - prevKey!);
      temp = interpolateLinear(prev.temp, next.temp, ratio);
    } else if (prev?.temp != null) {
      temp = prev.temp;
    } else if (next?.temp != null) {
      temp = next.temp;
    } else if (dailyForDay && Number.isFinite(dailyForDay.tempMin) && Number.isFinite(dailyForDay.tempMax)) {
      temp = (dailyForDay.tempMin + dailyForDay.tempMax) / 2;
    } else {
      temp = 15;
    }

    let windSpeed: number;
    let windDeg: number;
    if (
      prev &&
      next &&
      prev.windSpeed != null &&
      next.windSpeed != null &&
      prev.windDeg != null &&
      next.windDeg != null
    ) {
      const ratio = (t - prevKey!) / (nextKey! - prevKey!);
      windSpeed = interpolateLinear(prev.windSpeed, next.windSpeed, ratio);
      windDeg = interpolateAngleDeg(prev.windDeg, next.windDeg, ratio);
    } else if (skySource) {
      windSpeed = coalesceNumber(skySource.windSpeed, dailyForDay?.windSpeed ?? 0);
      windDeg = coalesceNumber(skySource.windDeg, dailyForDay?.windDeg ?? 0);
    } else {
      windSpeed = coalesceNumber(dailyForDay?.windSpeed);
      windDeg = coalesceNumber(dailyForDay?.windDeg);
    }

    const code = coalesceNumber(skySource?.weatherCode, 0);
    const isDay = skySource?.isDay === true;
    const kind = skySource?.kind ?? wmoCodeToKind(code);

    result.push({
      time: new Date(t),
      temp,
      kind,
      description: skySource?.description ?? dailyForDay?.description ?? wmoToDesc(code),
      iconName: skySource?.iconName ?? dailyForDay?.iconName ?? weatherKindToIcon(kind, isDay),
      windSpeed,
      windDeg,
      precipProb: coalesceNumber(skySource?.precipProb, dailyForDay?.precipProb ?? 0),
      precipAccum: 0,
      humidity: coalesceNumber(skySource?.humidity, 60),
      interpolated: true,
    });
  }

  return result;
}

export function countRealForecastDays(
  hourly: StandardHourlyPoint[],
  timeZone?: string,
  timeZoneOffsetMinutes?: number
): number {
  const tzOpts = { timeZone, offsetMinutes: timeZoneOffsetMinutes };
  const todayKey = formatDayKeyAtLocation(new Date(), tzOpts);
  const byDay = new Map<string, number>();

  hourly.forEach((h) => {
    if (h.interpolated) return;
    const key = formatDayKeyAtLocation(h.time, tzOpts);
    if (key < todayKey) return;
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  });

  const sorted = [...byDay.keys()].sort();
  let count = 0;
  for (const key of sorted) {
    if ((byDay.get(key) ?? 0) >= MIN_REAL_HOURS_PER_DAY) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

export function computePeakTempTime(dayHours: StandardHourlyPoint[]): Date | null {
  const observed = dayHours.filter((h) => !h.interpolated);
  if (observed.length === 0) return null;
  const peak = observed.reduce((max, h) => (h.temp > max.temp ? h : max), observed[0]);
  return peak.time;
}

function trimToDays(
  daily: StandardDailyPoint[],
  hourly: StandardHourlyPoint[],
  numDays: number,
  timeZone?: string,
  timeZoneOffsetMinutes?: number
): { daily: StandardDailyPoint[]; hourly: StandardHourlyPoint[] } {
  const trimmedDaily = daily.slice(0, numDays);
  if (trimmedDaily.length === 0) return { daily: [], hourly: [] };

  const tzOpts = { timeZone, offsetMinutes: timeZoneOffsetMinutes };
  const firstKey = formatDayKeyAtLocation(trimmedDaily[0].date, tzOpts);
  const lastKey = formatDayKeyAtLocation(trimmedDaily[trimmedDaily.length - 1].date, tzOpts);

  const trimmedHourly = hourly.filter((h) => {
    const key = formatDayKeyAtLocation(h.time, tzOpts);
    return key >= firstKey && key <= lastKey;
  });

  return { daily: trimmedDaily, hourly: trimmedHourly };
}

function enrichDailyFromHourly(
  daily: StandardDailyPoint[],
  hourly: StandardHourlyPoint[],
  timeZone?: string,
  timeZoneOffsetMinutes?: number
): StandardDailyPoint[] {
  const tzOpts = { timeZone, offsetMinutes: timeZoneOffsetMinutes };
  return daily.map((day) => {
    const key = formatDayKeyAtLocation(day.date, tzOpts);
    const dayHours = hourly.filter((h) => formatDayKeyAtLocation(h.time, tzOpts) === key);
    const precipAccum = dayHours.reduce((sum, h) => sum + h.precipAccum, 0);
    const peakTempTime = computePeakTempTime(dayHours);

    let tempMin = day.tempMin;
    let tempMax = day.tempMax;
    const observedTemps = dayHours.filter((h) => !h.interpolated).map((h) => h.temp);
    if (observedTemps.length > 0) {
      if (!Number.isFinite(tempMin)) tempMin = Math.min(...observedTemps);
      if (!Number.isFinite(tempMax)) tempMax = Math.max(...observedTemps);
    }

    return {
      ...day,
      tempMin: Number.isFinite(tempMin) ? tempMin : coalesceNumber(tempMin, 0),
      tempMax: Number.isFinite(tempMax) ? tempMax : coalesceNumber(tempMax, 0),
      precipAccum,
      peakTempTime,
    };
  });
}

export function buildForecast(input: ForecastBuildInput): ForecastBuildResult {
  const targetDays = input.targetDays ?? TARGET_FORECAST_DAYS;
  const maxDailyDays = input.dailyPoints.length;
  const displayDays = Math.min(targetDays, maxDailyDays);

  let hourly = interpolateHourlyGrid(
    input.rawHourly,
    input.dailyPoints,
    displayDays,
    input.timeZone,
    input.timeZoneOffsetMinutes
  );
  let daily = input.dailyPoints.slice(0, displayDays);

  const realForecastDays = countRealForecastDays(hourly, input.timeZone, input.timeZoneOffsetMinutes);
  const trimmed = trimToDays(daily, hourly, displayDays, input.timeZone, input.timeZoneOffsetMinutes);
  daily = enrichDailyFromHourly(trimmed.daily, trimmed.hourly, input.timeZone, input.timeZoneOffsetMinutes);
  hourly = trimmed.hourly;

  const now = new Date();
  const warnings = input.warnings || [];

  const currentWarnings = warnings.filter((w) => w.starts <= now && now < w.ends);
  const currentWithWarnings = {
    ...input.current,
    kind: input.current.kind ?? hourly[0]?.kind ?? input.rawHourly[0]?.kind ?? WeatherKind.Unknown,
    warnings: currentWarnings.length > 0 ? currentWarnings : undefined,
  };

  const hourlyWithWarnings = hourly.map((h) => {
    const activeWarnings = warnings.filter((w) => w.starts <= h.time && h.time < w.ends);
    return {
      ...h,
      warnings: activeWarnings.length > 0 ? activeWarnings : undefined,
    };
  });

  const { lat, lon, label, country } = input.location;
  const cityName = label.split(',')[0].trim();

  const data: WeatherData = {
    city: cityName,
    country: country || '',
    lat,
    lon,
    timeZone: input.timeZone,
    timeZoneOffsetMinutes: input.timeZoneOffsetMinutes,
    current: currentWithWarnings,
    daily: assembleTimelineAndForecasts(
      input.currentTemp,
      hourlyWithWarnings,
      daily,
      input.timeZone,
      input.timeZoneOffsetMinutes,
      currentWithWarnings,
    ),
    forecastDayCount: daily.length,
    realForecastDayCount: realForecastDays,
  };

  return {
    data,
    realForecastDays,
    displayDays: daily.length,
  };
}

export function mergeOpenMeteoHourlyRaw(
  hourly: Record<string, Array<number | null>>,
  wmoToDescFn: (code: number) => string,
  wmoToIconFn: (code: number, isDay: boolean) => string
): RawHourlySlot[] {
  return hourly.time.map((t: number, i: number) => {
    const code = hourly.weather_code?.[i];
    const isDay = hourly.is_day?.[i] === 1;
    const kind = code != null ? wmoCodeToKind(code) : null;
    return {
      time: new Date(t * 1000),
      temp: hourly.temperature_2m?.[i] ?? null,
      weatherCode: code ?? null,
      kind,
      description: code != null ? wmoToDescFn(code) : null,
      iconName: code != null ? wmoToIconFn(code, isDay) : null,
      isDay: hourly.is_day?.[i] === 1 ? true : hourly.is_day?.[i] === 0 ? false : null,
      windSpeed: hourly.wind_speed_10m?.[i] ?? null,
      windDeg: hourly.wind_direction_10m?.[i] ?? null,
      precipProb: hourly.precipitation_probability?.[i] ?? null,
      precipAccum: hourly.precipitation?.[i] ?? null,
      humidity: hourly.relative_humidity_2m?.[i] ?? null,
    };
  });
}

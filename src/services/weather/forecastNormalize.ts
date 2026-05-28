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
  dayKey,
  hourKey,
  interpolateAngleDeg,
  interpolateLinear,
  startOfLocalDay,
} from './dateUtils';
import type {
  ForecastBuildInput,
  ForecastBuildResult,
  RawHourlySlot,
  StandardDailyPoint,
  StandardHourlyPoint,
} from './sharedTypes';
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

export function mergeDailyLayers(layers: StandardDailyPoint[][]): StandardDailyPoint[] {
  if (layers.length === 0) return [];
  const byDay = new Map<string, StandardDailyPoint>();

  for (let i = layers.length - 1; i >= 0; i--) {
    for (const day of layers[i]) {
      const key = dayKey(day.date);
      if (!byDay.has(key)) byDay.set(key, day);
    }
  }

  for (const day of layers[0]) {
    byDay.set(dayKey(day.date), day);
  }

  return [...byDay.values()]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, TARGET_FORECAST_DAYS);
}

function rawSlotToStandard(slot: RawHourlySlot, interpolated: boolean): StandardHourlyPoint {
  const code = coalesceNumber(slot.weatherCode, 0);
  const isDay = slot.isDay === 1 || slot.isDay === true;
  return {
    time: slot.time,
    temp: coalesceNumber(slot.temp),
    description: slot.description ?? wmoToDesc(code),
    iconName: slot.iconName ?? wmoToIcon(code, isDay),
    windSpeed: coalesceNumber(slot.windSpeed),
    windDeg: coalesceNumber(slot.windDeg),
    precipProb: coalesceNumber(slot.precipProb),
    precipAccum: coalesceNumber(slot.precipAccum),
    humidity: coalesceNumber(slot.humidity, 60),
    interpolated,
  };
}

function findDailyForTime(daily: StandardDailyPoint[], timeMs: number): StandardDailyPoint | undefined {
  const key = dayKey(new Date(timeMs));
  return daily.find((d) => dayKey(d.date) === key);
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
  numDays: number
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

  const now = new Date();
  const gridStart = startOfLocalDay(now);

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
    const dailyForDay = findDailyForTime(daily, t);

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
    const isDay = skySource?.isDay === 1 || skySource?.isDay === true;

    result.push({
      time: new Date(t),
      temp,
      description: skySource?.description ?? dailyForDay?.description ?? wmoToDesc(code),
      iconName: skySource?.iconName ?? dailyForDay?.iconName ?? wmoToIcon(code, isDay),
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

export function countRealForecastDays(hourly: StandardHourlyPoint[]): number {
  const todayKey = dayKey(new Date());
  const byDay = new Map<string, number>();

  hourly.forEach((h) => {
    if (h.interpolated) return;
    const key = dayKey(h.time);
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
  numDays: number
): { daily: StandardDailyPoint[]; hourly: StandardHourlyPoint[] } {
  const trimmedDaily = daily.slice(0, numDays);
  if (trimmedDaily.length === 0) return { daily: [], hourly: [] };

  const firstKey = dayKey(trimmedDaily[0].date);
  const lastKey = dayKey(trimmedDaily[trimmedDaily.length - 1].date);

  const trimmedHourly = hourly.filter((h) => {
    const key = dayKey(h.time);
    return key >= firstKey && key <= lastKey;
  });

  return { daily: trimmedDaily, hourly: trimmedHourly };
}

function enrichDailyFromHourly(daily: StandardDailyPoint[], hourly: StandardHourlyPoint[]): StandardDailyPoint[] {
  return daily.map((day) => {
    const key = dayKey(day.date);
    const dayHours = hourly.filter((h) => dayKey(h.time) === key);
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

  let hourly = interpolateHourlyGrid(input.rawHourly, input.dailyPoints, displayDays);
  let daily = input.dailyPoints.slice(0, displayDays);

  const realForecastDays = countRealForecastDays(hourly);
  const trimmed = trimToDays(daily, hourly, displayDays);
  daily = enrichDailyFromHourly(trimmed.daily, trimmed.hourly);
  hourly = trimmed.hourly;

  const { lat, lon, label, country } = input.location;
  const cityName = label.split(',')[0].trim();
  const firstDay = daily[0];

  const data: WeatherData = {
    city: cityName,
    country: country || '',
    lat,
    lon,
    timeZone: input.timeZone,
    timeZoneOffsetMinutes: input.timeZoneOffsetMinutes,
    current: input.current,
    daily: assembleTimelineAndForecasts(
      input.currentTemp,
      hourly,
      daily,
      input.timeZone,
      input.timeZoneOffsetMinutes
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
    return {
      time: new Date(t * 1000),
      temp: hourly.temperature_2m?.[i] ?? null,
      weatherCode: code ?? null,
      description: code != null ? wmoToDescFn(code) : null,
      iconName: code != null ? wmoToIconFn(code, isDay) : null,
      isDay: hourly.is_day?.[i] ?? null,
      windSpeed: hourly.wind_speed_10m?.[i] ?? null,
      windDeg: hourly.wind_direction_10m?.[i] ?? null,
      precipProb: hourly.precipitation_probability?.[i] ?? null,
      precipAccum: hourly.precipitation?.[i] ?? null,
      humidity: hourly.relative_humidity_2m?.[i] ?? null,
    };
  });
}

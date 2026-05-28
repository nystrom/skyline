/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { WeatherData, WeatherWarning } from '../../types';

export interface StandardHourlyPoint {
  time: Date;
  temp: number;
  description: string;
  iconName: string;
  windSpeed: number;
  windDeg: number;
  precipProb: number;
  precipAccum: number;
  humidity: number;
  /** True when this hour was synthesized to fill a gap in provider data. */
  interpolated?: boolean;
  warnings?: WeatherWarning[];
}

export interface StandardDailyPoint {
  date: Date;
  tempMin: number;
  tempMax: number;
  description: string;
  iconName: string;
  precipProb: number;
  precipAccum: number;
  windSpeed: number;
  windDeg: number;
  sunrise: Date;
  sunset: Date;
  moonrise?: Date;
  moonset?: Date;
  /** Set when peak time is known from observed hourly data; omit timeline peak event when null. */
  peakTempTime?: Date | null;
}

/** Raw hourly slot from a provider before gap-filling. */
export interface RawHourlySlot {
  time: Date;
  temp: number | null;
  weatherCode?: number | null;
  description?: string | null;
  iconName?: string | null;
  isDay?: boolean | null;
  windSpeed: number | null;
  windDeg: number | null;
  precipProb: number | null;
  precipAccum: number | null;
  humidity: number | null;
}

export interface WeatherLocationInput {
  lat: number;
  lon: number;
  label: string;
  country?: string;
}

export interface ProviderRawBundle {
  rawHourly: RawHourlySlot[];
  dailyPoints: StandardDailyPoint[];
  currentTemp: number;
  current: WeatherData['current'];
  timeZone?: string;
  timeZoneOffsetMinutes?: number;
  warnings?: WeatherWarning[];
}

export interface ForecastBuildInput {
  location: WeatherLocationInput;
  currentTemp: number;
  current: WeatherData['current'];
  rawHourly: RawHourlySlot[];
  dailyPoints: StandardDailyPoint[];
  timeZone?: string;
  timeZoneOffsetMinutes?: number;
  targetDays?: number;
  warnings?: WeatherWarning[];
}

export interface ForecastBuildResult {
  data: WeatherData;
  realForecastDays: number;
  displayDays: number;
}

export interface ProviderFetchContext {
  apiKey?: string;
  signal?: AbortSignal;
}

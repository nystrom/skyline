/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SavedLocation, UserSettings, WeatherFetchResult, WeatherProvider } from '../../types';
import { geocodeLocation } from '../geocoding/geocodingService';
import { isApiKeyValid } from '../validation';
import { WEATHER_TIMEOUT_MS, withAbortTimeout } from '../http';
import { TARGET_FORECAST_DAYS } from './forecastConstants';
import {
  buildForecast,
  mergeDailyLayers,
  mergeRawHourlyLayers,
} from './forecastNormalize';
import type { ConcreteWeatherProvider } from './providerTypes';
import { getWeatherProvider } from './providerRegistry';
import type { ProviderRawBundle, WeatherLocationInput } from './sharedTypes';

const CACHE_DURATION_MS = 10 * 60 * 1000;
const weatherCache: Record<string, { data: WeatherFetchResult; timestamp: number }> = {};
const inFlight = new Map<string, Promise<WeatherFetchResult>>();

function cacheKey(location: SavedLocation, provider: ConcreteWeatherProvider): string {
  return `${location.lat.toFixed(4)},${location.lon.toFixed(4)},${provider}`;
}

export function resolveProvider(
  country: string | undefined,
  settings: UserSettings
): ConcreteWeatherProvider {
  if (settings.provider !== 'auto') {
    return settings.provider;
  }
  const c = country ? country.toUpperCase() : '';
  if (c === 'CH') return 'meteoswiss';
  if (c === 'US') return 'nws';
  if (settings.apiKey && isApiKeyValid(settings.apiKey)) return 'openweather';
  return 'arpae';
}

function buildProviderChain(
  primary: ConcreteWeatherProvider,
  settings: UserSettings
): ConcreteWeatherProvider[] {
  const chain: ConcreteWeatherProvider[] = [primary];
  const add = (id: ConcreteWeatherProvider) => {
    if (!chain.includes(id)) chain.push(id);
  };

  if (settings.provider === 'auto') {
    add('arpae');
    if (settings.apiKey && isApiKeyValid(settings.apiKey)) add('openweather');
  } else if (primary !== 'arpae') {
    add('arpae');
  }
  return chain;
}

function toLocationInput(loc: SavedLocation): WeatherLocationInput {
  return {
    lat: loc.lat,
    lon: loc.lon,
    label: loc.label,
    country: loc.country,
  };
}

function buildSupplementWarnings(
  primary: ProviderRawBundle,
  supplements: { id: ConcreteWeatherProvider; bundle: ProviderRawBundle }[],
  mergedDailyCount: number
): string[] {
  if (supplements.length === 0) return [];

  const primaryDayCount = primary.dailyPoints.length;
  if (mergedDailyCount <= primaryDayCount) return [];

  const fallbackNames = [...new Set(supplements.map((s) => s.id))];
  return [
    `Forecast extended to ${mergedDailyCount} days using ${fallbackNames.join(', ')} (primary had ${primaryDayCount} day(s)).`,
  ];
}

async function fetchRawFromProvider(
  providerId: ConcreteWeatherProvider,
  location: SavedLocation,
  settings: UserSettings,
  signal?: AbortSignal
): Promise<ProviderRawBundle> {
  const adapter = getWeatherProvider(providerId);
  return withAbortTimeout(
    (abortSignal) =>
      adapter.fetchRaw(toLocationInput(location), {
        apiKey: settings.apiKey,
        signal: signal ?? abortSignal,
      }),
    WEATHER_TIMEOUT_MS
  );
}

function buildMergedResult(
  primaryId: ConcreteWeatherProvider,
  location: WeatherLocationInput,
  ordered: { id: ConcreteWeatherProvider; bundle: ProviderRawBundle }[]
): WeatherFetchResult {
  const primaryEntry = ordered[0];
  const supplements = ordered.slice(1);
  const mergedHourly = mergeRawHourlyLayers(ordered.map((entry) => entry.bundle.rawHourly));
  const mergedDaily = mergeDailyLayers(ordered.map((entry) => entry.bundle.dailyPoints));

  const warnings = buildSupplementWarnings(
    primaryEntry.bundle,
    supplements,
    mergedDaily.length
  );

  const { data } = buildForecast({
    location,
    currentTemp: primaryEntry.bundle.currentTemp,
    current: primaryEntry.bundle.current,
    rawHourly: mergedHourly,
    dailyPoints: mergedDaily,
    targetDays: TARGET_FORECAST_DAYS,
  });

  data.resolvedProvider = primaryId;

  return {
    data,
    source: 'live',
    resolvedProvider: primaryId,
    warnings,
  };
}

export async function fetchWeatherForLocation(
  location: SavedLocation,
  settings: UserSettings,
  signal?: AbortSignal
): Promise<WeatherFetchResult> {
  const primary = resolveProvider(location.country, settings);
  const chain =
    settings.provider === 'auto'
      ? buildProviderChain(primary, settings)
      : buildProviderChain(settings.provider as ConcreteWeatherProvider, settings);

  const key = cacheKey(location, primary);
  const cached = weatherCache[key];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return { ...cached.data, source: 'cached' };
  }

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = (async (): Promise<WeatherFetchResult> => {
    const locInput = toLocationInput(location);
    const settled = await Promise.allSettled(
      chain.map((providerId) => fetchRawFromProvider(providerId, location, settings, signal))
    );

    const successful: { id: ConcreteWeatherProvider; bundle: ProviderRawBundle }[] = [];
    const errors: string[] = [];

    settled.forEach((result, index) => {
      const providerId = chain[index];
      if (result.status === 'fulfilled') {
        successful.push({ id: providerId, bundle: result.value });
      } else {
        const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
        errors.push(`${providerId}: ${msg}`);
        console.warn(`${providerId} failed:`, msg);
      }
    });

    if (successful.length === 0) {
      throw new Error(
        errors.length > 0
          ? `Weather fetch failed. ${errors.join(' ')}`
          : 'Weather fetch failed for all providers.'
      );
    }

    const primaryEntry = successful.find((entry) => entry.id === primary) ?? successful[0];
    const resolvedPrimaryId = primaryEntry.id;
    const ordered = [
      primaryEntry,
      ...successful.filter((entry) => entry.id !== resolvedPrimaryId),
    ];

    if (resolvedPrimaryId !== primary) {
      errors.unshift(`${primary} unavailable; using ${resolvedPrimaryId} as primary source.`);
    }

    const finalResult = buildMergedResult(resolvedPrimaryId, locInput, ordered);

    if (errors.length > 0 && finalResult.warnings.length === 0) {
      finalResult.warnings.push(errors[0]);
    } else if (resolvedPrimaryId !== primary) {
      finalResult.warnings.unshift(`${primary} unavailable; using ${resolvedPrimaryId}.`);
    }

    weatherCache[cacheKey(location, resolvedPrimaryId)] = {
      data: finalResult,
      timestamp: Date.now(),
    };
    return finalResult;
  })();

  inFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}

export async function fetchLiveWeather(
  city: string,
  apiKey: string,
  _units?: 'metric' | 'imperial',
  provider: WeatherProvider = 'openweather',
  signal?: AbortSignal
): Promise<import('../../types').WeatherData> {
  const geocoded = await geocodeLocation(city, apiKey, signal);
  const location: SavedLocation = {
    id: `${geocoded.lat.toFixed(4)},${geocoded.lon.toFixed(4)}`,
    label: geocoded.country ? `${geocoded.name}, ${geocoded.country}` : geocoded.name,
    lat: geocoded.lat,
    lon: geocoded.lon,
    country: geocoded.country,
    state: geocoded.state,
  };
  const settings: UserSettings = {
    apiKey,
    city,
    provider,
    tempUnit: 'C',
    windSpeedUnit: 'm/s',
    clockFormat: '24h',
    showSunriseSunset: true,
    showMoonriseMoonset: true,
    units: 'metric',
    activeLocation: location,
  };
  const result = await fetchWeatherForLocation(location, settings, signal);
  return result.data;
}

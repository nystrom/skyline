/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createOpenWeatherGeocoding } from './openWeatherGeocoding';
import { openMeteoGeocoding } from './openMeteoGeocoding';
import type { GeocodedLocation, SearchResult } from './types';

const COORD_REGEX = /^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/;

export type { GeocodedLocation, SearchResult } from './types';

export async function searchLocations(
  query: string,
  apiKey?: string,
  signal?: AbortSignal
): Promise<SearchResult> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return { ok: true, results: [] };

  if (signal?.aborted) {
    return { ok: false, error: 'Search cancelled' };
  }

  const ow = apiKey ? createOpenWeatherGeocoding(apiKey) : null;
  if (ow) {
    try {
      const results = await ow.search(cleanQuery, signal);
      if (results.length > 0) return { ok: true, results };
    } catch (e) {
      if (signal?.aborted || (e instanceof DOMException && e.name === 'AbortError')) {
        return { ok: false, error: 'Search cancelled' };
      }
      console.warn('OpenWeather search failed, falling back to Open-Meteo', e);
    }
  }

  try {
    const results = await openMeteoGeocoding.search(cleanQuery, signal);
    return { ok: true, results };
  } catch (e) {
    if (signal?.aborted || (e instanceof DOMException && e.name === 'AbortError')) {
      return { ok: false, error: 'Search cancelled' };
    }
    const msg = e instanceof Error ? e.message : 'Location search failed';
    console.warn('Open-Meteo search failed', e);
    return { ok: false, error: msg };
  }
}

export async function geocodeLocation(
  query: string,
  apiKey?: string,
  signal?: AbortSignal
): Promise<GeocodedLocation> {
  const coordMatch = query.trim().match(COORD_REGEX);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[2]);
    let name = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    let country = 'GPS';
    const ow = apiKey ? createOpenWeatherGeocoding(apiKey) : null;
    if (ow) {
      try {
        const rev = await ow.reverse(lat, lon, signal);
        if (rev) {
          name = rev.name;
          country = rev.country || country;
        }
      } catch (e) {
        console.warn('Reverse geocoding failed', e);
      }
    }
    return { lat, lon, name, country };
  }

  const search = await searchLocations(query, apiKey, signal);
  if (search.ok === false) {
    throw new Error(search.error);
  }
  if (search.results.length === 0) {
    throw new Error(`Location "${query}" not found.`);
  }
  return search.results[0];
}

export async function reverseGeocode(
  lat: number,
  lon: number,
  apiKey?: string,
  signal?: AbortSignal
): Promise<GeocodedLocation | null> {
  const ow = apiKey ? createOpenWeatherGeocoding(apiKey) : null;
  if (ow) {
    try {
      const rev = await ow.reverse(lat, lon, signal);
      if (rev) return rev;
    } catch (e) {
      console.warn('OpenWeather reverse geocode failed', e);
    }
  }
  return {
    lat,
    lon,
    name: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
    country: 'GPS',
  };
}

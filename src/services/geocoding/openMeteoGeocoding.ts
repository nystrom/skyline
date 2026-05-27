/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { fetchWithRateLimit } from '../http';
import type { GeocodedLocation, GeocodingProvider } from './types';

export const openMeteoGeocoding: GeocodingProvider = {
  async search(query: string, signal?: AbortSignal): Promise<GeocodedLocation[]> {
    const openMeteoGeoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
    const res = await fetchWithRateLimit('open_meteo_geocoding', openMeteoGeoUrl, { signal });
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) return [];
    return data.results.map((result: { latitude: number; longitude: number; name: string; country_code?: string; country?: string; admin1?: string }) => ({
      lat: result.latitude,
      lon: result.longitude,
      name: result.name,
      country: result.country_code || result.country || '',
      state: result.admin1,
    }));
  },

  async reverse(_lat: number, _lon: number): Promise<GeocodedLocation | null> {
    return null;
  },
};

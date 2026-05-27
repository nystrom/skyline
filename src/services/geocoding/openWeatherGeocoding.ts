/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { fetchWithRateLimit, GEO_TIMEOUT_MS, timedFetch } from '../http';
import { isApiKeyValid } from '../validation';
import type { GeocodedLocation, GeocodingProvider } from './types';

export function createOpenWeatherGeocoding(apiKey: string): GeocodingProvider | null {
  if (!isApiKeyValid(apiKey)) return null;
  const cleanKey = apiKey.trim();

  return {
    async search(query: string, signal?: AbortSignal): Promise<GeocodedLocation[]> {
      const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${cleanKey}`;
      const res = await timedFetch(geoUrl, undefined, GEO_TIMEOUT_MS);
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map((item: { lat: number; lon: number; name: string; country?: string; state?: string }) => ({
        lat: item.lat,
        lon: item.lon,
        name: item.name,
        country: item.country || '',
        state: item.state,
      }));
    },

    async reverse(lat: number, lon: number, signal?: AbortSignal): Promise<GeocodedLocation | null> {
      const reverseUrl = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${cleanKey}`;
      const res = await fetchWithRateLimit('openweather', reverseUrl, { signal });
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      if (!res.ok) return null;
      const data = await res.json();
      if (!data?.[0]) return null;
      return {
        lat,
        lon,
        name: data[0].name,
        country: data[0].country || '',
        state: data[0].state,
      };
    },
  };
}

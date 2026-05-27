/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GeocodedLocation {
  lat: number;
  lon: number;
  name: string;
  country: string;
  state?: string;
}

export type SearchResult =
  | { ok: true; results: GeocodedLocation[] }
  | { ok: false; error: string };

export interface GeocodingProvider {
  search(query: string, signal?: AbortSignal): Promise<GeocodedLocation[]>;
  reverse(lat: number, lon: number, signal?: AbortSignal): Promise<GeocodedLocation | null>;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SavedLocation } from '../types';
import type { GeocodedLocation } from '../services/geocoding/types';

export function locationId(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

export function formatLocationLabel(loc: Pick<GeocodedLocation, 'name' | 'country' | 'state'>): string {
  if (loc.country) {
    return `${loc.name}, ${loc.country}`;
  }
  return loc.name;
}

export function geocodedToSaved(loc: GeocodedLocation): SavedLocation {
  return {
    id: locationId(loc.lat, loc.lon),
    label: formatLocationLabel(loc),
    lat: loc.lat,
    lon: loc.lon,
    country: loc.country,
    state: loc.state,
  };
}

export const SAVED_LOCATIONS_V2_KEY = 'sky_timeline_saved_locations_v2';
export const SAVED_LOCATIONS_V1_KEY = 'sky_timeline_saved_locations';

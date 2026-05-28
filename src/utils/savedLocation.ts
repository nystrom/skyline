/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SavedLocation } from '../types';
import type { GeocodedLocation } from '../services/geocoding/types';

export function locationId(lat: number, lon: number): string {
  return `${lat.toFixed(4)},${lon.toFixed(4)}`;
}

type LocationLabelParts = {
  name?: string;
  label?: string;
  state?: string;
  country?: string;
};

function normalizePart(part: string | undefined): string | undefined {
  const trimmed = part?.trim();
  return trimmed ? trimmed : undefined;
}

function labelAlreadyLooksFormatted(label: string, { state, country }: { state?: string; country?: string }): boolean {
  if (!label.includes(',')) return false;
  const l = label.toLowerCase();
  const hasState = state ? l.includes(state.toLowerCase()) : false;
  const hasCountry = country ? l.includes(country.toLowerCase()) : false;
  return hasState || hasCountry;
}

export function formatLocationLabel(parts: LocationLabelParts): string {
  const name = normalizePart(parts.name);
  const label = normalizePart(parts.label);
  const state = normalizePart(parts.state);
  const country = normalizePart(parts.country);

  const base = label ?? name ?? '';
  if (!base) return '';

  if (label && labelAlreadyLooksFormatted(label, { state, country })) {
    return label;
  }

  const suffix = [state, country].filter(Boolean).join(', ');
  return suffix ? `${base}, ${suffix}` : base;
}

export function geocodedToSaved(loc: GeocodedLocation): SavedLocation {
  return {
    id: locationId(loc.lat, loc.lon),
    label: formatLocationLabel({ name: loc.name, state: loc.state, country: loc.country }),
    lat: loc.lat,
    lon: loc.lon,
    country: loc.country,
    state: loc.state,
  };
}

export const SAVED_LOCATIONS_V2_KEY = 'sky_timeline_saved_locations_v2';
export const SAVED_LOCATIONS_V1_KEY = 'sky_timeline_saved_locations';

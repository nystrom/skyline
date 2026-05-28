/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { UserSettings, WeatherWarning } from '../../types';
import { fetchWithRateLimit } from '../http';
import type { WeatherLocationInput } from './sharedTypes';

// A whitelist of European countries that Meteoalarm supports.
// Checking this avoids making useless requests for regions outside of Europe.
const EUROPEAN_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
  'IS', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'MD', 'ME', 'NL', 'MK', 'NO', 'PL',
  'PT', 'RO', 'RS', 'SK', 'SI', 'ES', 'SE', 'CH', 'GB', 'UK'
]);

function mapSeverityString(severityStr?: string): WeatherWarning['severity'] {
  if (!severityStr) return 'unknown';
  const s = severityStr.toLowerCase().trim();
  if (s.includes('minor') || s.includes('yellow')) return 'minor';
  if (s.includes('moderate') || s.includes('orange')) return 'moderate';
  if (s.includes('severe') || s.includes('high')) return 'severe';
  if (s.includes('extreme') || s.includes('red') || s.includes('critical') || s.includes('violet')) return 'extreme';
  return 'unknown';
}

/**
 * Fetch active weather alerts from the US National Weather Service (NWS).
 */
export async function fetchNWSWarnings(
  location: WeatherLocationInput,
  signal?: AbortSignal
): Promise<WeatherWarning[]> {
  const { lat, lon, country } = location;
  // NWS is only authoritative for the US.
  if (country && country.toUpperCase() !== 'US') {
    return [];
  }

  try {
    const url = `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`;
    const headers = {
      Accept: 'application/geo+json',
      'User-Agent': 'SkylineWeatherDashboard/1.0',
    };

    const res = await fetchWithRateLimit('nws_alerts', url, { headers, signal });
    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    const features = (data.features as Array<{ properties: Record<string, unknown> }>) || [];

    return features.map((f) => {
      const p = f.properties;
      const onset = (p.onset as string) || (p.effective as string) || '';
      const expires = (p.ends as string) || (p.expires as string) || '';
      return {
        sender: (p.senderName as string) || 'NWS',
        event: (p.event as string) || 'Weather Alert',
        description: (p.description as string) || (p.headline as string) || '',
        starts: onset ? new Date(onset) : new Date(),
        ends: expires ? new Date(expires) : new Date(Date.now() + 24 * 3600 * 1000),
        severity: mapSeverityString(p.severity as string),
      };
    });
  } catch {
    // Fail silently to keep the weather dashboard operational if NWS goes down or CORS blocks us.
    return [];
  }
}

/**
 * Fetch active weather alerts from OpenWeather One Call 3.0 API if key is available.
 */
export async function fetchOpenWeatherWarnings(
  location: WeatherLocationInput,
  apiKey: string,
  signal?: AbortSignal
): Promise<WeatherWarning[]> {
  if (!apiKey || apiKey.trim() === '') {
    return [];
  }

  try {
    const { lat, lon } = location;
    const cleanKey = apiKey.trim();
    // One Call 3.0 supports the alerts block natively
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=current,minutely,hourly,daily&appid=${cleanKey}`;

    const res = await fetchWithRateLimit('openweather_alerts', url, { signal });
    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    const alerts = (data.alerts as Array<{
      sender_name?: string;
      event?: string;
      description?: string;
      start?: number;
      end?: number;
    }>) || [];

    return alerts.map((a) => ({
      sender: a.sender_name || 'OpenWeatherMap',
      event: a.event || 'Weather Warning',
      description: a.description || '',
      starts: a.start ? new Date(a.start * 1000) : new Date(),
      ends: a.end ? new Date(a.end * 1000) : new Date(Date.now() + 24 * 3600 * 1000),
      severity: 'unknown',
    }));
  } catch {
    // Fail silently to ensure that unsupported keys or CORS policies do not block weather retrieval.
    return [];
  }
}

/**
 * Fetch active weather alerts from Meteoalarm via country-specific Atom feeds.
 * Parses XML using the browser's DOMParser and filters for location.
 */
export async function fetchMeteoalarmWarnings(
  location: WeatherLocationInput,
  signal?: AbortSignal
): Promise<WeatherWarning[]> {
  const country = location.country ? location.country.toUpperCase() : '';
  if (!country || !EUROPEAN_COUNTRIES.has(country)) {
    return [];
  }

  try {
    const url = `https://feeds.meteoalarm.org/feeds/meteoalarm-atom-${country.toLowerCase()}`;
    const res = await fetchWithRateLimit('meteoalarm_alerts', url, { signal });
    if (!res.ok) {
      return [];
    }

    const text = await res.text();
    // Using native browser DOMParser to convert XML string into an XML Document object.
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');
    const entries = xmlDoc.getElementsByTagName('entry');
    const warnings: WeatherWarning[] = [];

    const cityResolved = location.label.split(',')[0].trim().toLowerCase();

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const title = entry.getElementsByTagName('title')[0]?.textContent || '';
      const summary = entry.getElementsByTagName('summary')[0]?.textContent || '';
      // Support namespace query elements to read official CAP fields embedded in the feed entries.
      const capEvent =
        entry.getElementsByTagNameNS('*', 'event')[0]?.textContent ||
        entry.getElementsByTagName('cap:event')[0]?.textContent ||
        '';
      const capSeverity =
        entry.getElementsByTagNameNS('*', 'severity')[0]?.textContent ||
        entry.getElementsByTagName('cap:severity')[0]?.textContent ||
        '';
      const capAreaDesc =
        entry.getElementsByTagNameNS('*', 'areaDesc')[0]?.textContent ||
        entry.getElementsByTagName('cap:areaDesc')[0]?.textContent ||
        '';
      const capOnset =
        entry.getElementsByTagNameNS('*', 'onset')[0]?.textContent ||
        entry.getElementsByTagName('cap:onset')[0]?.textContent ||
        '';
      const capExpires =
        entry.getElementsByTagNameNS('*', 'expires')[0]?.textContent ||
        entry.getElementsByTagName('cap:expires')[0]?.textContent ||
        '';

      // Perform a localized check: alerts targeting the user's specific city.
      const isRelevant =
        title.toLowerCase().includes(cityResolved) ||
        summary.toLowerCase().includes(cityResolved) ||
        capAreaDesc.toLowerCase().includes(cityResolved);

      if (isRelevant) {
        warnings.push({
          sender: 'Meteoalarm',
          event: capEvent || title || 'Weather Warning',
          description: summary || title || '',
          starts: capOnset ? new Date(capOnset) : new Date(),
          ends: capExpires ? new Date(capExpires) : new Date(Date.now() + 24 * 3600 * 1000),
          severity: mapSeverityString(capSeverity),
        });
      }
    }

    return warnings;
  } catch {
    // Fail silently in case of XML parse failures or CORS restrictions.
    return [];
  }
}

/**
 * Fetch and consolidate alerts from all supported warning sources concurrently.
 */
export async function fetchAllWarnings(
  location: WeatherLocationInput,
  settings: UserSettings,
  signal?: AbortSignal
): Promise<WeatherWarning[]> {
  try {
    const results = await Promise.allSettled([
      fetchNWSWarnings(location, signal),
      fetchOpenWeatherWarnings(location, settings.apiKey, signal),
      fetchMeteoalarmWarnings(location, signal),
    ]);

    const allWarnings: WeatherWarning[] = [];
    results.forEach((r) => {
      if (r.status === 'fulfilled') {
        allWarnings.push(...r.value);
      }
    });

    // Deduplicate any warnings fetched from multiple sources by comparing event name and times.
    const seen = new Set<string>();
    return allWarnings.filter((w) => {
      const key = `${w.sender}:${w.event}:${w.starts.getTime()}:${w.ends.getTime()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch {
    return [];
  }
}

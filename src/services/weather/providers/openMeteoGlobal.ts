/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { WeatherProviderAdapter } from '../providerTypes';
import { fetchOpenMeteoForecast, fetchOpenMeteoRawBundle, openMeteoArpaeUrl, openMeteoForecastUrl } from '../openMeteoShared';

export const openMeteoGlobalAdapter: WeatherProviderAdapter = {
  id: 'arpae',
  async fetchRaw(location, ctx) {
    const { lat, lon } = location;
    return fetchOpenMeteoRawBundle(location, {
      rateLimitKey: 'arpae',
      primaryUrls: [openMeteoArpaeUrl(lat, lon), openMeteoForecastUrl(lat, lon, 'best_match')],
      errorLabel: 'Open-Meteo',
      signal: ctx.signal,
    });
  },
  async fetch(location, ctx) {
    const { lat, lon } = location;
    return fetchOpenMeteoForecast(location, {
      rateLimitKey: 'arpae',
      primaryUrls: [openMeteoArpaeUrl(lat, lon), openMeteoForecastUrl(lat, lon, 'best_match')],
      errorLabel: 'Open-Meteo',
      signal: ctx.signal,
    });
  },
};

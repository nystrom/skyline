/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { WeatherProviderAdapter } from '../providerTypes';
import { fetchOpenMeteoForecast, fetchOpenMeteoRawBundle, openMeteoForecastUrl } from '../openMeteoShared';

export const meteoSwissAdapter: WeatherProviderAdapter = {
  id: 'meteoswiss',
  async fetchRaw(location, ctx) {
    const { lat, lon } = location;
    const models = ['meteoswiss_icon_ch2', 'meteoswiss_icon_ch1'];
    const primaryUrls = models.map((m) => openMeteoForecastUrl(lat, lon, m));
    primaryUrls.push(openMeteoForecastUrl(lat, lon, 'best_match'));
    return fetchOpenMeteoRawBundle(location, {
      rateLimitKey: 'meteo_swiss',
      primaryUrls,
      errorLabel: 'MeteoSwiss',
      signal: ctx.signal,
    });
  },
  async fetch(location, ctx) {
    const { lat, lon } = location;
    const models = ['meteoswiss_icon_ch2', 'meteoswiss_icon_ch1'];
    const primaryUrls = models.map((m) => openMeteoForecastUrl(lat, lon, m));
    primaryUrls.push(openMeteoForecastUrl(lat, lon, 'best_match'));
    return fetchOpenMeteoForecast(location, {
      rateLimitKey: 'meteo_swiss',
      primaryUrls,
      errorLabel: 'MeteoSwiss',
      signal: ctx.signal,
    });
  },
};

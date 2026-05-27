/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ConcreteWeatherProvider } from './providerTypes';
import type { WeatherProviderAdapter } from './providerTypes';
import { meteoSwissAdapter } from './providers/meteoSwiss';
import { nwsAdapter } from './providers/nws';
import { openMeteoGlobalAdapter } from './providers/openMeteoGlobal';
import { openWeatherAdapter } from './providers/openWeather';

const registry = new Map<ConcreteWeatherProvider, WeatherProviderAdapter>([
  ['openweather', openWeatherAdapter],
  ['meteoswiss', meteoSwissAdapter],
  ['nws', nwsAdapter],
  ['arpae', openMeteoGlobalAdapter],
]);

export function getWeatherProvider(id: ConcreteWeatherProvider): WeatherProviderAdapter {
  const adapter = registry.get(id);
  if (!adapter) throw new Error(`Unknown weather provider: ${id}`);
  return adapter;
}

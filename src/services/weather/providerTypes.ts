/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { WeatherData, WeatherProvider } from '../../types';
import type { ProviderFetchContext, ProviderRawBundle, WeatherLocationInput } from './sharedTypes';

export type ConcreteWeatherProvider = Exclude<WeatherProvider, 'auto'>;

export interface WeatherProviderAdapter {
  readonly id: ConcreteWeatherProvider;
  fetchRaw(location: WeatherLocationInput, ctx: ProviderFetchContext): Promise<ProviderRawBundle>;
  fetch(location: WeatherLocationInput, ctx: ProviderFetchContext): Promise<WeatherData>;
}

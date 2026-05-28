/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { wmoCodeToKind, weatherKindToIcon } from './weatherKind';

export { wmoCodeToKind };

export function wmoToIcon(code: number, isDay = true): string {
  return weatherKindToIcon(wmoCodeToKind(code), isDay);
}

export function wmoToDesc(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Scattered clouds';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45) return 'Fog';
  if (code === 48) return 'Depositing rime fog';
  if (code === 51) return 'Light drizzle';
  if (code === 53) return 'Moderate drizzle';
  if (code === 55) return 'Dense drizzle';
  if (code === 61) return 'Slight rain';
  if (code === 63) return 'Moderate rain';
  if (code === 65) return 'Heavy rain';
  if (code === 71) return 'Slight snow fall';
  if (code === 73) return 'Moderate snow fall';
  if (code === 75) return 'Heavy snow fall';
  if (code === 77) return 'Snow grains';
  if (code === 80) return 'Slight rain showers';
  if (code === 81) return 'Moderate rain showers';
  if (code === 82) return 'Violent rain showers';
  if (code === 85) return 'Slight snow showers';
  if (code === 86) return 'Heavy snow showers';
  if (code === 95) return 'Thunderstorm';
  if (code === 96) return 'Thunderstorm with slight hail';
  if (code === 99) return 'Thunderstorm with heavy hail';
  return 'Overcast';
}

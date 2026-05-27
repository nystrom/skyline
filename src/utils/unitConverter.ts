/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function convertTemp(celsius: number, unit: 'C' | 'F'): number {
  if (unit === 'F') {
    return Math.round((celsius * 9) / 5 + 32);
  }
  return Math.round(celsius);
}

export function convertWindSpeed(
  speedMs: number,
  unit: 'm/s' | 'kph' | 'mph' | 'knots'
): number {
  switch (unit) {
    case 'kph':
      return Math.round(speedMs * 3.6);
    case 'mph':
      return Math.round(speedMs * 2.23694);
    case 'knots':
      return Math.round(speedMs * 1.94384);
    case 'm/s':
    default:
      return Math.round(speedMs);
  }
}

export function getWindUnitLabel(unit: 'm/s' | 'kph' | 'mph' | 'knots'): string {
  return unit;
}

export function convertPrecipAccum(
  accumMm: number,
  tempUnit: 'C' | 'F'
): string {
  if (accumMm <= 0) return '0 mm';
  if (tempUnit === 'F') {
    // Convert mm to inches for Imperial users
    const inches = accumMm * 0.0393701;
    if (inches < 0.01) return '<0.01 in';
    return `${inches.toFixed(2)} in`;
  }
  return `${accumMm.toFixed(1)} mm`;
}

export function formatTime(date: Date, format: '12h' | '24h'): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: format === '12h',
  });
}

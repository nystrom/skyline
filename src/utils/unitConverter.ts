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

const TIME_24H: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
};

export function formatTime24(date: Date): string {
  return date.toLocaleTimeString('en-US', TIME_24H);
}

function toOffsetDate(date: Date, offsetMinutes: number): Date {
  return new Date(date.getTime() + offsetMinutes * 60_000);
}

export function formatTime24AtLocation(
  date: Date,
  opts: { timeZone?: string; offsetMinutes?: number }
): string {
  if (opts.timeZone) {
    return date.toLocaleTimeString('en-US', { ...TIME_24H, timeZone: opts.timeZone });
  }
  if (typeof opts.offsetMinutes === 'number') {
    return toOffsetDate(date, opts.offsetMinutes).toLocaleTimeString('en-US', { ...TIME_24H, timeZone: 'UTC' });
  }
  return formatTime24(date);
}

export function formatDateLongAtLocation(
  date: Date,
  opts: { timeZone?: string; offsetMinutes?: number }
): string {
  const fmt: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
  if (opts.timeZone) {
    return date.toLocaleDateString('en-US', { ...fmt, timeZone: opts.timeZone });
  }
  if (typeof opts.offsetMinutes === 'number') {
    return toOffsetDate(date, opts.offsetMinutes).toLocaleDateString('en-US', { ...fmt, timeZone: 'UTC' });
  }
  return date.toLocaleDateString('en-US', fmt);
}

export function formatWeekdayAtLocation(
  date: Date,
  opts: { timeZone?: string; offsetMinutes?: number }
): string {
  const fmt: Intl.DateTimeFormatOptions = { weekday: 'long' };
  if (opts.timeZone) {
    return date.toLocaleDateString('en-US', { ...fmt, timeZone: opts.timeZone });
  }
  if (typeof opts.offsetMinutes === 'number') {
    return toOffsetDate(date, opts.offsetMinutes).toLocaleDateString('en-US', { ...fmt, timeZone: 'UTC' });
  }
  return date.toLocaleDateString('en-US', fmt);
}

export function formatShortDateAtLocation(
  date: Date,
  opts: { timeZone?: string; offsetMinutes?: number }
): string {
  const fmt: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (opts.timeZone) {
    return date.toLocaleDateString('en-US', { ...fmt, timeZone: opts.timeZone });
  }
  if (typeof opts.offsetMinutes === 'number') {
    return toOffsetDate(date, opts.offsetMinutes).toLocaleDateString('en-US', { ...fmt, timeZone: 'UTC' });
  }
  return date.toLocaleDateString('en-US', fmt);
}

export function formatTime(date: Date, format: '12h' | '24h'): string {
  if (format === '24h') {
    return formatTime24(date);
  }
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatTimeAtLocation(
  date: Date,
  format: '12h' | '24h',
  opts: { timeZone?: string; offsetMinutes?: number }
): string {
  if (format === '24h') return formatTime24AtLocation(date, opts);

  if (opts.timeZone) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: opts.timeZone,
    });
  }
  if (typeof opts.offsetMinutes === 'number') {
    return toOffsetDate(date, opts.offsetMinutes).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC',
    });
  }
  return formatTime(date, format);
}

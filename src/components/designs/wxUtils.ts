import type { WxPrecip, WxScenario } from './wxTypes';

export function intensityLabel(mm: number): string | null {
  if (!mm || mm <= 0) return null;
  if (mm < 1) return 'Light';
  if (mm < 4) return 'Moderate';
  if (mm < 8) return 'Heavy';
  return 'Torrential';
}

export function intensityNorm(mm: number): number {
  return Math.max(0, Math.min(1, (mm || 0) / 8));
}

export function fmtTemp(c: number, units: 'C' | 'F'): number {
  if (units === 'F') return Math.round(c * 9 / 5 + 32);
  return Math.round(c);
}

export function windFmt(kmh: number, units: 'C' | 'F'): string {
  if (units === 'F') return Math.round(kmh / 1.609) + ' mph';
  return Math.round(kmh) + ' km/h';
}

export function humanizeDur(min: number): string {
  if (min <= 0) return 'now';
  const hh = Math.floor(min / 60);
  const mm = min % 60;
  if (hh && mm) return hh + 'h ' + mm + 'm';
  if (hh) return hh + 'h';
  return mm + 'm';
}

export interface PrecipPhrase {
  kind: 'none' | 'active' | 'soon';
  big: string;
  sub: string;
}

export function precipPhrase(s: WxScenario): PrecipPhrase {
  const p: WxPrecip = s.precip;
  if (!p || p.kind === 'none') {
    return { kind: 'none', big: p ? p.headline : 'No rain expected', sub: p ? p.line : '' };
  }
  if (p.active) {
    return {
      kind: 'active',
      big: (p.peakLabel ?? 'Heavy') + ' rain now',
      sub: 'Easing by ' + (p.endLabel ?? '') + ' · ' + p.line,
    };
  }
  return {
    kind: 'soon',
    big: 'Rain in ' + humanizeDur(p.startsInMin ?? 0),
    sub: (p.peakLabel ?? '').toLowerCase() === 'moderate'
      ? 'Starts around ' + (p.startLabel ?? '') + ', lasting ' + (p.durationLabel ?? '') + '.'
      : p.line,
  };
}

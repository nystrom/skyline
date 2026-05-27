/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function dayKey(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function hourKey(date: Date): number {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d.getTime();
}

export function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function interpolateLinear(a: number, b: number, ratio: number): number {
  return a + (b - a) * ratio;
}

export function interpolateAngleDeg(a: number, b: number, ratio: number): number {
  let diff = ((b - a + 540) % 360) - 180;
  return (a + diff * ratio + 360) % 360;
}

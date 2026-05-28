/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CSS rotation for the Lucide Navigation icon (default orientation: NE / 45°)
 * such that it points in the direction the wind is blowing toward.
 * Wind deg is meteorological: degrees clockwise from north, indicating source.
 */
export function windDegToRotation(deg: number): number {
  return deg + 135;
}

export function getWindDirectionArrow(deg: number): string {
  if (deg >= 337.5 || deg < 22.5) return '↑';
  if (deg >= 22.5 && deg < 67.5) return '↗';
  if (deg >= 67.5 && deg < 112.5) return '→';
  if (deg >= 112.5 && deg < 157.5) return '↘';
  if (deg >= 157.5 && deg < 202.5) return '↓';
  if (deg >= 202.5 && deg < 247.5) return '↙';
  if (deg >= 247.5 && deg < 292.5) return '←';
  return '↖';
}

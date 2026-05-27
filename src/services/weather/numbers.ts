/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function coalesceNumber(value: number | null | undefined, fallback = 0): number {
  return value != null && Number.isFinite(value) ? value : fallback;
}

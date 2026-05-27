/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function isApiKeyValid(key: string): boolean {
  const k = key.trim();
  if (!k) return false;
  const lower = k.toLowerCase();
  if (
    lower.includes('placeholder') ||
    lower.includes('key_here') ||
    lower.includes('your_') ||
    lower.includes('my_') ||
    lower === 'undefined' ||
    lower === 'null'
  ) {
    return false;
  }
  return k.length >= 20 && !/\s/.test(k);
}

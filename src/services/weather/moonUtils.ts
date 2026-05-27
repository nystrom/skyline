/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function getMoonriseMoonset(dayDate: Date, daySeed: number) {
  const moonriseTime = new Date(dayDate);
  const moonriseHours = (18 + Math.floor((30 + daySeed * 45) / 60)) % 24;
  const moonriseMinutes = (30 + daySeed * 45) % 60;
  moonriseTime.setHours(moonriseHours, moonriseMinutes, 0, 0);

  const moonsetTime = new Date(dayDate);
  const moonsetHours = (5 + Math.floor((15 + daySeed * 40) / 60)) % 24;
  const moonsetMinutes = (15 + daySeed * 40) % 60;
  moonsetTime.setHours(moonsetHours, moonsetMinutes, 0, 0);

  return { moonriseTime, moonsetTime };
}

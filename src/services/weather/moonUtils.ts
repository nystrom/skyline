/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// dayDate must represent midnight in the location's local timezone (as Open-Meteo provides).
// Using arithmetic on getTime() keeps times in location timezone regardless of browser timezone.
export function getMoonriseMoonset(dayDate: Date, daySeed: number) {
  const moonriseHours = (18 + Math.floor((30 + daySeed * 45) / 60)) % 24;
  const moonriseMinutes = (30 + daySeed * 45) % 60;
  const moonsetHours = (5 + Math.floor((15 + daySeed * 40) / 60)) % 24;
  const moonsetMinutes = (15 + daySeed * 40) % 60;

  const moonriseTime = new Date(
    dayDate.getTime() + (moonriseHours * 3600 + moonriseMinutes * 60) * 1000
  );
  const moonsetTime = new Date(
    dayDate.getTime() + (moonsetHours * 3600 + moonsetMinutes * 60) * 1000
  );

  return { moonriseTime, moonsetTime };
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import SunCalc from 'suncalc';

// dayDate must represent midnight in the location's local timezone (as Open-Meteo provides).
// Using arithmetic on getTime() keeps times in location timezone regardless of browser timezone.
export function getMoonriseMoonset(
  dayDate: Date,
  lat?: number,
  lon?: number,
  daySeed: number = 0
) {
  if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
    const localStart = dayDate.getTime();
    const localEnd = localStart + 24 * 3600 * 1000;

    const rises: Date[] = [];
    const sets: Date[] = [];

    // Query 3 consecutive days around localStart to cover all timezones/UTC boundaries
    const checkOffsets = [-24 * 3600 * 1000, 0, 24 * 3600 * 1000];
    for (const offset of checkOffsets) {
      const d = new Date(localStart + offset);
      const times = SunCalc.getMoonTimes(d, lat, lon, true);
      if (times.rise instanceof Date && !isNaN(times.rise.getTime())) {
        rises.push(times.rise);
      }
      if (times.set instanceof Date && !isNaN(times.set.getTime())) {
        sets.push(times.set);
      }
    }

    // Filter to times falling strictly within the local 24-hour day window
    const moonriseTime = rises.find(r => r.getTime() >= localStart && r.getTime() < localEnd);
    const moonsetTime = sets.find(s => s.getTime() >= localStart && s.getTime() < localEnd);

    return { moonriseTime, moonsetTime };
  }

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

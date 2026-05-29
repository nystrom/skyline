/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { DailyForecast, WeatherData, WeatherTimelineEvent } from '../../types';
import type { StandardDailyPoint, StandardHourlyPoint } from './sharedTypes';
import {
  formatDateLongAtLocation,
  formatShortDateAtLocation,
  formatTime24AtLocation,
  formatWeekdayAtLocation,
} from '../../utils/unitConverter';
import { coalesceNumber } from './numbers';

export function assembleTimelineAndForecasts(
  currentTemp: number,
  hourlyPoints: StandardHourlyPoint[],
  dailyPoints: StandardDailyPoint[],
  timeZone?: string,
  timeZoneOffsetMinutes?: number,
  currentConditions?: WeatherData['current'],
): DailyForecast[] {
  const tz = { timeZone, offsetMinutes: timeZoneOffsetMinutes };
  const dayKeyOpts: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
  if (timeZone) dayKeyOpts.timeZone = timeZone;

  const dailyForecasts: DailyForecast[] = [];
  const groupedHourly: Record<string, StandardHourlyPoint[]> = {};
  hourlyPoints.forEach((pt) => {
    const dayKey = pt.time.toLocaleDateString('en-US', dayKeyOpts);
    if (!groupedHourly[dayKey]) groupedHourly[dayKey] = [];
    groupedHourly[dayKey].push(pt);
  });

  dailyPoints.forEach((day, dIdx) => {
    const dayKey = day.date.toLocaleDateString('en-US', dayKeyOpts);
    const dayHours = groupedHourly[dayKey] || [];
    const timelineEvents: WeatherTimelineEvent[] = [];

    dayHours.forEach((pt, hIdx) => {
      timelineEvents.push({
        id: `event-${dIdx}-hour-${hIdx}`,
        time: pt.time,
        hourLabel: formatTime24AtLocation(pt.time, tz),
        type: 'hourly_status',
        title: `${Math.round(pt.temp)}°`,
        kind: pt.kind,
        description: pt.description,
        iconName: pt.iconName,
        temp: Math.round(coalesceNumber(pt.temp)),
        windSpeed: Number(coalesceNumber(pt.windSpeed).toFixed(1)),
        windDeg: coalesceNumber(pt.windDeg),
        precipProb: Math.round(coalesceNumber(pt.precipProb)),
        precipAccum: Number(coalesceNumber(pt.precipAccum).toFixed(1)),
        humidity: pt.humidity,
        colorTheme: pt.precipProb > 40 ? 'blue' : pt.temp > 24 ? 'amber' : 'slate',
        warnings: pt.warnings,
      });
    });

    timelineEvents.push({
      id: `event-${dIdx}-sunrise`,
      time: day.sunrise,
      hourLabel: formatTime24AtLocation(day.sunrise, tz),
      type: 'sunrise',
      title: 'Sunrise',
      description: 'First rays break above horizon lines',
      iconName: 'sunrise',
      colorTheme: 'amber',
      isSpecial: true,
    });

    timelineEvents.push({
      id: `event-${dIdx}-sunset`,
      time: day.sunset,
      hourLabel: formatTime24AtLocation(day.sunset, tz),
      type: 'sunset',
      title: 'Sunset',
      description: 'Twilight color gradient fadeout',
      iconName: 'sunset',
      colorTheme: 'indigo',
      isSpecial: true,
    });

    if (day.moonrise) {
      timelineEvents.push({
        id: `event-${dIdx}-moonrise`,
        time: day.moonrise,
        hourLabel: formatTime24AtLocation(day.moonrise, tz),
        type: 'moonrise',
        title: 'Moonrise',
        description: 'The moon ascends into the twilight canopy',
        iconName: 'moon',
        colorTheme: 'purple',
        isSpecial: true,
      });
    }
    if (day.moonset) {
      timelineEvents.push({
        id: `event-${dIdx}-moonset`,
        time: day.moonset,
        hourLabel: formatTime24AtLocation(day.moonset, tz),
        type: 'moonset',
        title: 'Moonset',
        description: 'The lunar disc slips below the horizon',
        iconName: 'moon',
        colorTheme: 'slate',
        isSpecial: true,
      });
    }

    if (day.peakTempTime) {
      timelineEvents.push({
        id: `event-${dIdx}-peak`,
        time: day.peakTempTime,
        hourLabel: formatTime24AtLocation(day.peakTempTime, tz),
        type: 'peak_temp',
        title: `Daily Peak: ${Math.round(day.tempMax)}°`,
        description: 'Solar heat peak of this forecast block',
        iconName: 'flame',
        tempMax: Math.round(day.tempMax),
        colorTheme: 'rose',
        isSpecial: true,
      });
    }


    if (dIdx === 0) {
      const liveNow = new Date();
      timelineEvents.push({
        id: 'event-0-now',
        time: liveNow,
        hourLabel: formatTime24AtLocation(liveNow, tz),
        type: 'now',
        title: 'Now',
        description: currentConditions?.description ?? 'Current conditions',
        iconName: currentConditions?.iconName ?? 'locate',
        temp: Math.round(currentTemp),
        windSpeed: currentConditions?.windSpeed,
        windDeg: currentConditions?.windDeg,
        precipProb: currentConditions?.precipProb,
        humidity: currentConditions?.humidity,
        colorTheme: 'blue',
        isSpecial: true,
        warnings: currentConditions?.warnings,
      });
    }

    timelineEvents.sort((a, b) => a.time.getTime() - b.time.getTime());

    dailyForecasts.push({
      date: day.date,
      dayName: formatWeekdayAtLocation(day.date, tz),
      shortDate: formatShortDateAtLocation(day.date, tz),
      tempMin: Math.round(day.tempMin),
      tempMax: Math.round(day.tempMax),
      iconName: day.iconName,
      description: day.description.charAt(0).toUpperCase() + day.description.slice(1),
      precipProb: Math.round(day.precipProb),
      precipAccum: Number(day.precipAccum.toFixed(1)),
      windSpeed: Number(day.windSpeed.toFixed(1)),
      windDeg: day.windDeg,
      timelineEvents,
    });
  });

  return dailyForecasts;
}

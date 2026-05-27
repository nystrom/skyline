/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { DailyForecast, WeatherTimelineEvent } from '../../types';
import type { StandardDailyPoint, StandardHourlyPoint } from './sharedTypes';
import { getWindDirectionArrow } from './windUtils';
import { coalesceNumber } from './numbers';

export function assembleTimelineAndForecasts(
  currentTemp: number,
  hourlyPoints: StandardHourlyPoint[],
  dailyPoints: StandardDailyPoint[]
): DailyForecast[] {
  const dailyForecasts: DailyForecast[] = [];
  const groupedHourly: Record<string, StandardHourlyPoint[]> = {};
  hourlyPoints.forEach((pt) => {
    const dayKey = pt.time.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    if (!groupedHourly[dayKey]) groupedHourly[dayKey] = [];
    groupedHourly[dayKey].push(pt);
  });

  dailyPoints.forEach((day, dIdx) => {
    const dayKey = day.date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const dayHours = groupedHourly[dayKey] || [];
    const timelineEvents: WeatherTimelineEvent[] = [];

    dayHours.forEach((pt, hIdx) => {
      timelineEvents.push({
        id: `event-${dIdx}-hour-${hIdx}`,
        time: pt.time,
        hourLabel: pt.time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        type: 'hourly_status',
        title: `${Math.round(pt.temp)}°`,
        description: pt.description,
        iconName: pt.iconName,
        temp: Math.round(coalesceNumber(pt.temp)),
        windSpeed: Number(coalesceNumber(pt.windSpeed).toFixed(1)),
        windDeg: coalesceNumber(pt.windDeg),
        precipProb: Math.round(coalesceNumber(pt.precipProb)),
        precipAccum: Number(coalesceNumber(pt.precipAccum).toFixed(1)),
        humidity: pt.humidity,
        colorTheme: pt.precipProb > 40 ? 'blue' : pt.temp > 24 ? 'amber' : 'slate',
      });
    });

    timelineEvents.push({
      id: `event-${dIdx}-sunrise`,
      time: day.sunrise,
      hourLabel: day.sunrise.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
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
      hourLabel: day.sunset.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
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
        hourLabel: day.moonrise.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
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
        hourLabel: day.moonset.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
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
        hourLabel: day.peakTempTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        type: 'peak_temp',
        title: `Daily Peak: ${Math.round(day.tempMax)}°`,
        description: 'Solar heat peak of this forecast block',
        iconName: 'flame',
        tempMax: Math.round(day.tempMax),
        colorTheme: 'rose',
        isSpecial: true,
      });
    }

    for (let i = 1; i < dayHours.length; i++) {
      if (dayHours[i].interpolated || dayHours[i - 1].interpolated) continue;
      const degDelta = Math.abs(dayHours[i].windDeg - dayHours[i - 1].windDeg);
      if (degDelta > 45 && degDelta < 315) {
        timelineEvents.push({
          id: `event-${dIdx}-windshift`,
          time: dayHours[i].time,
          hourLabel: dayHours[i].time.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
          type: 'wind_shift',
          title: 'Breeze Vector Shift',
          description: `Wind shifts direction to ${getWindDirectionArrow(dayHours[i].windDeg)}`,
          iconName: 'navigation',
          windSpeed: Number(coalesceNumber(dayHours[i].windSpeed).toFixed(1)),
          windDeg: coalesceNumber(dayHours[i].windDeg),
          windFromSpeed: Number(coalesceNumber(dayHours[i - 1].windSpeed).toFixed(1)),
          windFromDeg: coalesceNumber(dayHours[i - 1].windDeg),
          colorTheme: 'emerald',
          isSpecial: true,
        });
        break;
      }
    }

    if (dIdx === 0) {
      const liveNow = new Date();
      timelineEvents.push({
        id: 'event-0-now',
        time: liveNow,
        hourLabel: liveNow.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        type: 'now',
        title: 'Current Conditions',
        description: 'You are right here',
        iconName: 'locate',
        temp: Math.round(currentTemp),
        colorTheme: 'blue',
        isSpecial: true,
      });
    }

    timelineEvents.sort((a, b) => a.time.getTime() - b.time.getTime());

    dailyForecasts.push({
      date: day.date,
      dayName: day.date.toLocaleDateString('en-US', { weekday: 'long' }),
      shortDate: day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
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

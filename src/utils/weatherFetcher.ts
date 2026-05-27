/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WeatherData, DailyForecast, WeatherTimelineEvent } from '../types';
import { getWindDirectionArrow } from '../services/weather/windUtils';
import { getMoonriseMoonset } from '../services/weather/moonUtils';

export { getWindDirectionArrow };
export { searchLocations, geocodeLocation, reverseGeocode } from '../services/geocoding/geocodingService';
export type { GeocodedLocation, SearchResult } from '../services/geocoding/geocodingService';
export { fetchLiveWeather, fetchWeatherForLocation, resolveProvider } from '../services/weather/weatherOrchestrator';

function getCityHash(cityName: string): number {
  let hash = 0;
  const s = cityName.toLowerCase().trim();
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function generateSimulatedWeather(city: string, _units?: 'metric' | 'imperial'): WeatherData {
  const hash = getCityHash(city);

  let baseMin = 14;
  let baseMax = 24;
  let weatherType: 'sunny' | 'rainy' | 'cloudy' | 'windy' | 'stormy' = 'sunny';
  let windSpeedModifier = 1.0;

  const lowerCity = city.toLowerCase();
  if (lowerCity.includes('london') || lowerCity.includes('seattle') || lowerCity.includes('vancouver')) {
    baseMin = 8;
    baseMax = 15;
    weatherType = 'rainy';
  } else if (lowerCity.includes('reykjavik') || lowerCity.includes('alaska') || lowerCity.includes('oslo')) {
    baseMin = -2;
    baseMax = 6;
    weatherType = 'stormy';
  } else if (
    lowerCity.includes('sahara') ||
    lowerCity.includes('cairo') ||
    lowerCity.includes('dubai') ||
    lowerCity.includes('phoenix')
  ) {
    baseMin = 28;
    baseMax = 42;
    weatherType = 'sunny';
    windSpeedModifier = 0.5;
  } else if (lowerCity.includes('chicago') || lowerCity.includes('wellington')) {
    baseMin = 11;
    baseMax = 19;
    weatherType = 'windy';
    windSpeedModifier = 2.4;
  } else if (lowerCity.includes('tokyo') || lowerCity.includes('paris') || lowerCity.includes('new york')) {
    baseMin = 13;
    baseMax = 22;
    weatherType = 'cloudy';
  } else {
    const tempMod = (hash % 15) - 5;
    baseMin += tempMod;
    baseMax += tempMod + (hash % 6 + 6);
    const types: ('sunny' | 'rainy' | 'cloudy' | 'windy' | 'stormy')[] = ['sunny', 'cloudy', 'rainy', 'windy'];
    weatherType = types[hash % types.length];
  }

  const finalMin = baseMin;
  const finalMax = baseMax;
  const currentTemp = Math.round(finalMin + (finalMax - finalMin) * 0.65);

  const getConditionDetails = (type: typeof weatherType, index: number) => {
    const cycle = type === 'sunny' && index % 3 === 1 ? 'cloudy' : type;
    switch (cycle) {
      case 'sunny':
        return { desc: 'Sunny and Clear', icon: 'sun', color: 'orange', precip: 0 };
      case 'rainy':
        return { desc: 'Light Showers', icon: 'cloud-rain', color: 'blue', precip: 85 };
      case 'windy':
        return { desc: 'Crisp & Windy', icon: 'wind', color: 'teal', precip: 10 };
      case 'stormy':
        return { desc: 'Heavy Thunderstorms', icon: 'cloud-lightning', color: 'purple', precip: 95 };
      case 'cloudy':
      default:
        return { desc: 'Partly Cloudy', icon: 'cloud', color: 'slate', precip: 20 };
    }
  };

  const days: DailyForecast[] = [];
  const startDay = new Date();

  for (let d = 0; d < 7; d++) {
    const dayDate = new Date(startDay.getTime() + d * 24 * 60 * 60 * 1000);
    const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
    const shortDate = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const daySeed = (hash + d) % 7;
    const dayMin = finalMin + (daySeed % 5) - 2;
    const dayMax = finalMax + (daySeed % 4) - 2;
    const finalCond = getConditionDetails(weatherType, d);

    const sunriseTime = new Date(dayDate);
    sunriseTime.setHours(5, 30 + daySeed * 4, 0, 0);
    const sunsetTime = new Date(dayDate);
    sunsetTime.setHours(20, 15 - daySeed * 3, 0, 0);
    const { moonriseTime, moonsetTime } = getMoonriseMoonset(dayDate, daySeed);
    const peakTime = new Date(dayDate);
    peakTime.setHours(14, 30 + daySeed * 6, 0, 0);
    const windShiftTime = new Date(dayDate);
    windShiftTime.setHours(16, 15, 0, 0);

    const timelineEvents: WeatherTimelineEvent[] = [];
    let dayTotalPrecipAccum = 0;

    for (let h = 0; h <= 23; h += 2) {
      const eventTime = new Date(dayDate);
      eventTime.setHours(h, 0, 0, 0);
      const hourlyFraction = Math.sin(((h - 9) / 24) * 2 * Math.PI);
      const hourlyTemp = Math.round(dayMin + (dayMax - dayMin) * ((hourlyFraction + 1) / 2));
      const isNight = h < 6 || h > 20;
      let icon = finalCond.icon;
      if (finalCond.icon === 'sun' && isNight) icon = 'moon';
      else if (finalCond.icon === 'cloud-rain' && isNight) icon = 'cloud-drizzle';
      const baseWindDeg = (hash * 45 + h * 15) % 360;
      const isPrecip = h % 3 === 0 ? finalCond.precip : Math.max(0, finalCond.precip - 15);
      const hourAccum = isPrecip > 0 ? Number((0.2 + ((daySeed + h) % 4) * 0.4).toFixed(1)) : 0;
      dayTotalPrecipAccum += hourAccum;

      timelineEvents.push({
        id: `${d}-h-${h}`,
        time: eventTime,
        hourLabel: eventTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        type: 'hourly_status',
        title: hourlyTemp + '°',
        description: finalCond.desc,
        iconName: icon,
        temp: hourlyTemp,
        windSpeed: Number((3.2 + daySeed * 0.4 + Math.sin(h) * 1.1 * windSpeedModifier).toFixed(1)),
        windDeg: baseWindDeg,
        precipProb: isPrecip,
        precipAccum: hourAccum,
        humidity: 60 + daySeed * 3 + Math.round(Math.sin(h) * 10),
        colorTheme: finalCond.color === 'orange' ? 'amber' : finalCond.color,
      });
    }

    timelineEvents.push({
      id: `${d}-sunrise`,
      time: sunriseTime,
      hourLabel: sunriseTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      type: 'sunrise',
      title: 'Sunrise',
      description: 'First morning light breaks over the horizon',
      iconName: 'sunrise',
      colorTheme: 'amber',
      isSpecial: true,
    });
    timelineEvents.push({
      id: `${d}-sunset`,
      time: sunsetTime,
      hourLabel: sunsetTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      type: 'sunset',
      title: 'Sunset',
      description: 'Sunset and introduction of evening cooling',
      iconName: 'sunset',
      colorTheme: 'indigo',
      isSpecial: true,
    });
    timelineEvents.push({
      id: `${d}-moonrise`,
      time: moonriseTime,
      hourLabel: moonriseTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      type: 'moonrise',
      title: 'Moonrise',
      description: 'The moon ascends into the twilight canopy',
      iconName: 'moon',
      colorTheme: 'purple',
      isSpecial: true,
    });
    timelineEvents.push({
      id: `${d}-moonset`,
      time: moonsetTime,
      hourLabel: moonsetTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      type: 'moonset',
      title: 'Moonset',
      description: 'The lunar disc slips below the horizon',
      iconName: 'moon',
      colorTheme: 'slate',
      isSpecial: true,
    });
    timelineEvents.push({
      id: `${d}-peak-temp`,
      time: peakTime,
      hourLabel: peakTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      type: 'peak_temp',
      title: `Daily Peak: ${dayMax}°`,
      description: `Thermodynamic peak at ${peakTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
      iconName: 'flame',
      tempMax: dayMax,
      colorTheme: 'rose',
      isSpecial: true,
    });

    const shiftFromDeg = (hash * 45 + 150) % 360;
    const shiftToDeg = (hash * 45 + 280) % 360;
    timelineEvents.push({
      id: `${d}-wind-shift`,
      time: windShiftTime,
      hourLabel: windShiftTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      type: 'wind_shift',
      title: 'Breeze Vector Shift',
      description: `Wind shifts direction 130° to ${getWindDirectionArrow(shiftToDeg)}`,
      iconName: 'navigation',
      windSpeed: Number((4 * windSpeedModifier).toFixed(1)),
      windDeg: shiftToDeg,
      windFromSpeed: Number((8 * windSpeedModifier).toFixed(1)),
      windFromDeg: shiftFromDeg,
      colorTheme: 'emerald',
      isSpecial: true,
    });

    if (d === 0) {
      const nowTime = new Date();
      timelineEvents.push({
        id: '0-now',
        time: nowTime,
        hourLabel: nowTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        type: 'now',
        title: 'Current Conditions',
        description: 'You are right here',
        iconName: 'locate',
        temp: currentTemp,
        colorTheme: 'blue',
        isSpecial: true,
      });
    }

    timelineEvents.sort((a, b) => a.time.getTime() - b.time.getTime());
    days.push({
      date: dayDate,
      dayName,
      shortDate,
      tempMin: dayMin,
      tempMax: dayMax,
      iconName: finalCond.icon,
      description: finalCond.desc,
      precipProb: finalCond.precip,
      precipAccum: Number(dayTotalPrecipAccum.toFixed(1)),
      windSpeed: Number((4.0 * windSpeedModifier).toFixed(1)),
      windDeg: (hash * 45) % 360,
      timelineEvents,
    });
  }

  const firstDay = days[0];
  const actualSunset = new Date(firstDay.date);
  actualSunset.setHours(20, 15, 0, 0);
  const actualSunrise = new Date(firstDay.date);
  actualSunrise.setHours(5, 30, 0, 0);
  const { moonriseTime: curMoonrise, moonsetTime: curMoonset } = getMoonriseMoonset(firstDay.date, hash % 7);
  const finalCurrentPrecip = firstDay.precipProb > 0 ? Number((0.5 + (hash % 5) * 0.3).toFixed(1)) : 0;

  return {
    city,
    country: getSimulatedCountry(city, hash),
    lat: 37.7749,
    lon: -122.4194,
    current: {
      temp: currentTemp,
      description: firstDay.description,
      iconName: firstDay.iconName,
      humidity: 64,
      windSpeed: firstDay.windSpeed,
      windDeg: firstDay.windDeg,
      precipProb: firstDay.precipProb,
      precipAccum: finalCurrentPrecip,
      feelsLike: currentTemp - 1,
      sunriseTime: actualSunrise,
      sunsetTime: actualSunset,
      moonriseTime: curMoonrise,
      moonsetTime: curMoonset,
    },
    daily: days,
  };
}

function getSimulatedCountry(city: string, hash: number): string {
  const lc = city.toLowerCase();
  if (lc.includes('london')) return 'UK';
  if (lc.includes('paris')) return 'FR';
  if (lc.includes('tokyo')) return 'JP';
  if (lc.includes('sydney')) return 'AU';
  if (lc.includes('reykjavik')) return 'IS';
  if (lc.includes('cairo')) return 'EG';
  if (lc.includes('dubai')) return 'AE';
  const countries = ['US', 'CA', 'DE', 'IT', 'ES', 'BR', 'MX', 'NZ', 'IE'];
  return countries[hash % countries.length];
}

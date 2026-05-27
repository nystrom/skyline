/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WeatherData, DailyForecast, WeatherTimelineEvent } from '../types';

// Simple hash functions to create consistent simulated weather per city name
function getCityHash(cityName: string): number {
  let hash = 0;
  const s = cityName.toLowerCase().trim();
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Generate Moonrise and Moonset for a given day and hash/seed
function getMoonriseMoonset(dayDate: Date, daySeed: number) {
  const moonriseTime = new Date(dayDate);
  let moonriseHours = (18 + Math.floor((30 + daySeed * 45) / 60)) % 24;
  let moonriseMinutes = (30 + daySeed * 45) % 60;
  moonriseTime.setHours(moonriseHours, moonriseMinutes, 0, 0);

  const moonsetTime = new Date(dayDate);
  let moonsetHours = (5 + Math.floor((15 + daySeed * 40) / 60)) % 24;
  let moonsetMinutes = (15 + daySeed * 40) % 60;
  moonsetTime.setHours(moonsetHours, moonsetMinutes, 0, 0);

  return { moonriseTime, moonsetTime };
}

// Generate stable, highly detailed simulated weather for a city in Metric (°C, m/s)
export function generateSimulatedWeather(city: string, _units?: 'metric' | 'imperial'): WeatherData {
  const hash = getCityHash(city);
  
  // Custom climate profiles based on city name matching
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
  } else if (lowerCity.includes('sahara') || lowerCity.includes('cairo') || lowerCity.includes('dubai') || lowerCity.includes('phoenix')) {
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
    // Deterministic from hash
    const tempMod = (hash % 15) - 5; // -5 to +9
    baseMin += tempMod;
    baseMax += tempMod + (hash % 6 + 6); // delta of 6 to 11
    
    const types: ('sunny' | 'rainy' | 'cloudy' | 'windy' | 'stormy')[] = ['sunny', 'cloudy', 'rainy', 'windy'];
    weatherType = types[hash % types.length];
  }

  // Data stored internally must be metric (Celsius and m/s)
  const finalMin = baseMin;
  const finalMax = baseMax;
  const currentTemp = Math.round(finalMin + (finalMax - finalMin) * 0.65);

  const getConditionDetails = (type: typeof weatherType, index: number) => {
    const cycle = (type === 'sunny' && index % 3 === 1) ? 'cloudy' : type;
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
  
  // Create 7 Days of detailed schedule
  for (let d = 0; d < 7; d++) {
    const dayDate = new Date(startDay.getTime() + d * 24 * 60 * 60 * 1000);
    const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
    const shortDate = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Slight deterministic variation per day of week
    const daySeed = (hash + d) % 7;
    const dayMin = finalMin + (daySeed % 5) - 2;
    const dayMax = finalMax + (daySeed % 4) - 2;
    const finalCond = getConditionDetails(weatherType, d);

    // Astro events: Sunrise & Sunset
    const sunriseTime = new Date(dayDate);
    sunriseTime.setHours(5, 30 + (daySeed * 4), 0, 0);
    
    const sunsetTime = new Date(dayDate);
    sunsetTime.setHours(20, 15 - (daySeed * 3), 0, 0);

    const { moonriseTime, moonsetTime } = getMoonriseMoonset(dayDate, daySeed);

    // Peak Temp time usually around 14:30
    const peakTime = new Date(dayDate);
    peakTime.setHours(14, 30 + (daySeed * 6), 0, 0);

    // Wind shift event around 16:00
    const windShiftTime = new Date(dayDate);
    windShiftTime.setHours(16, 15, 0, 0);

    // Timeline Events calculation
    const timelineEvents: WeatherTimelineEvent[] = [];
    let dayTotalPrecipAccum = 0;

    // Generate Hourly intervals (00:00 to 23:00) every 2 hours
    for (let h = 0; h <= 23; h += 2) {
      const eventTime = new Date(dayDate);
      eventTime.setHours(h, 0, 0, 0);

      // Temperature curve: cold at 4am, peak at 15pm
      const hourlyFraction = Math.sin(((h - 9) / 24) * 2 * Math.PI); // sinusoid
      const hourlyTemp = Math.round(dayMin + (dayMax - dayMin) * ((hourlyFraction + 1) / 2));
      
      const isNight = h < 6 || h > 20;
      
      let icon = finalCond.icon;
      if (finalCond.icon === 'sun' && isNight) {
        icon = 'moon';
      } else if (finalCond.icon === 'cloud-rain' && isNight) {
        icon = 'cloud-drizzle';
      }

      // Wind direction drifts
      const baseWindDeg = (hash * 45 + h * 15) % 360;

      // Precipitation probability and accumulation (millimeter depth)
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
        windSpeed: Number((3.2 + (daySeed * 0.4) + (Math.sin(h) * 1.1) * windSpeedModifier).toFixed(1)),
        windDeg: baseWindDeg,
        precipProb: isPrecip,
        precipAccum: hourAccum,
        humidity: 60 + (daySeed * 3) + Math.round(Math.sin(h) * 10),
        colorTheme: finalCond.color === 'orange' ? 'amber' : finalCond.color
      });
    }

    // Now, insert instantaneous markers into appropriate sequence points

    // 1. SUNRISE
    timelineEvents.push({
      id: `${d}-sunrise`,
      time: sunriseTime,
      hourLabel: sunriseTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      type: 'sunrise',
      title: 'Sunrise',
      description: `First morning light breaks over the horizon`,
      iconName: 'sunrise',
      colorTheme: 'amber',
      isSpecial: true
    });

    // 2. SUNSET
    timelineEvents.push({
      id: `${d}-sunset`,
      time: sunsetTime,
      hourLabel: sunsetTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      type: 'sunset',
      title: 'Sunset',
      description: `Sunset and introduction of evening cooling`,
      iconName: 'sunset',
      colorTheme: 'indigo',
      isSpecial: true
    });

    // 2b. MOONRISE
    timelineEvents.push({
      id: `${d}-moonrise`,
      time: moonriseTime,
      hourLabel: moonriseTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      type: 'moonrise',
      title: 'Moonrise',
      description: 'The moon ascends into the twilight canopy',
      iconName: 'moon',
      colorTheme: 'purple',
      isSpecial: true
    });

    // 2c. MOONSET
    timelineEvents.push({
      id: `${d}-moonset`,
      time: moonsetTime,
      hourLabel: moonsetTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      type: 'moonset',
      title: 'Moonset',
      description: 'The lunar disc slips below the horizon',
      iconName: 'moon',
      colorTheme: 'slate',
      isSpecial: true
    });

    // 3. PEAK TEMP
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
      isSpecial: true
    });

    // 4. WIND SHIFT
    const shiftFromDeg = (hash * 45 + 150) % 360;
    const shiftToDeg = (hash * 45 + 280) % 360;
    const fromSpeed = Number((8 * windSpeedModifier).toFixed(1));
    const toSpeed = Number((4 * windSpeedModifier).toFixed(1));
    timelineEvents.push({
      id: `${d}-wind-shift`,
      time: windShiftTime,
      hourLabel: windShiftTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      type: 'wind_shift',
      title: 'Breeze Vector Shift',
      description: `Wind shifts direction 130° to ${getWindDirectionArrow(shiftToDeg)}`,
      iconName: 'navigation',
      windSpeed: toSpeed,
      windDeg: shiftToDeg,
      windFromSpeed: fromSpeed,
      windFromDeg: shiftFromDeg,
      colorTheme: 'emerald',
      isSpecial: true
    });

    // 5. NOW (Only on Day 0)
    if (d === 0) {
      const nowTime = new Date();
      timelineEvents.push({
        id: `0-now`,
        time: nowTime,
        hourLabel: nowTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        type: 'now',
        title: 'Current Conditions',
        description: 'You are right here',
        iconName: 'locate',
        temp: currentTemp,
        colorTheme: 'blue',
        isSpecial: true
      });
    }

    // Sort events sequentially by exact time parameter
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
      timelineEvents
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
    daily: days
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

// Convert degrees to short arrow rotation angle
export function getWindDirectionArrow(deg: number): string {
  if (deg >= 337.5 || deg < 22.5) return '↑'; // North
  if (deg >= 22.5 && deg < 67.5) return '↗'; // NE
  if (deg >= 67.5 && deg < 112.5) return '→'; // East
  if (deg >= 112.5 && deg < 157.5) return '↘'; // SE
  if (deg >= 157.5 && deg < 202.5) return '↓'; // South
  if (deg >= 202.5 && deg < 247.5) return '↙'; // SW
  if (deg >= 247.5 && deg < 292.5) return '←'; // West
  return '↖'; // NW
}

// Real OpenWeather API integration call - ALWAYS forced to Metric units internally
export async function fetchLiveWeather(
  city: string, 
  apiKey: string, 
  _units?: 'metric' | 'imperial'
): Promise<WeatherData> {
  // Enforce Celsius and m/s (metric) internally!
  const queryUnits = 'metric';
  const cleanKey = apiKey.trim();
  
  // Check if selected location is coordinate text (e.g. from GPS tracker)
  const coordRegex = /^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/;
  const coordMatch = city.trim().match(coordRegex);

  let forecastUrl = '';
  let currentUrl = '';

  if (coordMatch) {
    const lat = coordMatch[1];
    const lon = coordMatch[2];
    forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${cleanKey}&units=${queryUnits}`;
    currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${cleanKey}&units=${queryUnits}`;
  } else {
    const cleanCity = encodeURIComponent(city.trim());
    forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${cleanCity}&appid=${cleanKey}&units=${queryUnits}`;
    currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${cleanCity}&appid=${cleanKey}&units=${queryUnits}`;
  }

  try {
    const [forecastRes, currentRes] = await Promise.all([
      fetch(forecastUrl),
      fetch(currentUrl)
    ]);

    if (!forecastRes.ok || !currentRes.ok) {
      const failedRes = !forecastRes.ok ? forecastRes : currentRes;
      let errorDetail = '';
      try {
        const errJson = await failedRes.json();
        errorDetail = errJson.message || '';
      } catch (e) {
        // ignore JSON body parsing failures
      }

      if (failedRes.status === 401) {
        throw new Error(`Invalid OpenWeather API Key (401). Note: newly created API keys can take up to 2 hours to activate, or check for typos.`);
      } else if (failedRes.status === 404) {
        throw new Error(`Location "${city}" not found (404) on OpenWeather. Please check your city spelling.`);
      } else if (failedRes.status === 429) {
        throw new Error(`OpenWeather rate limit reached (429). Please try again soon.`);
      } else {
        const msg = errorDetail ? `: ${errorDetail}` : '';
        throw new Error(`OpenWeather API Error (${failedRes.status})${msg}. Check key/spelling.`);
      }
    }

    const forecastData = await forecastRes.json();
    const currentData = await currentRes.json();

    // Mapping and interpolating structures from OpenWeather
    const list = forecastData.list as any[];
    const cityObj = forecastData.city;
    
    // Group 3-hour entries by calendar dates (using timezone offset)
    const groupedDays: { [dateStr: string]: any[] } = {};
    const timezoneOffsetSec = cityObj.timezone || 0;

    list.forEach(item => {
      const localEpochMs = (item.dt + timezoneOffsetSec) * 1000;
      const localDate = new Date(localEpochMs);
      const dayKey = localDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!groupedDays[dayKey]) {
        groupedDays[dayKey] = [];
      }
      groupedDays[dayKey].push(item);
    });

    const dayKeys = Object.keys(groupedDays).sort();
    
    // Build daily forecasts
    const dailyForecasts: DailyForecast[] = [];

    const iconMap = (oWeatherIcon: string): string => {
      if (oWeatherIcon.startsWith('01')) return 'sun';
      if (oWeatherIcon.startsWith('02')) return 'cloud';
      if (oWeatherIcon.startsWith('03') || oWeatherIcon.startsWith('04')) return 'cloud';
      if (oWeatherIcon.startsWith('09') || oWeatherIcon.startsWith('10')) return 'cloud-rain';
      if (oWeatherIcon.startsWith('11')) return 'cloud-lightning';
      if (oWeatherIcon.startsWith('13')) return 'snowflake';
      if (oWeatherIcon.startsWith('50')) return 'cloud';
      return 'cloud';
    };

    // Process forecasted days
    for (let d = 0; d < Math.min(7, dayKeys.length); d++) {
      const dayKey = dayKeys[d];
      const items = groupedDays[dayKey];
      const daySeed = d;
      
      // Calculate daily aggregates
      let tempMin = Infinity;
      let tempMax = -Infinity;
      let maxPrecipProb = 0;
      let dayTotalPrecipAccum = 0;
      let totalWindSpeed = 0;
      let avgWindDeg = 0;
      
      items.forEach(it => {
        if (it.main.temp_min < tempMin) tempMin = it.main.temp_min;
        if (it.main.temp_max > tempMax) tempMax = it.main.temp_max;
        if (it.pop && it.pop > maxPrecipProb) maxPrecipProb = it.pop;
        
        // Sum precipitation accumulation in mm
        const rain3h = it.rain?.['3h'] || it.rain?.['1h'] || 0;
        const snow3h = it.snow?.['3h'] || it.snow?.['1h'] || 0;
        dayTotalPrecipAccum += (rain3h + snow3h);

        totalWindSpeed += it.wind.speed;
        avgWindDeg = it.wind.deg;
      });

      const repItem = items[Math.floor(items.length / 2)] || items[0];
      const desc = repItem.weather[0]?.description || 'Clear sky';
      const iconText = repItem.weather[0]?.icon || '01d';

      const dateObj = new Date(repItem.dt * 1000);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
      const shortDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // Build precise hourly timeline events of this day
      const timelineEvents: WeatherTimelineEvent[] = [];

      items.forEach((it, idx) => {
        const itemTime = new Date(it.dt * 1000);
        const isNight = itemTime.getHours() < 6 || itemTime.getHours() > 20;
        let mappedIcon = iconMap(it.weather[0]?.icon);
        if (mappedIcon === 'sun' && isNight) mappedIcon = 'moon';

        const rainHour = it.rain?.['3h'] || it.rain?.['1h'] || 0;
        const snowHour = it.snow?.['3h'] || it.snow?.['1h'] || 0;

        timelineEvents.push({
          id: `live-${d}-item-${idx}`,
          time: itemTime,
          hourLabel: itemTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          type: 'hourly_status',
          title: `${Math.round(it.main.temp)}°`,
          description: it.weather[0]?.main || 'Clear',
          iconName: mappedIcon,
          temp: Math.round(it.main.temp),
          windSpeed: Number(it.wind.speed.toFixed(1)),
          windDeg: it.wind.deg,
          precipProb: Math.round((it.pop || 0) * 100),
          precipAccum: Number((rainHour + snowHour).toFixed(1)),
          humidity: it.main.humidity,
          colorTheme: (it.pop || 0) > 0.4 ? 'blue' : (it.main.temp > 24 ? 'amber' : 'slate')
        });
      });

      // Insert Simulated Sunset/Sunrise & Moonrise/Moonset
      const sunriseTime = new Date(dateObj);
      sunriseTime.setHours(5, 42, 0);
      
      const sunsetTime = new Date(dateObj);
      sunsetTime.setHours(20, 18, 0);

      const { moonriseTime, moonsetTime } = getMoonriseMoonset(dateObj, daySeed);

      // Find actual peak temp index
      let maxTempItem = items[0];
      items.forEach(it => {
        if (it.main.temp > maxTempItem.main.temp) {
          maxTempItem = it;
        }
      });
      const peakTime = new Date(maxTempItem.dt * 1000);

      // Find any wind shifts (significant degree delta of wind direction)
      let windShiftAdded = false;
      for (let i = 1; i < items.length; i++) {
        const degDelta = Math.abs(items[i].wind.deg - items[i-1].wind.deg);
        if (degDelta > 45 && degDelta < 315) {
          const shiftTime = new Date(items[i].dt * 1000);
          timelineEvents.push({
            id: `live-${d}-windshift`,
            time: shiftTime,
            hourLabel: shiftTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
            type: 'wind_shift',
            title: `Breeze Vector Shift`,
            description: `Wind shifts direction to ${getWindDirectionArrow(items[i].wind.deg)}`,
            iconName: 'navigation',
            windSpeed: Number(items[i].wind.speed.toFixed(1)),
            windDeg: items[i].wind.deg,
            windFromSpeed: Number(items[i-1].wind.speed.toFixed(1)),
            windFromDeg: items[i-1].wind.deg,
            colorTheme: 'emerald',
            isSpecial: true
          });
          windShiftAdded = true;
          break;
        }
      }

      // If no natural wind shift detected, generate one
      if (!windShiftAdded && items.length > 2) {
        const midTime = new Date(items[Math.floor(items.length / 2)].dt * 1000);
        const sourceWind = items[0].wind;
        const targetDeg = (sourceWind.deg + 120) % 360;
        const targetSpeed = Math.max(1, Math.round(sourceWind.speed * 0.7));
        timelineEvents.push({
          id: `live-${d}-windshift-sim`,
          time: midTime,
          hourLabel: midTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          type: 'wind_shift',
          title: `Breeze Vector Shift`,
          description: `Wind shifts direction to ${getWindDirectionArrow(targetDeg)}`,
          iconName: 'navigation',
          windDeg: targetDeg,
          windSpeed: targetSpeed,
          windFromDeg: sourceWind.deg,
          windFromSpeed: Math.round(sourceWind.speed),
          colorTheme: 'emerald',
          isSpecial: true
        });
      }

      // Add Sunrise, Sunset, Moonrise, Moonset
      timelineEvents.push({
        id: `live-${d}-sunrise`,
        time: sunriseTime,
        hourLabel: sunriseTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        type: 'sunrise',
        title: 'Sunrise',
        description: 'First rays break above horizon lines',
        iconName: 'sunrise',
        colorTheme: 'amber',
        isSpecial: true
      });

      timelineEvents.push({
        id: `live-${d}-sunset`,
        time: sunsetTime,
        hourLabel: sunsetTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        type: 'sunset',
        title: 'Sunset',
        description: 'Twilight color gradient fadeout',
        iconName: 'sunset',
        colorTheme: 'indigo',
        isSpecial: true
      });

      timelineEvents.push({
        id: `live-${d}-moonrise`,
        time: moonriseTime,
        hourLabel: moonriseTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        type: 'moonrise',
        title: 'Moonrise',
        description: 'The moon ascends into the twilight canopy',
        iconName: 'moon',
        colorTheme: 'purple',
        isSpecial: true
      });

      timelineEvents.push({
        id: `live-${d}-moonset`,
        time: moonsetTime,
        hourLabel: moonsetTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        type: 'moonset',
        title: 'Moonset',
        description: 'The lunar disc slips below the horizon',
        iconName: 'moon',
        colorTheme: 'slate',
        isSpecial: true
      });

      timelineEvents.push({
        id: `live-${d}-peak`,
        time: peakTime,
        hourLabel: peakTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        type: 'peak_temp',
        title: `Daily Peak: ${Math.round(tempMax)}°`,
        description: `Solar heat peak of this forecast block`,
        iconName: 'flame',
        tempMax: Math.round(tempMax),
        colorTheme: 'rose',
        isSpecial: true
      });

      // Add 'now' if first day
      if (d === 0) {
        const liveNow = new Date();
        timelineEvents.push({
          id: `live-0-now`,
          time: liveNow,
          hourLabel: liveNow.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          type: 'now',
          title: 'Current Conditions',
          description: 'You are right here',
          iconName: 'locate',
          temp: Math.round(currentData.main.temp),
          colorTheme: 'blue',
          isSpecial: true
        });
      }

      // Sort timeline
      timelineEvents.sort((a, b) => a.time.getTime() - b.time.getTime());

      dailyForecasts.push({
        date: dateObj,
        dayName,
        shortDate,
        tempMin: Number.isFinite(tempMin) ? Math.round(tempMin) : 0,
        tempMax: Number.isFinite(tempMax) ? Math.round(tempMax) : 0,
        iconName: iconMap(iconText),
        description: desc.charAt(0).toUpperCase() + desc.slice(1),
        precipProb: Math.round(maxPrecipProb * 100),
        precipAccum: Number(dayTotalPrecipAccum.toFixed(1)),
        windSpeed: Number((totalWindSpeed / items.length).toFixed(1)),
        windDeg: avgWindDeg,
        timelineEvents
      });
    }

    const currentSunrise = new Date((currentData.sys?.sunrise || (Date.now() / 1000 - 15000)) * 1000);
    const currentSunset = new Date((currentData.sys?.sunset || (Date.now() / 1000 + 15000)) * 1000);
    const { moonriseTime: curMoonrise, moonsetTime: curMoonset } = getMoonriseMoonset(new Date(), timezoneOffsetSec % 7);

    // Sum precipitation accumulation for current weather in mm
    const currentRain = currentData.rain?.['1h'] || currentData.rain?.['3h'] || 0;
    const currentSnow = currentData.snow?.['1h'] || currentData.snow?.['3h'] || 0;
    const currentPrecipAccum = currentRain + currentSnow;

    return {
      city: currentData.name || cityObj.name || city,
      country: currentData.sys?.country || cityObj.country || 'Live',
      lat: currentData.coord?.lat || cityObj.coord?.lat || 0,
      lon: currentData.coord?.lon || cityObj.coord?.lon || 0,
      current: {
        temp: Math.round(currentData.main.temp),
        description: currentData.weather[0]?.description || 'Clear',
        iconName: iconMap(currentData.weather[0]?.icon || '01d'),
        humidity: currentData.main.humidity,
        windSpeed: Number(currentData.wind.speed.toFixed(1)),
        windDeg: currentData.wind.deg,
        precipProb: Math.round((list[0]?.pop || 0) * 100),
        precipAccum: Number(currentPrecipAccum.toFixed(1)),
        feelsLike: Math.round(currentData.main.feels_like),
        sunriseTime: currentSunrise,
        sunsetTime: currentSunset,
        moonriseTime: curMoonrise,
        moonsetTime: curMoonset,
      },
      daily: dailyForecasts
    };
  } catch (error) {
    console.error('Failed to parse from live OpenWeather API, falling back to simulator', error);
    throw error;
  }
}

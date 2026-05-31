/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Canonical weather condition kinds shared across all providers. */
export enum WeatherKind {
  // Fair & Cloud cover
  Clear = 'clear',
  ScatteredClouds = 'scattered_clouds',
  PartlyCloudy = 'partly_cloudy',
  MostlyCloudy = 'mostly_cloudy',
  Overcast = 'overcast',

  // Visibility & Atmosphere
  Fog = 'fog',
  Hazy = 'hazy',
  Mist = 'mist',
  Smoke = 'smoke',

  // Liquid Precipitation
  Drizzle = 'drizzle',
  RainLight = 'rain_light',
  RainModerate = 'rain_moderate',
  RainHeavy = 'rain_heavy',
  Showers = 'showers',

  // Wintry Precipitation
  FreezingRain = 'freezing_rain',
  Sleet = 'sleet',
  Ice = 'ice',
  IcePellets = 'ice_pellets',
  SnowLight = 'snow_light',
  SnowModerate = 'snow_moderate',
  SnowHeavy = 'snow_heavy',
  SnowShowers = 'snow_showers',
  Blizzard = 'blizzard',

  // Convective & Severe Storms
  Thunderstorm = 'thunderstorm',
  ThunderstormHail = 'thunderstorm_hail',
  Hurricane = 'hurricane',
  Tornado = 'tornado',

  // Wind & Airborne suspension
  Wind = 'wind',
  Sand = 'sand',

  // Temperature Extremes
  Hot = 'hot',
  Cold = 'cold',

  // Fallback
  Unknown = 'unknown',
}

/** Map a WMO weather code to a WeatherKind. */
export function wmoCodeToKind(code: number): WeatherKind {
  if (code === 0) return WeatherKind.Clear;
  if (code === 1) return WeatherKind.ScatteredClouds;
  if (code === 2) return WeatherKind.PartlyCloudy;
  if (code === 3) return WeatherKind.Overcast;
  if (code === 4 || code === 5) return WeatherKind.Hazy;
  if (code === 10) return WeatherKind.Mist;
  if (code === 45 || code === 48) return WeatherKind.Fog;
  if (code === 51 || code === 53 || code === 55) return WeatherKind.Drizzle;
  if (code === 61) return WeatherKind.RainLight;
  if (code === 63) return WeatherKind.RainModerate;
  if (code === 65) return WeatherKind.RainHeavy;
  if (code === 66 || code === 67) return WeatherKind.FreezingRain;
  if (code === 68 || code === 69) return WeatherKind.Sleet;
  if (code === 71 || code === 77) return WeatherKind.SnowLight;
  if (code === 73) return WeatherKind.SnowModerate;
  if (code === 75) return WeatherKind.SnowHeavy;
  if (code === 79) return WeatherKind.IcePellets;
  if (code === 80 || code === 81 || code === 82) return WeatherKind.Showers;
  if (code === 85 || code === 86) return WeatherKind.SnowShowers;
  if (code === 95) return WeatherKind.Thunderstorm;
  if (code === 96 || code === 99) return WeatherKind.ThunderstormHail;
  return WeatherKind.Unknown;
}

/** Map an OpenWeather icon code (e.g. "01d", "10n") to a WeatherKind. */
export function owIconToKind(icon: string): WeatherKind {
  if (icon.startsWith('01')) return WeatherKind.Clear;
  if (icon.startsWith('02')) return WeatherKind.ScatteredClouds;
  if (icon.startsWith('03')) return WeatherKind.ScatteredClouds;
  if (icon.startsWith('04')) return WeatherKind.MostlyCloudy;
  if (icon.startsWith('09')) return WeatherKind.Showers;
  if (icon.startsWith('10')) return WeatherKind.RainModerate;
  if (icon.startsWith('11')) return WeatherKind.Thunderstorm;
  if (icon.startsWith('13')) return WeatherKind.SnowModerate;
  if (icon.startsWith('50')) return WeatherKind.Fog;
  return WeatherKind.Unknown;
}

/** Map an OpenWeather condition ID to a WeatherKind. */
export function owIdToKind(id: number): WeatherKind {
  // Group 2xx: Thunderstorm
  if (id >= 200 && id < 300) {
    if (id === 201 || id === 202 || id === 211 || id === 212 || id === 221 || id === 231 || id === 232) {
      return WeatherKind.ThunderstormHail;
    }
    return WeatherKind.Thunderstorm;
  }
  // Group 3xx: Drizzle
  if (id >= 300 && id < 400) return WeatherKind.Drizzle;

  // Group 5xx: Rain
  if (id >= 500 && id < 600) {
    if (id === 500) return WeatherKind.RainLight;
    if (id === 501) return WeatherKind.RainModerate;
    if (id === 502 || id === 503 || id === 504) return WeatherKind.RainHeavy;
    if (id === 511) return WeatherKind.FreezingRain;
    return WeatherKind.Showers; // 520, 521, 522, 531
  }

  // Group 6xx: Snow
  if (id >= 600 && id < 700) {
    if (id === 600) return WeatherKind.SnowLight;
    if (id === 601) return WeatherKind.SnowModerate;
    if (id === 602) return WeatherKind.SnowHeavy;
    if (id === 611 || id === 612 || id === 613 || id === 615 || id === 616) return WeatherKind.Sleet;
    if (id === 620 || id === 621 || id === 622) return WeatherKind.SnowShowers;
    return WeatherKind.SnowModerate;
  }

  // Group 7xx: Atmosphere
  if (id === 701) return WeatherKind.Mist;
  if (id === 711) return WeatherKind.Smoke;
  if (id === 721) return WeatherKind.Hazy;
  if (id === 731 || id === 751 || id === 761) return WeatherKind.Sand;
  if (id === 741 || id === 762) return WeatherKind.Fog;
  if (id === 771) return WeatherKind.Wind;
  if (id === 781) return WeatherKind.Tornado;

  // Group 800: Clear
  if (id === 800) return WeatherKind.Clear;

  // Group 80x: Clouds
  if (id === 801) return WeatherKind.ScatteredClouds;
  if (id === 802) return WeatherKind.ScatteredClouds;
  if (id === 803) return WeatherKind.MostlyCloudy;
  if (id === 804) return WeatherKind.Overcast;

  return WeatherKind.Unknown;
}

/** Get semantic severity/specificity priority for a WeatherKind. */
export function getWeatherKindPriority(kind: WeatherKind): number {
  switch (kind) {
    case WeatherKind.Tornado:
    case WeatherKind.Hurricane:
      return 100;
    case WeatherKind.ThunderstormHail:
    case WeatherKind.Thunderstorm:
      return 90;
    case WeatherKind.Blizzard:
    case WeatherKind.SnowHeavy:
    case WeatherKind.RainHeavy:
      return 80;
    case WeatherKind.FreezingRain:
    case WeatherKind.Sleet:
    case WeatherKind.IcePellets:
    case WeatherKind.Ice:
      return 75;
    case WeatherKind.SnowModerate:
    case WeatherKind.RainModerate:
    case WeatherKind.SnowShowers:
    case WeatherKind.Showers:
      return 70;
    case WeatherKind.SnowLight:
    case WeatherKind.RainLight:
    case WeatherKind.Drizzle:
      return 60;
    case WeatherKind.Sand:
    case WeatherKind.Smoke:
    case WeatherKind.Wind:
    case WeatherKind.Fog:
    case WeatherKind.Hazy:
    case WeatherKind.Mist:
      return 50;
    case WeatherKind.Overcast:
      return 45;
    case WeatherKind.MostlyCloudy:
      return 35;
    case WeatherKind.PartlyCloudy:
      return 30;
    case WeatherKind.ScatteredClouds:
      return 25;
    case WeatherKind.Clear:
      return 20;
    default:
      return 0;
  }
}

/** Map an OpenWeather condition array to a single WeatherKind by choosing the highest priority event,
    or detecting combined phenomena (e.g. Rain + Snow = Sleet). */
export function owWeatherArrayToKind(weather: Array<{ id?: number; main?: string; icon?: string }>): WeatherKind {
  if (!weather || weather.length === 0) return WeatherKind.Unknown;

  // Check for combined phenomena: Rain/Drizzle (3xx/5xx) + Snow (6xx) = Sleet
  let hasRain = false;
  let hasSnow = false;
  for (const w of weather) {
    if (w.id === undefined) continue;
    if (w.id >= 300 && w.id < 600) {
      hasRain = true;
    }
    if (w.id >= 600 && w.id < 700) {
      hasSnow = true;
    }
  }

  if (hasRain && hasSnow) {
    return WeatherKind.Sleet;
  }

  let bestKind = WeatherKind.Unknown;
  let maxPriority = -1;

  for (const w of weather) {
    if (w.id === undefined) continue;
    const kind = owIdToKind(w.id);
    const priority = getWeatherKindPriority(kind);
    if (priority > maxPriority) {
      maxPriority = priority;
      bestKind = kind;
    }
  }

  // Fallback to traditional icon matching if no valid IDs matched
  if (bestKind === WeatherKind.Unknown && weather[0]?.icon) {
    return owIconToKind(weather[0].icon);
  }

  return bestKind;
}

/** Map an NWS icon URL fragment to a WeatherKind. */
export function nwsUrlToKind(url: string): WeatherKind {
  const filename = url.split('?')[0].split('/').pop() || '';
  const lowercase = filename.toLowerCase();

  // Severe storms and extreme safety conditions first
  if (lowercase.includes('tornado')) return WeatherKind.Tornado;
  if (lowercase.includes('hurricane')) return WeatherKind.Hurricane;
  if (lowercase.includes('blizzard')) return WeatherKind.Blizzard;

  // Thunderstorms
  if (lowercase.includes('tsra') || lowercase.includes('thunderstorm')) return WeatherKind.Thunderstorm;

  // Rain showers
  if (lowercase.includes('rain_showers') || lowercase.includes('showers') || lowercase.includes('shra')) {
    return WeatherKind.Showers;
  }

  // Freezing Rain / Sleet / Ice Pellets / Ice
  if (lowercase.includes('sleet')) return WeatherKind.Sleet;
  if (lowercase.includes('ip')) return WeatherKind.IcePellets;
  if (lowercase.includes('ice')) return WeatherKind.Ice;
  if (lowercase.includes('fzra')) return WeatherKind.FreezingRain;

  // Dust, Sand, and Wind (check 'sand' here to prevent 'sn' substring match in general snow check)
  if (lowercase.includes('dust') || lowercase.includes('sand')) return WeatherKind.Sand;
  if (lowercase.includes('wind')) return WeatherKind.Wind;

  // Rain (abbreviation 'ra' or 'rain')
  if (lowercase.includes('rain') || lowercase.includes('ra')) return WeatherKind.RainModerate;

  // Snow & Blizzard (abbreviation 'sn' or 'snow')
  if (lowercase.includes('snow') || lowercase.includes('sn')) return WeatherKind.SnowModerate;

  // Clouds and fair sky
  if (lowercase.includes('mostlyclear') || lowercase.includes('mostly_clear') || lowercase.includes('few')) return WeatherKind.ScatteredClouds;
  if (lowercase.includes('skc') || lowercase.includes('clear')) return WeatherKind.Clear;
  if (lowercase.includes('sct') || lowercase.includes('scattered')) return WeatherKind.ScatteredClouds;
  if (lowercase.includes('bkn') || lowercase.includes('mostlycloudy') || lowercase.includes('mostly_cloudy') || lowercase.includes('broken')) return WeatherKind.MostlyCloudy;
  if (lowercase.includes('ovc') || lowercase.includes('overcast')) return WeatherKind.Overcast;

  // Smoke
  if (lowercase.includes('smoke')) return WeatherKind.Smoke;

  // Fog & Haze/Mist
  if (lowercase.includes('fog') || lowercase.includes('fg')) return WeatherKind.Fog;
  if (lowercase.includes('haze')) return WeatherKind.Hazy;
  if (lowercase.includes('mist')) return WeatherKind.Mist;

  // Temperature extremes
  if (lowercase.includes('hot')) return WeatherKind.Hot;
  if (lowercase.includes('cold')) return WeatherKind.Cold;

  return WeatherKind.Unknown;
}

/**
 * Map a WeatherKind to a WK icon name.
 * Returns '{kind}_day' or '{kind}_night' — parsed by WeatherIcon to select
 * the correct custom SVG and day/night variant.
 */
export function weatherKindToIcon(kind: WeatherKind, isDay: boolean): string {
  return `${kind}_${isDay ? 'day' : 'night'}`;
}

/** Short human-readable label for a WeatherKind. */
export function weatherKindToDesc(kind: WeatherKind): string {
  switch (kind) {
    case WeatherKind.Clear:           return 'Clear sky';
    case WeatherKind.ScatteredClouds: return 'Scattered clouds';
    case WeatherKind.PartlyCloudy:    return 'Partly cloudy';
    case WeatherKind.MostlyCloudy:    return 'Mostly cloudy';
    case WeatherKind.Overcast:        return 'Overcast';
    case WeatherKind.Fog:             return 'Fog';
    case WeatherKind.Drizzle:         return 'Drizzle';
    case WeatherKind.RainLight:       return 'Light rain';
    case WeatherKind.RainModerate:    return 'Moderate rain';
    case WeatherKind.RainHeavy:       return 'Heavy rain';
    case WeatherKind.Showers:         return 'Rain showers';
    case WeatherKind.FreezingRain:    return 'Freezing rain';
    case WeatherKind.SnowLight:       return 'Light snow';
    case WeatherKind.SnowModerate:    return 'Moderate snow';
    case WeatherKind.SnowHeavy:       return 'Heavy snow';
    case WeatherKind.SnowShowers:     return 'Snow showers';
    case WeatherKind.Thunderstorm:    return 'Thunderstorm';
    case WeatherKind.ThunderstormHail:return 'Thunderstorm with hail';
    case WeatherKind.Sand:            return 'Dust or sand';
    case WeatherKind.Hazy:            return 'Hazy';
    case WeatherKind.Mist:            return 'Mist';
    case WeatherKind.Unknown:         return 'Unknown conditions';
    case WeatherKind.Smoke:           return 'Smoke';
    case WeatherKind.Wind:            return 'Windy';
    case WeatherKind.Hurricane:       return 'Hurricane';
    case WeatherKind.Tornado:         return 'Tornado';
    case WeatherKind.Hot:             return 'Extremely hot';
    case WeatherKind.Cold:            return 'Extremely cold';
    case WeatherKind.Sleet:           return 'Sleet';
    case WeatherKind.Ice:             return 'Ice';
    case WeatherKind.Blizzard:         return 'Blizzard';
    case WeatherKind.IcePellets:      return 'Ice pellets';
  }
}

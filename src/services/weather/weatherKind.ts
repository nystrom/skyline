/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Canonical weather condition kinds shared across all providers. */
export enum WeatherKind {
  // Fair & Cloud cover
  Clear = 'clear',
  PartlyCloudy = 'partly_cloudy',
  Cloudy = 'cloudy',

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
  if (code === 1 || code === 2) return WeatherKind.PartlyCloudy;
  if (code === 3) return WeatherKind.Cloudy;
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
  if (icon.startsWith('02')) return WeatherKind.PartlyCloudy;
  if (icon.startsWith('03') || icon.startsWith('04')) return WeatherKind.Cloudy;
  if (icon.startsWith('09')) return WeatherKind.Showers;
  if (icon.startsWith('10')) return WeatherKind.RainModerate;
  if (icon.startsWith('11')) return WeatherKind.Thunderstorm;
  if (icon.startsWith('13')) return WeatherKind.SnowModerate;
  if (icon.startsWith('50')) return WeatherKind.Fog;
  return WeatherKind.Unknown;
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
  if (lowercase.includes('skc') || lowercase.includes('few')) return WeatherKind.Clear;
  if (lowercase.includes('sct')) return WeatherKind.PartlyCloudy;
  if (lowercase.includes('bkn') || lowercase.includes('ovc')) return WeatherKind.Cloudy;

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

/** Map a WeatherKind to a Lucide icon name. */
export function weatherKindToIcon(kind: WeatherKind, isDay: boolean): string {
  switch (kind) {
    case WeatherKind.Clear:
      return isDay ? 'sun' : 'moon';
    case WeatherKind.PartlyCloudy:
    case WeatherKind.Cloudy:
    case WeatherKind.Fog:
      return 'cloud';
    case WeatherKind.Drizzle:
      return 'cloud-drizzle';
    case WeatherKind.RainLight:
    case WeatherKind.RainModerate:
    case WeatherKind.RainHeavy:
    case WeatherKind.Showers:
      return 'cloud-rain';
    case WeatherKind.FreezingRain:
    case WeatherKind.SnowLight:
    case WeatherKind.SnowModerate:
    case WeatherKind.SnowHeavy:
    case WeatherKind.SnowShowers:
    case WeatherKind.Sleet:
    case WeatherKind.Ice:
    case WeatherKind.Blizzard:
    case WeatherKind.IcePellets:
      return 'snowflake';
    case WeatherKind.Thunderstorm:
    case WeatherKind.ThunderstormHail:
      return 'cloud-lightning';
    case WeatherKind.Sand:
      return 'wind';
    case WeatherKind.Hazy:
      return 'haze';
    case WeatherKind.Mist:
      return 'mist';
    case WeatherKind.Unknown:
      return 'unknown';
    case WeatherKind.Smoke:
      return 'haze';
    case WeatherKind.Wind:
      return 'wind';
    case WeatherKind.Hurricane:
      return 'wind';
    case WeatherKind.Tornado:
      return 'tornado';
    case WeatherKind.Hot:
      return 'flame';
    case WeatherKind.Cold:
      return 'snowflake';
  }
}

/** Short human-readable label for a WeatherKind. */
export function weatherKindToDesc(kind: WeatherKind): string {
  switch (kind) {
    case WeatherKind.Clear:           return 'Clear sky';
    case WeatherKind.PartlyCloudy:    return 'Partly cloudy';
    case WeatherKind.Cloudy:          return 'Cloudy';
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

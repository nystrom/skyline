/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Canonical weather condition kinds shared across all providers. */
export enum WeatherKind {
  Clear = 'clear',
  PartlyCloudy = 'partly_cloudy',
  Cloudy = 'cloudy',
  Fog = 'fog',
  Drizzle = 'drizzle',
  RainLight = 'rain_light',
  RainModerate = 'rain_moderate',
  RainHeavy = 'rain_heavy',
  Showers = 'showers',
  FreezingRain = 'freezing_rain',
  SnowLight = 'snow_light',
  SnowModerate = 'snow_moderate',
  SnowHeavy = 'snow_heavy',
  SnowShowers = 'snow_showers',
  Thunderstorm = 'thunderstorm',
  ThunderstormHail = 'thunderstorm_hail',
  Sand = 'sand',
}

/** Map a WMO weather code to a WeatherKind. */
export function wmoCodeToKind(code: number): WeatherKind {
  if (code === 0) return WeatherKind.Clear;
  if (code === 1 || code === 2) return WeatherKind.PartlyCloudy;
  if (code === 3) return WeatherKind.Cloudy;
  if (code === 45 || code === 48) return WeatherKind.Fog;
  if (code === 51 || code === 53 || code === 55) return WeatherKind.Drizzle;
  if (code === 61) return WeatherKind.RainLight;
  if (code === 63) return WeatherKind.RainModerate;
  if (code === 65) return WeatherKind.RainHeavy;
  if (code === 66 || code === 67) return WeatherKind.FreezingRain;
  if (code === 71 || code === 77) return WeatherKind.SnowLight;
  if (code === 73) return WeatherKind.SnowModerate;
  if (code === 75) return WeatherKind.SnowHeavy;
  if (code === 80 || code === 81 || code === 82) return WeatherKind.Showers;
  if (code === 85 || code === 86) return WeatherKind.SnowShowers;
  if (code === 95) return WeatherKind.Thunderstorm;
  if (code === 96 || code === 99) return WeatherKind.ThunderstormHail;
  return WeatherKind.Cloudy;
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
  return WeatherKind.Cloudy;
}

/** Map an NWS icon URL fragment to a WeatherKind. */
export function nwsUrlToKind(url: string): WeatherKind {
  if (url.includes('skc') || url.includes('few')) return WeatherKind.Clear;
  if (url.includes('sct')) return WeatherKind.PartlyCloudy;
  if (url.includes('bkn') || url.includes('ovc')) return WeatherKind.Cloudy;
  if (url.includes('tsra') || url.includes('thunderstorm')) return WeatherKind.Thunderstorm;
  if (url.includes('rain_showers') || url.includes('showers')) return WeatherKind.Showers;
  if (url.includes('drizzle')) return WeatherKind.Drizzle;
  if (url.includes('rain')) return WeatherKind.RainModerate;
  if (url.includes('blizzard')) return WeatherKind.SnowHeavy;
  if (url.includes('snow')) return WeatherKind.SnowModerate;
  if (url.includes('sleet') || url.includes('ice')) return WeatherKind.FreezingRain;
  if (url.includes('fog') || url.includes('haze')) return WeatherKind.Fog;
  if (url.includes('dust') || url.includes('sand')) return WeatherKind.Sand;
  return WeatherKind.Cloudy;
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
      return 'snowflake';
    case WeatherKind.Thunderstorm:
    case WeatherKind.ThunderstormHail:
      return 'cloud-lightning';
    case WeatherKind.Sand:
      return 'wind';
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
  }
}

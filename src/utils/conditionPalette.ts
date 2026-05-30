/// <reference types="vite/client" />
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CSSProperties } from 'react';
import { WeatherKind } from '../services/weather/weatherKind';

// Statically import all weather background images to ensure Vite bundles and resolves them correctly at build-time.
import blizzard from '../../assets/images/weather/blizzard.png';
import clear from '../../assets/images/weather/clear.png';
import cold from '../../assets/images/weather/cold.png';
import drizzle from '../../assets/images/weather/drizzle.png';
import fog from '../../assets/images/weather/fog.png';
import freezing_rain from '../../assets/images/weather/freezing_rain.png';
import hazy from '../../assets/images/weather/hazy.png';
import hot from '../../assets/images/weather/hot.png';
import hurricane from '../../assets/images/weather/hurricane.png';
import ice from '../../assets/images/weather/ice.png';
import ice_pellets from '../../assets/images/weather/ice_pellets.png';
import mist from '../../assets/images/weather/mist.png';
import mostly_cloudy from '../../assets/images/weather/mostly_cloudy.png';
import overcast from '../../assets/images/weather/overcast.png';
import partly_cloudy from '../../assets/images/weather/partly_cloudy.png';
import rain_heavy from '../../assets/images/weather/rain_heavy.png';
import rain_light from '../../assets/images/weather/rain_light.png';
import rain_moderate from '../../assets/images/weather/rain_moderate.png';
import sand from '../../assets/images/weather/sand.png';
import scattered_clouds from '../../assets/images/weather/scattered_clouds.png';
import showers from '../../assets/images/weather/showers.png';
import sleet from '../../assets/images/weather/sleet.png';
import smoke from '../../assets/images/weather/smoke.png';
import snow_heavy from '../../assets/images/weather/snow_heavy.png';
import snow_light from '../../assets/images/weather/snow_light.png';
import snow_moderate from '../../assets/images/weather/snow_moderate.png';
import snow_showers from '../../assets/images/weather/snow_showers.png';
import thunderstorm from '../../assets/images/weather/thunderstorm.png';
import thunderstorm_hail from '../../assets/images/weather/thunderstorm_hail.png';
import tornado from '../../assets/images/weather/tornado.png';
import wind from '../../assets/images/weather/wind.png';
import unknown from '../../assets/images/weather/unknown.png';

const IMAGE_MAP: Record<string, string> = {
  blizzard, clear, cold, drizzle, fog, freezing_rain, hazy, hot, hurricane,
  ice, ice_pellets, mist, mostly_cloudy, overcast, partly_cloudy, rain_heavy,
  rain_light, rain_moderate, sand, scattered_clouds, showers, sleet, smoke,
  snow_heavy, snow_light, snow_moderate, snow_showers, thunderstorm, thunderstorm_hail,
  tornado, wind, unknown
};

type Rgb = { r: number; g: number; b: number };

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function rgb(r: number, g: number, b: number): Rgb {
  return { r: clampByte(r), g: clampByte(g), b: clampByte(b) };
}

function normalizeText(s: string | undefined | null): string {
  return (s ?? '').trim().toLowerCase();
}

export type ConditionTintKind =
  | 'clear'
  | 'cloud'
  | 'rain'
  | 'storm'
  | 'snow'
  | 'fog'
  | 'sand'
  | 'other';

export function weatherKindToTintKind(kind: WeatherKind): ConditionTintKind {
  switch (kind) {
    case WeatherKind.Clear:
    case WeatherKind.ScatteredClouds:
    case WeatherKind.PartlyCloudy:
    case WeatherKind.Hot:
      return 'clear';
    case WeatherKind.MostlyCloudy:
    case WeatherKind.Overcast:
      return 'cloud';
    case WeatherKind.Fog:
    case WeatherKind.Hazy:
    case WeatherKind.Mist:
    case WeatherKind.Smoke:
      return 'fog';
    case WeatherKind.Sand:
      return 'sand';
    case WeatherKind.Thunderstorm:
    case WeatherKind.ThunderstormHail:
    case WeatherKind.Hurricane:
    case WeatherKind.Tornado:
      return 'storm';
    case WeatherKind.SnowLight:
    case WeatherKind.SnowModerate:
    case WeatherKind.SnowHeavy:
    case WeatherKind.SnowShowers:
    case WeatherKind.FreezingRain:
    case WeatherKind.Cold:
    case WeatherKind.Sleet:
    case WeatherKind.Ice:
    case WeatherKind.Blizzard:
    case WeatherKind.IcePellets:
      return 'snow';
    case WeatherKind.Drizzle:
    case WeatherKind.RainLight:
    case WeatherKind.RainModerate:
    case WeatherKind.RainHeavy:
    case WeatherKind.Showers:
      return 'rain';
    case WeatherKind.Unknown:
    case WeatherKind.Wind:
      return 'other';
  }
}

export function conditionTintKind(iconName: string | undefined | null, description?: string | null): ConditionTintKind {
  const icon = normalizeText(iconName);
  const desc = normalizeText(description);

  if (desc.includes('sand') || desc.includes('dust') || desc.includes('sahara')) return 'sand';
  if (desc.includes('fog') || desc.includes('mist') || desc.includes('haze') || desc.includes('smoke')) return 'fog';

  if (icon.includes('lightning') || icon.includes('bolt') || icon.includes('storm') || icon.includes('ts')) return 'storm';
  if (icon.includes('snow') || icon.includes('sleet') || icon.includes('ice') || icon.includes('hail') || icon.includes('snowflake'))
    return 'snow';
  if (icon.includes('rain') || icon.includes('drizzle') || icon.includes('shower')) return 'rain';
  if (icon.includes('cloud')) return 'cloud';

  if (icon.includes('sun') || icon.includes('clear')) return 'clear';

  return 'other';
}

export function conditionTintRgb(iconName: string | undefined | null, description?: string | null): Rgb {
  switch (conditionTintKind(iconName, description)) {
    case 'clear':
      // Light sky blue
      return rgb(130, 216, 255);
    case 'cloud':
      // Cool gray
      return rgb(174, 184, 198);
    case 'rain':
      // Indigo wash
      return rgb(102, 146, 222);
    case 'storm':
      // Electric violet-blue
      return rgb(128, 120, 222);
    case 'snow':
      // Icy cyan
      return rgb(170, 244, 255);
    case 'fog':
      // Misty desaturated
      return rgb(196, 206, 216);
    case 'sand':
      // Tan / desert
      return rgb(242, 206, 148);
    default:
      return rgb(124, 246, 255);
  }
}

export const CONDITION_PALETTE: Record<ConditionTintKind, { label: string; rgb: Rgb; hex: string }> = {
  clear: { label: 'Clear', rgb: rgb(130, 216, 255), hex: '#82D8FF' },
  cloud: { label: 'Clouds', rgb: rgb(174, 184, 198), hex: '#AEB8C6' },
  rain: { label: 'Rain', rgb: rgb(102, 146, 222), hex: '#6692DE' },
  storm: { label: 'Storm', rgb: rgb(128, 120, 222), hex: '#8078DE' },
  snow: { label: 'Snow', rgb: rgb(170, 244, 255), hex: '#AAF4FF' },
  fog: { label: 'Fog', rgb: rgb(196, 206, 216), hex: '#C4CED8' },
  sand: { label: 'Sand', rgb: rgb(242, 206, 148), hex: '#F2CE94' },
  other: { label: 'Other', rgb: rgb(124, 246, 255), hex: '#7CF6FF' },
};

export function conditionCardStyle(
  iconName: string | undefined | null,
  description?: string | null,
  weatherKind?: WeatherKind,
): CSSProperties {
  const tint = conditionTintKind(iconName, description);
  const { r, g, b } = CONDITION_PALETTE[tint].rgb;

  const fallbackBg =
    `linear-gradient(180deg, ` +
    `color-mix(in srgb, var(--sky-surface) calc(100% - var(--sky-wash-a)), rgb(${r} ${g} ${b}) var(--sky-wash-a)), ` +
    `color-mix(in srgb, var(--sky-surface-2) calc(100% - var(--sky-wash-b)), rgb(${r} ${g} ${b}) var(--sky-wash-b)))`;

  const imgUrl = (weatherKind && IMAGE_MAP[weatherKind]) ? IMAGE_MAP[weatherKind] : IMAGE_MAP.unknown;

  return {
    background:
      `linear-gradient(0deg, color-mix(in srgb, var(--sky-surface) 55%, transparent), color-mix(in srgb, var(--sky-surface) 55%, transparent)), ` +
      `url(${imgUrl}) center/cover no-repeat, ` +
      fallbackBg,
    borderColor: `color-mix(in srgb, var(--sky-border) calc(100% - var(--sky-wash-border)), rgb(${r} ${g} ${b}) var(--sky-wash-border))`,
    boxShadow: 'none',
  };
}

function rowRgb(kind: ConditionTintKind, desc: string, precipProb?: number): Rgb {
  if (kind === 'rain') {
    const prob = precipProb ?? 50;
    if (desc.includes('heavy') || prob >= 80) return rgb(80, 112, 200);
    if (desc.includes('light') || desc.includes('drizzle') || prob < 40) return rgb(160, 200, 255);
    return rgb(110, 155, 230);
  }
  return CONDITION_PALETTE[kind].rgb;
}

export function conditionRowStyle(
  iconName: string | undefined | null,
  description?: string | null,
  precipProb?: number,
  weatherKind?: WeatherKind,
): CSSProperties {
  const tint = conditionTintKind(iconName, description);
  const { r, g, b } = rowRgb(tint, normalizeText(description), precipProb);

  const fallbackBg = `color-mix(in srgb, var(--sky-surface) calc(100% - var(--sky-row-wash)), rgb(${r} ${g} ${b}) var(--sky-row-wash))`;

  const imgUrl = (weatherKind && IMAGE_MAP[weatherKind]) ? IMAGE_MAP[weatherKind] : IMAGE_MAP.unknown;

  return {
    background:
      `linear-gradient(0deg, color-mix(in srgb, var(--sky-surface) 65%, transparent), color-mix(in srgb, var(--sky-surface) 65%, transparent)), ` +
      `url(${imgUrl}) center/cover no-repeat, ` +
      fallbackBg,
  };
}


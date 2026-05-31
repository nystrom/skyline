/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Sun,
  Moon,
  Cloud,
  Sunset,
  Sunrise,
  Flame,
  Locate,
  Wind,
  Droplets,
  Umbrella,
  Thermometer,
  Search,
  MapPin,
  Sparkles,
  TrendingUp,
  Info,
  Calendar,
  WifiOff,
  Settings,
  Check,
  AlertCircle,
  Navigation,
  Compass,
} from 'lucide-react';
import { wkGlyph } from './WKIcons';

interface WeatherIconProps {
  name: string;
  className?: string;
  size?: number;
}

/**
 * Parses icon names of the form '{kind}_day' or '{kind}_night'.
 * Returns the kind key and isDay flag, or null if not a WK icon.
 */
function parseWKName(name: string): { key: string; isDay: boolean } | null {
  const lower = name.toLowerCase().trim();
  if (lower.endsWith('_day')) {
    return { key: lower.slice(0, -4), isDay: true };
  }
  if (lower.endsWith('_night')) {
    return { key: lower.slice(0, -6), isDay: false };
  }
  return null;
}

function isDarkTheme(): boolean {
  return document.documentElement.classList.contains('dark');
}

export const WeatherIcon: React.FC<WeatherIconProps> = ({ name, className = '', size = 24 }) => {
  const wk = parseWKName(name);

  if (wk) {
    const theme = isDarkTheme() ? 'dark' : 'light';
    const svg = wkGlyph(wk.key, wk.isDay, theme, size);
    return (
      <span
        className={className}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  // Non-weather UI icons — lucide-react
  const normalized = name.toLowerCase().trim();
  switch (normalized) {
    case 'sun':       return <Sun className={className} size={size} />;
    case 'moon':      return <Moon className={className} size={size} />;
    case 'cloud':
    case 'clouds':    return <Cloud className={className} size={size} />;
    case 'sunset':    return <Sunset className={className} size={size} />;
    case 'sunrise':   return <Sunrise className={className} size={size} />;
    case 'flame':
    case 'hot':
    case 'peak_temp': return <Flame className={className} size={size} />;
    case 'navigation':
    case 'compass':
    case 'wind_shift': return <Navigation className={className} size={size} />;
    case 'locate':
    case 'now':       return <Locate className={className} size={size} />;
    case 'wind':      return <Wind className={className} size={size} />;
    case 'droplets':
    case 'humidity':  return <Droplets className={className} size={size} />;
    case 'umbrella':
    case 'precip':    return <Umbrella className={className} size={size} />;
    case 'thermometer': return <Thermometer className={className} size={size} />;
    case 'search':    return <Search className={className} size={size} />;
    case 'mappin':
    case 'map-pin':   return <MapPin className={className} size={size} />;
    case 'sparkles':  return <Sparkles className={className} size={size} />;
    case 'trendingup':
    case 'trending-up': return <TrendingUp className={className} size={size} />;
    case 'info':      return <Info className={className} size={size} />;
    case 'calendar':  return <Calendar className={className} size={size} />;
    case 'wifioff':
    case 'wifi-off':  return <WifiOff className={className} size={size} />;
    case 'settings':  return <Settings className={className} size={size} />;
    case 'check':     return <Check className={className} size={size} />;
    case 'unknown':   return <AlertCircle className={className} size={size} />;
    case 'compass-dir': return <Compass className={className} size={size} />;
    default:          return <Cloud className={className} size={size} />;
  }
};

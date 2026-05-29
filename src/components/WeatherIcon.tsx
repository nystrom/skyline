/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Sun,
  Moon,
  Cloud,
  CloudRain,
  CloudLightning,
  Snowflake,
  Sunset,
  Sunrise,
  Flame,
  Navigation,
  Locate,
  Wind,
  Droplets,
  Umbrella,
  Thermometer,
  Search,
  Compass,
  MapPin,
  Sparkles,
  TrendingUp,
  Info,
  Calendar,
  WifiOff,
  Settings,
  Check,
  AlertCircle,
  Haze,
  CloudFog,
  Tornado
} from 'lucide-react';

interface WeatherIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const WeatherIcon: React.FC<WeatherIconProps> = ({ name, className = '', size = 24 }) => {
  const normalized = name.toLowerCase().trim();

  switch (normalized) {
    case 'sun':
      return <Sun className={className} size={size} />;
    case 'moon':
      return <Moon className={className} size={size} />;
    case 'cloud':
    case 'clouds':
      return <Cloud className={className} size={size} />;
    case 'cloud-rain':
    case 'rain':
    case 'cloud-drizzle':
      return <CloudRain className={className} size={size} />;
    case 'cloud-lightning':
    case 'lightning':
    case 'storm':
      return <CloudLightning className={className} size={size} />;
    case 'snowflake':
    case 'snow':
      return <Snowflake className={className} size={size} />;
    case 'sunset':
      return <Sunset className={className} size={size} />;
    case 'sunrise':
      return <Sunrise className={className} size={size} />;
    case 'flame':
    case 'hot':
    case 'peak_temp':
      return <Flame className={className} size={size} />;
    case 'navigation':
    case 'compass':
    case 'wind_shift':
      return <Navigation className={className} size={size} />;
    case 'locate':
    case 'now':
      return <Locate className={className} size={size} />;
    case 'wind':
      return <Wind className={className} size={size} />;
    case 'droplets':
    case 'humidity':
      return <Droplets className={className} size={size} />;
    case 'umbrella':
    case 'precip':
      return <Umbrella className={className} size={size} />;
    case 'thermometer':
      return <Thermometer className={className} size={size} />;
    case 'search':
      return <Search className={className} size={size} />;
    case 'mappin':
    case 'map-pin':
      return <MapPin className={className} size={size} />;
    case 'sparkles':
      return <Sparkles className={className} size={size} />;
    case 'trendingup':
    case 'trending-up':
      return <TrendingUp className={className} size={size} />;
    case 'info':
      return <Info className={className} size={size} />;
    case 'calendar':
      return <Calendar className={className} size={size} />;
    case 'wifioff':
    case 'wifi-off':
      return <WifiOff className={className} size={size} />;
    case 'settings':
      return <Settings className={className} size={size} />;
    case 'check':
      return <Check className={className} size={size} />;
    case 'haze':
    case 'hazy':
      return <Haze className={className} size={size} />;
    case 'mist':
      return <CloudFog className={className} size={size} />;
    case 'unknown':
      return <AlertCircle className={className} size={size} />;
    case 'tornado':
      return <Tornado className={className} size={size} />;
    case 'hurricane':
      return <Wind className={className} size={size} />;
    default:
      return <Cloud className={className} size={size} />;
  }
};

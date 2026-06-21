import type React from 'react';
import type { WxIconType } from './wxTypes';
import { wkGlyph } from '../WKIcons';

interface WeatherIconDesignProps {
  type?: WxIconType;
  size?: number;
  color?: string;
  accent?: string;
  strokeWidth?: number;
  theme?: 'light' | 'dark';
}

const WX_TO_WK: Record<WxIconType, { key: string; isDay: boolean }> = {
  'clear':        { key: 'clear',          isDay: true  },
  'clear-night':  { key: 'clear',          isDay: false },
  'partly':       { key: 'partly_cloudy',  isDay: true  },
  'partly-night': { key: 'partly_cloudy',  isDay: false },
  'cloudy':       { key: 'cloudy',         isDay: true  },
  'fog':          { key: 'fog',            isDay: true  },
  'rain':         { key: 'rain_moderate',  isDay: true  },
  'heavy':        { key: 'rain_heavy',     isDay: true  },
  'storm':        { key: 'thunderstorm',   isDay: true  },
  'snow':         { key: 'snow_moderate',  isDay: true  },
};

export function WeatherIconDesign({
  type = 'clear',
  size = 24,
  theme = 'light',
}: WeatherIconDesignProps) {
  const { key, isDay } = WX_TO_WK[type] ?? WX_TO_WK['clear'];
  const svg = wkGlyph(key, isDay, theme, size);
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

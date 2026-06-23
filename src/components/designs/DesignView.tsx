import { useState, useEffect } from 'react';
import type { WeatherData, UserSettings, WeatherWarning } from '../../types';
import { adaptWeatherData } from './weatherAdapter';
import { HomeMinimal } from './HomeMinimal';
import { HomeAtmospheric } from './HomeAtmospheric';
import { HomeBold } from './HomeBold';
import { HomeV4 } from './HomeV4';
import type { DesignVariant } from './wxTypes';

interface Props {
  weatherData: WeatherData;
  settings: UserSettings;
  design: DesignVariant;
  onWarningTap?: (warnings: WeatherWarning[]) => void;
}

export function DesignView({ weatherData, settings, design, onWarningTap }: Props) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const s = adaptWeatherData(weatherData, settings.clockFormat);
  const units = settings.tempUnit;
  const precipUnit = settings.precipUnit ?? 'mm/h';
  const windSpeedUnit = settings.windSpeedUnit ?? 'm/s';

  switch (design) {
    case 'minimal':
      return <HomeMinimal s={s} units={units} />;
    case 'atmospheric':
      return <HomeAtmospheric s={s} units={units} />;
    case 'bold':
      return <HomeBold s={s} units={units} precipUnit={precipUnit} windSpeedUnit={windSpeedUnit} />;
    case 'v4':
      return (
        <HomeV4
          s={s} units={units}
          onSevereTap={onWarningTap
            ? () => onWarningTap(weatherData.current.warnings ?? [])
            : undefined}
        />
      );
  }
}

interface ToggleProps {
  current: DesignVariant | 'classic';
  onChange: (v: DesignVariant | 'classic') => void;
}

const TABS: { key: DesignVariant | 'classic'; label: string }[] = [
  { key: 'v4', label: 'V4' },
  { key: 'classic', label: 'Classic' },
  { key: 'minimal', label: 'Minimal' },
  { key: 'atmospheric', label: 'Atmo' },
  { key: 'bold', label: 'Bold' },
];

export function DesignToggle({ current, onChange }: ToggleProps) {
  return (
    <div style={{
      position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
      zIndex: 100,
      display: 'flex', gap: 2,
      background: 'rgba(10,12,18,0.78)',
      backdropFilter: 'blur(20px) saturate(160%)',
      WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      border: '0.5px solid rgba(255,255,255,0.12)',
      borderRadius: 16, padding: 3,
      boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
      fontFamily: '-apple-system, system-ui, sans-serif',
    }}>
      {TABS.map((t) => {
        const active = t.key === current;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              padding: '5px 10px',
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: active ? 700 : 500,
              letterSpacing: 0.3,
              background: active ? 'rgba(255,255,255,0.16)' : 'transparent',
              color: active ? '#fff' : 'rgba(255,255,255,0.55)',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export type { DesignVariant };

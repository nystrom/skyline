/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { WeatherData, UserSettings, DataSource, WeatherWarning } from '../types';
import { WeatherIcon } from './WeatherIcon';
import { Settings, Info, RefreshCw, X, Check, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  convertTemp,
  convertWindSpeed,
  formatTimeAtLocation,
  formatTime24AtLocation,
} from '../utils/unitConverter';
import { WindDirectionArrow } from './WindDirectionArrow';
import { formatLocationLabel } from '../utils/savedLocation';

interface WeatherHeaderProps {
  weatherData: WeatherData;
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  isLoading: boolean;
  onRefresh: () => void;
  errorMsg: string | null;
  fetchWarnings?: string[];
  onDismissError?: () => void;
  onDismissWarnings?: () => void;
  dataSource: DataSource;
  onSelectNow?: () => void;
  onOpenLocations: () => void;
  onShowWarnings?: (warnings: WeatherWarning[]) => void;
}

export const WeatherHeader: React.FC<WeatherHeaderProps> = ({
  weatherData,
  settings,
  updateSettings,
  isLoading,
  onRefresh,
  errorMsg,
  fetchWarnings = [],
  onDismissError,
  onDismissWarnings,
  dataSource,
  onSelectNow,
  onOpenLocations,
  onShowWarnings,
}) => {
  const tz = {
    timeZone: weatherData.timeZone,
    offsetMinutes: weatherData.timeZoneOffsetMinutes,
  };

  const upcomingConditionsLine = (): string | null => {
    const today = weatherData.daily[0];
    if (!today) return null;

    const now = new Date();
    const windowMs = 12 * 3600_000;
    const cutoff = now.getTime() + windowMs;

    const isRainy = (iconName: string, precipProb?: number) =>
      iconName.includes('rain') || (precipProb ?? 0) >= 60;
    const isSnowy = (iconName: string) => iconName.includes('snow');
    const isStormy = (iconName: string) => iconName.includes('lightning');
    const isHighWind = (windSpeed?: number) => (windSpeed ?? 0) >= 12;

    const labelFor = (iconName: string, precipProb?: number, windSpeed?: number): string | null => {
      if (isStormy(iconName)) return 'Storm';
      if (isSnowy(iconName)) return 'Snow';
      if (isRainy(iconName, precipProb)) return 'Rain';
      if (isHighWind(windSpeed)) return 'High winds';
      return null;
    };

    const currentLabel = labelFor(current.iconName, current.precipProb, current.windSpeed);

    const upcomingHours = today.timelineEvents
      .filter((e) => e.type === 'hourly_status')
      .filter((e) => e.time.getTime() > now.getTime() && e.time.getTime() <= cutoff);

    const formatDelta = (target: Date): string => {
      const minutes = Math.max(1, Math.round((target.getTime() - now.getTime()) / 60_000));
      if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
      const hours = Math.round(minutes / 60);
      return `${hours} hour${hours === 1 ? '' : 's'}`;
    };

    const formatAtTime = (target: Date): string =>
      formatTimeAtLocation(target, settings.clockFormat, tz);

    if (currentLabel) {
      const endEvent = upcomingHours.find(
        (e) => labelFor(e.iconName, e.precipProb, e.windSpeed) !== currentLabel
      );
      if (endEvent) {
        return `${currentLabel} ending in ${formatDelta(endEvent.time)}`;
      }
    }

    const startEvent = upcomingHours.find((e) => labelFor(e.iconName, e.precipProb, e.windSpeed) != null);
    if (!startEvent) return null;

    const label = labelFor(startEvent.iconName, startEvent.precipProb, startEvent.windSpeed);
    if (!label) return null;

    const minutes = (startEvent.time.getTime() - now.getTime()) / 60_000;
    if (minutes < 360) {
      return `${label} in ${formatDelta(startEvent.time)}`;
    }
    return `${label} at ${formatAtTime(startEvent.time)} today`;
  };

  const [showSettings, setShowSettings] = useState(false);
  const [draftSettings, setDraftSettings] = useState<UserSettings>(settings);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    if (showSettings) {
      setDraftSettings(settings);
    }
  }, [settings, showSettings]);

  const handleToggleSettings = () => {
    if (!showSettings) {
      setDraftSettings(settings);
    }
    setShowSettings(!showSettings);
  };

  const handleCancelSettings = () => {
    setShowSettings(false);
  };

  const handleSaveSettings = () => {
    updateSettings(draftSettings);
    setShowSettings(false);
  };

  useEffect(() => {
    if (!showSettings) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancelSettings();
        e.preventDefault();
      } else if (e.key === 'Enter') {
        handleSaveSettings();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSettings, draftSettings]);

  const formattedTime = formatTime24AtLocation(currentTime, tz);

  const current = weatherData.current;
  const headerLocationLabel = formatLocationLabel({
    label: settings.activeLocation?.label ?? weatherData.city,
    state: settings.activeLocation?.state,
    country: settings.activeLocation?.country ?? weatherData.country,
  });

  const windDegToCompass = (deg: number): string => {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8];
  };

  const rainChip = (): { label: string; value: string } => {
    const today = weatherData.daily[0];
    const now = new Date();
    const isCurrentlyRaining = current.iconName.includes('rain') || current.precipProb >= 60;

    if (isCurrentlyRaining) {
      return { label: 'RAIN NOW', value: `${current.precipProb}%` };
    }

    if (today) {
      const upcoming = today.timelineEvents
        .filter(e => e.type === 'hourly_status')
        .filter(e => e.time.getTime() > now.getTime())
        .find(e => (e.precipProb ?? 0) >= 50 || e.iconName.includes('rain'));

      if (upcoming) {
        const timeStr = formatTimeAtLocation(upcoming.time, '24h', tz);
        return { label: `RAIN BY ${timeStr}`, value: `${upcoming.precipProb ?? 0}%` };
      }
    }

    return { label: 'PRECIP', value: `${current.precipProb}%` };
  };

  const windChip = (): { label: string; value: string } => {
    const compass = windDegToCompass(current.windDeg);
    const speed = convertWindSpeed(current.windSpeed, settings.windSpeedUnit);
    return {
      label: 'WIND',
      value: `${speed} ${settings.windSpeedUnit}`,
    };
  };

  const humidityChip = (): { label: string; value: string } => ({
    label: 'HUMIDITY',
    value: `${current.humidity}%`,
  });

  const buildDescription = (): string => {
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const desc = cap(current.description);
    const upcoming = upcomingConditionsLine();
    if (!upcoming) return `${desc}.`;
    return `${desc}. ${cap(upcoming)}.`;
  };

  const chips = [rainChip(), humidityChip(), windChip()];

  return (
    <div
      id="weather-header-container"
      className="w-full bg-[color:var(--sky-surface)] shrink-0 relative border-b border-[color:var(--sky-border)]"
    >
      {/* TOP BAR: location · time + controls */}
      <div className="flex items-center justify-between px-4 pt-3">
        <button
          onClick={onOpenLocations}
          className="sky-mono text-[11px] font-bold tracking-widest uppercase text-[color:var(--sky-dim)] hover:text-[color:var(--sky-muted)] transition-colors"
          aria-label="Change location"
        >
          {headerLocationLabel} · {formattedTime}
        </button>
        <div className="flex items-center gap-1">
          {isLoading && (
            <RefreshCw size={13} className="text-[color:var(--sky-dim)] animate-spin" />
          )}
          <button
            onClick={handleToggleSettings}
            aria-expanded={showSettings}
            aria-label="Settings"
            className="p-1.5 rounded-lg text-[color:var(--sky-dim)] hover:text-[color:var(--sky-muted)] hover:bg-[color:var(--sky-card)] transition-colors cursor-pointer"
          >
            <Settings size={15} />
          </button>
        </div>
      </div>

      {/* SETTINGS DRAWER */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden mx-4 mt-2 rounded-2xl bg-slate-900 text-white"
          >
            <div className="p-4 space-y-3">
              {/* Header Bar */}
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-[10px] font-bold text-white/50 tracking-wider uppercase">
                  Settings
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelSettings}
                    className="p-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-lg transition cursor-pointer"
                    title="Cancel changes (ESC)"
                    aria-label="Cancel settings changes"
                  >
                    <X size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="p-1 bg-sky-500 hover:bg-sky-400 text-white border border-transparent rounded-lg transition cursor-pointer"
                    title="Save changes (Enter)"
                    aria-label="Save settings changes"
                  >
                    <Check size={13} />
                  </button>
                </div>
              </div>

              <span className="text-[10px] font-bold text-white/50 tracking-wider uppercase block pt-1">
                Display Options
              </span>

              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70 font-medium">Theme</span>
                <select
                  value={draftSettings.theme}
                  onChange={(e) => setDraftSettings(prev => ({ ...prev, theme: e.target.value as UserSettings['theme'] }))}
                  className="bg-white/10 border border-white/15 rounded-xl text-sm px-3 py-1.5 text-white focus:outline-none cursor-pointer"
                >
                  <option value="system">System</option>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70 font-medium">Temperature</span>
                <div className="flex gap-1 bg-white/10 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setDraftSettings(prev => ({ ...prev, tempUnit: 'C' }))}
                    className={`px-3 py-1 rounded text-xs font-bold transition ${
                      draftSettings.tempUnit === 'C' ? 'bg-white text-slate-900' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    °C
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftSettings(prev => ({ ...prev, tempUnit: 'F' }))}
                    className={`px-3 py-1 rounded text-xs font-bold transition ${
                      draftSettings.tempUnit === 'F' ? 'bg-white text-slate-900' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    °F
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70 font-medium">Wind Speed</span>
                <select
                  value={draftSettings.windSpeedUnit}
                  onChange={(e) => setDraftSettings(prev => ({ ...prev, windSpeedUnit: e.target.value as any }))}
                  className="bg-white/10 border border-white/15 rounded-xl text-sm sky-mono px-3 py-1.5 text-white focus:outline-none cursor-pointer"
                >
                  <option value="m/s">m/s</option>
                  <option value="kph">kph</option>
                  <option value="mph">mph</option>
                  <option value="knots">knots</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-white/70 font-medium">Auto refresh</span>
                <select
                  value={draftSettings.refreshIntervalMinutes}
                  onChange={(e) => setDraftSettings(prev => ({ ...prev, refreshIntervalMinutes: Number.parseInt(e.target.value, 10) }))}
                  className="bg-white/10 border border-white/15 rounded-xl text-sm sky-mono px-3 py-1.5 text-white focus:outline-none cursor-pointer"
                  aria-label="Forecast auto refresh interval"
                >
                  <option value={5}>5 min</option>
                  <option value={10}>10 min</option>
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={60}>60 min</option>
                </select>
              </div>

              <div className="space-y-2 border-t border-white/10 pt-3">
                <span className="text-[10px] font-bold text-white/50 tracking-wider uppercase block">
                  Timeline Astro Events
                </span>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">Sunrise / Sunset</span>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={draftSettings.showSunriseSunset}
                      onChange={(e) => setDraftSettings(prev => ({ ...prev, showSunriseSunset: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-white/15 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white/80 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-sky-500" />
                  </label>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">Moonrise / Moonset</span>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={draftSettings.showMoonriseMoonset}
                      onChange={(e) => setDraftSettings(prev => ({ ...prev, showMoonriseMoonset: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-white/15 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white/80 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-sky-500" />
                  </label>
                </div>
              </div>

              <div className="border-t border-white/10 pt-3 space-y-3">
                <span className="text-[10px] font-bold text-white/50 tracking-wider uppercase block">
                  Advanced
                </span>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70 font-medium">Weather Provider</span>
                    <select
                      value={draftSettings.provider}
                      onChange={(e) => setDraftSettings(prev => ({ ...prev, provider: e.target.value as any }))}
                      className="bg-white/10 border border-white/15 rounded-xl text-sm sky-mono px-3 py-1.5 text-white focus:outline-none cursor-pointer"
                    >
                      <option value="auto">Auto (Keyless)</option>
                      <option value="openweather">OpenWeather</option>
                      <option value="meteoswiss">MeteoSwiss</option>
                      <option value="nws">NWS (US)</option>
                      <option value="arpae">Open-Meteo</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2 border-t border-white/10 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/60">OpenWeather API Key</span>
                    {draftSettings.apiKey && (
                      <button
                        type="button"
                        onClick={() => setDraftSettings(prev => ({ ...prev, apiKey: '' }))}
                        className="text-[10px] text-red-400 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    placeholder="Paste API key..."
                    value={draftSettings.apiKey}
                    onChange={(e) => setDraftSettings(prev => ({ ...prev, apiKey: e.target.value.trim() }))}
                    className="w-full text-sm bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-white placeholder-white/30 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warning banner */}
      {fetchWarnings.length > 0 && (
        <div className="mx-4 mt-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <Info size={13} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="min-w-0">
              {fetchWarnings.map((w, i) => (
                <p key={i} className="leading-tight">{w}</p>
              ))}
            </div>
          </div>
          {onDismissWarnings && (
            <button
              onClick={onDismissWarnings}
              type="button"
              className="p-0.5 hover:bg-amber-100 rounded text-amber-500 transition cursor-pointer shrink-0"
              aria-label="Dismiss warning"
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* Error banner */}
      {errorMsg && (
        <div className="mx-4 mt-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Info size={13} className="text-red-400 shrink-0" />
            <span className="leading-tight">{errorMsg}</span>
          </div>
          {onDismissError && (
            <button
              onClick={onDismissError}
              type="button"
              className="p-0.5 hover:bg-red-100 rounded text-red-400 transition cursor-pointer shrink-0"
              aria-label="Dismiss error"
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* HERO: big temperature + icon */}
      <div
        onClick={onSelectNow}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectNow?.()}
        role="button"
        tabIndex={0}
        className="px-4 pt-4 flex items-end gap-3 cursor-pointer"
        aria-label="Jump to current conditions"
      >
        <div className="text-[76px] leading-none font-black tracking-tighter sky-title text-[color:var(--sky-fg)] tabular-nums">
          {convertTemp(current.temp, settings.tempUnit)}°
        </div>
        <div className="pb-3 flex items-center gap-2">
          <WeatherIcon name={current.iconName} size={46} className="text-amber-400" />
          {current.warnings && current.warnings.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowWarnings?.(current.warnings || []);
              }}
              className="text-red-500 hover:text-red-400 cursor-pointer animate-pulse focus:outline-none flex items-center justify-center p-1 rounded-full hover:bg-red-500/10 transition-colors"
              aria-label="Show active warnings"
            >
              <AlertTriangle size={24} />
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="px-4 pt-1 pb-2 text-[15px] font-bold text-[color:var(--sky-muted)] leading-snug">
        {buildDescription()}
      </p>

      {/* Stat chips */}
      <div className="px-4 pb-4 flex gap-2">
        {chips.map(({ label, value }) => (
          <div
            key={label}
            className="flex-1 bg-[color:var(--sky-card)] border border-[color:var(--sky-border)] rounded-xl px-2.5 py-2"
          >
            <div className="text-[9px] font-bold tracking-widest uppercase sky-mono text-[color:var(--sky-dim)] leading-none mb-1">
              {label}
            </div>
            <div className="flex items-center gap-1 text-[13px] font-bold sky-mono text-[color:var(--sky-fg)]">
              {label.startsWith('WIND') && (
                <WindDirectionArrow
                  deg={current.windSpeed <= 0 ? 0 : current.windDeg}
                  size={10}
                  transition
                />
              )}
              {value}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

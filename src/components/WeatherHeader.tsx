/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { WeatherData, UserSettings, SavedLocation, DataSource } from '../types';
import { WeatherIcon } from './WeatherIcon';
import { MapPin, Search, Settings, Wind, Info, RefreshCw, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  convertTemp,
  convertWindSpeed,
  convertPrecipAccum,
  formatDateLongAtLocation,
  formatTimeAtLocation,
  formatTime24AtLocation,
} from '../utils/unitConverter';
import { WindDirectionArrow } from './WindDirectionArrow';
import { searchLocations, reverseGeocode } from '../utils/weatherFetcher';
import type { GeocodedLocation } from '../services/geocoding/types';
import { conditionCardStyle } from '../utils/conditionPalette';
import {
  geocodedToSaved,
  formatLocationLabel,
  SAVED_LOCATIONS_V1_KEY,
  SAVED_LOCATIONS_V2_KEY,
} from '../utils/savedLocation';
import { geocodeLocation } from '../services/geocoding/geocodingService';

const DEFAULT_SAVED: SavedLocation[] = [
  { id: '47.3769,8.5417', label: 'Zurich', lat: 47.3769, lon: 8.5417, country: 'CH' },
  { id: '51.5074,-0.1278', label: 'London', lat: 51.5074, lon: -0.1278, country: 'GB' },
  { id: '64.1466,-21.9426', label: 'Reykjavik', lat: 64.1466, lon: -21.9426, country: 'IS' },
  { id: '23.4162,25.6628', label: 'Sahara', lat: 23.4162, lon: 25.6628, country: 'EG' },
  { id: '35.6762,139.6503', label: 'Tokyo', lat: 35.6762, lon: 139.6503, country: 'JP' },
];

function loadSavedLocations(): SavedLocation[] {
  try {
    const v2 = localStorage.getItem(SAVED_LOCATIONS_V2_KEY);
    if (v2) {
      const parsed = JSON.parse(v2) as SavedLocation[];
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].lat != null) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse saved locations v2', e);
  }
  return DEFAULT_SAVED;
}

function persistSaved(locations: SavedLocation[]) {
  localStorage.setItem(SAVED_LOCATIONS_V2_KEY, JSON.stringify(locations));
}

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

  const [searchInput, setSearchInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState(settings.apiKey);
  const [showSettings, setShowSettings] = useState(false);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>(loadSavedLocations);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchResults, setSearchResults] = useState<GeocodedLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    const v2 = localStorage.getItem(SAVED_LOCATIONS_V2_KEY);
    if (v2) return;
    const v1 = localStorage.getItem(SAVED_LOCATIONS_V1_KEY);
    if (!v1) return;
    try {
      const names = JSON.parse(v1) as string[];
      if (!Array.isArray(names)) return;
      void (async () => {
        const migrated: SavedLocation[] = [];
        for (const name of names) {
          try {
            const g = await geocodeLocation(name, settings.apiKey);
            migrated.push(geocodedToSaved(g));
          } catch {
            migrated.push({
              id: `pending:${name}`,
              label: name,
              lat: 0,
              lon: 0,
            });
          }
        }
        if (migrated.length > 0) {
          setSavedLocations(migrated);
          persistSaved(migrated);
        }
      })();
    } catch {
      /* ignore */
    }
  }, [settings.apiKey]);

  useEffect(() => {
    const cleanSearch = searchInput.trim();
    if (cleanSearch.length <= 2) {
      searchAbortRef.current?.abort();
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;
      setIsSearching(true);
      setSearchError(null);

      const result = await searchLocations(cleanSearch, settings.apiKey, controller.signal);
      if (controller.signal.aborted) return;

      if (result.ok) {
        setSearchResults(result.results);
        setSearchError(null);
      } else if (result.ok === false) {
        setSearchResults([]);
        setSearchError(result.error);
      }
      setIsSearching(false);
    }, 400);

    return () => {
      clearTimeout(delayDebounceFn);
      searchAbortRef.current?.abort();
    };
  }, [searchInput, settings.apiKey]);

  const selectLocation = (loc: SavedLocation) => {
    updateSettings({ activeLocation: loc, city: loc.label });
    setSearchInput('');
    setSearchResults([]);
    setSearchError(null);

    setSavedLocations((prev) => {
      const exists = prev.some((it) => it.id === loc.id);
      const updated = exists ? prev : [loc, ...prev];
      persistSaved(updated);
      return updated;
    });

    setShowLocationSelector(false);
  };

  const selectFromGeocoded = (loc: GeocodedLocation) => {
    selectLocation(geocodedToSaved(loc));
  };

  const selectCityByName = async (name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    try {
      const g = await geocodeLocation(cleanName, settings.apiKey);
      selectLocation(geocodedToSaved(g));
    } catch (e) {
      console.error('Geocode failed', e);
      selectLocation({
        id: `pending:${cleanName}`,
        label: cleanName,
        lat: 0,
        lon: 0,
      });
    }
  };

  const handleDeleteSavedLocation = (e: React.MouseEvent, locationToDelete: SavedLocation) => {
    e.stopPropagation();
    setSavedLocations((prev) => {
      const updated = prev.filter((item) => item.id !== locationToDelete.id);
      persistSaved(updated);
      return updated;
    });
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({ apiKey: apiKeyInput.trim() });
    setShowSettings(false);
  };

  const handleUseGeolocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const rev = await reverseGeocode(latitude, longitude, settings.apiKey);
          if (rev) {
            selectLocation(geocodedToSaved(rev));
          } else {
            selectLocation({
              id: `${latitude.toFixed(4)},${longitude.toFixed(4)}`,
              label: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
              lat: latitude,
              lon: longitude,
              country: 'GPS',
            });
          }
        } catch {
          selectLocation({
            id: `${latitude.toFixed(4)},${longitude.toFixed(4)}`,
            label: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
            lat: latitude,
            lon: longitude,
            country: 'GPS',
          });
        }
        setShowLocationSelector(false);
      },
      (error) => {
        console.error('Error getting location', error);
        alert('Could not access current location. Please verify device location permissions.');
      }
    );
  };

  const formattedDate = formatDateLongAtLocation(currentTime, tz);
  const formattedTime = formatTime24AtLocation(currentTime, tz);

  const current = weatherData.current;
  const isMetric = settings.units === 'metric';
  const headerLocationLabel = formatLocationLabel({
    label: settings.activeLocation?.label ?? weatherData.city,
    state: settings.activeLocation?.state,
    country: settings.activeLocation?.country ?? weatherData.country,
  });

  return (
    <div
      id="weather-header-container"
      className="w-full rounded-none pt-3 px-3 pb-0 relative overflow-hidden shrink-0 text-[color:var(--sky-fg)] border-b border-white/10"
      style={{
        background: 'linear-gradient(180deg, var(--sky-hero-top), var(--sky-hero-bottom))',
        boxShadow: '0 18px 50px rgba(0,0,0,0.22)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Decorative ambient background reflection indicating weather types */}
      <div className="absolute right-0 top-0 w-64 h-64 bg-[color:rgba(124,246,255,0.14)] rounded-full blur-3xl pointer-events-none -mr-10 -mt-10 animate-pulse" />
      
      {/* Top Header Controls row */}
      <div className="flex items-center justify-between gap-2 mb-2 relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl border border-white/10 bg-white/5 text-[color:var(--sky-accent)] sky-accent-glow">
            <WeatherIcon name="sun" size={18} className="animate-spin-slow text-[color:var(--sky-accent)]" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight sky-title">Skyline</h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            id="gps-location-btn"
            onClick={handleUseGeolocation}
            className="p-1.5 border border-white/10 bg-white/5 hover:bg-white/10 text-[color:var(--sky-muted)] hover:text-[color:var(--sky-fg)] rounded-xl transition duration-150 flex items-center justify-center cursor-pointer"
            title="Use current GPS coordinate location"
            aria-label="Use current GPS location"
          >
            <MapPin size={16} />
          </button>
          
          <button
            id="settings-drawer-btn"
            onClick={() => setShowSettings(!showSettings)}
            aria-expanded={showSettings}
            aria-label="Settings"
            className={`p-1.5 rounded-xl transition duration-150 flex items-center justify-center cursor-pointer ${
              showSettings || settings.apiKey 
                ? 'bg-[color:rgba(124,246,255,0.16)] text-[color:var(--sky-accent)] border border-white/10' 
                : 'border border-white/10 bg-white/5 hover:bg-white/10 text-[color:var(--sky-muted)]'
            }`}
            title="OpenWeather API Key configuration"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Settings Drawer */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden sky-card p-4 rounded-2xl mb-3 relative z-10 space-y-3"
          >
            {/* Display Options */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-[color:var(--sky-dim)] tracking-wider uppercase block">
                Display Options
              </span>

              {/* Theme Selector */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-[color:var(--sky-muted)] font-medium">Theme</span>
                <select
                  value={settings.theme}
                  onChange={(e) => updateSettings({ theme: e.target.value as UserSettings['theme'] })}
                  className="bg-black/25 border border-white/10 rounded-xl text-sm px-3 py-2 text-[color:var(--sky-fg)] focus:outline-none focus:border-[color:rgba(124,246,255,0.55)] cursor-pointer"
                >
                  <option value="system">System</option>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>

              {/* Temperature Selector */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-[color:var(--sky-muted)] font-medium">Temperature Unit</span>
                <div className="flex gap-1 bg-black/25 p-0.5 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => updateSettings({ tempUnit: 'C' })}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition duration-150 ${
                      settings.tempUnit === 'C'
                        ? 'bg-[color:var(--sky-accent-2)] text-black shadow'
                        : 'text-[color:var(--sky-dim)] hover:text-[color:var(--sky-fg)]'
                    }`}
                  >
                    Celsius (°C)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSettings({ tempUnit: 'F' })}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition duration-150 ${
                      settings.tempUnit === 'F'
                        ? 'bg-[color:var(--sky-accent-2)] text-black shadow'
                        : 'text-[color:var(--sky-dim)] hover:text-[color:var(--sky-fg)]'
                    }`}
                  >
                    Fahrenheit (°F)
                  </button>
                </div>
              </div>

              {/* Wind Speed Selector */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-[color:var(--sky-muted)] font-medium">Wind Speed Unit</span>
                <select
                  value={settings.windSpeedUnit}
                  onChange={(e) => updateSettings({ windSpeedUnit: e.target.value as any })}
                  className="bg-black/25 border border-white/10 rounded-xl text-sm sky-mono px-3 py-2 text-[color:var(--sky-fg)] focus:outline-none focus:border-[color:rgba(124,246,255,0.55)] cursor-pointer"
                >
                  <option value="m/s">m/s</option>
                  <option value="kph">kph</option>
                  <option value="mph">mph</option>
                  <option value="knots">knots</option>
                </select>
              </div>

              {/* Auto Refresh */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-[color:var(--sky-muted)] font-medium">Auto refresh</span>
                <select
                  value={settings.refreshIntervalMinutes}
                  onChange={(e) => updateSettings({ refreshIntervalMinutes: Number.parseInt(e.target.value, 10) })}
                  className="bg-black/25 border border-white/10 rounded-xl text-sm sky-mono px-3 py-2 text-[color:var(--sky-fg)] focus:outline-none focus:border-[color:rgba(124,246,255,0.55)] cursor-pointer"
                  aria-label="Forecast auto refresh interval"
                >
                  <option value={5}>5 min</option>
                  <option value={10}>10 min</option>
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={60}>60 min</option>
                </select>
              </div>

              {/* Astro Display Checkboxes */}
              <div className="space-y-2 border-t border-[color:var(--sky-border)] pt-3">
                <span className="text-[10px] font-bold text-[color:var(--sky-dim)] tracking-wider uppercase block">
                  Timeline Astro Events
                </span>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[color:var(--sky-muted)]">Show Sunrise / Sunset markers</span>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={settings.showSunriseSunset}
                      onChange={(e) => updateSettings({ showSunriseSunset: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-black/25 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white/70 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[color:var(--sky-accent)] peer-checked:after:bg-black" />
                  </label>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-[color:var(--sky-muted)]">Show Moonrise / Moonset markers</span>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={settings.showMoonriseMoonset}
                      onChange={(e) => updateSettings({ showMoonriseMoonset: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-black/25 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white/70 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[color:var(--sky-accent)] peer-checked:after:bg-black" />
                  </label>
                </div>
              </div>
            </div>

            {/* Advanced Section */}
            <div className="border-t border-[color:var(--sky-border)] pt-3.5 space-y-4">
              <span className="text-[10px] font-bold text-[color:var(--sky-dim)] tracking-wider uppercase block">
                Advanced
              </span>

              {/* Weather Provider Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[color:var(--sky-muted)] font-medium">Weather Provider</span>
                  <select
                    value={settings.provider}
                    onChange={(e) => updateSettings({ provider: e.target.value as any })}
                    className="bg-black/25 border border-white/10 rounded-xl text-sm sky-mono px-3 py-2 text-[color:var(--sky-fg)] focus:outline-none focus:border-[color:rgba(124,246,255,0.55)] cursor-pointer"
                  >
                    <option value="auto">Automatic (Regional - Keyless)</option>
                    <option value="openweather">OpenWeather (Needs Key)</option>
                    <option value="meteoswiss">MeteoSwiss (Swiss ICON - Keyless)</option>
                    <option value="nws">NWS (United States - Keyless)</option>
                    <option value="arpae">Open-Meteo/ARPAE (Italy - Keyless)</option>
                  </select>
                </div>
                <p className="text-[10px] text-[color:var(--sky-dim)] leading-relaxed italic">
                  {settings.provider === 'auto' && "Automatically resolves the provider by location: MeteoSwiss in Switzerland, NWS in the United States, and Open-Meteo or OpenWeather elsewhere."}
                  {settings.provider === 'openweather' && "OpenWeather requires a personal API Key for live weather."}
                  {settings.provider === 'meteoswiss' && "MeteoSwiss provides keyless, highly accurate weather forecast models for Switzerland & Central Europe."}
                  {settings.provider === 'nws' && "NWS provides keyless, highly accurate public forecasts across the United States."}
                  {settings.provider === 'arpae' && "ARPAE (via Open-Meteo) provides keyless, high-resolution regional weather across Italy."}
                </p>
              </div>

              {/* OpenWeather Form */}
              <form onSubmit={handleSaveApiKey} className="space-y-3 pt-1 border-t border-[color:var(--sky-border)]">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-[color:var(--sky-muted)] flex items-center gap-1.5">
                    <Settings size={14} className="text-[color:var(--sky-accent)]" />
                    OpenWeather API Configuration
                  </label>
                  {settings.apiKey && (
                    <button
                      type="button"
                      onClick={() => {
                        setApiKeyInput('');
                        updateSettings({ apiKey: '' });
                      }}
                      className="text-[10px] text-[color:var(--sky-danger)] hover:underline"
                    >
                      Clear Saved Key
                    </button>
                  )}
                </div>
                <p className="text-sm text-[color:var(--sky-dim)] leading-relaxed">
                  Provide your personal <b>OpenWeather API Key</b>. Leave empty to use free keyless regional sources or our generator simulator.
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Paste appid / api key here..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="flex-1 text-sm bg-black/25 border border-white/10 rounded-xl px-3 py-2.5 text-[color:var(--sky-fg)] placeholder-white/35 focus:outline-none focus:border-[color:rgba(124,246,255,0.55)]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-[color:var(--sky-accent-2)] hover:brightness-110 text-black rounded-xl text-sm font-bold transition duration-150 cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {fetchWarnings.length > 0 && (
        <div className="p-3 bg-[color:rgba(255,208,138,0.10)] border border-[color:rgba(255,208,138,0.24)] text-[color:rgba(255,239,220,0.92)] text-xs rounded-xl mb-4 relative z-10 flex items-start justify-between gap-2 overflow-hidden shadow-sm">
          <div className="flex items-start gap-2 min-w-0">
            <Info size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              {fetchWarnings.map((w, i) => (
                <p key={i} className="leading-tight">
                  {w}
                </p>
              ))}
            </div>
          </div>
          {onDismissWarnings && (
            <button
              onClick={onDismissWarnings}
              type="button"
              className="p-1 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition cursor-pointer flex-shrink-0"
              title="Dismiss warning message"
              aria-label="Dismiss warning"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Error Messaging Banner */}
      {errorMsg && (
        <div className="p-3 bg-[color:rgba(255,107,134,0.14)] border border-[color:rgba(255,107,134,0.30)] text-[color:rgba(255,235,242,0.92)] text-xs rounded-xl mb-4 relative z-10 flex items-center justify-between gap-2 overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Info size={14} className="text-red-400 flex-shrink-0" />
            <span className="leading-tight">{errorMsg}</span>
          </div>
          {onDismissError && (
            <button
              onClick={onDismissError}
              type="button"
              className="p-1 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition cursor-pointer flex-shrink-0"
              title="Dismiss error message"
              aria-label="Dismiss error"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Display Current Condition Panel (Mobile First layout with tap interaction) */}
      <div className="-mx-3">
        <div 
          onClick={onSelectNow}
          onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? onSelectNow?.() : undefined}
          role="button"
          tabIndex={0}
          className="p-3 rounded-3xl border border-white/10 shadow-inner relative z-10 cursor-pointer active:scale-[0.99] transition-all duration-200 group sky-ring"
          style={{
            ...conditionCardStyle(current.iconName, current.description),
          }}
          aria-label="View current conditions on timeline"
          title="Tap card to view NOW on the timeline"
        >
          {/* Dynamic weather particles animation overlay backdrop */}
          {current.iconName.includes('rain') && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl opacity-20">
              <div className="absolute top-[-50px] left-0 right-0 h-[200px] bg-repeat animate-rain-slide opacity-40" 
                   style={{ backgroundImage: 'linear-gradient(to bottom, transparent, rgba(59,130,246,0.3))' }} />
            </div>
          )}

        <div className="flex justify-between items-start">
          <div className="space-y-1.5 flex-1 pr-2">
            
            {/* Clickable Location name with Map Pin leading to selector pop-up */}
            <div 
              onClick={(e) => {
                e.stopPropagation();
                setShowLocationSelector(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  setShowLocationSelector(true);
                }
              }}
              role="button"
              tabIndex={0}
              className="group/loc flex items-center gap-1.5 text-[28px] leading-[1.05] font-black sky-title tracking-tight text-[color:var(--sky-fg)] hover:text-[color:var(--sky-accent)] transition-colors"
              aria-label={`Location: ${headerLocationLabel}. Press to change`}
              title="Tap to search location or pick saved city"
            >
              <span className="underline underline-offset-4 decoration-[color:var(--sky-border-2)] group-hover/loc:decoration-[color:var(--sky-accent)] capitalize duration-150">
                {headerLocationLabel}
              </span>
            </div>

            <span className="text-sm text-[color:var(--sky-muted)] font-semibold tracking-tight">
              {formattedDate} • {formattedTime}
            </span>
            
            {/* Weather status + Live client local date and clock */}
            <div className="text-sm text-[color:var(--sky-muted)] flex flex-col gap-1">
              <span className="capitalize text-[color:var(--sky-muted)] min-h-[18px] font-medium">
                {current.description} • {(() => {
                  if (dataSource === 'cached') return 'Cached forecast';
                  const rp = weatherData.resolvedProvider;
                  const label =
                    rp === 'meteoswiss' ? 'MeteoSwiss Live' :
                    rp === 'nws' ? 'NWS Live' :
                    rp === 'arpae' ? 'Open-Meteo Live' :
                    rp === 'openweather' ? 'OpenWeather Live' : 'Live';
                  return settings.provider === 'auto' ? `${label} (Auto)` : label;
                })()}
              </span>
              {(() => {
                const line = upcomingConditionsLine();
                if (!line) return null;
                return (
                  <span className="text-[13px] text-[color:var(--sky-dim)] font-medium">
                    {line}
                  </span>
                );
              })()}
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0 pt-1">
            <WeatherIcon name={current.iconName} className="text-[color:var(--sky-warn)] drop-shadow-[0_0_10px_rgba(255,208,138,0.55)] animate-pulse" size={40} />
          </div>
        </div>

        {/* Temperature Block and High-Visual Stats Bar */}
        <div className="mt-3 pt-3 border-t border-[color:var(--sky-border)] grid grid-cols-12 gap-1.5 items-center">
          <div className="col-span-6">
            <div className="text-[56px] leading-none font-black tracking-tighter text-[color:var(--sky-fg)] sky-title tabular-nums">
              {convertTemp(current.temp, settings.tempUnit)}°
            </div>
          </div>

          {/* Instant Stat Columns layout */}
          <div className="col-span-6 grid grid-cols-2 gap-2 border-l border-[color:var(--sky-border)] pl-3 text-xs">
            {/* Precipitation indicator */}
            <div className="space-y-1">
              <span className="text-[color:var(--sky-dim)] flex items-center gap-1 text-[10px] sky-mono select-none tracking-wider">
                <WeatherIcon name="precip" size={12} className="text-[color:var(--sky-accent)]" />
                PRECIP
              </span>
              <span className="font-bold block text-[color:var(--sky-fg)] text-base">
                {current.precipProb}%
                <span className="text-[10px] text-[color:var(--sky-dim)] font-normal block sky-mono">
                  {convertPrecipAccum(current.precipAccum || 0, settings.tempUnit)}
                </span>
              </span>
            </div>

            {/* Wind stats column with visually rotating Arrow directions! */}
            <div className="space-y-1">
              <span className="text-[color:var(--sky-dim)] flex items-center gap-1 text-[10px] sky-mono select-none tracking-wider">
                <Wind size={12} className="text-[color:var(--sky-accent-2)]" />
                WIND
              </span>
              
              <div className="flex items-center gap-1.5">
                <WindDirectionArrow
                  deg={current.windSpeed <= 0 ? 0 : current.windDeg}
                  size={11}
                  className="text-[color:var(--sky-accent-2)]"
                  transition
                  title={`Wind direction: ${current.windDeg}°`}
                />
                
                <span className="font-bold text-[color:var(--sky-fg)] text-sm truncate">
                  {convertWindSpeed(current.windSpeed, settings.windSpeedUnit)} {settings.windSpeedUnit}
                </span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* POP-UP OVERLAY LOCATION SELECTOR */}
      <AnimatePresence>
        {showLocationSelector && (
          <motion.div
            initial={{ opacity: 0, y: '50%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '50%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed inset-0 z-50 flex flex-col p-6 overflow-hidden rounded-b-2xl border-b border-white/10 backdrop-blur-md"
            style={{
              background:
                'radial-gradient(900px 620px at 20% 20%, rgba(124,246,255,0.14), transparent 58%), radial-gradient(900px 620px at 82% 30%, rgba(124,255,183,0.11), transparent 60%), linear-gradient(180deg, var(--sky-bg), var(--sky-bg-2))',
            }}
          >
            {/* Drawer Title Bar */}
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-[color:var(--sky-accent)]" />
                <h3 className="text-sm font-bold tracking-tight text-[color:var(--sky-fg)] uppercase sky-title">
                  Select Location
                </h3>
              </div>
              <button
                onClick={() => setShowLocationSelector(false)}
                className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-xl transition cursor-pointer"
                title="Dismiss Selector"
                aria-label="Close location selector"
              >
                <X size={15} />
              </button>
            </div>

            {/* Search Box Inputs */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (searchInput.trim()) {
                  void selectCityByName(searchInput);
                }
              }}
              className="mb-2 flex gap-1.5 shrink-0"
            >
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="pop-up-city-input"
                  type="text"
                  placeholder="Enter city (e.g., Zurich, Paris...)"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full text-sm pl-9 pr-3 py-2.5 bg-black/25 border border-white/10 rounded-xl text-[color:var(--sky-fg)] placeholder-white/35 focus:outline-none focus:border-[color:rgba(124,246,255,0.55)] focus:ring-1 focus:ring-[color:rgba(124,246,255,0.20)]"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-[color:var(--sky-accent-2)] hover:brightness-110 text-black rounded-xl text-sm font-bold transition duration-150 cursor-pointer"
              >
                Go
              </button>
            </form>

            {searchInput.trim().length > 2 && (
              <div className="mb-3 shrink-0 max-h-40 overflow-y-auto scrollbar-none space-y-1 border border-white/10 rounded-xl p-1.5 bg-white/5">
                <span className="text-[10px] text-white/55 sky-mono tracking-wider uppercase px-2 block mb-1">
                  Matching locations
                </span>
                {isSearching && searchResults.length === 0 && !searchError ? (
                  <div className="text-center py-4">
                    <RefreshCw size={18} className="text-[color:var(--sky-accent)] animate-spin mx-auto mb-1" />
                    <p className="text-[10px] text-white/45 sky-mono">Searching...</p>
                  </div>
                ) : searchError ? (
                  <div className="text-center py-3 px-2">
                    <p className="text-xs text-[color:var(--sky-danger)] font-medium">{searchError}</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-3 px-2">
                    <p className="text-xs text-white/45">No matches found.</p>
                  </div>
                ) : (
                  searchResults.map((loc, idx) => {
                    const saved = geocodedToSaved(loc);
                    const isCurrent = settings.activeLocation?.id === saved.id;
                    return (
                      <div
                        key={`${loc.lat}-${loc.lon}-${idx}`}
                        onClick={() => selectFromGeocoded(loc)}
                        className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer border transition-all duration-150 ${
                          isCurrent
                            ? 'bg-[color:rgba(124,246,255,0.12)] border-[color:rgba(124,246,255,0.35)]'
                            : 'bg-black/20 border-transparent hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin size={13} className="text-white/55 shrink-0" />
                          <div className="text-left min-w-0">
                            <span className="text-xs font-bold text-[color:var(--sky-fg)] block truncate">{loc.name}</span>
                            <span className="text-[10px] text-white/55 block truncate">
                              {loc.state ? `${loc.state}, ` : ''}
                              {loc.country}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            <div className="flex-1 flex flex-col min-h-0">
              <span className="text-[10px] text-white/55 sky-mono tracking-wider uppercase mb-2">
                Saved locations
              </span>

              <div className="flex-1 overflow-y-auto scrollbar-none pr-0.5 space-y-1.5">
                {savedLocations.length === 0 ? (
                  <div className="text-center py-10 px-4 border border-dashed border-[color:var(--sky-border-2)] rounded-2xl">
                    <p className="text-xs text-[color:var(--sky-dim)] font-medium">No saved cities yet.</p>
                    <p className="text-[10px] text-[color:var(--sky-dim)] mt-1 font-mono">Use search to add new points.</p>
                  </div>
                ) : (
                  savedLocations.map((loc) => {
                    const isCurrent = settings.activeLocation?.id === loc.id;
                    const displayLabel = formatLocationLabel(loc);
                    return (
                      <div
                        key={loc.id}
                        onClick={() => selectLocation(loc)}
                        className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer border transition-all duration-150 ${
                          isCurrent
                            ? 'bg-[color:rgba(124,255,183,0.12)] border-[color:rgba(124,255,183,0.34)] text-[color:rgba(190,255,224,0.95)]'
                            : 'bg-white/5 border-transparent hover:border-white/12 text-white/70 hover:text-white'
                        }`}
                      >
                        <span className="text-xs font-bold capitalize select-none truncate pr-2">{displayLabel}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {isCurrent && (
                            <span className="text-[8px] bg-white/8 text-[color:var(--sky-accent-2)] sky-mono font-black px-1.5 py-0.5 rounded leading-none">
                              ACTIVE
                            </span>
                          )}
                          <button
                            onClick={(e) => handleDeleteSavedLocation(e, loc)}
                            className="p-1 hover:bg-[color:rgba(255,107,134,0.14)] text-white/40 hover:text-[color:var(--sky-danger)] rounded-lg transition duration-150 cursor-pointer"
                            title={`Remove ${displayLabel} from list`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* GPS Direct Shortcut Bar */}
            <div className="pt-3 border-t border-slate-900 shrink-0 mt-2">
              <button
                type="button"
                onClick={handleUseGeolocation}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/85 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MapPin size={14} className="text-[color:var(--sky-accent)] animate-bounce" />
                Detect My GPS Coordinates
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

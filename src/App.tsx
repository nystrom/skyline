/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { UserSettings, WeatherData, WeatherProvider, SavedLocation, DataSource, WeatherWarning } from './types';
import { fetchWeatherForLocation } from './services/weather/weatherOrchestrator';
import { geocodeLocation } from './services/geocoding/geocodingService';
import { reverseGeocode } from './utils/weatherFetcher';
import { isApiKeyValid } from './services/validation';
import { geocodedToSaved } from './utils/savedLocation';
import { WeatherHeader } from './components/WeatherHeader';
import { formatTimeAtLocation } from './utils/unitConverter';
import { WeatherIcon } from './components/WeatherIcon';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { DesignView } from './components/designs/DesignView';

const ACTIVE_LOCATION_KEY = 'sky_timeline_active_location';
const THEME_KEY = 'sky_timeline_theme';
const REFRESH_MINUTES_KEY = 'sky_timeline_refresh_minutes';

type EffectiveTheme = 'dark' | 'light';

function resolveEffectiveTheme(theme: UserSettings['theme']): EffectiveTheme {
  if (theme === 'dark' || theme === 'light') return theme;
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
}

function applyThemeToDocument(effective: EffectiveTheme) {
  const root = document.documentElement;
  root.dataset.theme = effective;
  if (effective === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

function loadActiveLocation(): SavedLocation | undefined {
  try {
    const raw = localStorage.getItem(ACTIVE_LOCATION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SavedLocation;
      if (parsed?.lat != null && parsed?.lon != null && parsed.label) return parsed;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

export default function App() {
  const [settings, setSettings] = useState<UserSettings>(() => {
    const envKey =
      (import.meta as { env?: { VITE_OPENWEATHER_API_KEY?: string } }).env?.VITE_OPENWEATHER_API_KEY ||
      '';
    const savedKey = localStorage.getItem('sky_timeline_openweather_key') || envKey;
    const savedCity = localStorage.getItem('sky_timeline_city') || '';
    const savedUnits = (localStorage.getItem('sky_timeline_units') as 'metric' | 'imperial') || 'metric';
    const savedProvider = (localStorage.getItem('sky_timeline_provider') as WeatherProvider) || 'auto';
    const savedTempUnit = (localStorage.getItem('sky_timeline_temp_unit') as 'C' | 'F') || 'C';
    const savedWindSpeedUnit =
      (localStorage.getItem('sky_timeline_wind_speed_unit') as 'm/s' | 'kph' | 'mph' | 'knots') || 'm/s';
    const savedPrecipUnit =
      (localStorage.getItem('sky_timeline_precip_unit') as 'mm/h' | 'cm/h' | 'in/h') || 'mm/h';
    const savedClockFormat = (localStorage.getItem('sky_timeline_clock_format') as '12h' | '24h') || '24h';
    const savedShowSunriseSunset = localStorage.getItem('sky_timeline_show_sunrise_sunset') !== 'false';
    const savedShowMoonriseMoonset = localStorage.getItem('sky_timeline_show_moonrise_moonset') !== 'false';
    const savedRefreshMinutesRaw = localStorage.getItem(REFRESH_MINUTES_KEY) || '10';
    const savedRefreshMinutes = (() => {
      const n = Number.parseInt(savedRefreshMinutesRaw, 10);
      if (!Number.isFinite(n)) return 10;
      return Math.min(120, Math.max(1, n));
    })();
    const savedTheme = (localStorage.getItem(THEME_KEY) as UserSettings['theme']) || 'system';
    const activeLocation = loadActiveLocation();

    return {
      apiKey: savedKey,
      city: savedCity,
      activeLocation,
      units: savedUnits,
      provider: savedProvider,
      theme: savedTheme,
      tempUnit: savedTempUnit,
      windSpeedUnit: savedWindSpeedUnit,
      precipUnit: savedPrecipUnit,
      clockFormat: savedClockFormat,
      showSunriseSunset: savedShowSunriseSunset,
      showMoonriseMoonset: savedShowMoonriseMoonset,
      refreshIntervalMinutes: savedRefreshMinutes,
    };
  });

  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [lastLiveData, setLastLiveData] = useState<WeatherData | null>(null);
  const lastLiveRef = useRef<WeatherData | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>('live');
  const [fetchWarnings, setFetchWarnings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedWarnings, setSelectedWarnings] = useState<WeatherWarning[] | null>(null);
  const loadAbortRef = useRef<AbortController | null>(null);
  const geolocatedRef = useRef(false);

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (newSettings.apiKey !== undefined) {
        localStorage.setItem('sky_timeline_openweather_key', updated.apiKey);
      }
      if (newSettings.city !== undefined) {
        localStorage.setItem('sky_timeline_city', updated.city);
      }
      if (newSettings.activeLocation !== undefined) {
        localStorage.setItem(ACTIVE_LOCATION_KEY, JSON.stringify(updated.activeLocation));
        localStorage.setItem('sky_timeline_city', updated.activeLocation.label);
      }
      if (newSettings.units !== undefined) {
        localStorage.setItem('sky_timeline_units', updated.units);
      }
      if (newSettings.provider !== undefined) {
        localStorage.setItem('sky_timeline_provider', updated.provider);
      }
      if (newSettings.tempUnit !== undefined) {
        localStorage.setItem('sky_timeline_temp_unit', updated.tempUnit);
      }
      if (newSettings.windSpeedUnit !== undefined) {
        localStorage.setItem('sky_timeline_wind_speed_unit', updated.windSpeedUnit);
      }
      if (newSettings.precipUnit !== undefined) {
        localStorage.setItem('sky_timeline_precip_unit', updated.precipUnit);
      }
      if (newSettings.clockFormat !== undefined) {
        localStorage.setItem('sky_timeline_clock_format', updated.clockFormat);
      }
      if (newSettings.showSunriseSunset !== undefined) {
        localStorage.setItem('sky_timeline_show_sunrise_sunset', String(updated.showSunriseSunset));
      }
      if (newSettings.showMoonriseMoonset !== undefined) {
        localStorage.setItem('sky_timeline_show_moonrise_moonset', String(updated.showMoonriseMoonset));
      }
      if (newSettings.refreshIntervalMinutes !== undefined) {
        localStorage.setItem(REFRESH_MINUTES_KEY, String(updated.refreshIntervalMinutes));
      }
      if (newSettings.theme !== undefined) {
        localStorage.setItem(THEME_KEY, updated.theme);
      }
      return updated;
    });
  };

  useEffect(() => {
    const apply = () => applyThemeToDocument(resolveEffectiveTheme(settings.theme));
    apply();

    if (settings.theme !== 'system') return;
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');

    const onChange = () => apply();
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }

    // Safari fallback
    const legacy = mql as unknown as { addListener: (cb: () => void) => void; removeListener: (cb: () => void) => void };
    legacy.addListener(onChange);
    return () => legacy.removeListener(onChange);
  }, [settings.theme]);

  // On first load with no saved location, try geolocation
  useEffect(() => {
    if (geolocatedRef.current) return;
    if (settings.activeLocation) return;
    geolocatedRef.current = true;

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const rev = await reverseGeocode(latitude, longitude, settings.apiKey);
          const loc = rev
            ? geocodedToSaved(rev)
            : {
                id: `${latitude.toFixed(4)},${longitude.toFixed(4)}`,
                label: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
                lat: latitude,
                lon: longitude,
              };
          updateSettings({ activeLocation: loc, city: loc.label });
        } catch {
          const loc: SavedLocation = {
            id: `${latitude.toFixed(4)},${longitude.toFixed(4)}`,
            label: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
            lat: latitude,
            lon: longitude,
          };
          updateSettings({ activeLocation: loc, city: loc.label });
        }
      },
      () => {
        // Geolocation denied — fall back to a sensible default
        const fallback: SavedLocation = {
          id: '47.3769,8.5417',
          label: 'Zurich',
          lat: 47.3769,
          lon: 8.5417,
          country: 'CH',
        };
        updateSettings({ activeLocation: fallback, city: fallback.label });
      }
    );
  }, []);

  const handleRefresh = () => {
    loadWeatherData();
  };

  const resolveLocationForFetch = async (signal: AbortSignal): Promise<SavedLocation> => {
    const active = settings.activeLocation;
    if (active && active.lat !== 0 && active.lon !== 0) {
      return active;
    }
    if (settings.city) {
      const geocoded = await geocodeLocation(settings.city, settings.apiKey, signal);
      return geocodedToSaved(geocoded);
    }
    throw new Error('No location set. Tap the location name to search.');
  };

  const loadWeatherData = async () => {
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;

    setIsLoading(true);
    setErrorMsg(null);
    setFetchWarnings([]);

    try {
      const isKeylessCapable = settings.provider === 'auto' || settings.provider !== 'openweather';
      const hasValidKey = settings.apiKey && isApiKeyValid(settings.apiKey);

      if (!isKeylessCapable && !hasValidKey) {
        throw new Error('OpenWeather requires an API key. Add a key or switch to Auto / a keyless provider.');
      }

      const location = await resolveLocationForFetch(controller.signal);
      if (controller.signal.aborted) return;

      const result = await fetchWeatherForLocation(location, settings, controller.signal);
      if (controller.signal.aborted) return;

      setWeatherData(result.data);
      setLastLiveData(result.data);
      lastLiveRef.current = result.data;
      const locationChanged = !settings.activeLocation || location.id !== settings.activeLocation.id;
      if (locationChanged) {
        updateSettings({ activeLocation: location, city: location.label });
      }
      setDataSource(result.source === 'cached' ? 'cached' : 'live');
      setFetchWarnings(result.warnings);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      console.error(err);
      const message = err instanceof Error ? err.message : 'Failed to retrieve weather data.';
      const stale = lastLiveRef.current;
      setErrorMsg(stale ? `${message} Showing your last successful forecast.` : message);
      if (stale) {
        setWeatherData(stale);
        setDataSource('cached');
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!settings.activeLocation && !settings.city) return;
    loadWeatherData();
    return () => loadAbortRef.current?.abort();
  }, [
    settings.city,
    settings.apiKey,
    settings.units,
    settings.provider,
    settings.activeLocation?.id,
  ]);

  useEffect(() => {
    const minutes = Math.min(120, Math.max(1, settings.refreshIntervalMinutes || 10));
    const id = window.setInterval(() => {
      loadWeatherData();
    }, minutes * 60_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.refreshIntervalMinutes, settings.city, settings.provider, settings.activeLocation?.id, settings.apiKey]);

  const displayData = weatherData ?? lastLiveData;

  return (
    <div
      id="app-root-container"
      className="sky-app min-h-screen flex justify-center items-start md:items-center md:py-8 antialiased"
    >
      <div
        id="phone-skin-container"
        className="sky-phone w-full max-w-sm flex flex-col min-h-screen md:min-h-0 md:max-h-[820px] md:rounded-3xl overflow-hidden relative"
      >
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {displayData ? (
            <div
              id="weather-timeline-container"
              key={`${displayData.lat},${displayData.lon}`}
              className="flex-1 min-h-0 overflow-y-auto scrollbar-none relative z-10"
            >
              <div className="relative">
                <DesignView
  weatherData={displayData}
  settings={settings}
  design="v4"
  onWarningTap={(ws) => setSelectedWarnings(ws)}
/>
                <div className="absolute top-0 left-0 right-0 z-50">
                  <WeatherHeader
                    weatherData={displayData}
                    settings={settings}
                    updateSettings={updateSettings}
                    isLoading={isLoading}
                    onRefresh={handleRefresh}
                    errorMsg={null}
                    dataSource={dataSource}
                    onSelectNow={() => {}}
                    onShowWarnings={(warnings) => setSelectedWarnings(warnings)}
                    overlayMode
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
              <div className="flex items-center gap-2">
                <WeatherIcon name="sun" size={22} className="animate-spin-slow text-[color:var(--sky-accent)]" />
                <span className="sky-title text-lg font-bold tracking-tight text-[color:var(--sky-fg)]">
                  Skyline
                </span>
              </div>
            </div>
          )}

          <AnimatePresence>
            {selectedWarnings && selectedWarnings.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedWarnings(null)}
                className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.95, y: 15 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 15 }}
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0.1, bottom: 0.4 }}
                  dragMomentum={false}
                  onDragEnd={(_, info) => {
                    if (info.velocity.y > 400 || info.offset.y > 80) setSelectedWarnings(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-[color:var(--sky-bg)] border border-[color:var(--sky-border)] w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col max-h-[70%] overflow-hidden relative"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-[color:var(--sky-border)] shrink-0">
                    <div className="flex items-center gap-2 text-red-500">
                      <AlertTriangle size={20} className="animate-pulse" />
                      <span className="sky-title text-base font-black tracking-tight uppercase">
                        Weather Alerts
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedWarnings(null)}
                      className="p-1 rounded-full hover:bg-[color:var(--sky-card)] text-[color:var(--sky-muted)] cursor-pointer"
                      aria-label="Close warnings"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1 scrollbar-none">
                    {selectedWarnings.map((w, idx) => (
                      <div key={idx} className="bg-[color:var(--sky-card)] border border-[color:var(--sky-border)] rounded-2xl p-4 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-red-500 font-extrabold text-[14px] leading-tight capitalize">
                            {w.event}
                          </h4>
                          {w.severity && w.severity !== 'unknown' && (
                            <span className={`text-[8px] font-extrabold tracking-widest uppercase sky-mono px-1.5 py-0.5 rounded border ${
                              w.severity === 'extreme' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                              w.severity === 'severe' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                              'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                            }`}>
                              {w.severity}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] sky-mono text-[color:var(--sky-dim)] leading-tight">
                          Issued by: {w.sender || 'Unknown Agency'}
                        </p>
                        <p className="text-[10px] sky-mono text-[color:var(--sky-dim)] leading-tight">
                          {formatTimeAtLocation(w.starts, settings.clockFormat, {
                            timeZone: displayData?.timeZone,
                            offsetMinutes: displayData?.timeZoneOffsetMinutes
                          })} - {formatTimeAtLocation(w.ends, settings.clockFormat, {
                            timeZone: displayData?.timeZone,
                            offsetMinutes: displayData?.timeZoneOffsetMinutes
                          })}
                        </p>
                        <div className="text-[12px] font-medium leading-relaxed text-[color:var(--sky-fg)] whitespace-pre-wrap pt-2 border-t border-[color:var(--sky-border)]/50">
                          {w.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

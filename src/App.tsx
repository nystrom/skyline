/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { UserSettings, WeatherData, WeatherProvider, SavedLocation, DataSource, WeatherWarning } from './types';
import { fetchWeatherForLocation } from './services/weather/weatherOrchestrator';
import { geocodeLocation } from './services/geocoding/geocodingService';
import { isApiKeyValid } from './services/validation';
import { geocodedToSaved, locationId } from './utils/savedLocation';
import { WeatherHeader } from './components/WeatherHeader';
import { DailyScroller } from './components/DailyScroller';
import { formatTimeAtLocation } from './utils/unitConverter';
import { WeatherTimeline } from './components/WeatherTimeline';
import { WeatherIcon } from './components/WeatherIcon';
import { LocationsScreen } from './components/LocationsScreen';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

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

function defaultLocation(city: string): SavedLocation {
  return {
    id: locationId(0, 0),
    label: city,
    lat: 0,
    lon: 0,
  };
}

export default function App() {
  const [settings, setSettings] = useState<UserSettings>(() => {
    const envKey =
      (import.meta as { env?: { VITE_OPENWEATHER_API_KEY?: string } }).env?.VITE_OPENWEATHER_API_KEY ||
      '';
    const savedKey = localStorage.getItem('sky_timeline_openweather_key') || envKey;
    const savedCity = localStorage.getItem('sky_timeline_city') || 'Zurich';
    const savedUnits = (localStorage.getItem('sky_timeline_units') as 'metric' | 'imperial') || 'metric';
    const savedProvider = (localStorage.getItem('sky_timeline_provider') as WeatherProvider) || 'auto';
    const savedTempUnit = (localStorage.getItem('sky_timeline_temp_unit') as 'C' | 'F') || 'C';
    const savedWindSpeedUnit =
      (localStorage.getItem('sky_timeline_wind_speed_unit') as 'm/s' | 'kph' | 'mph' | 'knots') || 'm/s';
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
    const activeLocation = loadActiveLocation() ?? defaultLocation(savedCity);

    return {
      apiKey: savedKey,
      city: savedCity,
      activeLocation,
      units: savedUnits,
      provider: savedProvider,
      theme: savedTheme,
      tempUnit: savedTempUnit,
      windSpeedUnit: savedWindSpeedUnit,
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
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [activeScreen, setActiveScreen] = useState<'home' | 'locations'>('home');
  const [selectedWarnings, setSelectedWarnings] = useState<WeatherWarning[] | null>(null);
  const loadAbortRef = useRef<AbortController | null>(null);
  const scrollSpyBlockedRef = useRef(false);
  const topStackRef = useRef<HTMLDivElement>(null);

  const blockScrollSpy = (ms = 700) => {
    scrollSpyBlockedRef.current = true;
    window.setTimeout(() => {
      scrollSpyBlockedRef.current = false;
    }, ms);
  };

  const resetToFirstDay = (ms = 300) => {
    blockScrollSpy(ms);
    setActiveDayIdx(0);
    requestAnimationFrame(() => {
      const scrollContainer = document.getElementById('weather-timeline-container');
      if (!scrollContainer) return;
      scrollContainer.scrollTo({ top: 0, behavior: 'auto' });
    });
  };

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

  const handleRefresh = () => {
    loadWeatherData();
  };

  const readTopStackHeight = (scrollContainer: HTMLElement): number => {
    const raw = getComputedStyle(scrollContainer).getPropertyValue('--sky-top-stack-h').trim();
    const n = Number.parseFloat(raw.replace('px', ''));
    return Number.isFinite(n) ? n : 0;
  };

  const handleSelectNow = () => {
    blockScrollSpy(500);
    setActiveDayIdx(0);
    setTimeout(() => {
      const scrollContainer = document.getElementById('weather-timeline-container');
      const element = document.getElementById('timeline-event-now');
      if (!scrollContainer || !element) return;

      const containerTop = scrollContainer.getBoundingClientRect().top;
      const elementTop = element.getBoundingClientRect().top;
      const pinned = readTopStackHeight(scrollContainer);
      const visibleHeight = scrollContainer.clientHeight - pinned;
      const targetTop = elementTop - containerTop + scrollContainer.scrollTop - pinned - visibleHeight * 0.2;

      scrollContainer.scrollTo({ top: Math.max(0, targetTop), behavior: 'auto' });
    }, 100);
  };

  const resolveLocationForFetch = async (signal: AbortSignal): Promise<SavedLocation> => {
    const active = settings.activeLocation;
    if (active && active.lat !== 0 && active.lon !== 0) {
      return active;
    }
    const geocoded = await geocodeLocation(settings.city, settings.apiKey, signal);
    return geocodedToSaved(geocoded);
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
      if (location.id !== settings.activeLocation?.id) {
        updateSettings({ activeLocation: location, city: location.label });
      }
      setDataSource(result.source === 'cached' ? 'cached' : 'live');
      setFetchWarnings(result.warnings);
      setActiveDayIdx(0);
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

  useEffect(() => {
    if (!displayData) return;
    resetToFirstDay(300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayData?.daily?.length, displayData?.city]);

  useEffect(() => {
    const container = document.getElementById('weather-timeline-container');
    const topStack = topStackRef.current;
    if (!container || !topStack) return;

    const apply = () => {
      const h = Math.round(topStack.getBoundingClientRect().height);
      container.style.setProperty('--sky-top-stack-h', `${h}px`);
    };

    apply();
    const ro = new ResizeObserver(() => apply());
    ro.observe(topStack);
    return () => ro.disconnect();
  }, [displayData != null]);

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
              className="flex-1 min-h-0 overflow-y-auto scrollbar-none relative z-10"
            >
              <div id="weather-top-stack" ref={topStackRef} className="sticky top-0 z-30">
                <WeatherHeader
                  weatherData={displayData}
                  settings={settings}
                  updateSettings={updateSettings}
                  isLoading={isLoading}
                  onRefresh={handleRefresh}
                  errorMsg={errorMsg}
                  fetchWarnings={fetchWarnings}
                  onDismissError={() => setErrorMsg(null)}
                  onDismissWarnings={() => setFetchWarnings([])}
                  dataSource={dataSource}
                  onSelectNow={handleSelectNow}
                  onOpenLocations={() => setActiveScreen('locations')}
                  onShowWarnings={(warnings) => setSelectedWarnings(warnings)}
                />
                <DailyScroller
                  daily={displayData.daily}
                  selectedDayIdx={activeDayIdx}
                  onSelectDay={setActiveDayIdx}
                  onBeforeTimelineScroll={blockScrollSpy}
                  settings={settings}
                />
              </div>
              <WeatherTimeline
                daily={displayData.daily}
                settings={settings}
                activeDayIdx={activeDayIdx}
                onActiveDayChange={setActiveDayIdx}
                scrollSpyBlockedRef={scrollSpyBlockedRef}
                timeZone={displayData.timeZone}
                timeZoneOffsetMinutes={displayData.timeZoneOffsetMinutes}
                onShowWarnings={(warnings) => setSelectedWarnings(warnings)}
              />
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
            {activeScreen === 'locations' && (
              <LocationsScreen
                settings={settings}
                updateSettings={updateSettings}
                onClose={() => setActiveScreen('home')}
              />
            )}
          </AnimatePresence>
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

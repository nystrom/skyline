/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { UserSettings, WeatherData, WeatherProvider, SavedLocation, DataSource } from './types';
import { fetchWeatherForLocation } from './services/weather/weatherOrchestrator';
import { geocodeLocation } from './services/geocoding/geocodingService';
import { isApiKeyValid } from './services/validation';
import { geocodedToSaved, locationId } from './utils/savedLocation';
import { WeatherHeader } from './components/WeatherHeader';
import { DailyScroller } from './components/DailyScroller';
import { WeatherTimeline } from './components/WeatherTimeline';
import { WeatherIcon } from './components/WeatherIcon';

const ACTIVE_LOCATION_KEY = 'sky_timeline_active_location';

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
    const activeLocation = loadActiveLocation() ?? defaultLocation(savedCity);

    return {
      apiKey: savedKey,
      city: savedCity,
      activeLocation,
      units: savedUnits,
      provider: savedProvider,
      tempUnit: savedTempUnit,
      windSpeedUnit: savedWindSpeedUnit,
      clockFormat: savedClockFormat,
      showSunriseSunset: savedShowSunriseSunset,
      showMoonriseMoonset: savedShowMoonriseMoonset,
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
  const loadAbortRef = useRef<AbortController | null>(null);
  const scrollSpyBlockedRef = useRef(false);

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
      return updated;
    });
  };

  const handleRefresh = () => {
    loadWeatherData();
  };

  const handleSelectNow = () => {
    blockScrollSpy(500);
    setActiveDayIdx(0);
    setTimeout(() => {
      const scrollContainer = document.getElementById('weather-timeline-container');
      const element = document.getElementById('timeline-event-now');
      if (!scrollContainer || !element) return;

      const containerTop = scrollContainer.getBoundingClientRect().top;
      const containerHeight = scrollContainer.clientHeight;
      const elementTop = element.getBoundingClientRect().top;
      const elementHeight = element.clientHeight;
      const targetTop =
        elementTop - containerTop + scrollContainer.scrollTop - containerHeight / 2 + elementHeight / 2;

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

  const displayData = weatherData ?? lastLiveData;

  useEffect(() => {
    if (!displayData) return;
    resetToFirstDay(300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayData?.daily?.length, displayData?.city]);

  return (
    <div
      id="app-root-container"
      className="min-h-screen bg-slate-950 flex justify-center items-start md:items-center py-0 md:py-6 font-sans antialiased text-slate-800 dark:text-slate-100 selection:bg-emerald-500/30"
    >
      <div className="absolute left-10 top-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none hidden lg:block" />
      <div className="absolute right-10 bottom-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none hidden lg:block" />

      <div
        id="phone-skin-container"
        className="w-full max-w-md bg-white dark:bg-slate-900 md:rounded-[40px] md:shadow-[0_20px_50px_rgba(0,0,0,0.6)] md:border-8 md:border-slate-800 flex flex-col min-h-screen md:min-h-[812px] md:max-h-[850px] overflow-hidden"
      >
        <div className="hidden md:flex items-center justify-between px-6 pt-3 pb-1.5 bg-slate-900 text-slate-400 font-mono text-[9px] select-none rounded-t-[30px] border-b border-slate-850">
          <div className="flex items-center gap-1">
            <span>NETWORK SOL_NET</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="w-24 h-4 bg-slate-950 rounded-full border border-slate-800" />
          <div className="flex items-center gap-1">
            <span>100% ELEVATED</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-100 dark:bg-slate-950">
          {displayData ? (
            <>
              <div className="shrink-0 z-20">
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
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
                  <WeatherIcon name="sun" size={22} className="animate-spin-slow text-emerald-400" />
                </span>
                <span className="text-lg font-bold tracking-tight font-sans text-slate-700 dark:text-slate-200">
                  Skyline
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="hidden md:block py-2 bg-slate-900 border-t border-slate-850 rounded-b-[30px] shrink-0 text-center">
          <div className="w-28 h-1 bg-slate-700 rounded-full mx-auto" />
        </div>
      </div>
    </div>
  );
}

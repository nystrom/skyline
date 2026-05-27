/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { UserSettings, WeatherData } from './types';
import { generateSimulatedWeather, fetchLiveWeather } from './utils/weatherFetcher';
import { WeatherHeader } from './components/WeatherHeader';
import { DailyScroller } from './components/DailyScroller';
import { WeatherTimeline } from './components/WeatherTimeline';
import { Info, Sparkles, RefreshCw, Layers } from 'lucide-react';

const isApiKeyValid = (key: string): boolean => {
  const k = key.trim();
  if (!k) return false;
  const lower = k.toLowerCase();
  if (
    lower.includes('placeholder') ||
    lower.includes('key_here') ||
    lower.includes('your_') ||
    lower.includes('my_') ||
    lower === 'undefined' ||
    lower === 'null'
  ) {
    return false;
  }
  if (k.length < 20 || /\s/.test(k)) {
    return false;
  }
  return true;
};

export default function App() {
  // Initialize user settings with local storage fallback or default value
  const [settings, setSettings] = useState<UserSettings>(() => {
    const envKey = (import.meta as any).env?.VITE_OPENWEATHER_API_KEY || (typeof process !== 'undefined' ? (process as any).env?.OPENWEATHER_API_KEY : '') || '';
    const savedKey = localStorage.getItem('sky_timeline_openweather_key') || envKey;
    const savedCity = localStorage.getItem('sky_timeline_city') || 'Zurich';
    const savedUnits = (localStorage.getItem('sky_timeline_units') as 'metric' | 'imperial') || 'metric';

    const savedTempUnit = (localStorage.getItem('sky_timeline_temp_unit') as 'C' | 'F') || 'C';
    const savedWindSpeedUnit = (localStorage.getItem('sky_timeline_wind_speed_unit') as 'm/s' | 'kph' | 'mph' | 'knots') || 'm/s';
    const savedClockFormat = (localStorage.getItem('sky_timeline_clock_format') as '12h' | '24h') || '12h';
    const savedShowSunriseSunset = localStorage.getItem('sky_timeline_show_sunrise_sunset') !== 'false';
    const savedShowMoonriseMoonset = localStorage.getItem('sky_timeline_show_moonrise_moonset') !== 'false';

    return {
      apiKey: savedKey,
      city: savedCity,
      units: savedUnits,
      tempUnit: savedTempUnit,
      windSpeedUnit: savedWindSpeedUnit,
      clockFormat: savedClockFormat,
      showSunriseSunset: savedShowSunriseSunset,
      showMoonriseMoonset: savedShowMoonriseMoonset,
    };
  });

  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeDayIdx, setActiveDayIdx] = useState(0);

  // Sync settings modifications back to local storage
  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (newSettings.apiKey !== undefined) {
        localStorage.setItem('sky_timeline_openweather_key', updated.apiKey);
      }
      if (newSettings.city !== undefined) {
        localStorage.setItem('sky_timeline_city', updated.city);
      }
      if (newSettings.units !== undefined) {
        localStorage.setItem('sky_timeline_units', updated.units);
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
    setActiveDayIdx(0);
    setTimeout(() => {
      const element = document.getElementById('timeline-event-now');
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }, 100);
  };

  const loadWeatherData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (settings.apiKey && isApiKeyValid(settings.apiKey)) {
        // Query live OpenWeather API
        const data = await fetchLiveWeather(settings.city, settings.apiKey, settings.units);
        setWeatherData(data);
        setActiveDayIdx(0); // reset to today
      } else {
        // Use high-fidelity atmospheric generator simulation
        const data = generateSimulatedWeather(settings.city, settings.units);
        setWeatherData(data);
        setActiveDayIdx(0); // reset to today
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Failed to retrieve weather data. Falling back to simulated atmospheric view.');
      // Fallback to simulator automatically on failures
      const simData = generateSimulatedWeather(settings.city, settings.units);
      setWeatherData(simData);
    } finally {
      setIsLoading(false);
    }
  };

  // Triggers loading workflow whenever parameters change
  useEffect(() => {
    loadWeatherData();
  }, [settings.city, settings.apiKey, settings.units]);

  return (
    <div id="app-root-container" className="min-h-screen bg-slate-950 flex justify-center items-start md:items-center py-0 md:py-6 font-sans antialiased text-slate-800 dark:text-slate-100 selection:bg-emerald-500/30">
      {/* Simulation atmospheric lights for desktop decorative surround */}
      <div className="absolute left-10 top-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none hidden lg:block" />
      <div className="absolute right-10 bottom-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none hidden lg:block" />

      {/* Outer Mobile mock design casing */}
      <div 
        id="phone-skin-container" 
        className="w-full max-w-md bg-white dark:bg-slate-900 md:rounded-[40px] md:shadow-[0_20px_50px_rgba(0,0,0,0.6)] md:border-8 md:border-slate-800 flex flex-col min-h-screen md:min-h-[812px] md:max-h-[850px] overflow-hidden"
      >
        {/* Status bar filler notch */}
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

        {/* Content Panel */}
        <div className="flex-1 flex flex-col overflow-y-auto scrollbar-none bg-slate-100 dark:bg-slate-950">
          {weatherData ? (
            <>
              {/* Header section containing widget elements */}
              <WeatherHeader
                weatherData={weatherData}
                settings={settings}
                updateSettings={updateSettings}
                isLoading={isLoading}
                onRefresh={handleRefresh}
                errorMsg={errorMsg}
                onDismissError={() => setErrorMsg(null)}
                useLiveAPI={isApiKeyValid(settings.apiKey)}
                onSelectNow={handleSelectNow}
              />

              {/* Weekly Vertical Scroller Widget */}
              <DailyScroller
                daily={weatherData.daily}
                selectedDayIdx={activeDayIdx}
                onSelectDay={setActiveDayIdx}
                settings={settings}
              />

              {/* Event Timeline */}
              <WeatherTimeline
                daily={weatherData.daily}
                settings={settings}
                activeDayIdx={activeDayIdx}
              />
            </>
          ) : (
            /* Immersive Loading placeholder node */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 font-mono space-y-4 min-h-[400px]">
              <RefreshCw size={36} className="text-emerald-500 animate-spin" />
              <div className="space-y-1">
                <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">Synchronizing Atmosphere Fields...</p>
                <p className="text-xs text-slate-400">Consulting OpenWeather Vector matrices</p>
              </div>
            </div>
          )}
        </div>

        {/* Home navigation visual bar indicator */}
        <div className="hidden md:block py-2 bg-slate-900 border-t border-slate-850 rounded-b-[30px] shrink-0 text-center">
          <div className="w-28 h-1 bg-slate-700 rounded-full mx-auto" />
        </div>
      </div>
    </div>
  );
}

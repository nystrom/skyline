/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { WeatherData, UserSettings } from '../types';
import { WeatherIcon } from './WeatherIcon';
import { MapPin, Search, Settings, Wind, Info, RefreshCw, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { convertTemp, convertWindSpeed, convertPrecipAccum, formatTime } from '../utils/unitConverter';

interface WeatherHeaderProps {
  weatherData: WeatherData;
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  isLoading: boolean;
  onRefresh: () => void;
  errorMsg: string | null;
  onDismissError?: () => void;
  useLiveAPI: boolean;
  onSelectNow?: () => void;
}

export const WeatherHeader: React.FC<WeatherHeaderProps> = ({
  weatherData,
  settings,
  updateSettings,
  isLoading,
  onRefresh,
  errorMsg,
  onDismissError,
  useLiveAPI,
  onSelectNow
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState(settings.apiKey);
  const [showSettings, setShowSettings] = useState(false);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  
  // Track and storage locations list locally 
  const [savedLocations, setSavedLocations] = useState<string[]>(() => {
    const saved = localStorage.getItem('sky_timeline_saved_locations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Failed to parse saved locations', e);
      }
    }
    return ['Zurich', 'London', 'Reykjavik', 'Sahara', 'Tokyo'];
  });

  // Dynamic live time update clock
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const selectCity = (cityName: string) => {
    const cleanName = cityName.trim();
    if (!cleanName) return;

    // Trigger update settings city
    updateSettings({ city: cleanName });
    setSearchInput('');

    // Append to list of saved states if not present
    setSavedLocations((prev) => {
      const exists = prev.some(it => it.toLowerCase() === cleanName.toLowerCase());
      if (exists) return prev;
      const updated = [cleanName, ...prev];
      localStorage.setItem('sky_timeline_saved_locations', JSON.stringify(updated));
      return updated;
    });

    setShowLocationSelector(false);
  };

  const handleDeleteSavedLocation = (e: React.MouseEvent, locationToDelete: string) => {
    e.stopPropagation(); // Stop drawer closure or activation
    setSavedLocations((prev) => {
      const updated = prev.filter((item) => item.toLowerCase() !== locationToDelete.toLowerCase());
      localStorage.setItem('sky_timeline_saved_locations', JSON.stringify(updated));
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
      (position) => {
        const { latitude, longitude } = position.coords;
        // Search by GPS coordinate tag - weatherFetcher will dynamically query reverse lookup Geo details
        const geoQuery = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        updateSettings({ city: geoQuery });
        setShowLocationSelector(false);
      },
      (error) => {
        console.error('Error getting location', error);
        alert('Could not access current location. Please verify device location permissions.');
      }
    );
  };

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const formattedTime = formatTime(currentTime, settings.clockFormat);

  const current = weatherData.current;
  const isMetric = settings.units === 'metric';

  return (
    <div id="weather-header-container" className="w-full bg-slate-900 text-white rounded-b-3xl shadow-xl border-b border-slate-800 p-5 relative overflow-hidden shrink-0">
      {/* Decorative ambient background reflection indicating weather types */}
      <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10 animate-pulse" />
      
      {/* Top Header Controls row */}
      <div className="flex items-center justify-between gap-2 mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-slate-800/80 rounded-xl text-emerald-400">
            <WeatherIcon name="sun" size={20} className="animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight font-sans">Skyline</h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            id="gps-location-btn"
            onClick={handleUseGeolocation}
            className="p-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white rounded-xl transition duration-150 flex items-center justify-center cursor-pointer"
            title="Use current GPS coordinate location"
          >
            <MapPin size={18} />
          </button>
          
          <button
            id="settings-drawer-btn"
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-xl transition duration-150 flex items-center justify-center cursor-pointer ${
              showSettings || settings.apiKey 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300'
            }`}
            title="OpenWeather API Key configuration"
          >
            <Settings size={18} />
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
            className="overflow-hidden bg-slate-800/95 border border-slate-705 p-5 rounded-2xl mb-4 relative z-10 space-y-4"
          >
            {/* OpenWeather Form */}
            <form onSubmit={handleSaveApiKey} className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Settings size={14} className="text-emerald-400" />
                  OpenWeather API Configurations
                </label>
                {settings.apiKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setApiKeyInput('');
                      updateSettings({ apiKey: '' });
                    }}
                    className="text-[10px] text-red-400 hover:underline"
                  >
                    Clear Saved Key
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Provide your personal <b>OpenWeather API Key</b> to load live real-time conditions. Leave empty and click any town name below to see our rich simulator engine!
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Paste appid / api key here..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="flex-1 text-xs bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition duration-150 cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>

            {/* Advanced Settings Area */}
            <div className="border-t border-slate-700/60 pt-3.5 space-y-4">
              <span className="text-[10px] font-bold text-slate-300 tracking-wider uppercase block">
                Display Options
              </span>

              {/* Temperature Selector */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Temperature Unit</span>
                <div className="flex gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => updateSettings({ tempUnit: 'C' })}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold transition duration-150 ${
                      settings.tempUnit === 'C'
                        ? 'bg-emerald-500 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Celsius (°C)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSettings({ tempUnit: 'F' })}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold transition duration-150 ${
                      settings.tempUnit === 'F'
                        ? 'bg-emerald-500 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Fahrenheit (°F)
                  </button>
                </div>
              </div>

              {/* Wind Speed Selector */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium font-sans">Wind Speed Unit</span>
                <select
                  value={settings.windSpeedUnit}
                  onChange={(e) => updateSettings({ windSpeedUnit: e.target.value as any })}
                  className="bg-slate-900 border border-slate-700 rounded-lg text-[11px] font-mono px-2 py-1 text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="m/s">m/s</option>
                  <option value="kph">kph</option>
                  <option value="mph">mph</option>
                  <option value="knots">knots</option>
                </select>
              </div>

               {/* Clock Format Selector */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium font-sans">Time Display</span>
                <div className="flex gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => updateSettings({ clockFormat: '12h' })}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold transition duration-150 ${
                      settings.clockFormat === '12h'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    12 Hr
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSettings({ clockFormat: '24h' })}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold transition duration-150 ${
                      settings.clockFormat === '24h'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    24 Hr
                  </button>
                </div>
              </div>

              {/* Astro Display Checkboxes */}
              <div className="space-y-2 border-t border-slate-750/50 pt-3">
                <span className="text-[10px] font-bold text-slate-450 tracking-wider uppercase block">
                  Timeline Astro Events
                </span>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Show Sunrise / Sunset markers</span>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={settings.showSunriseSunset}
                      onChange={(e) => updateSettings({ showSunriseSunset: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-900 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-300 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white" />
                  </label>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-sans">Show Moonrise / Moonset markers</span>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={settings.showMoonriseMoonset}
                      onChange={(e) => updateSettings({ showMoonriseMoonset: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-slate-900 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-300 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white" />
                  </label>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Messaging Banner */}
      {errorMsg && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-200 text-xs rounded-xl mb-4 relative z-10 flex items-center justify-between gap-2 overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Info size={14} className="text-red-400 flex-shrink-0" />
            <span className="leading-tight">{errorMsg}</span>
          </div>
          {onDismissError && (
            <button
              onClick={onDismissError}
              type="button"
              className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition cursor-pointer flex-shrink-0"
              title="Dismiss warning message"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Display Current Condition Panel (Mobile First layout with tap interaction) */}
      <div 
        onClick={onSelectNow}
        className="bg-gradient-to-br from-slate-800/85 to-slate-900/70 p-5 rounded-3xl border border-slate-700/50 shadow-inner relative z-10 cursor-pointer hover:border-emerald-500/50 hover:from-slate-800 hover:to-slate-850 active:scale-[0.99] transition-all duration-200 group"
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
                e.stopPropagation(); // Stop trigger onSelectNow timeline leap
                setShowLocationSelector(true);
              }}
              className="group/loc inline-flex items-center gap-1.5 text-2xl font-black font-sans tracking-tight text-white hover:text-emerald-300 transition-colors"
              title="Tap to search location or pick saved city"
            >
              <MapPin size={22} className="text-emerald-400 group-hover/loc:scale-110 transition-transform duration-150 shrink-0" />
              <span className="underline underline-offset-4 decoration-slate-600 group-hover/loc:decoration-emerald-400 capitalize duration-150">
                {weatherData.city}
              </span>
              <span className="text-xs font-bold text-slate-400 group-hover/loc:text-emerald-300 bg-slate-900 border border-slate-850 px-1.5 py-0.5 rounded ml-1">
                {weatherData.country}
              </span>
            </div>
            
            {/* Weather status + Live client local date and clock */}
            <div className="text-xs text-slate-300 flex flex-col gap-1">
              <span className="capitalize text-slate-350 min-h-[16px] font-medium">
                {current.description} • {useLiveAPI ? 'OpenWeather Live' : 'Simulated Sky'}
              </span>
              <span className="font-mono text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded w-fit tracking-wide shadow-sm">
                {formattedDate} • {formattedTime}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0 pt-1">
            <WeatherIcon name={current.iconName} className="text-amber-400 drop-shadow-[0_0_8px_rgba(242,152,11,0.55)] animate-pulse" size={44} />
          </div>
        </div>

        {/* Temperature Block and High-Visual Stats Bar */}
        <div className="mt-4 pt-3.5 border-t border-slate-700/50 grid grid-cols-12 gap-2 items-center">
          <div className="col-span-5">
            <div className="text-4xl font-black tracking-tighter text-white font-sans flex items-start">
              {convertTemp(current.temp, settings.tempUnit)}
              <span className="text-xl font-medium mt-1 select-none">°</span>
            </div>
          </div>

          {/* Instant Stat Columns layout */}
          <div className="col-span-7 grid grid-cols-2 gap-3 border-l border-slate-700/50 pl-4 text-xs">
            {/* Precipitation indicator */}
            <div className="space-y-1">
              <span className="text-slate-400 flex items-center gap-1 text-[10px] font-mono select-none tracking-wider">
                <WeatherIcon name="precip" size={12} className="text-blue-400" />
                PRECIP
              </span>
              <span className="font-bold block text-slate-200 text-sm">
                {current.precipProb}%
                <span className="text-[10px] text-slate-400 font-normal block font-mono">
                  {convertPrecipAccum(current.precipAccum || 0, settings.tempUnit)}
                </span>
              </span>
            </div>

            {/* Wind stats column with visually rotating Arrow directions! */}
            <div className="space-y-1">
              <span className="text-slate-400 flex items-center gap-1 text-[10px] font-mono select-none tracking-wider">
                <Wind size={12} className="text-emerald-400" />
                WIND
              </span>
              
              <div className="flex items-center gap-1.5">
                {/* Visual arrow indicator: rotates dynamically based on wind degrees */}
                <span 
                  className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold font-sans text-xs transition-all duration-300 shadow-sm shrink-0"
                  style={{ transform: `rotate(${current.windDeg}deg)` }}
                  title={`Wind Degrees: ${current.windDeg}°`}
                >
                  ↑
                </span>
                
                <span className="font-bold text-slate-200 text-xs truncate">
                  {convertWindSpeed(current.windSpeed, settings.windSpeedUnit)} {settings.windSpeedUnit}
                </span>
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
            className="absolute inset-0 bg-slate-950/98 backdrop-blur-md z-50 flex flex-col p-6 overflow-hidden rounded-b-2xl border-b border-slate-800"
          >
            {/* Drawer Title Bar */}
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-emerald-400" />
                <h3 className="text-sm font-bold tracking-tight text-white uppercase font-sans">
                  Select Location
                </h3>
              </div>
              <button
                onClick={() => setShowLocationSelector(false)}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
                title="Dismiss Selector"
              >
                <X size={15} />
              </button>
            </div>

            {/* Search Box Inputs */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (searchInput.trim()) {
                  selectCity(searchInput);
                }
              }} 
              className="mb-4 flex gap-1.5 shrink-0"
            >
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="pop-up-city-input"
                  type="text"
                  placeholder="Enter city (e.g., Zurich, Paris...)"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition duration-150 cursor-pointer"
              >
                Go
              </button>
            </form>

            {/* Fast Access List */}
            <div className="flex-1 flex flex-col min-h-0">
              <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase mb-2">
                Saved Locations
              </span>

              <div className="flex-1 overflow-y-auto scrollbar-none pr-0.5 space-y-1.5">
                {savedLocations.length === 0 ? (
                  <div className="text-center py-10 px-4 border border-dashed border-slate-800/80 rounded-2xl">
                    <p className="text-xs text-slate-500 font-medium">No saved cities yet.</p>
                    <p className="text-[10px] text-slate-600 mt-1 font-mono">Use search to add new points.</p>
                  </div>
                ) : (
                  savedLocations.map((loc) => {
                    const isCurrent = weatherData.city.toLowerCase().trim() === loc.toLowerCase().trim();
                    return (
                      <div
                        key={loc}
                        onClick={() => selectCity(loc)}
                        className={`group flex items-center justify-between p-3 rounded-2xl cursor-pointer border transition-all duration-150 ${
                          isCurrent
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                            : 'bg-slate-900/40 border-slate-900 hover:border-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        <span className="text-xs font-bold capitalize select-none">{loc}</span>
                        <div className="flex items-center gap-2">
                          {isCurrent && (
                            <span className="text-[8px] bg-emerald-500/20 text-emerald-400 font-mono font-black px-1.5 py-0.5 rounded leading-none shrink-0">
                              ACTIVE
                            </span>
                          )}
                          <button
                            onClick={(e) => handleDeleteSavedLocation(e, loc)}
                            className="p-1 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-lg transition duration-150 cursor-pointer shrink-0"
                            title={`Remove ${loc} from list`}
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
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 text-slate-200 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MapPin size={14} className="text-emerald-400 animate-bounce" />
                Detect My GPS Coordinates
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

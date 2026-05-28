/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, X, Trash2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserSettings, SavedLocation } from '../types';
import { searchLocations, reverseGeocode, geocodeLocation } from '../utils/weatherFetcher';
import type { GeocodedLocation } from '../services/geocoding/types';
import {
  geocodedToSaved,
  formatLocationLabel,
  SAVED_LOCATIONS_V2_KEY,
} from '../utils/savedLocation';

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

interface LocationsScreenProps {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  onClose: () => void;
}

export const LocationsScreen: React.FC<LocationsScreenProps> = ({
  settings,
  updateSettings,
  onClose,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>(loadSavedLocations);
  const [searchResults, setSearchResults] = useState<GeocodedLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Listen for Escape key to close the locations screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Debounced search logic
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
      } else {
        setSearchResults([]);
        setSearchError('error' in result ? result.error : 'Search failed');
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

    onClose();
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
      },
      (error) => {
        console.error('Error getting location', error);
        alert('Could not access current location. Please verify device location permissions.');
      }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: '30px' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '30px' }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      className="absolute inset-0 z-50 flex flex-col p-6 overflow-hidden rounded-b-2xl md:rounded-3xl border border-white/10 backdrop-blur-md"
      style={{
        background:
          'radial-gradient(900px 620px at 20% 20%, rgba(124,246,255,0.14), transparent 58%), radial-gradient(900px 620px at 82% 30%, rgba(124,255,183,0.11), transparent 60%), linear-gradient(180deg, var(--sky-bg), var(--sky-bg-2))',
      }}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-[color:var(--sky-accent)] animate-pulse" />
          <h3 className="text-sm font-bold tracking-tight text-[color:var(--sky-fg)] uppercase sky-title">
            Select Location
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white rounded-xl transition cursor-pointer"
          title="Dismiss Selector"
          aria-label="Close location selector"
        >
          <X size={15} />
        </button>
      </div>

      {/* Search Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (searchInput.trim()) {
            void selectCityByName(searchInput);
          }
        }}
        className="mb-3 flex gap-1.5 shrink-0"
      >
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            id="locations-screen-city-input"
            type="text"
            placeholder="Enter city (e.g., Zurich, London...)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full text-sm pl-9 pr-8 py-2.5 bg-black/25 border border-white/10 rounded-xl text-[color:var(--sky-fg)] placeholder-white/35 focus:outline-none focus:border-[color:rgba(124,246,255,0.55)] focus:ring-1 focus:ring-[color:rgba(124,246,255,0.20)]"
            autoFocus
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-[color:var(--sky-accent-2)] hover:brightness-110 text-black rounded-xl text-sm font-bold transition duration-150 cursor-pointer"
        >
          Go
        </button>
      </form>

      {/* Search Results Area */}
      {searchInput.trim().length > 2 && (
        <div className="mb-4 shrink-0 max-h-48 overflow-y-auto scrollbar-none space-y-1 border border-white/10 rounded-xl p-1.5 bg-white/5">
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
                  <span className="text-xs text-[color:var(--sky-accent-2)] font-bold opacity-70 group-hover:opacity-100 transition pr-1">＋</span>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Saved Locations Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <span className="text-[10px] text-white/55 sky-mono tracking-wider uppercase mb-2">
          Saved locations · {savedLocations.length}
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

      {/* GPS Detection Footer */}
      <div className="pt-3 border-t border-white/10 shrink-0 mt-3">
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
  );
};

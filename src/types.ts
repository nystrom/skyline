/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface WeatherWarning {
  sender?: string;
  event: string;
  description: string;
  starts: Date;
  ends: Date;
  severity?: 'minor' | 'moderate' | 'severe' | 'extreme' | 'unknown';
}

export interface WeatherTimelineEvent {
  id: string;
  time: Date;             // Exact date code of event
  hourLabel: string;      // E.g., "08:00" or "02:00 PM"
  type: 'now' | 'sunrise' | 'sunset' | 'moonrise' | 'moonset' | 'peak_temp' | 'wind_shift' | 'hourly_status';
  kind?: import('./services/weather/weatherKind').WeatherKind; // Absent for astro/marker events
  title: string;
  description: string;
  iconName: string;       // Lucide icon key
  temp?: number;          // Temperature if applicable
  tempMax?: number;       // Peak temperature max
  windSpeed?: number;     // Wind speed (m/s)
  windDeg?: number;       // Wind degrees (for direction arrow)
  windFromSpeed?: number; // Previous wind speed (m/s)
  windFromDeg?: number;   // Previous wind degrees (for direction arrow)
  windGust?: number;
  precipProb?: number;    // Precipitation probability (0-100)
  precipAccum?: number;   // Precipitation accumulation in mm
  humidity?: number;
  isSpecial?: boolean;    // Custom animations target this
  colorTheme: string;     // Color string (border/bg accents)
  warnings?: WeatherWarning[];
}

export interface DailyForecast {
  date: Date;             // Date reference
  dayName: string;        // E.g., "Monday"
  shortDate: string;      // E.g., "May 27"
  tempMin: number;
  tempMax: number;
  iconName: string;       // Lucide icon
  description: string;
  precipProb: number;     // Probability of precipitation (0-100)
  precipAccum: number;    // Precipitation accumulation in mm
  windSpeed: number;
  windDeg: number;
  timelineEvents: WeatherTimelineEvent[];
}

export interface WeatherData {
  city: string;
  country: string;
  lat: number;
  lon: number;
  /** IANA timezone for the selected location, when available (e.g. "Europe/Zurich"). */
  timeZone?: string;
  /** Fixed offset in minutes from UTC for the selected location, when available. */
  timeZoneOffsetMinutes?: number;
  current: {
    temp: number;
    description: string;
    iconName: string;
    humidity: number;
    windSpeed: number;
    windDeg: number;
    precipProb: number;
    precipAccum: number;  // Precipitation accumulation in mm
    feelsLike: number;
    sunriseTime: Date;
    sunsetTime: Date;
    moonriseTime?: Date;
    moonsetTime?: Date;
    warnings?: WeatherWarning[];
  };
  daily: DailyForecast[];
  resolvedProvider?: WeatherProvider;
  /** Calendar days shown after trimming to provider capacity. */
  forecastDayCount?: number;
  /** Days with enough observed (non-interpolated) hourly data from the chosen provider. */
  realForecastDayCount?: number;
}

export type WeatherProvider = 'auto' | 'openweather' | 'meteoswiss' | 'nws' | 'arpae';

export interface SavedLocation {
  id: string;
  label: string;
  lat: number;
  lon: number;
  country?: string;
  state?: string;
}

export type DataSource = 'live' | 'cached';

export interface WeatherFetchResult {
  data: WeatherData;
  source: DataSource;
  resolvedProvider?: WeatherProvider;
  warnings: string[];
}

export interface UserSettings {
  apiKey: string;
  city: string;
  activeLocation?: SavedLocation;
  provider: WeatherProvider;
  theme: 'system' | 'dark' | 'light';
  tempUnit: 'C' | 'F';
  windSpeedUnit: 'm/s' | 'kph' | 'mph' | 'knots';
  clockFormat: '12h' | '24h';
  showSunriseSunset: boolean;
  showMoonriseMoonset: boolean;
  /** Auto-refresh interval for forecasts (also used as in-memory cache TTL). */
  refreshIntervalMinutes: number;
  units: 'metric' | 'imperial'; // Kept for general fallback/compatibility
}

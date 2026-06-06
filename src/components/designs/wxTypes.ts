export type WxIconType =
  | 'clear'
  | 'clear-night'
  | 'partly'
  | 'partly-night'
  | 'cloudy'
  | 'fog'
  | 'rain'
  | 'heavy'
  | 'storm'
  | 'snow';

export interface WxSky {
  grad: string;
  text: 'light' | 'dark';
  accent: string;
  soft: string;
  line: string;
  glass: string;
}

export interface WxHour {
  label: string;
  night: boolean;
  t: number;
  prob: number;
  mm: number;
  cond: WxIconType;
  intensity: string | null;
}

export interface WxDayForecast {
  day: string;
  cond: WxIconType;
  prob: number;
  hiC: number;
  loC: number;
  note?: string;
}

export interface WxPrecip {
  kind: 'none' | 'rain' | 'snow';
  active: boolean;
  startsInMin?: number;
  startLabel?: string;
  endLabel?: string;
  durationLabel?: string;
  peakMm?: number;
  peakLabel?: string;
  headline: string;
  line: string;
}

export interface WxSevere {
  level: string;
  title: string;
  detail: string;
  sub: string;
  color: string;
}

export interface WxScenario {
  key: string;
  place: string;
  nowLabel: string;
  dateLabel: string;
  tempC: number;
  feelsC: number;
  cond: WxIconType;
  condLabel: string;
  hiC: number;
  loC: number;
  windKmh: number;
  windDir: string;
  humidity: number;
  sunrise: string;
  sunset: string;
  sky: WxSky;
  precip: WxPrecip;
  severe: WxSevere | null;
  hourly: WxHour[];
  daily: WxDayForecast[];
}

export type DesignVariant = 'minimal' | 'atmospheric' | 'bold';

import { WeatherData, WeatherTimelineEvent, DailyForecast } from '../../types';
import { WeatherKind } from '../../services/weather/weatherKind';
import type { WxScenario, WxSky, WxHour, WxDayForecast, WxIconType, WxPrecip, WxSevere } from './wxTypes';
import { intensityLabel } from './wxUtils';

function degreesToCompass(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function formatHourLabel(date: Date, clockFormat: '12h' | '24h', timeZone?: string): string {
  try {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: undefined,
      hour12: clockFormat === '12h',
      timeZone,
    }).replace(':00', '').trim();
  } catch {
    return '';
  }
}

function formatTimeShort(date: Date | undefined, timeZone?: string): string {
  if (!date) return '';
  try {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone,
    });
  } catch {
    return '';
  }
}

function kindToIcon(kind: WeatherKind | undefined, isNight: boolean): WxIconType {
  if (!kind) return isNight ? 'clear-night' : 'clear';
  switch (kind) {
    case WeatherKind.Clear:
    case WeatherKind.ScatteredClouds:
      return isNight ? 'clear-night' : 'clear';
    case WeatherKind.PartlyCloudy:
      return isNight ? 'partly-night' : 'partly';
    case WeatherKind.MostlyCloudy:
    case WeatherKind.Overcast:
      return 'cloudy';
    case WeatherKind.Fog:
    case WeatherKind.Hazy:
    case WeatherKind.Mist:
    case WeatherKind.Smoke:
      return 'fog';
    case WeatherKind.Drizzle:
    case WeatherKind.RainLight:
    case WeatherKind.Showers:
    case WeatherKind.FreezingRain:
    case WeatherKind.Sleet:
      return 'rain';
    case WeatherKind.RainModerate:
      return 'rain';
    case WeatherKind.RainHeavy:
      return 'heavy';
    case WeatherKind.Thunderstorm:
    case WeatherKind.ThunderstormHail:
    case WeatherKind.Hurricane:
    case WeatherKind.Tornado:
      return 'storm';
    case WeatherKind.SnowLight:
    case WeatherKind.SnowModerate:
    case WeatherKind.SnowHeavy:
    case WeatherKind.SnowShowers:
    case WeatherKind.Blizzard:
    case WeatherKind.Ice:
    case WeatherKind.IcePellets:
      return 'snow';
    default:
      return isNight ? 'clear-night' : 'clear';
  }
}

function kindToSky(kind: WeatherKind | undefined, isNight: boolean): WxSky {
  if (isNight) {
    return {
      grad: 'linear-gradient(170deg, #070d24 0%, #131d44 52%, #283356 100%)',
      text: 'light', accent: '#8ea2e8',
      soft: 'rgba(255,255,255,0.12)', line: 'rgba(255,255,255,0.16)', glass: 'rgba(255,255,255,0.10)',
    };
  }
  switch (kind) {
    case WeatherKind.Clear:
    case WeatherKind.ScatteredClouds:
      return {
        grad: 'linear-gradient(170deg, #2f7fd1 0%, #56a0e2 44%, #9ec9ee 76%, #f4d199 100%)',
        text: 'light', accent: '#ffd166',
        soft: 'rgba(255,255,255,0.20)', line: 'rgba(255,255,255,0.28)', glass: 'rgba(255,255,255,0.18)',
      };
    case WeatherKind.PartlyCloudy:
      return {
        grad: 'linear-gradient(170deg, #3a7abf 0%, #5b9ed6 44%, #90bde0 76%, #e8c87a 100%)',
        text: 'light', accent: '#ffc94d',
        soft: 'rgba(255,255,255,0.18)', line: 'rgba(255,255,255,0.24)', glass: 'rgba(255,255,255,0.16)',
      };
    case WeatherKind.Thunderstorm:
    case WeatherKind.ThunderstormHail:
    case WeatherKind.Hurricane:
    case WeatherKind.Tornado:
    case WeatherKind.RainHeavy:
      return {
        grad: 'linear-gradient(170deg, #1d2128 0%, #2f343f 48%, #474e5c 100%)',
        text: 'light', accent: '#ffb454',
        soft: 'rgba(255,255,255,0.12)', line: 'rgba(255,255,255,0.18)', glass: 'rgba(255,255,255,0.12)',
      };
    case WeatherKind.Drizzle:
    case WeatherKind.RainLight:
    case WeatherKind.RainModerate:
    case WeatherKind.Showers:
    case WeatherKind.FreezingRain:
    case WeatherKind.Sleet:
      return {
        grad: 'linear-gradient(170deg, #4a5a68 0%, #61727f 46%, #8392a0 100%)',
        text: 'light', accent: '#57c7ea',
        soft: 'rgba(255,255,255,0.16)', line: 'rgba(255,255,255,0.22)', glass: 'rgba(255,255,255,0.14)',
      };
    case WeatherKind.SnowLight:
    case WeatherKind.SnowModerate:
    case WeatherKind.SnowHeavy:
    case WeatherKind.SnowShowers:
    case WeatherKind.Blizzard:
    case WeatherKind.Ice:
    case WeatherKind.IcePellets:
      return {
        grad: 'linear-gradient(170deg, #8fa8c0 0%, #adc4d8 46%, #cddcea 76%, #e8eef4 100%)',
        text: 'light', accent: '#c0d8f0',
        soft: 'rgba(255,255,255,0.25)', line: 'rgba(255,255,255,0.35)', glass: 'rgba(255,255,255,0.22)',
      };
    case WeatherKind.Fog:
    case WeatherKind.Mist:
    case WeatherKind.Hazy:
    case WeatherKind.Smoke:
      return {
        grad: 'linear-gradient(170deg, #7a8a94 0%, #94a4ad 46%, #b0bcC4 100%)',
        text: 'light', accent: '#c8d8e0',
        soft: 'rgba(255,255,255,0.18)', line: 'rgba(255,255,255,0.24)', glass: 'rgba(255,255,255,0.15)',
      };
    default:
      return {
        grad: 'linear-gradient(170deg, #5a6874 0%, #7a8d9a 46%, #9aa8b2 100%)',
        text: 'light', accent: '#b8d4e8',
        soft: 'rgba(255,255,255,0.16)', line: 'rgba(255,255,255,0.22)', glass: 'rgba(255,255,255,0.14)',
      };
  }
}

function buildPrecip(events: WeatherTimelineEvent[], hourly: WxHour[], clockFormat: '12h' | '24h', timeZone?: string): WxPrecip {
  const now = Date.now();
  const wetEvents = events.filter((e) => (e.precipAccum ?? 0) > 0.1);

  if (wetEvents.length === 0) {
    return { kind: 'none', active: false, headline: 'No rain expected', line: 'Clear for the next 12 hours.' };
  }

  const firstWet = wetEvents[0];
  const lastWet = wetEvents[wetEvents.length - 1];
  const startsInMin = Math.round(Math.max(0, (firstWet.time.getTime() - now) / 60000));
  const isActive = startsInMin < 5;

  const peakMm = Math.max(...wetEvents.map((e) => e.precipAccum ?? 0));
  const peakLabel = intensityLabel(peakMm) ?? 'Light';
  const startLabel = isActive ? 'now' : formatHourLabel(firstWet.time, clockFormat, timeZone);
  const endLabel = formatHourLabel(lastWet.time, clockFormat, timeZone);
  const durationHours = Math.max(1, Math.round((lastWet.time.getTime() - firstWet.time.getTime()) / 3600000) + 1);
  const durationLabel = durationHours <= 1 ? 'about an hour' : 'about ' + durationHours + ' hours';

  if (isActive) {
    return {
      kind: 'rain', active: true,
      startLabel: 'now', endLabel,
      peakMm, peakLabel,
      headline: peakLabel + ' rain right now',
      line: 'Easing around ' + endLabel + '.',
    };
  }

  return {
    kind: 'rain', active: false,
    startsInMin, startLabel, endLabel, durationLabel,
    peakMm, peakLabel,
    headline: 'Rain starting soon',
    line: peakLabel + ' rain around ' + startLabel + ', easing by ' + endLabel + '.',
  };
}

function buildSevere(warnings: WeatherData['current']['warnings'] | undefined): WxSevere | null {
  if (!warnings || warnings.length === 0) return null;
  const w = warnings.find((x) => x.severity === 'extreme' || x.severity === 'severe') ?? warnings[0];
  return {
    level: w.severity ?? 'warning',
    title: w.event,
    detail: w.sender ? 'Issued by ' + w.sender : '',
    sub: w.description.slice(0, 120),
    color: w.severity === 'extreme' ? '#e53e3e' : '#e8893b',
  };
}

function hourDayLabel(date: Date, timeZone?: string): string {
  const opts = { year: 'numeric' as const, month: '2-digit' as const, day: '2-digit' as const, timeZone };
  const nowStr = new Date().toLocaleDateString('en-US', opts);
  const tmrStr = new Date(Date.now() + 86400000).toLocaleDateString('en-US', opts);
  const dStr = date.toLocaleDateString('en-US', opts);
  if (dStr === nowStr) return 'Today';
  if (dStr === tmrStr) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'long', timeZone });
}

function hourDateStr(date: Date, timeZone?: string): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone });
}

function hourlyFromEvents(events: WeatherTimelineEvent[], limit: number, clockFormat: '12h' | '24h', timeZone?: string): WxHour[] {
  const rows = events.slice(0, limit);
  return rows.map((e) => {
    const isNight = e.time.getHours() >= 21 || e.time.getHours() < 6;
    const mm = (e.precipAccum ?? 0);
    return {
      label: formatHourLabel(e.time, clockFormat, timeZone),
      dayLabel: hourDayLabel(e.time, timeZone),
      dateStr: hourDateStr(e.time, timeZone),
      night: isNight,
      t: e.temp ?? 0,
      prob: e.precipProb ?? 0,
      mm,
      windMs: e.windSpeed ?? 0,
      windDeg: e.windDeg ?? 0,
      cond: kindToIcon(e.kind, isNight),
      intensity: intensityLabel(mm),
    };
  });
}

function dailyFromForecasts(daily: DailyForecast[]): WxDayForecast[] {
  return daily.map((d) => ({
    day: d.dayName.slice(0, 3),
    dateNum: d.date.getDate(),
    cond: kindToIcon(d.kind, false),
    prob: d.precipProb,
    hiC: d.tempMax,
    loC: d.tempMin,
    note: d.description,
  }));
}

export function adaptWeatherData(
  data: WeatherData,
  clockFormat: '12h' | '24h' = '24h',
): WxScenario {
  const now = new Date();
  const timeZone = data.timeZone;
  const isNight = now.getHours() >= 21 || now.getHours() < 6;
  const todayEvents = data.daily[0]?.timelineEvents ?? [];
  const currentHourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);

  const multiDayEvents = data.daily.flatMap((d) => d.timelineEvents);
  const allHourlyEvents = multiDayEvents.filter((e) => e.type === 'hourly_status' || e.type === 'now');
  const futureEvents = allHourlyEvents.filter((e) => e.time >= currentHourStart);
  // If fewer than 3 future events, the data may be stale; show all available hourly events instead.
  const currentAndFutureEvents = futureEvents.length >= 3 ? futureEvents : allHourlyEvents;

  const hourly = hourlyFromEvents(currentAndFutureEvents, 48, clockFormat, timeZone);
  const daily = dailyFromForecasts(data.daily);
  const severe = buildSevere(data.current.warnings);
  const precipEvents = todayEvents.filter(
    (e) => (e.type === 'hourly_status' || e.type === 'now') && e.time >= currentHourStart
  );
  const precip = buildPrecip(precipEvents, hourly.slice(0, 12), clockFormat, timeZone);

  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone });
  const nowLabel = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone });

  const kind = data.current.kind;
  const sky = kindToSky(kind, isNight);
  const cond = kindToIcon(kind, isNight);
  const windKmh = (data.current.windSpeed ?? 0) * 3.6;

  return {
    key: data.city,
    place: data.city,
    nowLabel,
    dateLabel,
    tempC: data.current.temp,
    feelsC: data.current.feelsLike,
    cond,
    condLabel: data.current.description,
    hiC: data.daily[0]?.tempMax ?? data.current.temp,
    loC: data.daily[0]?.tempMin ?? data.current.temp,
    windKmh,
    windDeg: data.current.windDeg ?? 0,
    windDir: degreesToCompass(data.current.windDeg ?? 0),
    humidity: data.current.humidity,
    sunrise: formatTimeShort(data.current.sunriseTime, timeZone),
    sunset: formatTimeShort(data.current.sunsetTime, timeZone),
    sky,
    precip,
    severe,
    hourly,
    daily,
  };
}

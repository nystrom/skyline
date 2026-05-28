/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Flame, Sunrise, Sunset, Moon, Wind } from 'lucide-react';
import { DailyForecast, UserSettings, WeatherTimelineEvent } from '../types';
import { WeatherIcon } from './WeatherIcon';
import { WindDirectionArrow } from './WindDirectionArrow';
import { convertTemp, convertWindSpeed, formatTimeAtLocation } from '../utils/unitConverter';
import { conditionRowStyle } from '../utils/conditionPalette';

interface WeatherTimelineProps {
  daily: DailyForecast[];
  settings: UserSettings;
  activeDayIdx: number;
  onActiveDayChange: (idx: number) => void;
  scrollSpyBlockedRef?: React.RefObject<boolean>;
  timeZone?: string;
  timeZoneOffsetMinutes?: number;
}

type TZ = { timeZone?: string; offsetMinutes?: number };

const SCROLL_SPY_THRESHOLD_PX = 12;

function readTopStackHeight(container: HTMLElement): number {
  const raw = getComputedStyle(container).getPropertyValue('--sky-top-stack-h').trim();
  const n = Number.parseFloat(raw.replace('px', ''));
  return Number.isFinite(n) ? n : 0;
}

function computeVisibleDayIndex(container: HTMLElement, dayCount: number): number {
  const atBottom =
    container.scrollTop + container.clientHeight >= container.scrollHeight - 4;
  if (atBottom) return Math.max(0, dayCount - 1);

  const containerTop = container.getBoundingClientRect().top;
  const pinned = readTopStackHeight(container);
  let activeIdx = 0;

  for (let i = 0; i < dayCount; i++) {
    const anchor = document.getElementById(`timeline-day-anchor-${i}`);
    if (!anchor) continue;
    const dayTop = anchor.getBoundingClientRect().top - containerTop;
    if (dayTop <= pinned + SCROLL_SPY_THRESHOLD_PX) {
      activeIdx = i;
    }
  }

  return activeIdx;
}

interface GroupedItem {
  type: 'single' | 'merged';
  events: WeatherTimelineEvent[];
}

function groupHourly(events: WeatherTimelineEvent[]): GroupedItem[] {
  const result: GroupedItem[] = [];
  let run: WeatherTimelineEvent[] = [];

  const flushRun = () => {
    if (run.length === 0) return;
    result.push({ type: run.length === 1 ? 'single' : 'merged', events: run });
    run = [];
  };

  for (const evt of events) {
    if (evt.type !== 'hourly_status' && evt.type !== 'now') {
      flushRun();
      result.push({ type: 'single', events: [evt] });
      continue;
    }
    // 'now' is always its own instantaneous marker
    if (evt.type === 'now') {
      flushRun();
      result.push({ type: 'single', events: [evt] });
      continue;
    }
    if (run.length === 0) {
      run.push(evt);
    } else {
      const same = run[0].description.trim().toLowerCase() === evt.description.trim().toLowerCase();
      if (same) {
        run.push(evt);
      } else {
        flushRun();
        run.push(evt);
      }
    }
  }
  flushRun();

  return result;
}

const INSTANT_TYPES = new Set(['now', 'sunrise', 'sunset', 'moonrise', 'moonset', 'peak_temp', 'wind_shift']);

function instantTheme(type: string) {
  switch (type) {
    case 'now':
      return {
        dot: 'bg-blue-500',
        ring: 'ring-blue-200 dark:ring-blue-900/60',
        connector: 'bg-blue-200 dark:bg-blue-800/60',
        time: 'text-blue-500 dark:text-blue-400',
        pill: 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
        icon: 'text-blue-500 dark:text-blue-400',
      };
    case 'sunrise':
      return {
        dot: 'bg-orange-400',
        ring: 'ring-orange-200 dark:ring-orange-900/60',
        connector: 'bg-orange-200 dark:bg-orange-800/60',
        time: 'text-orange-500 dark:text-orange-400',
        pill: 'border-orange-300/60 dark:border-orange-700/60 text-white',
        pillStyle: { background: 'linear-gradient(to right, #818cf8cc, #fb923ccc, #fcd34dcc)' } as React.CSSProperties,
        icon: 'text-white/90',
      };
    case 'sunset':
      return {
        dot: 'bg-fuchsia-600',
        ring: 'ring-fuchsia-200 dark:ring-fuchsia-900/60',
        connector: 'bg-fuchsia-200 dark:bg-fuchsia-900/60',
        time: 'text-fuchsia-600 dark:text-fuchsia-400',
        pill: 'border-fuchsia-400/60 dark:border-fuchsia-700/60 text-white',
        pillStyle: { background: 'linear-gradient(to right, #fb923ccc, #e879a0cc, #a855f7cc)' } as React.CSSProperties,
        icon: 'text-white/90',
      };
    case 'moonrise':
      return {
        dot: 'bg-purple-700',
        ring: 'ring-purple-300 dark:ring-purple-900/60',
        connector: 'bg-purple-300 dark:bg-purple-900/60',
        time: 'text-purple-700 dark:text-purple-400',
        pill: 'border-purple-500/60 dark:border-purple-700/60 text-white',
        pillStyle: { background: 'linear-gradient(to right, #4c1d95cc, #8b5cf6cc)' } as React.CSSProperties,
        icon: 'text-white/90',
      };
    case 'moonset':
      return {
        dot: 'bg-violet-500',
        ring: 'ring-violet-300 dark:ring-violet-900/60',
        connector: 'bg-violet-300 dark:bg-violet-900/60',
        time: 'text-violet-600 dark:text-violet-400',
        pill: 'border-violet-400/60 dark:border-violet-700/60 text-white',
        pillStyle: { background: 'linear-gradient(to right, #8b5cf6cc, #4c1d95cc)' } as React.CSSProperties,
        icon: 'text-white/90',
      };
    case 'peak_temp':
      return {
        dot: 'bg-rose-500',
        ring: 'ring-rose-200 dark:ring-rose-900/60',
        connector: 'bg-rose-200 dark:bg-rose-800/60',
        time: 'text-rose-500 dark:text-rose-400',
        pill: 'bg-rose-50/90 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200',
        icon: 'text-rose-500 dark:text-rose-400',
      };
    case 'wind_shift':
      return {
        dot: 'bg-emerald-500',
        ring: 'ring-emerald-200 dark:ring-emerald-900/60',
        connector: 'bg-emerald-200 dark:bg-emerald-800/60',
        time: 'text-emerald-500 dark:text-emerald-400',
        pill: 'bg-emerald-50/90 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
        icon: 'text-emerald-500 dark:text-emerald-400',
      };
    default:
      return {
        dot: 'bg-slate-400',
        ring: 'ring-slate-200 dark:ring-slate-700/60',
        connector: 'bg-slate-200 dark:bg-slate-700/60',
        time: 'text-slate-400 dark:text-slate-500',
        pill: 'bg-slate-50/90 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400',
        icon: 'text-slate-400',
      };
  }
}

/* ── Shared line column ── */
interface LineColProps {
  dot?: React.ReactNode;
}

const LineCol: React.FC<LineColProps> = ({ dot }) => (
  <div className="w-5 shrink-0 relative flex justify-center items-center self-stretch">
    {/* Continuous vertical line */}
    <div className="absolute top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700/50 left-1/2 -translate-x-1/2" />
    {dot && <div className="relative z-10">{dot}</div>}
  </div>
);

/* ── Wind + temp block ── */
const WindTemp: React.FC<{ event: WeatherTimelineEvent; settings: UserSettings }> = ({ event, settings }) => (
  <div className="flex items-center gap-2 shrink-0">
    <span className="text-[11px] sky-mono text-[color:var(--sky-dim)] flex items-center gap-[3px]">
      <WindDirectionArrow
        deg={(event.windSpeed ?? 0) <= 0 ? 0 : (event.windDeg ?? 0)}
        size={9}
      />
      {convertWindSpeed(event.windSpeed ?? 0, settings.windSpeedUnit)}{' '}{settings.windSpeedUnit}
    </span>
    <span className="text-[15px] font-bold tabular-nums text-[color:var(--sky-fg)] w-9 text-right">
      {convertTemp(event.temp ?? 0, settings.tempUnit)}°
    </span>
  </div>
);

/* ── Single hourly row ── */
interface HourlyRowProps {
  event: WeatherTimelineEvent;
  settings: UserSettings;
  tz: TZ;
}

const HourlyRow: React.FC<HourlyRowProps> = ({ event, settings, tz }) => {
  const rowStyle = conditionRowStyle(event.iconName, event.description, event.precipProb);
  const showRain = (event.precipProb ?? 0) > 5;

  return (
    <div className="flex items-stretch border-b border-black/[0.04]" style={rowStyle}>
      {/* Time */}
      <div className="w-12 shrink-0 flex items-center justify-end pr-2">
        <span className="text-[12px] sky-mono font-medium text-[color:var(--sky-dim)]">
          {formatTimeAtLocation(event.time, '24h', tz)}
        </span>
      </div>

      <LineCol />

      {/* Content */}
      <div className="flex-1 min-w-0 flex items-center py-[11px] pr-4 gap-3">
        <WeatherIcon
          name={event.iconName}
          size={15}
          className="shrink-0 text-[color:var(--sky-muted)]"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-semibold text-[color:var(--sky-fg)] capitalize truncate leading-tight">
              {event.description}
            </span>
          </div>
          {showRain && (
            <span className="text-[11px] sky-mono text-[color:var(--sky-dim)] mt-[2px] block">
              {event.precipProb}% rain
            </span>
          )}
        </div>
        <WindTemp event={event} settings={settings} />
      </div>
    </div>
  );
};

/* ── Merged block for consecutive same-condition hours ── */
interface MergedCardProps {
  events: WeatherTimelineEvent[];
  settings: UserSettings;
  tz: TZ;
}

const MergedCard: React.FC<MergedCardProps> = ({ events, settings, tz }) => {
  const first = events[0];
  const rowStyle = conditionRowStyle(first.iconName, first.description, first.precipProb);
  const showRain = (first.precipProb ?? 0) > 5;

  return (
    <div className="border-b border-black/[0.04]" style={rowStyle}>
      {/* Sticky first row: icon + description pins at top while card scrolls out */}
      <div
        className="sticky flex items-stretch"
        style={{ top: 'var(--sky-top-stack-h, 0px)', zIndex: 15, ...rowStyle }}
      >
        <div className="w-12 shrink-0 flex items-center justify-end pr-2">
          <span className="text-[12px] sky-mono font-medium text-[color:var(--sky-dim)]">
            {formatTimeAtLocation(events[0].time, '24h', tz)}
          </span>
        </div>
        <LineCol />
        <div className="flex-1 min-w-0 flex items-center py-[11px] pr-4 gap-3">
          <WeatherIcon
            name={first.iconName}
            size={15}
            className="shrink-0 text-[color:var(--sky-muted)]"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-[color:var(--sky-fg)] capitalize truncate">
                {first.description}
              </span>
              {showRain && (
                <span className="text-[11px] sky-mono text-[color:var(--sky-dim)] shrink-0">
                  {first.precipProb}% rain
                </span>
              )}
            </div>
          </div>
          <WindTemp event={events[0]} settings={settings} />
        </div>
      </div>

      {/* Remaining rows: time + line + wind/temp only */}
      {events.slice(1).map((evt) => (
        <div key={evt.id} className="flex items-stretch">
          <div className="w-12 shrink-0 flex items-center justify-end pr-2">
            <span className="text-[12px] sky-mono font-medium text-[color:var(--sky-dim)]">
              {formatTimeAtLocation(evt.time, '24h', tz)}
            </span>
          </div>
          <LineCol />
          <div className="flex-1 min-w-0 flex items-center py-[11px] pr-4 gap-3">
            <span className="w-[15px] shrink-0" />
            <div className="flex-1 min-w-0" />
            <WindTemp event={evt} settings={settings} />
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── Instantaneous event row (now / sunrise / sunset / moonrise / moonset / peak_temp / wind_shift) ── */
interface InstantRowProps {
  event: WeatherTimelineEvent;
  settings: UserSettings;
  tz: TZ;
}

const InstantRow: React.FC<InstantRowProps> = ({ event, settings, tz }) => {
  const theme = instantTheme(event.type);
  const [nowTick, setNowTick] = useState(() => new Date());

  useEffect(() => {
    if (event.type !== 'now') return;
    const id = window.setInterval(() => setNowTick(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [event.type]);

  const displayTime = event.type === 'now'
    ? formatTimeAtLocation(nowTick, settings.clockFormat, tz)
    : formatTimeAtLocation(event.time, settings.clockFormat, tz);

  const dot = (
    <div className={`w-2.5 h-2.5 rounded-full ring-2 ${theme.dot} ${theme.ring}`} />
  );

  return (
    <div
      id={event.type === 'now' ? 'timeline-event-now' : `timeline-instant-${event.id}`}
      className="flex items-center py-[5px]"
    >
      {/* Time: colored accent, right-aligned */}
      <div className="w-12 shrink-0 flex items-center justify-end pr-2">
        <span className={`text-[12px] sky-mono font-medium ${theme.time}`}>
          {displayTime}
        </span>
      </div>

      {/* Line col with colored dot */}
      <LineCol dot={dot} />

      {/* Horizontal connector + pill */}
      <div className="flex-1 pr-4 flex items-center gap-0">
        <div className={`h-px w-3 shrink-0 ${theme.connector}`} />
        <div className={`flex items-center gap-1.5 px-2.5 py-[4px] rounded-full text-[11px] font-bold border shrink-0 ${theme.pill}`} style={'pillStyle' in theme ? theme.pillStyle : undefined}>
          {event.type === 'sunrise' && (
            <>
              <Sunrise size={10} className={theme.icon} />
              <span className="uppercase tracking-wide">Sunrise</span>
            </>
          )}
          {event.type === 'sunset' && (
            <>
              <Sunset size={10} className={theme.icon} />
              <span className="uppercase tracking-wide">Sunset</span>
            </>
          )}
          {event.type === 'moonrise' && (
            <>
              <Moon size={10} className={theme.icon} />
              <span className="uppercase tracking-wide">Moonrise</span>
            </>
          )}
          {event.type === 'moonset' && (
            <>
              <Moon size={10} className={theme.icon} />
              <span className="uppercase tracking-wide">Moonset</span>
            </>
          )}
          {event.type === 'peak_temp' && (
            <>
              <Flame size={10} className={theme.icon} />
              <span className="uppercase tracking-wide">High</span>
              <span>{convertTemp(event.tempMax ?? event.temp ?? 0, settings.tempUnit)}°</span>
            </>
          )}
          {event.type === 'now' && (
            <>
              <WeatherIcon name="locate" size={10} className={theme.icon} />
              <span className="uppercase tracking-wide">Now</span>
              <span className="font-normal opacity-70 text-[10px]">·</span>
              <span className="font-normal capitalize">{event.description}</span>
              <span className="font-bold">{convertTemp(event.temp ?? 0, settings.tempUnit)}°</span>
            </>
          )}
          {event.type === 'wind_shift' && (
            <>
              <Wind size={10} className={theme.icon} />
              <span className="uppercase tracking-wide">Wind Shift</span>
              {event.windFromDeg !== undefined && event.windDeg !== undefined && (
                <>
                  <WindDirectionArrow deg={event.windFromDeg} size={10} className={theme.icon} />
                  <span className="opacity-50 text-[9px]">→</span>
                  <WindDirectionArrow deg={event.windDeg} size={10} className={theme.icon} />
                </>
              )}
              {event.windSpeed !== undefined && (
                <span>{convertWindSpeed(event.windSpeed, settings.windSpeedUnit)} {settings.windSpeedUnit}</span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Main timeline ── */
export const WeatherTimeline: React.FC<WeatherTimelineProps> = ({
  daily,
  settings,
  activeDayIdx,
  onActiveDayChange,
  scrollSpyBlockedRef,
  timeZone,
  timeZoneOffsetMinutes,
}) => {
  const activeDayRef = useRef(activeDayIdx);
  const tz: TZ = { timeZone, offsetMinutes: timeZoneOffsetMinutes };

  useEffect(() => {
    activeDayRef.current = activeDayIdx;
  }, [activeDayIdx]);

  useEffect(() => {
    const container = document.getElementById('weather-timeline-container');
    if (!container || daily.length === 0) return;

    const syncActiveDay = () => {
      if (scrollSpyBlockedRef?.current) return;
      const nextIdx = computeVisibleDayIndex(container, daily.length);
      if (nextIdx !== activeDayRef.current) {
        onActiveDayChange(nextIdx);
      }
    };

    syncActiveDay();
    container.addEventListener('scroll', syncActiveDay, { passive: true });
    return () => container.removeEventListener('scroll', syncActiveDay);
  }, [daily.length, onActiveDayChange, scrollSpyBlockedRef]);

  const renderItem = (item: GroupedItem): React.ReactNode => {
    const evt = item.events[0];

    if (item.type === 'merged') {
      return <MergedCard key={evt.id} events={item.events} settings={settings} tz={tz} />;
    }

    if (INSTANT_TYPES.has(evt.type)) {
      if (evt.type === 'sunrise' || evt.type === 'sunset') {
        if (!settings.showSunriseSunset) return null;
      }
      if (evt.type === 'moonrise' || evt.type === 'moonset') {
        if (!settings.showMoonriseMoonset) return null;
      }
      return <InstantRow key={evt.id} event={evt} settings={settings} tz={tz} />;
    }

    return <HourlyRow key={evt.id} event={evt} settings={settings} tz={tz} />;
  };

  return (
    <div className="pb-20">
      {daily.map((day, dIdx) => {
        const isSelectedDay = activeDayIdx === dIdx;
        const items = groupHourly(day.timelineEvents);

        return (
          <div
            key={day.shortDate}
            id={`timeline-day-anchor-${dIdx}`}
            className={`transition-opacity duration-300 ${isSelectedDay ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
          >
            <div
              className="sticky flex items-center justify-between px-4 py-1.5 border-b border-[color:var(--sky-border)] bg-[color:var(--sky-surface-2)]"
              style={{ top: 'var(--sky-top-stack-h, 0px)', zIndex: 20 }}
            >
              <span className="text-[11px] sky-mono font-bold uppercase tracking-widest text-[color:var(--sky-dim)]">
                {day.dayName} · {day.shortDate}
              </span>
              <span className="text-[11px] sky-mono text-[color:var(--sky-dim)]">
                {convertTemp(day.tempMax, settings.tempUnit)}° / {convertTemp(day.tempMin, settings.tempUnit)}°
              </span>
            </div>

            {items.map(renderItem)}
          </div>
        );
      })}
    </div>
  );
};

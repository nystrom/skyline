/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Flame, Sunrise, Sunset, Moon, Wind, AlertTriangle } from 'lucide-react';
import { DailyForecast, UserSettings, WeatherTimelineEvent, WeatherWarning } from '../types';
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
  onShowWarnings?: (warnings: WeatherWarning[]) => void;
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
    if (evt.type !== 'hourly_status') {
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

const INSTANT_TYPES = new Set(['sunrise', 'sunset', 'moonrise', 'moonset', 'peak_temp', 'wind_shift']);

function instantTheme(type: string) {
  switch (type) {
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
  dots?: Array<{
    node: React.ReactNode;
    top: number;
    align?: 'center' | 'left' | 'right';
    zIndex?: number;
  }>;
}

const LineCol: React.FC<LineColProps> = ({ dots = [] }) => (
  <div className="w-5 shrink-0 relative flex justify-center self-stretch">
    {/* Continuous vertical line */}
    <div className="absolute top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700/50 left-1/2 -translate-x-1/2" />
    {dots.map((d, idx) => {
      const tx = d.align === 'left' ? '-100%' : d.align === 'right' ? '0%' : '-50%';
      return (
        <div 
          key={idx}
          className="absolute left-1/2"
          style={{ 
            top: `${d.top * 100}%`, 
            transform: `translate(${tx}, -50%)`,
            zIndex: d.zIndex ?? 10
          }}
        >
          {d.node}
        </div>
      );
    })}
  </div>
);

function getSpecialOverlayDots(
  startTime: Date,
  endTime: Date,
  specialEvents: WeatherTimelineEvent[],
  settings: UserSettings,
  tz: TZ,
): Array<{ node: React.ReactNode; top: number; align: 'left' | 'right' | 'center'; zIndex?: number }> {
  const startMs = startTime.getTime();
  const endMs = endTime.getTime();
  const duration = endMs - startMs;

  const hourSpecials = specialEvents.filter((evt) => {
    if (evt.time.getTime() < startMs || evt.time.getTime() >= endMs) return false;
    if (evt.type === 'sunrise' || evt.type === 'sunset') {
      return settings.showSunriseSunset;
    }
    if (evt.type === 'moonrise' || evt.type === 'moonset') {
      return settings.showMoonriseMoonset;
    }
    return false;
  });

  return hourSpecials.map((evt) => {
    const elapsedMs = evt.time.getTime() - startMs;
    const fraction = duration > 0 ? Math.max(0, Math.min(1, elapsedMs / duration)) : 0.5;
    const displayTime = formatTimeAtLocation(evt.time, settings.clockFormat, tz);

    let pillStyle: React.CSSProperties = {};
    let tipStyle: React.CSSProperties = {};
    let labelText = '';

    if (evt.type === 'sunrise') {
      pillStyle = { background: 'linear-gradient(to right, #818cf8, #fb923c, #fcd34d)' };
      tipStyle = { backgroundColor: '#fcd34d' };
      labelText = 'SUNRISE';
    } else if (evt.type === 'sunset') {
      pillStyle = { background: 'linear-gradient(to right, #fb923c, #e879a0, #a855f7)' };
      tipStyle = { backgroundColor: '#a855f7' };
      labelText = 'SUNSET';
    } else if (evt.type === 'moonrise') {
      pillStyle = { background: 'linear-gradient(to right, #4c1d95, #8b5cf6)' };
      tipStyle = { backgroundColor: '#8b5cf6' };
      labelText = 'MOONRISE';
    } else if (evt.type === 'moonset') {
      pillStyle = { background: 'linear-gradient(to right, #8b5cf6, #4c1d95)' };
      tipStyle = { backgroundColor: '#4c1d95' };
      labelText = 'MOONSET';
    }

    const node = (
      <div className="relative flex items-center" style={{ paddingRight: '11px' }}>
        <div 
          className="text-white pl-1.5 pr-1 py-[3px] rounded-l-md text-[8px] font-extrabold font-mono tracking-tight shadow-sm uppercase shrink-0 whitespace-nowrap flex flex-col items-center justify-center leading-none h-[22px] z-10 relative"
          style={pillStyle}
        >
          <span>{labelText}</span>
          <span className="mt-[1.5px]">{displayTime}</span>
        </div>
        <div 
          className="absolute rotate-45 rounded-tr-[3px] z-0" 
          style={{ right: '3.22px', width: '15.56px', height: '15.56px', ...tipStyle }} 
        />
      </div>
    );

    const zIndex = (evt.type === 'sunrise' || evt.type === 'sunset') ? 12 : 11;

    return { node, top: fraction, align: 'left', zIndex };
  });
}

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
  onShowWarnings?: (warnings: WeatherWarning[]) => void;
  specialEvents: WeatherTimelineEvent[];
}

const HourlyRow: React.FC<HourlyRowProps> = ({ event, settings, tz, onShowWarnings, specialEvents }) => {
  const rowStyle = conditionRowStyle(event.iconName, event.description, event.precipProb, event.kind);
  const now = new Date();
  const isNowHour = event.time.getTime() <= now.getTime() && now.getTime() < event.time.getTime() + 3600_000;
  const elapsedMs = now.getTime() - event.time.getTime();
  const fraction = Math.max(0, Math.min(1, elapsedMs / 3600_000));
  
  const dots: Array<{ node: React.ReactNode; top: number; align?: 'left' | 'right' | 'center'; zIndex?: number }> = [];

  // Add rise/set overlays if any fall within this hour
  const riseSetDots = getSpecialOverlayDots(event.time, new Date(event.time.getTime() + 3600_000), specialEvents, settings, tz);
  dots.push(...riseSetDots);

  if (isNowHour) {
    const nowPill = (
      <div className="relative flex items-center" style={{ paddingRight: '11px' }}>
        <div className="bg-blue-500 dark:bg-blue-600 text-white pl-1.5 pr-1 py-[3px] rounded-l-md text-[8px] font-extrabold font-mono tracking-tight shadow-sm uppercase shrink-0 whitespace-nowrap flex flex-col items-center justify-center leading-none h-[22px] z-10 relative">
          <span>NOW</span>
          <span className="mt-[1.5px]">{formatTimeAtLocation(now, settings.clockFormat, tz)}</span>
        </div>
        <div className="absolute rotate-45 rounded-tr-[3px] bg-blue-500 dark:bg-blue-600 z-0" style={{ right: '3.22px', width: '15.56px', height: '15.56px' }} />
      </div>
    );
    dots.push({ node: nowPill, top: fraction, align: 'left', zIndex: 13 });
  }

  return (
    <div 
      id={isNowHour ? 'timeline-event-now' : undefined}
      className="flex items-stretch border-b border-black/[0.04]" 
      style={rowStyle}
    >
      {/* Time */}
      <div className="w-12 shrink-0 flex items-center justify-end pr-2">
        <span className="text-[12px] sky-mono font-medium text-[color:var(--sky-dim)]">
          {formatTimeAtLocation(event.time, '24h', tz)}
        </span>
      </div>

      <LineCol dots={dots} />

      {/* Content */}
      <div className="flex-1 min-w-0 flex items-center py-[11px] pr-4 gap-3">
        <WeatherIcon
          name={event.iconName}
          size={28}
          className="shrink-0 text-[color:var(--sky-muted)]"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[13px] font-semibold text-[color:var(--sky-fg)] whitespace-normal break-words leading-tight">
              {event.description}
            </span>
            {event.warnings && event.warnings.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShowWarnings?.(event.warnings || []);
                }}
                className="text-red-500 hover:text-red-400 cursor-pointer focus:outline-none flex items-center justify-center p-0.5 rounded-full hover:bg-red-500/10 transition-colors shrink-0"
                aria-label="Show warnings"
              >
                <AlertTriangle size={13} />
              </button>
            )}
          </div>
        </div>
        <WindTemp event={event} settings={settings} />
      </div>
    </div>
  );
};

interface MergedCardProps {
  events: WeatherTimelineEvent[];
  settings: UserSettings;
  tz: TZ;
  onShowWarnings?: (warnings: WeatherWarning[]) => void;
  specialEvents: WeatherTimelineEvent[];
}

const MergedCard: React.FC<MergedCardProps> = ({ events, settings, tz, onShowWarnings, specialEvents }) => {
  const first = events[0];
  const rowStyle = conditionRowStyle(first.iconName, first.description, first.precipProb, first.kind);
  const hasWarnings = events.some((e) => e.warnings && e.warnings.length > 0);
  const showPrecip = (first.precipProb ?? 0) > 5;
  const now = new Date();
  const isNowInFirstHour = first.time.getTime() <= now.getTime() && now.getTime() < first.time.getTime() + 3600_000;

  return (
    <div
      id={isNowInFirstHour ? 'timeline-event-now' : undefined}
      className="border-b border-black/[0.04] relative"
      style={rowStyle}
    >
      {/* Absolute sticky container pins the condition relative to the entire card's height,
          allowing the individual times and temperatures to scroll naturally. */}
      <div className="absolute inset-y-0 left-[4.25rem] right-0 pointer-events-none z-10">
        <div
          className="sticky pointer-events-none"
          style={{ top: 'calc(var(--sky-top-stack-h, 0px) + 29px + 6px)' }}
        >
          <div className="flex items-center py-[11px] pr-4 gap-3 pointer-events-auto max-w-[calc(100%-80px)]">
            <WeatherIcon
              name={first.iconName}
              size={28}
              className="shrink-0 text-[color:var(--sky-muted)]"
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-[color:var(--sky-fg)] whitespace-normal break-words leading-tight">
                    {first.description}
                  </span>
                  {hasWarnings && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const allWarnings: WeatherWarning[] = [];
                        const seenKeys = new Set<string>();
                        events.forEach((evt) => {
                          (evt.warnings || []).forEach((w) => {
                            const key = `${w.sender}:${w.event}:${w.starts.getTime()}:${w.ends.getTime()}`;
                            if (!seenKeys.has(key)) {
                              seenKeys.add(key);
                              allWarnings.push(w);
                            }
                          });
                        });
                        onShowWarnings?.(allWarnings);
                      }}
                      className="text-red-500 hover:text-red-400 cursor-pointer focus:outline-none flex items-center justify-center p-0.5 rounded-full hover:bg-red-500/10 transition-colors shrink-0"
                      aria-label="Show warnings"
                    >
                      <AlertTriangle size={13} />
                    </button>
                  )}
                </div>
                {showPrecip && (
                  <span className="text-[11px] sky-mono text-[color:var(--sky-dim)] mt-[2px] block">
                    {first.precipProb}% chance of precip
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Render rows with empty space in the middle to receive the overlay */}
      {events.map((evt, idx) => {
        const isFirst = idx === 0;
        const isNowHour = evt.time.getTime() <= now.getTime() && now.getTime() < evt.time.getTime() + 3600_000;
        const showDot = isFirst && isNowHour;
        const elapsedMs = now.getTime() - evt.time.getTime();
        const fraction = showDot ? Math.max(0, Math.min(1, elapsedMs / 3600_000)) : undefined;

        const dots: Array<{ node: React.ReactNode; top: number; align?: 'left' | 'right' | 'center'; zIndex?: number }> = [];

        // Add rise/set overlays if any fall within this hour
        const riseSetDots = getSpecialOverlayDots(evt.time, new Date(evt.time.getTime() + 3600_000), specialEvents, settings, tz);
        dots.push(...riseSetDots);

        if (showDot && fraction !== undefined) {
          const nowPill = (
            <div className="relative flex items-center" style={{ paddingRight: '11px' }}>
              <div className="bg-blue-500 dark:bg-blue-600 text-white pl-1.5 pr-1 py-[3px] rounded-l-md text-[8px] font-extrabold font-mono tracking-tight shadow-sm uppercase shrink-0 whitespace-nowrap flex flex-col items-center justify-center leading-none h-[22px] z-10 relative">
                <span>NOW</span>
                <span className="mt-[1.5px]">{formatTimeAtLocation(now, settings.clockFormat, tz)}</span>
              </div>
              <div className="absolute rotate-45 rounded-tr-[3px] bg-blue-500 dark:bg-blue-600 z-0" style={{ right: '3.22px', width: '15.56px', height: '15.56px' }} />
            </div>
          );
          dots.push({ node: nowPill, top: fraction, align: 'left', zIndex: 13 });
        }

        return (
          <div key={evt.id} className="flex items-stretch">
            <div className="w-12 shrink-0 flex items-center justify-end pr-2">
              <span className="text-[12px] sky-mono font-medium text-[color:var(--sky-dim)]">
                {formatTimeAtLocation(evt.time, '24h', tz)}
              </span>
            </div>
            <LineCol dots={dots} />
            <div className="flex-1 min-w-0 flex items-center py-[11px] pr-4 gap-3">
              <span className="w-[15px] shrink-0" />
              <div className="flex-1 min-w-0" />
              <WindTemp event={evt} settings={settings} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ── Instantaneous event row (now / sunrise / sunset / moonrise / moonset / peak_temp / wind_shift) ── */
interface InstantRowProps {
  event: WeatherTimelineEvent;
  settings: UserSettings;
  tz: TZ;
  rowStyle?: React.CSSProperties;
}

const InstantRow: React.FC<InstantRowProps> = ({ event, settings, tz, rowStyle }) => {
  const theme = instantTheme(event.type);
  const displayTime = formatTimeAtLocation(event.time, settings.clockFormat, tz);

  const dot = (
    <div className={`w-2.5 h-2.5 rounded-full ring-2 ${theme.dot} ${theme.ring}`} />
  );

  return (
    <div
      id={`timeline-instant-${event.id}`}
      className="flex items-center py-[5px] border-b border-black/[0.04]"
      style={rowStyle}
    >
      {/* Time: colored accent, right-aligned */}
      <div className="w-12 shrink-0 flex items-center justify-end pr-2">
        <span className={`text-[12px] sky-mono font-medium ${theme.time}`}>
          {displayTime}
        </span>
      </div>

      {/* Line col with colored dot */}
      <LineCol dots={[{ node: dot, top: 0.5, align: 'center' }]} />

      {/* Horizontal connector + pill */}
      <div className="flex-1 pr-4 flex items-center gap-0">
        <div className={`h-px w-3 shrink-0 ${theme.connector}`} />
        <div className={`flex items-center gap-1.5 px-2.5 py-[4px] rounded-full text-[11px] font-bold border shrink-0 ${theme.pill}`} style={'pillStyle' in theme ? theme.pillStyle : undefined}>
          {event.type === 'peak_temp' && (
            <>
              <Flame size={10} className={theme.icon} />
              <span className="uppercase tracking-wide">High</span>
              <span>{convertTemp(event.tempMax ?? event.temp ?? 0, settings.tempUnit)}°</span>
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
  onShowWarnings,
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

  return (
    <div className="pb-20">
      {daily.map((day, dIdx) => {
        const isSelectedDay = activeDayIdx === dIdx;
        const items = groupHourly(day.timelineEvents);

        return (
          <div
            key={day.shortDate}
            id={`timeline-day-anchor-${dIdx}`}
            className="relative"
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

            <div className={`transition-opacity duration-300 ${isSelectedDay ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
              {(() => {
                const specialEvents = day.timelineEvents.filter((e) => ['sunrise', 'sunset', 'moonrise', 'moonset'].includes(e.type));
                let lastHourlyEvent = day.timelineEvents.find((e) => e.type === 'hourly_status');

                return items.map((item) => {
                  const evt = item.events[0];

                  if (['sunrise', 'sunset', 'moonrise', 'moonset', 'peak_temp'].includes(evt.type)) {
                    return null;
                  }

                  if (item.type === 'merged') {
                    lastHourlyEvent = item.events[item.events.length - 1];
                    return (
                      <MergedCard
                        key={evt.id}
                        events={item.events}
                        settings={settings}
                        tz={tz}
                        onShowWarnings={onShowWarnings}
                        specialEvents={specialEvents}
                      />
                    );
                  }

                  if (evt.type === 'hourly_status') {
                    lastHourlyEvent = evt;
                    return (
                      <HourlyRow
                        key={evt.id}
                        event={evt}
                        settings={settings}
                        tz={tz}
                        onShowWarnings={onShowWarnings}
                        specialEvents={specialEvents}
                      />
                    );
                  }

                  if (INSTANT_TYPES.has(evt.type)) {
                    const rowStyle = lastHourlyEvent
                      ? conditionRowStyle(
                          lastHourlyEvent.iconName,
                          lastHourlyEvent.description,
                          lastHourlyEvent.precipProb,
                          lastHourlyEvent.kind,
                        )
                      : undefined;

                    return (
                      <InstantRow
                        key={evt.id}
                        event={evt}
                        settings={settings}
                        tz={tz}
                        rowStyle={rowStyle}
                      />
                    );
                  }

                  return null;
                });
              })()}
            </div>
          </div>
        );
      })}
    </div>
  );
};

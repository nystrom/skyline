/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { WeatherTimelineEvent, UserSettings } from '../types';
import { WeatherIcon } from './WeatherIcon';
import { Flame, Sunrise, Sunset } from 'lucide-react';
import { convertTemp, convertWindSpeed } from '../utils/unitConverter';
import { formatTimeAtLocation } from '../utils/unitConverter';
import { WindDirectionArrow } from './WindDirectionArrow';
import { conditionCardStyle } from '../utils/conditionPalette';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const Odometer: React.FC<{ value: number; instant?: boolean }> = ({ value, instant }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (instant || prefersReducedMotion()) {
      setDisplayValue(value);
      return;
    }
    if (displayValue === value) return;
    const step = displayValue < value ? 1 : -1;
    const timer = setTimeout(() => {
      setDisplayValue(prev => prev + step);
    }, 80);
    return () => clearTimeout(timer);
  }, [value, displayValue, instant]);

  return (
    <span className="inline-block tabular-nums font-mono font-black text-emerald-400 min-w-[12px] text-center text-[11px]">
      {displayValue}
    </span>
  );
};

interface WindShiftLoopProps {
  event: WeatherTimelineEvent;
  settings: UserSettings;
  iconColorClass: string;
}

const WindShiftLoop: React.FC<WindShiftLoopProps> = ({ event, settings, iconColorClass }) => {
  // Cycle stages:
  // 0: "Old Point" - hold old speed/direction
  // 1: Transitioning to "New Point"
  // 2: Paused on "New Point" - hold sufficiently
  const [phase, setPhase] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let timer: NodeJS.Timeout;
    if (phase === 0) {
      timer = setTimeout(() => setPhase(1), 1500);
    } else if (phase === 1) {
      timer = setTimeout(() => setPhase(2), 1200);
    } else if (phase === 2) {
      timer = setTimeout(() => setPhase(0), 4000);
    }
    return () => clearTimeout(timer);
  }, [phase]);

  const rawOldDeg = event.windFromDeg ?? 0;
  const rawNewDeg = event.windDeg ?? 0;
  const rawOldSpeed = event.windFromSpeed ?? 10;
  const rawNewSpeed = event.windSpeed ?? 5;

  const displayOldSpeed = convertWindSpeed(rawOldSpeed, settings.windSpeedUnit);
  const displayNewSpeed = convertWindSpeed(rawNewSpeed, settings.windSpeedUnit);

  const isShowNew = phase > 0;
  const currentDeg = isShowNew ? rawNewDeg : rawOldDeg;
  const currentSpeed = isShowNew ? displayNewSpeed : displayOldSpeed;

  const isTransitioning = phase === 1;

  return (
    <div className="flex items-center gap-2 flex-wrap text-[12px] select-none font-bold">
      <WindDirectionArrow
        deg={currentDeg}
        size={12}
        className={iconColorClass}
        transition={isTransitioning}
        durationMs={1200}
      />
      <span className="uppercase tracking-wide text-[color:var(--sky-muted)]">Wind Shift:</span>

      {/* Dial Speed Odometer indicator - no black background, no border */}
      <span className="font-mono text-[12px] text-[color:var(--sky-muted)] font-bold px-1 py-0.5 rounded flex items-center gap-0.5 select-none shrink-0 bg-transparent">
        <Odometer value={currentSpeed} instant={phase === 0} />
            <span className="text-[10px] font-normal text-[color:var(--sky-dim)] ml-0.5">
          {settings.windSpeedUnit}
        </span>
      </span>
    </div>
  );
};


interface TimelineMarkerCardProps {
  event: WeatherTimelineEvent;
  settings: UserSettings;
  timeZone?: string;
  timeZoneOffsetMinutes?: number;
}

export const TimelineMarkerCard: React.FC<TimelineMarkerCardProps> = ({
  event,
  settings,
  timeZone,
  timeZoneOffsetMinutes,
}) => {
  const isSpecial = event.isSpecial;
  const tz = { timeZone, offsetMinutes: timeZoneOffsetMinutes };
  const [nowTick, setNowTick] = useState(() => new Date());

  useEffect(() => {
    if (event.type !== 'now') return;
    const id = window.setInterval(() => setNowTick(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [event.type]);

  const timeLabel =
    event.type === 'now'
      ? formatTimeAtLocation(nowTick, settings.clockFormat, tz)
      : event.hourLabel;

  // Custom styling colors based on theme configs
  const getThemeStyles = () => {
    switch (event.type) {
      case 'now':
        return {
          bg: 'bg-blue-50/90 dark:bg-blue-950/25',
          border: 'border-blue-500/50 shadow-blue-500/10',
          text: 'text-blue-700 dark:text-blue-300',
          badgeBg: 'bg-blue-500 text-white',
          pulseColor: 'bg-blue-400'
        };
      case 'sunrise':
        return {
          bg: 'bg-amber-50/90 dark:bg-amber-950/25',
          border: 'border-amber-400/50 shadow-amber-500/10',
          text: 'text-amber-700 dark:text-amber-300',
          badgeBg: 'bg-amber-500 text-white',
          pulseColor: 'bg-amber-400'
        };
      case 'sunset':
        return {
          bg: 'bg-indigo-50/95 dark:bg-indigo-950/25',
          border: 'border-indigo-400/50 shadow-indigo-500/10',
          text: 'text-indigo-700 dark:text-indigo-300',
          badgeBg: 'bg-indigo-600 text-white',
          pulseColor: 'bg-indigo-400'
        };
      case 'moonrise':
        return {
          bg: 'bg-purple-50/90 dark:bg-purple-950/25',
          border: 'border-purple-400/50 shadow-purple-500/10',
          text: 'text-purple-700 dark:text-purple-300',
          badgeBg: 'bg-purple-500 text-white',
          pulseColor: 'bg-purple-400'
        };
      case 'moonset':
        return {
          bg: 'bg-slate-50/90 dark:bg-slate-900/25',
          border: 'border-slate-400/50 shadow-slate-500/10',
          text: 'text-slate-700 dark:text-slate-300',
          badgeBg: 'bg-slate-500 text-white',
          pulseColor: 'bg-slate-400'
        };
      case 'peak_temp':
        return {
          bg: 'bg-rose-50/90 dark:bg-rose-950/25',
          border: 'border-rose-400/50 shadow-rose-500/10',
          text: 'text-rose-700 dark:text-rose-300',
          badgeBg: 'bg-rose-500 text-white',
          pulseColor: 'bg-rose-400'
        };
      case 'wind_shift':
        return {
          bg: 'bg-emerald-50/90 dark:bg-emerald-950/25',
          border: 'border-emerald-400/50 shadow-emerald-500/10',
          text: 'text-emerald-700 dark:text-emerald-300',
          badgeBg: 'bg-emerald-500 text-white',
          pulseColor: 'bg-emerald-400'
        };
      default:
        return {
          bg: 'bg-white dark:bg-slate-900',
          border: 'border-slate-100 dark:border-slate-800/80',
          text: 'text-slate-700 dark:text-slate-300',
          badgeBg: 'bg-slate-100 text-slate-800',
          pulseColor: 'bg-slate-300'
        };
    }
  };

  // If it's a standard hourly status element (NOT a triggered instantaneous marker)
  if (!isSpecial) {
    const condStyle = conditionCardStyle(event.iconName, event.description, event.kind);
    const showWind = event.windSpeed !== undefined;
    return (
      <div 
        id={`timeline-hourly-event-${event.id}`}
        className="flex items-stretch gap-4 py-1.5 pl-2 pr-2"
      >
        {/* Time Left index header */}
        <div className="w-10 text-right sky-mono text-[12px] font-bold text-[color:var(--sky-dim)] shrink-0 flex items-center justify-end">
          {event.hourLabel.replace(':00', '')}
        </div>

        {/* Central spacing bridge without circles */}
        <div className="w-3 shrink-0" />

        {/* Content detail layout */}
        <div
          className="flex-1 min-w-0 border px-3.5 min-h-[72px] h-auto py-2 rounded-none flex items-center justify-between shadow-sm transition-all duration-150"
          style={condStyle}
        >
          {/* Left part: Icon + condition label (sky-wash style) */}
          <div className="flex-1 flex items-center gap-2 min-w-0 h-full py-1">
            <div className="p-1 rounded-none text-[color:var(--sky-muted)] shrink-0">
              <WeatherIcon name={event.iconName} size={16} />
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <span className="text-[13px] font-extrabold text-[color:var(--sky-fg)] capitalize whitespace-normal break-words leading-tight w-full">
                {event.description}
              </span>
              {showWind && (
                <span className="text-[11px] text-[color:var(--sky-dim)] font-semibold sky-mono mt-0.5 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1">
                    <WindDirectionArrow
                      deg={(event.windSpeed ?? 0) <= 0 ? 0 : (event.windDeg ?? 0)}
                      size={11}
                      title={`Wind direction: ${event.windDeg}°`}
                    />
                    <span>
                      {convertWindSpeed(event.windSpeed, settings.windSpeedUnit)} {settings.windSpeedUnit}
                    </span>
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Temperature (prominent like reference) */}
          <div className="shrink-0 text-right h-full flex items-center justify-end pl-3">
            <span className="text-[28px] leading-none font-black text-[color:var(--sky-fg)] tabular-nums sky-title">
              {convertTemp(event.temp ?? 0, settings.tempUnit)}°
            </span>
          </div>
        </div>
      </div>
    );
  }

  // RENDER INSTANTANEOUS MARKERS (Sunrise, Sunset, Now, Peak temperature times)
  const getThemeStylesForLine = () => {
    switch (event.type) {
      case 'now':
        return {
          dotBg: 'bg-blue-500 ring-4 ring-blue-100 dark:ring-blue-950/50 animate-pulse',
          lineColor: 'border-blue-200 dark:border-blue-800/40',
          badgeBg: 'bg-blue-50/95 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/80',
          text: 'text-blue-700 dark:text-blue-300',
          iconColor: 'text-blue-600 dark:text-blue-400',
          label: 'Current Conditions'
        };
      case 'sunrise':
        return {
          dotBg: 'bg-amber-400 ring-4 ring-amber-100 dark:ring-amber-950/40',
          lineColor: 'border-amber-200 dark:border-amber-800/40',
          badgeBg: 'bg-amber-50/95 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80',
          text: 'text-amber-800 dark:text-amber-300',
          iconColor: 'text-amber-600 dark:text-amber-400',
          label: 'Sunrise'
        };
      case 'sunset':
        return {
          dotBg: 'bg-indigo-600 ring-4 ring-indigo-100 dark:ring-indigo-950/40',
          lineColor: 'border-indigo-200 dark:border-indigo-800/40',
          badgeBg: 'bg-indigo-50/95 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/80',
          text: 'text-indigo-800 dark:text-indigo-300',
          iconColor: 'text-indigo-600 dark:text-indigo-400',
          label: 'Sunset'
        };
      case 'moonrise':
        return {
          dotBg: 'bg-purple-500 ring-4 ring-purple-100 dark:ring-purple-950/40',
          lineColor: 'border-purple-200 dark:border-purple-800/40',
          badgeBg: 'bg-purple-50/95 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/80',
          text: 'text-purple-800 dark:text-purple-300',
          iconColor: 'text-purple-600 dark:text-purple-400',
          label: 'Moonrise'
        };
      case 'moonset':
        return {
          dotBg: 'bg-slate-500 ring-4 ring-slate-100 dark:ring-slate-950/40',
          lineColor: 'border-slate-200 dark:border-slate-800/40',
          badgeBg: 'bg-slate-50/95 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80',
          text: 'text-slate-800 dark:text-slate-300',
          iconColor: 'text-slate-600 dark:text-slate-400',
          label: 'Moonset'
        };
      case 'peak_temp':
        return {
          dotBg: 'bg-rose-500 ring-4 ring-rose-100 dark:ring-rose-950/40',
          lineColor: 'border-rose-200 dark:border-rose-800/40',
          badgeBg: 'bg-rose-50/95 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80',
          text: 'text-rose-800 dark:text-rose-300',
          iconColor: 'text-rose-600 dark:text-rose-400',
          label: 'High Temperature'
        };
      case 'wind_shift':
        return {
          dotBg: 'bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950/40',
          lineColor: 'border-emerald-200 dark:border-emerald-800/40',
          badgeBg: 'bg-emerald-50/95 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80',
          text: 'text-emerald-800 dark:text-emerald-300',
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          label: 'Wind Shift'
        };
      default:
        return {
          dotBg: 'bg-slate-400 ring-4 ring-slate-100 dark:ring-slate-900/40',
          lineColor: 'border-slate-200 dark:border-slate-800/40',
          badgeBg: 'bg-slate-50/95 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80',
          text: 'text-slate-700 dark:text-slate-300',
          iconColor: 'text-slate-500 dark:text-slate-400',
          label: 'Weather Alert'
        };
    }
  };

  const lineTheme = getThemeStylesForLine();

  return (
    <div 
      id={event.type === 'now' ? 'timeline-event-now' : `timeline-special-event-${event.id}`}
      className="flex items-center gap-4 py-2 pl-2 pr-2 relative"
    >
      {/* Time label on the left */}
      <div className="w-10 text-right font-mono text-[12px] font-bold text-slate-400 shrink-0 flex items-center justify-end">
        {timeLabel}
      </div>

      {/* Spine connection: a beautiful thematic dot positioned exactly on the spine */}
      <div className="w-3 shrink-0 flex items-center justify-center relative z-10">
        <div className={`w-2 h-2 rounded-full ${lineTheme.dotBg} transition-all duration-300`} />
      </div>

      {/* Horizontal line across the main card area */}
      <div className="flex-1 min-w-0 flex items-center relative h-6">
        {/* Left segment of horizontal line (kept minimal so badges align left) */}
        <div className={`h-[1px] w-0 border-t border-dashed ${lineTheme.lineColor}`} />

        {/* The beautiful premium label badge on the horizontal line without card container */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-extrabold font-mono tracking-tight shrink-0 shadow-sm border ${lineTheme.badgeBg} ${lineTheme.text}`}>
          {event.type === 'sunrise' && (
            <>
              <Sunrise size={11} className={lineTheme.iconColor} />
              <span className="uppercase tracking-wide">Sunrise</span>
            </>
          )}
          {event.type === 'sunset' && (
            <>
              <Sunset size={11} className={lineTheme.iconColor} />
              <span className="uppercase tracking-wide">Sunset</span>
            </>
          )}
          {event.type === 'moonrise' && (
            <>
              <WeatherIcon name="moon" size={11} className={lineTheme.iconColor} />
              <span className="uppercase tracking-wide">Moonrise</span>
            </>
          )}
          {event.type === 'moonset' && (
            <>
              <WeatherIcon name="moon" size={11} className={lineTheme.iconColor} />
              <span className="uppercase tracking-wide">Moonset</span>
            </>
          )}
          {event.type === 'peak_temp' && (
            <>
              <Flame size={11} className={lineTheme.iconColor} />
              <span className="uppercase tracking-wide">High Temp:</span>
              <span className="font-bold">{convertTemp(event.tempMax ?? event.temp ?? 0, settings.tempUnit)}°</span>
            </>
          )}
          {event.type === 'now' && (
            <>
              <WeatherIcon name="locate" size={11} className={lineTheme.iconColor} />
              <span className="uppercase tracking-wide">Now:</span>
              <span className="font-bold">{convertTemp(event.temp ?? 0, settings.tempUnit)}°</span>
            </>
          )}
          {event.type === 'wind_shift' && (
            <WindShiftLoop event={event} settings={settings} iconColorClass={lineTheme.iconColor} />
          )}
          {!['sunrise', 'sunset', 'moonrise', 'moonset', 'peak_temp', 'now', 'wind_shift'].includes(event.type) && (
            <>
              <span className="uppercase tracking-wide">{lineTheme.label}</span>
              <span className="font-normal opacity-80 select-none">•</span>
              <span className="font-bold">{event.title}</span>
              {event.description && (
                <>
                  <span className="font-normal opacity-50 select-none">|</span>
                  <span className="font-medium text-slate-500 dark:text-slate-400 normal-case">{event.description}</span>
                </>
              )}
            </>
          )}
        </div>

        {/* Right segment extending across the container */}
        <div className={`h-[1px] flex-1 border-t border-dashed ${lineTheme.lineColor}`} />
      </div>
    </div>
  );
};

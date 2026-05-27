/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { DailyForecast, UserSettings, WeatherTimelineEvent } from '../types';
import { TimelineMarkerCard } from './TimelineMarkerCard';
import { WeatherIcon } from './WeatherIcon';
import { convertTemp, convertWindSpeed } from '../utils/unitConverter';
import { WindDirectionArrow } from './WindDirectionArrow';

interface WeatherTimelineProps {
  daily: DailyForecast[];
  settings: UserSettings;
  activeDayIdx: number;
  onActiveDayChange: (idx: number) => void;
  scrollSpyBlockedRef?: React.RefObject<boolean>;
}

const SCROLL_SPY_THRESHOLD_PX = 12;

function computeVisibleDayIndex(container: HTMLElement, dayCount: number): number {
  const atBottom =
    container.scrollTop + container.clientHeight >= container.scrollHeight - 4;
  if (atBottom) return Math.max(0, dayCount - 1);

  const containerTop = container.getBoundingClientRect().top;
  let activeIdx = 0;

  for (let i = 0; i < dayCount; i++) {
    const anchor = document.getElementById(`timeline-day-anchor-${i}`);
    if (!anchor) continue;
    const dayTop = anchor.getBoundingClientRect().top - containerTop;
    if (dayTop <= SCROLL_SPY_THRESHOLD_PX) {
      activeIdx = i;
    }
  }

  return activeIdx;
}

interface GroupedTimelineItem {
  type: 'special' | 'merged_hourly';
  events: WeatherTimelineEvent[];
}

export const MergedHourlyCard: React.FC<{ events: WeatherTimelineEvent[]; settings: UserSettings }> = ({ events, settings }) => {
  const firstEvent = events[0];
  const hasRain = events.some(e => e.precipProb !== undefined && e.precipProb > 10);
  const maxRain = hasRain ? Math.max(...events.map(e => e.precipProb || 0)) : 0;

  return (
    <div className="flex items-stretch gap-2 py-1.5 pl-2 pr-2 relative">
      {/* Left side: Time labels, stacked vertically - alignment matched exactly with rows */}
      <div className="w-10 shrink-0 flex flex-col py-2">
        {events.map(evt => (
          <div 
            key={evt.id} 
            className="h-[72px] flex items-center justify-end font-mono text-[11px] font-bold text-slate-404 dark:text-slate-400"
          >
            {evt.hourLabel.replace(':00', '')}
          </div>
        ))}
      </div>

      {/* Center column spacing bridge to align perfectly with single timeline markers */}
      <div className="w-3 shrink-0" />

      {/* Right side: Unified continuous background card block with the requested layout */}
      <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 border border-slate-150/80 dark:border-slate-800/80 px-3.5 py-2 rounded-2xl flex flex-col shadow-sm transition-all duration-150 relative">
        <div className="flex flex-col flex-grow divide-y divide-slate-50/50 dark:divide-slate-800/30">
          {events.map((evt, idx) => {
            return (
              <div 
                key={evt.id} 
                className="h-[72px] flex items-center justify-between py-1 relative"
              >
                {/* Left part: Icon at top, Condition text below, wrapping correctly */}
                <div className="flex-1 flex flex-col items-start justify-center min-w-0 h-full relative">
                  {idx === 0 ? (
                    <div className="flex flex-col items-start gap-1 py-1 w-full">
                      <div className="p-1 bg-slate-50 dark:bg-slate-800 rounded text-slate-505 shrink-0">
                        <WeatherIcon name={firstEvent.iconName} size={15} />
                      </div>
                      <div className="flex flex-col items-start w-full">
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 capitalize whitespace-normal break-words leading-none w-full">
                          {firstEvent.description}
                        </span>
                        {hasRain && (
                          <span className="text-[9px] bg-blue-50/80 dark:bg-blue-900/40 dark:text-blue-200 text-blue-600 font-bold px-1.5 py-0.5 rounded font-mono shrink-0 mt-0.5">
                            {maxRain}% Rain
                          </span>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Left divider line simulating '|' */}
                <div className="h-5 w-[1px] bg-slate-100 dark:bg-slate-800/80 mx-2 shrink-0" />

                {/* Middle part: Wind Speed column */}
                <div className="relative w-20 h-full flex items-center justify-end shrink-0">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500 z-10 bg-white dark:bg-slate-900 px-1 rounded">
                    <WindDirectionArrow
                      deg={(evt.windSpeed ?? 0) <= 0 ? 0 : (evt.windDeg ?? 0)}
                      size={10}
                      title={`Wind direction: ${evt.windDeg}°`}
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {convertWindSpeed(evt.windSpeed, settings.windSpeedUnit)} {settings.windSpeedUnit}
                    </span>
                  </div>
                </div>

                {/* Right divider line simulating '|' */}
                <div className="h-5 w-[1px] bg-slate-100 dark:bg-slate-800/80 mx-2 shrink-0" />

                {/* Right part: Temperature column */}
                <div className="relative w-12 h-full flex items-center justify-end shrink-0">
                  <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 z-10 bg-white dark:bg-slate-905 px-1 rounded">
                    {convertTemp(evt.temp ?? 0, settings.tempUnit)}°
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const WeatherTimeline: React.FC<WeatherTimelineProps> = ({
  daily,
  settings,
  activeDayIdx,
  onActiveDayChange,
  scrollSpyBlockedRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeDayRef = useRef(activeDayIdx);

  useEffect(() => {
    activeDayRef.current = activeDayIdx;
  }, [activeDayIdx]);

  useEffect(() => {
    const container = containerRef.current;
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
  // Core helper to cluster sequential standard hourly_status events of same sky condition (description)
  const groupTimelineEvents = (events: WeatherTimelineEvent[]): GroupedTimelineItem[] => {
    const grouped: GroupedTimelineItem[] = [];
    let currentHourlyGroup: WeatherTimelineEvent[] = [];

    for (const evt of events) {
      if (evt.isSpecial) {
        // Handle buffered hourly group first before processing special events
        if (currentHourlyGroup.length > 0) {
          grouped.push({
            type: 'merged_hourly',
            events: currentHourlyGroup
          });
          currentHourlyGroup = [];
        }
        grouped.push({ type: 'special', events: [evt] });
      } else {
        // Standard hourly weather events
        if (currentHourlyGroup.length === 0) {
          currentHourlyGroup.push(evt);
        } else {
          const firstDesc = currentHourlyGroup[0].description.trim().toLowerCase();
          const targetDesc = evt.description.trim().toLowerCase();
          if (firstDesc === targetDesc) {
            currentHourlyGroup.push(evt);
          } else {
            // Push previous group and start new group
            grouped.push({
              type: 'merged_hourly',
              events: currentHourlyGroup
            });
            currentHourlyGroup = [evt];
          }
        }
      }
    }

    // Flush final buffer
    if (currentHourlyGroup.length > 0) {
      grouped.push({
        type: 'merged_hourly',
        events: currentHourlyGroup
      });
    }

    return grouped;
  };

  return (
    <div
      ref={containerRef}
      id="weather-timeline-container"
      className="flex-1 min-h-0 overflow-y-auto scrollbar-none bg-white dark:bg-slate-950 px-4 py-5 pb-24 rounded-t-3xl shadow-inner relative z-10"
    >
      
      {/* Main continuous timeline list */}
      <div className="relative">
        {/* Dynamic vertical "Wire Line" running down the background layout */}
        <div className="absolute left-[62px] top-2 bottom-8 w-0.5 bg-slate-100 dark:bg-slate-800/40 pointer-events-none" />

        {daily.map((day, dIdx) => {
          const isSelectedDay = activeDayIdx === dIdx;

          // Filter events by Sunrise/Sunset & Moonrise/Moonset user preferences
          const filteredEvents = day.timelineEvents.filter(evt => {
            if (evt.type === 'sunrise' || evt.type === 'sunset') {
              return settings.showSunriseSunset;
            }
            if (evt.type === 'moonrise' || evt.type === 'moonset') {
              return settings.showMoonriseMoonset;
            }
            return true;
          });

          return (
            <div 
              key={day.shortDate}
              id={`timeline-day-anchor-${dIdx}`}
              className={`space-y-1 transition-all duration-300 ${
                isSelectedDay 
                  ? 'opacity-100 scale-100' 
                  : 'opacity-65 hover:opacity-100'
              }`}
            >
              {/* Day Section Header card with Sticky capability */}
              <div className="sticky top-0 bg-white/95 dark:bg-slate-950/95 py-2.5 z-20 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/30">
                <div className="flex items-center gap-2">
                  <div className={`text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                    isSelectedDay 
                      ? 'bg-emerald-580 text-white font-extrabold bg-emerald-500 shadow-sm' 
                      : 'bg-slate-105 text-slate-600 dark:bg-slate-900 dark:text-slate-400'
                  }`}>
                    {day.dayName}
                  </div>
                  <div className="text-xs font-bold text-slate-450 font-mono">
                    {day.shortDate}
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-mono font-bold">
                  High: {convertTemp(day.tempMax, settings.tempUnit)}° / Low: {convertTemp(day.tempMin, settings.tempUnit)}°
                </div>
              </div>

              {/* Day Weather Event Timeline schedule rows */}
              <div className="pb-8 space-y-1">
                {groupTimelineEvents(filteredEvents).map((item, idx) => {
                  if (item.type === 'special' && item.events[0]) {
                    return (
                      <TimelineMarkerCard 
                        key={`special-${item.events[0].id}-${idx}`} 
                        event={item.events[0]} 
                        settings={settings} 
                      />
                    );
                  } else if (item.type === 'merged_hourly' && item.events.length > 0) {
                    if (item.events.length === 1) {
                      return (
                        <TimelineMarkerCard 
                          key={`single-${item.events[0].id}-${idx}`} 
                          event={item.events[0]} 
                          settings={settings} 
                        />
                      );
                    } else {
                      return (
                        <MergedHourlyCard 
                          key={`merged-${item.events[0].id}-${idx}`} 
                          events={item.events} 
                          settings={settings} 
                        />
                      );
                    }
                  }
                  return null;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

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
import { conditionCardStyle } from '../utils/conditionPalette';

interface WeatherTimelineProps {
  daily: DailyForecast[];
  settings: UserSettings;
  activeDayIdx: number;
  onActiveDayChange: (idx: number) => void;
  scrollSpyBlockedRef?: React.RefObject<boolean>;
  timeZone?: string;
  timeZoneOffsetMinutes?: number;
}

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

interface GroupedTimelineItem {
  type: 'special' | 'merged_hourly';
  events: WeatherTimelineEvent[];
}

export const MergedHourlyCard: React.FC<{ events: WeatherTimelineEvent[]; settings: UserSettings }> = ({ events, settings }) => {
  const firstEvent = events[0];
  const hasRain = events.some(e => e.precipProb !== undefined && e.precipProb > 10);
  const maxRain = hasRain ? Math.max(...events.map(e => e.precipProb || 0)) : 0;
  const condStyle = conditionCardStyle(firstEvent?.iconName, firstEvent?.description);

  return (
    <div className="flex items-stretch gap-4 py-1.5 pl-2 pr-2 relative">
      {/* Left side: Time labels, stacked vertically - alignment matched exactly with rows */}
      <div className="w-10 shrink-0 flex flex-col py-2">
        {events.map(evt => (
          <div 
            key={evt.id} 
            className="h-[72px] flex items-center justify-end sky-mono text-[12px] font-bold text-[color:var(--sky-dim)]"
          >
            {evt.hourLabel.replace(':00', '')}
          </div>
        ))}
      </div>

      {/* Center column spacing bridge to align perfectly with single timeline markers */}
      <div className="w-3 shrink-0" />

      {/* Right side: Unified continuous background card block with the requested layout */}
      <div
        className="flex-1 min-w-0 px-3.5 py-2 rounded-2xl flex flex-col transition-all duration-150 relative border"
        style={condStyle}
      >
        <div className="flex flex-col flex-grow divide-y divide-white/5">
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
                      <div className="p-1 rounded text-[color:var(--sky-muted)] shrink-0">
                        <WeatherIcon name={firstEvent.iconName} size={15} className="text-[color:var(--sky-warn)]" />
                      </div>
                      <div className="flex flex-col items-start w-full">
                        <span className="text-[12px] font-bold text-[color:var(--sky-fg)] capitalize whitespace-normal break-words leading-none w-full">
                          {firstEvent.description}
                        </span>
                        {hasRain && (
                          <span className="text-[10px] text-[color:var(--sky-dim)] font-bold sky-mono shrink-0 mt-0.5">
                            {maxRain}% Rain
                          </span>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Left divider line simulating '|' */}
                <div className="h-5 w-[1px] bg-[color:var(--sky-border)] mx-2 shrink-0" />

                {/* Middle part: Wind Speed column */}
                <div className="relative w-20 h-full flex items-center justify-end shrink-0">
                  <div className="flex items-center gap-1.5 sky-mono text-[11px] text-[color:var(--sky-dim)] z-10">
                    <WindDirectionArrow
                      deg={(evt.windSpeed ?? 0) <= 0 ? 0 : (evt.windDeg ?? 0)}
                      size={10}
                      title={`Wind direction: ${evt.windDeg}°`}
                    />
                    <span className="font-semibold text-[color:var(--sky-muted)]">
                      {convertWindSpeed(evt.windSpeed, settings.windSpeedUnit)} {settings.windSpeedUnit}
                    </span>
                  </div>
                </div>

                {/* Right divider line simulating '|' */}
                <div className="h-5 w-[1px] bg-[color:var(--sky-border)] mx-2 shrink-0" />

                {/* Right part: Temperature column */}
                <div className="relative w-12 h-full flex items-center justify-end shrink-0">
                  <span className="text-base font-extrabold text-[color:var(--sky-fg)] z-10">
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
  timeZone,
  timeZoneOffsetMinutes,
}) => {
  const activeDayRef = useRef(activeDayIdx);

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
    <div className="px-4 py-5 pb-24">
      <div className="relative">
        <div className="absolute left-[62px] top-2 bottom-8 w-0.5 bg-[color:var(--sky-border)] pointer-events-none" />

        {daily.map((day, dIdx) => {
          const isSelectedDay = activeDayIdx === dIdx;

          const filteredEvents = day.timelineEvents.filter((evt) => {
            if (evt.type === 'sunrise' || evt.type === 'sunset') return settings.showSunriseSunset;
            if (evt.type === 'moonrise' || evt.type === 'moonset') return settings.showMoonriseMoonset;
            return true;
          });

          return (
            <div
              key={day.shortDate}
              id={`timeline-day-anchor-${dIdx}`}
              className={`space-y-1 transition-all duration-300 ${
                isSelectedDay ? 'opacity-100 scale-100' : 'opacity-65 hover:opacity-100'
              }`}
            >
              <div
                className="sticky top-0 py-2 z-20 flex items-center justify-between border-b border-[color:var(--sky-border)] backdrop-blur-md"
                style={{
                  top: 'var(--sky-top-stack-h, 0px)',
                  background:
                    'linear-gradient(180deg, color-mix(in oklch, var(--sky-bg) 78%, transparent 22%), color-mix(in oklch, var(--sky-bg) 35%, transparent 65%))',
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`inline-flex items-center gap-2 text-sm sky-mono font-bold tracking-wider px-2 py-1 rounded-lg ${
                      isSelectedDay
                        ? 'bg-[color:rgba(124,246,255,0.16)] text-[color:var(--sky-accent)] font-extrabold border border-[color:var(--sky-border)] shadow-sm'
                        : 'bg-[color:var(--sky-card)] text-[color:var(--sky-muted)] border border-[color:var(--sky-border)]'
                    }`}
                  >
                    <span className="uppercase">{day.dayName}</span>
                    <span>{day.shortDate}</span>
                  </div>
                </div>

                <div className="text-[12px] text-[color:var(--sky-dim)] sky-mono font-bold">
                  High: {convertTemp(day.tempMax, settings.tempUnit)}° / Low: {convertTemp(day.tempMin, settings.tempUnit)}°
                </div>
              </div>

              <div className="pb-8 space-y-1">
                {groupTimelineEvents(filteredEvents).map((item, idx) => {
                  if (item.type === 'special' && item.events[0]) {
                    return (
                      <TimelineMarkerCard
                        key={`special-${item.events[0].id}-${idx}`}
                        event={item.events[0]}
                        settings={settings}
                        timeZone={timeZone}
                        timeZoneOffsetMinutes={timeZoneOffsetMinutes}
                      />
                    );
                  }
                  if (item.type === 'merged_hourly' && item.events.length > 0) {
                    if (item.events.length === 1) {
                      return (
                        <TimelineMarkerCard
                          key={`single-${item.events[0].id}-${idx}`}
                          event={item.events[0]}
                          settings={settings}
                          timeZone={timeZone}
                          timeZoneOffsetMinutes={timeZoneOffsetMinutes}
                        />
                      );
                    }
                    return (
                      <MergedHourlyCard key={`merged-${item.events[0].id}-${idx}`} events={item.events} settings={settings} />
                    );
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

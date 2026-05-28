/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { DailyForecast, UserSettings } from '../types';
import { WeatherIcon } from './WeatherIcon';
import { convertTemp } from '../utils/unitConverter';

interface DailyScrollerProps {
  daily: DailyForecast[];
  selectedDayIdx: number;
  onSelectDay: (idx: number) => void;
  onBeforeTimelineScroll?: (ms?: number) => void;
  settings: UserSettings;
}

export const DailyScroller: React.FC<DailyScrollerProps> = ({
  daily,
  selectedDayIdx,
  onSelectDay,
  onBeforeTimelineScroll,
  settings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const readTopStackHeight = (scrollContainer: HTMLElement): number => {
    const raw = getComputedStyle(scrollContainer).getPropertyValue('--sky-top-stack-h').trim();
    const n = Number.parseFloat(raw.replace('px', ''));
    return Number.isFinite(n) ? n : 0;
  };

  const fastScrollTo = (container: HTMLElement, top: number, durationMs = 450) => {
    const startTop = container.scrollTop;
    const delta = top - startTop;
    if (!Number.isFinite(delta) || Math.abs(delta) < 1) {
      container.scrollTop = top;
      return;
    }

    const start = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      container.scrollTop = startTop + delta * easeOutCubic(t);
      if (t < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  const scrollToTimelineDay = (idx: number) => {
    const scrollContainer = document.getElementById('weather-timeline-container');
    const dayAnchor = document.getElementById(`timeline-day-anchor-${idx}`);
    if (!scrollContainer || !dayAnchor) return;

    const containerTop = scrollContainer.getBoundingClientRect().top;
    const pinned = readTopStackHeight(scrollContainer);
    const visibleHeight = scrollContainer.clientHeight - pinned;

    // Minimum scroll: put the day anchor flush at the top of the visible area.
    const dayAnchorTop = dayAnchor.getBoundingClientRect().top;
    const targetDayStart = dayAnchorTop - containerTop + scrollContainer.scrollTop - pinned;

    // Preferred scroll: sunrise 20% down from the top of the visible area.
    const sunriseEl = document.getElementById(`timeline-instant-event-${idx}-sunrise`);
    if (sunriseEl) {
      const sunriseTop = sunriseEl.getBoundingClientRect().top;
      const targetSunrise = sunriseTop - containerTop + scrollContainer.scrollTop - pinned - visibleHeight * 0.2;
      // If sunrise-20% would expose the previous day, fall back to day start.
      fastScrollTo(scrollContainer, Math.max(targetDayStart, targetSunrise), 450);
    } else {
      fastScrollTo(scrollContainer, Math.max(0, targetDayStart), 450);
    }
  };

  const handleDayClick = (idx: number) => {
    onBeforeTimelineScroll?.(500);
    onSelectDay(idx);
    setTimeout(() => scrollToTimelineDay(idx), 50);
  };

  useEffect(() => {
    const activePill = document.getElementById(`horizontal-pill-${selectedDayIdx}`);
    const container = containerRef.current;
    if (!activePill || !container) return;

    requestAnimationFrame(() => {
      if (selectedDayIdx === 0) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
        return;
      }
      const containerRect = container.getBoundingClientRect();
      const pillRect = activePill.getBoundingClientRect();
      const pillLeft = pillRect.left - containerRect.left + container.scrollLeft;
      const targetScroll = pillLeft - container.clientWidth / 2 + pillRect.width / 2;
      container.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
    });
  }, [selectedDayIdx]);

  return (
    <div
      className="w-full bg-[color:var(--sky-surface)] border-b border-[color:var(--sky-border)] shrink-0"
    >
      <div
        ref={containerRef}
        id="horizontal-day-scroller"
        className="flex overflow-x-auto scrollbar-none select-none"
      >
        {daily.map((day, idx) => {
          const isSelected = selectedDayIdx === idx;
          return (
            <button
              id={`horizontal-pill-${idx}`}
              key={day.shortDate}
              onClick={() => handleDayClick(idx)}
              className={`flex-1 min-w-[64px] flex flex-col items-center py-2.5 gap-0.5 border-b-2 transition-all duration-150 cursor-pointer border-r border-r-[color:var(--sky-border)] last:border-r-0 ${
                isSelected
                  ? 'border-b-[color:var(--sky-fg)] opacity-100'
                  : 'border-b-transparent opacity-50 hover:opacity-75'
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wide sky-mono text-[color:var(--sky-fg)]">
                {day.dayName.slice(0, 3)}
              </span>
              <WeatherIcon
                name={day.iconName}
                size={15}
                className="text-[color:var(--sky-muted)]"
              />
              <div className="flex items-baseline gap-[3px] text-[11px] sky-mono">
                <span className="font-bold text-[color:var(--sky-fg)]">
                  {convertTemp(day.tempMax, settings.tempUnit)}°
                </span>
                <span className="text-[color:var(--sky-dim)]">
                  {convertTemp(day.tempMin, settings.tempUnit)}°
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { DailyForecast, UserSettings } from '../types';
import { WeatherIcon } from './WeatherIcon';
import { Calendar } from 'lucide-react';
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
    const element = document.getElementById(`timeline-day-anchor-${idx}`);
    if (!scrollContainer || !element) return;

    const containerTop = scrollContainer.getBoundingClientRect().top;
    const elementTop = element.getBoundingClientRect().top;
    const pinned = readTopStackHeight(scrollContainer);
    const targetTop = elementTop - containerTop + scrollContainer.scrollTop - pinned;
    fastScrollTo(scrollContainer, targetTop, 450);
  };

  const handleDayClick = (idx: number) => {
    onBeforeTimelineScroll?.(500);
    onSelectDay(idx);
    setTimeout(() => scrollToTimelineDay(idx), 50);
  };

  // Auto-scroll the active horizontal pill into view if needed
  useEffect(() => {
    const activePill = document.getElementById(`horizontal-pill-${selectedDayIdx}`);
    const container = containerRef.current;
    if (activePill && container) {
      // Prefer native scroll-into-view for horizontal scrollers; it tends to be
      // more robust than manual offset math across layout/zoom/font changes.
      // block:'nearest' prevents any vertical scrolling of the page.
      requestAnimationFrame(() => {
        activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      });

      if (selectedDayIdx === 0) {
        container.scrollTo({
          left: 0,
          behavior: 'smooth'
        });
        return;
      }
      
      const containerWidth = container.clientWidth;
      if (containerWidth > 0) {
        const containerRect = container.getBoundingClientRect();
        const pillRect = activePill.getBoundingClientRect();
        const pillLeft = pillRect.left - containerRect.left + container.scrollLeft;
        const pillWidth = pillRect.width;
        const targetScroll = pillLeft - containerWidth / 2 + pillWidth / 2;
        
        container.scrollTo({
          left: Math.max(0, targetScroll),
          behavior: 'smooth'
        });
      }
    }
  }, [selectedDayIdx]);

  return (
    <div
      id="daily-scroller-main"
      className="w-full p-3 border-b border-[color:var(--sky-border)] shrink-0"
      style={{
        background: 'linear-gradient(180deg, var(--sky-card-2), var(--sky-card))',
        backdropFilter: 'blur(10px)',
      }}
    >


      {/* HORIZONTAL scrolling container with hide scrollbar utilities */}
      <div 
        ref={containerRef}
        id="horizontal-day-scroller" 
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 select-none"
      >
        {daily.map((day, idx) => {
          const isSelected = selectedDayIdx === idx;
          const dayOfWeekShort = day.dayName.slice(0, 3); // "Monday" -> "Mon"
          const dateRef = new Date(day.date);
          const monthShort = dateRef.toLocaleDateString('en-US', { month: 'short' }); // "May"
          const dayOfMonth = dateRef.getDate(); // 27

          return (
            <button
              id={`horizontal-pill-${idx}`}
              key={day.shortDate}
              onClick={() => handleDayClick(idx)}
              className={`flex-shrink-0 w-[84px] p-2.5 rounded-2xl border transition duration-200 flex flex-col items-center text-center relative cursor-pointer ${
                isSelected
                  ? 'bg-[color:var(--sky-card-2)] border-[color:rgba(124,246,255,0.40)] shadow-md'
                  : 'bg-[color:var(--sky-card)] border-[color:var(--sky-border)] hover:bg-[color:var(--sky-card-2)] hover:border-[color:var(--sky-border-2)]'
              }`}
            >
              {/* Day of Week & Full Date Code */}
              <span
                className={`text-sm font-extrabold tracking-tight sky-title ${
                  isSelected ? 'text-[color:var(--sky-accent)]' : 'text-[color:var(--sky-fg)]'
                }`}
              >
                {dayOfWeekShort}
              </span>
              
              <span className="text-[11px] text-[color:var(--sky-dim)] uppercase sky-mono font-bold mt-0.5">
                {monthShort} {dayOfMonth}
              </span>

              {/* Icon & Basic Condition text snippet */}
              <div className="my-1 flex items-center justify-center">
                <WeatherIcon 
                  name={day.iconName} 
                  className={isSelected ? 'text-[color:var(--sky-accent-2)] animate-pulse' : 'text-[color:var(--sky-dim)]'} 
                  size={18} 
                />
              </div>

              {/* High / Low Temp range values */}
              <div className="flex items-center gap-1.5 text-sm sky-mono font-bold border-t border-[color:var(--sky-border)] pt-[6px] w-full justify-center">
                <span className="text-[color:var(--sky-fg)]">{convertTemp(day.tempMax, settings.tempUnit)}°</span>
                <span className="text-[color:var(--sky-border-2)] font-normal">|</span>
                <span className="text-[color:var(--sky-dim)] font-normal">{convertTemp(day.tempMin, settings.tempUnit)}°</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

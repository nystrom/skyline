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
    const targetTop = elementTop - containerTop + scrollContainer.scrollTop;
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
    <div id="daily-scroller-main" className="w-full bg-slate-50 dark:bg-slate-900/60 p-3 border-b border-slate-250 dark:border-slate-800/80 shrink-0">


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
                  ? 'bg-white dark:bg-slate-800 border-emerald-500 shadow-md ring-1 ring-emerald-500/10'
                  : 'bg-white/80 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 hover:border-slate-350'
              }`}
            >
              {/* Animated highlight dot for select indicators */}
              {isSelected && (
                <span className="absolute top-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}

              {/* Day of Week & Full Date Code */}
              <span className={`text-xs font-extrabold tracking-tight ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                {dayOfWeekShort}
              </span>
              
              <span className="text-[10px] text-slate-450 dark:text-slate-400 uppercase font-mono font-bold mt-0.5">
                {monthShort} {dayOfMonth}
              </span>

              {/* Icon & Basic Condition text snippet */}
              <div className="my-1 flex items-center justify-center">
                <WeatherIcon 
                  name={day.iconName} 
                  className={isSelected ? 'text-emerald-500 animate-pulse' : 'text-slate-500 dark:text-slate-400'} 
                  size={18} 
                />
              </div>

              {/* High / Low Temp range values */}
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold border-t border-slate-100 dark:border-slate-800/80 pt-[6px] w-full justify-center">
                <span className="text-slate-800 dark:text-slate-200">{convertTemp(day.tempMax, settings.tempUnit)}°</span>
                <span className="text-slate-300 dark:text-slate-600 font-normal">|</span>
                <span className="text-slate-400 font-normal">{convertTemp(day.tempMin, settings.tempUnit)}°</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

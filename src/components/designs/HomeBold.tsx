import { useState, useRef, useCallback } from 'react';
import type React from 'react';
import { Navigation } from 'lucide-react';
import type { WxScenario, WxSky, WxIconType } from './wxTypes';
import { WeatherIconDesign } from './WeatherIconDesign';
import { fmtTemp, intensityNorm, precipPhrase, humanizeDur } from './wxUtils';
import { convertWindSpeed, getWindUnitLabel } from '@/src/utils/unitConverter';
import { windDegToRotation } from '@/src/services/weather/windUtils';

interface Props {
  s: WxScenario;
  units: 'C' | 'F';
  precipUnit: 'mm/h' | 'cm/h' | 'in/h';
  windSpeedUnit: 'm/s' | 'kph' | 'mph' | 'knots';
}

function convertPrecip(mm: number, unit: 'mm/h' | 'cm/h' | 'in/h'): string {
  if (unit === 'cm/h') return (mm / 10).toFixed(2);
  if (unit === 'in/h') return (mm / 25.4).toFixed(2);
  return mm.toFixed(1);
}

export function HomeBold({ s, units, precipUnit, windSpeedUnit }: Props) {
  const sky: WxSky = s.sky;
  const fmt = (c: number) => fmtTemp(c, units);
  const fmtP = (mm: number) => convertPrecip(mm, precipUnit);
  const phrase = precipPhrase(s);
  const hours = s.hourly;
  const [sel, setSel] = useState(0);
  const [warningExpanded, setWarningExpanded] = useState(false);
  const mono = 'ui-monospace, "SF Mono", Menlo, monospace';
  const white = '#fff';
  const dim = 'rgba(255,255,255,0.55)';

  const firstWet = hours.findIndex((h) => h.mm > 0);
  const lastWet = hours.reduce((a, h, i) => (h.mm > 0 ? i : a), -1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const BAR_W = 35; // 32px wide + 3px gap

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    const first = Math.floor(scrollLeft / BAR_W);
    const last = Math.floor((scrollLeft + clientWidth - 1) / BAR_W);
    setSel(Math.min(Math.max(first, 0), Math.min(last, hours.length - 1)));
  }, [hours.length]);

  const panel: React.CSSProperties = {
    background: 'rgba(0,0,0,0.22)', backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)', borderRadius: 18,
  };

  const tomorrow = s.daily[1];
  const precipIcon: WxIconType = phrase.kind === 'none' ? s.cond : (s.precip.peakLabel === 'Heavy' || s.precip.peakLabel === 'Torrential' ? 'heavy' : 'rain');

  return (
    <div style={{
      position: 'relative', minHeight: '100%', color: white, background: sky.grad,
      padding: '56px 18px 40px', boxSizing: 'border-box',
      fontFamily: '-apple-system, system-ui, sans-serif',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 0 }}>
        <div style={{ fontSize: 150, fontWeight: 800, letterSpacing: -8, lineHeight: 0.86, fontVariantNumeric: 'tabular-nums' }}>
          {fmt(s.tempC)}<span style={{ fontSize: 60, verticalAlign: 'top', fontWeight: 600 }}>°</span>
        </div>
        <div style={{ marginTop: 10 }}>
          <WeatherIconDesign type={s.cond} size={66} color={white} accent={sky.accent} strokeWidth={1.5} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'baseline', marginTop: -4 }}>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, textTransform: 'uppercase' }}>{s.condLabel}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: mono, fontSize: 13 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#ff9d3b', marginRight: 3 }}>High</span>
            <span style={{ fontWeight: 600, color: white }}>{fmt(s.hiC)}°</span>
          </span>
          <span style={{ opacity: 0.3 }}>·</span>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#38bdf8', marginRight: 3 }}>Low</span>
            <span style={{ fontWeight: 600, color: white }}>{fmt(s.loC)}°</span>
          </span>
        </div>
      </div>

      {s.severe && (
        <div
          onClick={() => setWarningExpanded(!warningExpanded)}
          style={{
            marginTop: 18, borderRadius: 16, overflow: 'hidden',
            background: sky.accent, color: '#241405',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22, fontWeight: 900, shrink: 0 } as React.CSSProperties}>⚠</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase' }}>{s.severe.title}</div>
                {s.severe.sub && (
                  <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, opacity: 0.6, textTransform: 'uppercase', marginTop: 1 }}>
                    {s.severe.sub}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', opacity: 0.6, fontFamily: mono, shrink: 0 } as React.CSSProperties}>
                {warningExpanded ? 'Collapse ▲' : 'Expand ▼'}
              </span>
            </div>
            {s.severe.detail && (
              <div style={{
                fontFamily: mono,
                fontSize: 11,
                fontWeight: 600,
                opacity: 0.8,
                marginTop: 6,
                lineHeight: 1.45,
                whiteSpace: warningExpanded ? 'pre-wrap' : 'normal',
                display: warningExpanded ? 'block' : '-webkit-box',
                WebkitLineClamp: warningExpanded ? 'none' : 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {warningExpanded ? s.severe.detail : s.severe.detail.toUpperCase()}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{
        marginTop: 16, borderRadius: 18, padding: '18px 20px',
        background: phrase.kind === 'none' ? 'rgba(0,0,0,0.22)' : `linear-gradient(110deg, ${sky.accent}3d, rgba(0,0,0,0.25))`,
        border: phrase.kind === 'none' ? '0.5px solid rgba(255,255,255,0.12)' : `1px solid ${sky.accent}66`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{
            fontSize: 13, fontFamily: mono, letterSpacing: 1, fontWeight: 700,
            color: phrase.kind === 'none' ? dim : sky.accent,
          }}>
            {phrase.kind === 'none' ? 'No rain' : phrase.kind === 'active' ? 'Raining' : 'Incoming'}
          </div>
          <WeatherIconDesign type={precipIcon} size={44} color={white} accent={sky.accent} strokeWidth={1.8} />
        </div>
        <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1, marginTop: 6, lineHeight: 1 }}>
          {phrase.kind === 'soon'
            ? <>Rain in <span style={{ color: sky.accent }}>{humanizeDur(s.precip.startsInMin ?? 0)}</span></>
            : phrase.kind === 'active'
              ? <>{s.precip.peakLabel ?? 'Heavy'} <span style={{ color: sky.accent }}>rain</span></>
              : 'Clear'}
        </div>
        <div style={{ fontFamily: mono, fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 6, letterSpacing: 0.3 }}>
          {phrase.kind === 'none'
            ? 'Next 12 hours dry'
            : phrase.kind === 'active'
              ? `Easing by ${s.precip.endLabel ?? ''} · ${fmtP(s.precip.peakMm ?? 0)} ${precipUnit}`
              : `${s.precip.startLabel ?? ''} → ${s.precip.endLabel ?? ''} · ${s.precip.peakLabel ?? ''} · ${fmtP(s.precip.peakMm ?? 0)} ${precipUnit}`}
        </div>
      </div>

      <div style={{ ...panel, marginTop: 16, padding: '16px 12px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 6px 12px', alignItems: 'baseline' }}>
          <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: 1.5, fontWeight: 700 }}>HOURLY · PRECIP + TEMP</span>
          <span style={{ fontFamily: mono, fontSize: 11, color: dim }}>{hours.length}H · {precipUnit.toUpperCase()}</span>
        </div>
        <div style={{ position: 'relative' }}>
          <div ref={scrollRef} onScroll={handleScroll} style={{ display: 'flex', gap: 3, alignItems: 'flex-end', overflowX: 'auto', paddingBottom: 2 }}>
            {hours.map((h, i) => {
              const norm = intensityNorm(h.mm);
              const wet = h.mm > 0;
              const probNorm = h.prob / 100;
              const inWindow = firstWet >= 0 && i >= firstWet && i <= lastWet;
              const active = i === sel;
              return (
                <button key={i} onClick={() => setSel(i)} style={{
                  flex: 'none', width: 32, border: 'none', cursor: 'pointer', padding: '4px 0',
                  background: active ? 'rgba(255,255,255,0.12)' : inWindow ? `${sky.accent}1f` : 'transparent',
                  borderRadius: 8,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}>
                  <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: active ? sky.accent : white }}>{fmt(h.t)}</span>
                  <div style={{ width: '100%', height: 86, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{
                      width: 9, borderRadius: 3, transition: 'height .2s',
                      height: wet ? `${10 + norm * 90}%` : h.prob >= 20 ? `${4 + probNorm * 55}%` : 4,
                      background: wet ? sky.accent : h.prob >= 20 ? `${sky.accent}55` : 'rgba(255,255,255,0.18)',
                      boxShadow: active && (wet || h.prob >= 20) ? `0 0 0 2px rgba(255,255,255,0.5)` : 'none',
                    }} />
                  </div>
                  <span style={{ fontFamily: mono, fontSize: 8.5, color: h.prob >= 30 ? 'rgba(255,255,255,0.8)' : 'transparent' }}>
                    {h.prob >= 30 ? h.prob : '0'}
                  </span>
                  <span style={{ fontFamily: mono, fontSize: 8.5, color: dim }}>
                    {i === 0 ? 'NOW' : h.label.replace(' ', '').replace(':00', '')}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: dim }}>
                    <Navigation size={8} style={{ transform: `rotate(${windDegToRotation(h.windDeg)}deg)`, flexShrink: 0 }} aria-hidden />
                  </span>
                </button>
              );
            })}
          </div>
          {hours.length > 9 && (
            <div style={{
              position: 'absolute', top: 0, right: 0, bottom: 0, width: 28, pointerEvents: 'none',
              background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.22))',
              borderRadius: '0 8px 8px 0',
            }} />
          )}
        </div>
        <div style={{
          marginTop: 12, paddingTop: 10, borderTop: '0.5px solid rgba(255,255,255,0.14)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: mono, fontSize: 12,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ letterSpacing: 0.5 }}>
              {hours[sel] ? (
                `${hours[sel].dayLabel.toUpperCase()} · ${hours[sel].dateStr.toUpperCase()} · ${sel === 0 ? 'NOW' : hours[sel].label.toUpperCase()}`
              ) : 'NOW'}
            </span>
            {hours[sel] && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: dim, fontSize: 11 }}>
                <Navigation size={10} style={{ transform: `rotate(${windDegToRotation(hours[sel].windDeg)}deg)`, flexShrink: 0 }} aria-hidden />
                {convertWindSpeed(hours[sel].windMs, windSpeedUnit)} {getWindUnitLabel(windSpeedUnit).toUpperCase()}
              </span>
            )}
          </div>
          <span style={{ color: sky.accent, fontWeight: 700 }}>
            {(hours[sel]?.mm ?? 0) > 0
              ? `${(hours[sel]?.intensity ?? '').toUpperCase()} · ${fmtP(hours[sel]?.mm ?? 0)} ${precipUnit.toUpperCase()}`
              : `DRY · ${hours[sel]?.prob ?? 0}%`}
          </span>
        </div>
      </div>

      {s.daily[0] && (() => {
        const today = s.daily[0];
        return (
          <div style={{ ...panel, marginTop: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <WeatherIconDesign type={today.cond} size={40} color={white} accent={sky.accent} strokeWidth={1.6} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: 1.5, color: dim, fontWeight: 700 }}>TODAY · {today.day.toUpperCase()} {today.dateNum}</div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.3, textTransform: 'uppercase', marginTop: 1 }}>
                {today.prob >= 50 ? 'Rain' : today.prob >= 20 ? 'Showers?' : 'Dry'}
                <span style={{ fontFamily: mono, fontSize: 14, color: sky.accent, marginLeft: 8, letterSpacing: 0 }}>
                  {today.prob}%
                </span>
              </div>
            </div>
            <div style={{ fontFamily: mono, fontSize: 18, fontWeight: 700, textAlign: 'right' }}>
              {fmt(today.hiC)}°<span style={{ color: dim }}>/{fmt(today.loC)}°</span>
            </div>
          </div>
        );
      })()}

      {tomorrow && (
        <div style={{ ...panel, marginTop: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <WeatherIconDesign type={tomorrow.cond} size={40} color={white} accent={sky.accent} strokeWidth={1.6} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: 1.5, color: dim, fontWeight: 700 }}>TOMORROW · {tomorrow.day.toUpperCase()} {tomorrow.dateNum}</div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.3, textTransform: 'uppercase', marginTop: 1 }}>
              {tomorrow.prob >= 50 ? 'Rain' : tomorrow.prob >= 20 ? 'Showers?' : 'Dry'}
              <span style={{ fontFamily: mono, fontSize: 14, color: sky.accent, marginLeft: 8, letterSpacing: 0 }}>
                {tomorrow.prob}%
              </span>
            </div>
          </div>
          <div style={{ fontFamily: mono, fontSize: 18, fontWeight: 700, textAlign: 'right' }}>
            {fmt(tomorrow.hiC)}°<span style={{ color: dim }}>/{fmt(tomorrow.loC)}°</span>
          </div>
        </div>
      )}

      <div style={{ ...panel, marginTop: 16, padding: '6px 18px 10px' }}>
        {s.daily.slice(2).map((d, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0',
            borderTop: i ? '0.5px solid rgba(255,255,255,0.1)' : 'none',
          }}>
            <div style={{ width: 54, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {d.day.toUpperCase()}
              </span>
              <span style={{ fontFamily: mono, fontSize: 11, color: dim, fontWeight: 500 }}>
                {d.dateNum}
              </span>
            </div>
            <WeatherIconDesign type={d.cond} size={22} color={white} accent={sky.accent} strokeWidth={1.7} />
            <span style={{ width: 40, fontFamily: mono, fontSize: 12, color: d.prob >= 20 ? sky.accent : 'transparent', fontWeight: 700 }}>
              {d.prob}%
            </span>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 700 }}>{fmt(d.hiC)}°</span>
            <span style={{ fontFamily: mono, fontSize: 14, color: dim, width: 30, textAlign: 'right' }}>{fmt(d.loC)}°</span>
          </div>
        ))}
      </div>
    </div>
  );
}

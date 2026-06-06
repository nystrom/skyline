import { useState } from 'react';
import type React from 'react';
import type { WxScenario, WxSky, WxIconType } from './wxTypes';
import { WeatherIconDesign } from './WeatherIconDesign';
import { fmtTemp, intensityNorm, precipPhrase, humanizeDur } from './wxUtils';

interface Props {
  s: WxScenario;
  units: 'C' | 'F';
}

export function HomeBold({ s, units }: Props) {
  const sky: WxSky = s.sky;
  const fmt = (c: number) => fmtTemp(c, units);
  const phrase = precipPhrase(s);
  const hours = s.hourly;
  const [sel, setSel] = useState(0);
  const mono = 'ui-monospace, "SF Mono", Menlo, monospace';
  const white = '#fff';
  const dim = 'rgba(255,255,255,0.55)';

  const firstWet = hours.findIndex((h) => h.mm > 0);
  const lastWet = hours.reduce((a, h, i) => (h.mm > 0 ? i : a), -1);

  const panel: React.CSSProperties = {
    background: 'rgba(0,0,0,0.22)', backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)', borderRadius: 18,
  };

  const tomorrow = s.daily[1];

  const precipIcon: WxIconType = phrase.kind === 'none' ? s.cond : (s.precip.peakLabel === 'Heavy' || s.precip.peakLabel === 'Torrential' ? 'heavy' : 'rain');

  return (
    <div style={{
      position: 'relative', minHeight: '100%', color: white, background: sky.grad,
      padding: '16px 18px 40px', boxSizing: 'border-box',
      fontFamily: '-apple-system, system-ui, sans-serif',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 }}>
        <div style={{ fontFamily: mono, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600 }}>
          {s.place}
        </div>
        <div style={{ fontFamily: mono, fontSize: 12, letterSpacing: 1, color: dim }}>{s.nowLabel}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 6 }}>
        <div style={{ fontSize: 150, fontWeight: 800, letterSpacing: -8, lineHeight: 0.86, fontVariantNumeric: 'tabular-nums' }}>
          {fmt(s.tempC)}<span style={{ fontSize: 60, verticalAlign: 'top', fontWeight: 600 }}>°</span>
        </div>
        <div style={{ marginTop: 10 }}>
          <WeatherIconDesign type={s.cond} size={66} color={white} accent={sky.accent} strokeWidth={1.5} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'baseline', marginTop: -4 }}>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, textTransform: 'uppercase' }}>{s.condLabel}</div>
        <div style={{ fontFamily: mono, fontSize: 13, color: dim }}>
          H{fmt(s.hiC)}° L{fmt(s.loC)}° · FEELS {fmt(s.feelsC)}°
        </div>
      </div>

      {s.severe && (
        <div style={{
          marginTop: 18, borderRadius: 16, overflow: 'hidden',
          background: sky.accent, color: '#241405',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
            <span style={{ fontSize: 22, fontWeight: 900 }}>⚠</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 0.3, textTransform: 'uppercase' }}>{s.severe.title}</div>
              <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, opacity: 0.8 }}>{s.severe.detail.toUpperCase()}</div>
            </div>
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
            fontSize: 13, fontFamily: mono, letterSpacing: 2, fontWeight: 700,
            color: phrase.kind === 'none' ? dim : sky.accent, textTransform: 'uppercase',
          }}>
            {phrase.kind === 'none' ? 'NO RAIN' : phrase.kind === 'active' ? 'RAINING' : 'INCOMING'}
          </div>
          <WeatherIconDesign type={precipIcon} size={26} color={white} accent={sky.accent} strokeWidth={1.8} />
        </div>
        <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1, marginTop: 6, lineHeight: 1 }}>
          {phrase.kind === 'soon'
            ? <>RAIN IN <span style={{ color: sky.accent }}>{humanizeDur(s.precip.startsInMin ?? 0)}</span></>
            : phrase.kind === 'active'
              ? <>{(s.precip.peakLabel ?? '').toUpperCase()} <span style={{ color: sky.accent }}>NOW</span></>
              : 'CLEAR'}
        </div>
        <div style={{ fontFamily: mono, fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 6, letterSpacing: 0.3 }}>
          {phrase.kind === 'none'
            ? 'NEXT 12 HOURS DRY'
            : phrase.kind === 'active'
              ? `EASING ${(s.precip.endLabel ?? '').toUpperCase()} · ${(s.precip.peakMm ?? 0).toFixed(1)} MM/H`
              : `${(s.precip.startLabel ?? '').toUpperCase()} → ${(s.precip.endLabel ?? '').toUpperCase()} · ${(s.precip.peakLabel ?? '').toUpperCase()} · ${(s.precip.peakMm ?? 0).toFixed(1)} MM/H`}
        </div>
      </div>

      <div style={{ ...panel, marginTop: 16, padding: '16px 12px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 6px 12px', alignItems: 'baseline' }}>
          <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: 1.5, fontWeight: 700 }}>HOURLY · PRECIP + TEMP</span>
          <span style={{ fontFamily: mono, fontSize: 11, color: dim }}>MM/H</span>
        </div>
        <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end' }}>
          {hours.map((h, i) => {
            const norm = intensityNorm(h.mm);
            const wet = h.mm > 0;
            const inWindow = firstWet >= 0 && i >= firstWet && i <= lastWet;
            const active = i === sel;
            return (
              <button key={i} onClick={() => setSel(i)} style={{
                flex: 1, minWidth: 0, border: 'none', cursor: 'pointer', padding: '4px 0',
                background: active ? 'rgba(255,255,255,0.12)' : inWindow ? `${sky.accent}1f` : 'transparent',
                borderRadius: 8,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}>
                <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: active ? sky.accent : white }}>{fmt(h.t)}</span>
                <div style={{ width: '100%', height: 86, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <div style={{
                    width: 9, borderRadius: 3, transition: 'height .2s',
                    height: wet ? `${10 + norm * 90}%` : 4,
                    background: wet ? sky.accent : 'rgba(255,255,255,0.18)',
                    boxShadow: active && wet ? `0 0 0 2px rgba(255,255,255,0.5)` : 'none',
                  }} />
                </div>
                <span style={{ fontFamily: mono, fontSize: 8.5, color: h.prob >= 30 ? 'rgba(255,255,255,0.8)' : 'transparent' }}>
                  {h.prob >= 30 ? h.prob : '0'}
                </span>
                <span style={{ fontFamily: mono, fontSize: 8.5, color: dim }}>{i === 0 ? 'NOW' : h.label.replace(' ', '').replace(':00', '')}</span>
              </button>
            );
          })}
        </div>
        <div style={{
          marginTop: 12, paddingTop: 10, borderTop: '0.5px solid rgba(255,255,255,0.14)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: mono, fontSize: 12,
        }}>
          <span style={{ letterSpacing: 1 }}>{(sel === 0 ? 'NOW' : hours[sel].label).toUpperCase()}</span>
          <span style={{ color: sky.accent, fontWeight: 700 }}>
            {hours[sel].mm > 0 ? `${(hours[sel].intensity ?? '').toUpperCase()} · ${hours[sel].mm.toFixed(1)} MM/H` : `DRY · ${hours[sel].prob}%`}
          </span>
        </div>
      </div>

      {tomorrow && (
        <div style={{ ...panel, marginTop: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <WeatherIconDesign type={tomorrow.cond} size={40} color={white} accent={sky.accent} strokeWidth={1.6} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: 1.5, color: dim, fontWeight: 700 }}>TOMORROW</div>
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
        {s.daily.map((d, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0',
            borderTop: i ? '0.5px solid rgba(255,255,255,0.1)' : 'none',
          }}>
            <span style={{ width: 44, fontFamily: mono, fontSize: 13, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              {i === 0 ? 'TDY' : d.day.toUpperCase().slice(0, 3)}
            </span>
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

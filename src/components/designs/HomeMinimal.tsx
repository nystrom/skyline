import { useState } from 'react';
import type React from 'react';
import type { WxScenario, WxSky, WxIconType } from './wxTypes';
import { WeatherIconDesign } from './WeatherIconDesign';
import { fmtTemp, intensityNorm, precipPhrase } from './wxUtils';

interface Props {
  s: WxScenario;
  units: 'C' | 'F';
}

function PrecipMiniBand({ hours, accent }: { hours: WxScenario['hourly']; accent: string }) {
  const window12 = hours.slice(0, 9);
  const firstWet = window12.findIndex((h) => h.mm > 0);
  const lastWet = window12.reduce((acc, h, i) => (h.mm > 0 ? i : acc), -1);
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 40 }}>
        {window12.map((h, i) => {
          const norm = intensityNorm(h.mm);
          const wet = h.mm > 0;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <div style={{
                width: '100%', maxWidth: 16, borderRadius: 4,
                height: wet ? (14 + norm * 86) + '%' : 4,
                background: wet ? accent : 'rgba(255,255,255,0.16)',
              }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
        {window12.map((h, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9.5, color: 'rgba(255,255,255,0.5)' }}>
            {i === 0 || i === firstWet || i === lastWet || i === window12.length - 1 ? h.label.replace(' ', '') : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HomeMinimal({ s, units }: Props) {
  const sky: WxSky = s.sky;
  const fmt = (c: number) => fmtTemp(c, units);
  const [sel, setSel] = useState(0);
  const phrase = precipPhrase(s);
  const hours = s.hourly;

  const wkMin = Math.min(...s.daily.map((d) => d.loC));
  const wkMax = Math.max(...s.daily.map((d) => d.hiC));
  const span = Math.max(1, wkMax - wkMin);

  const white = '#fff';
  const dim = 'rgba(255,255,255,0.62)';
  const dim2 = 'rgba(255,255,255,0.42)';

  const card: React.CSSProperties = {
    background: sky.glass,
    backdropFilter: 'blur(18px) saturate(160%)',
    WebkitBackdropFilter: 'blur(18px) saturate(160%)',
    border: '0.5px solid rgba(255,255,255,0.18)',
    borderRadius: 24,
  };

  const precipIcon: WxIconType = phrase.kind === 'none' ? s.cond : (s.precip.peakLabel === 'Heavy' || s.precip.peakLabel === 'Torrential' ? 'heavy' : 'rain');

  return (
    <div style={{
      position: 'relative', minHeight: '100%', background: sky.grad,
      color: white, padding: '16px 20px 40px', boxSizing: 'border-box',
      fontFamily: '-apple-system, system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center', paddingTop: 8 }}>
        <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: 0.2 }}>{s.place}</div>
        <div style={{ fontSize: 13, color: dim, marginTop: 2 }}>{s.dateLabel} · {s.nowLabel}</div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18, marginBottom: 2 }}>
          <WeatherIconDesign type={s.cond} size={58} color={white} accent={sky.accent} strokeWidth={1.6} />
        </div>
        <div style={{ fontSize: 96, fontWeight: 200, lineHeight: 1, letterSpacing: -3, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>
          {fmt(s.tempC)}<span style={{ fontSize: 44, fontWeight: 200, verticalAlign: 'top' }}>°</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 500, marginTop: 4 }}>{s.condLabel}</div>
        <div style={{ fontSize: 15, color: dim, marginTop: 2 }}>
          H:{fmt(s.hiC)}°  L:{fmt(s.loC)}°  ·  Feels {fmt(s.feelsC)}°
        </div>
      </div>

      {s.severe && (
        <div style={{
          ...card, background: 'rgba(232,137,59,0.22)', border: '0.5px solid rgba(255,200,150,0.5)',
          marginTop: 22, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: sky.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#3a2410', fontWeight: 800, fontSize: 20,
          }}>!</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{s.severe.title}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)' }}>{s.severe.detail}</div>
          </div>
        </div>
      )}

      <div style={{ ...card, marginTop: 16, padding: '18px 18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: 'rgba(255,255,255,0.14)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <WeatherIconDesign type={precipIcon} size={26} color={white} accent={sky.accent} strokeWidth={1.7} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.2 }}>{phrase.big}</div>
            <div style={{ fontSize: 13.5, color: dim, marginTop: 1 }}>{phrase.sub}</div>
          </div>
        </div>
        {phrase.kind !== 'none' && <PrecipMiniBand hours={hours} accent={sky.accent} />}
      </div>

      <div style={{ ...card, marginTop: 16, padding: '14px 0 16px' }}>
        <div style={{ fontSize: 12, color: dim, fontWeight: 600, letterSpacing: 0.6, padding: '0 18px 10px', textTransform: 'uppercase' }}>
          Next 12 hours
        </div>
        <div style={{ display: 'flex', gap: 2, overflowX: 'auto', padding: '0 10px', WebkitOverflowScrolling: 'touch' }}>
          {hours.map((h, i) => {
            const active = i === sel;
            const norm = intensityNorm(h.mm);
            return (
              <button key={i} onClick={() => setSel(i)} style={{
                flex: '0 0 auto', width: 52, border: 'none', background: active ? 'rgba(255,255,255,0.16)' : 'transparent',
                borderRadius: 16, padding: '8px 0 10px', color: 'inherit', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
              }}>
                <span style={{ fontSize: 12.5, fontWeight: active ? 700 : 500, color: i === 0 ? white : dim }}>
                  {i === 0 ? 'Now' : h.label}
                </span>
                <WeatherIconDesign type={h.cond} size={24} color={white} accent={sky.accent} strokeWidth={1.7} />
                <span style={{ fontSize: 15, fontWeight: 600 }}>{fmt(h.t)}°</span>
                <div style={{ width: 5, height: 26, borderRadius: 3, background: 'rgba(255,255,255,0.14)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: (8 + norm * 92) + '%', background: sky.accent, opacity: h.mm > 0 ? 1 : 0,
                  }} />
                </div>
                <span style={{ fontSize: 10.5, color: dim2, height: 12 }}>{h.prob >= 20 ? h.prob + '%' : ''}</span>
              </button>
            );
          })}
        </div>
        <div style={{ padding: '12px 18px 0', borderTop: '0.5px solid rgba(255,255,255,0.12)', margin: '12px 8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 13, color: dim }}>
            {sel === 0 ? 'Now' : hours[sel].label} · {hours[sel].cond.replace('-night', '')}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {hours[sel].mm > 0 ? `${hours[sel].intensity} · ${hours[sel].mm.toFixed(1)} mm/h` : `${hours[sel].prob}% chance`}
          </span>
        </div>
      </div>

      <div style={{ ...card, marginTop: 16, padding: '6px 18px 10px' }}>
        <div style={{ fontSize: 12, color: dim, fontWeight: 600, letterSpacing: 0.6, padding: '12px 0 6px', textTransform: 'uppercase' }}>
          7-day forecast
        </div>
        {s.daily.map((d, i) => {
          const segL = ((d.loC - wkMin) / span) * 100;
          const segW = ((d.hiC - d.loC) / span) * 100;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
              borderTop: i ? '0.5px solid rgba(255,255,255,0.1)' : 'none',
            }}>
              <span style={{ width: 42, fontSize: 15, fontWeight: i === 1 ? 700 : 500, color: i === 0 ? white : 'rgba(255,255,255,0.9)' }}>
                {d.day}
              </span>
              <div style={{ width: 26, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                <WeatherIconDesign type={d.cond} size={22} color={white} accent={sky.accent} strokeWidth={1.7} />
              </div>
              <span style={{ width: 34, fontSize: 12, color: d.prob >= 20 ? sky.accent : 'transparent', fontWeight: 600 }}>
                {d.prob >= 20 ? d.prob + '%' : '0'}
              </span>
              <span style={{ width: 28, textAlign: 'right', fontSize: 15, color: dim }}>{fmt(d.loC)}°</span>
              <div style={{ flex: 1, height: 4, borderRadius: 3, background: 'rgba(255,255,255,0.16)', position: 'relative' }}>
                <div style={{
                  position: 'absolute', top: 0, bottom: 0, left: segL + '%', width: Math.max(8, segW) + '%',
                  borderRadius: 3, background: 'linear-gradient(90deg, rgba(255,255,255,0.5), #fff)',
                }} />
              </div>
              <span style={{ width: 28, fontSize: 15, fontWeight: 600 }}>{fmt(d.hiC)}°</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

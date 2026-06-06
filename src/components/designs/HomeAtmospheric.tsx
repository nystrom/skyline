import { useState, useRef } from 'react';
import type React from 'react';
import type { WxScenario, WxSky } from './wxTypes';
import { WeatherIconDesign } from './WeatherIconDesign';
import { fmtTemp, windFmt, precipPhrase } from './wxUtils';

interface Props {
  s: WxScenario;
  units: 'C' | 'F';
}

const GW = 330;
const GH = 150;

function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

interface StatProps {
  tile: React.CSSProperties;
  dim: string;
  label: string;
  value: string;
  sub: string;
}

function Stat({ tile, dim, label, value, sub }: StatProps) {
  return (
    <div style={{ ...tile, padding: '12px 14px' }}>
      <div style={{ fontSize: 11.5, color: dim, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: dim, marginTop: 1 }}>{sub}</div>
    </div>
  );
}

export function HomeAtmospheric({ s, units }: Props) {
  const sky: WxSky = s.sky;
  const fmt = (c: number) => fmtTemp(c, units);
  const phrase = precipPhrase(s);
  const hours = s.hourly;
  const [sel, setSel] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const white = '#fff';
  const dim = 'rgba(255,255,255,0.6)';
  const padX = 10;
  const xs = hours.map((_, i) => padX + (i / Math.max(1, hours.length - 1)) * (GW - padX * 2));

  const maxMm = Math.max(1, ...hours.map((h) => h.mm));
  const iy = (mm: number) => GH - 18 - (mm / maxMm) * (GH - 46);
  const ipts: [number, number][] = hours.map((h, i) => [xs[i], iy(h.mm)]);
  const lastX = xs[xs.length - 1];
  const areaPath = smoothPath(ipts) + ` L ${lastX} ${GH - 18} L ${xs[0]} ${GH - 18} Z`;
  const linePath = smoothPath(ipts);

  const tMin = Math.min(...hours.map((h) => h.t));
  const tMax = Math.max(...hours.map((h) => h.t));
  const tSpan = Math.max(1, tMax - tMin);
  const ty = (t: number) => 20 + (1 - (t - tMin) / tSpan) * 40;
  const tpath = smoothPath(hours.map((h, i): [number, number] => [xs[i], ty(h.t)]));

  const firstWet = hours.findIndex((h) => h.mm > 0);

  const onScrub = (clientX: number) => {
    if (!wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    const frac = (clientX - r.left) / r.width;
    const idx = Math.round(frac * (hours.length - 1));
    setSel(Math.max(0, Math.min(hours.length - 1, idx)));
  };

  const tile: React.CSSProperties = {
    background: sky.glass, backdropFilter: 'blur(20px) saturate(160%)',
    WebkitBackdropFilter: 'blur(20px) saturate(160%)',
    border: '0.5px solid rgba(255,255,255,0.16)', borderRadius: 22, padding: 16,
  };

  const tomorrow = s.daily[1];
  const gradId = `wave-${s.key}`;

  return (
    <div style={{
      position: 'relative', minHeight: '100%', color: white,
      background: sky.grad, padding: '16px 20px 40px', boxSizing: 'border-box',
      fontFamily: '-apple-system, system-ui, sans-serif', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: '50%',
        background: `radial-gradient(circle, ${sky.accent}33, transparent 70%)`, pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 6 }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 600 }}>{s.place}</div>
          <div style={{ fontSize: 13, color: dim, marginTop: 2 }}>{s.nowLabel}</div>
          <div style={{ fontSize: 78, fontWeight: 200, letterSpacing: -3, lineHeight: 1, marginTop: 10 }}>
            {fmt(s.tempC)}°
          </div>
          <div style={{ fontSize: 16, fontWeight: 500, marginTop: 2 }}>{s.condLabel}</div>
          <div style={{ fontSize: 14, color: dim }}>Feels {fmt(s.feelsC)}° · H:{fmt(s.hiC)}° L:{fmt(s.loC)}°</div>
        </div>
        <div style={{ marginTop: 18 }}>
          <WeatherIconDesign type={s.cond} size={88} color={white} accent={sky.accent} strokeWidth={1.4} />
        </div>
      </div>

      {s.severe && (
        <div style={{
          marginTop: 20, borderRadius: 20, padding: '14px 16px',
          background: 'linear-gradient(120deg, rgba(232,137,59,0.34), rgba(232,137,59,0.18))',
          border: '0.5px solid rgba(255,200,150,0.55)', display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, background: sky.accent, color: '#3a2410',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 19, flexShrink: 0,
          }}>!</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{s.severe.title}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', marginTop: 2 }}>{s.severe.sub}</div>
          </div>
        </div>
      )}

      <div style={{ ...tile, marginTop: 18, padding: '16px 16px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.3 }}>{phrase.big}</span>
          <span style={{ fontSize: 12, color: dim }}>{phrase.kind === 'none' ? 'next 12h' : (s.precip.peakLabel ?? '') + ' peak'}</span>
        </div>

        <div
          ref={wrapRef}
          style={{ position: 'relative', width: '100%', touchAction: 'none' }}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); onScrub(e.clientX); }}
          onPointerMove={(e) => { if (e.buttons) onScrub(e.clientX); }}
        >
          <svg viewBox={`0 0 ${GW} ${GH}`} width="100%" height={GH} style={{ display: 'block', overflow: 'visible' }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={sky.accent} stopOpacity={0.55} />
                <stop offset="100%" stopColor={sky.accent} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <line x1={padX} y1={GH - 18} x2={GW - padX} y2={GH - 18} stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
            {firstWet > 0 && (
              <line x1={xs[firstWet]} y1="8" x2={xs[firstWet]} y2={GH - 18} stroke={sky.accent} strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
            )}
            <path d={areaPath} fill={`url(#${gradId})`} />
            <path d={linePath} fill="none" stroke={sky.accent} strokeWidth="2.5" strokeLinecap="round" />
            <path d={tpath} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.6" strokeDasharray="1 4" strokeLinecap="round" />
            {sel !== null && (
              <g>
                <line x1={xs[sel]} y1="6" x2={xs[sel]} y2={GH - 18} stroke="#fff" strokeWidth="1" opacity="0.7" />
                <circle cx={xs[sel]} cy={iy(hours[sel].mm)} r="4.5" fill="#fff" />
                <circle cx={xs[sel]} cy={ty(hours[sel].t)} r="3" fill="#fff" opacity="0.85" />
              </g>
            )}
          </svg>

          {sel !== null && (
            <div style={{
              position: 'absolute', top: -4, left: `${(xs[sel] / GW) * 100}%`, transform: 'translateX(-50%)',
              background: 'rgba(20,24,30,0.72)', backdropFilter: 'blur(6px)', borderRadius: 9,
              padding: '5px 9px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', pointerEvents: 'none',
              border: '0.5px solid rgba(255,255,255,0.16)',
            }}>
              {hours[sel].label} · {fmt(hours[sel].t)}°
              {hours[sel].mm > 0 ? ` · ${hours[sel].mm.toFixed(1)}mm` : ` · ${hours[sel].prob}%`}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, padding: `0 ${padX}px` }}>
          {hours.map((h, i) => (
            <span key={i} style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.45)' }}>
              {i % 3 === 0 ? (i === 0 ? 'Now' : h.label.replace(' ', '')) : ''}
            </span>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: dim, marginTop: 8, display: 'flex', gap: 16 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 3, borderRadius: 2, background: sky.accent, display: 'inline-block' }} />Precip
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 14, height: 0, borderTop: '1.6px dotted rgba(255,255,255,0.85)', display: 'inline-block' }} />Temp
          </span>
        </div>
      </div>

      {tomorrow && (
        <div style={{ ...tile, marginTop: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <WeatherIconDesign type={tomorrow.cond} size={48} color={white} accent={sky.accent} strokeWidth={1.5} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: dim, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>Tomorrow</div>
            <div style={{ fontSize: 17, fontWeight: 600, marginTop: 1 }}>
              {tomorrow.note || (tomorrow.prob >= 50 ? 'Rain likely' : tomorrow.prob >= 20 ? 'Chance of rain' : 'Dry')}
              {tomorrow.prob >= 20 && <span style={{ color: sky.accent }}>{' · ' + tomorrow.prob + '%'}</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 19, fontWeight: 600 }}>{fmt(tomorrow.hiC)}°</div>
            <div style={{ fontSize: 14, color: dim }}>{fmt(tomorrow.loC)}°</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
        <Stat tile={tile} dim={dim} label="Wind" value={windFmt(s.windKmh, units)} sub={s.windDir} />
        <Stat tile={tile} dim={dim} label="Humidity" value={s.humidity + '%'} sub={s.humidity >= 70 ? 'Damp' : 'Comfortable'} />
        <Stat tile={tile} dim={dim} label="Sunrise" value={s.sunrise} sub={'Sunset ' + s.sunset} />
        <Stat tile={tile} dim={dim} label="Feels like" value={fmt(s.feelsC) + '°'} sub={s.feelsC < s.tempC ? 'Cooler' : 'Warmer'} />
      </div>
    </div>
  );
}

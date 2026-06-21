import { useId, useState } from 'react';
import type React from 'react';
import type { WxScenario } from './wxTypes';
import { fmtTemp } from './wxUtils';
import { WeatherIconDesign } from './WeatherIconDesign';

interface Props {
  s: WxScenario;
  units: 'C' | 'F';
}

const COND_EMOJI: Record<string, string> = {
  clear: '☀️',
  'clear-night': '🌙',
  partly: '⛅',
  'partly-night': '🌤️',
  cloudy: '☁️',
  fog: '🌫️',
  rain: '🌧️',
  heavy: '🌧️',
  storm: '⛈️',
  snow: '🌨️',
};

const MONO = '"SF Mono", "Menlo", ui-monospace, monospace';
const FG = 'rgba(224,238,255,0.96)';
const MUTED = 'rgba(200,225,255,0.68)';
const RAIN_COLOR = '#68c8ff';

const glass: React.CSSProperties = {
  background: 'rgba(0,0,0,0.20)',
  backdropFilter: 'blur(28px) saturate(1.4)',
  WebkitBackdropFilter: 'blur(28px) saturate(1.4)',
  border: '1px solid rgba(255,255,255,0.13)',
};

function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

function parseSunMinutes(str: string): number {
  const m = str.match(/(\d+):(\d+)\s*(am|pm)/i);
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const isPM = m[3].toLowerCase() === 'pm';
  if (isPM && h !== 12) h += 12;
  if (!isPM && h === 12) h = 0;
  return h * 60 + min;
}

function WindArrow({ deg }: { deg: number }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 16 16"
      style={{ display: 'inline-block', transform: `rotate(${deg}deg)`, verticalAlign: 'middle', flexShrink: 0 }}
    >
      <path d="M8 2 L11.2 12 L8 10 L4.8 12 Z" fill="rgba(210,235,255,0.88)" />
    </svg>
  );
}

const metaLabel: React.CSSProperties = {
  fontSize: 9,
  fontFamily: MONO,
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  color: 'rgba(255,255,255,0.38)',
};

const metaVal: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: 'rgba(205,228,255,0.85)',
  marginTop: 3,
  fontVariantNumeric: 'tabular-nums',
};

const sectionLabel: React.CSSProperties = {
  fontSize: 9.5,
  fontFamily: MONO,
  textTransform: 'uppercase',
  letterSpacing: '1.2px',
  color: 'rgba(255,255,255,0.40)',
};

export function HomeMinimal({ s, units }: Props) {
  const [warningExpanded, setWarningExpanded] = useState(false);
  const gradId = useId().replace(/:/g, 'g');
  const fmt = (c: number) => fmtTemp(c, units);
  const hours = s.hourly;

  // Precip dot classification
  const precipDot: 'none' | 'rain' | 'severe' =
    s.severe ? 'severe' : s.precip.kind !== 'none' ? 'rain' : 'none';

  // Current-hour precip
  const curProb = hours[0]?.prob ?? 0;
  const curMm = hours[0]?.mm ?? 0;

  // Sun strip progress
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const riseMin = parseSunMinutes(s.sunrise);
  const setMin = parseSunMinutes(s.sunset);
  const sunPct = setMin > riseMin
    ? Math.max(0, Math.min(1, (nowMin - riseMin) / (setMin - riseMin)))
    : 0;

  // Hourly SVG temp curve
  const PITCH = 50;
  const COL_W = 48;
  const SVG_H = 40;
  const totalW = hours.length * PITCH;
  const temps = hours.map((h) => h.t);
  const tMin = Math.min(...temps) - 1;
  const tMax = Math.max(...temps) + 1;
  const mapY = (t: number) => 4 + ((tMax - t) / (tMax - tMin)) * (SVG_H - 8);
  const pts: [number, number][] = hours.map((h, i) => [(i * PITCH) + COL_W / 2, mapY(h.t)]);
  const lp = smoothPath(pts);
  const fp = pts.length > 1
    ? lp + ` L ${pts[pts.length - 1][0]} ${SVG_H} L ${pts[0][0]} ${SVG_H} Z`
    : '';

  // Daily bar range
  const allHi = s.daily.map((d) => d.hiC);
  const allLo = s.daily.map((d) => d.loC);
  const gLo = Math.min(...allLo) - 2;
  const gHi = Math.max(...allHi) + 2;
  const barSpan = Math.max(1, gHi - gLo);

  // Precip forecast mini-bars (24h)
  const h24 = hours.slice(0, 24);
  const maxMm = Math.max(1, ...h24.map((h) => h.mm));

  return (
    <div style={{
      position: 'relative', minHeight: '100%', background: s.sky.grad,
      color: FG,
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
      paddingTop: 44,
      paddingBottom: 48,
    }}>
      {/* Hero */}
      <div style={{ padding: '10px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1, letterSpacing: -4, fontVariantNumeric: 'tabular-nums' }}>
                {fmt(s.tempC)}
              </div>
              <div style={{ fontSize: 28, fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginTop: 10 }}>
                °{units}
              </div>
            </div>
            <div style={{ fontSize: 17, fontWeight: 400, color: MUTED, marginTop: 4, letterSpacing: -0.2 }}>
              {s.condLabel}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
              <span style={{ fontSize: 13, fontFamily: MONO }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#ff9d3b', marginRight: 4 }}>High</span>
                <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{fmt(s.hiC)}°</span>
              </span>
              <span style={{ fontSize: 13, fontFamily: MONO, color: 'rgba(255,255,255,0.3)' }}>·</span>
              <span style={{ fontSize: 13, fontFamily: MONO }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#38bdf8', marginRight: 4 }}>Low</span>
                <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{fmt(s.loC)}°</span>
              </span>
            </div>
          </div>
          <div style={{ flexShrink: 0, paddingRight: 8 }}>
            <WeatherIconDesign type={s.cond} size={72} theme="light" />
          </div>
        </div>
      </div>

      {/* Severe alert */}
      {s.severe && (
        <div
          onClick={() => setWarningExpanded(!warningExpanded)}
          style={{
            ...glass,
            margin: '10px 16px 0', borderRadius: 16, padding: '12px 14px',
            background: 'rgba(75,52,5,0.50)', borderColor: 'rgba(244,196,48,0.24)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⚠</span>
              <span>{s.severe.title}</span>
            </div>
            <span style={{ fontSize: 10, opacity: 0.6, textTransform: 'uppercase', fontFamily: MONO }}>
              {warningExpanded ? 'Collapse ▲' : 'Expand ▼'}
            </span>
          </div>
          {s.severe.sub && (
            <div style={{ fontSize: 11, color: MUTED, marginTop: 2, fontFamily: MONO }}>
              {s.severe.sub}
            </div>
          )}
          {s.severe.detail && (
            <div style={{
              fontSize: 12,
              color: MUTED,
              marginTop: 6,
              lineHeight: 1.4,
              whiteSpace: warningExpanded ? 'pre-wrap' : 'normal',
              display: warningExpanded ? 'block' : '-webkit-box',
              WebkitLineClamp: warningExpanded ? 'none' : 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {s.severe.detail}
            </div>
          )}
        </div>
      )}

      {/* Row 1: Chance | Rate | Wind */}
      <div style={{ display: 'flex', margin: '16px 16px 0', borderRadius: 14, overflow: 'hidden', ...glass }}>
        <div style={{ flex: 1, padding: '10px 12px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={metaLabel}>Chance</div>
          <div style={{ ...metaVal, color: curMm > 0 ? '#78ccff' : 'rgba(205,228,255,0.85)' }}>{curProb}%</div>
        </div>
        <div style={{ flex: 1, padding: '10px 12px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={metaLabel}>Rate</div>
          <div style={{ ...metaVal, color: curMm > 0 ? '#78ccff' : 'rgba(205,228,255,0.85)' }}>
            {curMm > 0 ? `${curMm.toFixed(1)} mm/h` : 'Dry'}
          </div>
        </div>
        <div style={{ flex: 1, padding: '10px 12px' }}>
          <div style={metaLabel}>Wind</div>
          <div style={{ ...metaVal, display: 'flex', alignItems: 'center', gap: 4 }}>
            <WindArrow deg={s.windDeg} />
            {Math.round(s.windKmh)} km/h
          </div>
        </div>
      </div>

      {/* Row 2: Humidity | Sunrise | Sunset */}
      <div style={{ display: 'flex', margin: '8px 16px 0', borderRadius: 14, overflow: 'hidden', ...glass }}>
        <div style={{ flex: 1, padding: '10px 12px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={metaLabel}>Humidity</div>
          <div style={metaVal}>{s.humidity}%</div>
        </div>
        <div style={{ flex: 1, padding: '10px 12px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={metaLabel}>Sunrise</div>
          <div style={metaVal}>{s.sunrise}</div>
        </div>
        <div style={{ flex: 1, padding: '10px 12px' }}>
          <div style={metaLabel}>Sunset</div>
          <div style={metaVal}>{s.sunset}</div>
        </div>
      </div>

      {/* Precip forecast card */}
      <div style={{
        ...glass,
        margin: '10px 16px 0', borderRadius: 16, overflow: 'hidden',
        ...(precipDot === 'rain' ? { background: 'rgba(20,65,120,0.38)', borderColor: 'rgba(80,175,255,0.18)' } : {}),
        ...(precipDot === 'severe' ? { background: 'rgba(75,52,5,0.50)', borderColor: 'rgba(244,196,48,0.24)' } : {}),
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 8px' }}>
          <div style={{
            width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
            background: precipDot === 'none' ? 'rgba(160,200,240,0.38)'
              : precipDot === 'rain' ? '#68c8ff' : '#f4c430',
            ...(precipDot === 'severe' ? { boxShadow: '0 0 6px rgba(244,196,48,0.5)' } : {}),
          }} />
          <div style={{ fontSize: 14.5, fontWeight: 500, flex: 1 }}>{s.precip.headline}</div>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(200,225,255,0.60)', padding: '0 14px 12px 33px', lineHeight: 1.45 }}>
          {s.precip.line}
        </div>
        {precipDot !== 'none' && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28, padding: '0 14px 10px' }}>
            {h24.map((h, i) => {
              const pct = h.mm > 0 ? Math.max(8, Math.round(h.mm / maxMm * 100)) : 4;
              return (
                <div key={i} style={{
                  flex: 1, borderRadius: '2px 2px 0 0', minHeight: 2, height: `${pct}%`,
                  background: h.mm > 2 ? 'rgba(93,185,255,0.88)'
                    : h.mm > 0 ? 'rgba(93,185,255,0.60)' : 'rgba(80,150,240,0.12)',
                }} />
              );
            })}
          </div>
        )}
      </div>

      {/* Hourly · 48h */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 24px 8px' }}>
        <div style={sectionLabel}>Hourly · 48h</div>
      </div>
      <div style={{ margin: '0 16px', borderRadius: 14, overflow: 'hidden', ...glass }}>
        <div style={{ overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none' } as React.CSSProperties}>
          <div style={{ display: 'flex', gap: 2, padding: '0 12px 8px', position: 'relative', width: totalW + 24 }}>
            <svg
              width={totalW}
              height={SVG_H}
              style={{ position: 'absolute', top: 22, left: 12, pointerEvents: 'none', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5bbeff" stopOpacity={0.20} />
                  <stop offset="100%" stopColor="#5bbeff" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <path d={fp} fill={`url(#${gradId})`} />
              <path d={lp} fill="none" stroke="#4da8e8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.65} />
            </svg>
            {hours.map((h, i) => {
              const isSep = i > 0 && h.dayLabel !== hours[i - 1].dayLabel;
              const timeStr = i === 0 ? 'Now' : h.label;
              const boldT = i === 0 || h.label === '12am';
              return (
                <div key={i} style={{
                  width: COL_W, flexShrink: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '6px 0 4px', borderRadius: 10,
                  ...(isSep ? { borderLeft: '1px solid rgba(255,255,255,0.10)', marginLeft: 4 } : {}),
                }}>
                  <div style={{
                    fontSize: 10, fontFamily: MONO, fontVariantNumeric: 'tabular-nums',
                    color: boldT ? 'rgba(255,255,255,0.68)' : 'rgba(255,255,255,0.40)',
                    fontWeight: boldT ? 600 : 400,
                  }}>
                    {timeStr}
                  </div>
                  <div style={{ height: 36 }} />
                  <div style={{ fontSize: 18, lineHeight: 1, margin: '2px 0 3px' }}>{COND_EMOJI[h.cond] ?? '🌡️'}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: FG, fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(h.t)}°
                  </div>
                  <div style={{ fontSize: 9, color: RAIN_COLOR, fontFamily: MONO, marginTop: 2, minHeight: 11 }}>
                    {h.prob >= 15 ? h.prob + '%' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 7-Day Forecast */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 24px 8px' }}>
        <div style={sectionLabel}>7-Day Forecast</div>
      </div>
      <div style={{ margin: '0 16px 8px', borderRadius: 14, overflow: 'hidden', ...glass }}>
        {s.daily.map((d, i) => {
          const barLeft = ((d.loC - gLo) / barSpan * 100).toFixed(1);
          const barWidth = Math.max(8, (d.hiC - d.loC) / barSpan * 100).toFixed(1);
          const showP = d.prob >= 12;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '11px 14px',
              borderBottom: i < s.daily.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}>
              <div style={{ fontSize: 14, fontWeight: i === 0 ? 600 : 400, color: FG, width: 72, flexShrink: 0 }}>
                {i === 0 ? 'Today' : d.day}
              </div>
              <div style={{ fontSize: 17, width: 24, textAlign: 'center', flexShrink: 0 }}>
                {COND_EMOJI[d.cond] ?? '🌡️'}
              </div>
              <div style={{ fontSize: 10.5, fontFamily: MONO, width: 30, textAlign: 'right', flexShrink: 0, color: showP ? RAIN_COLOR : 'rgba(255,255,255,0.28)' }}>
                {showP ? d.prob + '%' : ''}
              </div>
              <div style={{ flex: 1 }} />
              <div style={{ fontSize: 12.5, fontFamily: MONO, color: 'rgba(255,255,255,0.38)', width: 24, textAlign: 'right' }}>
                {fmt(d.loC)}°
              </div>
              <div style={{ width: 52, height: 4, background: 'rgba(255,255,255,0.10)', borderRadius: 2, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                <div style={{
                  position: 'absolute', top: 0, height: '100%', borderRadius: 2,
                  left: barLeft + '%', width: barWidth + '%',
                  background: 'linear-gradient(90deg, #4490c0, #5ec4ff)',
                }} />
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 500, fontFamily: MONO, color: FG, width: 24 }}>
                {fmt(d.hiC)}°
              </div>
            </div>
          );
        })}
      </div>

      {/* Sun strip */}
      {(s.sunrise || s.sunset) && (
        <div style={{ ...glass, margin: '10px 16px 0', borderRadius: 14, padding: '10px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 9, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.36)', width: 52, flexShrink: 0 }}>
              Sunrise
            </div>
            <div style={{ fontSize: 12, fontFamily: MONO, color: 'rgba(200,225,255,0.65)', width: 52, flexShrink: 0 }}>
              {s.sunrise}
            </div>
            <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.12)', borderRadius: 2, position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 2,
                background: 'linear-gradient(90deg, #f4a62a, #ffd166)',
                width: `${(sunPct * 100).toFixed(1)}%`,
              }} />
              <div style={{
                position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)',
                width: 9, height: 9, background: '#ffd166', borderRadius: '50%',
                boxShadow: '0 0 7px rgba(255,209,102,0.75)',
                left: `${(sunPct * 100).toFixed(1)}%`,
              }} />
            </div>
            <div style={{ fontSize: 12, fontFamily: MONO, color: 'rgba(200,225,255,0.65)', width: 52, flexShrink: 0, textAlign: 'right' }}>
              {s.sunset}
            </div>
            <div style={{ fontSize: 9, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.36)', textAlign: 'right', width: 44, flexShrink: 0 }}>
              Sunset
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import type React from 'react';
import type { WxScenario, WxIconType, WxHour } from './wxTypes';
import { fmtTemp, windFmt } from './wxUtils';

const HOURLY_VISIBLE = 48;

const FG = 'rgba(224,238,255,0.96)';
const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';
const MONO = '"SF Mono", "Menlo", ui-monospace, monospace';

const GLASS_FROSTED: React.CSSProperties = {
  background: 'rgba(0,0,0,0.20)',
  backdropFilter: 'blur(28px) saturate(1.4)',
  WebkitBackdropFilter: 'blur(28px) saturate(1.4)',
  border: '1px solid rgba(255,255,255,0.13)',
};

const GLASS_LIQUID: React.CSSProperties = {
  background: 'rgba(255,255,255,0.10)',
  backdropFilter: 'blur(36px) saturate(1.9)',
  WebkitBackdropFilter: 'blur(36px) saturate(1.9)',
  border: '1px solid rgba(255,255,255,0.28)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.40), inset 0 -8px 18px rgba(0,0,0,0.10), 0 10px 30px rgba(0,0,0,0.22)',
};

const GLASS_FLAT: React.CSSProperties = {
  background: 'rgba(9,20,38,0.66)',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  border: '1px solid rgba(255,255,255,0.07)',
};

const MATERIALS = { frosted: GLASS_FROSTED, liquid: GLASS_LIQUID, flat: GLASS_FLAT } as const;

const EMOJI: Record<WxIconType | string, string> = {
  clear: '☀️', 'clear-night': '🌙', partly: '⛅', 'partly-night': '🌤️',
  cloudy: '☁️', fog: '🌫️', drizzle: '🌦️', rain: '🌧️', heavy: '🌧️', storm: '⛈️', snow: '🌨️',
};

const DIR_DEG: Record<string, number> = {
  N: 180, NNE: 202, NE: 225, ENE: 247, E: 270, ESE: 292, SE: 315, SSE: 337,
  S: 0, SSW: 22, SW: 45, WSW: 67, W: 90, WNW: 112, NW: 135, NNW: 157,
};

function weatherIcon(cond: WxIconType | string, size: number): React.ReactElement {
  const sw = Math.max(1.5, size / 20);
  let inner = '';
  switch (cond) {
    case 'clear':
      inner = `<circle cx="32" cy="32" r="13" fill="rgba(255,215,80,0.22)" stroke="#ffd750" stroke-width="${sw}"/><g stroke="#ffd750" stroke-width="${sw}" stroke-linecap="round"><line x1="32" y1="8" x2="32" y2="14"/><line x1="32" y1="50" x2="32" y2="56"/><line x1="8" y1="32" x2="14" y2="32"/><line x1="50" y1="32" x2="56" y2="32"/><line x1="15.5" y1="15.5" x2="19.8" y2="19.8"/><line x1="44.2" y1="44.2" x2="48.5" y2="48.5"/><line x1="48.5" y1="15.5" x2="44.2" y2="19.8"/><line x1="19.8" y1="44.2" x2="15.5" y2="48.5"/></g>`;
      break;
    case 'clear-night':
      inner = `<path d="M38 12 C26 14 18 23 18 34 C18 46 28 55 40 54 C48 53 54 48 56 41 C50 44 42 43 37 38 C30 32 29 22 34 15 C35.5 13 36.8 12.3 38 12 Z" fill="rgba(160,185,255,0.15)" stroke="rgba(160,185,255,0.85)" stroke-width="${sw}" stroke-linejoin="round"/><circle cx="48" cy="16" r="1.8" fill="rgba(200,215,255,0.8)"/><circle cx="54" cy="22" r="1.2" fill="rgba(200,215,255,0.6)"/><circle cx="44" cy="8" r="1.4" fill="rgba(200,215,255,0.7)"/>`;
      break;
    case 'partly':
    case 'partly-night':
      inner = `<circle cx="25" cy="23" r="10" fill="rgba(255,215,80,0.18)" stroke="#ffd750" stroke-width="${sw}"/><g stroke="#ffd750" stroke-width="${sw * 0.85}" stroke-linecap="round"><line x1="25" y1="7" x2="25" y2="12"/><line x1="10" y1="23" x2="15" y2="23"/><line x1="13.5" y1="11.5" x2="16.7" y2="14.7"/><line x1="36.5" y1="11.5" x2="33.3" y2="14.7"/></g><path d="M52 50 H22 C16.5 50 12 45.5 12 40 C12 34.5 16.5 30 22 30 C22.5 30 23 30.05 23.5 30.1 C24.5 25.5 28.6 22 33.5 22 C39.3 22 44 26.7 44 32.5 C44 32.9 44 33.3 43.95 33.7 C47.4 34.2 50 37.1 50 40.6 C50 46 52 50 52 50 Z" fill="rgba(220,235,255,0.16)" stroke="rgba(220,235,255,0.72)" stroke-width="${sw}"/>`;
      break;
    case 'cloudy':
      inner = `<path d="M54 44 H18 C11.4 44 6 38.6 6 32 C6 25.4 11.4 20 18 20 C18.6 20 19.2 20.06 19.8 20.15 C21.5 14.4 26.8 10 33 10 C40.7 10 47 16.3 47 24 C47 24.6 46.97 25.2 46.9 25.8 C51.4 26.7 55 30.7 55 35.5 C55 40.2 54 44 54 44 Z" fill="rgba(200,220,255,0.14)" stroke="rgba(200,220,255,0.68)" stroke-width="${sw}" stroke-linejoin="round"/>`;
      break;
    case 'drizzle':
    case 'rain':
      inner = `<path d="M50 36 H18 C12.5 36 8 31.5 8 26 C8 20.5 12.5 16 18 16 C18.5 16 19 16.04 19.5 16.12 C21 10.9 25.8 7 31.5 7 C38.4 7 44 12.6 44 19.5 C44 20 43.97 20.5 43.9 21 C47.9 21.8 51 25.4 51 29.7 C51 33.2 50 36 50 36 Z" fill="rgba(180,215,255,0.14)" stroke="rgba(180,215,255,0.70)" stroke-width="${sw}" stroke-linejoin="round"/><g stroke="#78ccff" stroke-width="${sw}" stroke-linecap="round"><line x1="22" y1="43" x2="20" y2="51"/><line x1="32" y1="43" x2="30" y2="51"/><line x1="42" y1="43" x2="40" y2="51"/><line x1="27" y1="47" x2="25" y2="55"/><line x1="37" y1="47" x2="35" y2="55"/></g>`;
      break;
    case 'heavy':
      inner = `<path d="M50 33 H18 C12.5 33 8 28.5 8 23 C8 17.5 12.5 13 18 13 C18.5 13 19 13.04 19.5 13.12 C21 7.9 25.8 4 31.5 4 C38.4 4 44 9.6 44 16.5 C44 17 43.97 17.5 43.9 18 C47.9 18.8 51 22.4 51 26.7 C51 30 50 33 50 33 Z" fill="rgba(120,180,240,0.16)" stroke="rgba(120,180,240,0.72)" stroke-width="${sw}" stroke-linejoin="round"/><g stroke="#78ccff" stroke-width="${sw * 1.2}" stroke-linecap="round"><line x1="20" y1="40" x2="17" y2="52"/><line x1="30" y1="40" x2="27" y2="52"/><line x1="40" y1="40" x2="37" y2="52"/><line x1="25" y1="46" x2="22" y2="58"/><line x1="35" y1="46" x2="32" y2="58"/><line x1="45" y1="40" x2="42" y2="52"/></g>`;
      break;
    case 'storm':
      inner = `<path d="M52 33 H18 C12.5 33 8 28.5 8 23 C8 17.5 12.5 13 18 13 C18.5 13 19 13.04 19.5 13.12 C21 7.9 25.8 4 31.5 4 C38.4 4 44 9.6 44 16.5 C44 17 43.97 17.5 43.9 18 C47.9 18.8 52 22.4 52 26.7 C52 30 52 33 52 33 Z" fill="rgba(80,95,130,0.24)" stroke="rgba(180,200,240,0.52)" stroke-width="${sw}" stroke-linejoin="round"/><polyline points="34,36 28,46 33,46 26,58 38,44 32,44 38,36" fill="rgba(255,210,50,0.18)" stroke="#ffd832" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
      break;
    case 'snow':
      inner = `<path d="M50 33 H18 C12.5 33 8 28.5 8 23 C8 17.5 12.5 13 18 13 C18.5 13 19 13.04 19.5 13.12 C21 7.9 25.8 4 31.5 4 C38.4 4 44 9.6 44 16.5 C44 17 43.97 17.5 43.9 18 C47.9 18.8 51 22.4 51 26.7 C51 30 50 33 50 33 Z" fill="rgba(200,230,255,0.14)" stroke="rgba(200,230,255,0.68)" stroke-width="${sw}" stroke-linejoin="round"/>`;
      break;
    default:
      inner = `<circle cx="32" cy="32" r="12" fill="rgba(200,225,255,0.14)" stroke="rgba(200,225,255,0.58)" stroke-width="${size / 20}"/>`;
  }
  return (
    <svg
      width={size} height={size} viewBox="0 0 64 64" fill="none"
      style={{ display: 'block', overflow: 'visible' }}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}

function WindArrow({ deg }: { deg: number }): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16"
      style={{ display: 'inline-block', transform: `rotate(${deg}deg)`, verticalAlign: 'middle', flexShrink: 0, marginTop: -1 }}>
      <path d="M8 2 L11.2 12 L8 10 L4.8 12 Z" fill="rgba(210,235,255,0.88)" />
    </svg>
  );
}

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

function parseToMinutes(timeStr: string): number {
  const m = /(\d+):(\d+)\s*(AM|PM)?/i.exec(timeStr ?? '');
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = (m[3] ?? '').toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

interface Narrative { headline: string; sub: string }
interface RainSegment { startIdx: number; endIdx: number; peakMm: number; dayLabel: string; startLabel: string; clearLabel: string }

function buildNarrative(hours: WxHour[]): Narrative {
  if (hours.length === 0) return { headline: 'No forecast available', sub: '' };

  const isRainy = (h: WxHour) => h.mm >= 0.2 || h.prob >= 35;

  function precipWord(mm: number): string {
    if (mm >= 6) return 'heavy rain';
    if (mm >= 2) return 'moderate rain';
    if (mm >= 0.2) return 'light rain';
    return 'showers';
  }

  function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

  function tomorrowPhrase(label: string): string {
    const m = /(\d+)\s*(AM|PM)/i.exec(label);
    if (!m) return 'tomorrow';
    const h = parseInt(m[1]);
    const isPM = m[2].toUpperCase() === 'PM';
    const h24 = isPM && h !== 12 ? h + 12 : (!isPM && h === 12 ? 0 : h);
    if (h24 >= 5 && h24 < 12) return 'tomorrow morning';
    if (h24 >= 12 && h24 < 17) return 'tomorrow afternoon';
    if (h24 >= 17 && h24 < 21) return 'tomorrow evening';
    return 'tomorrow night';
  }

  // find contiguous rain segments
  const segments: RainSegment[] = [];
  let inRain = false;
  let segStart = 0;
  for (let i = 0; i <= hours.length; i++) {
    const rainy = i < hours.length && isRainy(hours[i]);
    if (!inRain && rainy) { inRain = true; segStart = i; }
    else if (inRain && !rainy) {
      const seg = hours.slice(segStart, i);
      segments.push({
        startIdx: segStart, endIdx: i - 1,
        peakMm: Math.max(...seg.map((h) => h.mm)),
        dayLabel: hours[segStart].dayLabel,
        startLabel: hours[segStart].label,
        clearLabel: i < hours.length ? hours[i].label : '',
      });
      inRain = false;
    }
  }

  if (segments.length === 0) {
    const hasTmr = hours.some((h) => h.dayLabel === 'Tomorrow');
    return hasTmr
      ? { headline: 'Clear for the next 2 days', sub: '' }
      : { headline: 'Clear the rest of the day', sub: '' };
  }

  const first = segments[0];
  const word = precipWord(first.peakMm);
  const nowRaining = first.startIdx === 0;

  if (nowRaining) {
    // intensifying soon?
    if (segments.length >= 2) {
      const second = segments[1];
      if (second.startIdx - first.endIdx <= 3 && second.peakMm >= first.peakMm * 2 && second.peakMm >= 2) {
        return {
          headline: `${cap(word)} now, turning ${precipWord(second.peakMm)} by ${second.startLabel}`,
          sub: second.clearLabel ? `Clearing by ${second.clearLabel}` : '',
        };
      }
    }
    if (!first.clearLabel) return { headline: cap(word), sub: '' };
    // any rain tomorrow too?
    const tmrSeg = segments.find((sg) => sg.dayLabel === 'Tomorrow');
    const sub = tmrSeg ? `${cap(precipWord(tmrSeg.peakMm))} again ${tomorrowPhrase(tmrSeg.startLabel)}` : '';
    return { headline: `${cap(word)}, clearing by ${first.clearLabel}`, sub };
  }

  // rain coming later
  const hoursAway = first.startIdx;
  const isTomorrow = first.dayLabel === 'Tomorrow';
  let timePhrase: string;
  if (isTomorrow) {
    timePhrase = tomorrowPhrase(first.startLabel);
  } else if (hoursAway === 1) {
    timePhrase = 'in about an hour';
  } else if (hoursAway <= 3) {
    timePhrase = `in ${hoursAway}h`;
  } else {
    timePhrase = `around ${first.startLabel}`;
  }

  // escalating second segment today?
  if (segments.length >= 2 && !isTomorrow) {
    const second = segments[1];
    if (second.dayLabel !== 'Tomorrow' && second.peakMm >= first.peakMm * 2 && second.peakMm >= 2) {
      return {
        headline: `${cap(word)} ${timePhrase}, heavier by ${second.startLabel}`,
        sub: second.clearLabel ? `Clearing by ${second.clearLabel}` : '',
      };
    }
  }

  const sub = first.clearLabel ? `Clearing by ${first.clearLabel}` : '';

  // clear later today, then rain tomorrow?
  if (!isTomorrow && first.clearLabel) {
    const tmrSeg = segments.find((sg) => sg.dayLabel === 'Tomorrow');
    if (tmrSeg) {
      return {
        headline: `${cap(word)} ${timePhrase}, clearing by ${first.clearLabel}`,
        sub: `${cap(precipWord(tmrSeg.peakMm))} ${tomorrowPhrase(tmrSeg.startLabel)}`,
      };
    }
  }

  return { headline: `${cap(word)} ${timePhrase}`, sub };
}

function Label({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div style={{ fontSize: 9, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.38)' }}>
      {children}
    </div>
  );
}

export interface HomeV4Props {
  s: WxScenario;
  units: 'C' | 'F';
  onSevereTap?: () => void;
}

export function HomeV4({ s, units, onSevereTap }: HomeV4Props): React.ReactElement {
  const glass = MATERIALS.frosted;
  const hours = s.hourly.slice(0, HOURLY_VISIBLE);
  const fmt = (c: number) => `${fmtTemp(c, units)}°`;

  const isSevere = !!s.severe;
  const narrative: Narrative = isSevere
    ? { headline: `⚠ ${s.severe!.title}`, sub: s.severe!.sub }
    : buildNarrative(hours);
  const dot: 'severe' | 'rain' | 'none' =
    isSevere ? 'severe' : (s.precip.kind === 'rain' ? 'rain' : 'none');
  const curMm = hours[0]?.mm ?? 0;

  // hourly temp curve
  const PITCH = 50, COL_W = 48, SVG_H = 40;
  const totalW = hours.length * PITCH;
  const temps = hours.map((h) => h.t);
  const tMin = Math.min(...temps) - 1;
  const tMax = Math.max(...temps) + 1;
  const mapY = (t: number) => 4 + ((tMax - t) / (tMax - tMin)) * (SVG_H - 8);
  const pts = hours.map((h, i): [number, number] => [i * PITCH + COL_W / 2, mapY(h.t)]);
  const lp = smoothPath(pts);
  const fp = pts.length > 0
    ? `${lp} L ${pts[pts.length - 1][0]} ${SVG_H} L ${pts[0][0]} ${SVG_H} Z`
    : '';
  // 7-day range geometry
  const allHi = s.daily.map((d) => d.hiC);
  const allLo = s.daily.map((d) => d.loC);
  const gLo = Math.min(...allLo) - 2;
  const gHi = Math.max(...allHi) + 2;
  const span = gHi - gLo;

  // sunrise / sunset arc
  const srMin = parseToMinutes(s.sunrise);
  const ssMin = parseToMinutes(s.sunset);
  const nowMin = parseToMinutes(s.nowLabel);
  const sunPct = ssMin > srMin
    ? Math.max(0, Math.min(1, (nowMin - srMin) / (ssMin - srMin)))
    : 0.5;

  const windDeg = DIR_DEG[s.windDir] ?? s.windDeg ?? 0;

  return (
    <div style={{
      minHeight: '100%',
      background: s.sky.grad,
      fontFamily: FONT,
      color: FG,
      paddingTop: 44,
      paddingBottom: 40,
      WebkitFontSmoothing: 'antialiased',
    }}>
      {/* hero */}
      <div style={{ padding: '10px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, borderRadius: 18, padding: '16px 20px', ...glass }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <div style={{ fontSize: 100, fontWeight: 900, lineHeight: 1, letterSpacing: -5, color: FG, fontVariantNumeric: 'tabular-nums' }}>
                {fmtTemp(s.tempC, units)}
              </div>
              <div style={{ fontSize: 30, fontWeight: 600, color: '#68c8ff', marginTop: 12 }}>
                °{units}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, fontSize: 13, fontFamily: MONO }}>
              <span style={{ color: 'rgba(220,240,255,0.78)' }}>H {fmt(s.hiC)}</span>
              <span style={{ color: 'rgba(255,255,255,0.52)' }}>·</span>
              <span style={{ color: 'rgba(255,255,255,0.52)' }}>L {fmt(s.loC)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {weatherIcon(s.cond, 72)}
            <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.78)', letterSpacing: '-0.2px', textAlign: 'center' }}>
              {s.condLabel}
            </div>
          </div>
        </div>
      </div>

      {/* meta strip: humidity + wind */}
      <div style={{ display: 'flex', margin: '16px 16px 0', borderRadius: 14, overflow: 'hidden', ...glass }}>
        <div style={{ flex: 1, padding: '10px 14px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          <Label>Humidity</Label>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(205,228,255,0.85)', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
            {s.humidity}%
          </div>
        </div>
        <div style={{ flex: 1, padding: '10px 14px' }}>
          <Label>Wind</Label>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(205,228,255,0.85)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
            <WindArrow deg={windDeg} />
            {windFmt(s.windKmh, units)}
          </div>
        </div>
      </div>

      {/* precip strip: chance + rate */}
      <div style={{ display: 'flex', margin: '8px 16px 0', borderRadius: 14, overflow: 'hidden', ...glass }}>
        <div style={{ flex: 1, padding: '10px 14px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          <Label>Chance</Label>
          <div style={{ fontSize: 14, fontWeight: 500, color: curMm > 0 ? '#78ccff' : 'rgba(205,228,255,0.85)', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
            {hours[0]?.prob ?? 0}%
          </div>
        </div>
        <div style={{ flex: 1, padding: '10px 14px' }}>
          <Label>Rate</Label>
          <div style={{ fontSize: 14, fontWeight: 500, color: curMm > 0 ? '#78ccff' : 'rgba(205,228,255,0.85)', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
            {curMm > 0 ? `${curMm.toFixed(1)} mm/h` : 'Dry'}
          </div>
        </div>
      </div>

      {/* precip / alert card */}
      <div
        onClick={isSevere ? onSevereTap : undefined}
        style={{
          margin: '10px 16px 0', borderRadius: 16, ...glass,
          ...(dot === 'rain' ? { background: 'rgba(20,65,120,0.38)', borderColor: 'rgba(80,175,255,0.18)' } : {}),
          ...(dot === 'severe' ? { background: 'rgba(75,52,5,0.50)', borderColor: 'rgba(244,196,48,0.24)' } : {}),
          ...(isSevere ? { cursor: 'pointer' } : {}),
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 6px' }}>
          <div style={{
            width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
            background: dot === 'severe' ? '#f4c430' : dot === 'rain' ? '#68c8ff' : 'rgba(160,200,240,0.38)',
            boxShadow: dot === 'severe' ? '0 0 6px rgba(244,196,48,0.5)' : 'none',
          }} />
          <div style={{ fontSize: 14.5, fontWeight: 500, color: FG, flex: 1 }}>{narrative.headline}</div>
          {isSevere && (
            <div style={{ fontSize: 11, color: 'rgba(244,196,48,0.75)', flexShrink: 0 }}>Details ›</div>
          )}
        </div>
        {narrative.sub ? (
          <div style={{ fontSize: 12, color: 'rgba(200,225,255,0.60)', padding: '0 14px 12px 33px', lineHeight: 1.45 }}>
            {narrative.sub}
          </div>
        ) : (
          <div style={{ height: 12 }} />
        )}
      </div>

      {/* hourly section header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 24px 8px' }}>
        <div style={{ fontSize: 9.5, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'rgba(255,255,255,0.40)' }}>
          Hourly · 48h
        </div>
      </div>

      {/* hourly card with temp curve */}
      <div style={{ margin: '0 16px', borderRadius: 14, overflow: 'hidden', ...glass }}>
        <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
          <div style={{ display: 'flex', gap: 2, padding: '0 12px 8px', position: 'relative', width: totalW + 24 }}>
            <svg
              width={totalW} height={SVG_H}
              style={{ position: 'absolute', top: 22, left: 12, pointerEvents: 'none', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="v4sg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5bbeff" stopOpacity={0.20} />
                  <stop offset="100%" stopColor="#5bbeff" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <path d={fp} fill="url(#v4sg)" />
              <path d={lp} fill="none" stroke="#4da8e8" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.65} />
            </svg>
            {hours.map((h, i) => (
              <div key={i} style={{
                width: 48, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '6px 0 4px', borderRadius: 10, position: 'relative', zIndex: 1,
              }}>
                <div style={{ fontSize: 10, color: i === 0 ? 'rgba(255,255,255,0.68)' : 'rgba(255,255,255,0.40)', fontWeight: i === 0 ? 600 : 400, fontFamily: MONO, fontVariantNumeric: 'tabular-nums' }}>
                  {i === 0 ? 'Now' : h.label}
                </div>
                <div style={{ height: 36 }} />
                <div style={{ fontSize: 18, lineHeight: 1, margin: '2px 0 3px' }}>
                  {EMOJI[h.cond] ?? '🌡️'}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: FG, fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(h.t)}
                </div>
                <div style={{ fontSize: 9, color: '#68c8ff', fontFamily: MONO, marginTop: 2, minHeight: 11 }}>
                  {h.prob >= 15 ? `${h.prob}%` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7-day section header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 24px 8px' }}>
        <div style={{ fontSize: 9.5, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'rgba(255,255,255,0.40)' }}>
          {s.daily.length}-Day Forecast
        </div>
      </div>

      {/* 7-day card */}
      <div style={{ margin: '0 16px 8px', borderRadius: 14, overflow: 'hidden', ...glass }}>
        {s.daily.slice(0, 16).map((d, i, arr) => {
          const lp2 = ((d.loC - gLo) / span * 100).toFixed(1);
          const wp2 = ((d.hiC - d.loC) / span * 100).toFixed(1);
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '11px 14px',
              borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}>
              <div style={{ fontSize: 14, fontWeight: i === 0 ? 600 : 400, color: FG, width: 72, flexShrink: 0 }}>
                {d.day}
              </div>
              <div style={{ fontSize: 17, width: 24, textAlign: 'center', flexShrink: 0 }}>
                {EMOJI[d.cond] ?? '🌡️'}
              </div>
              <div style={{ fontSize: 10.5, color: d.prob < 12 ? 'rgba(255,255,255,0.28)' : '#68c8ff', fontFamily: MONO, width: 30, textAlign: 'right', flexShrink: 0 }}>
                {d.prob >= 12 ? `${d.prob}%` : ''}
              </div>
              <div style={{ flex: 1 }} />
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.38)', fontFamily: MONO, width: 24, textAlign: 'right' }}>
                {fmt(d.loC)}
              </div>
              <div style={{ width: 52, height: 4, background: 'rgba(255,255,255,0.10)', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, #4490c0, #5ec4ff)', left: `${lp2}%`, width: `${wp2}%` }} />
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: FG, fontFamily: MONO, width: 24 }}>
                {fmt(d.hiC)}
              </div>
            </div>
          );
        })}
      </div>

      {/* sunrise → sunset arc */}
      <div style={{ margin: '10px 16px 0', borderRadius: 14, padding: '10px 14px', ...glass }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 9, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.36)', width: 52, flexShrink: 0 }}>
            Sunrise
          </div>
          <div style={{ fontSize: 12, fontFamily: MONO, color: 'rgba(200,225,255,0.65)', width: 42, flexShrink: 0 }}>
            {s.sunrise}
          </div>
          <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.12)', borderRadius: 2, position: 'relative', overflow: 'visible' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 2, background: 'linear-gradient(90deg, #f4a62a, #ffd166)', width: `${(sunPct * 100).toFixed(1)}%` }} />
            <div style={{ position: 'absolute', top: '50%', transform: 'translate(-50%,-50%)', width: 9, height: 9, background: '#ffd166', borderRadius: '50%', boxShadow: '0 0 7px rgba(255,209,102,0.75)', left: `${(sunPct * 100).toFixed(1)}%` }} />
          </div>
          <div style={{ fontSize: 12, fontFamily: MONO, color: 'rgba(200,225,255,0.65)', width: 42, textAlign: 'right' }}>
            {s.sunset}
          </div>
          <div style={{ fontSize: 9, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.36)', width: 44, textAlign: 'right' }}>
            Sunset
          </div>
        </div>
      </div>
    </div>
  );
}

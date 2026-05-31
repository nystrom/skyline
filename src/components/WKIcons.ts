/**
 * WeatherKind color icon system — TypeScript port of the wk-icons design.
 * 29 conditions · day + night · light + dark themes.
 * 64-unit viewBox, single cloud primitive reused across all precipitation icons.
 */

const SW  = 3;
const SWT = 2.25;

const r2 = (n: number) => n.toFixed(2);

interface Palette {
  stroke: string;
  glass:  string;
  sun:    string;
  sunRay: string;
  moon:   string;
  star:   string;
  cloud:      string;
  cloudDark:  string;
  rain:  string;
  storm: string;
  snow:  string;
  ice:   string;
  hail:  string;
  bolt:  string;
  sand:  string;
  hot:   string;
  cold:  string;
  fog:   string;
  smoke: string;
  wind:  string;
}

export function makePalette(theme: 'light' | 'dark', phase: 'day' | 'night'): Palette {
  const dark  = theme === 'dark';
  const night = phase === 'night';
  return {
    stroke: dark ? '#eef1f6' : '#221f1b',
    glass:  dark ? '#11151b' : '#fbfaf6',
    sun:    '#f6bd45',
    sunRay: dark ? '#f6bd45' : '#e2901f',
    moon:   '#f1e3a6',
    star:   dark ? '#e3e9f1' : '#b8a65d',
    cloud:     dark ? (night ? '#8a95a8' : '#aab4c4') : (night ? '#9aa6b8' : '#c3ccd9'),
    cloudDark: dark ? (night ? '#6f7b91' : '#8893a6') : (night ? '#7e8aa0' : '#9aa6b8'),
    rain:  '#5a82d6',
    storm: '#7d72d8',
    snow:  '#8fcfe0',
    ice:   '#8fbad8',
    hail:  dark ? '#cdd6e2' : '#bcc7d5',
    bolt:  '#f6bd45',
    sand:  dark ? '#e7bf82' : '#d49a52',
    hot:   '#e8743b',
    cold:  '#5a8fd0',
    fog:   dark ? '#c4cdd9' : (night ? '#8e98a6' : '#a6afbc'),
    smoke: dark ? '#c4cdd9' : (night ? '#8a93a1' : '#99a2ac'),
    wind:  dark ? '#c4cdd9' : (night ? '#7e8896' : '#8a93a0'),
  };
}

/* ── primitives ── */

function ln(x1: number, y1: number, x2: number, y2: number, c: string, w: number) {
  return `<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
}
function circ(cx: number, cy: number, r: number, fill: string, stroke?: string, w?: number) {
  const s = stroke ? ` stroke="${stroke}" stroke-width="${w}"` : '';
  return `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="${fill}"${s}/>`;
}

function sunGlyph(cx: number, cy: number, r: number, rl: number, p: Palette, skip: number[] = []) {
  let s = '';
  if (rl > 0) {
    for (let i = 0; i < 8; i++) {
      if (skip.includes(i * 45)) continue;
      const a = (i * Math.PI) / 4;
      s += ln(cx + Math.cos(a) * (r + 3), cy + Math.sin(a) * (r + 3),
              cx + Math.cos(a) * (r + 3 + rl), cy + Math.sin(a) * (r + 3 + rl),
              p.sunRay, SW);
    }
  }
  return s + circ(cx, cy, r, p.sun, p.stroke, SWT);
}

function moonGlyph(cx: number, cy: number, r: number, p: Palette) {
  const tx = cx + 0.20 * r, tT = cy - 0.98 * r, tB = cy + 0.98 * r, Ri = 1.12 * r;
  const d = `M ${r2(tx)} ${r2(tT)} A ${r2(r)} ${r2(r)} 0 1 0 ${r2(tx)} ${r2(tB)} ` +
            `A ${r2(Ri)} ${r2(Ri)} 0 0 1 ${r2(tx)} ${r2(tT)} Z`;
  return `<path d="${d}" fill="${p.moon}" stroke="${p.stroke}" stroke-width="${SWT}" stroke-linejoin="round"/>`;
}

function starGlyph(cx: number, cy: number, s: number, p: Palette) {
  const k = s * 0.34;
  const d = `M ${r2(cx)} ${r2(cy - s)} C ${r2(cx)} ${r2(cy - k)} ${r2(cx + k)} ${r2(cy)} ${r2(cx + s)} ${r2(cy)} ` +
            `C ${r2(cx + k)} ${r2(cy)} ${r2(cx)} ${r2(cy + k)} ${r2(cx)} ${r2(cy + s)} ` +
            `C ${r2(cx)} ${r2(cy + k)} ${r2(cx - k)} ${r2(cy)} ${r2(cx - s)} ${r2(cy)} ` +
            `C ${r2(cx - k)} ${r2(cy)} ${r2(cx)} ${r2(cy - k)} ${r2(cx)} ${r2(cy - s)} Z`;
  return `<path d="${d}" fill="${p.star}"/>`;
}
function stars(list: [number, number, number][], p: Palette) {
  return list.map(([x, y, s]) => starGlyph(x, y, s, p)).join('');
}

function behind(isDay: boolean, p: Palette) {
  return isDay ? sunGlyph(20, 20, 6, 3.5, p, [0, 45, 90, 135]) : moonGlyph(21, 20, 7.5, p);
}
function nightStars(isDay: boolean, p: Palette) {
  return isDay ? '' : stars([[51, 13, 2.4], [14, 15, 1.7]], p);
}

const CLOUD_D = "M 11 37 C 5 33 7 26 14 27 C 13 18 26 13 30 21 C 33 11 49 12 50 23 C 57 22 58 33 51 35 C 51 41 43 42 39 39 C 35 43 27 43 24 39 C 19 42 11 41 11 37 Z";

function cloudGlyph(p: Palette, tone: 'light' | 'dark', transform?: string) {
  const fill = tone === 'dark' ? p.cloudDark : p.cloud;
  const t = transform ? ` transform="${transform}"` : '';
  return `<path${t} d="${CLOUD_D}" fill="${fill}" stroke="${p.stroke}" stroke-width="${SW}" stroke-linejoin="round"/>`;
}

function drop(cx: number, cy: number, h: number, p: Palette) {
  const w = h * 0.55;
  const d = `M ${r2(cx)} ${r2(cy)} C ${r2(cx - w)} ${r2(cy + h * 0.55)}, ${r2(cx - w)} ${r2(cy + h * 0.95)}, ${r2(cx)} ${r2(cy + h)} ` +
            `C ${r2(cx + w)} ${r2(cy + h * 0.95)}, ${r2(cx + w)} ${r2(cy + h * 0.55)}, ${r2(cx)} ${r2(cy)} Z`;
  return `<path d="${d}" fill="${p.rain}" stroke="${p.stroke}" stroke-width="${SWT}" stroke-linejoin="round"/>`;
}

function flake(cx: number, cy: number, r: number, p: Palette) {
  let s = '';
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI) / 3 + Math.PI / 6;
    const dx = Math.cos(a) * r, dy = Math.sin(a) * r;
    s += ln(cx - dx, cy - dy, cx + dx, cy + dy, p.stroke, SWT);
  }
  return s;
}
function flakeAt(x: number, y: number, r: number, p: Palette, rot?: number) {
  const t = rot ? `translate(${x} ${y}) rotate(${rot})` : `translate(${x} ${y})`;
  return `<g transform="${t}">${flake(0, 0, r, p)}</g>`;
}

function boltGlyph(cx: number, top: number, h: number, p: Palette) {
  const u = h / 14;
  const d = `M ${r2(cx + u * 1.5)} ${r2(top)} L ${r2(cx - u * 2.5)} ${r2(top + u * 8)} L ${r2(cx - u * 0.5)} ${r2(top + u * 8)} ` +
            `L ${r2(cx - u * 1.5)} ${r2(top + h)} L ${r2(cx + u * 3)} ${r2(top + u * 6)} L ${r2(cx + u * 0.5)} ${r2(top + u * 6)} Z`;
  return `<path d="${d}" fill="${p.bolt}" stroke="${p.stroke}" stroke-width="${SWT}" stroke-linejoin="round" stroke-linecap="round"/>`;
}

function pellet(cx: number, cy: number, r: number, p: Palette, col: string) {
  return circ(cx, cy, r, col, p.stroke, SWT);
}

function wave(x1: number, x2: number, y: number, c: string, w: number) {
  const xm = (x1 + x2) / 2;
  return `<path d="M ${r2(x1)} ${r2(y)} Q ${r2(xm - 6)} ${r2(y - 1.6)} ${r2(xm)} ${r2(y)} T ${r2(x2)} ${r2(y)}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
}
function hline(x1: number, x2: number, y: number, c: string) {
  return ln(x1, y, x2, y, c, SW);
}

function thermo(p: Palette, fillColor: string, mercTopY: number) {
  const cx = 30, top = 14, stem = 40, bulbCY = 46;
  const outline = `M ${r2(cx - 4.5)} ${r2(top + 4.5)} a 4.5 4.5 0 0 1 9 0 V ${r2(stem)} a 7 7 0 1 1 -9 0 Z`;
  let s = `<path d="${outline}" fill="${p.glass}" stroke="${p.stroke}" stroke-width="${SWT}" stroke-linejoin="round"/>`;
  s += circ(cx, bulbCY, 4.6, fillColor);
  s += `<rect x="${r2(cx - 1.7)}" y="${r2(mercTopY)}" width="3.4" height="${r2(bulbCY - mercTopY)}" rx="1.7" fill="${fillColor}"/>`;
  return s;
}

function smokeBody(p: Palette) {
  const c = p.smoke;
  return ln(16, 56, 46, 56, c, SW) +
    `<path d="M 24 56 C 18 48 30 44 24 36 C 18 28 28 23 24 16" fill="none" stroke="${c}" stroke-width="${SW}" stroke-linecap="round"/>` +
    `<path d="M 38 56 C 44 49 34 44 40 36 C 46 29 38 25 40 18" fill="none" stroke="${c}" stroke-width="${SW}" stroke-linecap="round"/>`;
}
function windBody(p: Palette) {
  const c = p.wind;
  return `<path d="M 12 26 H 38 A 5 5 0 1 0 33 21" fill="none" stroke="${c}" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M 12 38 H 46 A 5.5 5.5 0 1 1 40.5 43.5" fill="none" stroke="${c}" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M 12 50 H 30" fill="none" stroke="${c}" stroke-width="${SW}" stroke-linecap="round"/>`;
}
function sandBody(p: Palette) {
  const c = p.sand;
  return `<path d="M 10 28 H 40 A 4 4 0 1 0 36 24" fill="none" stroke="${c}" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M 12 40 H 48 A 4 4 0 1 1 44 36" fill="none" stroke="${c}" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M 14 52 H 34" fill="none" stroke="${c}" stroke-width="${SW}" stroke-linecap="round"/>` +
    circ(49, 30, 1.7, c) + circ(53, 46, 1.7, c) + circ(20, 47, 1.5, c);
}
function hurricaneBody(p: Palette) {
  const c = p.storm;
  return `<path d="M 32 30 C 23 27 20 16 31 13 C 45 11 51 26 43 33" fill="none" stroke="${c}" stroke-width="${SW}" stroke-linecap="round"/>` +
    `<path d="M 32 34 C 41 37 44 48 33 51 C 19 53 13 38 21 31" fill="none" stroke="${c}" stroke-width="${SW}" stroke-linecap="round"/>` +
    circ(32, 32, 3, c);
}
function tornadoBody(p: Palette) {
  const c = p.fog;
  let s = '';
  const rows: [number, number, number][] = [[14, 50, 16], [18, 46, 24], [22, 42, 32], [26, 38, 40]];
  rows.forEach(([x1, x2, y]) => { s += wave(x1, x2, y, c, SW); });
  s += `<path d="M 33 44 C 31 50 29 54 24 58" fill="none" stroke="${c}" stroke-width="${SW}" stroke-linecap="round"/>`;
  return s;
}
function iceBody(p: Palette) {
  const ic = (x: number, len: number, w: number) =>
    `<path d="M ${x - w} 24 L ${x + w} 24 L ${x} ${24 + len} Z" fill="${p.ice}" stroke="${p.stroke}" stroke-width="${SWT}" stroke-linejoin="round"/>`;
  return ln(12, 24, 52, 24, p.stroke, SW) + ic(20, 16, 4) + ic(32, 24, 5) + ic(44, 14, 4);
}

/* ── 29 condition icons ── */

type IconFn = (p: Palette, isDay: boolean) => string;

const ICONS: Record<string, IconFn> = {
  clear: (p, d) => d
    ? sunGlyph(32, 32, 10, 5, p)
    : moonGlyph(32, 31, 12, p) + stars([[50, 17, 2.6], [53, 27, 1.7], [17, 47, 2.1]], p),

  partly_cloudy: (p, d) =>
    behind(d, p) + cloudGlyph(p, 'light', 'translate(6 9) scale(0.78)'),

  cloudy: (p, d) => {
    const s = cloudGlyph(p, 'dark', 'translate(13 -3) scale(0.62)') + cloudGlyph(p, 'light', 'translate(0 5) scale(0.92)');
    return (d ? '' : stars([[52, 9, 2.2], [11, 14, 1.7]], p)) + s;
  },

  fog: (p, d) =>
    (d ? '' : stars([[52, 11, 2.0]], p)) +
    cloudGlyph(p, 'light', 'translate(0 -5)') +
    wave(12, 52, 46, p.fog, SW) + wave(18, 50, 52, p.fog, SW) + wave(14, 48, 58, p.fog, SW),

  hazy: (p, d) =>
    (d ? sunGlyph(32, 24, 8, 0, p) : moonGlyph(32, 23, 9, p)) +
    hline(12, 52, 44, p.fog) + hline(16, 48, 50, p.fog) + hline(20, 44, 56, p.fog),

  mist: (p, d) =>
    (d ? sunGlyph(46, 16, 5, 3, p) : moonGlyph(47, 16, 6, p)) +
    [22, 31, 40, 49].map((y, i) => wave(i % 2 ? 16 : 12, i % 2 ? 50 : 52, y, p.fog, SWT)).join(''),

  smoke: (p, d) =>
    (d ? sunGlyph(48, 15, 5, 0, p) : moonGlyph(48, 15, 6, p)) + smokeBody(p),

  drizzle: (p, d) =>
    behind(d, p) + cloudGlyph(p, 'light') +
    [[21, 49], [32, 49], [43, 49]].map(([x, y]) => ln(x, y, x - 2, y + 4.5, p.rain, SW)).join(''),

  rain_light: (p, d) =>
    behind(d, p) + cloudGlyph(p, 'light') + drop(25, 49, 6, p) + drop(39, 49, 6, p),

  rain_moderate: (p, d) =>
    cloudGlyph(p, 'light') + nightStars(d, p) + drop(20, 49, 6, p) + drop(32, 50, 7, p) + drop(44, 49, 6, p),

  rain_heavy: (p, d) =>
    cloudGlyph(p, 'dark') + nightStars(d, p) + drop(18, 48, 8, p) + drop(28, 49, 8, p) + drop(38, 48, 8, p) + drop(48, 49, 8, p),

  showers: (p, d) =>
    behind(d, p) + cloudGlyph(p, 'light') +
    ln(22, 48, 18, 58, p.rain, SW) + ln(32, 48, 28, 58, p.rain, SW) +
    ln(42, 48, 38, 58, p.rain, SW) + ln(50, 48, 46, 58, p.rain, SW),

  freezing_rain: (p, d) =>
    cloudGlyph(p, 'light') + nightStars(d, p) + drop(22, 49, 7, p) + flakeAt(40, 53, 4, p) + drop(50, 49, 7, p),

  sleet: (p, d) =>
    cloudGlyph(p, 'light') + nightStars(d, p) + drop(22, 49, 6, p) + flakeAt(34, 52, 4.2, p) + pellet(46, 52, 2.4, p, p.ice),

  ice: (p, d) =>
    (d ? '' : stars([[48, 52, 2.2], [16, 50, 1.7]], p)) + iceBody(p),

  ice_pellets: (p, d) =>
    cloudGlyph(p, 'light') + nightStars(d, p) +
    pellet(24, 50, 2.4, p, p.ice) + pellet(34, 54, 2.4, p, p.ice) + pellet(44, 50, 2.4, p, p.ice) +
    pellet(30, 58, 2.2, p, p.ice) + pellet(40, 58, 2.2, p, p.ice),

  snow_light: (p, d) =>
    nightStars(d, p) + cloudGlyph(p, 'light') + flakeAt(25, 52, 4.5, p) + flakeAt(39, 52, 4.5, p),

  snow_moderate: (p, d) =>
    cloudGlyph(p, 'light') + nightStars(d, p) + flakeAt(20, 51, 4.5, p) + flakeAt(32, 55, 4.5, p) + flakeAt(44, 51, 4.5, p),

  snow_heavy: (p, d) =>
    cloudGlyph(p, 'dark') + nightStars(d, p) + flakeAt(17, 51, 5, p) + flakeAt(29, 55, 5, p) + flakeAt(40, 51, 5, p) + flakeAt(51, 55, 5, p),

  snow_showers: (p, d) =>
    behind(d, p) + cloudGlyph(p, 'light') + flakeAt(24, 52, 4.4, p, -15) + flakeAt(36, 55, 4.4, p, -15) + flakeAt(47, 51, 4.4, p, -15),

  blizzard: (p, d) =>
    cloudGlyph(p, 'dark') + nightStars(d, p) +
    flakeAt(21, 52, 4.4, p) + flakeAt(40, 53, 4.4, p) +
    ln(14, 50, 30, 48, p.wind, SWT) + ln(18, 58, 40, 55, p.wind, SWT) + ln(31, 53, 52, 51, p.wind, SWT),

  thunderstorm: (p, d) =>
    cloudGlyph(p, 'dark') + nightStars(d, p) + boltGlyph(32, 47, 14, p),

  thunderstorm_hail: (p, d) =>
    cloudGlyph(p, 'dark') + nightStars(d, p) + boltGlyph(27, 46, 12, p) +
    pellet(43, 52, 2.5, p, p.hail) + pellet(50, 56, 2.5, p, p.hail) + pellet(41, 58, 2.5, p, p.hail),

  hurricane: (p, d) =>
    hurricaneBody(p) + (d ? '' : stars([[9, 11, 1.9], [55, 53, 1.9]], p)),

  tornado: (p, d) =>
    tornadoBody(p) + (d ? '' : stars([[11, 13, 1.9]], p)),

  wind: (p, _d) => windBody(p),

  sand: (p, _d) => sandBody(p),

  hot: (p, d) =>
    (d ? sunGlyph(46, 17, 6, 3.5, p) : moonGlyph(47, 17, 7, p)) + thermo(p, p.hot, 26),

  cold: (p, d) =>
    (d ? sunGlyph(46, 16, 5, 3, p) : moonGlyph(47, 16, 6, p)) + thermo(p, p.cold, 40) + flakeAt(46, 33, 3.2, p),
};

/** Map WeatherKind values that lack a direct design icon to the closest match. */
const KEY_ALIAS: Record<string, string> = {
  scattered_clouds: 'partly_cloudy',
  mostly_cloudy:    'cloudy',
  overcast:         'cloudy',
  unknown:          'cloudy',
};

/**
 * Render a WeatherKind icon as an SVG string.
 * @param key - WeatherKind enum value (e.g. 'clear', 'rain_light')
 * @param isDay - true for daytime variant
 * @param theme - 'light' or 'dark' UI theme
 * @param size - pixel dimensions (square)
 */
export function wkGlyph(key: string, isDay: boolean, theme: 'light' | 'dark', size: number): string {
  const resolvedKey = KEY_ALIAS[key] ?? key;
  const fn = ICONS[resolvedKey] ?? ICONS['cloudy'];
  const p = makePalette(theme, isDay ? 'day' : 'night');
  const inner = fn(p, isDay);
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

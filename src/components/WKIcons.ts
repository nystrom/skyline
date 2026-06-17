/**
 * WeatherKind animated color icon system — TypeScript port of wk-icons v2 "in motion".
 * 29 conditions · day + night · light + dark themes · looping CSS animations.
 * One 64-unit viewBox, single cloud primitive reused across all precipitation icons.
 */

const SW  = 3;
const SWT = 2.25;

const r2 = (n: number) => n.toFixed(2);

/** Deterministic 0…-dur delay so siblings stagger without randomness. */
function del(seed: number, dur: number): string {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  const f = x - Math.floor(x);
  return (-(f * (dur || 1.4))).toFixed(2);
}

export interface Palette {
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

/* ============================================================
   MOTION — injected once per document.
   transform-box declarations ensure icons animate correctly at
   any render size. All motion is gated behind prefers-reduced-motion.
   ============================================================ */
export const ANIM_CSS = `
.wk-rays,.wk-sun-disc,.wk-twinkle,.wk-spin,.wk-twist{transform-box:view-box}
.wk-snow,.wk-merc,.wk-pulse{transform-box:fill-box;transform-origin:center}
.wk-merc{transform-origin:center bottom}
@media (prefers-reduced-motion: no-preference){
  .wk-rays{animation:wk-spin 30s linear infinite}
  .wk-sun-disc{animation:wk-breathe 4.5s ease-in-out infinite}
  .wk-float{animation:wk-float 6s ease-in-out infinite}
  .wk-twinkle{animation:wk-twinkle 3.2s ease-in-out infinite}
  .wk-drift{animation:wk-drift 7s ease-in-out infinite}
  .wk-drift-2{animation:wk-drift 10s ease-in-out infinite reverse}
  .wk-rain{animation:wk-rain 1.25s linear infinite}
  .wk-snow{animation:wk-snow 3.4s ease-in-out infinite}
  .wk-bolt{animation:wk-bolt 2.6s steps(1,end) infinite}
  .wk-flow{animation:wk-flow 4.2s ease-in-out infinite}
  .wk-spin{animation:wk-spin 8s linear infinite}
  .wk-merc{animation:wk-merc 3.4s ease-in-out infinite}
  .wk-pulse{animation:wk-pulse 2.6s ease-in-out infinite}
  .wk-gust{animation:wk-gust 3.4s ease-in-out infinite}
  .wk-blow{animation:wk-blow 2.8s ease-in-out infinite}
  .wk-twist{animation:wk-twist 4.6s ease-in-out infinite}
}
@keyframes wk-spin{to{transform:rotate(360deg)}}
@keyframes wk-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.09)}}
@keyframes wk-float{0%,100%{transform:translateY(.9px)}50%{transform:translateY(-1.3px)}}
@keyframes wk-twinkle{0%,100%{opacity:.4;transform:scale(.7)}50%{opacity:1;transform:scale(1)}}
@keyframes wk-drift{0%,100%{transform:translateX(-1.5px)}50%{transform:translateX(1.5px)}}
@keyframes wk-rain{0%{transform:translateY(-5px);opacity:0}18%{opacity:1}82%{opacity:1}100%{transform:translateY(10px);opacity:0}}
@keyframes wk-snow{0%{transform:translateY(-4px) rotate(0deg);opacity:0}18%{opacity:1}84%{opacity:1}100%{transform:translateY(10px) rotate(55deg);opacity:0}}
@keyframes wk-bolt{0%,52%,100%{opacity:1}55%{opacity:.12}59%{opacity:1}64%{opacity:.32}69%{opacity:1}}
@keyframes wk-flow{0%,100%{transform:translateX(-1.8px)}50%{transform:translateX(1.8px)}}
@keyframes wk-merc{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.07)}}
@keyframes wk-pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes wk-gust{0%{transform:translateX(-2px);opacity:.55}45%{opacity:1}55%{transform:translateX(2.6px);opacity:1}100%{transform:translateX(-2px);opacity:.55}}
@keyframes wk-blow{0%{transform:translateX(-3px);opacity:0}25%{opacity:1}75%{opacity:1}100%{transform:translateX(5px);opacity:0}}
@keyframes wk-twist{0%,100%{transform:rotate(-3.5deg)}50%{transform:rotate(3.5deg)}}`;

export function ensureAnimStyle(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('wk-anim-style')) return;
  const el = document.createElement('style');
  el.id = 'wk-anim-style';
  el.textContent = ANIM_CSS;
  document.head.appendChild(el);
}

/* ── animation wrappers ── */
const drift = (tone: string, inner: string) =>
  `<g class="${tone === 'dark' ? 'wk-drift-2' : 'wk-drift'}">${inner}</g>`;
const fall  = (seed: number, inner: string) =>
  `<g class="wk-rain" style="animation-delay:${del(seed, 1.25)}s">${inner}</g>`;
const flow  = (inner: string) => `<g class="wk-flow">${inner}</g>`;

/* ── tiny svg helpers ── */
function ln(x1: number, y1: number, x2: number, y2: number, c: string, w: number) {
  return `<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
}
function circ(cx: number, cy: number, r: number, fill: string, stroke?: string, w?: number) {
  const s = stroke ? ` stroke="${stroke}" stroke-width="${w}"` : '';
  return `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="${fill}"${s}/>`;
}

/* ── celestial ── */
function sunGlyph(cx: number, cy: number, r: number, rl: number, p: Palette, skip: number[] = []) {
  let rays = '';
  if (rl > 0) {
    for (let i = 0; i < 8; i++) {
      if (skip.includes(i * 45)) continue;
      const a = (i * Math.PI) / 4;
      rays += ln(cx + Math.cos(a) * (r + 3), cy + Math.sin(a) * (r + 3),
                 cx + Math.cos(a) * (r + 3 + rl), cy + Math.sin(a) * (r + 3 + rl),
                 p.sunRay, SW);
    }
  }
  const o = `transform-origin:${r2(cx)}px ${r2(cy)}px`;
  const raysG = rays ? `<g class="wk-rays" style="${o}">${rays}</g>` : '';
  const disc = `<circle class="wk-sun-disc" style="${o}" cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" fill="${p.sun}" stroke="${p.stroke}" stroke-width="${SWT}"/>`;
  return raysG + disc;
}

function moonGlyph(cx: number, cy: number, r: number, p: Palette) {
  const tx = cx + 0.20 * r, tT = cy - 0.98 * r, tB = cy + 0.98 * r, Ri = 1.12 * r;
  const d = `M ${r2(tx)} ${r2(tT)} A ${r2(r)} ${r2(r)} 0 1 0 ${r2(tx)} ${r2(tB)} ` +
            `A ${r2(Ri)} ${r2(Ri)} 0 0 1 ${r2(tx)} ${r2(tT)} Z`;
  return `<path class="wk-float" d="${d}" fill="${p.moon}" stroke="${p.stroke}" stroke-width="${SWT}" stroke-linejoin="round"/>`;
}

function starGlyph(cx: number, cy: number, s: number, p: Palette) {
  const k = s * 0.34;
  const d = `M ${r2(cx)} ${r2(cy - s)} C ${r2(cx)} ${r2(cy - k)} ${r2(cx + k)} ${r2(cy)} ${r2(cx + s)} ${r2(cy)} ` +
            `C ${r2(cx + k)} ${r2(cy)} ${r2(cx)} ${r2(cy + k)} ${r2(cx)} ${r2(cy + s)} ` +
            `C ${r2(cx)} ${r2(cy + k)} ${r2(cx - k)} ${r2(cy)} ${r2(cx - s)} ${r2(cy)} ` +
            `C ${r2(cx - k)} ${r2(cy)} ${r2(cx)} ${r2(cy - k)} ${r2(cx)} ${r2(cy - s)} Z`;
  return `<path class="wk-twinkle" style="transform-origin:${r2(cx)}px ${r2(cy)}px;animation-delay:${del(cx + cy, 3.2)}s" d="${d}" fill="${p.star}"/>`;
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

/* ── weather primitives ── */

/* Smooth cumulus: big lobe on left/center, smaller right, flat base at y=41
   so precipitation positions always clear the cloud bottom. */
const CLOUD_D = "M 17 41 C 11 41 7 36.5 7 31 C 7 25.5 11.2 21 16.8 21 C 18.2 16 22.8 12.5 28.5 12.5 C 33.8 12.5 38.4 15.6 40.3 20.2 C 41.6 19.7 43 19.4 44.4 19.4 C 50.3 19.4 55 24.2 55 30.2 C 55 36.1 50.4 41 44.6 41 Z";

function cloudGlyph(p: Palette, tone: 'light' | 'dark', transform?: string) {
  const fill = tone === 'dark' ? p.cloudDark : p.cloud;
  const t = transform ? ` transform="${transform}"` : '';
  const path = `<path${t} d="${CLOUD_D}" fill="${fill}" stroke="${p.stroke}" stroke-width="${SW}" stroke-linejoin="round"/>`;
  return drift(tone, path);
}

function drop(cx: number, cy: number, h: number, p: Palette) {
  const w = h * 0.55;
  const d = `M ${r2(cx)} ${r2(cy)} C ${r2(cx - w)} ${r2(cy + h * 0.55)}, ${r2(cx - w)} ${r2(cy + h * 0.95)}, ${r2(cx)} ${r2(cy + h)} ` +
            `C ${r2(cx + w)} ${r2(cy + h * 0.95)}, ${r2(cx + w)} ${r2(cy + h * 0.55)}, ${r2(cx)} ${r2(cy)} Z`;
  return fall(cx, `<path d="${d}" fill="${p.rain}" stroke="${p.stroke}" stroke-width="${SWT}" stroke-linejoin="round"/>`);
}

/* Six-arm snowflake with V-branches near each tip — reads as a flake, not an asterisk. */
function flake(cx: number, cy: number, r: number, p: Palette) {
  let s = '';
  const br = r * 0.58, bl = r * 0.36;
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    const ux = Math.cos(a), uy = Math.sin(a);
    s += ln(cx, cy, cx + ux * r, cy + uy * r, p.stroke, SWT);
    const bx = cx + ux * br, by = cy + uy * br;
    const a1 = a + Math.PI / 3.2, a2 = a - Math.PI / 3.2;
    s += ln(bx, by, bx + Math.cos(a1) * bl, by + Math.sin(a1) * bl, p.stroke, SWT);
    s += ln(bx, by, bx + Math.cos(a2) * bl, by + Math.sin(a2) * bl, p.stroke, SWT);
  }
  return s;
}
function flakeAt(x: number, y: number, r: number, p: Palette, rot?: number) {
  const t = rot ? `translate(${x} ${y}) rotate(${rot})` : `translate(${x} ${y})`;
  return `<g class="wk-snow" style="animation-delay:${del(x + y, 3.4)}s"><g transform="${t}">${flake(0, 0, r, p)}</g></g>`;
}

function boltGlyph(cx: number, top: number, h: number, p: Palette) {
  const u = h / 14;
  const d = `M ${r2(cx + u * 1.5)} ${r2(top)} L ${r2(cx - u * 2.5)} ${r2(top + u * 8)} L ${r2(cx - u * 0.5)} ${r2(top + u * 8)} ` +
            `L ${r2(cx - u * 1.5)} ${r2(top + h)} L ${r2(cx + u * 3)} ${r2(top + u * 6)} L ${r2(cx + u * 0.5)} ${r2(top + u * 6)} Z`;
  return `<g class="wk-bolt"><path d="${d}" fill="${p.bolt}" stroke="${p.stroke}" stroke-width="${SWT}" stroke-linejoin="round" stroke-linecap="round"/></g>`;
}

function pellet(cx: number, cy: number, r: number, p: Palette, col: string) {
  return fall(cx + cy, circ(cx, cy, r, col, p.stroke, SWT));
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
  s += `<rect class="wk-merc" x="${r2(cx - 1.7)}" y="${r2(mercTopY)}" width="3.4" height="${r2(bulbCY - mercTopY)}" rx="1.7" fill="${fillColor}"/>`;
  return s;
}

function smokeBody(p: Palette) {
  const c = p.smoke;
  return flow(ln(16, 56, 46, 56, c, SW) +
    `<path d="M 24 56 C 18 48 30 44 24 36 C 18 28 28 23 24 16" fill="none" stroke="${c}" stroke-width="${SW}" stroke-linecap="round"/>` +
    `<path d="M 38 56 C 44 49 34 44 40 36 C 46 29 38 25 40 18" fill="none" stroke="${c}" stroke-width="${SW}" stroke-linecap="round"/>`);
}

function windBody(p: Palette) {
  const c = p.wind;
  const l1 = `<path d="M 12 26 H 38 A 5 5 0 1 0 33 21" fill="none" stroke="${c}" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const l2 = `<path d="M 12 38 H 46 A 5.5 5.5 0 1 1 40.5 43.5" fill="none" stroke="${c}" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const l3 = `<path d="M 12 50 H 30" fill="none" stroke="${c}" stroke-width="${SW}" stroke-linecap="round"/>`;
  return `<g class="wk-gust" style="animation-delay:-.4s">${l1}</g>` +
         `<g class="wk-gust">${l2}</g>` +
         `<g class="wk-gust" style="animation-delay:-1.7s">${l3}</g>`;
}

function sandBody(p: Palette) {
  const c = p.sand;
  const l1 = `<path d="M 10 28 H 40 A 4 4 0 1 0 36 24" fill="none" stroke="${c}" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const l2 = `<path d="M 12 40 H 48 A 4 4 0 1 1 44 36" fill="none" stroke="${c}" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const l3 = `<path d="M 14 52 H 34" fill="none" stroke="${c}" stroke-width="${SW}" stroke-linecap="round"/>`;
  const dots = `<g class="wk-blow">${circ(49, 30, 1.7, c)}</g>` +
               `<g class="wk-blow" style="animation-delay:-1.4s">${circ(53, 46, 1.7, c)}</g>` +
               `<g class="wk-blow" style="animation-delay:-.7s">${circ(20, 47, 1.5, c)}</g>`;
  return `<g class="wk-gust" style="animation-delay:-.3s">${l1}</g>` +
         `<g class="wk-gust">${l2}</g>` +
         `<g class="wk-gust" style="animation-delay:-1.6s">${l3}</g>` + dots;
}

function hArm(cx: number, cy: number, a0: number, c: string) {
  const steps = 44, turns = 0.92, thMax = turns * 2 * Math.PI, rMin = 3.4, rMax = 21.5;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, th = a0 + t * thMax, rr = rMin + (rMax - rMin) * t;
    const x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr;
    d += i ? ` L ${r2(x)} ${r2(y)}` : `M ${r2(x)} ${r2(y)}`;
  }
  return `<path d="${d}" fill="none" stroke="${c}" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function hurricaneBody(p: Palette) {
  const c = p.storm;
  const arms = hArm(32, 32, 0, c) + hArm(32, 32, Math.PI, c);
  return `<g class="wk-spin" style="transform-origin:32px 32px">${arms}</g>` + circ(32, 32, 2.6, c);
}

const FUNNEL_D = "M 14 18 Q 21 13 27 17 Q 32 12.5 37 17 Q 43 13 50 18 C 49 25 43.5 29.5 39 35 C 35 40.5 31.5 47.5 29 55 C 28.6 47 26 40 23 34 C 19 29 15 23.5 14 18 Z";

function tornadoBody(p: Palette) {
  const body = `<path d="${FUNNEL_D}" fill="${p.cloud}" stroke="${p.stroke}" stroke-width="${SWT}" stroke-linejoin="round"/>`;
  const band = (d: string) => `<path d="${d}" fill="none" stroke="${p.stroke}" stroke-width="1.7" stroke-linecap="round" opacity="0.55"/>`;
  const bands = band("M 18 23 Q 32 27.5 47 23") + band("M 22 32 Q 31 35.5 40 32") + band("M 26 42 Q 30 44.5 35 42");
  return `<g class="wk-twist" style="transform-origin:29px 55px">${body}${bands}</g>`;
}

function iceBody(p: Palette) {
  const ic = (x: number, len: number, w: number) =>
    `<path d="M ${x - w} 24 L ${x + w} 24 L ${x} ${24 + len} Z" fill="${p.ice}" stroke="${p.stroke}" stroke-width="${SWT}" stroke-linejoin="round"/>`;
  return ln(12, 24, 52, 24, p.stroke, SW) +
    `<g class="wk-pulse">${ic(20, 16, 4)}</g>` +
    `<g class="wk-pulse" style="animation-delay:-1.3s">${ic(32, 24, 5)}</g>` +
    `<g class="wk-pulse" style="animation-delay:-.7s">${ic(44, 14, 4)}</g>`;
}

/* ── 29 condition icons ── */

type IconFn = (p: Palette, isDay: boolean) => string;

const ICONS: Record<string, IconFn> = {
  // ── Fair & cloud cover ──
  clear: (p, d) => d
    ? sunGlyph(32, 32, 10, 5, p)
    : moonGlyph(32, 31, 12, p) + stars([[50, 17, 2.6], [53, 27, 1.7], [17, 47, 2.1]], p),

  partly_cloudy: (p, d) =>
    behind(d, p) + cloudGlyph(p, 'light', 'translate(6 9) scale(0.78)'),

  cloudy: (p, d) => {
    const s = cloudGlyph(p, 'dark', 'translate(13 -3) scale(0.62)') + cloudGlyph(p, 'light', 'translate(0 5) scale(0.92)');
    return (d ? '' : stars([[52, 9, 2.2], [11, 14, 1.7]], p)) + s;
  },

  // ── Visibility & atmosphere ──
  fog: (p, d) =>
    (d ? '' : stars([[52, 11, 2.0]], p)) +
    cloudGlyph(p, 'light', 'translate(0 -5)') +
    flow(wave(12, 52, 46, p.fog, SW) + wave(18, 50, 52, p.fog, SW) + wave(14, 48, 58, p.fog, SW)),

  hazy: (p, d) =>
    (d ? sunGlyph(32, 24, 8, 0, p) : moonGlyph(32, 23, 9, p)) +
    flow(hline(12, 52, 44, p.fog) + hline(16, 48, 50, p.fog) + hline(20, 44, 56, p.fog)),

  mist: (p, d) =>
    (d ? sunGlyph(46, 16, 5, 3, p) : moonGlyph(47, 16, 6, p)) +
    flow([22, 31, 40, 49].map((y, i) => wave(i % 2 ? 16 : 12, i % 2 ? 50 : 52, y, p.fog, SWT)).join('')),

  smoke: (p, d) =>
    (d ? sunGlyph(48, 15, 5, 0, p) : moonGlyph(48, 15, 6, p)) + smokeBody(p),

  // ── Liquid precipitation ──
  drizzle: (p, d) =>
    behind(d, p) + cloudGlyph(p, 'light') +
    [[21, 49], [32, 49], [43, 49]].map(([x, y]) => fall(x, ln(x, y, x - 2, y + 4.5, p.rain, SW))).join(''),

  rain_light: (p, d) =>
    behind(d, p) + cloudGlyph(p, 'light') + drop(25, 49, 6, p) + drop(39, 49, 6, p),

  rain_moderate: (p, d) =>
    cloudGlyph(p, 'light') + nightStars(d, p) + drop(20, 49, 6, p) + drop(32, 50, 7, p) + drop(44, 49, 6, p),

  rain_heavy: (p, d) =>
    cloudGlyph(p, 'dark') + nightStars(d, p) + drop(18, 48, 8, p) + drop(28, 49, 8, p) + drop(38, 48, 8, p) + drop(48, 49, 8, p),

  showers: (p, d) =>
    behind(d, p) + cloudGlyph(p, 'light') +
    [[22, 18], [32, 28], [42, 38], [50, 46]].map(([x1, x2]) => fall(x1, ln(x1, 48, x2, 58, p.rain, SW))).join(''),

  // ── Wintry precipitation ──
  freezing_rain: (p, d) =>
    cloudGlyph(p, 'light') + nightStars(d, p) + drop(22, 49, 7, p) + flakeAt(40, 54, 3.4, p) + drop(50, 49, 7, p),

  sleet: (p, d) =>
    cloudGlyph(p, 'light') + nightStars(d, p) + drop(22, 49, 6, p) + flakeAt(35, 53, 3.6, p) + pellet(46, 52, 2.4, p, p.ice),

  ice: (p, d) =>
    (d ? '' : stars([[48, 52, 2.2], [16, 50, 1.7]], p)) + iceBody(p),

  ice_pellets: (p, d) =>
    cloudGlyph(p, 'light') + nightStars(d, p) +
    pellet(24, 50, 2.4, p, p.ice) + pellet(34, 54, 2.4, p, p.ice) + pellet(44, 50, 2.4, p, p.ice) +
    pellet(30, 58, 2.2, p, p.ice) + pellet(40, 58, 2.2, p, p.ice),

  snow_light: (p, d) =>
    nightStars(d, p) + cloudGlyph(p, 'light') + flakeAt(25, 52, 4.2, p) + flakeAt(39, 52, 4.2, p),

  snow_moderate: (p, d) =>
    cloudGlyph(p, 'light') + nightStars(d, p) + flakeAt(20, 51, 3.9, p) + flakeAt(32, 56, 3.9, p) + flakeAt(44, 51, 3.9, p),

  snow_heavy: (p, d) =>
    cloudGlyph(p, 'dark') + nightStars(d, p) + flakeAt(18, 51, 3.7, p) + flakeAt(30, 56, 3.7, p) + flakeAt(42, 51, 3.7, p) + flakeAt(50, 57, 3.4, p),

  snow_showers: (p, d) =>
    behind(d, p) + cloudGlyph(p, 'light') + flakeAt(24, 52, 3.9, p, -15) + flakeAt(36, 56, 3.9, p, -15) + flakeAt(47, 51, 3.9, p, -15),

  blizzard: (p, d) =>
    cloudGlyph(p, 'dark') + nightStars(d, p) +
    flakeAt(21, 52, 4.4, p) + flakeAt(40, 53, 4.4, p) +
    flow(ln(14, 50, 30, 48, p.wind, SWT) + ln(18, 58, 40, 55, p.wind, SWT) + ln(31, 53, 52, 51, p.wind, SWT)),

  // ── Convective & severe ──
  thunderstorm: (p, d) =>
    cloudGlyph(p, 'dark') + nightStars(d, p) + boltGlyph(32, 47, 14, p),

  thunderstorm_hail: (p, d) =>
    cloudGlyph(p, 'dark') + nightStars(d, p) + boltGlyph(27, 46, 12, p) +
    pellet(43, 52, 2.5, p, p.hail) + pellet(50, 56, 2.5, p, p.hail) + pellet(41, 58, 2.5, p, p.hail),

  hurricane: (p, d) =>
    hurricaneBody(p) + (d ? '' : stars([[9, 11, 1.9], [55, 53, 1.9]], p)),

  tornado: (p, d) =>
    tornadoBody(p) + (d ? '' : stars([[11, 13, 1.9]], p)),

  // ── Wind & airborne ──
  wind:  (p, _d) => windBody(p),
  sand:  (p, _d) => sandBody(p),

  // ── Temperature extremes ──
  hot: (p, d) =>
    (d ? sunGlyph(46, 17, 6, 3.5, p) : moonGlyph(47, 17, 7, p)) + thermo(p, p.hot, 26),

  cold: (p, d) =>
    (d ? sunGlyph(46, 16, 5, 3, p) : moonGlyph(47, 16, 6, p)) + thermo(p, p.cold, 40) + flakeAt(46, 33, 2.7, p),
};

/** Map WeatherKind values without a direct icon to the closest match. */
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
  ensureAnimStyle();
  const resolvedKey = KEY_ALIAS[key] ?? key;
  const fn = ICONS[resolvedKey] ?? ICONS['cloudy'];
  const p = makePalette(theme, isDay ? 'day' : 'night');
  const inner = fn(p, isDay);
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

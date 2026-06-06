import type React from 'react';
import type { WxIconType } from './wxTypes';

interface WeatherIconDesignProps {
  type?: WxIconType;
  size?: number;
  color?: string;
  accent?: string;
  strokeWidth?: number;
}

export function WeatherIconDesign({
  type = 'clear',
  size = 24,
  color = 'currentColor',
  accent,
  strokeWidth = 1.8,
}: WeatherIconDesignProps) {
  const a = accent || color;
  const common: React.SVGProps<SVGElement> = {
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  function sunRays(cx: number, cy: number, r: number, len: number) {
    return Array.from({ length: 8 }, (_, i) => {
      const ang = (i * Math.PI) / 4;
      const x1 = cx + Math.cos(ang) * (r + 1.6);
      const y1 = cy + Math.sin(ang) * (r + 1.6);
      const x2 = cx + Math.cos(ang) * (r + 1.6 + len);
      const y2 = cy + Math.sin(ang) * (r + 1.6 + len);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />;
    });
  }

  const cloud = (extra: React.SVGProps<SVGPathElement> = {}) => (
    <path
      d="M17.5 18.5a4.5 4.5 0 0 0 .3-9 6.5 6.5 0 0 0-12.4-1.2A4.2 4.2 0 0 0 6 18.5Z"
      fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      {...extra}
    />
  );

  let body: React.ReactNode;
  switch (type) {
    case 'clear':
      body = (
        <g fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4.4" />
          {sunRays(12, 12, 4.4, 2.4)}
        </g>
      );
      break;
    case 'clear-night':
      body = <path d="M20 13.2A7.4 7.4 0 1 1 10.8 4a5.8 5.8 0 0 0 9.2 9.2Z" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />;
      break;
    case 'partly':
      body = (
        <g>
          <g fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8.5" cy="8" r="3.1" />
            {sunRays(8.5, 8, 3.1, 1.8)}
          </g>
          <path d="M18 19.5a3.6 3.6 0 0 0 .2-7.2 5.2 5.2 0 0 0-9.9-1A3.4 3.4 0 0 0 8.8 19.5Z" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
        </g>
      );
      break;
    case 'partly-night':
      body = (
        <g>
          <path d="M14.5 8.6A4.6 4.6 0 1 1 9 3.9a3.6 3.6 0 0 0 5.5 4.7Z" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18 19.5a3.6 3.6 0 0 0 .2-7.2 5.2 5.2 0 0 0-9.9-1A3.4 3.4 0 0 0 8.8 19.5Z" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
        </g>
      );
      break;
    case 'cloudy':
      body = cloud();
      break;
    case 'fog':
      body = (
        <g>
          {cloud()}
          <g stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
            <line x1="5" y1="21.5" x2="14" y2="21.5" />
            <line x1="17" y1="21.5" x2="19.5" y2="21.5" />
          </g>
        </g>
      );
      break;
    case 'rain':
      body = (
        <g>
          {cloud()}
          <g stroke={a} strokeWidth={strokeWidth} strokeLinecap="round">
            <line x1="8.5" y1="20" x2="7.5" y2="22.5" />
            <line x1="13" y1="20" x2="12" y2="22.5" />
            <line x1="17.5" y1="20" x2="16.5" y2="22.5" />
          </g>
        </g>
      );
      break;
    case 'heavy':
      body = (
        <g>
          {cloud()}
          <g stroke={a} strokeWidth={strokeWidth + 0.2} strokeLinecap="round">
            <line x1="7.5" y1="19.5" x2="6" y2="23" />
            <line x1="11" y1="19.5" x2="9.5" y2="23" />
            <line x1="14.5" y1="19.5" x2="13" y2="23" />
            <line x1="18" y1="19.5" x2="16.5" y2="23" />
          </g>
        </g>
      );
      break;
    case 'storm':
      body = (
        <g>
          {cloud()}
          <path d="M13 19l-3.2 4.2h3l-1.4 3.8" fill="none" stroke={a} strokeWidth={strokeWidth + 0.2} strokeLinecap="round" strokeLinejoin="round" transform="translate(0,-1)" />
          <g stroke={a} strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.85">
            <line x1="8" y1="20" x2="7" y2="22" />
            <line x1="17" y1="20" x2="16" y2="22" />
          </g>
        </g>
      );
      break;
    case 'snow':
      body = (
        <g>
          {cloud()}
          <g fill={a} stroke="none">
            <circle cx="8.5" cy="21" r="1" />
            <circle cx="13" cy="22" r="1" />
            <circle cx="17.5" cy="21" r="1" />
          </g>
        </g>
      );
      break;
    default:
      body = <circle cx="12" cy="12" r="4.4" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />;
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 26" style={{ display: 'block', overflow: 'visible' }}>
      {body}
    </svg>
  );
}

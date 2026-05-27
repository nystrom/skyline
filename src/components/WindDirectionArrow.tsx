/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Navigation } from 'lucide-react';

interface WindDirectionArrowProps {
  deg: number;
  size?: number;
  className?: string;
  title?: string;
  transition?: boolean;
  durationMs?: number;
}

/** Lucide Navigation arrow rotated to meteorological wind direction (degrees from north). */
export const WindDirectionArrow: React.FC<WindDirectionArrowProps> = ({
  deg,
  size = 12,
  className = '',
  title,
  transition = false,
  durationMs = 300,
}) => (
  <Navigation
    size={size}
    className={`shrink-0 ${transition ? 'transition-transform ease-out' : ''} ${className}`}
    style={{
      transform: `rotate(${deg - 45}deg)`,
      ...(transition ? { transitionDuration: `${durationMs}ms` } : {}),
    }}
    title={title ?? `Wind direction: ${Math.round(deg)}°`}
    aria-hidden
  />
);

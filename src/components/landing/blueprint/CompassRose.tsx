'use client';

/**
 * CompassRose — 16-point compass rendered in blueprint style.
 * The needle rotates when the user focuses/submits — "방위를 정한다" made literal.
 *
 * Size: 120px default. Scales linearly.
 * Only stroke, no fills except gold needle tip (when active).
 */

import { useId } from 'react';

interface CompassRoseProps {
  size?: number;
  /** Needle bearing in degrees (0 = North, 90 = East, etc.). */
  bearing?: number;
  /** When true, the needle glows gold (user has set the heading). */
  active?: boolean;
}

export function CompassRose({ size = 120, bearing = 0, active = false }: CompassRoseProps) {
  const id = useId();
  const cx = 60;
  const cy = 60;
  const needleColor = active ? 'var(--bp-gold)' : 'var(--bp-ink)';

  // 16-point rose: N, NNE, NE, ENE, E, ESE, SE, SSE, S, SSW, SW, WSW, W, WNW, NW, NNW
  const points = Array.from({ length: 16 }, (_, i) => i * 22.5);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-labelledby={id}
      role="img"
      style={{ color: 'var(--bp-ink)' }}
    >
      <title id={id}>Compass rose</title>

      {/* Outer ring */}
      <circle cx={cx} cy={cy} r="54" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx={cx} cy={cy} r="50" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <circle cx={cx} cy={cy} r="38" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.35" />
      <circle cx={cx} cy={cy} r="20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />

      {/* Tick marks — longer for cardinal (N,E,S,W), shorter for others */}
      {points.map((deg) => {
        const isCardinal = deg % 90 === 0;
        const isIntercardinal = deg % 45 === 0 && !isCardinal;
        const outer = 54;
        const inner = isCardinal ? 44 : isIntercardinal ? 47 : 50;
        const rad = ((deg - 90) * Math.PI) / 180;
        const x1 = cx + inner * Math.cos(rad);
        const y1 = cy + inner * Math.sin(rad);
        const x2 = cx + outer * Math.cos(rad);
        const y2 = cy + outer * Math.sin(rad);
        return (
          <line
            key={deg}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="currentColor"
            strokeWidth={isCardinal ? 1 : 0.5}
            opacity={isCardinal ? 1 : 0.6}
          />
        );
      })}

      {/* N/E/S/W labels */}
      <text x={cx} y="16" textAnchor="middle"
            style={{ font: '600 10px var(--font-mono), monospace', fill: 'currentColor', letterSpacing: '0.1em' }}>
        N
      </text>
      <text x="108" y={cy + 3} textAnchor="middle"
            style={{ font: '500 9px var(--font-mono), monospace', fill: 'var(--bp-ink-soft)' }}>
        E
      </text>
      <text x={cx} y="110" textAnchor="middle"
            style={{ font: '500 9px var(--font-mono), monospace', fill: 'var(--bp-ink-soft)' }}>
        S
      </text>
      <text x="12" y={cy + 3} textAnchor="middle"
            style={{ font: '500 9px var(--font-mono), monospace', fill: 'var(--bp-ink-soft)' }}>
        W
      </text>

      {/* Needle — rotates via transform. Smooth transition. */}
      <g
        style={{
          transform: `rotate(${bearing}deg)`,
          transformOrigin: `${cx}px ${cy}px`,
          transition: 'transform 900ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* North-pointing spear — diamond shape */}
        <polygon
          points={`${cx},18 ${cx - 4},${cy} ${cx},${cy + 4} ${cx + 4},${cy}`}
          fill={needleColor}
          stroke={needleColor}
          strokeWidth="0.5"
        />
        {/* South counterweight — outline diamond */}
        <polygon
          points={`${cx},${cy - 4} ${cx - 3},${cy} ${cx},102 ${cx + 3},${cy}`}
          fill="var(--bp-paper)"
          stroke="var(--bp-ink)"
          strokeWidth="1"
        />
      </g>

      {/* Center pivot */}
      <circle cx={cx} cy={cy} r="2.5" fill="var(--bp-paper)" stroke="var(--bp-ink)" strokeWidth="1" />
    </svg>
  );
}

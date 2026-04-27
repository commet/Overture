'use client';

/**
 * Compass — 16-point rose for Act 3.
 *
 * Pure SVG. Cardinal arms lengthened and labeled. Fleur-de-lis on N.
 * The needle drifts subtly via CSS animation; gold tip earns its
 * 5%-rule moment by appearing only when `bearing === 'set'`.
 */

const POINTS_16 = Array.from({ length: 16 }, (_, i) => (i * 360) / 16);

export function Compass({
  size = 168,
  bearing = 'idle',
  className,
}: {
  size?: number;
  bearing?: 'idle' | 'set';
  className?: string;
}) {
  const cx = 100;
  const cy = 100;
  const ringR = 88;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      style={{ color: 'var(--bp-ink)' }}
      aria-hidden="true"
    >
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={ringR} fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.7" />
      <circle cx={cx} cy={cy} r={ringR - 4} fill="none" stroke="currentColor" strokeWidth="0.4" opacity="0.4" />
      <circle cx={cx} cy={cy} r={36} fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />

      {/* 16 minor ticks */}
      {POINTS_16.map((deg) => {
        const isCardinal = deg % 90 === 0;
        const isInter = deg % 45 === 0 && !isCardinal;
        const r1 = ringR;
        const r2 = isCardinal ? ringR - 14 : isInter ? ringR - 10 : ringR - 5;
        const rad = (deg - 90) * (Math.PI / 180);
        const x1 = cx + r1 * Math.cos(rad);
        const y1 = cy + r1 * Math.sin(rad);
        const x2 = cx + r2 * Math.cos(rad);
        const y2 = cy + r2 * Math.sin(rad);
        return (
          <line
            key={deg}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeWidth={isCardinal ? 1 : isInter ? 0.6 : 0.4}
            opacity={isCardinal ? 0.9 : isInter ? 0.6 : 0.35}
          />
        );
      })}

      {/* Cardinal arms */}
      {[
        { d: 0, label: 'N' },
        { d: 90, label: 'E' },
        { d: 180, label: 'S' },
        { d: 270, label: 'W' },
      ].map(({ d, label }) => {
        const rad = (d - 90) * (Math.PI / 180);
        const lx = cx + (ringR + 12) * Math.cos(rad);
        const ly = cy + (ringR + 12) * Math.sin(rad);
        return (
          <g key={label}>
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                font: '600 9px var(--font-mono), monospace',
                fill: 'var(--bp-ink-soft)',
                letterSpacing: '0.12em',
              }}
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* North fleur-de-lis (the "this side is up") */}
      <g transform={`translate(${cx}, ${cy - ringR + 10})`}>
        <path d="M 0 -8 L -3 0 L 0 -2 L 3 0 Z" fill="currentColor" opacity="0.8" />
        <line x1="0" y1="-2" x2="0" y2="6" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
      </g>

      {/* Needle (drifts subtly) */}
      <g
        className="bp-needle-drift"
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        {/* North-pointing tip */}
        <polygon
          points={`${cx},${cy - 70} ${cx - 4},${cy} ${cx + 4},${cy}`}
          fill={bearing === 'set' ? 'var(--bp-gold-deep)' : 'var(--bp-ink)'}
          opacity={bearing === 'set' ? 1 : 0.85}
        />
        {/* South-pointing tail */}
        <polygon
          points={`${cx - 3},${cy} ${cx + 3},${cy} ${cx},${cy + 50}`}
          fill="var(--bp-ink-soft)"
          opacity="0.6"
        />
        {/* Hub */}
        <circle cx={cx} cy={cy} r="3.5" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="0.8" />
        <circle cx={cx} cy={cy} r="1" fill="currentColor" />
      </g>
    </svg>
  );
}

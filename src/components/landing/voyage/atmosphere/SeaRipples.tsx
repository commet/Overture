'use client';

/**
 * SeaRipples — three layered dashed wave lines drifting horizontally.
 *
 * Drift is achieved by translating the path within a wide viewBox and
 * masking the visible area; CSS handles the animation so no JS reflow.
 */

export function SeaRipples({
  className = 'absolute inset-x-0 bottom-0 w-full pointer-events-none',
  height = 140,
}: {
  className?: string;
  height?: number;
}) {
  return (
    <svg
      className={className}
      viewBox={`0 0 1440 ${height}`}
      preserveAspectRatio="none"
      style={{ height, color: 'var(--bp-ink)' }}
      aria-hidden="true"
    >
      {/* Horizon line — very faint */}
      <line
        x1="0"
        y1={height * 0.18}
        x2="1440"
        y2={height * 0.18}
        stroke="currentColor"
        strokeWidth="0.4"
        opacity="0.18"
      />
      {/* Three wave layers, ahead-of-eye to near-the-bow */}
      {[0, 1, 2].map((i) => {
        const y = height * (0.4 + i * 0.18);
        const amp = 4 + i * 2;
        return (
          <g key={i} className={`bp-wave bp-wave-${i}`}>
            <path
              d={`M -200 ${y} Q 180 ${y - amp} 540 ${y} T 1280 ${y} T 1640 ${y}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.7"
              strokeDasharray="6 9"
              opacity={0.34 - i * 0.08}
            />
          </g>
        );
      })}
    </svg>
  );
}

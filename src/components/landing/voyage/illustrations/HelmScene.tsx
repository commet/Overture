'use client';

/**
 * HelmScene — Act 3 first-person scene.
 *
 * Captain's POV at the wheel. Deck rails converge on the horizon; dawn
 * breaks gold over the distant island (Ithaca). The five stages of the
 * voyage are laid out as waypoint markers that lead the eye from the
 * foreground deck to the horizon. Synthesis sits at Ithaca itself,
 * the only point in gold — this is where the 5% rule earns its keep.
 *
 * viewBox 1200 × 680. Not interactive; the parent draws CTAs and copy
 * outside the scene.
 */

import type { Stage } from '@/data/voyage-crew';

type Locale = 'ko' | 'en';

const HORIZON_Y = 280;

export function HelmScene({
  stages,
  locale,
  className,
}: {
  stages: Stage[];
  locale: Locale;
  className?: string;
}) {
  // Five waypoint positions — receding from foreground (left, bigger) to
  // horizon (right, tiny + gold). The path is a curve to imply distance.
  const path = [
    { x: 240, y: 540, scale: 1.0 },
    { x: 380, y: 460, scale: 0.85 },
    { x: 540, y: 380, scale: 0.7 },
    { x: 720, y: 320, scale: 0.55 },
    { x: 920, y: 285, scale: 0.45 }, // Synthesis — at Ithaca
  ];

  return (
    <svg
      className={className}
      viewBox="0 0 1200 680"
      preserveAspectRatio="xMidYMid meet"
      style={{ color: 'var(--bp-ink)', width: '100%', height: '100%', display: 'block' }}
      role="img"
      aria-label="The captain's view from the helm: rails leading to the horizon and Ithaca on the dawn"
    >
      <defs>
        <linearGradient id="dawn-glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(150, 120, 46, 0)" />
          <stop offset="60%" stopColor="rgba(150, 120, 46, 0.18)" />
          <stop offset="100%" stopColor="rgba(150, 120, 46, 0.32)" />
        </linearGradient>
        <radialGradient id="sun-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="rgba(150, 120, 46, 0.6)" />
          <stop offset="60%" stopColor="rgba(150, 120, 46, 0.16)" />
          <stop offset="100%" stopColor="rgba(150, 120, 46, 0)" />
        </radialGradient>
      </defs>

      {/* ── Sky atmospherics ── */}
      <g opacity="0.8">
        <line x1="60" y1="100" x2="380" y2="100" stroke="currentColor" strokeWidth="0.4" strokeDasharray="3 8" opacity="0.3" />
        <line x1="540" y1="68" x2="900" y2="68" stroke="currentColor" strokeWidth="0.4" strokeDasharray="3 8" opacity="0.26" />
        <line x1="80" y1="160" x2="320" y2="160" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 6" opacity="0.22" />
      </g>

      {/* ── Sun — softly rising behind Ithaca ── */}
      <circle cx="940" cy="240" r="120" fill="url(#sun-glow)" />
      <circle cx="940" cy="240" r="22" fill="rgba(150, 120, 46, 0.32)" />
      <circle cx="940" cy="240" r="18" fill="none" stroke="rgba(150, 120, 46, 0.55)" strokeWidth="0.6" />

      {/* ── Distant island — Ithaca ── */}
      <path
        d="M 868 282 L 884 270 L 902 258 L 924 246 L 950 244 L 974 252 L 992 264 L 1010 274 L 1024 282 Z"
        fill="rgba(150, 120, 46, 0.18)"
        stroke="currentColor"
        strokeWidth="0.7"
        opacity="0.9"
      />
      <text
        x="940"
        y="232"
        textAnchor="middle"
        style={{
          font: '500 9.5px var(--font-mono), monospace',
          fill: 'var(--bp-gold-deep)',
          letterSpacing: '0.32em',
          textTransform: 'uppercase',
        }}
      >
        Ithaca
      </text>

      {/* ── Horizon line + dawn glow ── */}
      <line x1="0" y1={HORIZON_Y} x2="1200" y2={HORIZON_Y} stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
      <rect x="0" y={HORIZON_Y} width="1200" height="180" fill="url(#dawn-glow)" />

      {/* ── Sea / mid-ground waves ── */}
      <g>
        {[
          { y: 305, dash: '4 8', op: 0.28 },
          { y: 320, dash: '5 10', op: 0.32 },
          { y: 340, dash: '5 9', op: 0.36 },
          { y: 360, dash: '6 9', op: 0.38 },
        ].map(({ y, dash, op }, i) => (
          <path
            key={i}
            d={`M -40 ${y} Q ${260 + i * 8} ${y - 4} ${600} ${y} T ${1240} ${y}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeDasharray={dash}
            opacity={op}
          />
        ))}
      </g>

      {/* ── Deck planking — receding into the distance ── */}
      <g>
        {/* Deck floor (subtle fill) */}
        <path
          d={`M 0 680 L 0 580 L 480 ${HORIZON_Y + 80} L 720 ${HORIZON_Y + 80} L 1200 580 L 1200 680 Z`}
          fill="currentColor"
          opacity="0.05"
        />
        {/* Plank lines — converging at vanishing point */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const t = i / 6;
          // Bottom edge of plank starts at x=0..1200 on bottom (y=680)
          // and converges toward vanishing point near (600, HORIZON_Y + 80)
          const startX = -40 + t * 1280;
          const endX = 480 + t * 240;
          return (
            <line
              key={i}
              x1={startX}
              y1={680}
              x2={endX}
              y2={HORIZON_Y + 80}
              stroke="currentColor"
              strokeWidth={i === 3 ? 0.6 : 0.4}
              opacity={0.35}
              strokeDasharray={i === 3 ? '0' : '6 8'}
            />
          );
        })}
        {/* Cross planks (perpendicular) at intervals */}
        {[420, 480, 540, 600].map((y, i) => {
          const t = (680 - y) / (680 - (HORIZON_Y + 80));
          const inset = t * 480;
          return (
            <line
              key={y}
              x1={inset}
              y1={y}
              x2={1200 - inset}
              y2={y}
              stroke="currentColor"
              strokeWidth={0.5}
              opacity={0.28 + i * 0.04}
            />
          );
        })}
      </g>

      {/* ── Side rails — leading to horizon ── */}
      <g>
        {/* Left rail */}
        <line x1={-20} y1={680} x2={478} y2={HORIZON_Y + 80} stroke="currentColor" strokeWidth="1.5" />
        <line x1={20} y1={680} x2={490} y2={HORIZON_Y + 80} stroke="currentColor" strokeWidth="1" opacity="0.6" />
        {/* Right rail */}
        <line x1={1220} y1={680} x2={722} y2={HORIZON_Y + 80} stroke="currentColor" strokeWidth="1.5" />
        <line x1={1180} y1={680} x2={710} y2={HORIZON_Y + 80} stroke="currentColor" strokeWidth="1" opacity="0.6" />
        {/* Rail posts (vertical) along the converging lines */}
        {[0, 1, 2, 3, 4].map((i) => {
          const t = (i + 1) / 6;
          const lx = -20 + t * (478 - -20);
          const rx = 1220 - t * (1220 - 722);
          const y = 680 - t * (680 - (HORIZON_Y + 80));
          const postLen = 30 - t * 20;
          return (
            <g key={i}>
              <line x1={lx} y1={y} x2={lx} y2={y - postLen} stroke="currentColor" strokeWidth="0.7" opacity={0.7 - t * 0.3} />
              <line x1={rx} y1={y} x2={rx} y2={y - postLen} stroke="currentColor" strokeWidth="0.7" opacity={0.7 - t * 0.3} />
            </g>
          );
        })}
      </g>

      {/* ── Stage waypoints — connecting line + 5 markers ── */}
      <g>
        {/* Path connecting waypoints (subtle dashed curve) */}
        <path
          d={`M ${path[0].x} ${path[0].y} Q ${path[1].x} ${path[2].y - 30} ${path[2].x} ${path[2].y} T ${path[4].x} ${path[4].y}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.7"
          strokeDasharray="3 5"
          opacity="0.5"
        />
        {stages.map((stage, i) => {
          const p = path[i];
          const isFinal = i === stages.length - 1;
          const r = 7 * p.scale;
          const labelOffset = 22 * p.scale;
          return (
            <g key={stage.id}>
              {/* Marker outer ring */}
              <circle
                cx={p.x}
                cy={p.y}
                r={r + 3 * p.scale}
                fill="none"
                stroke={isFinal ? 'var(--bp-gold-deep)' : 'currentColor'}
                strokeWidth={0.6}
                opacity={isFinal ? 0.9 : 0.4}
              />
              {/* Marker dot */}
              <circle
                cx={p.x}
                cy={p.y}
                r={r}
                fill={isFinal ? 'var(--bp-gold-deep)' : 'var(--bp-paper)'}
                stroke={isFinal ? 'var(--bp-gold-deep)' : 'currentColor'}
                strokeWidth="1"
              />
              {/* Number */}
              {!isFinal && (
                <text
                  x={p.x}
                  y={p.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{
                    font: '600 9.5px var(--font-mono), monospace',
                    fill: 'var(--bp-ink)',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </text>
              )}
              {/* Label */}
              <text
                x={p.x}
                y={p.y + labelOffset + 4}
                textAnchor="middle"
                style={{
                  font: `600 ${12 * p.scale}px var(--font-mono), monospace`,
                  fill: isFinal ? 'var(--bp-gold-deep)' : 'var(--bp-ink)',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                {stage.label[locale]}
              </text>
              <text
                x={p.x}
                y={p.y + labelOffset + 18 * p.scale}
                textAnchor="middle"
                style={{
                  font: `400 ${10 * p.scale}px var(--font-mono), monospace`,
                  fill: 'var(--bp-ink-soft)',
                  letterSpacing: '0.04em',
                }}
              >
                {stage.subtitle[locale]}
              </text>
            </g>
          );
        })}
      </g>

      {/* ── Helm wheel — partial (lower half visible at bottom-center) ── */}
      <g transform="translate(600, 720)">
        {/* Outer ring */}
        <circle r="160" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="2.2" />
        <circle r="148" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
        {/* Hub */}
        <circle r="22" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="1.4" />
        <circle r="6" fill="currentColor" />
        {/* Spokes (8 of them, at all angles) */}
        {[0, 45, 90, 135].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x = Math.cos(rad) * 158;
          const y = Math.sin(rad) * 158;
          return (
            <line
              key={deg}
              x1={x}
              y1={y}
              x2={-x}
              y2={-y}
              stroke="currentColor"
              strokeWidth="1.4"
            />
          );
        })}
        {/* Spoke handles (the protruding grip pegs) */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x = Math.cos(rad) * 168;
          const y = Math.sin(rad) * 168;
          const x2 = Math.cos(rad) * 184;
          const y2 = Math.sin(rad) * 184;
          return (
            <g key={deg}>
              <line x1={x} y1={y} x2={x2} y2={y2} stroke="currentColor" strokeWidth="2" />
              <circle cx={x2} cy={y2} r="3" fill="currentColor" />
            </g>
          );
        })}
      </g>

      {/* ── Captain's hands at the wheel — implied as two grips ── */}
      <g opacity="0.85">
        <g transform="translate(440, 600)">
          <ellipse cx="0" cy="0" rx="14" ry="9" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="1.2" />
          <line x1="-8" y1="-3" x2="8" y2="-3" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
        </g>
        <g transform="translate(760, 600)">
          <ellipse cx="0" cy="0" rx="14" ry="9" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="1.2" />
          <line x1="-8" y1="-3" x2="8" y2="-3" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
        </g>
      </g>

      {/* ── A tiny mono caption ── */}
      <text
        x={600}
        y={660}
        textAnchor="middle"
        style={{
          font: '500 10px var(--font-mono), monospace',
          fill: 'var(--bp-ink-soft)',
          letterSpacing: '0.32em',
          textTransform: 'uppercase',
        }}
      >
        ⌐ at the helm
      </text>
    </svg>
  );
}

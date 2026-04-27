'use client';

/**
 * ShipCutaway — Act 2 illustration.
 *
 * The same ship from Act 1, opened lengthwise. No sails — this is the
 * structural reveal. Three internal decks; five stations at their natural
 * posts (Watch in the crow's nest, Concertmaster on the quarterdeck,
 * Cartographers and Artisans amidships, Scouts on the forecastle).
 *
 * Stations are addressable via `<g data-station="...">` so the parent can
 * highlight them in sync with the StationCards' hover state.
 */

import type { DivisionId } from '@/data/voyage-crew';

const HULL_D = `
  M 218 458
  C 250 470, 312 474, 380 474
  L 880 474
  C 940 474, 988 466, 1006 458
  L 1014 412
  C 1018 408, 1018 404, 1014 404
  L 982 404
  L 982 386
  L 1014 386
  C 1018 386, 1020 384, 1016 380
  L 1004 358
  L 996 358
  L 988 370
  L 970 370
  C 962 370, 958 376, 958 384
  L 958 404
  L 360 404
  C 348 404, 340 410, 338 420
  L 318 420
  C 286 420, 250 432, 232 450
  Z
`;

type StationGlyph = {
  id: DivisionId;
  /** Label at top of station marker — e.g. "01 · WATCH". */
  number: string;
  cx: number;
  cy: number;
  count: number;
};

const STATIONS: StationGlyph[] = [
  // Crow's nest — high on the mainmast, alone in the air
  { id: 'watch', number: '01', cx: 600, cy: 178, count: 3 },
  // Forecastle — Scouts at the bow rail
  { id: 'scouts', number: '02', cx: 920, cy: 422, count: 3 },
  // Mid main deck — Cartographers at the chart table under the mainmast
  { id: 'cartographers', number: '03', cx: 600, cy: 422, count: 3 },
  // Main deck open area — Artisans at workbenches
  { id: 'artisans', number: '04', cx: 460, cy: 422, count: 7 },
  // Quarterdeck — Concertmaster beside the helm
  { id: 'concertmaster', number: '05', cx: 304, cy: 422, count: 1 },
];

function StationMarker({
  station,
  active,
  onEnter,
  onLeave,
}: {
  station: StationGlyph;
  active: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const r = 11;
  return (
    <g
      data-station={station.id}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={(e) => {
        // Touch path: tap activates (mouseenter doesn't fire on touch).
        e.stopPropagation();
        onEnter();
      }}
      style={{ cursor: 'pointer' }}
    >
      {/* Outer ring */}
      <circle
        cx={station.cx}
        cy={station.cy}
        r={r + 5}
        fill="none"
        stroke="currentColor"
        strokeWidth={active ? 1 : 0.5}
        opacity={active ? 0.8 : 0.35}
      />
      {/* Filled disk with number */}
      <circle
        cx={station.cx}
        cy={station.cy}
        r={r}
        fill={active ? 'var(--bp-ink)' : 'var(--bp-paper)'}
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <text
        className="cutaway-annotation"
        x={station.cx}
        y={station.cy}
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          font: '600 10px var(--font-mono), monospace',
          fill: active ? 'var(--bp-paper)' : 'var(--bp-ink)',
          letterSpacing: '0.04em',
        }}
      >
        {station.number}
      </text>
    </g>
  );
}

export function ShipCutaway({
  className,
  activeStation,
  onStationHover,
}: {
  className?: string;
  activeStation: DivisionId | null;
  onStationHover: (id: DivisionId | null) => void;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 600"
      preserveAspectRatio="xMidYMid meet"
      style={{ color: 'var(--bp-ink)', width: '100%', height: '100%', display: 'block' }}
      role="img"
      aria-label="Cutaway diagram of the ship showing five crew stations"
    >
      {/* ── Plate frame margin (ornamental) ── */}
      <g opacity="0.35">
        {[8, 14].map((m) => (
          <rect
            key={m}
            x={m}
            y={m}
            width={1200 - m * 2}
            height={600 - m * 2}
            fill="none"
            stroke="currentColor"
            strokeWidth={m === 8 ? 0.8 : 0.4}
          />
        ))}
      </g>

      {/* ── Plate caption rule ── */}
      <line x1="60" y1="46" x2="220" y2="46" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
      <line x1="980" y1="46" x2="1140" y2="46" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
      <text
        className="cutaway-annotation"
        x="600"
        y="50"
        textAnchor="middle"
        style={{
          font: '500 11px var(--font-mono), monospace',
          fill: 'var(--bp-ink-soft)',
          letterSpacing: '0.32em',
        }}
      >
        PLATE II — INTERNAL ARRANGEMENT
      </text>

      {/* ── Dim faint waterline + sea (so the ship sits in context) ── */}
      <line x1="40" y1="490" x2="1160" y2="490" stroke="currentColor" strokeWidth="0.3" opacity="0.25" />
      {[504, 520, 540].map((y, i) => (
        <path
          key={y}
          d={`M 60 ${y} Q 360 ${y - 4} 600 ${y} T 1140 ${y}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeDasharray="4 8"
          opacity={0.25 - i * 0.05}
        />
      ))}

      {/* ── Hull outline (closed) ── */}
      <path d={HULL_D} fill="var(--bp-paper)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />

      {/* ── Internal decks (cutaway reveals) ── */}
      {/* Quarterdeck (raised stern) */}
      <line x1="220" y1="416" x2="338" y2="416" stroke="currentColor" strokeWidth="1" />
      <line x1="338" y1="404" x2="338" y2="416" stroke="currentColor" strokeWidth="0.7" />
      {/* Main deck (full length) */}
      <line x1="338" y1="404" x2="958" y2="404" stroke="currentColor" strokeWidth="1" />
      {/* Lower deck — implied via dashed line below main deck */}
      <line
        x1="240"
        y1="438"
        x2="980"
        y2="438"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeDasharray="5 6"
        opacity="0.5"
      />
      {/* Hold floor (bilge — bottom of ship interior) */}
      <line
        x1="280"
        y1="462"
        x2="940"
        y2="462"
        stroke="currentColor"
        strokeWidth="0.4"
        strokeDasharray="3 5"
        opacity="0.35"
      />

      {/* ── Mast bases (just the poles, no sails) ── */}
      {/* Mainmast — extends up to crow's nest area for the Watch station */}
      <line x1="600" y1="404" x2="600" y2="100" stroke="currentColor" strokeWidth="1.5" />
      {/* Crow's nest (mainmast — Watch station) */}
      <ellipse cx="600" cy="178" rx="22" ry="6" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="0.9" />
      <line x1="578" y1="178" x2="578" y2="192" stroke="currentColor" strokeWidth="0.5" />
      <line x1="622" y1="178" x2="622" y2="192" stroke="currentColor" strokeWidth="0.5" />
      {/* Top of mast pennant */}
      <circle cx="600" cy="92" r="2" fill="currentColor" />
      <line x1="600" y1="88" x2="600" y2="74" stroke="currentColor" strokeWidth="0.6" />

      {/* Mizzenmast (left) */}
      <line x1="372" y1="404" x2="372" y2="226" stroke="currentColor" strokeWidth="1.4" />
      <ellipse cx="372" cy="252" rx="14" ry="4.5" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="0.7" />
      <circle cx="372" cy="218" r="1.6" fill="currentColor" />

      {/* Foremast (right) */}
      <line x1="780" y1="404" x2="780" y2="178" stroke="currentColor" strokeWidth="1.4" />
      <ellipse cx="780" cy="206" rx="16" ry="5" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="0.7" />
      <circle cx="780" cy="170" r="1.8" fill="currentColor" />

      {/* ── Bowsprit ── */}
      <line x1="958" y1="392" x2="1100" y2="340" stroke="currentColor" strokeWidth="1.3" />

      {/* ── Stern transom (just the windows for continuity) ── */}
      <g>
        <rect x="226" y="430" width="8" height="9" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="0.4" />
        <rect x="236" y="430" width="8" height="9" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="0.4" />
        <rect x="246" y="430" width="8" height="9" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="0.4" />
        <line x1="220" y1="404" x2="220" y2="460" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
      </g>

      {/* ── Helm wheel — at the quarterdeck where the captain stands ── */}
      <g transform="translate(286, 408)">
        <circle r="9" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="0.9" />
        <circle r="2.5" fill="currentColor" />
        {[0, 45, 90, 135].map((deg) => (
          <line
            key={deg}
            x1={Math.cos((deg * Math.PI) / 180) * 9}
            y1={Math.sin((deg * Math.PI) / 180) * 9}
            x2={-Math.cos((deg * Math.PI) / 180) * 9}
            y2={-Math.sin((deg * Math.PI) / 180) * 9}
            stroke="currentColor"
            strokeWidth="0.5"
            opacity="0.7"
          />
        ))}
      </g>
      <text
        className="cutaway-annotation"
        x={286}
        y={394}
        textAnchor="middle"
        style={{
          font: '500 9px var(--font-mono), monospace',
          fill: 'var(--bp-ink-soft)',
          letterSpacing: '0.18em',
        }}
      >
        HELM
      </text>

      {/* ── Captain — small figure standing at the helm ── */}
      <g transform="translate(316, 396)">
        <circle cx="0" cy="-6" r="2.4" fill="var(--bp-ink)" />
        <line x1="0" y1="-3.5" x2="0" y2="6" stroke="currentColor" strokeWidth="1.2" />
        <line x1="-3" y1="-1" x2="3" y2="-1" stroke="currentColor" strokeWidth="0.8" />
        <line x1="0" y1="6" x2="-2.5" y2="13" stroke="currentColor" strokeWidth="0.8" />
        <line x1="0" y1="6" x2="2.5" y2="13" stroke="currentColor" strokeWidth="0.8" />
      </g>
      <text
        className="cutaway-annotation"
        x={316}
        y={362}
        textAnchor="middle"
        style={{
          font: '500 9px var(--font-mono), monospace',
          fill: 'var(--bp-ink-soft)',
          letterSpacing: '0.16em',
        }}
      >
        ⌐ THE CAPTAIN
      </text>

      {/* ── Distant land at horizon ── */}
      <path
        d="M 60 488 L 86 482 L 110 478 L 132 484 L 156 488 Z"
        fill="currentColor"
        opacity="0.06"
      />
      <path
        d="M 60 488 L 86 482 L 110 478 L 132 484 L 156 488"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.35"
      />

      {/* ── Station markers ── */}
      {STATIONS.map((s) => (
        <StationMarker
          key={s.id}
          station={s}
          active={activeStation === s.id}
          onEnter={() => onStationHover(s.id)}
          onLeave={() => onStationHover(null)}
        />
      ))}

      {/* ── Information flow lines (faint connectors between stations) ── */}
      <g opacity={activeStation ? 0.5 : 0.25} style={{ transition: 'opacity 220ms ease' }}>
        {/* Watch → Captain (lookout shouts down) */}
        <path d="M 600 192 Q 460 280 320 392" fill="none" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 5" />
        {/* Scouts → Cartographers (intel) */}
        <path d="M 904 422 L 622 422" fill="none" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 5" />
        {/* Cartographers → Artisans (plan handoff) */}
        <path d="M 580 422 L 480 422" fill="none" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 5" />
        {/* Artisans → Concertmaster (build → unify) */}
        <path d="M 440 422 L 324 422" fill="none" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 5" />
      </g>
    </svg>
  );
}

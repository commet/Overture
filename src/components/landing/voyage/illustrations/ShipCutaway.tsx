'use client';

/**
 * ShipCutaway — Act 2 illustration (top-down deck plan).
 *
 * Bow faces right, stern at left. The viewer looks straight down at the
 * deck, naval-blueprint style. Five station zones laid out along the deck
 * length, each populated with figures-at-work (silhouette + tool).
 *
 * Reading the deck left → right also reads the work flow:
 *   Helm (1st Mate) → Chart table (Cartographers) → Workshop (Artisans)
 *   → Forecastle (Watch) → Forward rail (Scouts).
 *
 * Stations are addressable via `<g data-station="...">` so the parent can
 * highlight them in sync with the StationCards' hover state.
 */

import type { DivisionId } from '@/data/voyage-crew';

// ────────────────────────────────────────────────────────────────────
// Geometry (top-down deck, bow right)
// ────────────────────────────────────────────────────────────────────

// Ship outline — flat stern (left), pointed bow (right)
const DECK_OUTLINE = `
  M 110 160
  L 1010 160
  C 1060 160, 1110 188, 1148 250
  C 1110 312, 1060 340, 1010 340
  L 110 340
  C 96 340, 88 332, 88 320
  L 88 180
  C 88 168, 96 160, 110 160
  Z
`;

// Inner deck (slightly inset — gives the bulwark thickness)
const DECK_INNER = `
  M 124 174
  L 1004 174
  C 1048 174, 1092 198, 1126 250
  C 1092 302, 1048 326, 1004 326
  L 124 326
  C 116 326, 110 320, 110 312
  L 110 188
  C 110 180, 116 174, 124 174
  Z
`;

// Mast positions (cross-sections from above)
const MIZZEN = { cx: 230, cy: 250, r: 9 };
const MAINMAST = { cx: 560, cy: 250, r: 11 };
const FOREMAST = { cx: 880, cy: 250, r: 9 };

// Helm wheel
const HELM = { cx: 158, cy: 250, r: 22 };

// ────────────────────────────────────────────────────────────────────
// Helper components
// ────────────────────────────────────────────────────────────────────

/** A single deckhand seen from above: head circle + shoulders. */
function Figure({
  cx,
  cy,
  r = 5,
  active = false,
}: {
  cx: number;
  cy: number;
  r?: number;
  active?: boolean;
}) {
  return (
    <g>
      {/* shoulders (oval) */}
      <ellipse
        cx={cx}
        cy={cy + 2}
        rx={r * 1.4}
        ry={r * 0.85}
        fill={active ? 'var(--bp-ink)' : 'var(--bp-paper)'}
        stroke="currentColor"
        strokeWidth={active ? 1.1 : 0.9}
      />
      {/* head (circle, slightly forward) */}
      <circle
        cx={cx}
        cy={cy - 0.5}
        r={r * 0.65}
        fill={active ? 'var(--bp-paper)' : 'var(--bp-ink)'}
        stroke="currentColor"
        strokeWidth={0.6}
      />
    </g>
  );
}

/** Mono station label used inside each station group. */
function StationLabel({
  x,
  y,
  number,
  text,
  align = 'middle',
}: {
  x: number;
  y: number;
  number: string;
  text: string;
  align?: 'start' | 'middle' | 'end';
}) {
  return (
    <g>
      <text
        x={x}
        y={y}
        textAnchor={align}
        style={{
          font: '600 9px var(--font-mono), monospace',
          fill: 'var(--bp-ink)',
          letterSpacing: '0.18em',
        }}
      >
        {`No. ${number}`}
      </text>
      <text
        x={x}
        y={y + 12}
        textAnchor={align}
        style={{
          font: '500 9.5px var(--font-mono), monospace',
          fill: 'var(--bp-ink-soft)',
          letterSpacing: '0.32em',
        }}
      >
        {text}
      </text>
    </g>
  );
}

// ────────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────────

export function ShipCutaway({
  className,
  activeStation,
  onStationHover,
}: {
  className?: string;
  activeStation: DivisionId | null;
  onStationHover: (id: DivisionId | null) => void;
}) {
  const isActive = (id: DivisionId) => activeStation === id;

  // Hover handler factory.
  const stationHandlers = (id: DivisionId) => ({
    onMouseEnter: () => onStationHover(id),
    onMouseLeave: () => onStationHover(null),
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      onStationHover(id);
    },
  });

  // Soft station-zone backdrop (only on active hover) — gives the figures a
  // subtle frame of focus without a hard rectangle drawn at rest.
  const ZoneBackdrop = ({ x, y, w, h, id }: { x: number; y: number; w: number; h: number; id: DivisionId }) => (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      fill="var(--bp-ink)"
      opacity={isActive(id) ? 0.045 : 0}
      style={{ transition: 'opacity 200ms ease', pointerEvents: 'none' }}
    />
  );

  return (
    <svg
      className={className}
      viewBox="0 0 1200 500"
      preserveAspectRatio="xMidYMid meet"
      style={{ color: 'var(--bp-ink)', width: '100%', height: '100%', display: 'block' }}
      role="img"
      aria-label="Top-down deck plan showing five crew stations along the ship"
    >
      {/* ── Plate frame (ornamental double border) ── */}
      <g opacity="0.35">
        {[8, 14].map((m) => (
          <rect
            key={m}
            x={m}
            y={m}
            width={1200 - m * 2}
            height={500 - m * 2}
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
        PLATE II — DECK PLAN
      </text>

      {/* ── Compass rose (indicates bow direction) ── */}
      <g transform="translate(74, 86)" opacity="0.55">
        <circle r="20" fill="none" stroke="currentColor" strokeWidth="0.5" />
        <circle r="14" fill="none" stroke="currentColor" strokeWidth="0.3" />
        {/* 4 cardinal points */}
        {[0, 90, 180, 270].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = Math.cos(rad) * 14;
          const y1 = Math.sin(rad) * 14;
          const x2 = Math.cos(rad) * 20;
          const y2 = Math.sin(rad) * 20;
          return (
            <line
              key={deg}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeWidth="0.6"
            />
          );
        })}
        {/* Bow needle (points right = ship's bow) */}
        <path d="M 0 0 L 18 0 L 14 -2.5 M 18 0 L 14 2.5" fill="none" stroke="currentColor" strokeWidth="0.9" />
        <text
          x="24"
          y="3"
          style={{ font: '500 8px var(--font-mono), monospace', fill: 'var(--bp-ink-soft)', letterSpacing: '0.18em' }}
        >
          BOW
        </text>
      </g>

      {/* ── Hull outline (top-down silhouette) ── */}
      <path d={DECK_OUTLINE} fill="var(--bp-paper)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      {/* Inner deck edge — defines bulwark thickness */}
      <path d={DECK_INNER} fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.6" />

      {/* ── Deck planks (subtle horizontal lines along ship length) ── */}
      <g opacity="0.15">
        {[200, 220, 240, 260, 280, 300].map((y) => (
          <line key={y} x1="130" y1={y} x2={y === 240 || y === 260 ? 1110 : 1080} y2={y} stroke="currentColor" strokeWidth="0.4" />
        ))}
      </g>

      {/* ── Stern transom detail (left edge, just for plate richness) ── */}
      <g opacity="0.55">
        <line x1="92" y1="200" x2="116" y2="200" stroke="currentColor" strokeWidth="0.5" />
        <line x1="92" y1="220" x2="116" y2="220" stroke="currentColor" strokeWidth="0.5" />
        <line x1="92" y1="280" x2="116" y2="280" stroke="currentColor" strokeWidth="0.5" />
        <line x1="92" y1="300" x2="116" y2="300" stroke="currentColor" strokeWidth="0.5" />
      </g>

      {/* ── Hatches (cargo openings on deck) ── */}
      <g opacity="0.7">
        {/* Forward hatch */}
        <rect x="660" y="234" width="36" height="32" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="0.7" />
        <line x1="660" y1="250" x2="696" y2="250" stroke="currentColor" strokeWidth="0.4" />
        <line x1="678" y1="234" x2="678" y2="266" stroke="currentColor" strokeWidth="0.4" />
        {/* Aft hatch */}
        <rect x="384" y="294" width="28" height="22" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="0.7" />
        <line x1="384" y1="305" x2="412" y2="305" stroke="currentColor" strokeWidth="0.4" />
      </g>

      {/* ── Bowsprit (forward of bow tip) ── */}
      <line x1="1148" y1="250" x2="1180" y2="250" stroke="currentColor" strokeWidth="1.3" />
      <line x1="1148" y1="246" x2="1148" y2="254" stroke="currentColor" strokeWidth="0.6" />

      {/* ── Mast cross-sections (3 masts as circles) ── */}
      {[MIZZEN, MAINMAST, FOREMAST].map((m, i) => (
        <g key={i}>
          <circle cx={m.cx} cy={m.cy} r={m.r} fill="var(--bp-paper)" stroke="currentColor" strokeWidth="1.2" />
          <circle cx={m.cx} cy={m.cy} r={m.r * 0.55} fill="currentColor" opacity="0.85" />
        </g>
      ))}

      {/* ── STATION 01 · CONCERTMASTER (1st Mate at helm) ── */}
      <g
        data-station="concertmaster"
        {...stationHandlers('concertmaster')}
        style={{
          opacity: activeStation && !isActive('concertmaster') ? 0.45 : 1,
          transition: 'opacity 200ms ease',
          cursor: 'pointer',
        }}
      >
        <ZoneBackdrop x={88} y={170} w={138} h={160} id="concertmaster" />
        {/* Helm wheel */}
        <g transform={`translate(${HELM.cx}, ${HELM.cy})`}>
          <circle r={HELM.r} fill="var(--bp-paper)" stroke="currentColor" strokeWidth="1.1" />
          <circle r={HELM.r - 5} fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
          <circle r="3" fill="currentColor" />
          {[0, 30, 60, 90, 120, 150].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            return (
              <line
                key={deg}
                x1={Math.cos(rad) * HELM.r}
                y1={Math.sin(rad) * HELM.r}
                x2={-Math.cos(rad) * HELM.r}
                y2={-Math.sin(rad) * HELM.r}
                stroke="currentColor"
                strokeWidth="0.7"
                opacity="0.7"
              />
            );
          })}
        </g>
        {/* 1st Mate figure beside the wheel */}
        <Figure cx={195} cy={250} r={6.5} active={isActive('concertmaster')} />
        {/* Signaling arm — line from figure pointing forward (to the rest of the crew) */}
        <line x1="200" y1="250" x2="218" y2="246" stroke="currentColor" strokeWidth="1" />
        <circle cx="220" cy="245" r="1.6" fill="currentColor" />

        <StationLabel x={158} y={188} number="01" text="FIRST MATE" />
      </g>

      {/* ── STATION 02 · CARTOGRAPHERS (chart table near mizzenmast) ── */}
      <g
        data-station="cartographers"
        {...stationHandlers('cartographers')}
        style={{
          opacity: activeStation && !isActive('cartographers') ? 0.45 : 1,
          transition: 'opacity 200ms ease',
          cursor: 'pointer',
        }}
      >
        <ZoneBackdrop x={262} y={170} w={184} h={160} id="cartographers" />
        {/* Chart table */}
        <rect
          x="296"
          y="226"
          width="120"
          height="48"
          fill="var(--bp-paper)"
          stroke="currentColor"
          strokeWidth="0.9"
        />
        {/* Chart contents (stylized course lines + compass mark) */}
        <g opacity="0.55">
          <path
            d="M 308 246 Q 332 238 354 248 T 404 250"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeDasharray="3 3"
          />
          <circle cx="312" cy="246" r="1.5" fill="currentColor" />
          <circle cx="402" cy="252" r="1.5" fill="currentColor" />
          {/* mini compass on chart */}
          <circle cx="384" cy="266" r="4" fill="none" stroke="currentColor" strokeWidth="0.4" />
          <line x1="384" y1="262" x2="384" y2="270" stroke="currentColor" strokeWidth="0.4" />
          <line x1="380" y1="266" x2="388" y2="266" stroke="currentColor" strokeWidth="0.4" />
        </g>

        {/* 3 figures around the table */}
        <Figure cx={314} cy={210} r={5.5} active={isActive('cartographers')} />
        <Figure cx={398} cy={210} r={5.5} active={isActive('cartographers')} />
        <Figure cx={356} cy={290} r={5.5} active={isActive('cartographers')} />
        {/* Pen / compass tool extending from one figure (arm reaching to chart) */}
        <line x1="356" y1="285" x2="356" y2="270" stroke="currentColor" strokeWidth="0.9" />
        <line x1="354" y1="270" x2="358" y2="270" stroke="currentColor" strokeWidth="0.9" />

        <StationLabel x={356} y={188} number="02" text="CARTOGRAPHERS" />
      </g>

      {/* ── STATION 03 · ARTISANS (workshop, mid-deck) ── */}
      <g
        data-station="artisans"
        {...stationHandlers('artisans')}
        style={{
          opacity: activeStation && !isActive('artisans') ? 0.45 : 1,
          transition: 'opacity 200ms ease',
          cursor: 'pointer',
        }}
      >
        <ZoneBackdrop x={460} y={170} w={326} h={160} id="artisans" />
        {/* Workbench (small rect near each figure cluster) */}
        <rect x="496" y="206" width="32" height="14" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="0.6" opacity="0.7" />
        <rect x="708" y="282" width="32" height="14" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="0.6" opacity="0.7" />

        {/* 7 figures spread across the workshop area */}
        {/* Top row */}
        <Figure cx={510} cy={196} r={5} active={isActive('artisans')} />
        {/* Pen */}
        <line x1="514" y1="200" x2="520" y2="208" stroke="currentColor" strokeWidth="0.7" />

        <Figure cx={612} cy={196} r={5} active={isActive('artisans')} />
        {/* Hammer */}
        <line x1="616" y1="198" x2="624" y2="194" stroke="currentColor" strokeWidth="0.9" />
        <rect x="623" y="191" width="5" height="6" fill="currentColor" opacity="0.85" />

        <Figure cx={742} cy={196} r={5} active={isActive('artisans')} />
        {/* Brush */}
        <line x1="746" y1="200" x2="752" y2="208" stroke="currentColor" strokeWidth="0.7" />
        <line x1="751" y1="207" x2="754" y2="211" stroke="currentColor" strokeWidth="0.5" />

        {/* Bottom row */}
        <Figure cx={520} cy={304} r={5} active={isActive('artisans')} />
        {/* Abacus / counting beads */}
        <rect x="514" y="312" width="14" height="6" fill="none" stroke="currentColor" strokeWidth="0.6" />
        <circle cx="517" cy="315" r="1" fill="currentColor" />
        <circle cx="521" cy="315" r="1" fill="currentColor" />
        <circle cx="525" cy="315" r="1" fill="currentColor" />

        <Figure cx={620} cy={304} r={5} active={isActive('artisans')} />
        {/* Compass */}
        <g transform="translate(620, 314)">
          <circle r="3.5" fill="none" stroke="currentColor" strokeWidth="0.6" />
          <line x1="0" y1="-3.5" x2="0" y2="3.5" stroke="currentColor" strokeWidth="0.5" />
          <line x1="-3.5" y1="0" x2="3.5" y2="0" stroke="currentColor" strokeWidth="0.5" />
        </g>

        <Figure cx={724} cy={304} r={5} active={isActive('artisans')} />
        {/* Saw — tool indication */}
        <line x1="728" y1="306" x2="738" y2="304" stroke="currentColor" strokeWidth="0.7" />
        <path d="M 729 305 L 730 307 L 731 305 L 732 307 L 733 305" fill="none" stroke="currentColor" strokeWidth="0.4" />

        {/* Center figure (PM-ish, surrounded by others) */}
        <Figure cx={620} cy={250} r={5.5} active={isActive('artisans')} />
        {/* Clipboard / scroll */}
        <rect x="624" y="248" width="8" height="6" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="0.5" />
        <line x1="625" y1="251" x2="631" y2="251" stroke="currentColor" strokeWidth="0.3" />

        <StationLabel x={620} y={186} number="03" text="ARTISANS" />
      </g>

      {/* ── STATION 04 · WATCH (forecastle lookout, near foremast) ── */}
      <g
        data-station="watch"
        {...stationHandlers('watch')}
        style={{
          opacity: activeStation && !isActive('watch') ? 0.45 : 1,
          transition: 'opacity 200ms ease',
          cursor: 'pointer',
        }}
      >
        <ZoneBackdrop x={812} y={170} w={132} h={160} id="watch" />

        {/* Crow's nest indicator — concentric circle around foremast */}
        <circle cx={FOREMAST.cx} cy={FOREMAST.cy} r={20} fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.55" />

        {/* 3 watch figures clustered near the foremast (the lookout post) */}
        <Figure cx={848} cy={222} r={5.5} active={isActive('watch')} />
        {/* Telescope — long line extending forward */}
        <line x1="853" y1="222" x2="888" y2="220" stroke="currentColor" strokeWidth="1.1" />
        <rect x="884" y="218" width="6" height="4" fill="currentColor" opacity="0.85" />

        <Figure cx={848} cy={284} r={5.5} active={isActive('watch')} />
        {/* hand cupped to brow (looking far) */}
        <line x1="852" y1="282" x2="858" y2="278" stroke="currentColor" strokeWidth="0.8" />

        <Figure cx={918} cy={250} r={5.5} active={isActive('watch')} />
        {/* signal / journal */}
        <rect x="922" y="247" width="6" height="6" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="0.5" />

        <StationLabel x={878} y={186} number="04" text="THE WATCH" />
      </g>

      {/* ── STATION 05 · SCOUTS (bow tip, forward railing) ── */}
      <g
        data-station="scouts"
        {...stationHandlers('scouts')}
        style={{
          opacity: activeStation && !isActive('scouts') ? 0.45 : 1,
          transition: 'opacity 200ms ease',
          cursor: 'pointer',
        }}
      >
        <ZoneBackdrop x={960} y={170} w={170} h={160} id="scouts" />
        {/* Forward railing arc (curve) */}
        <path
          d="M 1000 192 Q 1100 250 1000 308"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.7"
          opacity="0.55"
        />
        {/* 3 scout figures */}
        <Figure cx={996} cy={224} r={5.5} active={isActive('scouts')} />
        {/* arm pointing forward */}
        <line x1="1001" y1="224" x2="1018" y2="220" stroke="currentColor" strokeWidth="0.9" />

        <Figure cx={996} cy={278} r={5.5} active={isActive('scouts')} />
        {/* measuring rope (curve dropped down) */}
        <path d="M 1001 280 Q 1018 290 1024 308" fill="none" stroke="currentColor" strokeWidth="0.7" />
        <circle cx={1024} cy={308} r="1.5" fill="currentColor" />

        <Figure cx={1056} cy={250} r={5.5} active={isActive('scouts')} />
        {/* spyglass / notebook */}
        <rect x="1060" y="247" width="6" height="6" fill="currentColor" opacity="0.7" />

        <StationLabel x={1040} y={186} number="05" text="SCOUTS" />
      </g>

      {/* ── Information flow lines (faint connectors between stations) ── */}
      <g opacity={activeStation ? 0.55 : 0.22} style={{ transition: 'opacity 220ms ease', pointerEvents: 'none' }}>
        {/* Scouts → Watch (intel passed from bow back) */}
        <path d="M 990 250 Q 950 250 906 250" fill="none" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 5" />
        {/* Watch → Cartographers (lookout intel to chart table) */}
        <path d="M 838 250 Q 700 252 446 252" fill="none" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 5" />
        {/* Cartographers → Artisans (plan to execution) */}
        <path d="M 446 250 Q 480 250 522 250" fill="none" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 5" />
        {/* Artisans → 1st Mate (work to synthesizer) */}
        <path d="M 502 250 Q 380 248 232 250" fill="none" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 5" />
      </g>

      {/* ── Distant horizon hint (small mark at bow side) ── */}
      <g opacity="0.4">
        <line x1="1156" y1="248" x2="1168" y2="248" stroke="currentColor" strokeWidth="0.4" />
        <text
          x="1172"
          y="251"
          style={{ font: '500 8px var(--font-mono), monospace', fill: 'var(--bp-ink-soft)', letterSpacing: '0.18em' }}
        >
          →
        </text>
      </g>
    </svg>
  );
}

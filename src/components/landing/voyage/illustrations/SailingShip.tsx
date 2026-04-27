'use client';

/**
 * SailingShip — Act 1 hero illustration.
 *
 * 18th-c. naval-print style three-masted ship under sail, drawn in pure SVG
 * using 0.4–1.8px ink strokes only. Ship sails to the right (bow on right,
 * stern on left, bowsprit extending into the wind). Sails billow leeward.
 *
 * Composition uses a 1200 × 600 viewBox. Coordinates are in "ink units";
 * the parent scales the SVG to fit. Ratlines, halyards, jib stays, and
 * stern transom decoration are drawn explicitly to give the ship the
 * visual richness of a Chapman-era plate without resorting to raster.
 *
 *   y =   0  → top of sky frame
 *   y = 480  → sea horizon
 *   y = 480–600  → wave foreground
 */

type Props = {
  className?: string;
  /** When false, mount-time entrance animations skip. */
  animate?: boolean;
};

const HORIZON_Y = 480;

// Hull silhouette. One closed path; the curve at stern is steeper than bow,
// matching the era's convention of the high-castled stern.
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

// Distant land silhouette — broken hill outline (Ithaca on the far shore)
const DISTANT_LAND_D = `
  M 60 482
  L 78 478
  L 96 470
  L 118 464
  L 142 458
  L 168 462
  L 196 470
  L 222 478
  L 244 482
`;

function Sail({
  d,
  delay = 0,
  animate = true,
}: {
  d: string;
  delay?: number;
  animate?: boolean;
}) {
  return (
    <path
      d={d}
      fill="var(--bp-paper)"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="round"
      className={animate ? 'bp-sail-unfurl' : undefined}
      style={animate ? { animationDelay: `${delay}ms` } : undefined}
    />
  );
}

/** A single billowing square sail with reef bands and clew lines. */
function SquareSail({
  cx,
  spread,
  yTop,
  yBottom,
  belly = 12,
  windLean = 0,
  delay = 0,
  animate = true,
}: {
  cx: number;
  spread: number;     // half-width
  yTop: number;
  yBottom: number;
  belly?: number;     // outward bulge of bottom edge
  windLean?: number;  // px, leaned to leeward (bottom shifts -x)
  delay?: number;
  animate?: boolean;
}) {
  const left = cx - spread;
  const right = cx + spread;
  // Bottom corners shift leftward (lee) by windLean, midpoint sags down by belly.
  const bottomLeftX = left - windLean;
  const bottomRightX = right - windLean;
  const sailD = `
    M ${left} ${yTop}
    L ${right} ${yTop}
    Q ${right + 4} ${yTop + (yBottom - yTop) * 0.5} ${bottomRightX + 2} ${yBottom}
    Q ${cx - windLean} ${yBottom + belly} ${bottomLeftX - 2} ${yBottom}
    Q ${left - 4} ${yTop + (yBottom - yTop) * 0.5} ${left} ${yTop}
    Z
  `;
  const sparExtend = 5;
  return (
    <g>
      {/* Sail body */}
      <Sail d={sailD} delay={delay} animate={animate} />
      {/* Reef bands */}
      <line
        x1={left + 4}
        y1={yTop + (yBottom - yTop) * 0.36}
        x2={right - 4}
        y2={yTop + (yBottom - yTop) * 0.36}
        stroke="currentColor"
        strokeWidth="0.4"
        strokeDasharray="2 4"
        opacity="0.5"
      />
      <line
        x1={left + 4}
        y1={yTop + (yBottom - yTop) * 0.62}
        x2={right - 4}
        y2={yTop + (yBottom - yTop) * 0.62}
        stroke="currentColor"
        strokeWidth="0.4"
        strokeDasharray="2 4"
        opacity="0.5"
      />
      {/* Spar (yard) — top */}
      <line
        x1={left - sparExtend}
        y1={yTop}
        x2={right + sparExtend}
        y2={yTop}
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx={left - sparExtend} cy={yTop} r="1.4" fill="currentColor" />
      <circle cx={right + sparExtend} cy={yTop} r="1.4" fill="currentColor" />
      {/* Clew lines (rope tension at bottom corners) */}
      <line
        x1={bottomLeftX - 2}
        y1={yBottom}
        x2={bottomLeftX - 8}
        y2={yBottom + 14}
        stroke="currentColor"
        strokeWidth="0.4"
        opacity="0.7"
      />
      <line
        x1={bottomRightX + 2}
        y1={yBottom}
        x2={bottomRightX + 6}
        y2={yBottom + 12}
        stroke="currentColor"
        strokeWidth="0.4"
        opacity="0.7"
      />
    </g>
  );
}

/** Ratline ladder rungs across a triangular shroud bay. */
function Ratlines({
  topX,
  topY,
  baseLeftX,
  baseRightX,
  baseY,
  rungs = 8,
}: {
  topX: number;
  topY: number;
  baseLeftX: number;
  baseRightX: number;
  baseY: number;
  rungs?: number;
}) {
  const lines: React.ReactElement[] = [];
  // Outer shrouds (3-4 ropes from masthead to hull spreader)
  const shroudCount = 4;
  const positions = Array.from({ length: shroudCount }, (_, i) => {
    const t = i / (shroudCount - 1);
    return baseLeftX + t * (baseRightX - baseLeftX);
  });
  positions.forEach((bx, idx) => {
    lines.push(
      <line
        key={`shroud-${idx}`}
        x1={topX}
        y1={topY}
        x2={bx}
        y2={baseY}
        stroke="currentColor"
        strokeWidth="0.4"
        opacity="0.55"
      />,
    );
  });
  // Horizontal ratline rungs
  for (let i = 1; i <= rungs; i++) {
    const t = i / (rungs + 1);
    const y = topY + t * (baseY - topY);
    const leftX = topX + t * (baseLeftX - topX);
    const rightX = topX + t * (baseRightX - topX);
    lines.push(
      <line
        key={`rung-${i}`}
        x1={leftX}
        y1={y}
        x2={rightX}
        y2={y}
        stroke="currentColor"
        strokeWidth="0.3"
        opacity="0.45"
      />,
    );
  }
  return <g>{lines}</g>;
}

export function SailingShip({ className, animate = true }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 600"
      preserveAspectRatio="xMidYMid meet"
      style={{ color: 'var(--bp-ink)', width: '100%', height: '100%', display: 'block' }}
      aria-label="A three-masted tall ship sailing toward a distant island"
      role="img"
    >
      {/* ── Sky strata + a far bird ── */}
      <g opacity="0.7">
        <line x1="60" y1="120" x2="380" y2="120" stroke="currentColor" strokeWidth="0.4" strokeDasharray="3 8" opacity="0.32" />
        <line x1="780" y1="86" x2="1140" y2="86" stroke="currentColor" strokeWidth="0.4" strokeDasharray="3 8" opacity="0.28" />
        <line x1="40" y1="180" x2="200" y2="180" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 6" opacity="0.2" />
        <path d="M 1020 130 q 6 -4 12 0 q 6 -4 12 0" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
      </g>

      {/* ── Distant land — Ithaca on the horizon ── */}
      <path d={DISTANT_LAND_D} fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.45" />
      <path
        d={`${DISTANT_LAND_D} L 244 482 L 60 482 Z`}
        fill="currentColor"
        opacity="0.07"
      />
      {/* Horizon hairline */}
      <line x1="0" y1={HORIZON_Y} x2="1200" y2={HORIZON_Y} stroke="currentColor" strokeWidth="0.5" opacity="0.32" />

      {/* ── Wake trail behind the stern ── */}
      <g opacity="0.6">
        {[0, 1, 2, 3].map((i) => (
          <path
            key={i}
            d={`M ${80 - i * 10} ${472 + i * 5} Q ${150} ${466 + i * 5} ${228} ${475 + i * 4}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={0.6}
            strokeDasharray={`${4 - i * 0.5} ${10 + i * 2}`}
            opacity={0.5 - i * 0.1}
          />
        ))}
      </g>

      {/* ───────────────── HULL ───────────────── */}
      <g>
        {/* Inside fill (subtle) */}
        <path
          d={`M 232 450 L 318 420 L 958 404 L 1014 404 L 1014 458 C 1014 468, 988 472, 940 472 L 380 472 C 320 472, 260 470, 220 460 Z`}
          fill="currentColor"
          opacity="0.05"
        />
        {/* Hull outline */}
        <path d={HULL_D} fill="var(--bp-paper)" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        {/* Wales — main horizontal hull bands */}
        <path
          d="M 232 449 C 290 458, 380 460, 600 460 C 820 460, 920 460, 1010 454"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
          opacity="0.6"
        />
        <path
          d="M 280 432 C 360 440, 480 442, 700 442 C 880 442, 960 440, 1010 432"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.5"
        />
        <path
          d="M 320 414 C 480 416, 700 416, 950 412"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.4"
          opacity="0.4"
        />
        {/* Gun port row */}
        <g>
          {[
            362, 408, 454, 500, 546, 592, 638, 684, 730, 776, 822, 868, 914,
          ].map((px) => (
            <g key={px}>
              <rect
                x={px}
                y={425}
                width="10"
                height="7"
                fill="var(--bp-paper)"
                stroke="currentColor"
                strokeWidth="0.6"
              />
              {/* Tiny shadow inside */}
              <line x1={px + 1} y1={426} x2={px + 9} y2={426} stroke="currentColor" strokeWidth="0.3" opacity="0.5" />
            </g>
          ))}
        </g>

        {/* Stern transom — ornate rear */}
        <g>
          {/* Vertical pilasters */}
          <line x1="220" y1="425" x2="220" y2="460" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
          <line x1="232" y1="420" x2="232" y2="455" stroke="currentColor" strokeWidth="0.4" opacity="0.45" />
          <line x1="246" y1="416" x2="246" y2="450" stroke="currentColor" strokeWidth="0.4" opacity="0.45" />
          <line x1="260" y1="416" x2="260" y2="450" stroke="currentColor" strokeWidth="0.4" opacity="0.45" />
          {/* Stern windows row */}
          <rect x="226" y="430" width="8" height="9" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="0.5" />
          <rect x="236" y="430" width="8" height="9" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="0.5" />
          <rect x="246" y="430" width="8" height="9" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="0.5" />
          {/* Mullions */}
          {[230, 240, 250].map((x, i) => (
            <line key={i} x1={x} y1={430} x2={x} y2={439} stroke="currentColor" strokeWidth="0.3" opacity="0.6" />
          ))}
          {/* Horizontal ornament line above windows */}
          <line x1="220" y1="425" x2="262" y2="424" stroke="currentColor" strokeWidth="0.6" opacity="0.7" />
          {/* Aft flagstaff with pennant */}
          <line x1="240" y1="408" x2="240" y2="320" stroke="currentColor" strokeWidth="0.8" />
          <path d="M 240 322 L 286 328 L 280 334 L 290 340 L 240 336 Z" fill="currentColor" opacity="0.75" />
          <circle cx="240" cy="318" r="1.5" fill="currentColor" />
        </g>

        {/* Bow — figurehead + cathead */}
        <g>
          {/* Cathead (anchor projection) */}
          <line x1="958" y1="392" x2="976" y2="408" stroke="currentColor" strokeWidth="0.7" opacity="0.65" />
          {/* Anchor */}
          <g transform="translate(972, 408)">
            <line x1="0" y1="0" x2="0" y2="14" stroke="currentColor" strokeWidth="0.7" />
            <path d="M -5 12 Q 0 18 5 12" fill="none" stroke="currentColor" strokeWidth="0.7" />
            <line x1="-4" y1="3" x2="4" y2="3" stroke="currentColor" strokeWidth="0.7" />
          </g>
          {/* Figurehead — small ornament at the prow */}
          <g transform="translate(986, 396)">
            <path d="M 0 0 q 4 -2 8 0 q 2 2 2 6 q -2 -1 -4 -1 q -3 1 -6 -2 z" fill="currentColor" opacity="0.85" />
          </g>
        </g>

        {/* Subtle deck rail line */}
        <line x1="320" y1="404" x2="958" y2="384" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
      </g>

      {/* ─────────────── BOWSPRIT + JIB SAILS ─────────────── */}
      <g>
        <line x1="958" y1="392" x2="1148" y2="324" stroke="currentColor" strokeWidth="1.6" />
        {/* Spritsail yard */}
        <line x1="990" y1="378" x2="1100" y2="338" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
        {/* Jibstays — rope from bowsprit tip to mast tops */}
        <line x1="1148" y1="324" x2="600" y2="80" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
        <line x1="1112" y1="334" x2="780" y2="140" stroke="currentColor" strokeWidth="0.5" opacity="0.55" />
        {/* Outer jib (foretopgallant staysail) */}
        <Sail
          d="M 1148 324 L 720 110 L 736 200 Q 920 252 1148 324 Z"
          delay={animate ? 240 : 0}
          animate={animate}
        />
        {/* Inner jib */}
        <Sail
          d="M 1108 340 L 580 140 L 580 220 Q 800 270 1108 340 Z"
          delay={animate ? 320 : 0}
          animate={animate}
        />
        {/* Fore staysail */}
        <Sail
          d="M 968 380 L 600 152 L 600 240 Q 740 300 968 380 Z"
          delay={animate ? 400 : 0}
          animate={animate}
        />
      </g>

      {/* ─────────────── MIZZENMAST (leftmost — closest to stern) ─────────────── */}
      <g>
        {/* Mast pole */}
        <line x1="372" y1="170" x2="372" y2="404" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="372" cy="162" r="2" fill="currentColor" />
        <line x1="372" y1="158" x2="372" y2="148" stroke="currentColor" strokeWidth="0.6" />
        {/* Crow's nest */}
        <ellipse cx="372" cy="220" rx="14" ry="4" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="0.7" />
        <line x1="358" y1="220" x2="358" y2="232" stroke="currentColor" strokeWidth="0.5" />
        <line x1="386" y1="220" x2="386" y2="232" stroke="currentColor" strokeWidth="0.5" />
        {/* Spanker (gaff-rigged sail aft of mast) */}
        <line x1="372" y1="288" x2="296" y2="262" stroke="currentColor" strokeWidth="1.3" />
        <line x1="372" y1="384" x2="290" y2="392" stroke="currentColor" strokeWidth="1.3" />
        <Sail
          d="M 372 288 L 296 262 Q 292 320 290 360 Q 290 386 290 392 L 372 384 Z"
          delay={animate ? 380 : 0}
          animate={animate}
        />
        {/* Reef bands on spanker */}
        <line x1="304" y1="296" x2="370" y2="306" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 4" opacity="0.45" />
        <line x1="298" y1="332" x2="370" y2="342" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 4" opacity="0.45" />
        {/* Mizzen topsails (above the gaff) */}
        <SquareSail cx={372} spread={36} yTop={222} yBottom={282} belly={6} windLean={4} delay={animate ? 460 : 0} animate={animate} />
        <SquareSail cx={372} spread={28} yTop={172} yBottom={216} belly={4} windLean={3} delay={animate ? 540 : 0} animate={animate} />
        {/* Ratlines */}
        <Ratlines topX={372} topY={222} baseLeftX={342} baseRightX={402} baseY={404} rungs={6} />
      </g>

      {/* ─────────────── MAINMAST (center — tallest) ─────────────── */}
      <g>
        {/* Pole */}
        <line x1="600" y1="68" x2="600" y2="404" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="600" cy="60" r="2.4" fill="currentColor" />
        <line x1="600" y1="56" x2="600" y2="44" stroke="currentColor" strokeWidth="0.7" />
        {/* Pennant */}
        <path d="M 600 46 L 658 50 L 644 56 L 656 60 L 600 60 Z" fill="currentColor" opacity="0.75" />
        {/* Crow's nest */}
        <ellipse cx="600" cy="148" rx="18" ry="5" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="0.8" />
        <line x1="582" y1="148" x2="582" y2="162" stroke="currentColor" strokeWidth="0.5" />
        <line x1="618" y1="148" x2="618" y2="162" stroke="currentColor" strokeWidth="0.5" />
        {/* Sails — 4 stacked */}
        <SquareSail cx={600} spread={80} yTop={252} yBottom={380} belly={14} windLean={10} delay={animate ? 120 : 0} animate={animate} />
        <SquareSail cx={600} spread={62} yTop={172} yBottom={246} belly={10} windLean={8} delay={animate ? 200 : 0} animate={animate} />
        <SquareSail cx={600} spread={46} yTop={102} yBottom={166} belly={8} windLean={6} delay={animate ? 280 : 0} animate={animate} />
        <SquareSail cx={600} spread={30} yTop={68} yBottom={96} belly={4} windLean={4} delay={animate ? 360 : 0} animate={animate} />
        {/* Ratlines */}
        <Ratlines topX={600} topY={148} baseLeftX={550} baseRightX={650} baseY={404} rungs={8} />
      </g>

      {/* ─────────────── FOREMAST (rightmost — closest to bow) ─────────────── */}
      <g>
        <line x1="780" y1="130" x2="780" y2="404" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="780" cy="122" r="2" fill="currentColor" />
        <line x1="780" y1="118" x2="780" y2="106" stroke="currentColor" strokeWidth="0.6" />
        <ellipse cx="780" cy="184" rx="16" ry="4.5" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="0.8" />
        <line x1="764" y1="184" x2="764" y2="196" stroke="currentColor" strokeWidth="0.5" />
        <line x1="796" y1="184" x2="796" y2="196" stroke="currentColor" strokeWidth="0.5" />
        <SquareSail cx={780} spread={66} yTop={272} yBottom={380} belly={12} windLean={9} delay={animate ? 200 : 0} animate={animate} />
        <SquareSail cx={780} spread={52} yTop={202} yBottom={266} belly={9} windLean={7} delay={animate ? 280 : 0} animate={animate} />
        <SquareSail cx={780} spread={38} yTop={134} yBottom={196} belly={7} windLean={5} delay={animate ? 360 : 0} animate={animate} />
        <Ratlines topX={780} topY={184} baseLeftX={742} baseRightX={818} baseY={404} rungs={7} />
      </g>

      {/* ─────────────── FOREGROUND SEA ─────────────── */}
      <g>
        {/* Layered wave hatching */}
        {[
          { y: 494, amp: 8, dash: '6 12', op: 0.55 },
          { y: 510, amp: 10, dash: '5 10', op: 0.5 },
          { y: 528, amp: 12, dash: '5 8', op: 0.42 },
          { y: 548, amp: 14, dash: '4 7', op: 0.34 },
          { y: 572, amp: 16, dash: '3 6', op: 0.26 },
        ].map(({ y, amp, dash, op }, i) => (
          <path
            key={i}
            d={`M -50 ${y} Q ${200 + i * 10} ${y - amp} ${480 + i * 8} ${y} T ${940 + i * 6} ${y} T ${1260} ${y}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.7"
            strokeDasharray={dash}
            opacity={op}
          />
        ))}
        {/* Foam dots near the bow / behind the stern */}
        {[
          [228, 478],
          [212, 488],
          [248, 484],
          [968, 480],
          [990, 488],
          [950, 478],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="0.8" fill="currentColor" opacity="0.45" />
        ))}
      </g>
    </svg>
  );
}

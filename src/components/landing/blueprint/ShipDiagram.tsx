'use client';

/**
 * ShipDiagram — top-down schematic of the Overture ship, rendered in
 * 18th-century blueprint style (cream paper, navy ink, gold leaf accents).
 *
 * Strict rules:
 *  - Only horizontal, vertical, and 45° lines
 *  - Stroke weights: 1px, 1.5px, 2px only
 *  - Gold appears only on the active station (at most one)
 *  - Station positions derive from content.ts anatomy
 *
 * Canvas:  1000 × 420 (viewBox). Centerline y = 210. Bow on the right.
 */

import { useId } from 'react';
import type { CrewDivision } from '../HeroShip/content';

type StationId = CrewDivision['id'];

interface StationAnchor {
  id: StationId;
  /** SVG coordinates for the station's visual anchor (station marker center). */
  anchor: { x: number; y: number };
  /** Label line endpoint — where the label text box is tethered. */
  label: { x: number; y: number; align: 'start' | 'end' };
  /** Per-crew node positions, used when the station is expanded. */
  crewNodes: { x: number; y: number }[];
}

const STATIONS: StationAnchor[] = [
  {
    id: 'scouts',
    anchor: { x: 815, y: 210 },
    label: { x: 920, y: 80, align: 'end' },
    crewNodes: [
      { x: 810, y: 188 },
      { x: 835, y: 210 },
      { x: 810, y: 232 },
    ],
  },
  {
    id: 'cartographers',
    anchor: { x: 640, y: 210 },
    label: { x: 700, y: 340, align: 'end' },
    crewNodes: [
      { x: 620, y: 195 },
      { x: 640, y: 225 },
      { x: 660, y: 195 },
    ],
  },
  {
    id: 'artisans',
    anchor: { x: 440, y: 210 },
    label: { x: 380, y: 80, align: 'start' },
    crewNodes: [
      { x: 370, y: 180 }, { x: 420, y: 175 }, { x: 470, y: 180 },
      { x: 370, y: 240 }, { x: 420, y: 245 }, { x: 470, y: 240 },
      { x: 420, y: 210 },
    ],
  },
  {
    id: 'watch',
    anchor: { x: 640, y: 60 },
    label: { x: 80, y: 80, align: 'start' },
    crewNodes: [
      { x: 620, y: 55 },
      { x: 640, y: 45 },
      { x: 660, y: 55 },
    ],
  },
  {
    id: 'concertmaster',
    anchor: { x: 210, y: 210 },
    label: { x: 80, y: 340, align: 'start' },
    crewNodes: [{ x: 210, y: 210 }],
  },
];

interface ShipDiagramProps {
  /** Which station is currently highlighted (gold). */
  activeStation?: StationId | null;
  /** Called when user hovers/focuses a station hotspot. */
  onHoverStation?: (id: StationId | null) => void;
  /** Called when a station is clicked/tapped. */
  onSelectStation?: (id: StationId) => void;
  /** Locale for labels. */
  locale: 'ko' | 'en';
  /** Crew division data (passed through from content.ts to stay DRY). */
  divisions: CrewDivision[];
  /** When true, render only the ship + grid — skip labels (for compact preview). */
  skeletal?: boolean;
}

const CREW_DIVISION_LABEL_KO: Record<StationId, string> = {
  scouts: '탐색조 · SCOUTS',
  cartographers: '제도사 · CARTOGRAPHERS',
  artisans: '장인들 · ARTISANS',
  watch: '망루 · THE WATCH',
  concertmaster: '악장 · CONCERTMASTER',
};

const CREW_DIVISION_LABEL_EN: Record<StationId, string> = {
  scouts: 'SCOUTS',
  cartographers: 'CARTOGRAPHERS',
  artisans: 'ARTISANS',
  watch: 'THE WATCH',
  concertmaster: 'CONCERTMASTER',
};

export function ShipDiagram({
  activeStation = null,
  onHoverStation,
  onSelectStation,
  locale,
  divisions,
  skeletal = false,
}: ShipDiagramProps) {
  const titleId = useId();
  const divisionLabels = locale === 'ko' ? CREW_DIVISION_LABEL_KO : CREW_DIVISION_LABEL_EN;

  return (
    <svg
      viewBox="0 0 1000 420"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby={titleId}
      className="w-full h-auto"
      style={{ color: 'var(--bp-ink)' }}
    >
      <title id={titleId}>
        {locale === 'ko'
          ? 'Overture 선박 설계도 — 17명의 선원, 5개 스테이션'
          : 'Overture ship schematic — 17 crew, 5 stations'}
      </title>

      <defs>
        {/* Coordinate tick marks — reused along axes */}
        <g id="tick-v">
          <line x1="0" y1="-3" x2="0" y2="3" stroke="currentColor" strokeWidth="1" />
        </g>
      </defs>

      {/* ── Sheet border ── */}
      <rect
        x="10" y="10" width="980" height="400"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.45"
      />
      <rect
        x="18" y="18" width="964" height="384"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.3"
      />

      {/* ── Coordinate axes ── */}
      {/* Horizontal scale: A–H along top */}
      {['H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'].map((letter, i) => (
        <g key={letter} transform={`translate(${120 + i * 100}, 30)`}>
          <line x1="0" y1="-2" x2="0" y2="2" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          <text
            x="0" y="-6"
            textAnchor="middle"
            style={{ font: '9px var(--font-mono), monospace', fill: 'var(--bp-ink-soft)' }}
          >
            {letter}
          </text>
        </g>
      ))}

      {/* Vertical scale: 1–4 along left */}
      {['1', '2', '3', '4'].map((num, i) => (
        <g key={num} transform={`translate(38, ${90 + i * 80})`}>
          <line x1="-2" y1="0" x2="2" y2="0" stroke="currentColor" strokeWidth="1" opacity="0.5" />
          <text
            x="-8" y="3"
            textAnchor="end"
            style={{ font: '9px var(--font-mono), monospace', fill: 'var(--bp-ink-soft)' }}
          >
            {num}
          </text>
        </g>
      ))}

      {/* Centerline — dashed, indicates ship's keel line */}
      <line
        x1="90" y1="210" x2="960" y2="210"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeDasharray="4 4"
        opacity="0.35"
      />

      {/* ── Elevation indicator for Watch (crow's nest) — dashed connector up from mainmast ── */}
      <line
        x1="640" y1="165"
        x2="640" y2="90"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="2 3"
        opacity="0.55"
      />
      <text
        x="650" y="130"
        style={{ font: '9px var(--font-mono), monospace', fill: 'var(--bp-ink-soft)' }}
      >
        ELEV. +3.2M
      </text>

      {/* Crow's nest — small ring above ship */}
      <circle
        cx="640" cy="60" r="32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle
        cx="640" cy="60" r="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeDasharray="2 2"
        opacity="0.5"
      />

      {/* ── Hull outline ── */}
      {/*
        Ship layout:
          Stern (left):   x = 90, flat back
          Main hull:      x = 90 to 780, rectangular (y = 160 to 260)
          Bow taper:      x = 780 to 900, at 45° to point
          Bow tip:        x = 900 to 940, narrow nose
          Ram extension:  x = 940 to 960, centered on y=210
      */}
      <path
        d="
          M 90 160
          L 780 160
          L 860 210
          L 780 260
          L 90 260
          Z
        "
        fill="var(--bp-paper)"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="miter"
      />
      {/* Bow tip — the ram extension, subtle */}
      <path
        d="M 860 205 L 910 210 L 860 215 Z"
        fill="var(--bp-paper)"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      {/* Rudder — small protrusion at stern */}
      <rect
        x="78" y="202" width="16" height="16"
        fill="var(--bp-paper)"
        stroke="currentColor"
        strokeWidth="1"
      />

      {/* ── Oar ports — dashed ticks along sides (trireme signature) ── */}
      {Array.from({ length: 14 }, (_, i) => 150 + i * 42).map((x) => (
        <g key={`oar-${x}`}>
          <line x1={x} y1="156" x2={x} y2="150" stroke="currentColor" strokeWidth="0.75" opacity="0.5" />
          <line x1={x} y1="264" x2={x} y2="270" stroke="currentColor" strokeWidth="0.75" opacity="0.5" />
        </g>
      ))}

      {/* ── Deck divisions — internal hairlines separating sections ── */}
      {/* Bow deck line (Scouts zone) */}
      <line x1="780" y1="160" x2="780" y2="260" stroke="currentColor" strokeWidth="0.75" opacity="0.4" />
      {/* Chart-table / Fore-deck boundary */}
      <line x1="520" y1="160" x2="520" y2="260" stroke="currentColor" strokeWidth="0.75" opacity="0.4" />
      {/* Main deck / Aft-deck boundary */}
      <line x1="280" y1="160" x2="280" y2="260" stroke="currentColor" strokeWidth="0.75" opacity="0.4" />

      {/* ── Masts ── */}
      {/* Mainmast — at center under Watch */}
      <circle
        cx="640" cy="210" r="10"
        fill="var(--bp-paper)"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle
        cx="640" cy="210" r="4"
        fill="currentColor"
      />

      {/* Foremast — smaller, forward */}
      <circle
        cx="740" cy="210" r="6"
        fill="var(--bp-paper)"
        stroke="currentColor"
        strokeWidth="1"
      />
      <circle
        cx="740" cy="210" r="2"
        fill="currentColor"
      />

      {/* Chart table — rectangle under mainmast */}
      <rect
        x="600" y="224" width="80" height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.75"
        opacity="0.7"
      />
      <line x1="620" y1="224" x2="620" y2="246" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
      <line x1="640" y1="224" x2="640" y2="246" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
      <line x1="660" y1="224" x2="660" y2="246" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />

      {/* Helm — small circle at stern */}
      <circle
        cx="210" cy="210" r="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      {/* Helm spokes — 4 diagonal lines */}
      {[0, 45, 90, 135].map((deg) => (
        <line
          key={deg}
          x1="210" y1="210"
          x2={210 + 8 * Math.cos((deg * Math.PI) / 180)}
          y2={210 + 8 * Math.sin((deg * Math.PI) / 180)}
          stroke="currentColor"
          strokeWidth="0.75"
        />
      ))}

      {/* ── Title block — bottom right corner ── */}
      <g transform="translate(850, 370)">
        <line x1="0" y1="0" x2="120" y2="0" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
        <text
          x="0" y="12"
          style={{ font: '8px var(--font-mono), monospace', fill: 'var(--bp-ink-soft)', letterSpacing: '0.15em' }}
        >
          PLATE II · CREW
        </text>
        <text
          x="0" y="24"
          style={{ font: '8px var(--font-mono), monospace', fill: 'var(--bp-ink-soft)', letterSpacing: '0.15em' }}
        >
          OVERTURE · 17 ABOARD
        </text>
      </g>

      {/* Scale bar — bottom left */}
      <g transform="translate(80, 380)">
        <line x1="0" y1="0" x2="100" y2="0" stroke="currentColor" strokeWidth="1" />
        <line x1="0" y1="-3" x2="0" y2="3" stroke="currentColor" strokeWidth="1" />
        <line x1="50" y1="-2" x2="50" y2="2" stroke="currentColor" strokeWidth="0.5" />
        <line x1="100" y1="-3" x2="100" y2="3" stroke="currentColor" strokeWidth="1" />
        <text
          x="0" y="14"
          style={{ font: '8px var(--font-mono), monospace', fill: 'var(--bp-ink-soft)', letterSpacing: '0.1em' }}
        >
          0
        </text>
        <text
          x="100" y="14"
          style={{ font: '8px var(--font-mono), monospace', fill: 'var(--bp-ink-soft)', letterSpacing: '0.1em' }}
        >
          {locale === 'ko' ? '10 큐빗' : '10 CUBITS'}
        </text>
      </g>

      {/* ── Station markers + crew nodes + label tethers ── */}
      {!skeletal && STATIONS.map((station) => {
        const isActive = activeStation === station.id;
        const strokeColor = isActive ? 'var(--bp-gold)' : 'currentColor';
        const division = divisions.find((d) => d.id === station.id);
        if (!division) return null;

        return (
          <g key={station.id} style={{ color: strokeColor }}>
            {/* Crew node dots at the station */}
            {station.crewNodes.map((node, i) => (
              <circle
                key={i}
                cx={node.x}
                cy={node.y}
                r={isActive ? 3.5 : 2.5}
                fill={isActive ? 'var(--bp-gold)' : 'var(--bp-paper)'}
                stroke="currentColor"
                strokeWidth="1"
              />
            ))}

            {/* Tether line from station anchor to label */}
            <line
              x1={station.anchor.x}
              y1={station.anchor.y}
              x2={station.label.x}
              y2={station.label.y}
              stroke="currentColor"
              strokeWidth={isActive ? 1 : 0.75}
              strokeDasharray={isActive ? '' : '3 3'}
              opacity={isActive ? 1 : 0.55}
            />

            {/* Label endpoint node */}
            <circle
              cx={station.label.x}
              cy={station.label.y}
              r="3"
              fill={isActive ? 'var(--bp-gold)' : 'var(--bp-paper)'}
              stroke="currentColor"
              strokeWidth="1"
            />

            {/* Division label text */}
            <text
              x={station.label.align === 'start' ? station.label.x + 8 : station.label.x - 8}
              y={station.label.y + 3}
              textAnchor={station.label.align}
              style={{
                font: `${isActive ? '600' : '500'} 10px var(--font-mono), monospace`,
                fill: isActive ? 'var(--bp-gold-deep)' : 'var(--bp-ink)',
                letterSpacing: '0.14em',
              }}
            >
              {divisionLabels[station.id]}
            </text>

            {/* Station count — always visible beneath label */}
            <text
              x={station.label.align === 'start' ? station.label.x + 8 : station.label.x - 8}
              y={station.label.y + 16}
              textAnchor={station.label.align}
              style={{
                font: '9px var(--font-mono), monospace',
                fill: 'var(--bp-ink-soft)',
                letterSpacing: '0.1em',
              }}
            >
              {`${division.members.length}P · ${division.stationLabel[locale]}`}
            </text>

            {/* Invisible hitbox for hover/click */}
            <rect
              x={station.anchor.x - 40}
              y={station.anchor.y - 40}
              width="80"
              height="80"
              fill="transparent"
              style={{ cursor: 'pointer' }}
              tabIndex={0}
              role="button"
              aria-label={`${division.label[locale]} — ${division.role[locale]}`}
              onMouseEnter={() => onHoverStation?.(station.id)}
              onMouseLeave={() => onHoverStation?.(null)}
              onFocus={() => onHoverStation?.(station.id)}
              onBlur={() => onHoverStation?.(null)}
              onClick={() => onSelectStation?.(station.id)}
            />
          </g>
        );
      })}
    </svg>
  );
}

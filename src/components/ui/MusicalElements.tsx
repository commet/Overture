'use client';

/**
 * Musical visual elements for the Overture design system.
 * These translate orchestral score language into UI components.
 */

/* ────────────────────────────────────
   Fermata — "여기서 멈추고 생각하세요"
   The arc-and-dot hold symbol.
   ──────────────────────────────────── */

export function Fermata({
  size = 20,
  color = 'currentColor',
  className = '',
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M 3 20 A 11 11 0 0 1 21 20"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="12" cy="15" r="2" fill={color} />
    </svg>
  );
}

/* ────────────────────────────────────
   Crescendo Hairpin — 점점 세게
   The opening wedge < shape.
   ──────────────────────────────────── */

export function CrescendoHairpin({
  width = 80,
  height = 16,
  color = 'var(--text-tertiary)',
  className = '',
}: {
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}) {
  const mid = height / 2;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d={`M 2 ${mid} L ${width - 2} 2 M 2 ${mid} L ${width - 2} ${height - 2}`}
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ────────────────────────────────────
   BarLine — 마디선 (section dividers)
   single: |   double: ||   final: |▌
   ──────────────────────────────────── */

export function BarLine({
  type = 'single',
  height = 28,
  className = '',
}: {
  type?: 'single' | 'double' | 'final';
  height?: number;
  className?: string;
}) {
  const color = 'var(--border)';
  const boldColor = 'var(--text-tertiary)';

  if (type === 'double') {
    return (
      <div className={`flex items-center justify-center gap-[3px] ${className}`} role="separator" aria-hidden="true">
        <div style={{ width: 1, height, background: color }} />
        <div style={{ width: 1, height, background: color }} />
      </div>
    );
  }

  if (type === 'final') {
    return (
      <div className={`flex items-center justify-center gap-[3px] ${className}`} role="separator" aria-hidden="true">
        <div style={{ width: 1, height, background: color }} />
        <div style={{ width: 3, height, background: boldColor, borderRadius: 1 }} />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`} role="separator" aria-hidden="true">
      <div style={{ width: 1, height, background: color }} />
    </div>
  );
}

/* ────────────────────────────────────
   StaffLines — 오선지 배경 패턴
   Renders as an absolutely-positioned
   background layer inside its parent.
   ──────────────────────────────────── */

export function StaffLines({
  opacity = 0.07,
  spacing = 10,
  className = '',
}: {
  opacity?: number;
  spacing?: number;
  className?: string;
}) {
  const staffHeight = spacing * 6; // 5 lines + gap
  const lineColor = `rgba(181, 166, 140, ${opacity})`;

  const svgPattern = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="${staffHeight}"><line x1="0" y1="${spacing}" x2="200" y2="${spacing}" stroke="${lineColor}" stroke-width="0.8"/><line x1="0" y1="${spacing * 2}" x2="200" y2="${spacing * 2}" stroke="${lineColor}" stroke-width="0.8"/><line x1="0" y1="${spacing * 3}" x2="200" y2="${spacing * 3}" stroke="${lineColor}" stroke-width="0.8"/><line x1="0" y1="${spacing * 4}" x2="200" y2="${spacing * 4}" stroke="${lineColor}" stroke-width="0.8"/><line x1="0" y1="${spacing * 5}" x2="200" y2="${spacing * 5}" stroke="${lineColor}" stroke-width="0.8"/></svg>`;

  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      aria-hidden="true"
      style={{
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svgPattern)}")`,
        backgroundRepeat: 'repeat',
      }}
    />
  );
}

/* ────────────────────────────────────
   DynamicMark — pp, p, mp, mf, f, ff
   Musical intensity indicators.
   Rendered in italic serif style like
   handwritten markings on a score.
   ──────────────────────────────────── */

export function DynamicMark({
  level,
  className = '',
}: {
  level: 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff';
  className?: string;
}) {
  const labels: Record<string, string> = {
    pp: 'pp',
    p: 'p',
    mp: 'mp',
    mf: 'mf',
    f: 'f',
    ff: 'ff',
  };

  return (
    <span
      className={`inline-block font-serif italic text-[var(--text-tertiary)] select-none ${className}`}
      title={level === 'pp' ? 'pianissimo' : level === 'p' ? 'piano' : level === 'mp' ? 'mezzo-piano' : level === 'mf' ? 'mezzo-forte' : level === 'f' ? 'forte' : 'fortissimo'}
      aria-hidden="true"
    >
      {labels[level]}
    </span>
  );
}

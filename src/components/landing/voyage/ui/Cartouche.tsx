'use client';

/**
 * Cartouche — ornate ink frame with corner flourishes.
 *
 * Two-line border (outer thin, inner faint) plus four small SVG corner
 * ornaments. The interior is just `children` — wrap whatever needs the
 * 18th-c. plate-caption treatment (a station card, a passage of body
 * copy, the cutaway itself).
 */

import type { CSSProperties, ReactNode } from 'react';

const CORNER_SIZE = 14;

function Corner({ rotate }: { rotate: number }) {
  return (
    <svg
      width={CORNER_SIZE}
      height={CORNER_SIZE}
      viewBox="0 0 14 14"
      style={{ position: 'absolute', transform: `rotate(${rotate}deg)`, color: 'var(--bp-ink)' }}
      aria-hidden="true"
    >
      {/* L-bracket */}
      <path d="M 0 0 L 12 0" stroke="currentColor" strokeWidth="1" fill="none" />
      <path d="M 0 0 L 0 12" stroke="currentColor" strokeWidth="1" fill="none" />
      {/* Inner L */}
      <path d="M 3 3 L 10 3" stroke="currentColor" strokeWidth="0.5" fill="none" opacity="0.6" />
      <path d="M 3 3 L 3 10" stroke="currentColor" strokeWidth="0.5" fill="none" opacity="0.6" />
      {/* Tiny terminating dot */}
      <circle cx="0.5" cy="0.5" r="1" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

export function Cartouche({
  children,
  padding = 24,
  className,
  style,
  active = false,
}: {
  children: ReactNode;
  padding?: number | string;
  className?: string;
  style?: CSSProperties;
  active?: boolean;
}) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        padding,
        border: `1px solid ${active ? 'var(--bp-ink)' : 'var(--bp-ink-faint)'}`,
        background: 'var(--bp-paper)',
        boxShadow: active ? '2px 2px 0 0 var(--bp-gold)' : 'none',
        transition: 'border-color 220ms ease, box-shadow 220ms ease',
        ...style,
      }}
    >
      {/* Inner faint hairline frame */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 5,
          border: '1px solid var(--bp-ink-faint)',
          pointerEvents: 'none',
        }}
      />
      {/* Corner ornaments — top-left, top-right, bottom-left, bottom-right */}
      <div aria-hidden="true" style={{ position: 'absolute', top: -1, left: -1 }}>
        <Corner rotate={0} />
      </div>
      <div aria-hidden="true" style={{ position: 'absolute', top: -1, right: -1 }}>
        <Corner rotate={90} />
      </div>
      <div aria-hidden="true" style={{ position: 'absolute', bottom: -1, right: -1 }}>
        <Corner rotate={180} />
      </div>
      <div aria-hidden="true" style={{ position: 'absolute', bottom: -1, left: -1 }}>
        <Corner rotate={270} />
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}

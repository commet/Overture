'use client';

import dynamic from 'next/dynamic';

/**
 * HeroShip — Ithaca's 3D ship hero.
 *
 * The R3F canvas is dynamically imported with ssr: false because three.js
 * touches window/document. SSR/initial paint uses the static fallback below,
 * which is lightweight and shows a sunset gradient while the 3D scene loads.
 */
const HeroShipCanvas = dynamic(
  () => import('./Canvas').then((m) => ({ default: m.Canvas })),
  {
    ssr: false,
    loading: () => <HeroShipFallback />,
  }
);

function HeroShipFallback() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background:
          'radial-gradient(ellipse at 30% 40%, #3a2850 0%, #1a1f3a 50%, #0a0e1f 100%)',
      }}
    >
      <div className="text-[var(--text-tertiary)] text-[13px] tracking-[0.15em] uppercase">
        Setting sail…
      </div>
    </div>
  );
}

export function HeroShip() {
  return (
    <section className="relative w-full h-[90vh] min-h-[600px] overflow-hidden">
      <HeroShipCanvas />

      {/* Overlay scrim for text legibility (top & bottom) */}
      <div
        className="absolute inset-x-0 top-0 h-[25%] pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(10,14,31,0.5), transparent)',
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[35%] pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(10,14,31,0.7), transparent)',
        }}
      />

      {/* Bow content — primary message, pinned to top-left */}
      <div className="absolute left-0 top-0 w-full md:w-1/2 p-8 md:p-12 pointer-events-none">
        <p className="text-[10px] md:text-[11px] font-semibold text-[#ffb070] uppercase tracking-[0.2em] mb-3">
          The Heading
        </p>
        <h1
          className="text-[40px] md:text-[56px] leading-[1.05] font-bold text-white tracking-tight"
          style={{ textShadow: '0 2px 24px rgba(0,0,0,0.5)' }}
        >
          어디로 가려는가.
          <br />
          <span
            style={{
              background: 'linear-gradient(135deg, #ffd28a 0%, #ffb070 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            너의 이타카.
          </span>
        </h1>
        <p
          className="mt-5 text-[14px] md:text-[16px] text-white/75 leading-relaxed max-w-md"
          style={{ textShadow: '0 1px 12px rgba(0,0,0,0.5)' }}
        >
          17명의 선원이 이미 배에 올라와 있다.
          <br />
          방위만 정하면, 출항한다.
        </p>
      </div>

      {/* Stern label — the wake (placeholder, will expand in next pass) */}
      <div className="absolute right-0 bottom-0 p-8 md:p-12 text-right pointer-events-none">
        <p className="text-[10px] md:text-[11px] font-semibold text-[#8ea8d0] uppercase tracking-[0.2em]">
          The Wake · 5 stages
        </p>
        <p className="text-[12px] md:text-[13px] text-white/60 mt-2">
          Brief · Draft · Review · Refinement · Synthesis
        </p>
      </div>

      {/* Midship label — the crew (placeholder) */}
      <div className="absolute left-1/2 bottom-8 -translate-x-1/2 pointer-events-none">
        <p className="text-[10px] md:text-[11px] font-semibold text-white/60 uppercase tracking-[0.2em]">
          The Crew · 17 aboard
        </p>
      </div>
    </section>
  );
}

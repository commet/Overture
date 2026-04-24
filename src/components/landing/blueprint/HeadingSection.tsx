'use client';

/**
 * HeadingSection — § III · 선수 (BOW)
 *
 * Last section. Bottom of the page.
 * Visual: ship's BOW tapering to a point at the bottom of the viewport.
 * Scrolling into this section = the ship sailing forward.
 * Contains: 5 voyage stages, the Ithaca moment, and the final CTA.
 *
 * Hull geometry (continuing from CrewSection):
 *   Top of section: hull sides still at x=11.67% and x=(100-11.67)% of width
 *   Taper begins at 45% of section height
 *   Bow tip converges at center-bottom
 */

import Link from 'next/link';
import { track } from '@/lib/analytics';
import { useLocale, type Locale } from '@/hooks/useLocale';
import { STAGES } from '../HeroShip/content';

function BowHullSvg({ locale }: { locale: Locale }) {
  return (
    <svg
      viewBox="0 0 1200 1000"
      preserveAspectRatio="xMidYMax meet"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ color: 'var(--bp-ink)' }}
      aria-hidden="true"
    >
      {/* Hull parallel section (top) — continues from midship */}
      <line x1="140" y1="0" x2="140" y2="500" stroke="currentColor" strokeWidth="2" />
      <line x1="1060" y1="0" x2="1060" y2="500" stroke="currentColor" strokeWidth="2" />

      {/* Bow taper — 45° to the point */}
      <line x1="140" y1="500" x2="600" y2="960" stroke="currentColor" strokeWidth="2" />
      <line x1="1060" y1="500" x2="600" y2="960" stroke="currentColor" strokeWidth="2" />

      {/* Bow tip / ram — small extension */}
      <line x1="600" y1="960" x2="600" y2="985" stroke="currentColor" strokeWidth="1.5" />
      <line x1="592" y1="978" x2="600" y2="985" stroke="currentColor" strokeWidth="1" />
      <line x1="608" y1="978" x2="600" y2="985" stroke="currentColor" strokeWidth="1" />

      {/* Centerline — dashed */}
      <line
        x1="600" y1="40" x2="600" y2="960"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeDasharray="4 6"
        opacity="0.35"
      />

      {/* Waterline / bow splash dashes — subtle inward marks */}
      {[560, 640, 720, 800, 880].map((y) => {
        // At each y, compute hull x on both sides
        const tt = (y - 500) / (960 - 500); // 0 at taper top, 1 at bow tip
        const inset = 140 + tt * (600 - 140);
        return (
          <g key={y}>
            <line x1={inset} y1={y} x2={inset - 10} y2={y} stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
            <line x1={1200 - inset} y1={y} x2={1200 - inset + 10} y2={y} stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
          </g>
        );
      })}

      {/* "BOW · 선수" label at the tip, off to side */}
      <text
        x="660" y="960"
        style={{
          font: '500 10px var(--font-mono), monospace',
          fill: 'var(--bp-ink-soft)',
          letterSpacing: '0.2em',
        }}
      >
        {locale === 'ko' ? '선수 · BOW' : 'BOW'}
      </text>
    </svg>
  );
}

export function HeadingSection() {
  const locale = useLocale();
  const L = (ko: string, en: string) => (locale === 'ko' ? ko : en);

  return (
    <section
      className="relative bp-root bp-grid overflow-hidden"
      aria-labelledby="heading-heading"
    >
      <BowHullSvg locale={locale} />

      <div className="relative max-w-5xl mx-auto px-6 md:px-14 pt-20 md:pt-28 pb-32 md:pb-40">

        {/* Section marker */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="bp-mono text-[11px] md:text-[12px]"
                style={{ color: 'var(--bp-ink-soft)', letterSpacing: '0.28em', textTransform: 'uppercase' }}>
            § III
          </span>
          <span className="bp-node" />
          <span className="bp-mono text-[11px] md:text-[12px]"
                style={{ color: 'var(--bp-ink-soft)', letterSpacing: '0.28em', textTransform: 'uppercase' }}>
            {L('선수 · THE HEADING', 'THE HEADING')}
          </span>
        </div>
        <div className="bp-gold-rule mx-auto mb-10 md:mb-14" />

        {/* 5 Stages — vertical wake, narrowing as hull tapers */}
        <div className="mt-6 mb-16">
          <p
            className="text-center bp-mono mb-6"
            style={{
              color: 'var(--bp-ink-soft)',
              fontSize: 12,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
            }}
          >
            {L('항해의 다섯 단계', 'Five stages of the voyage')}
          </p>
          <ol className="relative flex flex-col items-center gap-5 max-w-md mx-auto">
            {/* Vertical dashed connector behind the stages */}
            <div
              className="absolute top-3 bottom-3"
              style={{
                left: '50%',
                width: 1,
                borderLeft: '1px dashed var(--bp-ink-faint)',
                transform: 'translateX(-0.5px)',
              }}
            />
            {STAGES.map((stage, i) => {
              const isTerminal = i === STAGES.length - 1;
              return (
                <li
                  key={stage.id}
                  className="relative flex items-center gap-3 bg-[var(--bp-paper)] px-4 py-2"
                  style={{ zIndex: 1 }}
                >
                  <span
                    className="bp-mono shrink-0"
                    style={{
                      fontSize: 11,
                      color: 'var(--bp-ink-soft)',
                      letterSpacing: '0.12em',
                      width: 22,
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    className="shrink-0"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      border: `1.5px solid ${isTerminal ? 'var(--bp-gold)' : 'var(--bp-ink)'}`,
                      background: isTerminal ? 'var(--bp-gold)' : 'var(--bp-paper)',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 18,
                      fontWeight: 700,
                      color: isTerminal ? 'var(--bp-gold-deep)' : 'var(--bp-ink)',
                    }}
                  >
                    {stage.label[locale]}
                  </span>
                  <span
                    className="bp-mono"
                    style={{
                      fontSize: 11.5,
                      color: 'var(--bp-ink-soft)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    · {stage.subtitle[locale]}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Ithaca moment — closing statement */}
        <div className="mt-10 text-center max-w-2xl mx-auto">
          <h2
            id="heading-heading"
            className="leading-[1.1] tracking-tight break-keep"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--bp-ink)',
              fontWeight: 700,
              fontSize: 'clamp(32px, 4.6vw, 56px)',
            }}
          >
            {L('어려운 건 문서가 아니라,', 'The hard part was never the writing —')}
            <br />
            <span style={{ color: 'var(--bp-gold-deep)' }}>
              {L('뭘 써야 하는지 아는 것이었다.', 'it was knowing what to write.')}
            </span>
          </h2>

          <p
            className="mt-8 leading-relaxed break-keep max-w-xl mx-auto"
            style={{
              color: 'var(--bp-ink-soft)',
              fontSize: 'clamp(15px, 1.15vw, 18px)',
            }}
          >
            {L(
              '그래서 조언 대신 배를 만들었습니다. 17명의 선원이 이미 올라와 있고, 당신은 방위만 정하면 됩니다.',
              'So instead of advice, we built a ship. 17 crew are already aboard — you only need to name the heading.',
            )}
          </p>

          <p
            className="bp-mono mt-6 italic"
            style={{
              color: 'var(--bp-ink-soft)',
              fontSize: 13,
              letterSpacing: '0.14em',
            }}
          >
            {L('— 너의 이타카가 보인다', '— Ithaca in sight')}
          </p>
        </div>

        {/* Final CTA — close to the bow tip */}
        <div className="mt-12 flex flex-col items-center gap-3">
          <Link
            href="/workspace"
            onClick={() => track('landing_cta_click', { cta: 'heading_workspace' })}
            className="bp-btn-primary"
            style={{ padding: '16px 32px', fontSize: '13px' }}
          >
            {L('지금 출항', 'Set sail now')}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 7h9M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" />
            </svg>
          </Link>
          <p
            className="bp-mono"
            style={{ color: 'var(--bp-ink-soft)', fontSize: 11, letterSpacing: '0.16em' }}
          >
            {L('로그인 없이 무료', 'Free — no login')}
          </p>
        </div>
      </div>
    </section>
  );
}

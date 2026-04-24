'use client';

/**
 * HeadingSection — § III · 선수 (BOW)
 *
 * Bottom of the page. Two visually distinct blocks:
 *   (1) upper block: parallel hull (CSS lines, continues from CrewSection)
 *       contains section marker, 5 stages, Ithaca moment, body
 *   (2) lower block: taper (SVG) from parallel hull → 45° → bow tip
 *       contains CTA, bow tip marker, wave ripples ahead of the ship
 */

import Link from 'next/link';
import { track } from '@/lib/analytics';
import { useLocale, type Locale } from '@/hooks/useLocale';
import { STAGES } from '../HeroShip/content';

function BowTaper({ locale }: { locale: Locale }) {
  return (
    <svg
      viewBox="0 0 1200 600"
      preserveAspectRatio="xMidYMin meet"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ color: 'var(--bp-ink)' }}
      aria-hidden="true"
    >
      {/* Bow taper — 45° lines meeting at center-bottom */}
      <line x1="140" y1="0" x2="600" y2="460" stroke="currentColor" strokeWidth="2" />
      <line x1="1060" y1="0" x2="600" y2="460" stroke="currentColor" strokeWidth="2" />

      {/* Bow tip — short extension at the prow */}
      <line x1="600" y1="460" x2="600" y2="490" stroke="currentColor" strokeWidth="1.5" />
      <line x1="592" y1="483" x2="600" y2="490" stroke="currentColor" strokeWidth="1" />
      <line x1="608" y1="483" x2="600" y2="490" stroke="currentColor" strokeWidth="1" />

      {/* Centerline continuing into bow */}
      <line
        x1="600" y1="0" x2="600" y2="460"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeDasharray="4 6"
        opacity="0.3"
      />

      {/* Side tick marks along taper edges (representing plank seams) */}
      {[80, 160, 240, 320, 400].map((y) => {
        const t = y / 460;
        const leftX = 140 + t * (600 - 140);
        const rightX = 1060 - t * (1060 - 600);
        return (
          <g key={y}>
            <line x1={leftX} y1={y} x2={leftX + 8} y2={y - 2} stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
            <line x1={rightX} y1={y} x2={rightX - 8} y2={y - 2} stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
          </g>
        );
      })}

      {/* Wave ripples AHEAD of the bow — the ocean the ship is sailing into.
          Mirror of the wake trail behind the stern. */}
      {[520, 540, 560].map((y, i) => (
        <path
          key={y}
          d={`M ${180 + i * 30} ${y} Q 380 ${y - 5} 600 ${y} T 1020 ${y}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.75"
          strokeDasharray="4 8"
          opacity={0.28 - i * 0.07}
        />
      ))}

      {/* Bow label */}
      <text
        x="640" y="455"
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
      style={{ background: 'var(--bp-paper)' }}
    >
      {/* ─── Upper block: parallel hull continues ─── */}
      <div className="relative">
        {/* Hull sides — CSS, continuous with previous sections */}
        <div className="absolute top-0 bottom-0 pointer-events-none"
             style={{ left: '11.67%', width: 2, background: 'var(--bp-ink)' }} />
        <div className="absolute top-0 bottom-0 pointer-events-none"
             style={{ right: '11.67%', width: 2, background: 'var(--bp-ink)' }} />

        <div className="relative max-w-5xl mx-auto px-6 md:px-16 pt-20 md:pt-28 pb-16 md:pb-20">

          {/* Section marker */}
          <div className="flex items-center justify-center gap-3 mb-5">
            <span className="bp-mono text-[11px] md:text-[12px]"
                  style={{ color: 'var(--bp-ink-soft)', letterSpacing: '0.28em' }}>
              § III
            </span>
            <span className="bp-node" />
            <span className="bp-mono text-[11px] md:text-[12px]"
                  style={{ color: 'var(--bp-ink-soft)', letterSpacing: '0.28em' }}>
              {L('선수 · THE HEADING', 'THE HEADING')}
            </span>
          </div>
          <div className="bp-gold-rule mx-auto mb-10 md:mb-14" />

          {/* 5 Stages */}
          <div className="mb-14 md:mb-20">
            <p
              className="text-center bp-mono mb-8"
              style={{
                color: 'var(--bp-ink-soft)',
                fontSize: 12,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
              }}
            >
              {L('항해의 다섯 단계', 'Five stages of the voyage')}
            </p>
            <ol className="relative flex flex-col items-center gap-4 max-w-md mx-auto">
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
                    className="relative flex items-center gap-3 px-4 py-2"
                    style={{ zIndex: 1, background: 'var(--bp-paper)' }}
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
                        fontSize: 19,
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

          {/* Ithaca moment */}
          <div className="text-center max-w-3xl mx-auto">
            <h2
              id="heading-heading"
              className="leading-[1.08] tracking-tight break-keep"
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--bp-ink)',
                fontWeight: 700,
                fontSize: 'clamp(34px, 4.6vw, 56px)',
              }}
            >
              {L('어려운 건 문서가 아니라,', 'The hard part was never the writing —')}
              <br />
              <span style={{ color: 'var(--bp-gold-deep)' }}>
                {L('뭘 써야 하는지 아는 것이었다.', 'it was knowing what to write.')}
              </span>
            </h2>

            <p
              className="mt-7 leading-relaxed break-keep max-w-xl mx-auto"
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
              className="bp-mono mt-5 italic"
              style={{
                color: 'var(--bp-ink-soft)',
                fontSize: 13,
                letterSpacing: '0.14em',
              }}
            >
              {L('— 너의 이타카가 보인다', '— Ithaca in sight')}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Lower block: taper to bow tip ─── */}
      <div
        className="relative mx-auto"
        style={{ aspectRatio: '1200 / 600', width: '100%' }}
      >
        <BowTaper locale={locale} />

        {/* CTA positioned in the tapering area */}
        <div className="relative flex flex-col items-center pt-6 md:pt-10">
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
            className="bp-mono mt-3"
            style={{ color: 'var(--bp-ink-soft)', fontSize: 11, letterSpacing: '0.16em' }}
          >
            {L('로그인 없이 무료', 'Free — no login')}
          </p>
        </div>
      </div>
    </section>
  );
}

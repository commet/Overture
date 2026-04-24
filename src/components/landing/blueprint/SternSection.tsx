'use client';

/**
 * SternSection — § III · THE WAKE
 *
 * What trails behind the voyage — the 5 stages and the output document.
 * This is where the "이타카" motif, reverted from the hero title, is
 * intentionally placed: after the metaphor has been earned.
 */

import Link from 'next/link';
import { track } from '@/lib/analytics';
import { useLocale } from '@/hooks/useLocale';
import { STAGES } from '../HeroShip/content';

export function SternSection() {
  const locale = useLocale();
  const L = (ko: string, en: string) => (locale === 'ko' ? ko : en);

  return (
    <section className="bp-root bp-grid relative overflow-hidden" aria-labelledby="stern-heading">
      <div
        className="relative max-w-6xl mx-auto px-5 md:px-8 pt-14 md:pt-20 pb-16 md:pb-24"
      >
        {/* Section marker */}
        <div className="flex items-center justify-between mb-6">
          <span className="bp-section-mark">§ III · {L('항적', 'The Wake')}</span>
          <span
            className="bp-mono text-[10px]"
            style={{ color: 'var(--bp-ink-soft)', letterSpacing: '0.15em' }}
          >
            PLATE III · 5 STAGES
          </span>
        </div>
        <div className="bp-gold-rule mb-10" />

        {/* 5 stages — horizontal wake */}
        <div className="mb-14">
          <p
            className="bp-mono text-[10px] mb-4"
            style={{
              color: 'var(--bp-ink-soft)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            {L('항해의 다섯 단계', 'Five stages of the voyage')}
          </p>

          <div className="relative">
            {/* Dashed wake line behind the stages */}
            <div
              className="absolute left-0 right-0 top-[14px] hidden md:block"
              style={{
                borderTop: '1px dashed var(--bp-ink-faint)',
                marginLeft: '14px',
                marginRight: '14px',
              }}
            />

            <ol className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-6 relative">
              {STAGES.map((stage, i) => {
                const isTerminal = i === STAGES.length - 1;
                return (
                  <li key={stage.id} className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="bp-node"
                        style={
                          isTerminal
                            ? {
                                background: 'var(--bp-gold)',
                                borderColor: 'var(--bp-gold)',
                              }
                            : undefined
                        }
                      />
                      <span
                        className="bp-mono text-[9px]"
                        style={{
                          color: 'var(--bp-ink-soft)',
                          letterSpacing: '0.14em',
                        }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <p
                      className="text-[15px] md:text-[16px] leading-tight mb-1"
                      style={{
                        fontFamily: 'var(--font-display)',
                        color: isTerminal ? 'var(--bp-gold-deep)' : 'var(--bp-ink)',
                        fontWeight: 700,
                      }}
                    >
                      {stage.label[locale]}
                    </p>
                    <p
                      className="text-[12px] leading-snug"
                      style={{ color: 'var(--bp-ink-soft)' }}
                    >
                      {stage.subtitle[locale]}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* Closing — the Ithaca moment + CTA */}
        <div className="relative max-w-2xl">
          <div className="absolute -left-6 top-2 bottom-2 hidden md:block"
               style={{ borderLeft: '1px solid var(--bp-ink)' }} />

          <h2
            id="stern-heading"
            className="text-[32px] md:text-[44px] leading-[1.1] tracking-tight break-keep"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--bp-ink)', fontWeight: 700 }}
          >
            {L('어려운 건 문서가 아니라,', 'The hard part was never the writing —')}
            <br />
            <span style={{ color: 'var(--bp-gold-deep)' }}>
              {L('뭘 써야 하는지 아는 것이었다.', 'it was knowing what to write.')}
            </span>
          </h2>

          <p
            className="mt-6 text-[14px] md:text-[15px] leading-relaxed max-w-lg break-keep"
            style={{ color: 'var(--bp-ink-soft)' }}
          >
            {L(
              '그래서 조언 대신 배를 만들었습니다. 17명의 선원이 이미 올라와 있고, 당신은 방위만 정하면 됩니다.',
              'So instead of advice, we built a ship. 17 crew are already aboard — you only need to name the heading.',
            )}
          </p>

          <p
            className="bp-mono mt-4 text-[11px]"
            style={{
              color: 'var(--bp-ink-soft)',
              letterSpacing: '0.16em',
              fontStyle: 'italic',
            }}
          >
            {L('— 너의 이타카가 보인다', '— Ithaca in sight')}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-5">
            <Link
              href="/workspace"
              onClick={() => track('landing_cta_click', { cta: 'stern_workspace' })}
              className="bp-btn-primary"
            >
              {L('지금 출항', 'Set sail now')}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2 6h7M6 3l3 3-3 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="square" strokeLinejoin="miter" />
              </svg>
            </Link>

            <p
              className="bp-mono text-[10px]"
              style={{ color: 'var(--bp-ink-soft)', letterSpacing: '0.12em' }}
            >
              {L('로그인 없이 무료', 'Free — no login')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

'use client';

/**
 * Act 2 — The Cutaway (S2, cross-section)
 *
 * The same ship from Act 1, opened lengthwise to reveal the orchestration
 * inside: 5 divisions at their stations. Diagrammatic, not figurative.
 * No gold here either — still pure ink-on-paper.
 */

import { useState } from 'react';
import { useLocale } from '@/hooks/useLocale';
import { CREW_DIVISIONS, TOTAL_CREW, type DivisionId } from '@/data/voyage-crew';
import { PaperGrain } from './atmosphere/PaperGrain';
import { PlateLabel } from './ui/PlateLabel';
import { StationCard } from './ui/StationCard';
import { ShipCutaway } from './illustrations/ShipCutaway';

// Display order in the row of cards: matches the cutaway numbering 01..05
// (Watch, Scouts, Cartographers, Artisans, Concertmaster).
const CARD_ORDER: DivisionId[] = ['watch', 'scouts', 'cartographers', 'artisans', 'concertmaster'];

export function Act2Cutaway() {
  const locale = useLocale();
  const L = (ko: string, en: string) => (locale === 'ko' ? ko : en);
  const [active, setActive] = useState<DivisionId | null>(null);

  const orderedDivisions = CARD_ORDER.map((id) =>
    CREW_DIVISIONS.find((d) => d.id === id)!,
  );

  return (
    <section
      id="orchestration"
      className="relative bp-root overflow-hidden"
      aria-labelledby="cutaway-heading"
      style={{
        background: 'var(--bp-paper)',
        paddingTop: 'clamp(80px, 10vh, 120px)',
        paddingBottom: 'clamp(80px, 10vh, 120px)',
      }}
    >
      <PaperGrain opacity={0.045} />

      <div className="relative max-w-6xl mx-auto px-6 md:px-10">
        <div className="bp-fade-up">
          <PlateLabel numeral="II" title={L('오케스트레이션 · Orchestration', 'Orchestration')} />
        </div>

        <h2
          id="cutaway-heading"
          className={`bp-fade-up text-center mt-8 md:mt-10 max-w-3xl mx-auto ${locale === 'ko' ? 'break-keep' : ''}`}
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--bp-ink)',
            fontWeight: 700,
            fontSize: 'clamp(34px, 4.4vw, 54px)',
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
            animationDelay: '120ms',
          }}
        >
          {locale === 'ko' ? (
            <>
              {TOTAL_CREW}명, 다섯 개의 자리.
              <br />
              <span style={{ color: 'var(--bp-ink-soft)' }}>한 척의 배 안에 다 있다.</span>
            </>
          ) : (
            <>
              Seventeen crew, five stations.
              <br />
              <span style={{ color: 'var(--bp-ink-soft)' }}>All aboard one vessel.</span>
            </>
          )}
        </h2>

        <p
          className={`bp-fade-up text-center mt-6 max-w-xl mx-auto ${locale === 'ko' ? 'break-keep' : ''}`}
          style={{
            color: 'var(--bp-ink-soft)',
            fontSize: 'clamp(14px, 1.05vw, 16px)',
            lineHeight: 1.65,
            animationDelay: '240ms',
          }}
        >
          {L(
            '망루는 위에서, 정찰조는 선수에서, 제도사는 메인마스트 아래 해도 테이블에서. 자리마다 역할이 있고, 자리들 사이엔 정보가 흐릅니다.',
            'Watch up top, Scouts at the bow, Cartographers under the mainmast at the chart table. Each station has its purpose; information flows between them.',
          )}
        </p>

        {/* Cutaway diagram */}
        <div
          className="bp-fade-up relative mx-auto mt-12 md:mt-16"
          style={{
            width: '100%',
            maxWidth: 1100,
            aspectRatio: '1200 / 600',
            animationDelay: '360ms',
          }}
        >
          <ShipCutaway activeStation={active} onStationHover={setActive} />
        </div>

        {/* Five station cards */}
        <div
          className="bp-fade-up mt-10 md:mt-14 grid gap-3 md:gap-4"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            animationDelay: '480ms',
          }}
        >
          {orderedDivisions.map((division, idx) => (
            <button
              key={division.id}
              type="button"
              onMouseEnter={() => setActive(division.id)}
              onMouseLeave={() => setActive(null)}
              // Touch path: tap activates (mouseenter doesn't fire on touch).
              // Desktop click fires after hover already set it — same value, no-op visually.
              onClick={() => setActive(division.id)}
              aria-pressed={active === division.id}
              style={{
                opacity: active && active !== division.id ? 0.55 : 1,
                transition: 'opacity 200ms ease',
                background: 'transparent',
                border: 'none',
                padding: 0,
                textAlign: 'left',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <StationCard
                division={division}
                locale={locale}
                number={idx + 1}
                active={active === division.id}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

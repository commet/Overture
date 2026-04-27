'use client';

/**
 * Act 1 — The Voyage (S1, wide shot)
 *
 * The hero. A tall ship under sail, drawn in 18th-c. naval-print ink on
 * cream paper. Establishes the metaphor in a single self-contained image so
 * the rest of the page can zoom in. No gold yet — the climax saves it.
 */

import { useLocale } from '@/hooks/useLocale';
import { PaperGrain } from './atmosphere/PaperGrain';
import { PlateLabel } from './ui/PlateLabel';
import { SailingShip } from './illustrations/SailingShip';

export function Act1Voyage() {
  const locale = useLocale();
  const L = (ko: string, en: string) => (locale === 'ko' ? ko : en);

  return (
    <section
      className="relative bp-root overflow-hidden"
      aria-labelledby="voyage-heading"
      style={{
        background: 'var(--bp-paper)',
        minHeight: '100vh',
        paddingTop: 'clamp(96px, 12vh, 128px)',
        paddingBottom: 80,
      }}
    >
      <PaperGrain opacity={0.05} />

      <div className="relative max-w-6xl mx-auto px-6 md:px-10">
        {/* Plate label at top */}
        <div className="bp-fade-up">
          <PlateLabel numeral="I" title={L('항해 · The Voyage', 'The Voyage')} />
        </div>

        {/* Ship illustration */}
        <div
          className="relative mx-auto mt-10 md:mt-14 bp-fade-up"
          style={{
            width: '100%',
            maxWidth: 1100,
            aspectRatio: '1200 / 600',
            animationDelay: '120ms',
          }}
        >
          <SailingShip />
        </div>

        {/* Title block */}
        <div className="text-center max-w-4xl mx-auto mt-6 md:mt-10">
          <h1
            id="voyage-heading"
            className={`bp-fade-up ${locale === 'ko' ? 'break-keep' : ''}`}
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--bp-ink)',
              fontWeight: 700,
              fontSize: 'clamp(40px, 5.2vw, 76px)',
              lineHeight: 1.05,
              letterSpacing: '-0.012em',
              animationDelay: '320ms',
            }}
          >
            {locale === 'ko' ? (
              <>
                한 번도 안 가본 곳으로 가야 할 때,
                <br />
                <span style={{ color: 'var(--bp-ink-soft)' }}>당신의 배는 이미 떠나 있다.</span>
              </>
            ) : (
              <>
                <span className="lg:whitespace-nowrap">When you set out for somewhere</span>
                <br />
                <span className="lg:whitespace-nowrap">you've never been —</span>
                <br />
                <span style={{ color: 'var(--bp-ink-soft)' }}>the crew is already aboard.</span>
              </>
            )}
          </h1>

          <p
            className={`bp-fade-up mt-6 md:mt-8 max-w-2xl mx-auto ${locale === 'ko' ? 'break-keep' : ''}`}
            style={{
              color: 'var(--bp-ink-soft)',
              fontSize: 'clamp(15px, 1.2vw, 18px)',
              lineHeight: 1.6,
              animationDelay: '460ms',
            }}
          >
            {L(
              '17명의 선원이 각자 자리에서 일할 준비를 마쳤습니다. 당신은 어디로 갈지만 정하면 됩니다.',
              'Seventeen crew, each at their station, ready. You only need to name the heading.',
            )}
          </p>

          <div
            className="bp-fade-up mt-8 md:mt-10 inline-flex items-center gap-3"
            style={{ animationDelay: '600ms' }}
          >
            <a
              href="#orchestration"
              className="bp-mono inline-flex items-center"
              style={{
                color: 'var(--bp-ink)',
                fontSize: 11.5,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                borderBottom: '1px solid var(--bp-ink)',
                paddingBottom: 4,
                paddingTop: 12,
                minHeight: 44,
              }}
            >
              {L('배 안을 보기', 'See the vessel inside')}
            </a>
            <span
              className="bp-mono"
              style={{
                color: 'var(--bp-ink-faint)',
                fontSize: 11,
                letterSpacing: '0.16em',
              }}
            >
              ↓
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

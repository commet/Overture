'use client';

/**
 * MidshipSection — § II · THE CREW
 *
 * Ship diagram as the visual centerpiece. 17 crew members at 5 stations.
 * Hover a division card to highlight its station on the ship; the
 * corresponding crew nodes and tether line turn gold.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from '@/hooks/useLocale';
import { ShipDiagram } from './ShipDiagram';
import { CREW_DIVISIONS, type CrewDivision } from '../HeroShip/content';

type StationId = CrewDivision['id'];

export function MidshipSection() {
  const locale = useLocale();
  const L = (ko: string, en: string) => (locale === 'ko' ? ko : en);
  const [active, setActive] = useState<StationId | null>(null);

  return (
    <section
      className="bp-root relative overflow-hidden"
      style={{ background: 'var(--bp-paper-deep)' }}
      aria-labelledby="midship-heading"
    >
      {/* Subtle grid — slightly deeper on the deeper paper tone */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle, var(--bp-ink-whisper) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-5 md:px-8 pt-14 md:pt-20 pb-14 md:pb-20">

        {/* Section marker */}
        <div className="flex items-center justify-between mb-6">
          <span className="bp-section-mark">§ II · {L('선원', 'The Crew')}</span>
          <span
            className="bp-mono text-[10px]"
            style={{ color: 'var(--bp-ink-soft)', letterSpacing: '0.15em' }}
          >
            PLATE II · 17 ABOARD
          </span>
        </div>
        <div className="bp-gold-rule mb-8" />

        {/* Heading */}
        <h2
          id="midship-heading"
          className="text-[32px] md:text-[44px] leading-[1.1] tracking-tight max-w-3xl break-keep"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--bp-ink)',
            fontWeight: 700,
          }}
        >
          {L('한 사람이 아니라, 17명이 각자의 자리에서.', 'Not one mind — seventeen, each at their post.')}
        </h2>
        <p
          className="mt-4 max-w-2xl text-[15px] leading-relaxed break-keep"
          style={{ color: 'var(--bp-ink-soft)' }}
        >
          {L(
            '탐색조가 바다를 읽고, 제도사가 항로를 그리고, 장인들이 손으로 만들고, 망루가 위험을 먼저 본다. 악장이 모든 목소리를 하나로 묶는다.',
            'Scouts read the waters. Cartographers chart the course. Artisans build with their hands. The watch spots danger first. The concertmaster binds every voice into one.',
          )}
        </p>

        {/* Ship diagram */}
        <div
          className="mt-10 relative"
          style={{
            background: 'var(--bp-paper)',
            border: '1px solid var(--bp-ink-faint)',
            padding: '16px 8px',
          }}
        >
          <ShipDiagram
            activeStation={active}
            onHoverStation={setActive}
            onSelectStation={setActive}
            locale={locale}
            divisions={CREW_DIVISIONS}
          />
        </div>

        {/* Division grid — 5 cards, synchronized with ship */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-5 gap-3">
          {CREW_DIVISIONS.map((division) => {
            const isActive = active === division.id;
            return (
              <button
                key={division.id}
                className="bp-station text-left"
                data-active={isActive}
                onMouseEnter={() => setActive(division.id)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(division.id)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(isActive ? null : division.id)}
                aria-expanded={isActive}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className="bp-mono text-[10px]"
                    style={{
                      color: isActive ? 'var(--bp-gold-deep)' : 'var(--bp-ink)',
                      letterSpacing: '0.14em',
                      fontWeight: 600,
                    }}
                  >
                    {division.label[locale].toUpperCase()}
                  </span>
                  <span
                    className="bp-mono text-[9px]"
                    style={{ color: 'var(--bp-ink-soft)', letterSpacing: '0.1em' }}
                  >
                    {division.members.length}P
                  </span>
                </div>
                <p
                  className="text-[11px] leading-snug mb-2"
                  style={{ color: 'var(--bp-ink-soft)', minHeight: '2.8em' }}
                >
                  {division.role[locale]}
                </p>
                <div
                  className="bp-mono text-[9px] pt-2"
                  style={{
                    color: 'var(--bp-ink-soft)',
                    letterSpacing: '0.08em',
                    borderTop: '1px dashed var(--bp-ink-faint)',
                  }}
                >
                  {division.stationLabel[locale]}
                </div>
              </button>
            );
          })}
        </div>

        {/* Crew reveal — shows individual members when a division is active */}
        <div className="mt-6 min-h-[88px]">
          <AnimatePresence mode="wait">
            {active && (
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                className="flex flex-wrap gap-2"
              >
                {CREW_DIVISIONS.find((d) => d.id === active)?.members.map((member) => (
                  <div
                    key={member.name}
                    className="flex items-center gap-2 px-3 py-1.5"
                    style={{
                      border: '1px solid var(--bp-ink-faint)',
                      background: 'var(--bp-paper)',
                    }}
                  >
                    <span className="bp-node" />
                    <span
                      className="text-[12px]"
                      style={{ color: 'var(--bp-ink)', fontWeight: 500 }}
                    >
                      {member.name}
                    </span>
                    <span
                      className="bp-mono text-[10px]"
                      style={{ color: 'var(--bp-ink-soft)', letterSpacing: '0.06em' }}
                    >
                      · {member.personaRole[locale]}
                    </span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

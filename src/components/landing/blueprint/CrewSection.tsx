'use client';

/**
 * CrewSection — § II · 선중앙 (MIDSHIP)
 *
 * Middle section. Shows the ship's midship deck with all 17 crew
 * seated on port and starboard benches. Names + roles visible.
 * Hull sides continue from HelmSection (x=11.67% of width each side).
 *
 * Layout (top to bottom within the hull):
 *   Crow's nest (above)    — Watch (3)
 *   Center spine           — Concertmaster (1)
 *   Chart table + mainmast — Cartographers (3)
 *   Main deck              — Artisans (7) split port/starboard
 *   Foremast               — decorative
 *   Forward railing        — Scouts (3)
 */

import { useState } from 'react';
import { useLocale } from '@/hooks/useLocale';
import { CREW_DIVISIONS } from '../HeroShip/content';

type Side = 'port' | 'starboard' | 'center';

function CrewBadge({
  name,
  role,
  side,
  active,
  onFocus,
  onBlur,
}: {
  name: string;
  role: string;
  side: Side;
  active: boolean;
  onFocus: () => void;
  onBlur: () => void;
}) {
  const isStarboard = side === 'starboard';
  const align = isStarboard ? 'text-left' : side === 'port' ? 'text-right' : 'text-center';
  return (
    <button
      onFocus={onFocus}
      onBlur={onBlur}
      onMouseEnter={onFocus}
      onMouseLeave={onBlur}
      className={`group inline-flex items-center gap-3 ${isStarboard ? 'flex-row' : side === 'port' ? 'flex-row-reverse' : 'flex-col'} cursor-pointer`}
      style={{ outline: 'none' }}
    >
      <span
        className="shrink-0"
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          border: `1.5px solid ${active ? 'var(--bp-gold)' : 'var(--bp-ink)'}`,
          background: active ? 'var(--bp-gold)' : 'var(--bp-paper)',
          transition: 'all 200ms var(--ease-musical)',
        }}
      />
      <span className={`${align} leading-tight`}>
        <span
          className="block"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 17,
            fontWeight: 700,
            color: active ? 'var(--bp-gold-deep)' : 'var(--bp-ink)',
            transition: 'color 200ms var(--ease-musical)',
          }}
        >
          {name}
        </span>
        <span
          className="bp-mono block mt-0.5"
          style={{
            fontSize: 11.5,
            color: 'var(--bp-ink-soft)',
            letterSpacing: '0.04em',
          }}
        >
          {role}
        </span>
      </span>
    </button>
  );
}

function DivisionHeader({
  label,
  stationLabel,
  memberCount,
}: {
  label: string;
  stationLabel: string;
  memberCount: number;
}) {
  return (
    <div className="flex items-center justify-center gap-3 mb-5">
      <span
        style={{ width: 32, height: 1, background: 'var(--bp-ink)', opacity: 0.55 }}
      />
      <span className="bp-mono" style={{
        fontSize: 12,
        color: 'var(--bp-ink)',
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        fontWeight: 600,
      }}>
        {label}
      </span>
      <span className="bp-node" />
      <span className="bp-mono" style={{
        fontSize: 11,
        color: 'var(--bp-ink-soft)',
        letterSpacing: '0.14em',
      }}>
        {memberCount}P · {stationLabel}
      </span>
      <span
        style={{ width: 32, height: 1, background: 'var(--bp-ink)', opacity: 0.55 }}
      />
    </div>
  );
}

function Mainmast() {
  return (
    <div className="flex flex-col items-center py-4">
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: '1.5px solid var(--bp-ink)',
          position: 'relative',
          background: 'var(--bp-paper)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '40%',
            background: 'var(--bp-ink)',
            borderRadius: '50%',
          }}
        />
      </div>
      <span
        className="bp-mono mt-2"
        style={{ fontSize: 9, color: 'var(--bp-ink-soft)', letterSpacing: '0.18em' }}
      >
        MAINMAST
      </span>
    </div>
  );
}

function Foremast() {
  return (
    <div className="flex flex-col items-center py-4">
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '1px solid var(--bp-ink)',
          position: 'relative',
          background: 'var(--bp-paper)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '40%',
            background: 'var(--bp-ink)',
            borderRadius: '50%',
          }}
        />
      </div>
      <span
        className="bp-mono mt-2"
        style={{ fontSize: 9, color: 'var(--bp-ink-soft)', letterSpacing: '0.18em' }}
      >
        FOREMAST
      </span>
    </div>
  );
}

function CrowsNestBlock({ members, locale, activeId, setActiveId }: {
  members: { name: string; personaRole: { ko: string; en: string } }[];
  locale: 'ko' | 'en';
  activeId: string | null;
  setActiveId: (id: string | null) => void;
}) {
  return (
    <div className="relative flex flex-col items-center mb-8">
      {/* Ring representing crow's nest */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: 220,
          height: 220,
          borderRadius: '50%',
          border: '1.5px solid var(--bp-ink)',
          background: 'var(--bp-paper)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 16,
            borderRadius: '50%',
            border: '1px dashed var(--bp-ink-faint)',
          }}
        />
        <div className="flex flex-col items-center gap-3 py-4 px-3">
          {members.map((m) => (
            <CrewBadge
              key={m.name}
              name={m.name}
              role={m.personaRole[locale]}
              side="center"
              active={activeId === m.name}
              onFocus={() => setActiveId(m.name)}
              onBlur={() => setActiveId(null)}
            />
          ))}
        </div>
      </div>
      {/* Elevation indicator */}
      <div className="flex flex-col items-center mt-2">
        <div
          style={{
            width: 1,
            height: 40,
            borderLeft: '1px dashed var(--bp-ink-faint)',
          }}
        />
        <span
          className="bp-mono"
          style={{ fontSize: 9.5, color: 'var(--bp-ink-soft)', letterSpacing: '0.18em', marginTop: 4 }}
        >
          ELEV. +3.2M
        </span>
      </div>
    </div>
  );
}

export function CrewSection() {
  const locale = useLocale();
  const L = (ko: string, en: string) => (locale === 'ko' ? ko : en);
  const [activeId, setActiveId] = useState<string | null>(null);

  const watch = CREW_DIVISIONS.find((d) => d.id === 'watch')!;
  const concert = CREW_DIVISIONS.find((d) => d.id === 'concertmaster')!;
  const cart = CREW_DIVISIONS.find((d) => d.id === 'cartographers')!;
  const artisans = CREW_DIVISIONS.find((d) => d.id === 'artisans')!;
  const scouts = CREW_DIVISIONS.find((d) => d.id === 'scouts')!;

  // Split artisans 4 port / 3 starboard
  const artisansPort = artisans.members.slice(0, 4);
  const artisansStbd = artisans.members.slice(4);

  // Split cartographers 1 port / 1 starboard / 1 center (at chart table)
  const cartPort = cart.members[0];
  const cartCenter = cart.members[1];
  const cartStbd = cart.members[2];

  // Split scouts 2 port / 1 starboard
  const scoutsPort = scouts.members.slice(0, 2);
  const scoutsStbd = scouts.members.slice(2);

  return (
    <section
      className="relative bp-root overflow-hidden"
      style={{ background: 'var(--bp-paper)' }}
      aria-labelledby="crew-heading"
    >
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--bp-ink-whisper) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Deck planking — horizontal dashed lines inside hull area */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{
          left: '11.67%',
          right: '11.67%',
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0, transparent 119px, var(--bp-ink-whisper) 119px, var(--bp-ink-whisper) 120px)',
          opacity: 0.8,
        }}
      />

      {/* Hull sides — vertical rails continuous from HelmSection */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{ left: '11.67%', width: 2, background: 'var(--bp-ink)' }}
      />
      <div
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{ right: '11.67%', width: 2, background: 'var(--bp-ink)' }}
      />

      <div className="relative max-w-6xl mx-auto px-[13%] pt-20 md:pt-28 pb-24 md:pb-32">

        {/* Section marker */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="bp-mono text-[11px] md:text-[12px]"
                style={{ color: 'var(--bp-ink-soft)', letterSpacing: '0.28em', textTransform: 'uppercase' }}>
            § II
          </span>
          <span className="bp-node" />
          <span className="bp-mono text-[11px] md:text-[12px]"
                style={{ color: 'var(--bp-ink-soft)', letterSpacing: '0.28em', textTransform: 'uppercase' }}>
            {L('선중앙 · THE CREW', 'THE CREW')}
          </span>
        </div>
        <div className="bp-gold-rule mx-auto mb-10 md:mb-14" />

        {/* Heading */}
        <h2
          id="crew-heading"
          className="text-center leading-[1.1] tracking-tight break-keep mx-auto max-w-4xl"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--bp-ink)',
            fontWeight: 700,
            fontSize: 'clamp(36px, 5vw, 64px)',
          }}
        >
          {L('17명이 각자의 자리에,', 'Seventeen crew,')}
          <br />
          {L('이미 올라와 있다.', 'each at their post.')}
        </h2>
        <p
          className="mt-6 text-center max-w-2xl mx-auto leading-relaxed break-keep"
          style={{
            color: 'var(--bp-ink-soft)',
            fontSize: 'clamp(15px, 1.15vw, 18px)',
          }}
        >
          {L(
            '탐색조가 바다를 읽고, 제도사가 항로를 그리고, 장인들이 실물을 만들고, 망루가 위험을 먼저 본다. 악장이 모든 목소리를 하나로 묶는다.',
            'Scouts read the waters. Cartographers chart the course. Artisans build. The watch spots danger. The concertmaster binds every voice into one.',
          )}
        </p>

        {/* ─── Watch cluster (above hull) ─── */}
        <div className="mt-14 md:mt-20">
          <DivisionHeader
            label={watch.label[locale].toUpperCase() + ' · THE WATCH'}
            stationLabel={watch.stationLabel[locale]}
            memberCount={watch.members.length}
          />
          <CrowsNestBlock
            members={watch.members}
            locale={locale}
            activeId={activeId}
            setActiveId={setActiveId}
          />
        </div>

        {/* ─── Concertmaster at stern (top of midship) ─── */}
        <div className="mt-10">
          <DivisionHeader
            label={concert.label[locale].toUpperCase() + ' · CONCERTMASTER'}
            stationLabel={concert.stationLabel[locale]}
            memberCount={concert.members.length}
          />
          <div className="flex justify-center">
            <CrewBadge
              name={concert.members[0].name}
              role={concert.members[0].personaRole[locale]}
              side="center"
              active={activeId === concert.members[0].name}
              onFocus={() => setActiveId(concert.members[0].name)}
              onBlur={() => setActiveId(null)}
            />
          </div>
        </div>

        {/* ─── Cartographers around chart table ─── */}
        <div className="mt-14 md:mt-20">
          <DivisionHeader
            label={cart.label[locale].toUpperCase() + ' · CARTOGRAPHERS'}
            stationLabel={cart.stationLabel[locale]}
            memberCount={cart.members.length}
          />
          <div className="grid grid-cols-[1fr_auto_1fr] gap-6 md:gap-12 items-center">
            <div className="flex justify-end">
              <CrewBadge
                name={cartPort.name}
                role={cartPort.personaRole[locale]}
                side="port"
                active={activeId === cartPort.name}
                onFocus={() => setActiveId(cartPort.name)}
                onBlur={() => setActiveId(null)}
              />
            </div>
            <div className="flex flex-col items-center gap-3">
              {/* Chart table */}
              <div
                style={{
                  width: 110,
                  height: 64,
                  border: '1.5px solid var(--bp-ink)',
                  background: 'var(--bp-paper)',
                  position: 'relative',
                }}
              >
                {[25, 50, 75].map((p) => (
                  <div
                    key={p}
                    style={{
                      position: 'absolute',
                      left: `${p}%`,
                      top: 4,
                      bottom: 4,
                      width: 1,
                      background: 'var(--bp-ink-faint)',
                    }}
                  />
                ))}
                <span
                  className="bp-mono absolute"
                  style={{
                    fontSize: 8,
                    color: 'var(--bp-ink-soft)',
                    letterSpacing: '0.14em',
                    bottom: -16,
                    left: 0,
                    right: 0,
                    textAlign: 'center',
                  }}
                >
                  CHART TABLE
                </span>
              </div>
              <div className="mt-4">
                <CrewBadge
                  name={cartCenter.name}
                  role={cartCenter.personaRole[locale]}
                  side="center"
                  active={activeId === cartCenter.name}
                  onFocus={() => setActiveId(cartCenter.name)}
                  onBlur={() => setActiveId(null)}
                />
              </div>
              {/* Mainmast right under */}
              <div className="mt-6">
                <Mainmast />
              </div>
            </div>
            <div className="flex justify-start">
              <CrewBadge
                name={cartStbd.name}
                role={cartStbd.personaRole[locale]}
                side="starboard"
                active={activeId === cartStbd.name}
                onFocus={() => setActiveId(cartStbd.name)}
                onBlur={() => setActiveId(null)}
              />
            </div>
          </div>
        </div>

        {/* ─── Artisans — main deck benches ─── */}
        <div className="mt-14 md:mt-20">
          <DivisionHeader
            label={artisans.label[locale].toUpperCase() + ' · ARTISANS'}
            stationLabel={artisans.stationLabel[locale]}
            memberCount={artisans.members.length}
          />
          <div className="grid grid-cols-[1fr_auto_1fr] gap-8 md:gap-16 items-start">
            <div className="flex flex-col items-end gap-5">
              {artisansPort.map((m) => (
                <CrewBadge
                  key={m.name}
                  name={m.name}
                  role={m.personaRole[locale]}
                  side="port"
                  active={activeId === m.name}
                  onFocus={() => setActiveId(m.name)}
                  onBlur={() => setActiveId(null)}
                />
              ))}
            </div>
            {/* Center spine — dashed centerline */}
            <div
              style={{
                width: 1,
                alignSelf: 'stretch',
                borderLeft: '1px dashed var(--bp-ink-faint)',
                minHeight: 240,
              }}
            />
            <div className="flex flex-col items-start gap-5">
              {artisansStbd.map((m) => (
                <CrewBadge
                  key={m.name}
                  name={m.name}
                  role={m.personaRole[locale]}
                  side="starboard"
                  active={activeId === m.name}
                  onFocus={() => setActiveId(m.name)}
                  onBlur={() => setActiveId(null)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ─── Foremast + Scouts at forward railing ─── */}
        <div className="mt-14 md:mt-20">
          <div className="flex justify-center mb-6">
            <Foremast />
          </div>
          <DivisionHeader
            label={scouts.label[locale].toUpperCase() + ' · SCOUTS'}
            stationLabel={scouts.stationLabel[locale]}
            memberCount={scouts.members.length}
          />
          <div className="grid grid-cols-[1fr_auto_1fr] gap-6 md:gap-12 items-start">
            <div className="flex flex-col items-end gap-5">
              {scoutsPort.map((m) => (
                <CrewBadge
                  key={m.name}
                  name={m.name}
                  role={m.personaRole[locale]}
                  side="port"
                  active={activeId === m.name}
                  onFocus={() => setActiveId(m.name)}
                  onBlur={() => setActiveId(null)}
                />
              ))}
            </div>
            <div
              style={{
                width: 1,
                alignSelf: 'stretch',
                borderLeft: '1px dashed var(--bp-ink-faint)',
                minHeight: 80,
              }}
            />
            <div className="flex flex-col items-start gap-5">
              {scoutsStbd.map((m) => (
                <CrewBadge
                  key={m.name}
                  name={m.name}
                  role={m.personaRole[locale]}
                  side="starboard"
                  active={activeId === m.name}
                  onFocus={() => setActiveId(m.name)}
                  onBlur={() => setActiveId(null)}
                />
              ))}
            </div>
          </div>

          {/* Forward railing indicator */}
          <div className="mt-10 flex flex-col items-center gap-2">
            <div
              style={{ width: '60%', height: 1, background: 'var(--bp-ink-faint)' }}
            />
            <span
              className="bp-mono"
              style={{ fontSize: 9.5, color: 'var(--bp-ink-soft)', letterSpacing: '0.18em' }}
            >
              {locale === 'ko' ? '선수 난간 · FORWARD RAILING' : 'FORWARD RAILING'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

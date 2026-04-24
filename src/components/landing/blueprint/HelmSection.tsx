'use client';

/**
 * HelmSection — § I · 선미 (STERN)
 *
 * First user-facing section. Top of the page.
 * Visual: ship's STERN viewed top-down. Rudder sticks up at the very top.
 * Helm wheel sits inside the hull. Hull sides extend down off-section,
 * continuing into CrewSection. User is the captain at the helm.
 *
 * Hull geometry (shared across all 3 sections so edges align):
 *   viewBox: 0 0 1200 H
 *   hull exterior:   x = 140 and x = 1060 (vertical sides)
 *   hull interior:   x = 140 to 1060  (width 920)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { track } from '@/lib/analytics';
import { useLocale, type Locale } from '@/hooks/useLocale';
import { CompassRose } from './CompassRose';

interface ExampleData {
  id: string;
  symbol: string;
  input: string;
  scenarioLabel: string;
}

const EXAMPLES_KO: ExampleData[] = [
  { id: 'planning',  symbol: '[P]', input: '대표님이 2주 안에 신사업 기획안을 만들어오라고 했어', scenarioLabel: '기획안' },
  { id: 'proposal',  symbol: '[Q]', input: '다음 주 금요일 경쟁 PT인데 상대가 대기업 SI야', scenarioLabel: '제안서' },
  { id: 'strategy',  symbol: '[S]', input: '경쟁사가 갑자기 가격을 30% 내렸어. 금요일까지 대응 전략 올려야 해', scenarioLabel: '대응 전략' },
];

const EXAMPLES_EN: ExampleData[] = [
  { id: 'planning',  symbol: '[P]', input: 'My CEO wants a new product proposal in 2 weeks', scenarioLabel: 'Planning' },
  { id: 'proposal',  symbol: '[Q]', input: 'Competitive pitch next Friday against an enterprise SI firm', scenarioLabel: 'Proposal' },
  { id: 'strategy',  symbol: '[S]', input: 'Competitor just dropped prices 30%. Need a response by Friday', scenarioLabel: 'Strategy' },
];

const VOICES_KO = [
  '“AI로 뽑아보면 수정이 반이야”  →  한 번에 쓸 수 있는 결과가 나옵니다',
  '“뭘 써야 할지 모르겠는데, 프롬프트는 또 어떻게 짜”  →  고민을 그대로 던지면 됩니다',
  '“검수 피로도가 너무 높더라고”  →  약한 곳을 미리 짚어줍니다',
];
const VOICES_EN = [
  '“AI output always needs heavy editing”  →  Get results you can use as-is',
  '“I don’t know what to write, let alone how to prompt”  →  Just describe your situation',
  '“Review fatigue is real”  →  Weak spots are flagged before you ask',
];

function useRotating(count: number, stop: boolean, interval = 4200) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  useEffect(() => {
    if (stop) return;
    timerRef.current = setInterval(() => setIdx((p) => (p + 1) % count), interval);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [count, stop, interval]);
  return idx;
}

function StemShip({ locale }: { locale: Locale }) {
  return (
    <svg
      viewBox="0 0 1200 900"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ color: 'var(--bp-ink)' }}
      aria-hidden="true"
    >
      {/* Rudder — small rectangle above stern transom */}
      <rect x="560" y="60" width="80" height="70" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="1.5" />
      <line x1="600" y1="60" x2="600" y2="130" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />

      {/* Stern transom — horizontal line closing the back of the ship */}
      <line x1="140" y1="140" x2="1060" y2="140" stroke="currentColor" strokeWidth="2" />

      {/* Stern chamfers — 45° cut corners for aesthetic */}
      <line x1="140" y1="140" x2="180" y2="180" stroke="currentColor" strokeWidth="2" />
      <line x1="1060" y1="140" x2="1020" y2="180" stroke="currentColor" strokeWidth="2" />

      {/* Hull sides — vertical, extend off bottom (continues into CrewSection) */}
      <line x1="140" y1="180" x2="140" y2="900" stroke="currentColor" strokeWidth="2" />
      <line x1="1060" y1="180" x2="1060" y2="900" stroke="currentColor" strokeWidth="2" />

      {/* Aft deck planking — subtle dashed horizontals */}
      {[180, 220].map((y) => (
        <line key={y} x1="140" y1={y} x2="1060" y2={y} stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 5" opacity="0.3" />
      ))}

      {/* Helm wheel — centered between the chamfers */}
      <g transform="translate(600 280)">
        <circle r="54" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="1.5" />
        <circle r="42" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.6" />
        <circle r="6" fill="currentColor" />
        {[0, 45, 90, 135].map((deg) => (
          <line
            key={deg}
            x1={-54 * Math.cos((deg * Math.PI) / 180)}
            y1={-54 * Math.sin((deg * Math.PI) / 180)}
            x2={54 * Math.cos((deg * Math.PI) / 180)}
            y2={54 * Math.sin((deg * Math.PI) / 180)}
            stroke="currentColor"
            strokeWidth="1"
          />
        ))}
        {/* Helm handle nubs */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <circle
            key={deg}
            cx={60 * Math.cos((deg * Math.PI) / 180)}
            cy={60 * Math.sin((deg * Math.PI) / 180)}
            r="3"
            fill="var(--bp-paper)"
            stroke="currentColor"
            strokeWidth="1"
          />
        ))}
      </g>

      {/* Helm label — "조타륜 · HELM" */}
      <g transform="translate(600 370)">
        <line x1="0" y1="-25" x2="0" y2="-15" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
        <text textAnchor="middle" style={{
          font: '500 11px var(--font-mono), monospace',
          fill: 'var(--bp-ink-soft)',
          letterSpacing: '0.22em',
        }}>
          {locale === 'ko' ? '조타륜 · HELM' : 'THE HELM'}
        </text>
      </g>

      {/* Side rail ticks (oar-port style) along hull */}
      {Array.from({ length: 10 }, (_, i) => 280 + i * 60).map((y) => (
        <g key={`rail-${y}`}>
          <line x1="140" y1={y} x2="128" y2={y} stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
          <line x1="1060" y1={y} x2="1072" y2={y} stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
        </g>
      ))}

      {/* Coordinate marker at top-left */}
      <text x="100" y="18" style={{
        font: '500 9px var(--font-mono), monospace',
        fill: 'var(--bp-ink-soft)',
        letterSpacing: '0.18em',
      }}>
        AFT · N
      </text>
      <text x="1100" y="18" textAnchor="end" style={{
        font: '500 9px var(--font-mono), monospace',
        fill: 'var(--bp-ink-soft)',
        letterSpacing: '0.18em',
      }}>
        PLATE I
      </text>
    </svg>
  );
}

export function HelmSection() {
  const router = useRouter();
  const locale = useLocale();
  const L = (ko: string, en: string) => (locale === 'ko' ? ko : en);
  const examples = locale === 'ko' ? EXAMPLES_KO : EXAMPLES_EN;
  const voices = locale === 'ko' ? VOICES_KO : VOICES_EN;
  const [inputValue, setInputValue] = useState('');
  const [focused, setFocused] = useState(false);
  const idx = useRotating(examples.length, focused);

  const bearing = focused || inputValue ? 38 : (idx * 120) % 360;
  const compassActive = focused || inputValue.length > 0;

  const handleSubmit = useCallback(() => {
    const text = inputValue.trim();
    if (!text) return;
    track('landing_hero_submit', { text_length: text.length, used_example: false });
    router.push(`/workspace?q=${encodeURIComponent(text)}`);
  }, [inputValue, router]);

  const handleScenarioClick = (ex: ExampleData) => {
    track('landing_hero_scenario', { scenario: ex.id });
    router.push(`/workspace?demo=${ex.id}`);
  };

  return (
    <section className="relative bp-root bp-grid overflow-hidden" aria-labelledby="helm-heading">
      <StemShip locale={locale} />

      {/* Content INSIDE the hull frame */}
      <div className="relative max-w-5xl mx-auto px-6 md:px-14 pt-[220px] md:pt-[340px] pb-24 md:pb-28">

        {/* Section marker — centered, below helm wheel */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="bp-mono text-[11px] md:text-[12px]"
                style={{ color: 'var(--bp-ink-soft)', letterSpacing: '0.28em', textTransform: 'uppercase' }}>
            § I
          </span>
          <span className="bp-node" />
          <span className="bp-mono text-[11px] md:text-[12px]"
                style={{ color: 'var(--bp-ink-soft)', letterSpacing: '0.28em', textTransform: 'uppercase' }}>
            {L('선미 · THE HELM', 'THE HELM')}
          </span>
        </div>
        <div className="bp-gold-rule mx-auto mb-10 md:mb-14" />

        {/* Big centered hero — large display type */}
        <h1
          id="helm-heading"
          className="text-center leading-[1.04] tracking-tight break-keep"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'var(--bp-ink)',
            fontWeight: 700,
            fontSize: 'clamp(44px, 6.6vw, 84px)',
          }}
        >
          <span className="lg:whitespace-nowrap">{L('내 전문 분야가 아닌 걸', 'When you need to do')}</span>
          <br />
          <span className="lg:whitespace-nowrap">{L('해야 할 때.', "what you've never done.")}</span>
        </h1>

        <p
          className="mt-8 md:mt-10 text-center max-w-2xl mx-auto leading-relaxed break-keep"
          style={{
            color: 'var(--bp-ink)',
            fontSize: 'clamp(17px, 1.4vw, 22px)',
          }}
        >
          {L('17명의 선원이 이미 배에 올라와 있다.', '17 crew members are already aboard.')}
          <br />
          <span style={{ color: 'var(--bp-ink-soft)' }}>
            {L('방위만 정하면, 출항한다.', 'Name the heading. We set sail.')}
          </span>
        </p>

        {/* Rotating voice — larger + centered */}
        <div className="mt-10 md:mt-12 min-h-[50px] flex justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={idx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              className="text-center bp-mono"
              style={{
                color: 'var(--bp-ink-soft)',
                fontSize: 'clamp(13px, 1.05vw, 15px)',
                letterSpacing: '0.02em',
                maxWidth: '680px',
              }}
            >
              {voices[idx]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Input + compass row */}
        <div className="mt-12 md:mt-16 flex flex-col lg:flex-row items-stretch lg:items-start gap-8 lg:gap-10 justify-center">

          {/* Compass rose */}
          <div className="flex flex-col items-center shrink-0">
            <CompassRose size={140} bearing={bearing} active={compassActive} />
            <p
              className="bp-mono mt-3 text-[11px]"
              style={{
                color: compassActive ? 'var(--bp-gold-deep)' : 'var(--bp-ink-soft)',
                letterSpacing: '0.2em',
                transition: 'color 400ms var(--ease-musical)',
              }}
            >
              {compassActive
                ? L('BEARING · SET', 'BEARING · SET')
                : L('BEARING · UNSET', 'BEARING · UNSET')}
            </p>
          </div>

          {/* Input column */}
          <div className="flex-1 max-w-2xl">
            {/* Example chips */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-4">
              {examples.map((ex, i) => {
                const isActive = i === idx && !focused;
                return (
                  <button
                    key={ex.id}
                    onClick={() => handleScenarioClick(ex)}
                    className="bp-btn-secondary"
                    data-active={isActive}
                    style={{ padding: '10px 18px', fontSize: '12px' }}
                  >
                    <span className="bp-mono" style={{ opacity: 0.6 }}>{ex.symbol}</span>
                    <span>{ex.scenarioLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* Text input */}
            <div className="bp-input-frame flex items-center gap-3 px-4 py-3.5">
              <span className="bp-mono text-[13px] shrink-0" style={{ color: 'var(--bp-ink-soft)' }}>⌕</span>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => setFocused(true)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
                placeholder={focused ? L('고민을 입력하세요…', 'Describe your challenge…') : examples[idx].input}
                maxLength={200}
                className="bp-input flex-1 outline-none"
                style={{ fontSize: '15px' }}
                aria-label={L('내 상황 입력', 'Describe your situation')}
              />
            </div>

            {/* Submit row */}
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button
                onClick={handleSubmit}
                disabled={!inputValue.trim()}
                className="bp-btn-primary"
                style={{ padding: '14px 26px', fontSize: '13px' }}
              >
                {L('출항', 'Set Sail')}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2 7h9M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" />
                </svg>
              </button>
              <p className="bp-mono text-[11px]" style={{ color: 'var(--bp-ink-soft)', letterSpacing: '0.14em' }}>
                {L('로그인 없이 무료', 'Free — no login')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

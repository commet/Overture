'use client';

/**
 * HelmSection — § I · 선미 (STERN)
 *
 * Top of the page. Ship's stern viewed top-down.
 * Wake ripples above the rudder (the ship has been sailing).
 * Stern transom + chamfers + helm wheel inside.
 * Hull sides are CSS (absolute, full-height) — identical across all 3 sections
 * so the ship reads as continuous.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { track } from '@/lib/analytics';
import { useLocale } from '@/hooks/useLocale';
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

/**
 * SternStructure — ship's stern drawn as SVG, anchored to top of section.
 * No hull sides (those are CSS in the section). Only decorative stern parts:
 *   wake ripples · rudder · transom · chamfers · deck planks · helm wheel
 */
function SternStructure() {
  return (
    <svg
      viewBox="0 0 1200 440"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMin meet"
      className="absolute left-0 right-0 top-0 w-full pointer-events-none"
      style={{ color: 'var(--bp-ink)' }}
      aria-hidden="true"
    >
      {/* Wake ripples — 3 dashed sine-like arcs above the rudder. The ship has been moving. */}
      {[12, 28, 44].map((y, i) => (
        <path
          key={y}
          d={`M ${360 + i * 20} ${y} Q 540 ${y - 6} 720 ${y} T 1080 ${y}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.75"
          strokeDasharray="4 8"
          opacity={0.32 - i * 0.08}
        />
      ))}

      {/* Rudder — small rectangle sticking out above stern transom */}
      <rect x="570" y="70" width="60" height="60" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="1.5" />
      <line x1="600" y1="70" x2="600" y2="130" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />

      {/* Pintle/gudgeon marks on rudder */}
      <line x1="565" y1="88" x2="570" y2="88" stroke="currentColor" strokeWidth="1" />
      <line x1="565" y1="112" x2="570" y2="112" stroke="currentColor" strokeWidth="1" />

      {/* Stern transom — horizontal line from hull to hull */}
      <line x1="140" y1="140" x2="1060" y2="140" stroke="currentColor" strokeWidth="2" />

      {/* Stern chamfers — 45° cut corners where hull meets transom */}
      <line x1="140" y1="140" x2="180" y2="180" stroke="currentColor" strokeWidth="2" />
      <line x1="1060" y1="140" x2="1020" y2="180" stroke="currentColor" strokeWidth="2" />

      {/* Aft deck planking — dashed horizontals fade downward */}
      {[200, 240, 280, 320, 360].map((y, i) => (
        <line
          key={y}
          x1="150"
          y1={y}
          x2="1050"
          y2={y}
          stroke="currentColor"
          strokeWidth="0.5"
          strokeDasharray="2 6"
          opacity={0.28 - i * 0.045}
        />
      ))}

      {/* Helm wheel — centered on the aft deck */}
      <g transform="translate(600 250)">
        <circle r="58" fill="var(--bp-paper)" stroke="currentColor" strokeWidth="1.5" />
        <circle r="44" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.6" />
        <circle r="6" fill="currentColor" />
        {[0, 45, 90, 135].map((deg) => (
          <line
            key={deg}
            x1={-58 * Math.cos((deg * Math.PI) / 180)}
            y1={-58 * Math.sin((deg * Math.PI) / 180)}
            x2={58 * Math.cos((deg * Math.PI) / 180)}
            y2={58 * Math.sin((deg * Math.PI) / 180)}
            stroke="currentColor"
            strokeWidth="1"
          />
        ))}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <circle
            key={deg}
            cx={64 * Math.cos((deg * Math.PI) / 180)}
            cy={64 * Math.sin((deg * Math.PI) / 180)}
            r="3"
            fill="var(--bp-paper)"
            stroke="currentColor"
            strokeWidth="1"
          />
        ))}
      </g>

      {/* Oar-port rail ticks along hull sides */}
      {Array.from({ length: 5 }, (_, i) => 200 + i * 50).map((y) => (
        <g key={`rail-${y}`}>
          <line x1="140" y1={y} x2="128" y2={y} stroke="currentColor" strokeWidth="0.6" opacity="0.35" />
          <line x1="1060" y1={y} x2="1072" y2={y} stroke="currentColor" strokeWidth="0.6" opacity="0.35" />
        </g>
      ))}
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
    <section
      className="relative bp-root bp-grid overflow-hidden"
      aria-labelledby="helm-heading"
      style={{ background: 'var(--bp-paper)' }}
    >
      {/* Hull sides — CSS, full section height, continues into next sections */}
      <div className="absolute top-0 bottom-0 pointer-events-none"
           style={{ left: '11.67%', width: 2, background: 'var(--bp-ink)' }} />
      <div className="absolute top-0 bottom-0 pointer-events-none"
           style={{ right: '11.67%', width: 2, background: 'var(--bp-ink)' }} />

      {/* Stern structure — SVG anchored to top */}
      <SternStructure />

      {/* Content — starts below stern deck */}
      <div className="relative max-w-5xl mx-auto px-6 md:px-16 pt-[420px] md:pt-[480px] pb-20 md:pb-24">

        {/* Section marker */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <span className="bp-mono text-[11px] md:text-[12px]"
                style={{ color: 'var(--bp-ink-soft)', letterSpacing: '0.28em' }}>
            § I
          </span>
          <span className="bp-node" />
          <span className="bp-mono text-[11px] md:text-[12px]"
                style={{ color: 'var(--bp-ink-soft)', letterSpacing: '0.28em' }}>
            {L('선미 · THE HELM', 'THE HELM')}
          </span>
        </div>
        <div className="bp-gold-rule mx-auto mb-12 md:mb-16" />

        {/* Big centered hero */}
        <h1
          id="helm-heading"
          className="text-center leading-[1.03] tracking-tight break-keep"
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

        {/* Rotating voice */}
        <div className="mt-12 min-h-[48px] flex justify-center">
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
                maxWidth: '700px',
              }}
            >
              {voices[idx]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Compass + input row */}
        <div className="mt-14 md:mt-16 flex flex-col lg:flex-row items-center lg:items-start gap-10 lg:gap-14 justify-center">

          {/* Compass — primary interaction indicator */}
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
          <div className="flex-1 max-w-2xl w-full">
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

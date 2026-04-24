'use client';

/**
 * BowSection — § I · THE HEADING
 *
 * The user (captain) sets the heading. Scouts stand at the forward railing.
 * Blueprint aesthetic: paper + navy ink + gold only on the compass needle
 * and the primary CTA. Preserves all existing Hero interactions:
 *   - rotating placeholder (synced with voices and examples)
 *   - example chips (demo routing)
 *   - direct input (query routing)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { track } from '@/lib/analytics';
import { useLocale } from '@/hooks/useLocale';
import { CompassRose } from './CompassRose';

/* ── Example scenarios — matched with demo routing ── */
interface ExampleData {
  id: string;
  symbol: string;           // mono symbol — replaces emoji
  input: string;
  scenarioLabel: string;
  realQuestion: string;
}

const EXAMPLES_KO: ExampleData[] = [
  {
    id: 'planning',
    symbol: '[P]',
    input: '대표님이 2주 안에 신사업 기획안을 만들어오라고 했어',
    scenarioLabel: '기획안',
    realQuestion: '네가 아는 건 충분하다.\n그걸 대표님 언어로 옮기는 게 문제다.',
  },
  {
    id: 'proposal',
    symbol: '[Q]',
    input: '다음 주 금요일 경쟁 PT인데 상대가 대기업 SI야',
    scenarioLabel: '제안서',
    realQuestion: '규모로는 이길 수 없다.\n고객이 진짜 원하는 걸 먼저 짚어라.',
  },
  {
    id: 'strategy',
    symbol: '[S]',
    input: '경쟁사가 갑자기 가격을 30% 내렸어. 금요일까지 대응 전략 올려야 해',
    scenarioLabel: '대응 전략',
    realQuestion: '가격 전쟁에 끌려가면 진다.\n핵심 고객이 왜 남아있는지가 답이다.',
  },
];

const EXAMPLES_EN: ExampleData[] = [
  {
    id: 'planning',
    symbol: '[P]',
    input: 'My CEO wants a new product proposal in 2 weeks',
    scenarioLabel: 'Planning',
    realQuestion: "You know enough.\nThe problem is translating it\ninto your CEO's language.",
  },
  {
    id: 'proposal',
    symbol: '[Q]',
    input: 'Competitive pitch next Friday against an enterprise SI firm',
    scenarioLabel: 'Proposal',
    realQuestion: "You can't win on scale.\nFind what the client actually needs first.",
  },
  {
    id: 'strategy',
    symbol: '[S]',
    input: 'Competitor just dropped prices 30%. Need a response by Friday',
    scenarioLabel: 'Strategy',
    realQuestion: 'A price war is a losing game.\nThe answer is why your best clients stay.',
  },
];

const VOICES_KO = [
  { pain: 'AI로 뽑아보면 수정이 반이야', solve: '한 번에 쓸 수 있는 결과가 나옵니다' },
  { pain: '뭘 써야 할지 모르겠는데, 프롬프트는 또 어떻게 짜', solve: '고민을 그대로 던지면 됩니다' },
  { pain: '검수 피로도가 너무 높더라고', solve: '약한 곳을 미리 짚어줍니다' },
];
const VOICES_EN = [
  { pain: 'AI output always needs heavy editing', solve: 'Get results you can actually use as-is' },
  { pain: "I don't even know what to write, let alone how to prompt", solve: 'Just describe your situation' },
  { pain: 'Review fatigue is real', solve: 'Weak spots are flagged before you ask' },
];

function useRotatingIndex(count: number, interval = 4000) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [stopped, setStopped] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (stopped) return;
    timerRef.current = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % count);
    }, interval);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [count, interval, stopped]);

  const stop = useCallback(() => {
    setStopped(true);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  return { currentIdx, stop };
}

export function BowSection() {
  const router = useRouter();
  const locale = useLocale();
  const L = (ko: string, en: string) => (locale === 'ko' ? ko : en);
  const examples = locale === 'ko' ? EXAMPLES_KO : EXAMPLES_EN;
  const voices = locale === 'ko' ? VOICES_KO : VOICES_EN;
  const [inputValue, setInputValue] = useState('');
  const [focused, setFocused] = useState(false);
  const { currentIdx, stop: stopRotation } = useRotatingIndex(examples.length);

  const currentExample = examples[currentIdx];
  const currentVoice = voices[currentIdx];

  // Compass needle bearing — rotates per current example to feel alive,
  // and settles/glows when user takes over (focus or input).
  const bearing = focused || inputValue ? 35 : (currentIdx * 120) % 360;
  const compassActive = focused || inputValue.length > 0;

  const handleSubmit = () => {
    const text = inputValue.trim();
    if (!text) return;
    track('landing_hero_submit', { text_length: text.length, used_example: false });
    router.push(`/workspace?q=${encodeURIComponent(text)}`);
  };

  const handleFocus = () => {
    setFocused(true);
    stopRotation();
  };

  const handleScenarioClick = (example: ExampleData) => {
    track('landing_hero_scenario', { scenario: example.id });
    router.push(`/workspace?demo=${example.id}`);
  };

  return (
    <section
      className="bp-root bp-grid relative overflow-hidden"
      aria-labelledby="bow-heading"
    >
      <div className="relative max-w-6xl mx-auto px-5 md:px-8 pt-10 md:pt-16 pb-14 md:pb-20">

        {/* Section marker */}
        <div className="flex items-center justify-between mb-6">
          <span className="bp-section-mark">§ I · {L('방위', 'The Heading')}</span>
          <span
            className="bp-mono text-[10px]"
            style={{ color: 'var(--bp-ink-soft)', letterSpacing: '0.15em' }}
          >
            OVERTURE · PLATE I
          </span>
        </div>
        <div className="bp-gold-rule mb-10" />

        <div className="lg:grid lg:grid-cols-[1.2fr_1fr] lg:gap-16 lg:items-start">

          {/* ─── Left: heading + input ─── */}
          <div className="phrase-entrance">
            <h1
              id="bow-heading"
              className="text-[36px] md:text-[52px] leading-[1.05] tracking-tight break-keep"
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--bp-ink)',
                fontWeight: 700,
              }}
            >
              <span className="lg:whitespace-nowrap">
                {L('내 전문 분야가 아닌 걸', 'When you need to do')}
              </span>
              <br />
              <span className="lg:whitespace-nowrap">
                {L('해야 할 때.', "what you've never done.")}
              </span>
            </h1>

            <p
              className="mt-6 text-[15px] md:text-[17px] leading-relaxed max-w-md break-keep"
              style={{ color: 'var(--bp-ink-soft)' }}
            >
              {L('17명의 선원이 이미 배에 올라와 있다.', '17 crew members are already aboard.')}
              <br />
              {L('방위만 정하면, 출항한다.', 'Name the heading. We set sail.')}
            </p>

            {/* Rotating voice — bilingual blueprint annotation style */}
            <div className="mt-7 min-h-[64px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIdx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                  className="flex flex-col gap-1"
                >
                  <p
                    className="text-[14px] md:text-[15px] italic leading-snug"
                    style={{ color: 'var(--bp-ink-soft)' }}
                  >
                    &ldquo;{currentVoice.pain}&rdquo;
                  </p>
                  <p
                    className="bp-mono text-[12px] md:text-[13px] leading-snug"
                    style={{ color: 'var(--bp-ink)', letterSpacing: '0.04em' }}
                  >
                    → {currentVoice.solve}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Examples — primary path */}
            <div className="mt-8">
              <p
                className="bp-mono text-[10px] mb-3"
                style={{
                  color: 'var(--bp-ink-soft)',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                {L('01. 예시로 체험', '01. Try an example')}
              </p>

              <div className="flex flex-wrap gap-2">
                {examples.map((ex, i) => {
                  const isActive = i === currentIdx && !focused;
                  return (
                    <button
                      key={ex.id}
                      onClick={() => handleScenarioClick(ex)}
                      className="bp-btn-secondary"
                      data-active={isActive}
                    >
                      <span className="bp-mono" style={{ opacity: 0.6 }}>{ex.symbol}</span>
                      <span>{ex.scenarioLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Direct input — secondary path */}
            <div className="mt-8">
              <p
                className="bp-mono text-[10px] mb-3"
                style={{
                  color: 'var(--bp-ink-soft)',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                }}
              >
                {L('02. 또는 직접 입력', '02. Or type your own')}
              </p>

              <div className="bp-input-frame flex items-center gap-3 px-4 py-3">
                <span
                  className="bp-mono text-[11px] shrink-0"
                  style={{ color: 'var(--bp-ink-soft)', letterSpacing: '0.12em' }}
                >
                  ⌕
                </span>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onFocus={handleFocus}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder={focused
                    ? L('고민을 입력하세요…', 'Describe your challenge…')
                    : currentExample.input
                  }
                  maxLength={200}
                  className="bp-input flex-1 outline-none"
                  aria-label={L('내 상황 입력', 'Describe your situation')}
                />
              </div>

              <p
                className="bp-mono text-[10px] mt-2"
                style={{ color: 'var(--bp-ink-soft)', letterSpacing: '0.08em' }}
              >
                {inputValue.trim()
                  ? L('엔터 또는 [출항] 클릭', 'Press Enter or click [Set Sail]')
                  : L('문장으로 적으면 됩니다. 프롬프트 고민 필요 없음', 'Write naturally — no prompt engineering')}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-4">
                <button
                  onClick={handleSubmit}
                  disabled={!inputValue.trim()}
                  className="bp-btn-primary"
                >
                  {L('출항', 'Set Sail')}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2 6h7M6 3l3 3-3 3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="square" strokeLinejoin="miter" />
                  </svg>
                </button>
                <p
                  className="bp-mono text-[10px]"
                  style={{ color: 'var(--bp-ink-soft)', letterSpacing: '0.1em' }}
                >
                  {L('로그인 없이 무료', 'Free — no login')}
                </p>
              </div>
            </div>
          </div>

          {/* ─── Right: compass + real-question card ─── */}
          <div className="hidden lg:block phrase-entrance" style={{ animationDelay: '200ms' }}>

            {/* Compass rose — positioned above the card like a north arrow */}
            <div className="flex items-end gap-5 mb-8">
              <CompassRose size={120} bearing={bearing} active={compassActive} />
              <div>
                <p
                  className="bp-mono text-[9px] mb-1"
                  style={{ color: 'var(--bp-ink-soft)', letterSpacing: '0.18em' }}
                >
                  BEARING
                </p>
                <p
                  className="bp-mono text-[11px]"
                  style={{
                    color: compassActive ? 'var(--bp-gold-deep)' : 'var(--bp-ink)',
                    letterSpacing: '0.12em',
                    transition: 'color 400ms var(--ease-musical)',
                  }}
                >
                  {compassActive
                    ? L('SET · 방위 고정', 'SET · fixed')
                    : L('UNSET · 대기 중', 'UNSET · waiting')}
                </p>
              </div>
            </div>

            {/* Real-question card — blueprint annotation panel */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentExample.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
                className="relative"
                style={{
                  border: '1px solid var(--bp-ink)',
                  background: 'var(--bp-paper)',
                }}
              >
                {/* Plate header */}
                <div
                  className="px-5 py-2 flex items-center justify-between bp-hairline"
                  style={{ borderBottom: '1px solid var(--bp-ink)', borderTop: 'none' }}
                >
                  <span
                    className="bp-mono text-[10px]"
                    style={{ color: 'var(--bp-ink)', letterSpacing: '0.16em' }}
                  >
                    PLATE · {currentExample.symbol}
                  </span>
                  <span
                    className="bp-mono text-[10px]"
                    style={{ color: 'var(--bp-ink-soft)', letterSpacing: '0.14em' }}
                  >
                    30S
                  </span>
                </div>

                {/* Situation — annotated input */}
                <div className="px-5 pt-4 pb-3">
                  <p
                    className="bp-mono text-[9px] mb-2"
                    style={{
                      color: 'var(--bp-ink-soft)',
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {L('A. 내 상황', 'A. Situation')}
                  </p>
                  <p
                    className="text-[13px] leading-snug"
                    style={{ color: 'var(--bp-ink)' }}
                  >
                    &ldquo;{currentExample.input}&rdquo;
                  </p>
                </div>

                <div className="mx-5" style={{ borderTop: '1px dashed var(--bp-ink-faint)' }} />

                {/* First insight — gold accent here */}
                <div className="px-5 pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bp-node bp-node-gold" />
                    <p
                      className="bp-mono text-[9px]"
                      style={{
                        color: 'var(--bp-gold-deep)',
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {L('B. 첫 통찰', 'B. First insight')}
                    </p>
                  </div>
                  <p
                    className="text-[15px] md:text-[17px] leading-snug whitespace-pre-line"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      color: 'var(--bp-ink)',
                    }}
                  >
                    {currentExample.realQuestion}
                  </p>
                </div>

                <div className="mx-5" style={{ borderTop: '1px dashed var(--bp-ink-faint)' }} />

                {/* Next steps — numbered */}
                <div className="px-5 pt-4 pb-5">
                  <p
                    className="bp-mono text-[9px] mb-3"
                    style={{
                      color: 'var(--bp-ink-soft)',
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {L('C. 그다음 자동으로', 'C. Then automatically')}
                  </p>
                  <ol className="space-y-1.5">
                    {[
                      L('구조화된 초안 생성', 'Structured draft'),
                      L('약한 곳 사전 검증', 'Weak spots flagged'),
                      L('제출 가능한 문서 완성', 'Ready to submit'),
                    ].map((step, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2.5 text-[12.5px]"
                        style={{ color: 'var(--bp-ink)' }}
                      >
                        <span
                          className="bp-mono text-[10px]"
                          style={{
                            color: 'var(--bp-ink-soft)',
                            letterSpacing: '0.08em',
                            width: '14px',
                          }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>

        {/* Mobile compass — shown after input on narrow screens */}
        <div className="lg:hidden mt-10 flex items-center gap-4">
          <CompassRose size={88} bearing={bearing} active={compassActive} />
          <div>
            <p
              className="bp-mono text-[9px] mb-1"
              style={{ color: 'var(--bp-ink-soft)', letterSpacing: '0.18em' }}
            >
              BEARING
            </p>
            <p
              className="bp-mono text-[10px]"
              style={{
                color: compassActive ? 'var(--bp-gold-deep)' : 'var(--bp-ink)',
                letterSpacing: '0.12em',
              }}
            >
              {compassActive
                ? L('SET · 방위 고정', 'SET · fixed')
                : L('UNSET · 대기 중', 'UNSET · waiting')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

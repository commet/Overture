'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { StaffLines, TrebleClef } from '@/components/ui/MusicalElements';
import { track } from '@/lib/analytics';
import { ArrowRight } from 'lucide-react';
import { useLocale, type Locale } from '@/hooks/useLocale';

/* ─── Example Data (3개 — 데모 시나리오와 정렬) ─── */
interface ExampleData {
  id: string;
  input: string;
  icon: string;
  scenarioLabel: string;
  realQuestion: { tag: string; text: string };
}

const EXAMPLES_KO: ExampleData[] = [
  {
    id: 'planning',
    input: '대표님이 2주 안에 신사업 기획안을 만들어오라고 했어',
    icon: '📋',
    scenarioLabel: '기획안',
    realQuestion: { tag: '진짜 질문', text: '네가 아는 건 충분하다.\n그걸 대표님 언어로 옮기는 게 문제다.' },
  },
  {
    id: 'proposal',
    input: '다음 주 금요일 경쟁 PT인데 상대가 대기업 SI야',
    icon: '🎯',
    scenarioLabel: '제안서',
    realQuestion: { tag: '진짜 질문', text: '규모로는 이길 수 없다.\n고객이 진짜 원하는 걸 먼저 짚어라.' },
  },
  {
    id: 'strategy',
    input: '경쟁사가 갑자기 가격을 30% 내렸어. 금요일까지 대응 전략 올려야 해',
    icon: '⚖️',
    scenarioLabel: '대응 전략',
    realQuestion: { tag: '진짜 질문', text: '가격 전쟁에 끌려가면 진다.\n핵심 고객이 왜 남아있는지가 답이다.' },
  },
];

const EXAMPLES_EN: ExampleData[] = [
  {
    id: 'planning',
    input: 'My CEO wants a new product proposal in 2 weeks',
    icon: '📋',
    scenarioLabel: 'Planning',
    realQuestion: { tag: 'Real question', text: "You know enough.\nThe problem is translating it\ninto your CEO's language." },
  },
  {
    id: 'proposal',
    input: "Competitive pitch next Friday against an enterprise SI firm",
    icon: '🎯',
    scenarioLabel: 'Proposal',
    realQuestion: { tag: 'Real question', text: "You can't win on scale.\nFind what the client actually needs first." },
  },
  {
    id: 'strategy',
    input: 'Competitor just dropped prices 30%. Need a response by Friday',
    icon: '⚖️',
    scenarioLabel: 'Strategy',
    realQuestion: { tag: 'Real question', text: "A price war is a losing game.\nThe answer is why your best clients stay." },
  },
];

function getExamples(locale: Locale): ExampleData[] {
  return locale === 'ko' ? EXAMPLES_KO : EXAMPLES_EN;
}

/* ─── Voice Quotes (synced with auto-type via currentIdx) ─── */
interface VoiceQuote { pain: string; solve: string }

const VOICES_KO: VoiceQuote[] = [
  { pain: 'AI로 뽑아보면 수정이 반이야', solve: '한 번에 쓸 수 있는 결과가 나옵니다' },
  { pain: '뭘 써야 할지 모르겠는데, 프롬프트는 또 어떻게 짜', solve: '고민을 그대로 던지면 됩니다' },
  { pain: '검수 피로도가 너무 높더라고', solve: '약한 곳을 미리 짚어줍니다' },
];

const VOICES_EN: VoiceQuote[] = [
  { pain: 'AI output always needs heavy editing', solve: 'Get results you can actually use as-is' },
  { pain: "I don't even know what to write, let alone how to prompt", solve: 'Just describe your situation' },
  { pain: 'Review fatigue is real', solve: 'Weak spots are flagged before you ask' },
];

function getVoices(locale: Locale): VoiceQuote[] {
  return locale === 'ko' ? VOICES_KO : VOICES_EN;
}

/* ─── Auto-typing hook ─── */
function useAutoType(examples: ExampleData[], speed = 45, pause = 3500) {
  const [display, setDisplay] = useState('');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userStopped, setUserStopped] = useState(false);
  const phaseRef = useRef<'typing' | 'pausing' | 'clearing'>('typing');
  const charRef = useRef(0);
  const idxRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (userStopped) return;

    const tick = () => {
      const current = examples[idxRef.current].input;

      if (phaseRef.current === 'typing') {
        if (charRef.current <= current.length) {
          setDisplay(current.slice(0, charRef.current));
          charRef.current++;
          timerRef.current = setTimeout(tick, speed);
        } else {
          phaseRef.current = 'pausing';
          timerRef.current = setTimeout(tick, pause);
        }
      } else if (phaseRef.current === 'pausing') {
        phaseRef.current = 'clearing';
        timerRef.current = setTimeout(tick, 400);
      } else {
        const nextIdx = (idxRef.current + 1) % examples.length;
        idxRef.current = nextIdx;
        charRef.current = 0;
        phaseRef.current = 'typing';
        setCurrentIdx(nextIdx);
        setDisplay('');
        timerRef.current = setTimeout(tick, 300);
      }
    };

    timerRef.current = setTimeout(tick, speed);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [examples, speed, pause, userStopped]);

  const stop = useCallback(() => { setUserStopped(true); if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { display, currentIdx, stop, userStopped };
}

/* ─── Motion constants ─── */
const EASE = [0.32, 0.72, 0, 1] as [number, number, number, number];

const cardVariants = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.98 },
};

/* ─── Real Question Card (with payoff hint) ─── */
function RealQuestionCard({ data, locale }: { data: ExampleData; locale: Locale }) {
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.5, ease: EASE }}
      className="rounded-[1.25rem] border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-lg)] overflow-hidden"
    >
      <div className="h-[2px] w-full" style={{ background: 'var(--gradient-gold)' }} />
      {/* Input quote */}
      <div className="px-5 pt-4 pb-3 bg-[var(--bg)]">
        <p className="text-[13px] text-[var(--text-secondary)] leading-snug truncate">
          &ldquo;{data.input}&rdquo;
        </p>
      </div>
      {/* Real question */}
      <div className="px-5 pt-4 pb-5">
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: EASE }}
          className="flex items-center gap-2 mb-3"
        >
          <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-[0.15em] bg-[var(--accent)]/8 px-2.5 py-1 rounded-full">
            {data.realQuestion.tag}
          </span>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.45, ease: EASE }}
          className="text-[18px] md:text-[20px] font-bold text-[var(--text-primary)] leading-snug tracking-tight whitespace-pre-line"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {data.realQuestion.text}
        </motion.p>

        {/* Payoff: what happens next */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4, ease: EASE }}
          className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center gap-2 text-[12px]"
        >
          <span className="text-[var(--accent)] font-medium">{L('초안 생성', 'Draft')}</span>
          <span className="text-[var(--text-tertiary)]">&rarr;</span>
          <span className="text-[var(--accent)] font-medium">{L('사전 검증', 'Pre-validation')}</span>
          <span className="text-[var(--text-tertiary)]">&rarr;</span>
          <span className="text-[var(--accent)] font-medium">{L('제출 가능한 문서', 'Ready to submit')}</span>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ─── Card section (reusable for mobile + desktop) ─── */
function CardSection({ example, locale }: { example: ExampleData; locale: Locale }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={example.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: EASE }}
      >
        <RealQuestionCard data={example} locale={locale} />
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Main Hero ─── */
export function Hero() {
  const router = useRouter();
  const locale = useLocale();
  const examples = getExamples(locale);
  const voices = getVoices(locale);
  const [inputValue, setInputValue] = useState('');
  const [focused, setFocused] = useState(false);
  const { display: autoText, currentIdx, stop: stopAutoType, userStopped } = useAutoType(examples);

  const handleSubmit = () => {
    const text = inputValue.trim() || (userStopped ? '' : autoText) || examples[currentIdx].input;
    if (!text) return;
    track('landing_hero_submit', { text_length: text.length, used_example: !inputValue.trim() });
    router.push(`/workspace?q=${encodeURIComponent(text)}`);
  };

  const handleFocus = () => {
    setFocused(true);
    stopAutoType();
  };

  const handleScenarioClick = (example: ExampleData) => {
    track('landing_hero_scenario', { scenario: example.id });
    router.push(`/workspace?demo=${example.id}`);
  };

  const currentExample = examples[currentIdx];
  const currentVoice = voices[currentIdx];
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;

  return (
    <section className="relative overflow-hidden">
      {/* Concert hall atmosphere */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--gradient-concert-hall)' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--gradient-warm-vignette)' }} />
      <StaffLines opacity={0.04} spacing={14} />

      <div className="relative max-w-5xl mx-auto px-5 md:px-6 pt-16 md:pt-28 pb-12 md:pb-20">
        <div className="lg:grid lg:grid-cols-[1.15fr_1fr] lg:gap-12 lg:items-start">

          {/* ─── Left: Message + Input ─── */}
          <div className="phrase-entrance">
            <h1 className="text-display-xl text-[var(--text-primary)]">
              <span className="lg:whitespace-nowrap">{L('내 전문 분야가 아닌 걸', 'When you have to do')}</span>
              <br />
              <span className="text-gold-gradient">{L('해야 할 때.', "what you've never done.")}</span>
            </h1>

            <p className="mt-5 text-[15px] md:text-[17px] text-[var(--text-secondary)] leading-relaxed max-w-md">
              {L('질문 하나 던지면, 30초 안에 뼈대가 나옵니다.', 'Drop a question, get a structured draft in 30 seconds.')}
              <br />
              {L('채울수록 날카로워집니다.', 'The more you add, the sharper it gets.')}
            </p>

            {/* ─── Rotating Voice: synced with auto-type currentIdx ─── */}
            <div className="mt-6 h-[56px] flex items-center max-w-md">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIdx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="flex flex-col gap-1"
                >
                  <p className="text-[15px] text-[var(--text-secondary)] italic leading-snug">
                    &ldquo;{currentVoice.pain}&rdquo;
                  </p>
                  <p className="text-[15px] text-[var(--accent)] font-semibold leading-snug">
                    &rarr; {currentVoice.solve}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ─── Inline Input ─── */}
            <div className="mt-8">
              <div
                className="relative rounded-[1.25rem] border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-md)] overflow-hidden focus-within:border-[var(--accent)]/40 focus-within:shadow-[var(--glow-gold)]"
                style={{
                  transitionProperty: 'border-color, box-shadow',
                  transitionDuration: '400ms',
                  transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)',
                }}
              >
                <div className="flex items-center gap-3 px-5 py-4">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onFocus={handleFocus}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
                    placeholder={focused ? L('고민을 입력하세요...', 'Describe your challenge...') : undefined}
                    maxLength={200}
                    className="flex-1 bg-transparent text-[15px] text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-tertiary)]"
                  />
                  <button
                    onClick={handleSubmit}
                    className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-[var(--shadow-sm)] hover:shadow-[var(--glow-gold-intense)] active:scale-[0.95] cursor-pointer"
                    style={{
                      background: 'var(--gradient-gold)',
                      transitionProperty: 'box-shadow, transform',
                      transitionDuration: '300ms',
                      transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)',
                    }}
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>

                {/* Auto-typing text (shows when not focused and no user input) */}
                {!focused && !inputValue && (
                  <div className="absolute inset-0 flex items-center px-5 pointer-events-none">
                    <span className="text-[15px] text-[var(--text-tertiary)]">
                      {autoText}<span className="animate-pulse">|</span>
                    </span>
                  </div>
                )}
              </div>

              {/* ─── Mobile-only card: right after input for immediate context ─── */}
              <div className="mt-6 lg:hidden">
                <CardSection example={currentExample} locale={locale} />
              </div>

              {/* ─── Scenario Buttons with active indicator ─── */}
              <div className="flex flex-wrap items-center gap-2 mt-5">
                {examples.map((ex, i) => {
                  const isActive = i === currentIdx && !userStopped;
                  return (
                    <button
                      key={ex.id}
                      onClick={() => handleScenarioClick(ex)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium border cursor-pointer ${
                        isActive
                          ? 'border-[var(--accent)]/40 text-[var(--accent)] bg-[var(--accent)]/[0.06]'
                          : 'border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)] hover:bg-[var(--accent)]/[0.04]'
                      }`}
                      style={{
                        transitionProperty: 'all',
                        transitionDuration: '350ms',
                        transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)',
                      }}
                    >
                      <span>{ex.icon}</span>
                      <span>{ex.scenarioLabel}</span>
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1.5 mt-3 px-1">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="opacity-40 shrink-0">
                  <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 6.3-4 4a.7.7 0 0 1-1 0l-2-2a.7.7 0 1 1 1-1L7 8.8l3.5-3.5a.7.7 0 1 1 1 1z" />
                </svg>
                {L('로그인 없이 무료 체험', 'Free — no login required')}
              </p>
            </div>
          </div>

          {/* ─── Right: Desktop-only Real Question Card ─── */}
          <div className="hidden lg:block phrase-entrance" style={{ animationDelay: '200ms' }}>
            <div className="relative min-h-[220px]">
              <CardSection example={currentExample} locale={locale} />
            </div>

            {/* Treble clef watermark */}
            <div className="absolute -bottom-8 -right-4 pointer-events-none">
              <TrebleClef size={80} color="var(--accent)" opacity={0.04} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

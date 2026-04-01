'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { StaffLines, TrebleClef } from '@/components/ui/MusicalElements';
import { track } from '@/lib/analytics';
import { ArrowRight } from 'lucide-react';
import { PersonaAvatar, type AvatarType } from './PersonaAvatars';

/* ─── Example Data ─── */
interface ExampleData {
  input: string;
  persona: string;
  avatar: AvatarType;
  realQuestion: { tag: string; text: string };
  skeleton: string; // doc_type preview showing domain awareness
  pills: { label: string; value: string }[];
  judge: { name: string; quote: string; action: { tag: string; text: string; link: string } };
}

const EXAMPLES: ExampleData[] = [
  {
    input: '나는 개발자인데 갑자기 대표님이 2주일 안에 기획안을 짜오라고 했어',
    persona: '개발자',
    avatar: 'dev',
    realQuestion: {
      tag: '진짜 질문',
      text: '기획안의 형식이 아니라,\n대표님이 확인하고 싶은 것이 뭔지가 먼저다.',
    },
    skeleton: '배경 → 현황 분석 → 제안 → 기대효과 → 일정 → 리스크',
    pills: [
      { label: '누가 봐?', value: '대표님' },
      { label: '기한?', value: '2주' },
    ],
    judge: {
      name: '대표님은 뭐라고 할까?',
      quote: '방향은 좋은데, 경쟁사 대비 우위가 빠져있어. 그거 넣으면 통과.',
      action: { tag: '필수', text: '경쟁 분석 추가', link: '자동 반영' },
    },
  },
  {
    input: 'PM인데 전략 제안서를 내일까지 내야 하는데 어디서 시작하지',
    persona: 'PM',
    avatar: 'pm',
    realQuestion: {
      tag: '진짜 질문',
      text: '이사회가 읽는 건 첫 3줄뿐이다.\n거기서 승부가 난다.',
    },
    skeleton: '현황 → 기회 분석 → 전략 방향 → 실행 로드맵 → 성공 기준',
    pills: [
      { label: '결정자?', value: '이사회' },
      { label: '핵심?', value: 'ROI' },
    ],
    judge: {
      name: '이사회는 뭐라고 할까?',
      quote: '요약이 너무 길어. 한 문장으로 줄여. 그리고 숫자가 어디 있어?',
      action: { tag: '필수', text: '1줄 요약 + 핵심 수치 추가', link: '자동 반영' },
    },
  },
  {
    input: '디자이너인데 비즈니스 케이스를 만들라고 했다. ROI가 뭐지.',
    persona: '디자이너',
    avatar: 'designer',
    realQuestion: {
      tag: '진짜 질문',
      text: 'CFO는 감성이 아니라 숫자를 산다.\n전환율 데이터 하나면 된다.',
    },
    skeleton: '현황 → 대안 비교 → 추천안 → 재무 분석 → 리스크',
    pills: [
      { label: '목적?', value: '예산 확보' },
      { label: '설득?', value: 'CFO' },
    ],
    judge: {
      name: 'CFO는 뭐라고 할까?',
      quote: '디자인 얘기 말고. 이걸 하면 매출이 얼마나 느는지만 보여줘.',
      action: { tag: '필수', text: '매출 임팩트 수치화', link: '자동 반영' },
    },
  },
  {
    input: '스타트업 CTO인데 투자자 피치덱을 혼자 만들어야 한다',
    persona: 'CTO',
    avatar: 'cto',
    realQuestion: {
      tag: '진짜 질문',
      text: '투자자의 진짜 질문은 단 하나:\n왜 이 팀이어야 하는가.',
    },
    skeleton: 'Problem → Solution → Market → Product → Team → Ask',
    pills: [
      { label: '라운드?', value: 'Seed' },
      { label: '핵심?', value: 'Why now' },
    ],
    judge: {
      name: '투자자는 뭐라고 할까?',
      quote: '기술은 알겠어. 근데 이걸 왜 지금 해야 해? "Why now"이 안 보여.',
      action: { tag: '필수', text: 'Why now 섹션 강화', link: '자동 반영' },
    },
  },
];

/* ─── Auto-typing hook (exposes index) ─── */
function useAutoType(examples: ExampleData[], speed = 45, pause = 2800) {
  const [display, setDisplay] = useState('');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userStopped, setUserStopped] = useState(false);
  const phaseRef = useRef<'typing' | 'pausing' | 'clearing'>('typing');
  const charRef = useRef(0);
  const idxRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const jumpTo = useCallback((idx: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    idxRef.current = idx;
    charRef.current = 0;
    phaseRef.current = 'typing';
    setCurrentIdx(idx);
    setDisplay('');
    setUserStopped(false);
  }, []);

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
        // clearing → next
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

  return { display, currentIdx, jumpTo, stop, userStopped };
}

/* ─── Motion constants ─── */
const EASE = [0.32, 0.72, 0, 1] as [number, number, number, number];

const cardVariants = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.98 },
};

const pillVariants = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 8 },
};

/* ─── Preview Card Components ─── */

function AnalysisCard({ data }: { data: ExampleData }) {
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
      <div className="px-5 pt-4 pb-3 bg-[var(--bg)]">
        <p className="text-[13px] text-[var(--text-secondary)] leading-snug">
          &ldquo;{data.input.length > 40 ? data.input.slice(0, 40) + '...' : data.input}&rdquo;
        </p>
      </div>
      <div className="px-5 pt-3 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: EASE }}
          className="flex items-center gap-2 mb-2"
        >
          <span className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-[0.15em] bg-[var(--accent)]/8 px-2 py-0.5 rounded-full">
            {data.realQuestion.tag}
          </span>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.45, ease: EASE }}
          className="text-[15px] md:text-[17px] font-bold text-[var(--text-primary)] leading-snug tracking-tight whitespace-pre-line"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {data.realQuestion.text}
        </motion.p>
        {/* Document structure preview — shows domain awareness */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3, ease: EASE }}
          className="mt-3 px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border-subtle)]"
        >
          <span className="text-[10px] font-medium text-[var(--accent)] tracking-wide">문서 구조</span>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 leading-relaxed">{data.skeleton}</p>
        </motion.div>
      </div>
    </motion.div>
  );
}

function QAPills({ pills }: { pills: ExampleData['pills'] }) {
  return (
    <motion.div
      variants={pillVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.35, ease: EASE }}
      className="flex items-center gap-2 px-1"
    >
      {pills.map((pill, i) => (
        <motion.div
          key={pill.label}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 + i * 0.08, duration: 0.3, ease: EASE }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--accent)]/[0.04] border border-[var(--accent)]/10 text-[11px]"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <path d="M3 8H13" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="text-[var(--text-tertiary)]">{pill.label}</span>
          <span className="text-[var(--text-primary)] font-medium">{pill.value}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}

function JudgeCard({ judge }: { judge: ExampleData['judge'] }) {
  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.45, ease: EASE, delay: 0.1 }}
      className="rounded-[1.25rem] border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-lg)] overflow-hidden"
    >
      {/* Gold accent line — matches the analysis card's visual weight */}
      <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, var(--accent), transparent)' }} />
      <div className="px-5 py-5">
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35, ease: EASE }}
          className="flex items-center gap-2.5 mb-3"
        >
          <div className="w-7 h-7 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 1a5 5 0 0 1 5 5v1a5 5 0 0 1-10 0V6a5 5 0 0 1 5-5z" stroke="var(--accent)" strokeWidth="1.2" />
              <path d="M5.5 14.5h5" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">{judge.name}</span>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4, ease: EASE }}
          className="text-[14px] text-[var(--text-primary)] italic leading-relaxed"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          &ldquo;{judge.quote}&rdquo;
        </motion.p>
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5, duration: 0.3, ease: EASE }}
          className="flex items-center gap-2.5 mt-3 pt-3 border-t border-[var(--border-subtle)]"
        >
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">{judge.action.tag}</span>
          <span className="text-[11px] text-[var(--text-secondary)]">{judge.action.text}</span>
          <span className="text-[11px] text-[var(--accent)] font-medium">&rarr; {judge.action.link}</span>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ─── Persona selector with avatars ─── */
function PersonaSelector({ examples, activeIdx, onSelect }: { examples: ExampleData[]; activeIdx: number; onSelect: (idx: number) => void }) {
  return (
    <div className="flex items-center gap-4 mt-5">
      {examples.map((ex, i) => {
        const isActive = i === activeIdx;
        return (
          <button
            key={ex.persona}
            onClick={() => onSelect(i)}
            className="group flex flex-col items-center gap-1.5 cursor-pointer bg-transparent border-none p-0"
          >
            {/* Avatar ring */}
            <div
              className="relative transition-all duration-500"
              style={{
                transform: isActive ? 'scale(1.12)' : 'scale(1)',
                opacity: isActive ? 1 : 0.55,
                transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)',
              }}
            >
              {/* Gold ring for active */}
              <div
                className="absolute -inset-[3px] rounded-full transition-all duration-500"
                style={{
                  border: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                  boxShadow: isActive ? '0 0 12px 2px rgba(184,150,62,0.2)' : 'none',
                  transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)',
                }}
              />
              <PersonaAvatar type={ex.avatar} size={42} />
            </div>
            {/* Name label */}
            <span
              className="text-[11px] font-medium transition-all duration-500"
              style={{
                color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)',
              }}
            >
              {ex.persona}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Main Hero ─── */
export function Hero() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState('');
  const [focused, setFocused] = useState(false);
  const { display: autoText, currentIdx, jumpTo, stop: stopAutoType, userStopped } = useAutoType(EXAMPLES);

  const handleSubmit = () => {
    const text = inputValue.trim() || (userStopped ? '' : autoText) || EXAMPLES[currentIdx].input;
    if (!text) return;
    track('landing_hero_submit', { text_length: text.length, used_example: !inputValue.trim() });
    router.push(`/workspace?q=${encodeURIComponent(text)}`);
  };

  const handleFocus = () => {
    setFocused(true);
    stopAutoType();
  };

  const handlePersonaSelect = (idx: number) => {
    track('landing_persona_select', { persona: EXAMPLES[idx].persona });
    jumpTo(idx);
  };

  const currentExample = EXAMPLES[currentIdx];

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
              <span className="lg:whitespace-nowrap">내 전문 분야가 아닌 걸</span>
              <br />
              <span className="text-gold-gradient">해야 할 때.</span>
            </h1>

            <p className="mt-5 text-[15px] md:text-[17px] text-[var(--text-secondary)] leading-relaxed max-w-md">
              질문 하나 던지면, 30초 안에 뼈대가 나옵니다.
              <br />
              채울수록 날카로워집니다.
            </p>

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
                    placeholder={focused ? '고민을 입력하세요...' : undefined}
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

              {/* Persona selector */}
              <PersonaSelector examples={EXAMPLES} activeIdx={currentIdx} onSelect={handlePersonaSelect} />

              <div className="flex items-center justify-between mt-3 px-1">
                <p className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="opacity-40 shrink-0">
                    <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 6.3-4 4a.7.7 0 0 1-1 0l-2-2a.7.7 0 1 1 1-1L7 8.8l3.5-3.5a.7.7 0 1 1 1 1z" />
                  </svg>
                  로그인 없이 무료 체험
                </p>
                <Link
                  href="/demo"
                  onClick={() => track('landing_cta_click', { cta: 'hero_demo' })}
                  className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--accent)]"
                  style={{
                    transitionProperty: 'color',
                    transitionDuration: '300ms',
                    transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)',
                  }}
                >
                  데모 먼저 보기
                </Link>
              </div>
            </div>
          </div>

          {/* ─── Right: Live Preview (synced with current example) ─── */}
          <div className="mt-12 lg:mt-0 phrase-entrance" style={{ animationDelay: '200ms' }}>
            <div className="relative min-h-[340px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIdx}
                  className="space-y-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: EASE }}
                >
                  <AnalysisCard data={currentExample} />
                  <QAPills pills={currentExample.pills} />
                  <JudgeCard judge={currentExample.judge} />
                </motion.div>
              </AnimatePresence>
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

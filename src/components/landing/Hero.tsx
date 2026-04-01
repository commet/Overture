'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { StaffLines, TrebleClef } from '@/components/ui/MusicalElements';
import { track } from '@/lib/analytics';
import { ArrowRight } from 'lucide-react';

/* ─── Auto-typing placeholder examples ─── */
const EXAMPLES = [
  '나는 개발자인데 갑자기 대표님이 2주일 안에 기획안을 짜오라고 했어',
  'PM인데 전략 제안서를 내일까지 내야 하는데 어디서 시작하지',
  '디자이너인데 비즈니스 케이스를 만들라고 했다. ROI가 뭐지.',
  '스타트업 CTO인데 투자자 피치덱을 혼자 만들어야 한다',
];

function useAutoType(examples: string[], speed = 45, pause = 3000) {
  const [display, setDisplay] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const idxRef = useRef(0);
  const charRef = useRef(0);
  const activeRef = useRef(true); // tracks if user has focused the input

  useEffect(() => {
    if (!activeRef.current) return;

    const tick = () => {
      if (!activeRef.current) return;

      const current = examples[idxRef.current];

      if (isTyping) {
        if (charRef.current <= current.length) {
          setDisplay(current.slice(0, charRef.current));
          charRef.current++;
          return speed;
        } else {
          setIsTyping(false);
          return pause;
        }
      } else {
        // Move to next example
        idxRef.current = (idxRef.current + 1) % examples.length;
        charRef.current = 0;
        setDisplay('');
        setIsTyping(true);
        return speed;
      }
    };

    let timeout: ReturnType<typeof setTimeout>;
    const loop = () => {
      const delay = tick();
      if (delay !== undefined) timeout = setTimeout(loop, delay);
    };
    loop();

    return () => clearTimeout(timeout);
  }, [examples, speed, pause, isTyping]);

  const stop = () => { activeRef.current = false; };
  return { display, stop };
}

export function Hero() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState('');
  const [focused, setFocused] = useState(false);
  const { display: autoText, stop: stopAutoType } = useAutoType(EXAMPLES);

  const handleSubmit = () => {
    const text = inputValue.trim() || autoText;
    if (!text) return;
    track('landing_hero_submit', { text_length: text.length, used_example: !inputValue.trim() });
    router.push(`/workspace?q=${encodeURIComponent(text)}`);
  };

  const handleFocus = () => {
    setFocused(true);
    stopAutoType();
  };

  return (
    <section className="relative overflow-hidden">
      {/* Concert hall atmosphere */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--gradient-concert-hall)' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--gradient-warm-vignette)' }} />
      <StaffLines opacity={0.04} spacing={14} />

      <div className="relative max-w-5xl mx-auto px-5 md:px-6 pt-16 md:pt-28 pb-12 md:pb-20">
        <div className="lg:grid lg:grid-cols-[1.15fr_1fr] lg:gap-12 lg:items-center">

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
              <div className="relative rounded-[1.25rem] border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-md)] overflow-hidden focus-within:border-[var(--accent)]/40 focus-within:shadow-[var(--glow-gold)]"
                style={{ transitionProperty: 'border-color, box-shadow', transitionDuration: '400ms', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}>
                <div className="flex items-center gap-3 px-5 py-4">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onFocus={handleFocus}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); } }}
                    placeholder={focused ? '고민을 입력하세요...' : undefined}
                    className="flex-1 bg-transparent text-[15px] text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-tertiary)]"
                  />
                  <button
                    onClick={handleSubmit}
                    className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-[var(--shadow-sm)] hover:shadow-[var(--glow-gold-intense)] active:scale-[0.95] cursor-pointer"
                    style={{ background: 'var(--gradient-gold)', transitionProperty: 'box-shadow, transform', transitionDuration: '300ms', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
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

              <div className="flex items-center justify-between mt-3 px-1">
                <p className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="opacity-40 shrink-0"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 6.3-4 4a.7.7 0 0 1-1 0l-2-2a.7.7 0 1 1 1-1L7 8.8l3.5-3.5a.7.7 0 1 1 1 1z"/></svg>
                  로그인 없이 무료 체험
                </p>
                <Link
                  href="/demo"
                  onClick={() => track('landing_cta_click', { cta: 'hero_demo' })}
                  className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--accent)]"
                  style={{ transitionProperty: 'color', transitionDuration: '300ms', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
                >
                  데모 먼저 보기
                </Link>
              </div>
            </div>
          </div>

          {/* ─── Right: Progressive Flow Preview ─── */}
          <div className="mt-12 lg:mt-0 phrase-entrance" style={{ animationDelay: '200ms' }}>
            <div className="relative space-y-3">

              {/* Step 1: Input + Result */}
              <div className="rounded-[1.25rem] border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-lg)] overflow-hidden">
                <div className="h-[2px] w-full" style={{ background: 'var(--gradient-gold)' }} />
                <div className="px-5 pt-4 pb-3 bg-[var(--bg)]">
                  <p className="text-[13px] text-[var(--text-secondary)] leading-snug">
                    &ldquo;개발자인데 대표님이 2주 안에 기획안을 짜오라고 했어&rdquo;
                  </p>
                </div>
                <div className="px-5 pt-3 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-[0.15em] bg-[var(--accent)]/8 px-2 py-0.5 rounded-full">진짜 질문</span>
                  </div>
                  <p className="text-[15px] md:text-[17px] font-bold text-[var(--text-primary)] leading-snug tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                    기획안의 형식이 아니라,<br />대표님이 확인하고 싶은 것이 뭔지가 먼저다.
                  </p>
                  <div className="flex gap-3 mt-2.5">
                    <span className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1"><span className="text-red-400 text-[10px]">?</span> 전제 3개</span>
                    <span className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1"><span className="text-[var(--accent)]">&#9656;</span> 뼈대 5줄</span>
                  </div>
                </div>
              </div>

              {/* Step 2: Q&A pills */}
              <div className="flex items-center gap-2 px-1">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--accent)]/[0.04] border border-[var(--accent)]/10 text-[11px]">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M3 8H13" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  <span className="text-[var(--text-tertiary)]">누가 봐?</span>
                  <span className="text-[var(--text-primary)] font-medium">대표님</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--accent)]/[0.04] border border-[var(--accent)]/10 text-[11px]">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M3 8H13" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  <span className="text-[var(--text-tertiary)]">기한?</span>
                  <span className="text-[var(--text-primary)] font-medium">2주</span>
                </div>
              </div>

              {/* Step 3: DM Feedback preview */}
              <div className="rounded-[1.25rem] border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-sm)] overflow-hidden">
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-[var(--accent)]/8 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 1a5 5 0 0 1 5 5v1a5 5 0 0 1-10 0V6a5 5 0 0 1 5-5z" stroke="var(--accent)" strokeWidth="1.2"/><path d="M5.5 14.5h5" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round"/></svg>
                    </div>
                    <span className="text-[12px] font-semibold text-[var(--text-primary)]">대표님은 뭐라고 할까?</span>
                  </div>
                  <p className="text-[12px] text-[var(--text-secondary)] italic leading-relaxed">
                    &ldquo;방향은 좋은데, 경쟁사 대비 우위가 빠져있어. 그거 넣으면 통과.&rdquo;
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">필수</span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">경쟁 분석 추가</span>
                    <span className="text-[10px] text-[var(--accent)] font-medium">&rarr; 자동 반영</span>
                  </div>
                </div>
              </div>

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

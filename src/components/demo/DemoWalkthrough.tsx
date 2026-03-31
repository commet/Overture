'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import {
  Play, MessageSquare, Sliders, UserCheck, RefreshCw, Sparkles,
  Check, ArrowRight, ArrowLeft, Bot, Brain, Handshake, ChevronDown,
} from 'lucide-react';
import { track } from '@/lib/analytics';
import { recordSignal } from '@/lib/signal-recorder';

/* ═══════════════════════════════════════
   DEMO DATA — 피봇 시나리오: 개발자가 기획안 써야 하는 상황
   ═══════════════════════════════════════ */

const DEMO = {
  scenario: '백엔드 개발자인데, 대표님이 2주 안에 신사업 기획안을 써오라고 했습니다.',
  context: '기획안을 써본 적이 없습니다. 어디서부터 시작해야 할지 모르겠습니다.',
  surface_task: '2주 안에 신사업 기획안 작성',

  premises: [
    '기획안 형식만 잘 맞추면 통과될 것이다',
    '시장 조사를 잘 정리하면 설득력이 있을 것이다',
    '대표님이 원하는 건 기획안 문서 자체다',
  ],

  governing_idea: '기획안이 아니라, 대표님이 판단하고 싶은 3가지를 먼저 정리한다',
  steps: [
    { task: '대표님이 진짜 확인하고 싶은 것 파악', actor: 'human' as const, time: '2시간' },
    { task: '시장 데이터 + 경쟁사 분석 초안', actor: 'ai' as const, time: '반나절' },
    { task: '판단 근거 구조화 + 기획안 초안', actor: 'both' as const, time: '1일' },
    { task: '대표님 예상 반응 검증 → 최종본', actor: 'human' as const, time: '반나절' },
  ],

  persona: {
    name: '김 대표',
    role: 'CEO · 최종 의사결정자',
    default_reaction: '시장 분석은 됐고, 결국 우리가 이걸 해야 하는 이유가 뭔데? 남들 다 하니까?',
    unspoken_risk: '사실 내가 기획안을 시킨 건, 이 사업을 하지 않을 이유도 같이 찾아오라는 거야. 아무도 그걸 눈치 못 채더라.',
  },

  refine: [
    {
      fixes: [
        { source: '우리가 이걸 해야 하는 이유가 뭔데?', action: '"왜 우리여야 하는가" 섹션 추가 — 자체 기술력 연결', delta: 38 },
        { source: '하지 않을 이유도 찾아오라는 뜻', action: 'Go/No-Go 판단 기준표 포함', delta: 30 },
      ],
      score: 72,
      review: 'Go/No-Go는 좋아. 근데 2주면 뭘 검증할 수 있는 건데? 구체적인 숫자가 없잖아.',
    },
    {
      fixes: [
        { source: '구체적인 숫자가 없다', action: '2주 내 검증 가능한 지표 3개 + 측정 방법 추가', delta: 12 },
        { source: '실현 가능성 의문', action: '1주차 리서치 / 2주차 검증의 타임라인 구체화', delta: 8 },
      ],
      score: 92,
      review: '좋아. 이 정도면 경영회의에 올려볼 만해.',
    },
  ],
};

/* Shared user choices across steps */
const demoChoices = {
  doubted: new Set<number>(),
  actors: {} as Record<number, 'ai' | 'human' | 'both'>,
};

/* ═══════════════════════════════════════
   REFRAMED QUESTION LOGIC
   ═══════════════════════════════════════ */

function getReframed(doubted: Set<number>): { bridge: string; question: string; insight: string } {
  const d0 = doubted.has(0); // 형식만 맞추면
  const d1 = doubted.has(1); // 시장 조사 정리하면
  const d2 = doubted.has(2); // 문서 자체가 목적
  const count = doubted.size;

  if (count === 0) return {
    bridge: '전제가 탄탄하다면 — 실행 속도가 핵심이다.',
    question: '"어떤 형식의 기획안"이 아니라 "가장 빠르게 대표님이 판단할 수 있는 구조"가 진짜 질문이다.',
    insight: '형식보다 판단 가능한 구조를 먼저 잡으세요.',
  };

  if (count === 3) return {
    bridge: '세 전제 모두 흔들린다 — 기획안을 쓰기 전에 질문을 바꿔야 한다.',
    question: '기획안을 쓰는 게 아니라, 대표님이 이 사업에 대해 판단하고 싶은 3가지가 뭔지를 먼저 파악해야 하지 않나?',
    insight: '"뭘 쓸까"가 아니라 "뭘 판단하게 할까"가 진짜 과제입니다.',
  };

  if (d0 && !d1 && !d2) return {
    bridge: '"형식만 맞추면 된다"가 흔들린다 — 형식 뒤의 판단이 진짜다.',
    question: '기획안의 형식이 아니라, 대표님이 이 기획안으로 확인하고 싶은 판단이 뭔지가 먼저다.',
    insight: '예쁜 문서보다 날카로운 질문 3개가 더 강력합니다.',
  };

  if (!d0 && d1 && !d2) return {
    bridge: '"시장 조사를 잘 정리하면 된다"가 흔들린다 — 데이터가 아니라 해석이 핵심이다.',
    question: '시장 데이터를 모으는 게 아니라, 이 데이터가 "우리가 해야 한다"를 입증하는지가 질문이다.',
    insight: '정리가 아니라 판단의 근거를 만들어야 합니다.',
  };

  if (!d0 && !d1 && d2) return {
    bridge: '"대표님이 원하는 건 문서다"가 흔들린다 — 문서 뒤에 진짜 의도가 있다.',
    question: '대표님이 정말 원하는 건 기획안이 아니라, 이 사업을 할지 말지 판단할 근거 아닌가?',
    insight: '문서가 아니라 의사결정 지원이 진짜 과제입니다.',
  };

  if (d0 && d1) return {
    bridge: '"형식"도 의문이고 "시장 조사"도 의문이다 — 기획안의 정의 자체를 바꿔야 한다.',
    question: '기획안이라는 형식을 버리고, 대표님에게 "이 사업을 할지 말지" 판단 자료를 만드는 게 맞지 않나?',
    insight: '기획안 형태가 아니라 판단 자료 형태로 접근하세요.',
  };

  if (d0 && d2) return {
    bridge: '"형식"과 "문서 목적" 둘 다 흔들린다 — 대표님의 진짜 의도를 먼저 파악해야 한다.',
    question: '기획안을 쓰기 전에, 대표님에게 "이 기획안으로 뭘 판단하고 싶으세요?"를 먼저 물어야 하지 않나?',
    insight: '2주를 쓰기 전에 30분 대화가 먼저입니다.',
  };

  // d1 && d2
  return {
    bridge: '"시장 조사"와 "문서 목적" 둘 다 흔들린다 — 방향부터 확인해야 한다.',
    question: '시장 조사를 시작하기 전에, 대표님이 이 사업의 어떤 측면을 보고 싶은 건지 먼저 확인해야 하지 않나?',
    insight: '리서치 전에 질문을 좁혀야 시간을 아낍니다.',
  };
}

/* ═══════════════════════════════════════
   STEPS & UTILITIES
   ═══════════════════════════════════════ */

const STEPS = [
  { id: 'intro', label: '시작', icon: Play },
  { id: 'reframe', label: '문제 재정의', icon: MessageSquare },
  { id: 'recast', label: '실행 설계', icon: Sliders },
  { id: 'persona', label: '사전 검증', icon: UserCheck },
  { id: 'refine', label: '수정 반영', icon: RefreshCw },
  { id: 'outro', label: '결과', icon: Sparkles },
];

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);
  useEffect(() => {
    if (target === prevTarget.current) return;
    const start = prevTarget.current;
    prevTarget.current = target;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + (target - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

/* ═══════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════ */

export function DemoWalkthrough() {
  const [step, setStep] = useState(0);
  const maxStep = STEPS.length - 1;

  const go = (target: number) => {
    const next = Math.max(0, Math.min(target, maxStep));
    setStep(next);
    track('demo_step', { step: next, label: STEPS[next]?.id });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setStep(s => {
          const next = Math.min(s + 1, STEPS.length - 1);
          if (next !== s) window.scrollTo({ top: 0, behavior: 'smooth' });
          return next;
        });
      }
      if (e.key === 'ArrowLeft') {
        setStep(s => {
          const next = Math.max(s - 1, 0);
          if (next !== s) window.scrollTo({ top: 0, behavior: 'smooth' });
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-0">
      {/* Progress */}
      <nav className="flex items-center justify-center gap-0 mb-8 md:mb-12">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = i === step;
          const done = i < step;
          return (
            <Fragment key={s.id}>
              {i > 0 && <div className={`h-px w-4 md:w-8 transition-colors ${done ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />}
              <button
                onClick={() => go(i)}
                className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${active ? 'scale-110' : 'opacity-50 hover:opacity-80'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] transition-colors ${
                  active ? 'bg-[var(--accent)] text-[var(--bg)] shadow-sm' :
                  done ? 'bg-[var(--accent)] text-[var(--bg)]' :
                  'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)]'
                }`}>
                  {done ? <Check size={14} /> : <Icon size={14} />}
                </div>
                <span className={`text-[11px] font-semibold hidden md:block transition-colors ${active ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}>
                  {s.label}
                </span>
              </button>
            </Fragment>
          );
        })}
      </nav>

      {/* Content */}
      <div key={step} className="animate-fade-in">
        {step === 0 && <IntroSection />}
        {step === 1 && <ReframeSection />}
        {step === 2 && <RecastSection />}
        {step === 3 && <PersonaSection />}
        {step === 4 && <RefineSection />}
        {step === 5 && <OutroSection />}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6 pt-6 border-t border-[var(--border-subtle)]">
        {step > 0 ? (
          <Button variant="secondary" size="sm" onClick={() => go(step - 1)}>
            <ArrowLeft size={14} /> 이전
          </Button>
        ) : <div />}
        <span className="text-[12px] text-[var(--text-tertiary)] font-medium tabular-nums">
          {step + 1} / {maxStep + 1}
        </span>
        {step < maxStep ? (
          <Button onClick={() => go(step + 1)}>
            {step === 0 ? '체험 시작' : '다음'} <ArrowRight size={14} />
          </Button>
        ) : (
          <Link href="/workspace">
            <Button>
              직접 시작하기 <ArrowRight size={14} />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   INTRO
   ═══════════════════════════════════════ */

function IntroSection() {
  return (
    <div className="space-y-6 phrase-entrance">
      <div>
        <div className="flex items-center gap-2 text-[12px] text-[var(--accent)] font-semibold tracking-wider uppercase mb-3">
          <Play size={14} /> Demo
        </div>
        <h2 className="text-[28px] md:text-[36px] font-bold text-[var(--text-primary)] leading-tight tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          1분이면 됩니다
        </h2>
        <p className="text-[15px] text-[var(--text-secondary)] mt-3 leading-relaxed max-w-lg">
          실제 업무 시나리오로 Overture가 어떻게 도와주는지 체험하세요.
        </p>
      </div>

      <Card variant="elevated" className="!border-2 !border-[var(--border)]">
        <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--text-tertiary)] mb-3">오늘의 상황</p>
        <p className="text-[16px] md:text-[18px] font-semibold text-[var(--text-primary)] leading-relaxed" style={{ fontFamily: 'var(--font-display)' }}>
          {DEMO.scenario}
        </p>
        <p className="text-[13px] text-[var(--text-secondary)] mt-2 leading-relaxed">
          {DEMO.context}
        </p>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════
   문제 재정의 — 전제 토글 → 질문 실시간 전환
   ═══════════════════════════════════════ */

function ReframeSection() {
  const [doubted, setDoubted] = useState<Set<number>>(new Set());

  useEffect(() => { demoChoices.doubted = doubted; }, [doubted]);

  const toggleDoubt = (i: number) => {
    setDoubted(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const reframed = getReframed(doubted);
  const reframedKey = [...doubted].sort().join('-') || 'none';

  return (
    <div className="phrase-entrance">
      <div className="mb-7">
        <div className="flex items-center gap-2 text-[12px] text-[#2d4a7c] font-semibold tracking-wider uppercase mb-2">
          <MessageSquare size={14} /> 문제 재정의
        </div>
        <h2 className="text-[26px] md:text-[32px] font-bold text-[var(--text-primary)] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          과제 뒤의 숨겨진 전제
        </h2>
        <p className="text-[15px] text-[var(--text-secondary)] mt-2 leading-relaxed">
          의심되는 전제를 탭하세요. <strong className="text-[var(--text-primary)]">질문이 실시간으로 바뀝니다.</strong>
        </p>
      </div>

      {/* ① Original Question */}
      <div className="rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] px-5 py-4">
        <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--text-tertiary)] mb-1.5">원래 질문</p>
        <p className="text-[16px] md:text-[17px] font-semibold text-[var(--text-primary)] leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
          &ldquo;{DEMO.surface_task}&rdquo;
        </p>
      </div>

      <div className="flex justify-center py-1.5">
        <div className="w-px h-5 bg-[var(--border)]" />
      </div>

      {/* ② Hidden Premises */}
      <div>
        <p className="text-[12px] font-bold text-[var(--text-tertiary)] tracking-[0.1em] uppercase mb-3">이 질문 속 숨겨진 전제</p>
        <div className="space-y-2.5">
          {DEMO.premises.map((text, i) => {
            const isDoubted = doubted.has(i);
            return (
              <button
                key={i}
                onClick={() => toggleDoubt(i)}
                className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                  isDoubted
                    ? 'border-red-300 bg-red-50/80 shadow-sm'
                    : 'border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--border)] hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className={`text-[15px] font-medium leading-snug ${isDoubted ? 'text-red-700' : 'text-[var(--text-primary)]'}`}>
                    &ldquo;{text}&rdquo;
                  </p>
                  <span className={`shrink-0 text-[12px] font-bold px-3 py-1.5 rounded-full transition-colors ${
                    isDoubted
                      ? 'bg-red-100 text-red-600'
                      : 'bg-transparent text-[var(--text-tertiary)] border border-dashed border-[var(--border)]'
                  }`}>
                    {isDoubted ? '의심' : '동의'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-center py-1.5">
        <div className="w-px h-5 bg-[var(--border)]" />
      </div>

      {/* ③ Bridge */}
      <div
        key={`bridge-${reframedKey}`}
        className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-5 py-4 animate-fade-in"
      >
        <p className="text-[12px] font-bold text-[var(--accent)] tracking-[0.08em] uppercase mb-2">
          {doubted.size === 0 ? '전제가 모두 탄탄하다면' : `전제 ${doubted.size}개가 흔들린다`}
        </p>
        <p className="text-[15px] font-semibold text-[var(--text-primary)] leading-relaxed">
          {reframed.bridge}
        </p>
        <p className="text-[14px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
          {reframed.insight}
        </p>
      </div>

      {/* Arrow → ④ */}
      <div className="flex flex-col items-center py-1">
        <div className="w-px h-3 bg-[var(--accent)]/30" />
        <ChevronDown size={18} className="text-[var(--accent)] -mt-0.5" />
      </div>

      {/* ④ Reframed Question */}
      <div
        key={reframedKey}
        className="rounded-xl bg-[var(--primary)] text-[var(--bg)] p-6 shadow-lg animate-crescendo"
      >
        <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-white/40 mb-2">재정의된 질문</p>
        <p className="text-[18px] md:text-[21px] font-bold leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
          {reframed.question}
        </p>
      </div>

      {doubted.size > 0 && (
        <div key={`hint-${doubted.size}`} className="mt-4 flex items-center gap-2 px-3 py-2 rounded-full bg-[var(--gold-muted)] animate-fade-in w-fit mx-auto">
          <Sparkles size={11} className="text-[var(--gold)]" />
          <span className="text-[11px] text-[var(--gold)]">
            전제 {doubted.size}개 의심 — 이 성향이 다음 분석에 반영됩니다
          </span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   실행 설계 — 역할 토글 + 분배 바
   ═══════════════════════════════════════ */

function RecastSection() {
  const [actors, setActors] = useState<Record<number, 'ai' | 'human' | 'both'>>(
    Object.fromEntries(DEMO.steps.map((s, i) => [i, s.actor]))
  );

  useEffect(() => { demoChoices.actors = actors; }, [actors]);

  const ACTOR_STYLES: Record<string, { label: string; color: string; Icon: typeof Bot }> = {
    ai: { label: 'AI', color: '#3b6dcc', Icon: Bot },
    both: { label: '협업', color: '#2d6b2d', Icon: Handshake },
    human: { label: '사람', color: '#b8860b', Icon: Brain },
  };

  const total = DEMO.steps.length;
  const counts = { ai: 0, human: 0, both: 0 };
  DEMO.steps.forEach((_, i) => { counts[actors[i] || 'both']++; });

  return (
    <div className="space-y-5 phrase-entrance">
      <div>
        <div className="flex items-center gap-2 text-[12px] text-[#8b6914] font-semibold tracking-wider uppercase mb-2">
          <Sliders size={14} /> 실행 설계
        </div>
        <h2 className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          AI와 사람의 역할 설계
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mt-2">
          <strong className="text-[var(--text-primary)]">역할 배지를 탭</strong>해서 바꿔보세요.
        </p>
      </div>

      {/* Governing idea */}
      <div className="rounded-xl bg-[var(--primary)] text-[var(--bg)] px-5 py-4 shadow-md">
        <p className="text-[15px] font-bold leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
          {DEMO.governing_idea}
        </p>
      </div>

      {/* Role distribution bar */}
      <div className="flex h-8 rounded-xl overflow-hidden text-[12px] font-bold text-white">
        {(['ai', 'both', 'human'] as const).map(actor => {
          if (counts[actor] === 0) return null;
          return (
            <div
              key={actor}
              className="transition-all duration-500 flex items-center justify-center gap-1"
              style={{ width: `${(counts[actor] / total) * 100}%`, backgroundColor: ACTOR_STYLES[actor].color }}
            >
              {ACTOR_STYLES[actor].label} {counts[actor]}
            </div>
          );
        })}
      </div>

      {/* Workflow steps */}
      <div className="space-y-2">
        {DEMO.steps.map((s, i) => {
          const actor = actors[i] || s.actor;
          const style = ACTOR_STYLES[actor];
          return (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3"
              style={{ borderLeft: `3px solid ${style.color}` }}
            >
              <span className="text-[16px] font-bold tabular-nums select-none w-5" style={{ color: `${style.color}40` }}>
                {i + 1}
              </span>
              <p className="flex-1 text-[13px] font-semibold text-[var(--text-primary)] leading-snug min-w-0">
                {s.task}
              </p>
              <div className="shrink-0 inline-flex rounded-lg border border-[var(--border-subtle)] overflow-hidden">
                {(['ai', 'both', 'human'] as const).map(a => {
                  const st = ACTOR_STYLES[a];
                  const active = actor === a;
                  return (
                    <button
                      key={a}
                      onClick={() => setActors(prev => ({ ...prev, [i]: a }))}
                      className={`px-2.5 py-1.5 text-[10px] font-bold transition-all cursor-pointer ${
                        active ? 'text-white' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                      }`}
                      style={active ? { backgroundColor: st.color } : {}}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
              <span className="text-[11px] text-[var(--text-tertiary)] shrink-0 hidden sm:inline w-8 text-right">{s.time}</span>
            </div>
          );
        })}
      </div>

      {(() => {
        const aiCount = Object.values(actors).filter(a => a === 'ai').length;
        const humanCount = Object.values(actors).filter(a => a === 'human').length;
        const changed = DEMO.steps.some((s, i) => actors[i] !== s.actor);
        if (!changed) return null;
        const msg = aiCount >= 3
          ? 'AI 위임 성향 — 체크포인트 권장이 반영됩니다'
          : humanCount >= 3
          ? '직접 실행 선호 — AI 활용 기회를 제안합니다'
          : '균형 있는 배분입니다';
        return (
          <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-full bg-[var(--gold-muted)] animate-fade-in w-fit mx-auto">
            <Sparkles size={11} className="text-[var(--gold)]" />
            <span className="text-[11px] text-[var(--gold)]">{msg}</span>
          </div>
        );
      })()}
    </div>
  );
}

/* ═══════════════════════════════════════
   사전 검증 — 페르소나 즉시 등장 + 동적 반응
   ═══════════════════════════════════════ */

function PersonaSection() {
  const doubted = demoChoices.doubted;
  const actors = demoChoices.actors;

  const aiOnlyCount = DEMO.steps.filter((_, i) => actors[i] === 'ai').length;
  const allConfirmed = doubted.size === 0;

  const reaction = (() => {
    if (aiOnlyCount >= 3) return '이거 AI한테 다 맡기면 누가 판단한 거야? 기획안은 판단이지 자동화가 아니야.';
    if (allConfirmed) return '전제를 다 맞다고 놓은 거야? 기획안에서 가장 위험한 건 "당연하다"고 넘긴 부분이야.';
    return DEMO.persona.default_reaction;
  })();

  const observations: { label: string; text: string }[] = [];
  if (actors[0] === 'ai') {
    observations.push({ label: '대표님 의도 파악 → AI 단독', text: '대표님 머릿속에 있는 걸 AI가 알아? 직접 물어봐야지.' });
  }
  if (actors[3] === 'ai') {
    observations.push({ label: '최종 검증 → AI 단독', text: '내한테 올라오는 기획안을 AI가 검증했다고? 그건 내가 판단할 일이야.' });
  }
  if (!doubted.has(2) && observations.length < 2) {
    observations.push({ label: '"문서가 목적" 확인', text: '기획안이 예쁘면 끝이야? 내가 보고 싶은 건 판단 근거야.' });
  }

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (doubted.size > 0) {
    strengths.push('전제를 의심해본 점 — 기획안의 약점을 미리 파악했습니다.');
  }
  if (actors[0] === 'human' || actors[0] === 'both') {
    strengths.push('대표님 의도 파악에 사람이 참여 — 핵심 판단을 놓치지 않습니다.');
  }
  if (strengths.length === 0) {
    strengths.push('구조화된 접근 — 막막한 상태에서 체계적으로 시작합니다.');
  }

  improvements.push(DEMO.persona.unspoken_risk);
  if (allConfirmed) {
    improvements.push('모든 전제에 동의한 상태 — 대표님이 "왜?"라고 물으면 답이 없을 수 있습니다.');
  }

  return (
    <div className="space-y-5 phrase-entrance">
      <div>
        <div className="flex items-center gap-2 text-[12px] text-[#6b4c9a] font-semibold tracking-wider uppercase mb-2">
          <UserCheck size={14} /> 사전 검증
        </div>
        <h2 className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          대표님은 뭐라고 할까?
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mt-2 leading-relaxed">
          당신의 선택을 바탕으로 판단자의 예상 반응을 시뮬레이션합니다.
        </p>
      </div>

      {/* Persona card */}
      <Card className="!p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-[#6b4c9a] flex items-center justify-center text-white text-[18px] font-bold shrink-0">김</div>
          <div>
            <p className="text-[16px] font-bold text-[var(--text-primary)]">{DEMO.persona.name}</p>
            <p className="text-[13px] text-[var(--text-secondary)]">{DEMO.persona.role}</p>
          </div>
        </div>
        <div className="rounded-xl bg-[var(--ai)] px-4 py-3.5">
          <p className="text-[15px] font-medium text-[var(--text-primary)] leading-relaxed italic">
            &ldquo;{reaction}&rdquo;
          </p>
        </div>
      </Card>

      {/* Dynamic observations */}
      {observations.length > 0 && (
        <div className="space-y-2">
          {observations.slice(0, 2).map((obs, i) => (
            <div key={i} className="rounded-xl border border-[#6b4c9a]/15 bg-[#6b4c9a]/[0.04] px-4 py-3">
              <p className="text-[11px] font-bold text-[#6b4c9a] mb-1">당신의 선택: {obs.label}</p>
              <p className="text-[13px] text-[var(--text-primary)] leading-relaxed italic">&ldquo;{obs.text}&rdquo;</p>
            </div>
          ))}
        </div>
      )}

      {/* Strengths & improvements */}
      <div className="space-y-2">
        {strengths.map((s, i) => (
          <div key={`s-${i}`} className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
            <span className="shrink-0 text-[11px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded mt-0.5">강점</span>
            <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">{s}</p>
          </div>
        ))}
        {improvements.map((imp, i) => (
          <div key={`i-${i}`} className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
            <span className="shrink-0 text-[11px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded mt-0.5">개선점</span>
            <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">{imp}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   수정 반영 — 자동 재생 수렴
   ═══════════════════════════════════════ */

function RefineSection() {
  const [phase, setPhase] = useState<'ready' | 'r1-loading' | 'r1' | 'r2-loading' | 'r2'>('ready');

  useEffect(() => {
    if (phase === 'r1-loading') { const t = setTimeout(() => setPhase('r1'), 1500); return () => clearTimeout(t); }
    if (phase === 'r1') { const t = setTimeout(() => setPhase('r2-loading'), 2000); return () => clearTimeout(t); }
    if (phase === 'r2-loading') { const t = setTimeout(() => setPhase('r2'), 1500); return () => clearTimeout(t); }
  }, [phase]);

  const rawScore = phase === 'r2' ? 92 : (phase === 'r1' || phase === 'r2-loading') ? 72 : 0;
  const score = useCountUp(rawScore);
  const isConverged = phase === 'r2';

  return (
    <div className="space-y-5 phrase-entrance">
      <div>
        <div className="flex items-center gap-2 text-[12px] text-[#2d6b2d] font-semibold tracking-wider uppercase mb-2">
          <RefreshCw size={14} /> 수정 반영
        </div>
        <h2 className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          피드백을 반영하고 수렴합니다
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mt-2">
          대표님 피드백을 자동 반영하고, 다시 검토합니다.
        </p>
      </div>

      {/* Score */}
      {score > 0 && (
        <div className={`rounded-2xl overflow-hidden border transition-all duration-500 ${
          isConverged ? 'border-[#2d6b2d] bg-[#2d6b2d]' : 'border-[#2d6b2d]/20 bg-[#2d6b2d]/[0.06]'
        }`}>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className={`text-[11px] font-medium mb-0.5 ${isConverged ? 'text-white/60' : 'text-[var(--text-tertiary)]'}`}>실행 준비도</p>
              <p className={`text-[32px] font-extrabold leading-none tabular-nums ${isConverged ? 'text-white' : 'text-[#2d6b2d]'}`}>{score}%</p>
            </div>
            {isConverged && (
              <div className="flex items-center gap-2 text-white">
                <Check size={18} />
                <span className="text-[14px] font-bold">완료</span>
              </div>
            )}
          </div>
          {!isConverged && (
            <div className="h-2 bg-[var(--border)]">
              <div className="h-full bg-[#2d6b2d] transition-all duration-1000 rounded-r" style={{ width: `${score}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Start */}
      {phase === 'ready' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-4">
            <p className="text-[12px] font-bold text-[#2d6b2d] tracking-[0.08em] uppercase mb-3">수정 반영이 진행되면</p>
            <ol className="space-y-2 text-[14px] text-[var(--text-secondary)] leading-relaxed">
              <li className="flex items-start gap-2.5">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[#2d6b2d]/10 text-[#2d6b2d] text-[11px] font-bold flex items-center justify-center mt-0.5">1</span>
                사전 검증에서 나온 <strong className="text-[var(--text-primary)]">개선점을 계획에 자동 반영</strong>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[#2d6b2d]/10 text-[#2d6b2d] text-[11px] font-bold flex items-center justify-center mt-0.5">2</span>
                판단자가 수정된 계획을 <strong className="text-[var(--text-primary)]">다시 검토</strong>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[#2d6b2d]/10 text-[#2d6b2d] text-[11px] font-bold flex items-center justify-center mt-0.5">3</span>
                준비도가 충분히 높아질 때까지 <strong className="text-[var(--text-primary)]">자동 반복</strong>
              </li>
            </ol>
          </div>
          <button
            onClick={() => setPhase('r1-loading')}
            className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-[#2d6b2d] text-white text-[15px] font-bold hover:bg-[#245524] transition-colors cursor-pointer active:scale-[0.98]"
          >
            수정 시작 <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Loading */}
      {(phase === 'r1-loading' || phase === 'r2-loading') && (
        <div className="text-center py-8 animate-fade-in">
          <div className="w-8 h-8 rounded-full border-2 border-[#2d6b2d] border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-[14px] text-[var(--text-secondary)]">
            {phase === 'r1-loading' ? '피드백을 반영하여 수정 중...' : '추가 피드백을 반영 중...'}
          </p>
        </div>
      )}

      {/* Revision results */}
      {(phase === 'r1' || phase === 'r2-loading' || phase === 'r2') && (
        <div className="space-y-5 animate-fade-in">
          {DEMO.refine.slice(0, phase === 'r1' ? 1 : 2).map((r, idx) => (
            <div key={idx} className="space-y-3">
              <p className="text-[14px] font-bold text-[#2d6b2d]">{idx + 1}차 수정</p>

              {r.fixes.map((f, fi) => (
                <div key={fi} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] overflow-hidden">
                  <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[#6b4c9a]/[0.03]">
                    <p className="text-[11px] font-bold text-[#6b4c9a] mb-0.5">{DEMO.persona.name} 피드백</p>
                    <p className="text-[14px] text-[var(--text-primary)] italic">&ldquo;{f.source}&rdquo;</p>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <Check size={14} className="text-[#2d6b2d] shrink-0 mt-0.5" />
                      <p className="text-[14px] font-medium text-[var(--text-primary)]">{f.action}</p>
                    </div>
                    <span className="shrink-0 text-[12px] font-bold text-[#2d6b2d] bg-[#2d6b2d]/10 px-2.5 py-1 rounded-full tabular-nums">+{f.delta}%</span>
                  </div>
                </div>
              ))}

              <div className="rounded-xl bg-[var(--ai)] px-4 py-3.5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#6b4c9a] flex items-center justify-center text-white text-[12px] font-bold shrink-0 mt-0.5">김</div>
                <div>
                  <p className="text-[11px] font-bold text-[#6b4c9a] mb-1">수정 후 재검토</p>
                  <p className="text-[15px] font-medium text-[var(--text-primary)] leading-relaxed italic">&ldquo;{r.review}&rdquo;</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isConverged && (
        <div className="rounded-xl border-2 border-[#2d6b2d] bg-[#2d6b2d]/[0.04] px-5 py-4 text-center animate-fade-in">
          <p className="text-[18px] font-extrabold text-[#2d6b2d]" style={{ fontFamily: 'var(--font-display)' }}>수정 완료</p>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">2회 반복으로 실행 준비도 92%에 도달했습니다</p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   결과 — CTA
   ═══════════════════════════════════════ */

function OutroSection() {
  const reframed = getReframed(demoChoices.doubted);
  const seedRecorded = useRef(false);

  useEffect(() => {
    if (seedRecorded.current) return;
    seedRecorded.current = true;

    const aiOnlySteps = DEMO.steps.filter((_, i) => demoChoices.actors[i] === 'ai').length;
    const humanOnlySteps = DEMO.steps.filter((_, i) => demoChoices.actors[i] === 'human').length;

    recordSignal({
      tool: 'reframe',
      signal_type: 'demo_seed',
      signal_data: {
        doubted_count: demoChoices.doubted.size,
        total_premises: DEMO.premises.length,
        ai_only_steps: aiOnlySteps,
        human_only_steps: humanOnlySteps,
        total_steps: DEMO.steps.length,
        completed: true,
      },
    });
  }, []);

  return (
    <div className="space-y-6 phrase-entrance">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 text-[12px] text-[var(--success)] font-semibold tracking-wider uppercase mb-3">
          <Sparkles size={14} /> 완료
        </div>
        <h2 className="text-[28px] md:text-[36px] font-bold text-[var(--text-primary)] leading-tight tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          막막했던 기획안이<br />
          <span className="text-[var(--accent)]">판단 가능한 구조</span>가 되었습니다
        </h2>
      </div>

      {/* Deliverable 1: Reframed question */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center gap-2">
          <MessageSquare size={14} className="text-[#2d4a7c]" />
          <span className="text-[13px] font-bold text-[var(--text-primary)]">재정의된 질문</span>
        </div>
        <div className="px-5 py-4">
          <p className="text-[14px] text-[var(--text-tertiary)] line-through mb-2">&ldquo;{DEMO.surface_task}&rdquo;</p>
          <p className="text-[15px] font-semibold text-[var(--text-primary)] leading-relaxed">
            &ldquo;{reframed.question}&rdquo;
          </p>
        </div>
      </div>

      {/* Deliverable 2: Thinking Summary */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center gap-2">
          <Sliders size={14} className="text-[#8b6914]" />
          <span className="text-[13px] font-bold text-[var(--text-primary)]">Thinking Summary</span>
          <span className="text-[10px] font-bold text-[#8b6914] bg-[#8b6914]/10 px-2 py-0.5 rounded-full">팀 공유용</span>
        </div>
        <div className="px-5 py-4">
          <div className="rounded-lg bg-[var(--bg)] border border-[var(--border-subtle)] px-4 py-3 text-[13px] text-[var(--text-secondary)] leading-relaxed space-y-2">
            <p className="font-semibold text-[var(--text-primary)]">신사업 기획안 — 검토 요약</p>
            <p>핵심 질문을 &ldquo;기획안 작성&rdquo;에서 &ldquo;대표님이 판단할 수 있는 구조 설계&rdquo;로 재정의했습니다.</p>
            <p>4단계 실행 계획 수립, AI/사람 역할 배분 완료. 대표님 피드백 2회 반영, 실행 준비도 92%.</p>
            <p className="text-[var(--text-tertiary)]">다음 단계: 대표님에게 "이 기획안으로 뭘 판단하고 싶으세요?" 확인</p>
          </div>
        </div>
      </div>

      {/* Deliverable 3: Agent Harness */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center gap-2">
          <Bot size={14} className="text-[var(--accent)]" />
          <span className="text-[13px] font-bold text-[var(--text-primary)]">Agent Harness</span>
          <span className="text-[10px] font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-full">CLAUDE.md</span>
        </div>
        <div className="px-5 py-4">
          <div className="rounded-lg bg-[var(--bg)] border border-[var(--border-subtle)] px-4 py-3 font-mono text-[12px] text-[var(--text-secondary)] leading-relaxed space-y-1">
            <p className="text-[var(--text-tertiary)]"># 신사업 기획안 — Agent 실행 지시서</p>
            <p>- 검증된 전제: 3개 중 {demoChoices.doubted.size}개 재검증 완료</p>
            <p>- 판단자 조건: {DEMO.persona.name} 승인 기준 반영</p>
            <p>- 실행 계획: 4단계 · 역할 배분 확정</p>
            <p className="text-[var(--text-tertiary)]">...</p>
          </div>
          <p className="text-[13px] text-[var(--text-tertiary)] mt-3">
            당신의 판단이 에이전트 instruction이 됩니다.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center pt-2">
        <p className="text-[15px] text-[var(--text-secondary)] mb-4">
          당신의 과제로 직접 만들어보세요.
        </p>
        <Link href="/workspace">
          <Button>
            지금 바로 시작하기 <ArrowRight size={14} />
          </Button>
        </Link>
        <p className="text-[11px] text-[var(--text-tertiary)] mt-3">
          로그인 없이 무료
        </p>
      </div>
    </div>
  );
}

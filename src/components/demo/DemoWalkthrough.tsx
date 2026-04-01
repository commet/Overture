'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import {
  Sparkles, Check, ArrowRight, ArrowLeft, UserCheck, AlertTriangle,
  Zap, Lightbulb, Target, Shield, Loader2, Eye,
} from 'lucide-react';
import { track, trackTime } from '@/lib/analytics';
import { recordSignal } from '@/lib/signal-recorder';
import { CrescendoHairpin, StaffLines } from '@/components/ui/MusicalElements';

/* Bezel Card — gradient border + inset shadow (from ProgressiveFlow) */
function BezelCard({ active = true, className = '', children }: { active?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-[1.75rem] p-[1px] ${
      active ? 'bg-gradient-to-b from-[var(--accent)]/25 to-[var(--accent)]/5' : 'bg-[var(--border-subtle)]'
    } ${className}`}>
      <div className="rounded-[calc(1.75rem-1px)] bg-[var(--surface)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   DEMO DATA
   ═══════════════════════════════════════ */

const SCENARIO = '나는 백엔드 개발자인데, 대표님이 2주 안에 신사업 기획안을 써오라고 했어.';

const FIRST_DRAFT = {
  insight: '기획안을 "쓰는" 게 과제가 아닙니다.\n대표님이 이 사업의 Go/No-Go를 결정할 수 있는 판단 자료 — 그걸 만드는 겁니다.\n그리고 핵심 판단 항목인 "기술적으로 되는가"는 당신만 답할 수 있습니다.',
  skeleton: [
    '"왜 지금이야?" — 우리가 포착한 시장 타이밍의 근거',
    '"우리가 할 수 있어?" — 백엔드 기술력이 이 사업에서 무기인 이유',
    '"진짜 되는 거야?" — 2주 안에 확인할 수 있는 것 vs 가정으로 남길 것',
    '"얼마나 들어?" — 최소 비용으로 최대한 빨리 배우는 구조',
    '"안 되면?" — 철수 기준이 포함된 Go/No-Go 판단표',
  ],
  immediate_action: '오늘 대표님에게 이 한마디만 하세요.\n"기획안 드리기 전에, 이 기획안으로 어떤 결정을 내리실 건지 여쭤봐도 될까요?"',
  immediate_action_why: '이 답변 하나가 2주 전체의 방향을 잡아줍니다.',
  premises: [
    { wrong: '완벽한 문서를 써야 한다', right: '판단 가능한 최소 구조면 충분합니다' },
    { wrong: '데이터를 많이 모아야 설득력 있다', right: '데이터 3개면 충분합니다. 해석이 핵심입니다' },
    { wrong: '기획을 모르니까 못 한다', right: '"이게 되나?" 따지는 능력이 기획의 80%입니다' },
  ],
};

const INTERVIEW_Q1 = {
  question: '이 결과물을 누가 최종 판단해?',
  options: [
    { label: '대표님/CEO', value: 'ceo' },
    { label: '팀장/이사', value: 'manager' },
    { label: '투자자/외부', value: 'investor' },
    { label: '아직 모름', value: 'unknown' },
  ],
};

const INTERVIEW_Q2 = {
  question: '지금 가장 걱정되는 건?',
  options: [
    { label: '뭘 써야 할지 모르겠음', value: 'direction' },
    { label: '설득력이 부족할 것 같음', value: 'persuasion' },
    { label: '시간이 부족함', value: 'time' },
    { label: '내가 기획을 모름', value: 'expertise' },
  ],
};

/* Updated draft after interview — varies by Q2 answer */
function getUpdatedDraft(q2: string) {
  const base = {
    situation_update: '',
    real_question_before: '기획안을 "쓰는" 게 과제가 아닙니다. 판단 자료를 만드는 겁니다.',
    real_question_after: '',
    skeleton: [...FIRST_DRAFT.skeleton],
    premises_confirmed: '',
    premises_risk: '',
    premises_uncertain: '',
    check_items: [] as string[],
  };

  if (q2 === 'direction') {
    base.situation_update = '뭘 써야 할지 모르는 게 당연합니다. 아직 대표님이 뭘 판단하려는지 모르니까요.';
    base.real_question_after = '기획안을 쓰는 게 아니라, 대표님이 이 사업에 대해 "3가지를 판단할 수 있는 구조"를 만드는 것이 진짜 과제다.';
    base.skeleton[0] = '"뭘 판단하게 할 건데?" — 대표님이 알고 싶은 3가지를 먼저 정의';
    base.skeleton[1] = '"근거가 뭔데?" — 각 항목당 데이터 1~2개, 해석이 핵심';
    base.premises_confirmed = '기획 경험이 없어도 구조화된 판단 자료는 만들 수 있다';
    base.premises_risk = '대표님이 원하는 건 문서가 아니라 판단 근거다 — 확인 필요';
    base.premises_uncertain = '시장 데이터의 양보다 해석의 질이 중요하다';
    base.check_items = ['대표님에게 "이 기획안으로 뭘 판단하고 싶으세요?" 직접 물어보기', '2주 내 검증 가능한 것과 불가능한 것 분리하기'];
  } else if (q2 === 'persuasion') {
    base.situation_update = '설득력은 데이터 양이 아니라 논리 구조에서 나옵니다. "왜 우리가, 왜 지금" — 이 답이 명확하면 됩니다.';
    base.real_question_after = '설득력 있는 기획안은 데이터가 많은 게 아니라, "왜 지금 우리가 해야 하는가"에 대한 답이 명확한 것이다.';
    base.skeleton[0] = '"왜 지금, 왜 우리?" — 이 한 문장이 기획안 전체의 무게 중심';
    base.skeleton[2] = '"남들이랑 뭐가 달라?" — 기술 우위를 비즈니스 언어로 번역';
    base.premises_confirmed = '기획 경험 없이도 구조화된 논거는 가능하다';
    base.premises_risk = '데이터 양이 아니라 논리 구조가 설득력을 결정한다';
    base.premises_uncertain = '대표님이 원하는 수준의 구체성이 어디까지인지';
    base.check_items = ['대표님이 최근 승인/거절한 기획안 1개 구해서 구조 분석', '"왜 우리가?" 질문에 3문장으로 답할 수 있는지 테스트'];
  } else if (q2 === 'time') {
    base.situation_update = '2주 안에 완벽한 기획안은 불가능합니다. 목표를 바꿔야 합니다. "이것만 보면 판단할 수 있다"는 최소 구조를 만드세요.';
    base.real_question_after = '2주 안에 완벽한 기획안은 불가능하다. "이것만 보면 Go/No-Go를 판단할 수 있다"는 수준이 목표다.';
    base.skeleton[0] = '"됐어, 안 됐어?" — Go/No-Go 판단 기준 3개, 1주차에 확정';
    base.skeleton[3] = '"일정은?" — 1주차 리서치+구조화, 2주차 검증+완성';
    base.premises_confirmed = '짧은 시간에는 범위를 좁히는 게 핵심이다';
    base.premises_risk = '완벽한 기획안을 기대하고 있을 수 있다 — 기대 관리 필요';
    base.premises_uncertain = '대표님이 2주 뒤 어떤 형태를 기대하는지';
    base.check_items = ['대표님에게 "2주 뒤에 어떤 형태를 기대하세요?" 확인', '검증 가능한 것 vs 가정으로 남길 것 명확히 분리'];
  } else {
    base.situation_update = '기획을 모른다고요? 오히려 좋습니다. 기획의 핵심은 "이게 되나?"를 따지는 건데, 그건 개발자가 가장 잘합니다.';
    base.real_question_after = '기획 경험이 없는 게 문제가 아니다. 개발자의 "이게 진짜 되나?" 본능이 오히려 기획의 핵심 무기다.';
    base.skeleton[0] = '"이게 되는 거야?" — 구조적 검증, 개발자의 본능이 기획의 핵심';
    base.skeleton[1] = '"기술적으로 가능해?" — 개발자만 쓸 수 있는 섹션';
    base.premises_confirmed = '개발자의 기술적 판단력은 기획의 핵심 자산이다';
    base.premises_risk = '기획 = 글쓰기라는 오해. 기획 = 판단 구조화';
    base.premises_uncertain = '비기술 부분(시장/재무)은 어디까지 다뤄야 하는지';
    base.check_items = ['기술 가능성 분석을 기획안의 차별점으로 배치', '비기술 파트는 AI로 초안 + 전문가 검증 구조로'];
  }

  return base;
}

/* Persona reaction varies by user choices */
function getPersonaReaction(q2: string) {
  const name = '김 대표';
  const base_reaction = '시장 분석은 됐고, 결국 우리가 이걸 해야 하는 이유가 뭔데? 남들 다 하니까?';

  const specific: Record<string, string> = {
    direction: '방향을 정리한 건 좋아. 근데 이 3가지 판단 항목이 정말 내가 알고 싶은 건지는 직접 들어봐야 해.',
    persuasion: '논리 구조는 괜찮아. 근데 "왜 우리?"에 대한 답이 아직 추상적이야. 구체적인 수치가 있어야 해.',
    time: '2주 짜리 계획은 현실적이야. 근데 Go/No-Go 기준이 너무 낙관적이야. 실패 기준도 넣어.',
    expertise: '개발자 관점이 들어간 건 오히려 좋아. 근데 시장 부분이 너무 얕아. 그건 보완해.',
  };

  return {
    name,
    reaction: specific[q2] || base_reaction,
    unspoken: '사실 이 기획안을 시킨 건, 이 사업을 하지 않을 이유도 같이 찾아오라는 거야.',
    weaknesses: [
      '"왜 우리가 해야 하는가"에 대한 구체적 답이 없다',
      '2주 안에 실제로 검증할 수 있는 것과 가정의 구분이 모호하다',
      'Go/No-Go 판단 기준에 "하지 않는 선택지"가 빠져 있다',
    ],
    fixes: [
      { text: '"왜 우리여야 하는가" — 기존 기술력/팀 역량과의 구체적 연결', impact: '설득력 +40%' },
      { text: '2주 검증 계획 — 1주차/2주차 구체적 일정과 산출물', impact: '실행력 +30%' },
      { text: 'Go/No-Go 판단표 — "하지 않는다"도 옵션으로 포함', impact: '신뢰도 +25%' },
    ],
  };
}

/* ═══════════════════════════════════════
   CONFIG & HELPERS
   ═══════════════════════════════════════ */

const STEP_LABELS = ['상황', '즉시 초안', '질문 → 진화', '대표님 반응', '반영', '최종'];

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
   MAIN
   ═══════════════════════════════════════ */

export function DemoWalkthrough() {
  const [step, setStep] = useState(0);
  const [q1Answer, setQ1Answer] = useState('');
  const [q2Answer, setQ2Answer] = useState('');
  const [fixesApplied, setFixesApplied] = useState<Set<number>>(new Set());
  const maxStep = STEP_LABELS.length - 1;
  const stepTimerRef = useRef<(() => void) | null>(null);
  const entryTimeRef = useRef(Date.now());
  const hasSeenAnalysis = useRef(false);

  useEffect(() => {
    track('demo_enter');
    entryTimeRef.current = Date.now();
    stepTimerRef.current = trackTime('demo_step_time', { step: 0, label: STEP_LABELS[0] });
    const onUnload = () => {
      track('demo_drop', {
        last_step: step,
        label: STEP_LABELS[step],
        total_time_ms: Date.now() - entryTimeRef.current,
        q1: q1Answer || null,
        q2: q2Answer || null,
        fixes_applied: fixesApplied.size,
        completed: step === maxStep,
      });
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (target: number) => {
    const next = Math.max(0, Math.min(target, maxStep));
    if (stepTimerRef.current) stepTimerRef.current();
    stepTimerRef.current = trackTime('demo_step_time', { step: next, label: STEP_LABELS[next] });
    setStep(next);
    track('demo_step', { step: next, label: STEP_LABELS[next], from_step: step });
    if (next === maxStep) {
      track('demo_complete', {
        total_time_ms: Date.now() - entryTimeRef.current,
        q1: q1Answer,
        q2: q2Answer,
        fixes_applied: fixesApplied.size,
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(step + 1);
      if (e.key === 'ArrowLeft') go(step - 1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const canAdvance = (s: number) => {
    if (s === 2 && (!q1Answer || !q2Answer)) return false;
    return true;
  };

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-0 relative">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        background: step >= 5
          ? 'radial-gradient(ellipse 80% 50% at 50% 20%, rgba(184,150,62,0.08) 0%, transparent 70%)'
          : step >= 1
          ? 'radial-gradient(ellipse 80% 50% at 50% 20%, rgba(184,150,62,0.03) 0%, transparent 70%)'
          : 'none',
        transition: 'background 1.5s cubic-bezier(0.32,0.72,0,1)',
      }} />

      {/* Progress stepper */}
      <nav className="flex items-center justify-center mb-10 md:mb-14 px-1">
        {STEP_LABELS.map((label, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <Fragment key={i}>
              {i > 0 && (
                <div className={`flex-1 h-[2px] mx-0.5 md:mx-1 transition-all duration-500 rounded-full ${
                  done ? '' : 'bg-[var(--border-subtle)]'
                }`} style={done ? { background: 'var(--gradient-gold)' } : undefined} />
              )}
              <button
                onClick={() => go(i)}
                className={`flex flex-col items-center gap-1.5 cursor-pointer transition-all shrink-0 ${
                  active ? '' : done ? 'opacity-70' : 'opacity-35'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-all ${
                  active ? 'bg-[var(--accent)] text-white shadow-[var(--glow-accent)] scale-110' :
                  done ? 'bg-[var(--accent)]/15 text-[var(--accent)]' :
                  'bg-[var(--border-subtle)] text-[var(--text-tertiary)]'
                }`}>
                  {done ? <Check size={13} /> : i + 1}
                </div>
                <span className={`text-[10px] md:text-[12px] font-semibold whitespace-nowrap ${
                  active ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'
                }`}>
                  {label}
                </span>
              </button>
            </Fragment>
          );
        })}
      </nav>

      {/* Content */}
      <div key={step} className="animate-fade-in">
        {step === 0 && <IntroStep />}
        {step === 1 && (
          <FirstDraftStep
            skipLoading={hasSeenAnalysis.current}
            onLoaded={() => { hasSeenAnalysis.current = true; }}
          />
        )}
        {step === 2 && <InterviewStep q1={q1Answer} q2={q2Answer} setQ1={setQ1Answer} setQ2={setQ2Answer} />}
        {step === 3 && <PersonaStep q2={q2Answer} />}
        {step === 4 && <FixStep q2={q2Answer} applied={fixesApplied} setApplied={setFixesApplied} />}
        {step === 5 && <FinalStep q2={q2Answer} applied={fixesApplied} />}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--border-subtle)]">
        {step > 0 ? (
          <Button variant="secondary" size="sm" onClick={() => go(step - 1)}>
            <ArrowLeft size={14} /> 이전
          </Button>
        ) : <div />}
        <span className="text-[13px] text-[var(--text-tertiary)] font-medium tabular-nums">
          {step + 1} / {maxStep + 1}
        </span>
        {step < maxStep ? (
          <Button
            variant={step === 0 ? 'accent' : 'primary'}
            size={step === 0 ? 'lg' : 'md'}
            onClick={() => go(step + 1)}
            disabled={!canAdvance(step)}
          >
            {step === 0 ? '체험 시작' : '다음'} <ArrowRight size={14} />
          </Button>
        ) : (
          <Link href="/workspace" onClick={() => track('demo_to_workspace', { from_step: step })}>
            <Button variant="accent" size="lg">
              내 과제로 시작하기 <ArrowRight size={14} />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   STEP 0: Intro — 타이핑 시뮬레이션
   ═══════════════════════════════════════ */

function IntroStep() {
  const [typed, setTyped] = useState('');
  const [typingDone, setTypingDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let i = 0;
    const type = () => {
      if (cancelled) return;
      if (i < SCENARIO.length) {
        i++;
        setTyped(SCENARIO.slice(0, i));
        setTimeout(type, 30 + Math.random() * 40);
      } else {
        setTimeout(() => { if (!cancelled) setTypingDone(true); }, 500);
      }
    };
    setTimeout(type, 600);
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-8 phrase-entrance">
      <div>
        <Badge variant="gold">DEMO</Badge>
        <h2 className="text-[32px] md:text-[40px] font-bold text-[var(--text-primary)] leading-tight tracking-tight mt-3" style={{ fontFamily: 'var(--font-display)' }}>
          1분이면 됩니다
        </h2>
        <p className="text-[16px] md:text-[18px] text-[var(--text-secondary)] mt-4 leading-relaxed max-w-lg">
          막막할 때는, 상황을 일단 꺼내놓으세요.<br className="hidden md:block" />
          거기서부터 길이 보입니다.
        </p>
      </div>

      {/* 입력 시뮬레이션 — 사용자가 직접 치는 느낌 */}
      <div className={`rounded-[1.75rem] p-[1px] transition-all duration-500 ${
        typingDone
          ? 'bg-gradient-to-b from-[var(--accent)]/30 to-[var(--accent)]/10 shadow-[var(--glow-accent)]'
          : 'bg-[var(--border)]'
      }`}>
        <div className="rounded-[calc(1.75rem-1px)] bg-[var(--surface)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] px-6 py-5 min-h-[100px]">
          <p className="text-[13px] font-semibold text-[var(--text-tertiary)] mb-3">당신의 상황을 입력하세요</p>
          <p className="text-[18px] md:text-[20px] text-[var(--text-primary)] leading-relaxed" style={{ fontFamily: 'var(--font-display)' }}>
            {typed}
            {!typingDone && <span className="animate-pulse text-[var(--accent)] font-light">|</span>}
          </p>
          {typingDone && (
            <div className="flex items-center gap-1.5 mt-4 text-[var(--success)]">
              <Check size={14} />
              <span className="text-[13px] font-semibold">입력 완료</span>
            </div>
          )}
        </div>
      </div>

      <p className="text-[13px] text-[var(--text-tertiary)] text-center">
        * 데모용 예시입니다. 실제로는 당신의 과제를 입력합니다.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════
   STEP 1: 즉시 분석 — 하나의 문서로 보여주기
   ═══════════════════════════════════════ */

const ANALYSIS_STEPS = [
  '상황을 읽고 있습니다...',
  '당신이 놓치고 있는 걸 찾고 있습니다...',
  '초안을 만들고 있습니다...',
];

function FirstDraftStep({ skipLoading, onLoaded }: { skipLoading: boolean; onLoaded: () => void }) {
  const [phase, setPhase] = useState<'loading' | 'results'>(skipLoading ? 'results' : 'loading');
  const [loadStep, setLoadStep] = useState(0);

  useEffect(() => {
    if (skipLoading) return;
    const timers = [
      setTimeout(() => setLoadStep(1), 800),
      setTimeout(() => setLoadStep(2), 1600),
      setTimeout(() => { setPhase('results'); onLoaded(); }, 2400),
    ];
    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipLoading]);

  if (phase === 'loading') {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <Badge variant="ai">즉시 분석</Badge>
          <h2 className="text-[28px] md:text-[36px] font-bold text-[var(--text-primary)] leading-tight tracking-tight mt-3" style={{ fontFamily: 'var(--font-display)' }}>
            상황을 읽고 있습니다
          </h2>
        </div>

        {/* 분석 로딩 */}
        <div className="py-2 max-w-sm mx-auto space-y-4">
          {ANALYSIS_STEPS.map((s, i) => (
            <div key={i} className={`flex items-center gap-3 transition-all duration-300 ${
              i < loadStep ? 'opacity-50' : i === loadStep ? 'opacity-100' : 'opacity-25'
            }`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                i < loadStep ? 'bg-[var(--success)] text-white' :
                i === loadStep ? 'bg-[var(--accent)] text-white' :
                'bg-[var(--border-subtle)] text-[var(--text-tertiary)]'
              }`}>
                {i < loadStep ? <Check size={13} /> :
                 i === loadStep ? <Loader2 size={13} className="animate-spin" /> :
                 <span className="text-[11px] font-bold">{i + 1}</span>}
              </div>
              <span className={`text-[15px] ${
                i === loadStep ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
              }`}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── 결과: 하나의 문서 ── */
  return (
    <div className="space-y-6 phrase-entrance">
      <div>
        <Badge variant="ai">즉시 분석</Badge>
        <h2 className="text-[28px] md:text-[36px] font-bold text-[var(--text-primary)] leading-tight tracking-tight mt-3" style={{ fontFamily: 'var(--font-display)' }}>
          당신의 상황을 읽었습니다
        </h2>
        <p className="text-[15px] text-[var(--text-secondary)] mt-2">
          추가 질문 없이, 입력만으로 만든 초안입니다.
        </p>
      </div>

      {/* ── Hero: 이 상황의 본질 ── */}
      <BezelCard>
        <div className="bg-[var(--primary)] text-[var(--bg)] px-6 md:px-8 py-6 md:py-7 rounded-[calc(1.75rem-2px)]">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={16} className="text-[var(--accent-light)]" />
            <span className="text-[13px] font-bold text-white/50 tracking-wide uppercase">이 상황의 본질</span>
          </div>
          <p className="text-[19px] md:text-[22px] font-bold leading-relaxed whitespace-pre-line" style={{ fontFamily: 'var(--font-display)' }}>
            {FIRST_DRAFT.insight}
          </p>
        </div>
      </BezelCard>

      {/* ── Grid: 구조(좌) + 액션·경고(우) ── */}
      <div className="grid md:grid-cols-5 gap-4">
        {/* 좌: 기획안 구조 — flow 연결선 */}
        <div className="md:col-span-3">
          <BezelCard>
            <div className="px-5 py-5">
              <div className="flex items-center gap-2 mb-5">
                <Target size={16} className="text-[var(--accent)]" />
                <span className="text-[13px] font-bold text-[var(--accent)] tracking-wide uppercase">대표님이 알고 싶은 것</span>
              </div>
              <div className="space-y-0">
                {FIRST_DRAFT.skeleton.map((item, i) => {
                  const [title, desc] = item.split(' — ');
                  const isLast = i === FIRST_DRAFT.skeleton.length - 1;
                  return (
                    <div key={i} className="flex items-start gap-3">
                      {/* Flow 연결선 */}
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-7 h-7 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-[12px] font-bold flex items-center justify-center">{i + 1}</div>
                        {!isLast && <div className="w-[2px] h-5 my-1 rounded-full" style={{ background: 'var(--gradient-gold)' }} />}
                      </div>
                      <div className={`${isLast ? '' : 'pb-3'}`}>
                        <p className="text-[15px] font-semibold text-[var(--text-primary)] leading-snug">{title}</p>
                        {desc && <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">{desc}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </BezelCard>
        </div>

        {/* 우: 액션 + 착각 */}
        <div className="md:col-span-2 space-y-4">
          {/* 오늘 할 일 */}
          <BezelCard>
            <div className="px-5 py-5 bg-[var(--accent)]/[0.03] rounded-[calc(1.75rem-2px)]">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={16} className="text-[var(--accent)]" />
                <span className="text-[13px] font-bold text-[var(--accent)] tracking-wide uppercase">오늘 할 일</span>
              </div>
              <p className="text-[15px] font-semibold text-[var(--text-primary)] whitespace-pre-line leading-relaxed">
                {FIRST_DRAFT.immediate_action}
              </p>
              <p className="text-[13px] text-[var(--text-secondary)] mt-2">
                {FIRST_DRAFT.immediate_action_why}
              </p>
            </div>
          </BezelCard>

          {/* 착각 */}
          <div className="rounded-xl border border-[var(--risk-manageable)]/20 bg-[var(--surface)] px-4 py-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} className="text-[var(--risk-manageable)]" />
              <span className="text-[12px] font-bold text-[var(--risk-manageable)] tracking-wide uppercase">흔한 착각</span>
            </div>
            <div className="space-y-2.5">
              {FIRST_DRAFT.premises.map((p, i) => (
                <div key={i} className="text-[13px]">
                  <p className="text-[var(--text-tertiary)]">&ldquo;{p.wrong}&rdquo;</p>
                  <p className="text-[var(--text-primary)] font-semibold">→ {p.right}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="text-[15px] text-[var(--text-secondary)] text-center">
        아직 초안입니다. 두 가지만 더 알면 <strong className="text-[var(--text-primary)]">당신 상황에 맞게 바뀝니다.</strong>
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════
   STEP 2: 질문 → 진화 — 하나의 문서로 변화 보여주기
   ═══════════════════════════════════════ */

function InterviewStep({ q1, q2, setQ1, setQ2 }: { q1: string; q2: string; setQ1: (v: string) => void; setQ2: (v: string) => void }) {
  const draft = q2 ? getUpdatedDraft(q2) : null;

  return (
    <div className="space-y-8 phrase-entrance">
      <div>
        <Badge variant="gold">심화 질문</Badge>
        <h2 className="text-[28px] md:text-[36px] font-bold text-[var(--text-primary)] leading-tight tracking-tight mt-3" style={{ fontFamily: 'var(--font-display)' }}>
          두 가지만 더 알려주세요
        </h2>
        <p className="text-[16px] text-[var(--text-secondary)] mt-3">
          답하면 초안이 바뀝니다.
        </p>
      </div>

      {/* Q1 */}
      <div>
        <p className="text-[18px] font-semibold text-[var(--text-primary)] mb-4">{INTERVIEW_Q1.question}</p>
        <div className="grid grid-cols-2 gap-3">
          {INTERVIEW_Q1.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setQ1(opt.value); track('demo_q1_answer', { value: opt.value, label: opt.label }); }}
              className={`px-5 py-4 rounded-xl border-2 text-left text-[15px] font-medium transition-all cursor-pointer active:scale-[0.98] ${
                q1 === opt.value
                  ? 'border-[var(--accent)] bg-[var(--accent)]/8 text-[var(--accent)] shadow-sm'
                  : 'border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--border)] hover:bg-[var(--surface)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Q2 */}
      {q1 && (
        <div className="animate-fade-in">
          <p className="text-[18px] font-semibold text-[var(--text-primary)] mb-4">{INTERVIEW_Q2.question}</p>
          <div className="grid grid-cols-2 gap-3">
            {INTERVIEW_Q2.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setQ2(opt.value); track('demo_q2_answer', { value: opt.value, label: opt.label }); }}
                className={`px-5 py-4 rounded-xl border-2 text-left text-[15px] font-medium transition-all cursor-pointer active:scale-[0.98] ${
                  q2 === opt.value
                    ? 'border-[var(--accent)] bg-[var(--accent)]/8 text-[var(--accent)] shadow-sm'
                    : 'border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--border)] hover:bg-[var(--surface)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 게이트 힌트 */}
      {!q1 && (
        <p className="text-[14px] text-[var(--text-tertiary)] text-center">
          위 질문에 답하면 초안이 바뀝니다.
        </p>
      )}
      {q1 && !q2 && (
        <p className="text-[14px] text-[var(--text-tertiary)] text-center animate-fade-in">
          하나만 더요.
        </p>
      )}

      {/* ── 진화: Before/After 비교 뷰 ── */}
      {draft && (
        <div className="mt-2 animate-fade-in space-y-5">
          {/* 상황 업데이트 — 풀 배너 */}
          <div className="flex items-start gap-3 rounded-xl bg-[var(--accent)]/[0.06] border border-[var(--accent)]/15 px-5 py-4">
            <CrescendoHairpin width={18} height={9} color="var(--accent)" className="shrink-0 mt-1" />
            <p className="text-[15px] text-[var(--text-primary)] leading-relaxed">{draft.situation_update}</p>
          </div>

          {/* 핵심 질문: 이전 vs 이후 — 양쪽 비교 */}
          <div className="grid md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg)] px-5 py-4 opacity-60">
              <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">이전</p>
              <p className="text-[15px] text-[var(--text-secondary)] line-through leading-relaxed">{draft.real_question_before}</p>
            </div>
            <BezelCard>
              <div className="px-5 py-4 bg-[var(--primary)] text-[var(--bg)] rounded-[calc(1.75rem-2px)]">
                <p className="text-[11px] font-bold text-[var(--accent-light)] uppercase tracking-wider mb-2">이후</p>
                <p className="text-[16px] md:text-[17px] font-bold leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
                  {draft.real_question_after}
                </p>
              </div>
            </BezelCard>
          </div>

          {/* 구조 변화 — flow 연결선 + 변경 표시 */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-5">
            <p className="text-[13px] font-bold text-[var(--accent)] mb-4">구조 변화</p>
            <div className="space-y-0">
              {draft.skeleton.map((item, i) => {
                const changed = item !== FIRST_DRAFT.skeleton[i];
                const [title, desc] = item.split(' — ');
                const isLast = i === draft.skeleton.length - 1;
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center ${
                        changed ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg)] text-[var(--text-tertiary)] border border-[var(--border)]'
                      }`}>{i + 1}</div>
                      {!isLast && <div className={`w-[2px] h-4 my-0.5 rounded-full ${changed ? 'bg-[var(--accent)]/30' : 'bg-[var(--border-subtle)]'}`} />}
                    </div>
                    <div className={`${isLast ? '' : 'pb-2'}`}>
                      <span className={`text-[14px] ${changed ? 'font-bold text-[var(--accent)]' : 'font-medium text-[var(--text-primary)]'}`}>{title}</span>
                      {desc && <span className={`text-[13px] ${changed ? 'text-[var(--accent)]/60' : 'text-[var(--text-secondary)]'}`}> — {desc}</span>}
                      {changed && <span className="ml-1.5 text-[10px] font-bold text-white bg-[var(--accent)] px-1.5 py-0.5 rounded-full">NEW</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 전제 검증 — 3-column grid */}
          <div className="grid md:grid-cols-3 gap-2">
            <div className="rounded-xl bg-[var(--collab)] px-4 py-3">
              <span className="text-[var(--success)] text-[14px] font-bold">✓ 확인됨</span>
              <p className="text-[13px] text-[var(--text-primary)] mt-1">{draft.premises_confirmed}</p>
            </div>
            <div className="rounded-xl bg-red-50/60 px-4 py-3">
              <span className="text-red-500 text-[14px] font-bold">✗ 위험</span>
              <p className="text-[13px] text-[var(--text-primary)] mt-1">{draft.premises_risk}</p>
            </div>
            <div className="rounded-xl bg-amber-50/60 px-4 py-3">
              <span className="text-amber-500 text-[14px] font-bold">? 미확인</span>
              <p className="text-[13px] text-[var(--text-primary)] mt-1">{draft.premises_uncertain}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   STEP 3: 대표님 반응
   ═══════════════════════════════════════ */

function PersonaStep({ q2 }: { q2: string }) {
  const persona = getPersonaReaction(q2);

  return (
    <div className="space-y-6 phrase-entrance">
      <div>
        <Badge variant="risk-unspoken">사전 검증</Badge>
        <h2 className="text-[28px] md:text-[36px] font-bold text-[var(--text-primary)] leading-tight tracking-tight mt-3" style={{ fontFamily: 'var(--font-display)' }}>
          대표님은 뭐라고 할까?
        </h2>
        <p className="text-[16px] text-[var(--text-secondary)] mt-3">
          제출하기 전에, 예상 반응을 미리 봅니다.
        </p>
      </div>

      {/* 페르소나 카드 */}
      <BezelCard><div className="p-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-[#6b4c9a] flex items-center justify-center text-white text-[20px] font-bold shrink-0 shadow-md">김</div>
          <div>
            <p className="text-[18px] font-bold text-[var(--text-primary)]">{persona.name}</p>
            <p className="text-[14px] text-[var(--text-secondary)]">CEO · 최종 의사결정자</p>
          </div>
        </div>
        <div className="rounded-xl bg-[var(--ai)] px-5 py-4">
          <p className="text-[17px] font-medium text-[var(--text-primary)] leading-relaxed italic">
            &ldquo;{persona.reaction}&rdquo;
          </p>
        </div>
      </div></BezelCard>

      {/* 약점 — 3-column grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} className="text-[var(--risk-critical)]" />
          <span className="text-[13px] font-bold tracking-[0.08em] uppercase text-[var(--risk-critical)]">발견된 약점 3가지</span>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {persona.weaknesses.map((w, i) => (
            <div key={i} className="rounded-xl border border-red-200 bg-red-50/60 px-4 py-4">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-500 text-[13px] font-bold mb-3">{i + 1}</span>
              <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">{w}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 아무도 말 안 하는 것 */}
      <div className="rounded-[1.75rem] p-[1px] bg-gradient-to-b from-[#6b4c9a]/20 to-[#6b4c9a]/5">
        <div className="rounded-[calc(1.75rem-1px)] bg-[var(--surface)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)] relative overflow-hidden px-6 md:px-8 py-5">
          <div className="absolute inset-0 manuscript-bg opacity-30 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Eye size={16} className="text-[#6b4c9a]" />
              <span className="text-[13px] font-bold text-[#6b4c9a] tracking-[0.08em] uppercase">아무도 말 안 하는 것</span>
            </div>
            <p className="text-[17px] font-medium text-[var(--text-primary)] leading-relaxed italic">
              &ldquo;{persona.unspoken}&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* 수정 제안 — 3-column grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} className="text-[var(--success)]" />
          <span className="text-[13px] font-bold tracking-[0.08em] uppercase text-[var(--success)]">이렇게 고치면 OK할 가능성 ↑</span>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {persona.fixes.map((f, i) => (
            <div key={i} className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-4 flex flex-col justify-between">
              <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">{f.text}</p>
              <div className="mt-3">
                <Badge variant="both">{f.impact}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   STEP 4: 반영 선택
   ═══════════════════════════════════════ */

function FixStep({ q2, applied, setApplied }: { q2: string; applied: Set<number>; setApplied: (s: Set<number>) => void }) {
  const persona = getPersonaReaction(q2);
  const score = useCountUp(applied.size === 3 ? 92 : applied.size === 2 ? 78 : applied.size === 1 ? 62 : 45);

  const toggle = (i: number) => {
    const next = new Set(applied);
    const wasOn = next.has(i);
    wasOn ? next.delete(i) : next.add(i);
    setApplied(next);
    track('demo_fix_toggle', { fix_index: i, applied: !wasOn, total_applied: next.size, fix_text: persona.fixes[i]?.text.slice(0, 50) });
  };

  return (
    <div className="space-y-6 phrase-entrance">
      <div>
        <Badge variant="both">반영 선택</Badge>
        <h2 className="text-[28px] md:text-[36px] font-bold text-[var(--text-primary)] leading-tight tracking-tight mt-3" style={{ fontFamily: 'var(--font-display)' }}>
          어떤 피드백을 반영할까요?
        </h2>
        <p className="text-[16px] text-[var(--text-secondary)] mt-3">
          탭하면 <strong className="text-[var(--text-primary)]">실행 준비도가 실시간으로 바뀝니다.</strong>
        </p>
      </div>

      {/* 점수 — bezel */}
      <div className={`rounded-[1.75rem] p-[1px] transition-all duration-500 ${
        applied.size === 3
          ? 'bg-gradient-to-b from-[#2d6b2d]/40 to-[#2d6b2d]/15 shadow-[0_0_20px_rgba(45,107,45,0.15)]'
          : 'bg-[#2d6b2d]/15'
      }`}>
        <div className={`rounded-[calc(1.75rem-1px)] overflow-hidden transition-colors duration-500 ${
          applied.size === 3 ? 'bg-[#2d6b2d]' : 'bg-[var(--surface)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]'
        }`}>
          <div className="px-6 py-5 flex items-center justify-between">
            <div>
              <p className={`text-[13px] font-semibold mb-1 ${applied.size === 3 ? 'text-white/60' : 'text-[var(--text-tertiary)]'}`}>실행 준비도</p>
              <p className={`text-[40px] font-extrabold leading-none tabular-nums ${applied.size === 3 ? 'text-white' : 'text-[#2d6b2d]'}`}>{score}%</p>
            </div>
            {applied.size === 3 && (
              <div className="flex items-center gap-2 text-white bg-white/15 px-4 py-2 rounded-full">
                <Check size={18} />
                <span className="text-[15px] font-bold">제출 가능</span>
              </div>
            )}
          </div>
          <div className="h-[3px] bg-[#2d6b2d]/10">
            <div className="h-full transition-all duration-700 rounded-r" style={{ width: `${score}%`, background: 'linear-gradient(90deg, #2d6b2d, #4ade80)' }} />
          </div>
        </div>
      </div>

      {/* 토글 */}
      <div className="space-y-3">
        {persona.fixes.map((f, i) => {
          const isOn = applied.has(i);
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              className={`w-full text-left px-5 py-5 rounded-xl border-2 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                isOn
                  ? 'border-[#2d6b2d] bg-[#2d6b2d]/[0.06] shadow-sm'
                  : 'border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--border)]'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isOn ? 'bg-[#2d6b2d] text-white' : 'bg-[var(--bg)] border border-[var(--border)]'
                  }`}>
                    {isOn && <Check size={14} />}
                  </div>
                  <p className={`text-[16px] font-medium leading-relaxed ${isOn ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                    {f.text}
                  </p>
                </div>
                <span className={`shrink-0 text-[12px] font-bold px-3 py-1.5 rounded-full transition-colors ${
                  isOn ? 'bg-[#2d6b2d]/10 text-[#2d6b2d]' : 'bg-[var(--bg)] text-[var(--text-tertiary)]'
                }`}>
                  {f.impact}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   STEP 5: 최종
   ═══════════════════════════════════════ */

function FinalStep({ q2, applied }: { q2: string; applied: Set<number> }) {
  const draft = getUpdatedDraft(q2);
  const persona = getPersonaReaction(q2);
  const seedRecorded = useRef(false);

  useEffect(() => {
    if (seedRecorded.current) return;
    seedRecorded.current = true;
    recordSignal({
      tool: 'reframe',
      signal_type: 'demo_seed',
      signal_data: { q2, fixes_applied: applied.size, completed: true },
    });
  }, [q2, applied]);

  const readiness = applied.size === 3 ? 92 : applied.size === 2 ? 78 : applied.size === 1 ? 62 : 45;

  const journey = [
    { label: '입력', desc: '상황 1개', color: 'var(--accent)' },
    { label: '분석', desc: '즉시 초안', color: '#2d4a7c' },
    { label: '질문', desc: '2개 답변', color: '#2d4a7c' },
    { label: '검증', desc: '약점 발견', color: '#6b4c9a' },
    { label: '반영', desc: `${applied.size}개 수정`, color: '#2d6b2d' },
  ];

  return (
    <div className="space-y-8 phrase-entrance">
      {/* 히어로 */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--success)]/10 text-[var(--success)] text-[13px] font-bold mb-4">
          <Sparkles size={14} /> 완료
        </div>
        <h2 className="text-[28px] md:text-[40px] font-bold text-[var(--text-primary)] leading-tight tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          막막했던 기획안이<br />
          <span className="text-gold-gradient">제출 가능한 구조</span>가 되었습니다
        </h2>
        <p className="text-[16px] text-[var(--text-secondary)] mt-4">
          입력 1개 + 질문 2개 + 피드백 반영. 이게 전부입니다.
        </p>
      </div>

      {/* 여정 타임라인 */}
      <div className="flex items-center justify-between px-3 py-5 rounded-[1.5rem] bg-[var(--surface)] shadow-[var(--shadow-sm),inset_0_1px_2px_rgba(255,255,255,0.4)] border border-[var(--border-subtle)]">
        {journey.map((j, i) => (
          <Fragment key={i}>
            {i > 0 && <div className="flex-1 h-[2px] bg-[var(--border-subtle)] mx-0.5 md:mx-1" />}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold" style={{ backgroundColor: j.color }}>
                {i + 1}
              </div>
              <span className="text-[12px] font-bold text-[var(--text-primary)]">{j.label}</span>
              <span className="text-[11px] text-[var(--text-tertiary)]">{j.desc}</span>
            </div>
          </Fragment>
        ))}
      </div>

      {/* 최종 핵심 질문 */}
      <div className="rounded-2xl bg-[var(--primary)] text-[var(--bg)] px-6 py-6 shadow-[var(--shadow-lg),var(--glow-gold)]">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb size={16} className="text-[var(--accent-light)]" />
          <span className="text-[13px] font-bold text-white/50">최종 핵심 질문</span>
        </div>
        <p className="text-[20px] md:text-[22px] font-bold leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
          {draft?.real_question_after || FIRST_DRAFT.insight}
        </p>
      </div>

      {/* 최종 기획안 구조 */}
      <Card className="!border-l-4 !border-l-[var(--accent)]">
        <div className="flex items-center gap-2 mb-4">
          <Target size={16} className="text-[var(--accent)]" />
          <span className="text-[13px] font-bold tracking-[0.08em] uppercase text-[var(--accent)]">최종 기획안 구조</span>
          {applied.size > 0 && <Badge variant="both">+{applied.size} 보강</Badge>}
        </div>
        <ol className="space-y-3">
          {(draft?.skeleton || FIRST_DRAFT.skeleton).map((item, i) => {
            const [title, desc] = item.split(' — ');
            return (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 w-7 h-7 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] text-[13px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                <div>
                  <span className="text-[16px] font-semibold text-[var(--text-primary)]">{title}</span>
                  {desc && <span className="text-[15px] text-[var(--text-secondary)]"> — {desc}</span>}
                </div>
              </li>
            );
          })}
          {persona.fixes.filter((_, i) => applied.has(i)).map((f, i) => (
            <li key={`fix-${i}`} className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-lg bg-[#2d6b2d]/15 text-[#2d6b2d] text-[13px] font-bold flex items-center justify-center mt-0.5">+</span>
              <span className="text-[16px] text-[#2d6b2d] font-medium">{f.text.split('—')[0].trim()}</span>
            </li>
          ))}
        </ol>
      </Card>

      {/* 과정 요약 */}
      <Card variant="muted">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={16} className="text-[var(--text-tertiary)]" />
          <span className="text-[13px] font-bold tracking-[0.08em] uppercase text-[var(--text-tertiary)]">이 과정에서 일어난 일</span>
        </div>
        <div className="space-y-3 text-[15px] text-[var(--text-secondary)]">
          <p>1. 입력 하나로 <strong className="text-[var(--text-primary)]">기획안의 방향이 잡혔습니다.</strong></p>
          <p>2. 질문 2개에 답하자 <strong className="text-[var(--text-primary)]">핵심 질문과 구조가 진화</strong>했습니다.</p>
          <p>3. 대표님의 예상 반응으로 <strong className="text-[var(--text-primary)]">약점 3가지</strong>를 미리 발견했습니다.</p>
          <p>4. 피드백을 반영해서 <strong className="text-[var(--text-primary)]">실행 준비도 {readiness}%</strong>에 도달했습니다.</p>
        </div>
      </Card>

      {/* CTA */}
      <div className="text-center pt-4">
        <p className="text-[17px] font-medium text-[var(--text-primary)] mb-5">
          이제 당신의 과제로 직접 해보세요.
        </p>
        <Link href="/workspace" onClick={() => track('demo_to_workspace', { from_step: 'final', q2, fixes: applied.size })}>
          <Button variant="accent" size="lg" className="!px-10 !py-4 !text-[16px] animate-gold-shimmer">
            내 과제로 시작하기 <ArrowRight size={16} />
          </Button>
        </Link>
        <p className="text-[13px] text-[var(--text-tertiary)] mt-4">
          로그인 없이 무료
        </p>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import {
  Play, Sparkles, Check, ArrowRight, ArrowLeft, UserCheck, AlertTriangle,
  Zap, Lightbulb, Target, Shield, MessageSquare, Loader2, Eye,
} from 'lucide-react';
import { track, trackTime } from '@/lib/analytics';
import { recordSignal } from '@/lib/signal-recorder';
import { CrescendoHairpin } from '@/components/ui/MusicalElements';

/* ═══════════════════════════════════════
   DEMO DATA
   ═══════════════════════════════════════ */

const SCENARIO = '나는 백엔드 개발자인데, 대표님이 2주 안에 신사업 기획안을 써오라고 했어.';

const FIRST_DRAFT = {
  situation: '기술 전문가에게 비기술 산출물(기획안)이 요청된 상황. 기획안 작성 경험 없음. 2주 시한.',
  real_question: '"기획안을 어떻게 쓰느냐"가 아니라, "대표님이 이 기획안으로 판단하고 싶은 것이 뭔가"',
  skeleton: [
    '신사업 배경과 기회 — 시장 환경 정리',
    '우리가 할 수 있는 이유 — 기술력 연결',
    '예상 비용과 수익 구조',
    '1차 검증 방법과 타임라인',
    '리스크와 Go/No-Go 기준',
  ],
  premises: [
    '대표님이 원하는 건 기획안 문서 자체다',
    '시장 데이터가 많을수록 설득력이 높다',
    '기획 경험이 없으면 좋은 기획안을 못 쓴다',
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
    real_question_before: FIRST_DRAFT.real_question,
    real_question_after: '',
    skeleton: [...FIRST_DRAFT.skeleton],
    premises_confirmed: '',
    premises_risk: '',
    premises_uncertain: '',
    check_items: [] as string[],
  };

  if (q2 === 'direction') {
    base.situation_update = '방향 자체가 안 잡힌 상태 → "뭘 쓸까"보다 "뭘 판단하게 할까"가 우선';
    base.real_question_after = '기획안을 쓰는 게 아니라, 대표님이 이 사업에 대해 "3가지를 판단할 수 있는 구조"를 만드는 것이 진짜 과제다.';
    base.skeleton[0] = '대표님이 판단하고 싶은 것 3가지 정리 ← 핵심';
    base.skeleton[1] = '각 판단 항목에 대한 근거 데이터';
    base.premises_confirmed = '기획 경험이 없어도 구조화된 판단 자료는 만들 수 있다';
    base.premises_risk = '대표님이 원하는 건 문서가 아니라 판단 근거다 — 확인 필요';
    base.premises_uncertain = '시장 데이터의 양보다 해석의 질이 중요하다';
    base.check_items = ['대표님에게 "이 기획안으로 뭘 판단하고 싶으세요?" 직접 물어보기', '2주 내 검증 가능한 것과 불가능한 것 분리하기'];
  } else if (q2 === 'persuasion') {
    base.situation_update = '논리/근거 부족 우려 → 데이터보다 "판단 구조"가 설득력의 핵심';
    base.real_question_after = '설득력 있는 기획안은 데이터가 많은 게 아니라, "왜 지금 우리가 해야 하는가"에 대한 답이 명확한 것이다.';
    base.skeleton[0] = '"왜 지금?"과 "왜 우리?"에 대한 답 ← 설득 핵심';
    base.skeleton[2] = '경쟁사 대비 우리의 구조적 우위 근거';
    base.premises_confirmed = '기획 경험 없이도 구조화된 논거는 가능하다';
    base.premises_risk = '데이터 양이 아니라 논리 구조가 설득력을 결정한다';
    base.premises_uncertain = '대표님이 원하는 수준의 구체성이 어디까지인지';
    base.check_items = ['대표님이 최근 승인/거절한 기획안 1개 구해서 구조 분석', '"왜 우리가?" 질문에 3문장으로 답할 수 있는지 테스트'];
  } else if (q2 === 'time') {
    base.situation_update = '2주 시한 압박 → 완벽한 기획안이 아니라 "판단 가능한 최소 구조"가 목표';
    base.real_question_after = '2주 안에 완벽한 기획안은 불가능하다. "이것만 보면 Go/No-Go를 판단할 수 있다"는 수준이 목표다.';
    base.skeleton[0] = 'Go/No-Go 판단 기준 3개 ← 1주차 핵심';
    base.skeleton[3] = '1주차: 리서치 + 구조화 / 2주차: 검증 + 완성';
    base.premises_confirmed = '짧은 시간에는 범위를 좁히는 게 핵심이다';
    base.premises_risk = '완벽한 기획안을 기대하고 있을 수 있다 — 기대 관리 필요';
    base.premises_uncertain = '대표님이 2주 뒤 어떤 형태를 기대하는지';
    base.check_items = ['대표님에게 "2주 뒤에 어떤 형태를 기대하세요?" 확인', '검증 가능한 것 vs 가정으로 남길 것 명확히 분리'];
  } else {
    base.situation_update = '기획 경험 부재 → 그러나 "좋은 질문을 던지는 능력"은 기획의 80%';
    base.real_question_after = '기획 경험이 없는 게 문제가 아니다. 개발자의 "이게 진짜 되나?" 본능이 오히려 기획의 핵심 무기다.';
    base.skeleton[0] = '기획의 핵심 = "이게 되나?"를 구조적으로 검증하는 것 ← 개발자 강점';
    base.skeleton[1] = '기술 가능성 분석 — 개발자만 할 수 있는 파트';
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

  // Track demo entry
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
    <div className="max-w-3xl mx-auto px-5 md:px-0">
      {/* ── Progress stepper ── */}
      <nav className="flex items-center justify-center mb-10 md:mb-14 px-1">
        {STEP_LABELS.map((label, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <Fragment key={i}>
              {i > 0 && (
                <div className={`flex-1 h-[2px] mx-0.5 md:mx-1 transition-colors duration-300 ${
                  done ? 'bg-[var(--accent)]' : 'bg-[var(--border-subtle)]'
                }`} />
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

      {/* ── Content ── */}
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

      {/* ── Navigation ── */}
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
   STEP 0: Intro
   ═══════════════════════════════════════ */

function IntroStep() {
  return (
    <div className="space-y-8 phrase-entrance">
      <div>
        <Badge variant="gold">DEMO</Badge>
        <h2 className="text-[32px] md:text-[40px] font-bold text-[var(--text-primary)] leading-tight tracking-tight mt-3" style={{ fontFamily: 'var(--font-display)' }}>
          1분이면 됩니다
        </h2>
        <p className="text-[16px] md:text-[18px] text-[var(--text-secondary)] mt-4 leading-relaxed max-w-lg">
          질문 하나 던지면 즉시 초안이 나오고,<br className="hidden md:block" />
          답할수록 날카로워지는 걸 직접 체험하세요.
        </p>
      </div>

      <Card variant="elevated" className="!border-2 !border-[var(--border)]">
        <p className="text-[13px] font-bold tracking-[0.1em] uppercase text-[var(--text-tertiary)] mb-3">오늘의 상황</p>
        <p className="text-[18px] md:text-[22px] font-semibold text-[var(--text-primary)] leading-relaxed" style={{ fontFamily: 'var(--font-display)' }}>
          {SCENARIO}
        </p>
        <p className="text-[15px] text-[var(--text-secondary)] mt-3 leading-relaxed">
          기획안을 써본 적이 없습니다. 어디서부터 시작해야 할지 모르겠습니다.
        </p>
      </Card>

      <div className="flex items-start gap-3 px-5 py-4 rounded-xl bg-[var(--accent)]/8 border border-[var(--accent)]/15">
        <Sparkles size={16} className="text-[var(--accent)] shrink-0 mt-0.5" />
        <p className="text-[15px] text-[var(--text-primary)] leading-relaxed">
          실제 Overture에서는 <strong>당신의 과제</strong>를 입력합니다.
          데모에서는 위 상황으로 체험합니다.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   STEP 1: Instant First Draft
   ═══════════════════════════════════════ */

const ANALYSIS_STEPS = [
  '상황을 파악하고 있습니다...',
  '숨겨진 전제를 찾고 있습니다...',
  '초안을 구성하고 있습니다...',
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

  /* ── Loading phase ── */
  if (phase === 'loading') {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <Badge variant="ai">즉시 분석</Badge>
          <h2 className="text-[28px] md:text-[36px] font-bold text-[var(--text-primary)] leading-tight tracking-tight mt-3" style={{ fontFamily: 'var(--font-display)' }}>
            입력을 분석하고 있습니다
          </h2>
          <p className="text-[15px] text-[var(--text-secondary)] mt-3">
            방금 입력한 상황을 Overture가 읽고 있습니다.
          </p>
        </div>

        {/* Scenario recap */}
        <Card variant="muted" className="text-center">
          <p className="text-[13px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">입력된 상황</p>
          <p className="text-[16px] text-[var(--text-primary)] leading-relaxed">{SCENARIO}</p>
        </Card>

        {/* Analysis steps */}
        <div className="py-2 max-w-sm mx-auto space-y-4">
          {ANALYSIS_STEPS.map((s, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 transition-all duration-300 ${
                i < loadStep ? 'opacity-50' : i === loadStep ? 'opacity-100' : 'opacity-25'
              }`}
            >
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

  /* ── Results phase ── */
  return (
    <div className="space-y-6 phrase-entrance">
      {/* Header */}
      <div className="mb-2">
        <Badge variant="ai">즉시 분석</Badge>
        <h2 className="text-[28px] md:text-[36px] font-bold text-[var(--text-primary)] leading-tight tracking-tight mt-3" style={{ fontFamily: 'var(--font-display)' }}>
          입력 하나로 이만큼 나옵니다
        </h2>
        <p className="text-[16px] text-[var(--text-secondary)] mt-3 leading-relaxed">
          위 상황을 Overture에 입력했더니, 즉시 4가지가 도출되었습니다.
        </p>
      </div>

      {/* 1. Situation */}
      <Card className="!border-l-4 !border-l-[#2d4a7c]">
        <div className="flex items-center gap-2 mb-3">
          <Eye size={16} className="text-[#2d4a7c]" />
          <span className="text-[13px] font-bold tracking-[0.08em] uppercase text-[#2d4a7c]">1. 상황 정리</span>
        </div>
        <p className="text-[16px] text-[var(--text-primary)] leading-relaxed">{FIRST_DRAFT.situation}</p>
      </Card>

      {/* 2. Real question — HERO element */}
      <div className="rounded-2xl bg-[var(--primary)] text-[var(--bg)] px-6 py-6 shadow-[var(--shadow-lg)]">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb size={16} className="text-[var(--accent-light)]" />
          <span className="text-[13px] font-bold tracking-[0.08em] uppercase text-white/50">2. 진짜 질문</span>
        </div>
        <p className="text-[20px] md:text-[22px] font-bold leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
          {FIRST_DRAFT.real_question}
        </p>
        <p className="text-[14px] text-white/40 mt-4">
          표면적 질문 뒤에 숨어 있는 본질을 찾아냅니다.
        </p>
      </div>

      {/* 3. Skeleton */}
      <Card className="!border-l-4 !border-l-[var(--accent)]">
        <div className="flex items-center gap-2 mb-4">
          <Target size={16} className="text-[var(--accent)]" />
          <span className="text-[13px] font-bold tracking-[0.08em] uppercase text-[var(--accent)]">3. 기획안 뼈대</span>
        </div>
        <ol className="space-y-3">
          {FIRST_DRAFT.skeleton.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] text-[13px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
              <span className="text-[16px] text-[var(--text-primary)] leading-relaxed">{item}</span>
            </li>
          ))}
        </ol>
      </Card>

      {/* 4. Hidden premises */}
      <Card variant="danger">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-red-500" />
          <span className="text-[13px] font-bold tracking-[0.08em] uppercase text-red-500">4. 숨겨진 전제</span>
          <Badge variant="risk-critical">검증 필요</Badge>
        </div>
        <p className="text-[14px] text-[var(--text-secondary)] mb-4 leading-relaxed">
          무의식적으로 참이라고 가정하고 있는 것들입니다. 이것들이 틀리면 기획안 전체가 흔들립니다.
        </p>
        <div className="space-y-3">
          {FIRST_DRAFT.premises.map((p, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-red-400 text-[18px] font-bold shrink-0 leading-none mt-0.5">?</span>
              <span className="text-[16px] text-[var(--text-primary)] leading-relaxed">{p}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="text-center pt-2">
        <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
          이건 초안입니다. 몇 가지만 더 알면 <strong className="text-[var(--text-primary)]">훨씬 날카로워집니다.</strong>
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   STEP 2: Interview → Draft evolves
   ═══════════════════════════════════════ */

function InterviewStep({ q1, q2, setQ1, setQ2 }: { q1: string; q2: string; setQ1: (v: string) => void; setQ2: (v: string) => void }) {
  const draft = q2 ? getUpdatedDraft(q2) : null;

  return (
    <div className="space-y-8 phrase-entrance">
      <div className="mb-2">
        <Badge variant="gold">심화 질문</Badge>
        <h2 className="text-[28px] md:text-[36px] font-bold text-[var(--text-primary)] leading-tight tracking-tight mt-3" style={{ fontFamily: 'var(--font-display)' }}>
          답할 때마다 기획안이 바뀝니다
        </h2>
        <p className="text-[16px] text-[var(--text-secondary)] mt-3 leading-relaxed">
          Overture가 2개의 질문을 던집니다. 답하면 초안이 즉시 진화합니다.
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

      {/* Gate hint */}
      {!q1 && (
        <p className="text-[14px] text-[var(--text-tertiary)] text-center">
          위 질문에 답하면 다음으로 진행할 수 있습니다.
        </p>
      )}
      {q1 && !q2 && (
        <p className="text-[14px] text-[var(--text-tertiary)] text-center animate-fade-in">
          한 가지만 더 답해주세요.
        </p>
      )}

      {/* Updated draft — appears after both answers */}
      {draft && (
        <div className="mt-2 space-y-6 animate-fade-in">
          <div className="flex items-center gap-2 text-[14px] text-[var(--success)] font-semibold">
            <CrescendoHairpin width={18} height={9} color="var(--success)" />
            <span>답변 반영 완료 — 기획안이 진화했습니다</span>
          </div>

          {/* Situation update */}
          <Card variant="ai" className="!border-l-4 !border-l-[var(--accent)]">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={15} className="text-[var(--accent)]" />
              <span className="text-[13px] font-bold text-[var(--accent)]">상황 업데이트</span>
            </div>
            <p className="text-[16px] text-[var(--text-primary)] leading-relaxed">{draft.situation_update}</p>
          </Card>

          {/* Question diff */}
          <div className="rounded-2xl bg-[var(--primary)] text-[var(--bg)] px-6 py-5 shadow-[var(--shadow-lg)]">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={16} className="text-[var(--accent-light)]" />
              <span className="text-[13px] font-bold text-white/50">진짜 질문 (수정됨)</span>
            </div>
            <p className="text-[14px] text-white/35 line-through mb-3">{draft.real_question_before}</p>
            <p className="text-[19px] md:text-[21px] font-bold leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
              {draft.real_question_after}
            </p>
          </div>

          {/* Updated skeleton */}
          <Card className="!border-l-4 !border-l-[var(--accent)]">
            <div className="flex items-center gap-2 mb-4">
              <Target size={16} className="text-[var(--accent)]" />
              <span className="text-[13px] font-bold tracking-[0.08em] uppercase text-[var(--accent)]">기획안 뼈대 (수정됨)</span>
            </div>
            <ol className="space-y-3">
              {draft.skeleton.map((item, i) => {
                const changed = item !== FIRST_DRAFT.skeleton[i];
                return (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`shrink-0 w-7 h-7 rounded-lg text-[13px] font-bold flex items-center justify-center mt-0.5 ${
                      changed ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'bg-[var(--bg)] text-[var(--text-tertiary)]'
                    }`}>{i + 1}</span>
                    <span className={`text-[16px] leading-relaxed ${changed ? 'text-[var(--accent)] font-semibold' : 'text-[var(--text-primary)]'}`}>{item}</span>
                  </li>
                );
              })}
            </ol>
          </Card>

          {/* Updated premises */}
          <Card className="!border-dashed">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} className="text-[var(--text-tertiary)]" />
              <span className="text-[13px] font-bold tracking-[0.08em] uppercase text-[var(--text-tertiary)]">전제 업데이트</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[var(--collab)]">
                <span className="text-[var(--success)] text-[18px] shrink-0 leading-none mt-0.5">✓</span>
                <span className="text-[16px] text-[var(--text-primary)] leading-relaxed">{draft.premises_confirmed}</span>
              </div>
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50/60">
                <span className="text-red-500 text-[18px] shrink-0 leading-none mt-0.5">✗</span>
                <span className="text-[16px] text-[var(--text-primary)] leading-relaxed">{draft.premises_risk}</span>
              </div>
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50/60">
                <span className="text-amber-500 text-[18px] shrink-0 leading-none mt-0.5">?</span>
                <span className="text-[16px] text-[var(--text-primary)] leading-relaxed">{draft.premises_uncertain}</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   STEP 3: "대표님은 뭐라고 할까?"
   ═══════════════════════════════════════ */

function PersonaStep({ q2 }: { q2: string }) {
  const persona = getPersonaReaction(q2);

  return (
    <div className="space-y-6 phrase-entrance">
      <div className="mb-2">
        <Badge variant="risk-unspoken">사전 검증</Badge>
        <h2 className="text-[28px] md:text-[36px] font-bold text-[var(--text-primary)] leading-tight tracking-tight mt-3" style={{ fontFamily: 'var(--font-display)' }}>
          대표님은 뭐라고 할까?
        </h2>
        <p className="text-[16px] text-[var(--text-secondary)] mt-3 leading-relaxed">
          완성하기 전에, 실제 의사결정자의 예상 반응을 미리 시뮬레이션합니다.
        </p>
      </div>

      {/* Persona card */}
      <Card variant="elevated" className="!p-6">
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
      </Card>

      {/* Weaknesses */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} className="text-[var(--risk-critical)]" />
          <span className="text-[13px] font-bold tracking-[0.08em] uppercase text-[var(--risk-critical)]">발견된 약점 3가지</span>
        </div>
        <div className="space-y-3">
          {persona.weaknesses.map((w, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/60 px-5 py-4">
              <span className="shrink-0 w-7 h-7 rounded-full bg-red-100 text-red-500 text-[13px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
              <p className="text-[16px] text-[var(--text-primary)] leading-relaxed">{w}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Unspoken */}
      <Card variant="premium" className="!border-[#6b4c9a]/20">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Eye size={16} className="text-[#6b4c9a]" />
            <span className="text-[13px] font-bold text-[#6b4c9a] tracking-[0.08em] uppercase">아무도 말 안 하는 것</span>
          </div>
          <p className="text-[17px] font-medium text-[var(--text-primary)] leading-relaxed italic">
            &ldquo;{persona.unspoken}&rdquo;
          </p>
        </div>
      </Card>

      {/* Fixes preview */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} className="text-[var(--success)]" />
          <span className="text-[13px] font-bold tracking-[0.08em] uppercase text-[var(--success)]">이렇게 고치면 OK할 가능성 ↑</span>
        </div>
        <div className="space-y-3">
          {persona.fixes.map((f, i) => (
            <div key={i} className="flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50/60 px-5 py-4">
              <p className="text-[16px] text-[var(--text-primary)] flex-1 leading-relaxed">{f.text}</p>
              <Badge variant="both">{f.impact}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   STEP 4: Fix selection
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
      <div className="mb-2">
        <Badge variant="both">반영 선택</Badge>
        <h2 className="text-[28px] md:text-[36px] font-bold text-[var(--text-primary)] leading-tight tracking-tight mt-3" style={{ fontFamily: 'var(--font-display)' }}>
          어떤 피드백을 반영할까요?
        </h2>
        <p className="text-[16px] text-[var(--text-secondary)] mt-3 leading-relaxed">
          탭해서 반영할 항목을 선택하세요. <strong className="text-[var(--text-primary)]">실행 준비도가 실시간으로 바뀝니다.</strong>
        </p>
      </div>

      {/* Score */}
      <div className={`rounded-2xl overflow-hidden border-2 transition-all duration-500 ${
        applied.size === 3 ? 'border-[#2d6b2d] bg-[#2d6b2d]' : 'border-[#2d6b2d]/20 bg-[#2d6b2d]/[0.06]'
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
        <div className="h-2.5 bg-[#2d6b2d]/10">
          <div className="h-full bg-[#2d6b2d] transition-all duration-700 rounded-r" style={{ width: `${score}%` }} />
        </div>
      </div>

      {/* Fix toggles */}
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
   STEP 5: Final
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
      {/* Hero */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--success)]/10 text-[var(--success)] text-[13px] font-bold mb-4">
          <Sparkles size={14} /> 완료
        </div>
        <h2 className="text-[28px] md:text-[40px] font-bold text-[var(--text-primary)] leading-tight tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          막막했던 기획안이<br />
          <span className="text-[var(--accent)]">제출 가능한 구조</span>가 되었습니다
        </h2>
        <p className="text-[16px] text-[var(--text-secondary)] mt-4 leading-relaxed">
          입력 1개 + 질문 2개 + 피드백 반영. 이게 전부입니다.
        </p>
      </div>

      {/* Journey timeline */}
      <div className="flex items-center justify-between px-3 py-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]">
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

      {/* Final question */}
      <div className="rounded-2xl bg-[var(--primary)] text-[var(--bg)] px-6 py-6 shadow-[var(--shadow-lg)]">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb size={16} className="text-[var(--accent-light)]" />
          <span className="text-[13px] font-bold text-white/50">최종 핵심 질문</span>
        </div>
        <p className="text-[20px] md:text-[22px] font-bold leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
          {draft?.real_question_after || FIRST_DRAFT.real_question}
        </p>
      </div>

      {/* Final skeleton with fixes */}
      <Card className="!border-l-4 !border-l-[var(--accent)]">
        <div className="flex items-center gap-2 mb-4">
          <Target size={16} className="text-[var(--accent)]" />
          <span className="text-[13px] font-bold tracking-[0.08em] uppercase text-[var(--accent)]">최종 기획안 구조</span>
          {applied.size > 0 && <Badge variant="both">+{applied.size} 보강</Badge>}
        </div>
        <ol className="space-y-3">
          {(draft?.skeleton || FIRST_DRAFT.skeleton).map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] text-[13px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
              <span className="text-[16px] text-[var(--text-primary)] leading-relaxed">{item}</span>
            </li>
          ))}
          {persona.fixes.filter((_, i) => applied.has(i)).map((f, i) => (
            <li key={`fix-${i}`} className="flex items-start gap-3">
              <span className="shrink-0 w-7 h-7 rounded-lg bg-[#2d6b2d]/15 text-[#2d6b2d] text-[13px] font-bold flex items-center justify-center mt-0.5">+</span>
              <span className="text-[16px] text-[#2d6b2d] font-medium leading-relaxed">{f.text.split('—')[0].trim()}</span>
            </li>
          ))}
        </ol>
      </Card>

      {/* Summary */}
      <Card variant="muted">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={16} className="text-[var(--text-tertiary)]" />
          <span className="text-[13px] font-bold tracking-[0.08em] uppercase text-[var(--text-tertiary)]">이 과정에서 일어난 일</span>
        </div>
        <div className="space-y-3 text-[15px] text-[var(--text-secondary)] leading-relaxed">
          <p>1. 입력 하나로 <strong className="text-[var(--text-primary)]">기획안 뼈대 + 숨겨진 전제</strong>가 즉시 나왔습니다.</p>
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
          <Button variant="accent" size="lg" className="!px-10 !py-4 !text-[16px]">
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

'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import {
  Play, Sparkles, Check, ArrowRight, ArrowLeft, ChevronDown, UserCheck, AlertTriangle,
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
   STEPS
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

  // Track demo entry
  useEffect(() => {
    track('demo_enter');
    entryTimeRef.current = Date.now();
    stepTimerRef.current = trackTime('demo_step_time', { step: 0, label: STEP_LABELS[0] });
    // Track drop-off on page leave
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
    // End timer for previous step
    if (stepTimerRef.current) stepTimerRef.current();
    // Start timer for new step
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

  // Can't advance past step 2 without answering questions
  const canAdvance = (s: number) => {
    if (s === 2 && (!q1Answer || !q2Answer)) return false;
    return true;
  };

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-0">
      {/* Progress dots */}
      <nav className="flex items-center justify-center gap-2 mb-8 md:mb-12">
        {STEP_LABELS.map((label, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <button
              key={i}
              onClick={() => go(i)}
              className={`flex flex-col items-center gap-1.5 cursor-pointer transition-all ${active ? '' : done ? 'opacity-60' : 'opacity-30'}`}
            >
              <div className={`w-2.5 h-2.5 rounded-full transition-all ${
                active ? 'bg-[var(--accent)] scale-125 shadow-sm' :
                done ? 'bg-[var(--accent)]' :
                'bg-[var(--border)]'
              }`} />
              <span className={`text-[10px] font-semibold hidden md:block ${active ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <div key={step} className="animate-fade-in">
        {step === 0 && <IntroStep />}
        {step === 1 && <FirstDraftStep />}
        {step === 2 && <InterviewStep q1={q1Answer} q2={q2Answer} setQ1={setQ1Answer} setQ2={setQ2Answer} />}
        {step === 3 && <PersonaStep q2={q2Answer} />}
        {step === 4 && <FixStep q2={q2Answer} applied={fixesApplied} setApplied={setFixesApplied} />}
        {step === 5 && <FinalStep q2={q2Answer} applied={fixesApplied} />}
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
          <Button onClick={() => go(step + 1)} disabled={!canAdvance(step)}>
            {step === 0 ? '체험 시작' : '다음'} <ArrowRight size={14} />
          </Button>
        ) : (
          <Link href="/workspace" onClick={() => track('demo_to_workspace', { from_step: step })}>
            <Button>
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
    <div className="space-y-6 phrase-entrance">
      <div>
        <div className="flex items-center gap-2 text-[12px] text-[var(--accent)] font-semibold tracking-wider uppercase mb-3">
          <Play size={14} /> Demo
        </div>
        <h2 className="text-[28px] md:text-[36px] font-bold text-[var(--text-primary)] leading-tight tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          1분이면 됩니다
        </h2>
        <p className="text-[15px] text-[var(--text-secondary)] mt-3 leading-relaxed max-w-lg">
          질문 하나 던지면 즉시 초안이 나오고, 답할수록 날카로워지는 걸 직접 체험하세요.
        </p>
      </div>

      <Card variant="elevated" className="!border-2 !border-[var(--border)]">
        <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--text-tertiary)] mb-3">오늘의 상황</p>
        <p className="text-[16px] md:text-[18px] font-semibold text-[var(--text-primary)] leading-relaxed" style={{ fontFamily: 'var(--font-display)' }}>
          {SCENARIO}
        </p>
        <p className="text-[13px] text-[var(--text-secondary)] mt-2 leading-relaxed">
          기획안을 써본 적이 없습니다. 어디서부터 시작해야 할지 모르겠습니다.
        </p>
      </Card>

      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--accent)]/8 border border-[var(--accent)]/15">
        <Sparkles size={14} className="text-[var(--accent)] shrink-0" />
        <p className="text-[13px] text-[var(--text-primary)]">
          실제 Overture에서는 <strong>당신의 과제</strong>를 입력합니다. 데모에서는 위 상황으로 체험합니다.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   STEP 1: Instant First Draft (30초)
   ═══════════════════════════════════════ */

function FirstDraftStep() {
  return (
    <div className="space-y-5 phrase-entrance">
      <div className="mb-6">
        <p className="text-[12px] font-bold text-[var(--accent)] tracking-wider uppercase mb-2">즉시 결과 · 30초</p>
        <h2 className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          입력 하나로 이만큼 나옵니다
        </h2>
      </div>

      {/* Situation */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-4">
        <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--text-tertiary)] mb-2">상황 정리</p>
        <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">{FIRST_DRAFT.situation}</p>
      </div>

      {/* Real question */}
      <div className="rounded-xl bg-[var(--primary)] text-[var(--bg)] px-5 py-4 shadow-md">
        <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-white/40 mb-2">진짜 질문</p>
        <p className="text-[17px] md:text-[19px] font-bold leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
          {FIRST_DRAFT.real_question}
        </p>
      </div>

      {/* Skeleton */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-4">
        <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--text-tertiary)] mb-3">기획안 뼈대</p>
        <ol className="space-y-2">
          {FIRST_DRAFT.skeleton.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-[14px]">
              <span className="shrink-0 w-5 h-5 rounded-md bg-[var(--accent)]/10 text-[var(--accent)] text-[11px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
              <span className="text-[var(--text-primary)]">{item}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Hidden premises */}
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-5 py-4">
        <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-red-500/80 mb-3">숨겨진 전제</p>
        <div className="space-y-2">
          {FIRST_DRAFT.premises.map((p, i) => (
            <div key={i} className="flex items-start gap-2.5 text-[14px]">
              <span className="text-red-400 shrink-0 mt-0.5">?</span>
              <span className="text-[var(--text-primary)]">{p}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[13px] text-[var(--text-secondary)] italic text-center">
        이건 초안이다. 몇 가지만 더 알면 훨씬 날카로워진다.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════
   STEP 2: Interview → Draft evolves
   ═══════════════════════════════════════ */

function InterviewStep({ q1, q2, setQ1, setQ2 }: { q1: string; q2: string; setQ1: (v: string) => void; setQ2: (v: string) => void }) {
  const draft = q2 ? getUpdatedDraft(q2) : null;

  return (
    <div className="space-y-6 phrase-entrance">
      <div className="mb-4">
        <p className="text-[12px] font-bold text-[#2d4a7c] tracking-wider uppercase mb-2">질문 → 진화</p>
        <h2 className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          답할 때마다 기획안이 바뀝니다
        </h2>
      </div>

      {/* Q1 */}
      <div>
        <p className="text-[14px] font-semibold text-[var(--text-primary)] mb-3">{INTERVIEW_Q1.question}</p>
        <div className="grid grid-cols-2 gap-2">
          {INTERVIEW_Q1.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setQ1(opt.value); track('demo_q1_answer', { value: opt.value, label: opt.label }); }}
              className={`px-4 py-3 rounded-xl border-2 text-left text-[13px] font-medium transition-all cursor-pointer active:scale-[0.98] ${
                q1 === opt.value
                  ? 'border-[var(--accent)] bg-[var(--accent)]/8 text-[var(--accent)]'
                  : 'border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--border)]'
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
          <p className="text-[14px] font-semibold text-[var(--text-primary)] mb-3">{INTERVIEW_Q2.question}</p>
          <div className="grid grid-cols-2 gap-2">
            {INTERVIEW_Q2.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setQ2(opt.value); track('demo_q2_answer', { value: opt.value, label: opt.label }); }}
                className={`px-4 py-3 rounded-xl border-2 text-left text-[13px] font-medium transition-all cursor-pointer active:scale-[0.98] ${
                  q2 === opt.value
                    ? 'border-[var(--accent)] bg-[var(--accent)]/8 text-[var(--accent)]'
                    : 'border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--border)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Updated draft — appears after both answers */}
      {draft && (
        <div className="mt-4 space-y-4 animate-fade-in">
          <div className="flex items-center gap-2 text-[12px] text-[var(--success)] font-semibold">
            <CrescendoHairpin width={16} height={8} color="var(--success)" />
            답변 반영 — 기획안이 진화했습니다
          </div>

          <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/[0.03] px-5 py-3">
            <p className="text-[12px] font-bold text-[var(--accent)] mb-1">상황 업데이트</p>
            <p className="text-[14px] text-[var(--text-primary)]">{draft.situation_update}</p>
          </div>

          {/* Question diff */}
          <div className="rounded-xl bg-[var(--primary)] text-[var(--bg)] px-5 py-4 shadow-md">
            <p className="text-[11px] font-bold text-white/40 mb-2">진짜 질문 (수정됨)</p>
            <p className="text-[13px] text-white/40 line-through mb-2">{draft.real_question_before}</p>
            <p className="text-[16px] md:text-[18px] font-bold leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
              {draft.real_question_after}
            </p>
          </div>

          {/* Updated skeleton */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-4">
            <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--text-tertiary)] mb-3">기획안 뼈대 (수정됨)</p>
            <ol className="space-y-2">
              {draft.skeleton.map((item, i) => {
                const changed = item !== FIRST_DRAFT.skeleton[i];
                return (
                  <li key={i} className="flex items-start gap-3 text-[14px]">
                    <span className={`shrink-0 w-5 h-5 rounded-md text-[11px] font-bold flex items-center justify-center mt-0.5 ${
                      changed ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'bg-[var(--bg)] text-[var(--text-tertiary)]'
                    }`}>{i + 1}</span>
                    <span className={changed ? 'text-[var(--accent)] font-semibold' : 'text-[var(--text-primary)]'}>{item}</span>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Updated premises */}
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-5 py-4">
            <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--text-tertiary)] mb-3">전제 업데이트</p>
            <div className="space-y-2 text-[14px]">
              <div className="flex items-start gap-2.5">
                <span className="text-[var(--success)] shrink-0">✓</span>
                <span className="text-[var(--text-primary)]">{draft.premises_confirmed}</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-red-500 shrink-0">✗</span>
                <span className="text-[var(--text-primary)]">{draft.premises_risk}</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-amber-500 shrink-0">?</span>
                <span className="text-[var(--text-primary)]">{draft.premises_uncertain}</span>
              </div>
            </div>
          </div>
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
    <div className="space-y-5 phrase-entrance">
      <div className="mb-4">
        <p className="text-[12px] font-bold text-[#6b4c9a] tracking-wider uppercase mb-2">
          <UserCheck size={14} className="inline mr-1" />사전 검증
        </p>
        <h2 className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          대표님은 뭐라고 할까?
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mt-2">
          실제로 보여주기 전에, 예상 반응을 미리 확인합니다.
        </p>
      </div>

      {/* Persona reaction */}
      <Card className="!p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-[#6b4c9a] flex items-center justify-center text-white text-[18px] font-bold shrink-0">김</div>
          <div>
            <p className="text-[16px] font-bold text-[var(--text-primary)]">{persona.name}</p>
            <p className="text-[13px] text-[var(--text-secondary)]">CEO · 최종 의사결정자</p>
          </div>
        </div>
        <div className="rounded-xl bg-[var(--ai)] px-4 py-3.5">
          <p className="text-[15px] font-medium text-[var(--text-primary)] leading-relaxed italic">
            &ldquo;{persona.reaction}&rdquo;
          </p>
        </div>
      </Card>

      {/* Weaknesses */}
      <div>
        <p className="text-[12px] font-bold text-red-500/80 tracking-[0.1em] uppercase mb-3">약점 3가지</p>
        <div className="space-y-2">
          {persona.weaknesses.map((w, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/60 px-4 py-3">
              <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-[14px] text-[var(--text-primary)]">{w}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Unspoken */}
      <div className="rounded-xl border border-[#6b4c9a]/20 bg-[#6b4c9a]/[0.04] px-5 py-4">
        <p className="text-[12px] font-bold text-[#6b4c9a] tracking-[0.08em] uppercase mb-2">아무도 말 안 하는 것</p>
        <p className="text-[15px] font-medium text-[var(--text-primary)] leading-relaxed italic">
          &ldquo;{persona.unspoken}&rdquo;
        </p>
      </div>

      {/* What to fix */}
      <div>
        <p className="text-[12px] font-bold text-[var(--success)] tracking-[0.1em] uppercase mb-3">이렇게 고치면 OK할 가능성 ↑</p>
        <div className="space-y-2">
          {persona.fixes.map((f, i) => (
            <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
              <p className="text-[14px] text-[var(--text-primary)] flex-1">{f.text}</p>
              <span className="shrink-0 text-[11px] font-bold text-[var(--success)] bg-[var(--success)]/10 px-2.5 py-1 rounded-full">{f.impact}</span>
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
    <div className="space-y-5 phrase-entrance">
      <div className="mb-4">
        <p className="text-[12px] font-bold text-[#2d6b2d] tracking-wider uppercase mb-2">반영 선택</p>
        <h2 className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          어떤 피드백을 기획안에 반영할까요?
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mt-2">
          탭해서 반영할 항목을 선택하세요. <strong className="text-[var(--text-primary)]">실행 준비도가 실시간으로 바뀝니다.</strong>
        </p>
      </div>

      {/* Score */}
      <div className={`rounded-2xl overflow-hidden border transition-all duration-500 ${
        applied.size === 3 ? 'border-[#2d6b2d] bg-[#2d6b2d]' : 'border-[#2d6b2d]/20 bg-[#2d6b2d]/[0.06]'
      }`}>
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <p className={`text-[11px] font-medium mb-0.5 ${applied.size === 3 ? 'text-white/60' : 'text-[var(--text-tertiary)]'}`}>실행 준비도</p>
            <p className={`text-[32px] font-extrabold leading-none tabular-nums ${applied.size === 3 ? 'text-white' : 'text-[#2d6b2d]'}`}>{score}%</p>
          </div>
          {applied.size === 3 && (
            <div className="flex items-center gap-2 text-white">
              <Check size={18} />
              <span className="text-[14px] font-bold">제출 가능</span>
            </div>
          )}
        </div>
        <div className="h-2 bg-[var(--border)]">
          <div className="h-full bg-[#2d6b2d] transition-all duration-700 rounded-r" style={{ width: `${score}%` }} />
        </div>
      </div>

      {/* Fix toggles */}
      <div className="space-y-2.5">
        {persona.fixes.map((f, i) => {
          const isOn = applied.has(i);
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                isOn
                  ? 'border-[#2d6b2d] bg-[#2d6b2d]/[0.06] shadow-sm'
                  : 'border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--border)]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    isOn ? 'bg-[#2d6b2d] text-white' : 'bg-[var(--bg)] border border-[var(--border)]'
                  }`}>
                    {isOn && <Check size={12} />}
                  </div>
                  <p className={`text-[14px] font-medium leading-snug ${isOn ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                    {f.text}
                  </p>
                </div>
                <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full transition-colors ${
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

  return (
    <div className="space-y-6 phrase-entrance">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 text-[12px] text-[var(--success)] font-semibold tracking-wider uppercase mb-3">
          <Sparkles size={14} /> 완료
        </div>
        <h2 className="text-[28px] md:text-[36px] font-bold text-[var(--text-primary)] leading-tight tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          막막했던 기획안이<br />
          <span className="text-[var(--accent)]">제출 가능한 구조</span>가 되었습니다
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mt-3">
          입력 1개 + 질문 2개 + 피드백 반영. 이게 전부입니다.
        </p>
      </div>

      {/* Final question */}
      <div className="rounded-xl bg-[var(--primary)] text-[var(--bg)] px-5 py-4 shadow-md">
        <p className="text-[11px] font-bold text-white/40 mb-2">최종 핵심 질문</p>
        <p className="text-[17px] font-bold leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
          {draft?.real_question_after || FIRST_DRAFT.real_question}
        </p>
      </div>

      {/* Final skeleton with fixes applied */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
        <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--text-tertiary)] mb-3">최종 기획안 구조</p>
        <ol className="space-y-2">
          {(draft?.skeleton || FIRST_DRAFT.skeleton).map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-[14px]">
              <span className="shrink-0 w-5 h-5 rounded-md bg-[var(--accent)]/10 text-[var(--accent)] text-[11px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
              <span className="text-[var(--text-primary)]">{item}</span>
            </li>
          ))}
          {/* Applied fixes as additions */}
          {persona.fixes.filter((_, i) => applied.has(i)).map((f, i) => (
            <li key={`fix-${i}`} className="flex items-start gap-3 text-[14px]">
              <span className="shrink-0 w-5 h-5 rounded-md bg-[#2d6b2d]/15 text-[#2d6b2d] text-[11px] font-bold flex items-center justify-center mt-0.5">+</span>
              <span className="text-[#2d6b2d] font-medium">{f.text.split('—')[0].trim()}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
        <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--text-tertiary)] mb-3">이 과정에서 일어난 일</p>
        <div className="space-y-2 text-[13px] text-[var(--text-secondary)]">
          <p>1. 입력 하나로 <strong className="text-[var(--text-primary)]">기획안 뼈대 + 숨겨진 전제</strong>가 즉시 나왔습니다.</p>
          <p>2. 질문 2개에 답하자 <strong className="text-[var(--text-primary)]">핵심 질문과 구조가 진화</strong>했습니다.</p>
          <p>3. 대표님의 예상 반응으로 <strong className="text-[var(--text-primary)]">약점 3가지</strong>를 미리 발견했습니다.</p>
          <p>4. 피드백을 반영해서 <strong className="text-[var(--text-primary)]">실행 준비도 {applied.size === 3 ? '92' : applied.size === 2 ? '78' : '62'}%</strong>에 도달했습니다.</p>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center pt-2">
        <p className="text-[15px] text-[var(--text-secondary)] mb-4">
          이제 당신의 과제로 직접 해보세요.
        </p>
        <Link href="/workspace" onClick={() => track('demo_to_workspace', { from_step: 'final', q2, fixes: applied.size })}>
          <Button>
            내 과제로 시작하기 <ArrowRight size={14} />
          </Button>
        </Link>
        <p className="text-[11px] text-[var(--text-tertiary)] mt-3">
          로그인 없이 무료
        </p>
      </div>
    </div>
  );
}

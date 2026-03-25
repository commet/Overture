'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import {
  Play, Layers, Map, Users, RefreshCw, Sparkles,
  Check, ArrowRight, ArrowLeft, Bot, Brain, Handshake,
} from 'lucide-react';
import { track } from '@/lib/analytics';

/* ═══════════════════════════════════════
   DEMO DATA
   ═══════════════════════════════════════ */

const DEMO = {
  scenario: '대표가 "AI를 활용해서 업무 효율을 높여라"고 지시했습니다.',
  context: '팀원 대부분은 AI 실무 경험이 없습니다. 다음 달까지 계획을 내야 합니다.',
  surface_task: '우리 팀의 AI 활용 계획을 다음 달까지 수립',

  premises: [
    'AI를 도입하면 업무 효율이 올라간다',
    '팀원들이 AI 도구를 배우고 적극 사용할 것이다',
    '경쟁사가 성공했으니 우리도 될 것이다',
  ],

  governing_idea: '모든 업무에 AI가 아니라, 효과가 큰 1-2개를 파일럿으로 먼저 증명한다',
  steps: [
    { task: '팀 업무 목록화 + AI 적합도 평가', actor: 'both' as const, time: '1일' },
    { task: '파일럿 대상 업무 1-2개 선정', actor: 'human' as const, time: '반나절' },
    { task: '2주 파일럿 실행 + 효과 측정', actor: 'both' as const, time: '2주' },
    { task: '결과 기반 확대/중단 의사결정', actor: 'human' as const, time: '1일' },
  ],

  persona: {
    name: '김상무',
    role: '경영기획 상무 · 대표 직보',
    default_reaction: '파일럿부터 하겠다는 건 좋아. 근데 2주 파일럿이면 남은 2주에 뭘 보여줄 수 있어?',
    unspoken_risk: '솔직히 팀원 절반은 "AI가 내 일을 뺏는 거 아냐?"라고 생각하고 있어. 아무도 대놓고 말 안 하지만.',
  },

  refinement: [
    { fixes: ['IT 보안 승인 병행 프로세스 추가', '팀원 온보딩 워크숍 설계'], score: 78, review: '워크숍은 좋은데, 실제 업무 데이터로 해봐야 감이 와.' },
    { fixes: ['Before/After 측정 프레임 구체화', '팀원 불안감 관리 커뮤니케이션'], score: 92, review: '좋아. 데이터가 있으면 대표한테 보고할 수 있어.' },
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

function getReframed(doubted: Set<number>): { question: string; insight: string } {
  const d0 = doubted.has(0);
  const d1 = doubted.has(1);
  const d2 = doubted.has(2);
  const count = doubted.size;

  if (count === 0) return {
    question: '전제가 탄탄하다면 — "어떤 AI 도구"가 아니라 "어떤 업무부터 적용해서 가장 빠르게 성과를 증명할지"가 진짜 질문이다.',
    insight: '실행 속도가 관건입니다. 파일럿 대상 업무 선정이 핵심 판단입니다.',
  };

  if (count === 3) return {
    question: 'AI 도구를 도입하는 것이 아니라, 우리 팀의 어떤 업무가 AI로 실질적으로 나아질 수 있는지를 먼저 파악해야 하는 것 아닌가?',
    insight: '세 전제 모두 흔들립니다. 계획보다 검증이 먼저입니다.',
  };

  if (d0 && !d1 && !d2) return {
    question: '"AI 도입 = 효율 향상"이 흔들린다. 계획이 아니라, 우리 업무 중 AI가 실제로 시간을 줄여주는 게 있는지부터 검증해야 하지 않나?',
    insight: '"정말 빨라지는가"가 불확실합니다. Before/After 데이터를 먼저 확보하세요.',
  };

  if (!d0 && d1 && !d2) return {
    question: 'AI가 효율적인 건 맞을 수 있다. 하지만 "팀원들이 쓸 것이다"가 흔들리면, 도구가 아니라 팀의 변화 수용력을 먼저 설계해야 하지 않나?',
    insight: '학습 비용과 심리적 저항을 먼저 다뤄야 합니다.',
  };

  if (!d0 && !d1 && d2) return {
    question: '경쟁사를 따라가는 게 아니라, 우리 팀의 고유한 병목을 찾아서 거기에 AI를 쓰는 게 맞지 않나?',
    insight: '외부 사례는 참고일 뿐입니다. 우리 팀만의 판단 기준이 필요합니다.',
  };

  if (d0 && d1) return {
    question: '"빨라지는지도 모르고, 팀이 쓸지도 모른다" — 계획이 아니라, 1명이 1개 업무로 1주일 써보는 최소 실험부터 해야 하지 않나?',
    insight: '큰 계획은 위험합니다. 가장 작은 단위의 실험으로 두 가정을 동시에 검증하세요.',
  };

  if (d0 && d2) return {
    question: '"정말 빨라지는지"도 의문이고 경쟁사 논리도 약하다면 — 우리 팀만의 효율 병목을 먼저 정의하는 게 선행 질문 아닌가?',
    insight: '외부 사례와 일반론 모두 근거가 약합니다. 자체 데이터에서 시작하세요.',
  };

  // d1 && d2
  return {
    question: '"팀이 쓸지"와 "남의 성공이 우리 성공인지" 둘 다 흔들린다면 — 도구가 아니라 팀 내부 합의와 자체 기준을 먼저 만드는 게 순서 아닌가?',
    insight: '기술은 준비돼도 사람과 맥락이 다르면 실패합니다. 내부 합의부터 세우세요.',
  };
}

/* ═══════════════════════════════════════
   STEPS & UTILITIES
   ═══════════════════════════════════════ */

const STEPS = [
  { id: 'intro', label: '시작', icon: Play },
  { id: 'decompose', label: '악보 해석', icon: Layers },
  { id: 'orchestrate', label: '편곡', icon: Map },
  { id: 'persona', label: '리허설', icon: Users },
  { id: 'refinement', label: '합주', icon: RefreshCw },
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
        {step === 1 && <DecomposeSection />}
        {step === 2 && <OrchestrateSection />}
        {step === 3 && <PersonaSection />}
        {step === 4 && <RefinementSection />}
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
          실제 업무 시나리오로 Overture의 핵심을 체험하세요.
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
   악보 해석 — 전제 토글 → 질문 실시간 전환
   ═══════════════════════════════════════ */

function DecomposeSection() {
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
    <div className="space-y-5 phrase-entrance">
      <div>
        <div className="flex items-center gap-2 text-[12px] text-[#2d4a7c] font-semibold tracking-wider uppercase mb-2">
          <Layers size={14} /> 1악장 &middot; 악보 해석
        </div>
        <h2 className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          과제 뒤의 숨겨진 전제
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mt-2">
          의심되는 전제를 탭하세요. <strong className="text-[var(--text-primary)]">질문이 바뀝니다.</strong>
        </p>
      </div>

      {/* Surface task */}
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3">
        <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--text-tertiary)] mb-1">받은 과제</p>
        <p className="text-[14px] font-semibold text-[var(--text-primary)]">{DEMO.surface_task}</p>
      </div>

      {/* Premises — tappable toggle */}
      <div className="space-y-2">
        {DEMO.premises.map((text, i) => {
          const isDoubted = doubted.has(i);
          return (
            <button
              key={i}
              onClick={() => toggleDoubt(i)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                isDoubted
                  ? 'border-red-300 bg-red-50/80 shadow-sm'
                  : 'border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--border)] hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className={`text-[13px] font-medium leading-snug ${isDoubted ? 'text-red-700' : 'text-[var(--text-primary)]'}`}>
                  &ldquo;{text}&rdquo;
                </p>
                <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full transition-colors ${
                  isDoubted ? 'bg-red-100 text-red-600' : 'bg-[var(--bg)] text-[var(--text-tertiary)] border border-[var(--border-subtle)]'
                }`}>
                  {isDoubted ? '의심' : '확인'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Before → After */}
      <div className="space-y-3 pt-1">
        <div className="rounded-lg bg-[var(--surface)] px-4 py-3 opacity-50">
          <p className="text-[11px] font-bold text-[var(--text-tertiary)] mb-1">원래 질문</p>
          <p className="text-[14px] text-[var(--text-tertiary)] line-through decoration-[var(--risk-critical)]/40">{DEMO.surface_task}</p>
        </div>

        <div className="h-px mx-auto w-16 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent" />

        <div
          key={reframedKey}
          className="rounded-xl bg-[var(--primary)] text-[var(--bg)] p-5 shadow-lg animate-crescendo"
        >
          <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-white/40 mb-2">재정의된 질문</p>
          <p className="text-[16px] md:text-[18px] font-bold leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
            {reframed.question}
          </p>
          <p className="text-[13px] text-white/60 mt-2">{reframed.insight}</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   편곡 — 역할 토글 + 분배 바
   ═══════════════════════════════════════ */

function OrchestrateSection() {
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
          <Map size={14} /> 2악장 &middot; 편곡
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
    </div>
  );
}

/* ═══════════════════════════════════════
   리허설 — 페르소나 즉시 등장 + 동적 반응
   ═══════════════════════════════════════ */

function PersonaSection() {
  const doubted = demoChoices.doubted;
  const actors = demoChoices.actors;

  const aiOnlyCount = DEMO.steps.filter((_, i) => actors[i] === 'ai').length;
  const allConfirmed = doubted.size === 0;

  // Dynamic main reaction
  const reaction = (() => {
    if (aiOnlyCount >= 3) return '이거 AI한테 다 맡기면 누가 책임져? 결과가 안 좋으면 "사람이 안 봐서 그렇다"고 할 건데.';
    if (allConfirmed) return '전제를 다 맞다고 놓은 건 좀 걱정되는데. 팀원들이 정말 AI를 배울 의지가 있어?';
    return DEMO.persona.default_reaction;
  })();

  // Dynamic observations from user choices (max 2)
  const observations: { label: string; text: string }[] = [];
  if (actors[3] === 'ai') {
    observations.push({ label: '대표 보고서 → AI 단독', text: '대표한테 올라가는 문서를 AI가 쓴다고? "이게 팀의 판단이야 AI 판단이야?"라고 물을 거야.' });
  }
  if (actors[1] === 'ai') {
    observations.push({ label: '파일럿 선정 → AI 단독', text: '파일럿 대상을 AI가 골라? 팀원들이 "왜 내 업무야?"라고 하면 뭐라고 해.' });
  }
  if (!doubted.has(0) && observations.length < 2) {
    observations.push({ label: '"AI=효율" 확인', text: '도입만 한다고 올라가? 어떤 업무에 쓸 건지 구체적으로 나와야지.' });
  }

  return (
    <div className="space-y-5 phrase-entrance">
      <div>
        <div className="flex items-center gap-2 text-[12px] text-[#6b4c9a] font-semibold tracking-wider uppercase mb-2">
          <Users size={14} /> 3악장 &middot; 리허설
        </div>
        <h2 className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          이해관계자가 반응합니다
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mt-2">
          당신의 선택을 바탕으로 핵심 이해관계자를 시뮬레이션합니다.
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

      {/* Dynamic observations based on user's prior choices */}
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

      {/* Unspoken risk */}
      <div className="rounded-xl bg-purple-50 border border-purple-200 px-4 py-3.5">
        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 mb-2">침묵의 리스크</span>
        <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">
          {DEMO.persona.unspoken_risk}
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   합주 — 자동 재생 수렴
   ═══════════════════════════════════════ */

function RefinementSection() {
  const [phase, setPhase] = useState<'ready' | 'r1-loading' | 'r1' | 'r2-loading' | 'r2'>('ready');

  useEffect(() => {
    if (phase === 'r1-loading') { const t = setTimeout(() => setPhase('r1'), 1500); return () => clearTimeout(t); }
    if (phase === 'r1') { const t = setTimeout(() => setPhase('r2-loading'), 2000); return () => clearTimeout(t); }
    if (phase === 'r2-loading') { const t = setTimeout(() => setPhase('r2'), 1500); return () => clearTimeout(t); }
  }, [phase]);

  const rawScore = phase === 'r2' ? 92 : (phase === 'r1' || phase === 'r2-loading') ? 78 : 0;
  const score = useCountUp(rawScore);
  const isConverged = phase === 'r2';

  return (
    <div className="space-y-5 phrase-entrance">
      <div>
        <div className="flex items-center gap-2 text-[12px] text-[#2d6b2d] font-semibold tracking-wider uppercase mb-2">
          <RefreshCw size={14} /> 4악장 &middot; 합주
        </div>
        <h2 className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          피드백을 반영하고 수렴합니다
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mt-2">
          리허설 피드백을 자동으로 반영하고, 이해관계자가 다시 검토합니다.
        </p>
      </div>

      {/* Convergence score */}
      {score > 0 && (
        <div className={`rounded-2xl overflow-hidden border transition-all duration-500 ${
          isConverged ? 'border-[#2d6b2d] bg-[#2d6b2d]' : 'border-[#2d6b2d]/20 bg-[#2d6b2d]/[0.06]'
        }`}>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className={`text-[11px] font-medium mb-0.5 ${isConverged ? 'text-white/60' : 'text-[var(--text-tertiary)]'}`}>수렴도</p>
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

      {/* Start button */}
      {phase === 'ready' && (
        <button
          onClick={() => setPhase('r1-loading')}
          className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-[#2d6b2d] text-white text-[15px] font-bold hover:bg-[#245524] transition-colors cursor-pointer active:scale-[0.98]"
        >
          합주 시작 <ArrowRight size={14} />
        </button>
      )}

      {/* Loading */}
      {(phase === 'r1-loading' || phase === 'r2-loading') && (
        <div className="text-center py-8 animate-fade-in">
          <div className="w-8 h-8 rounded-full border-2 border-[#2d6b2d] border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-[14px] text-[var(--text-secondary)]">
            {phase === 'r1-loading' ? '피드백을 반영하여 수정 중...' : '나머지 이슈를 반영 중...'}
          </p>
        </div>
      )}

      {/* Revision results */}
      {(phase === 'r1' || phase === 'r2-loading' || phase === 'r2') && (
        <div className="space-y-3 animate-fade-in">
          {DEMO.refinement.slice(0, phase === 'r1' ? 1 : 2).map((r, idx) => (
            <div key={idx} className="rounded-xl border border-[#2d6b2d]/15 bg-[#2d6b2d]/[0.03] px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[13px] font-bold text-[#2d6b2d]">{idx + 1}차 수정</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#2d6b2d]/10 text-[#2d6b2d] font-bold tabular-nums">{r.score}%</span>
              </div>
              <ul className="space-y-1 mb-2.5">
                {r.fixes.map((f, fi) => (
                  <li key={fi} className="text-[13px] text-[var(--text-primary)] flex items-start gap-2">
                    <Check size={12} className="text-[#2d6b2d] shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <p className="text-[13px] italic text-[var(--text-secondary)]">&ldquo;{r.review}&rdquo; — 김상무</p>
            </div>
          ))}
        </div>
      )}

      {/* Converged banner */}
      {isConverged && (
        <div className="rounded-xl border-2 border-[#2d6b2d] bg-[#2d6b2d]/[0.04] px-5 py-4 text-center animate-fade-in">
          <p className="text-[18px] font-extrabold text-[#2d6b2d]" style={{ fontFamily: 'var(--font-display)' }}>수렴 완료</p>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">2회 반복으로 92%에 도달했습니다</p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   결과 — CTA
   ═══════════════════════════════════════ */

function OutroSection() {
  return (
    <div className="space-y-6 phrase-entrance text-center">
      <div>
        <div className="flex items-center justify-center gap-2 text-[12px] text-[var(--success)] font-semibold tracking-wider uppercase mb-3">
          <Sparkles size={14} /> 완료
        </div>
        <h2 className="text-[28px] md:text-[36px] font-bold text-[var(--text-primary)] leading-tight tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          92% 수렴.<br />
          <span className="text-[var(--text-secondary)]">이제 당신 차례입니다.</span>
        </h2>
        <p className="text-[15px] text-[var(--text-secondary)] mt-4 leading-relaxed max-w-md mx-auto">
          전제를 점검하고, 역할을 설계하고,<br />
          이해관계자 반응을 예측하고, 수렴할 때까지 반복했습니다.<br />
          이제 당신의 과제로 해보세요.
        </p>
      </div>

      <Card variant="ai" className="!py-8">
        <Link href="/workspace">
          <Button>
            워크스페이스에서 시작하기 <ArrowRight size={14} />
          </Button>
        </Link>
        <p className="text-[11px] text-[var(--text-tertiary)] mt-3">
          로그인 없이 무료
        </p>
      </Card>
    </div>
  );
}

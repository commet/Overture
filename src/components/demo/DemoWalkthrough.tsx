'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import {
  Play, Layers, Map, Users, RefreshCw, Sparkles,
  Check, ArrowRight, ArrowLeft,
  Lightbulb, Link2, Bot, Brain, Handshake, Flag,
  FileText, ListChecks, Code, ClipboardList,
} from 'lucide-react';
import { track } from '@/lib/analytics';

/* ═══════════════════════════════════════
   DEMO DATA — AI 업무 효율화 사례
   ═══════════════════════════════════════ */

const DEMO = {
  project: {
    name: 'AI 업무 효율화 계획',
    scenario: '당신은 50인 규모 회사의 기획팀원입니다. 대표가 전사 회의에서 "AI를 활용해서 업무 효율을 높여라. 각 팀별로 다음 달까지 실행 계획을 만들어라"고 지시했습니다.',
    context: '팀원 대부분은 ChatGPT를 써본 적은 있지만, 실제 업무에 적용한 경험은 거의 없습니다. 경쟁사가 AI 도입으로 보고서 작성 시간을 50% 줄였다는 뉴스가 나왔습니다.',
    directive: '대표 지시: "다음 달까지 우리 팀 AI 활용 계획 만들어와."',
  },

  decompose: {
    surface_task: '우리 팀의 AI 활용 계획을 다음 달까지 수립',
    hidden_assumptions: [
      { assumption: 'AI를 도입하면 업무 효율이 올라간다', risk_if_false: '프롬프트 작성·검수·수정에 오히려 시간이 더 들 수 있음. 자동화할 수 없는 업무에 AI를 도입하면 비효율만 증가', evaluation: 'uncertain' as const },
      { assumption: '팀원들이 AI 도구를 배우고 적극 사용할 것이다', risk_if_false: '학습 비용 과소평가. 업무 패턴 변경에 대한 저항. "나를 대체하려는 거 아닌가"라는 불안감', evaluation: 'doubtful' as const },
      { assumption: '경쟁사가 성공했으니 우리도 될 것이다', risk_if_false: '경쟁사의 업무 구조·데이터·인력이 다름. 겉으로 보이는 50% 절감 뒤에 숨겨진 맥락을 모름', evaluation: 'doubtful' as const },
    ],
    reframed_question: 'AI 도구를 도입하는 것이 아니라, 우리 팀의 어떤 판단과 작업이 AI 보조로 실질적으로 나아질 수 있는지를 먼저 파악해야 하는 것 아닌가?',
    why_reframing_matters: "'어떤 AI 도구를 쓸까'가 아니라 '어떤 업무에 AI가 유효한가'로 질문이 바뀌면, 도구 도입이 아니라 업무 재설계가 됩니다.",
  },

  orchestrate: {
    governing_idea: '"모든 업무에 AI"가 아니라, 반복·판단 보조·초안 생성 중 가장 효과가 큰 업무 1-2개를 선정하여 파일럿으로 증명한다',
    storyline: {
      situation: '대표가 전사 AI 효율화를 지시했고, 경쟁사의 성공 사례가 압박을 가하고 있다.',
      complication: '그러나 팀원 대부분은 AI 실무 경험이 없고, "어떤 업무에 AI를 쓸지"에 대한 합의도 없다. 무작정 도구부터 도입하면 "도입했지만 안 쓴다"가 될 수 있다.',
      resolution: '업무를 유형별로 분류하고, AI 적합도가 높은 1-2개를 선정하여 2주 파일럿으로 효과를 검증한 뒤, 데이터로 확대 여부를 판단한다.',
    },
    steps: [
      { task: '팀 업무 목록화 + AI 적합도 평가', actor: 'both' as const, expected_output: '업무별 AI 적합도 매트릭스 (반복성·판단 난이도·데이터 접근성)', checkpoint: true, checkpoint_reason: '이 분류가 이후 모든 우선순위의 기반', estimated_time: '1일', judgment: '반복성 중심/시간 소요 중심/실수 빈도 중심 중 업무 분류 기준을 선택', user_ai_guide: 'AI가 팀 업무를 유형별로 분류하고 반복성·판단 난이도를 평가' },
      { task: '파일럿 대상 업무 1-2개 선정', actor: 'human' as const, expected_output: '선정 근거 + 예상 효과 + 리스크', checkpoint: false, estimated_time: '반나절', judgment: '보고서 초안 자동화/데이터 분석 보조/회의록 자동 정리 중 파일럿 대상 결정' },
      { task: '2주 파일럿 실행 + 효과 측정', actor: 'both' as const, expected_output: 'Before/After 비교 데이터 (시간·품질·만족도)', checkpoint: true, checkpoint_reason: '실제 데이터 없이 확대하면 반복의 함정', estimated_time: '2주', judgment: '시간 절감/품질 향상/팀원 만족도 중 효과 측정 기준을 선택', user_ai_guide: 'AI가 파일럿 기간 동안 업무 소요 시간을 자동 기록·비교' },
      { task: '결과 기반 확대/중단 의사결정 문서', actor: 'human' as const, expected_output: '대표 보고용 1-pager: 파일럿 결과 + 확대 시나리오 + 리스크', checkpoint: true, checkpoint_reason: '대표 보고 전 프레이밍 검수', estimated_time: '1일', judgment: '확대/축소 유지/중단 중 추천안을 선택' },
    ],
  },

  persona: {
    name: '김상무',
    role: '경영기획 상무 / 대표 직보',
    traits: ['ROI 중심 사고', '빠른 실행 선호', '데이터 없으면 안 움직임'],
    feedback: {
      overall_reaction: '파일럿부터 하겠다는 건 좋아. 근데 대표가 "다음 달까지"라고 했는데, 2주 파일럿이면 남은 2주에 뭘 보여줄 수 있어?',
      failure_scenario: '2주 파일럿을 했는데 팀원들이 기존 방식으로 돌아감. "써봤는데 오히려 더 느려요"라는 피드백이 쌓이고, 대표한테 "실패했습니다"라고 보고하는 상황.',
      classified_risks: [
        { text: 'AI 도구 보안 승인에 IT팀 사전 협의가 필요한데, 보안 검토만 3주 걸릴 수 있어. IT팀 협의 없이는 파일럿 시작도 못 해.', category: 'critical' as const },
        { text: '팀원 학습 비용. 하지만 1-2명 얼리 어답터를 먼저 키우고 나머지에게 전파하면 관리 가능.', category: 'manageable' as const },
        { text: '솔직히 팀원 절반은 "AI가 내 일을 뺏는 거 아냐?"라고 생각하고 있어. 아무도 대놓고 말 안 하지만. 이거 안 다루면 파일럿은 성공해도 확산은 안 돼.', category: 'unspoken' as const },
      ],
      approval_conditions: ['파일럿 업무에서 최소 20% 시간 절감 데이터가 있을 것', '팀원 3명 이상의 자발적 참여 의사가 확인될 것'],
    },
  },

  convergence: {
    iterations: [
      { number: 1, score: 0.50, resolved: 2, unresolved: 2, total: 4, summary: 'IT 보안 승인 병행 프로세스 추가. 온보딩 핸즈온 워크숍 설계.' },
      { number: 2, score: 0.92, resolved: 4, unresolved: 0, total: 4, summary: 'Before/After 측정 프레임 구체화. 팀원 불안감 관리 커뮤니케이션 추가. 전 이슈 해결.' },
    ],
  },
};

/* Shared user choices — persists across demo step transitions */
const demoUserChoices = {
  evals: {} as Record<number, string>,
  actors: {} as Record<number, 'ai' | 'human' | 'both'>,
  decisions: {} as Record<number, string>,
  interview: {} as Record<string, string>,
};

/* Mini-interview questions */
const DEMO_INTERVIEW = [
  {
    id: 'uncertainty',
    question: '이 과제에서 가장 불확실한 것은?',
    options: [
      { key: 'why', label: '왜 해야 하는지', desc: '목적 자체가 불분명' },
      { key: 'what', label: '무엇을 해야 하는지', desc: '방향은 알지만 구체 대상이 불명확' },
      { key: 'how', label: '어떻게 해야 하는지', desc: '할 건 아는데 방법을 모름' },
    ],
  },
  {
    id: 'success',
    question: '이게 성공하면 뭐가 달라지나요?',
    options: [
      { key: 'measurable', label: '숫자로 보이는 성과', desc: '시간 절감, 매출 증가 등' },
      { key: 'risk', label: '리스크 감소', desc: '실패 가능성이 줄어듦' },
      { key: 'opportunity', label: '새로운 가능성', desc: '못 하던 걸 할 수 있게 됨' },
    ],
  },
];

/* Loop demo data — pre-scripted issues & revisions for interactive refinement */
const DEMO_ISSUES = [
  { id: 0, text: 'IT/보안팀 사전 승인 절차가 일정에 미포함', severity: 'critical' as const, source: '핵심 위협' },
  { id: 1, text: '팀원 AI 역량 차이에 대한 온보딩 계획 부재', severity: 'critical' as const, source: '실패 시나리오' },
  { id: 2, text: '20% 시간 절감 목표의 Before/After 측정 방법 미구체화', severity: 'concern' as const, source: '승인 조건' },
  { id: 3, text: '팀원 불안감("AI가 내 일을 뺏나?") 관리 계획 없음', severity: 'concern' as const, source: '침묵의 리스크' },
];

const DEMO_REVISIONS = [
  {
    changes: [
      { issue: 'IT/보안 승인', fix: 'Step 0으로 "IT팀 사전 협의 + 보안 승인 병행" 추가. 파일럿 시작 1주 전에 완료. 승인 지연 시 사내 허용 도구(Copilot 등)로 대체 시나리오' },
      { issue: '팀원 온보딩', fix: '파일럿 참여자 대상 2시간 핸즈온 워크숍 추가. 실제 업무 데이터로 연습. 1:1 버디 시스템으로 적응 지원' },
    ],
    reReview: 'IT팀 협의를 앞에 넣은 건 좋아. 근데 2시간 워크숍이면 부족할 수도 있어. 실제 업무 데이터로 해봐야 감이 와. 그리고 대체 시나리오는 미리 준비해둬.',
    score: 78,
  },
  {
    changes: [
      { issue: 'Before/After 측정', fix: 'Before: 파일럿 전 3일간 현재 업무 소요 시간 기록. After: 파일럿 기간 동일 업무 시간 기록. 주간 비교 대시보드 자동 생성' },
      { issue: '팀원 불안감 관리', fix: '"AI는 대체가 아니라 업그레이드" 프레이밍. 팀장이 킥오프에서 "절약된 시간은 더 전략적 업무에 쓴다"고 명확히 선언. 월간 성과 공유로 투명성 확보' },
    ],
    reReview: '좋아. 데이터가 있으면 대표한테 보고할 수 있어. 다음 달 전체 회의에서 이걸로 발표해.',
    score: 92,
  },
];

const STEPS = [
  { id: 'intro', label: '시작', icon: Play },
  { id: 'decompose', label: '악보 해석', icon: Layers },
  { id: 'orchestrate', label: '편곡', icon: Map },
  { id: 'persona', label: '리허설', icon: Users },
  { id: 'refinement', label: '합주 연습', icon: RefreshCw },
  { id: 'outro', label: '결과', icon: Sparkles },
];

const LOADING_MESSAGES: Record<number, string[]> = {
  2: ['워크플로우를 설계하고 있습니다...', '단계별 담당을 배정하고 있습니다...', '체크포인트를 배치하고 있습니다...'],
};

const NEXT_PREVIEWS: Record<number, { label: string; desc: string }> = {
  0: { label: '악보 해석', desc: '과제 뒤에 숨은 진짜 질문을 찾아냅니다' },
  1: { label: '편곡', desc: 'AI와 사람의 역할을 나눠 워크플로우를 설계합니다' },
  2: { label: '리허설', desc: '이해관계자의 반응을 시뮬레이션합니다' },
  3: { label: '합주 연습', desc: '피드백을 반영하여 수렴할 때까지 반복합니다' },
  4: { label: '결과', desc: '4가지 형태의 산출물로 정리합니다' },
};

/* ─── Countup hook for convergence score ─── */

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
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(start + (target - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

/* ─── Loading simulation ─── */

function DemoLoading({ messages }: { messages: string[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIdx(prev => (prev + 1) % messages.length), 800);
    return () => clearInterval(timer);
  }, [messages.length]);
  return (
    <Card className="text-center !py-12">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
        <p className="text-[14px] text-[var(--text-secondary)] animate-fade-in" key={idx}>
          {messages[idx]}
        </p>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════ */

export function DemoWalkthrough() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const visitedRef = useRef<Set<number>>(new Set([0]));
  const maxStep = STEPS.length - 1;

  const go = (target: number) => {
    const next = Math.max(0, Math.min(target, maxStep));
    setStep(next);
    track('demo_step', { step: next, label: STEPS[next]?.id });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Loading simulation — only orchestrate gets parent loading
  useEffect(() => {
    if (step === 2 && !visitedRef.current.has(step)) {
      setLoading(true);
      const timer = setTimeout(() => {
        setLoading(false);
        visitedRef.current.add(step);
      }, 2000);
      return () => clearTimeout(timer);
    }
    setLoading(false);
  }, [step]);

  // Keyboard navigation
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
      {/* ─── Progress ─── */}
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

      {/* ─── Content ─── */}
      <div key={step} className="animate-fade-in">
        {loading && LOADING_MESSAGES[step] ? (
          <DemoLoading messages={LOADING_MESSAGES[step]} />
        ) : (
          <>
            {step === 0 && <IntroSection />}
            {step === 1 && <DecomposeSection />}
            {step === 2 && <OrchestrateSection />}
            {step === 3 && <PersonaSection />}
            {step === 4 && <RefinementSection />}
            {step === 5 && <OutroSection />}
          </>
        )}
      </div>

      {/* ─── Next step preview ─── */}
      {step < maxStep && step > 0 && !loading && NEXT_PREVIEWS[step] && (
        <div className="mt-6 flex items-center gap-2 bg-[var(--bg)] rounded-xl px-4 py-3 text-[13px]">
          <ArrowRight size={14} className="text-[var(--accent)] shrink-0" />
          <span className="text-[var(--text-secondary)]">다음:</span>
          <span className="font-semibold text-[var(--text-primary)]">{NEXT_PREVIEWS[step].label}</span>
          <span className="text-[var(--text-secondary)] hidden sm:inline">&mdash; {NEXT_PREVIEWS[step].desc}</span>
        </div>
      )}

      {/* ─── Navigation ─── */}
      <div className="flex items-center justify-between mt-4 pt-6 border-t border-[var(--border-subtle)]">
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
            {step === 0 ? '체험 시작' : '다음 단계'} <ArrowRight size={14} />
          </Button>
        ) : (
          <Link href="/workspace">
            <Button>
              직접 시작하기 <ArrowRight size={14} />
            </Button>
          </Link>
        )}
      </div>
      <p className="text-center text-[11px] text-[var(--text-tertiary)] mt-3 hidden md:block">
        ← → 키로도 이동할 수 있습니다
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════
   SECTION: Intro
   ═══════════════════════════════════════ */

function IntroSection() {
  return (
    <div className="space-y-6 phrase-entrance">
      <div>
        <div className="flex items-center gap-2 text-[12px] text-[var(--accent)] font-semibold tracking-wider uppercase mb-3">
          <Play size={14} /> Demo
        </div>
        <h2 className="text-[28px] md:text-[36px] font-bold text-[var(--text-primary)] leading-tight tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          5분 안에<br />Overture를 체험하세요
        </h2>
        <p className="text-[15px] text-[var(--text-secondary)] mt-3 leading-relaxed max-w-lg">
          실제 업무 시나리오를 4단계로 따라가 봅니다.<br />
          AI가 분석하고, 당신이 판단하는 과정을 경험하세요.
        </p>
      </div>

      <Card variant="elevated" className="!border-2 !border-[var(--border)]">
        <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--text-tertiary)] mb-3">오늘의 상황</p>
        <p className="text-[16px] md:text-[18px] font-semibold text-[var(--text-primary)] leading-relaxed" style={{ fontFamily: 'var(--font-display)' }}>
          {DEMO.project.scenario}
        </p>
        <p className="text-[13px] text-[var(--text-secondary)] mt-2 leading-relaxed">
          {DEMO.project.context}
        </p>
        <p className="text-[14px] text-[var(--accent)] font-bold mt-3">
          {DEMO.project.directive}
        </p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="!bg-[var(--bg)]">
          <p className="text-[12px] font-bold text-[var(--risk-critical)] mb-2">보통이라면?</p>
          <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">
            ChatGPT에 &ldquo;AI 활용 계획서 만들어줘&rdquo;라고 입력한다.<br />그럴듯한 문서가 나오지만 실행이 안 된다.
          </p>
          <p className="text-[12px] text-[var(--text-secondary)] mt-2">
            &rarr; 어떤 업무에 AI가 유효한지 모른 채 도구부터 도입한다.
          </p>
        </Card>
        <Card variant="ai">
          <p className="text-[12px] font-bold text-[#2d4a7c] mb-2">Overture라면?</p>
          <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">
            <strong>&ldquo;AI를 도입하면 정말 효율이 오를까?&rdquo;</strong><br />
            부터 묻습니다.
          </p>
          <p className="text-[12px] text-[var(--text-secondary)] mt-2">
            &rarr; 숨겨진 전제를 점검하고, 진짜 질문부터 바로잡습니다.
          </p>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   SECTION: 악보 해석 (with mini-interview + 질문 전환 moment)
   ═══════════════════════════════════════ */

function DecomposeSection() {
  const d = DEMO.decompose;
  const [phase, setPhase] = useState<'interview' | 'loading' | 'analysis'>('interview');
  const [interviewAnswers, setInterviewAnswers] = useState<Record<string, string>>({});
  const [evals, setEvals] = useState<Record<number, string>>(
    Object.fromEntries(d.hidden_assumptions.map((a, i) => [i, a.evaluation || 'uncertain']))
  );
  const evalOptions = [
    { key: 'likely_true', label: '확인', icon: '✅', bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', activeBg: 'bg-green-100' },
    { key: 'doubtful', label: '의심', icon: '❌', bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', activeBg: 'bg-red-100' },
    { key: 'uncertain', label: '불확실', icon: '❓', bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', activeBg: 'bg-amber-100' },
  ];

  // Sync to shared state
  useEffect(() => { demoUserChoices.evals = evals; }, [evals]);

  // Auto-advance from loading
  useEffect(() => {
    if (phase === 'loading') {
      const t = setTimeout(() => setPhase('analysis'), 2000);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const handleInterviewSelect = (qId: string, key: string) => {
    const next = { ...interviewAnswers, [qId]: key };
    setInterviewAnswers(next);
    demoUserChoices.interview = next;
    // Auto-advance when both answered
    if (Object.keys(next).length >= DEMO_INTERVIEW.length) {
      setTimeout(() => setPhase('loading'), 400);
    }
  };

  /* --- Phase: Mini-interview --- */
  if (phase === 'interview') {
    return (
      <div className="space-y-6 phrase-entrance">
        <div>
          <div className="flex items-center gap-2 text-[12px] text-[#2d4a7c] font-semibold tracking-wider uppercase mb-2">
            <Layers size={14} /> 1악장 &middot; 악보 해석
          </div>
          <h2 className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            먼저 맥락을 알려주세요
          </h2>
          <p className="text-[14px] text-[var(--text-secondary)] mt-2">2가지만 빠르게 선택하면, AI가 더 정확하게 분석합니다.</p>
        </div>

        {/* 받은 악보 */}
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-4">
          <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--text-tertiary)] mb-2">받은 과제</p>
          <p className="text-[15px] font-semibold text-[var(--text-primary)] leading-snug">{d.surface_task}</p>
        </div>

        {DEMO_INTERVIEW.map((q, qi) => {
          const answered = interviewAnswers[q.id];
          const isActive = qi === 0 || Object.keys(interviewAnswers).length >= qi;
          return (
            <div key={q.id} className={`transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <p className="text-[14px] font-bold text-[var(--text-primary)] mb-2.5">{q.question}</p>
              <div role="radiogroup" aria-label={q.question} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {q.options.map((opt) => (
                  <button
                    key={opt.key}
                    role="radio"
                    aria-checked={answered === opt.key}
                    onClick={() => handleInterviewSelect(q.id, opt.key)}
                    className={`text-left px-4 py-3 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                      answered === opt.key
                        ? 'border-[var(--accent)] bg-[var(--accent)]/[0.06] shadow-sm scale-[0.98]'
                        : 'border-[var(--border-subtle)] hover:border-[var(--border)] hover:shadow-sm bg-[var(--surface)] active:scale-[0.97]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className={`text-[13px] font-semibold ${answered === opt.key ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>{opt.label}</p>
                      {answered === opt.key && <Check size={14} className="text-[var(--accent)] shrink-0" />}
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  /* --- Phase: Loading --- */
  if (phase === 'loading') {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 text-[12px] text-[#2d4a7c] font-semibold tracking-wider uppercase mb-2">
            <Layers size={14} /> 1악장 &middot; 악보 해석
          </div>
          <h2 className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            진짜 질문을 찾아내다
          </h2>
        </div>
        <DemoLoading messages={['과제의 전제를 점검하고 있습니다...', '숨겨진 질문을 찾고 있습니다...', '진짜 주제를 읽어내고 있습니다...']} />
      </div>
    );
  }

  /* --- Phase: Analysis (assumptions + 질문 전환) --- */
  const doubtCount = Object.values(evals).filter(v => v === 'doubtful').length;
  const uncertainCount = Object.values(evals).filter(v => v === 'uncertain').length;

  return (
    <div className="space-y-6 phrase-entrance">
      <div>
        <div className="flex items-center gap-2 text-[12px] text-[#2d4a7c] font-semibold tracking-wider uppercase mb-2">
          <Layers size={14} /> 1악장 &middot; 악보 해석
        </div>
        <h2 className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          진짜 질문을 찾아내다
        </h2>
      </div>

      {/* 받은 악보 */}
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-4">
        <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--text-tertiary)] mb-2">받은 악보</p>
        <p className="text-[15px] font-semibold text-[var(--text-primary)] leading-snug">{d.surface_task}</p>
      </div>

      {/* 전제 점검 */}
      <div>
        <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-1">이 과제에 숨겨진 전제들</h3>
        <p className="text-[14px] text-[var(--text-secondary)] mb-3">정말 참인가요? 각 전제를 직접 판단해보세요.</p>
        <div className="space-y-2.5">
          {d.hidden_assumptions.map((a, i) => {
            const current = evals[i] || 'uncertain';
            return (
              <div key={i} className="rounded-lg border border-[var(--border-subtle)] overflow-hidden">
                <div className="px-4 py-3">
                  <p className="text-[13px] font-semibold text-[var(--text-primary)] leading-snug">&ldquo;{a.assumption}&rdquo;</p>
                  <p className="text-[12px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                    거짓이면 &rarr; {a.risk_if_false}
                  </p>
                  <div className="flex gap-1.5 mt-2.5">
                    {evalOptions.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setEvals(prev => ({ ...prev, [i]: opt.key }))}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                          current === opt.key
                            ? `${opt.activeBg} ${opt.border} ${opt.text}`
                            : 'border-[var(--border)] text-[var(--text-tertiary)] hover:border-[var(--border-subtle)]'
                        }`}
                      >
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ★ 질문의 전환 moment — Before/After contrast */}
      <div className="space-y-4">
        {/* Before: 원래 질문 */}
        <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] px-5 py-4 opacity-60">
          <p className="text-[11px] font-bold text-[var(--text-tertiary)] mb-1">원래 질문</p>
          <p className="text-[15px] text-[var(--text-tertiary)] line-through decoration-[var(--risk-critical)]/40 leading-snug">{d.surface_task}</p>
        </div>

        {/* Transition indicator */}
        <div className="flex items-center gap-3 px-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent" />
          <span className="text-[12px] font-bold text-[var(--accent)] shrink-0 px-2">
            {doubtCount > 0 || uncertainCount > 0
              ? <>전제 {Object.keys(evals).length}건 중 {doubtCount > 0 ? `${doubtCount}건 의심` : ''}{doubtCount > 0 && uncertainCount > 0 ? ', ' : ''}{uncertainCount > 0 ? `${uncertainCount}건 불확실` : ''} &rarr; 질문이 바뀝니다</>
              : <>전제를 점검한 결과 &rarr; 질문을 구체화합니다</>
            }
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-[var(--accent)] via-transparent to-transparent" />
        </div>

        {/* After: 재정의된 질문 */}
        <div className="rounded-xl bg-[var(--primary)] text-[var(--bg)] p-5 md:p-6 shadow-lg animate-crescendo">
          <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-white/40 mb-2">재정의된 질문</p>
          <p className="text-[17px] md:text-[19px] font-bold leading-snug" style={{ fontFamily: 'var(--font-display)' }}>{d.reframed_question}</p>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-[var(--ai)] rounded-lg px-4 py-3">
        <Lightbulb size={14} className="text-[var(--accent)] shrink-0 mt-0.5" />
        <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">
          <span className="font-bold">핵심:</span> {d.why_reframing_matters}
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   SECTION: 편곡
   ═══════════════════════════════════════ */

function OrchestrateSection() {
  const o = DEMO.orchestrate;
  const [steps, setSteps] = useState(o.steps.map(s => ({ ...s, actor: s.actor as 'ai' | 'human' | 'both' })));
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [decisions, setDecisions] = useState<Record<number, string>>({});

  const decidedCount = Object.keys(decisions).length;
  const totalDecisions = steps.filter(s => s.actor !== 'ai').length;

  // Sync to shared state for later sections
  useEffect(() => {
    demoUserChoices.actors = Object.fromEntries(steps.map((s, i) => [i, s.actor])) as Record<number, 'ai' | 'human' | 'both'>;
  }, [steps]);
  useEffect(() => { demoUserChoices.decisions = decisions; }, [decisions]);

  const ACTORS: Record<string, { label: string; color: string; text: string; Icon: typeof Bot }> = {
    ai: { label: 'AI', color: '#3b6dcc', text: '#2d4a7c', Icon: Bot },
    human: { label: '사람', color: '#b8860b', text: '#8b6914', Icon: Brain },
    both: { label: '협업', color: '#2d6b2d', text: '#2d6b2d', Icon: Handshake },
  };

  const extractOptions = (judgment?: string): string[] => {
    if (!judgment || !judgment.includes('/')) return [];
    const clauses = judgment.split(/[,.]\s*/);
    for (const clause of clauses) {
      if (!clause.includes('/')) continue;
      const opts = clause.split('/').map(o => {
        const words = o.trim().split(/\s+/);
        let result = '';
        for (const w of words) {
          if (['중', '등', '에서', '또는', '어떤'].includes(w)) break;
          if (result.length + w.length > 15) break;
          result += (result ? ' ' : '') + w;
        }
        return result;
      }).filter(o => o.length >= 1);
      if (opts.length >= 2) return opts;
    }
    return [];
  };

  const handleActorChange = (index: number, newActor: 'ai' | 'human' | 'both') => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, actor: newActor } : s));
  };

  const total = steps.length || 1;
  const counts = { ai: 0, human: 0, both: 0 };
  steps.forEach(s => { counts[s.actor] = (counts[s.actor] || 0) + 1; });
  const humanPct = Math.round(((counts.human + counts.both) / total) * 100);
  const checkpointCount = steps.filter(s => s.checkpoint).length;

  return (
    <div className="space-y-5 phrase-entrance">
      <div>
        <div className="flex items-center gap-2 text-[12px] text-[#8b6914] font-semibold tracking-wider uppercase mb-2">
          <Map size={14} /> 2악장 &middot; 편곡
        </div>
        <h2 className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          실행을 설계하다
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mt-2 leading-relaxed">
          AI와 사람이 각각 무엇을 맡을지 정하고, <strong className="text-[var(--text-primary)]">역할 배지를 클릭해서 바꿔보세요.</strong>
        </p>
      </div>

      {/* Context chain */}
      <div className="flex items-start gap-2.5 bg-[var(--checkpoint)] rounded-xl px-4 py-3">
        <Link2 size={14} className="text-amber-700 shrink-0 mt-1" />
        <div className="text-[12px] text-amber-800">
          <span className="font-bold">맥락 체인</span> &mdash; 악보 해석에서 발견한 <strong>점검이 필요한 전제 3건</strong>이 이 설계의 출발점입니다.
        </div>
      </div>

      {/* Governing idea */}
      <div className="rounded-xl bg-[var(--primary)] text-[var(--bg)] px-5 py-5 shadow-md">
        <p className="text-[11px] font-medium text-white/50 mb-1.5">핵심 방향</p>
        <p className="text-[16px] font-bold leading-snug" style={{ fontFamily: 'var(--font-display)' }}>{o.governing_idea}</p>
      </div>

      {/* Storyline — situation → complication → resolution */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 space-y-2">
        <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--text-tertiary)] mb-1">스토리라인</p>
        <div className="text-[13px] leading-relaxed space-y-1.5">
          <p><span className="font-semibold text-[var(--text-primary)]">상황:</span> <span className="text-[var(--text-secondary)]">{o.storyline.situation}</span></p>
          <p><span className="font-semibold text-[var(--risk-critical)]">문제:</span> <span className="text-[var(--text-secondary)]">{o.storyline.complication}</span></p>
          <p><span className="font-semibold text-[var(--accent)]">해결:</span> <span className="text-[var(--text-secondary)]">{o.storyline.resolution}</span></p>
        </div>
      </div>

      {/* Role distribution dashboard */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
        <div className="flex h-6 rounded-lg overflow-hidden mb-3 text-[11px] font-bold text-white">
          {counts.ai > 0 && (
            <div className="transition-all duration-500 flex items-center justify-center gap-1" style={{ width: `${(counts.ai / total) * 100}%`, backgroundColor: ACTORS.ai.color }}>
              AI {counts.ai}
            </div>
          )}
          {counts.both > 0 && (
            <div className="transition-all duration-500 flex items-center justify-center gap-1" style={{ width: `${(counts.both / total) * 100}%`, backgroundColor: ACTORS.both.color }}>
              협업 {counts.both}
            </div>
          )}
          {counts.human > 0 && (
            <div className="transition-all duration-500 flex items-center justify-center gap-1" style={{ width: `${(counts.human / total) * 100}%`, backgroundColor: ACTORS.human.color }}>
              사람 {counts.human}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
          <span className="text-[var(--text-primary)] font-semibold">사람 개입 {humanPct}%</span>
          <span className="text-[var(--text-tertiary)]">|</span>
          <span className="text-amber-700 font-semibold"><Flag size={10} className="inline mr-0.5" />체크포인트 {checkpointCount}</span>
        </div>
      </div>

      {/* Decision progress */}
      {decidedCount > 0 && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-[12px] font-semibold text-[var(--accent)]">{decidedCount}/{totalDecisions} 결정 완료</span>
          <div className="flex-1 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--accent)] rounded-full transition-all duration-300" style={{ width: `${(decidedCount / totalDecisions) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Lane headers */}
      <div className="hidden md:grid grid-cols-2 gap-0">
        <div className="flex items-center justify-center gap-2 py-2 rounded-l-lg" style={{ backgroundColor: `${ACTORS.ai.color}08` }}>
          <Bot size={16} style={{ color: ACTORS.ai.text }} />
          <span className="text-[15px] font-bold" style={{ color: ACTORS.ai.text }}>AI 실행</span>
        </div>
        <div className="flex items-center justify-center gap-2 py-2 rounded-r-lg" style={{ backgroundColor: `${ACTORS.human.color}08` }}>
          <Brain size={16} style={{ color: ACTORS.human.text }} />
          <span className="text-[15px] font-bold" style={{ color: ACTORS.human.text }}>사람 판단</span>
        </div>
      </div>

      {/* Workflow steps */}
      <div className="relative">
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-[var(--border-subtle)] -translate-x-1/2" />
        <div className="space-y-3">
          {steps.map((s, i) => {
            const a = ACTORS[s.actor] || ACTORS.ai;
            const isExpanded = expandedStep === i;
            const options = extractOptions(s.judgment);
            const hasDecision = s.actor !== 'ai';
            const decided = decisions[i];
            const laneClass = s.actor === 'ai' ? 'md:mr-[52%]' : s.actor === 'human' ? 'md:ml-[52%]' : '';

            return (
              <div key={i} className={`relative ${laneClass}`}>
                <div
                  className={`rounded-xl overflow-hidden transition-all cursor-pointer bg-[var(--surface)] ${
                    isExpanded ? 'shadow-md border border-[var(--border)]' : 'border border-[var(--border-subtle)] hover:border-[var(--border)]'
                  }`}
                  style={{ borderLeft: `3px solid ${a.color}` }}
                  onClick={() => setExpandedStep(isExpanded ? null : i)}
                >
                  {s.checkpoint && (
                    <div className="flex items-center gap-2 px-4 py-2" style={{ backgroundColor: '#fffbf0', borderBottom: '1px solid #f0e6c8' }}>
                      <Flag size={12} className="text-amber-600 shrink-0 animate-subtle-pulse" />
                      <span className="text-[11px] font-semibold text-amber-700">체크포인트</span>
                      <span className="text-[12px] text-amber-600/80">&mdash; {s.checkpoint_reason}</span>
                    </div>
                  )}
                  <div className="px-4 py-3 bg-[var(--surface)]">
                    <div className="flex items-start gap-2.5">
                      <div className="shrink-0 flex flex-col items-center gap-0.5">
                        <span className="text-[18px] font-bold tabular-nums leading-none select-none" style={{ color: `${a.color}30` }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="mb-1.5">
                          <div className="inline-flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)]/80 p-0.5">
                            {(['ai', 'both', 'human'] as const).map((actor) => {
                              const ac = ACTORS[actor];
                              const active = s.actor === actor;
                              const ACIcon = ac.Icon;
                              return (
                                <button
                                  key={actor}
                                  onClick={(e) => { e.stopPropagation(); handleActorChange(i, actor); }}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all duration-200 cursor-pointer active:scale-[0.95] ${
                                    active ? 'shadow-sm' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                                  }`}
                                  style={active ? { backgroundColor: ac.color, color: '#fff' } : {}}
                                >
                                  <ACIcon size={11} />
                                  {ac.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <p className="text-[13px] font-semibold text-[var(--text-primary)] leading-snug">{s.task}</p>
                        <p className="text-[12px] text-[var(--text-secondary)] mt-1">{s.expected_output}</p>
                        {!isExpanded && decided && (
                          <p className="text-[11px] text-[#8b6914] mt-1.5 font-medium truncate">결정: {decided}</p>
                        )}
                        {!isExpanded && hasDecision && !decided && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full mt-1.5">결정 필요</span>
                        )}
                      </div>
                      <span className="text-[11px] text-[var(--text-tertiary)] shrink-0">{s.estimated_time}</span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 animate-fade-in bg-[var(--surface)]">
                      <div className="ml-0 sm:ml-[30px] pt-3 border-t border-[var(--border-subtle)] space-y-3">
                        {(s.actor === 'ai' || s.actor === 'both') && s.user_ai_guide && (
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider block mb-1" style={{ color: ACTORS.ai.text }}>
                              <Bot size={10} className="inline mr-1" style={{ verticalAlign: '-1px' }} />AI 실행 가이드
                            </span>
                            <p className="text-[12px] text-[var(--text-primary)] leading-relaxed bg-[var(--bg)] rounded-md px-3 py-2 border border-[var(--border-subtle)]">{s.user_ai_guide}</p>
                          </div>
                        )}
                        {hasDecision && s.judgment && (
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: ACTORS.human.text }}>
                              <Brain size={10} className="inline mr-1" style={{ verticalAlign: '-1px' }} />당신의 판단
                            </span>
                            <p className="text-[12px] text-[var(--text-primary)] mb-2.5 leading-relaxed bg-[var(--bg)] rounded-md px-3 py-2 border border-[var(--border-subtle)]">{s.judgment}</p>
                            {options.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {options.map((opt, j) => (
                                  <button
                                    key={j}
                                    onClick={(e) => { e.stopPropagation(); setDecisions(prev => ({ ...prev, [i]: opt })); }}
                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border-2 cursor-pointer transition-all ${
                                      decided === opt
                                        ? 'border-[#8b6914] bg-[var(--human)] text-[#8b6914] shadow-sm'
                                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[#8b6914] hover:text-[#8b6914] hover:bg-amber-50/50'
                                    }`}
                                  >{opt}</button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-start gap-3 bg-[var(--ai)] rounded-xl px-4 py-3">
        <Lightbulb size={16} className="text-[var(--accent)] shrink-0 mt-0.5" />
        <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">
          <span className="font-bold">핵심:</span> 역할 배지를 클릭하면 AI/협업/사람을 전환할 수 있습니다. 비율 바가 실시간으로 바뀌는 것을 확인하세요.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   SECTION: 리허설 (auto-persona extraction + reactive feedback)
   ═══════════════════════════════════════ */

function PersonaSection() {
  const p = DEMO.persona;
  const f = p.feedback;
  const [phase, setPhase] = useState<'extracting' | 'revealed'>('extracting');
  const [extractStep, setExtractStep] = useState(0);

  const evals = demoUserChoices.evals;
  const actors = demoUserChoices.actors;
  const decisions = demoUserChoices.decisions;

  const doubtCount = Object.values(evals).filter(v => v === 'doubtful').length;
  const uncertainCount = Object.values(evals).filter(v => v === 'uncertain').length;
  const questionedCount = doubtCount + uncertainCount;
  const allConfirmed = Object.values(evals).length > 0 && Object.values(evals).every(v => v === 'likely_true');

  const currentActors = DEMO.orchestrate.steps.map((s, i) => actors[i] || s.actor as string);
  const aiOnlyCount = currentActors.filter(a => a === 'ai').length;
  const humanInvolved = currentActors.filter(a => a === 'human' || a === 'both').length;
  const reportActor = currentActors[3]; // "결과 기반 의사결정 문서"
  const pilotSelectActor = currentActors[1]; // "파일럿 대상 업무 선정"

  useEffect(() => {
    if (phase !== 'extracting') return;
    const timers = [
      setTimeout(() => setExtractStep(1), 500),
      setTimeout(() => setExtractStep(2), 1200),
      setTimeout(() => setExtractStep(3), 2000),
      setTimeout(() => { setExtractStep(4); setTimeout(() => setPhase('revealed'), 500); }, 2800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  // Dynamic overall reaction
  const overallReaction = (() => {
    if (aiOnlyCount >= 3) return '이거 AI한테 다 맡기면 누가 책임져? 파일럿 결과가 안 좋으면 "사람이 안 봐서 그렇다"고 할 건데?';
    if (allConfirmed) return '팀장, 전제를 다 맞다고 놓은 건 좀 걱정되는데. 팀원들이 정말 AI를 배울 의지가 있어?';
    return f.overall_reaction;
  })();

  // Dynamic observations
  const observations: { choice: string; reaction: string }[] = [];
  const aiEval = evals[0]; // "AI를 도입하면 효율이 올라간다"
  const teamEval = evals[1]; // "팀원들이 배우고 적극 사용할 것"
  const benchEval = evals[2]; // "경쟁사가 성공했으니 우리도"

  if (aiEval === 'likely_true') {
    observations.push({ choice: '"AI 도입 = 효율 향상" — 확인', reaction: '정말? 도입만 한다고 올라가? 작년에 새 ERP 들여놨는데 사용률 20%였잖아. 어떤 업무에 쓸 건지 구체적으로 나와야지.' });
  } else if (aiEval === 'doubtful') {
    observations.push({ choice: '"AI 도입 = 효율 향상" — 의심', reaction: '맞아. 도구부터 들여놓으면 안 돼. 어떤 업무가 AI에 적합한지 먼저 골라야지. 그걸 안 하면 "도입했는데 안 쓴다"가 반복돼.' });
  }
  if (teamEval === 'likely_true') {
    observations.push({ choice: '"팀원들이 적극 사용할 것" — 확인', reaction: '낙관적이네. 작년에 새 툴 교육했을 때 한 달 뒤에 쓰는 사람이 몇 명이었는지 기억나? 얼리 어답터 2-3명부터 키워.' });
  }
  if (benchEval === 'likely_true') {
    observations.push({ choice: '"경쟁사가 됐으니 우리도" — 확인', reaction: '경쟁사 뉴스만 보고 따라가면 안 돼. 그쪽은 데이터팀이 20명이야. 우리랑 조건이 달라.' });
  }
  if (reportActor === 'ai') {
    observations.push({ choice: '"대표 보고 문서" — AI 단독', reaction: '대표한테 올라가는 문서를 AI가 쓴다고? 대표가 그거 알면 "이게 팀의 판단이야 AI 판단이야?"라고 물을 거야.' });
  }
  if (pilotSelectActor === 'ai') {
    observations.push({ choice: '"파일럿 대상 선정" — AI 단독', reaction: '파일럿 대상을 AI가 골라? 현장 감각 없이? 팀원들이 "왜 내 업무가 선정됐어?"라고 하면 뭐라고 해.' });
  }
  const recommendDecision = decisions[3];
  if (recommendDecision === '확대') {
    observations.push({ choice: '추천안 — 확대', reaction: '2주 파일럿에 바로 확대? 좀 급하지 않아? 최소 한 달은 돌려봐야 패턴이 보이는데.' });
  } else if (recommendDecision === '중단') {
    observations.push({ choice: '추천안 — 중단', reaction: '대표가 "하라"고 했는데 중단이라고? 용기는 있네. 근거가 확실하면 나도 밀어줄게.' });
  }
  const topObservations = observations.slice(0, 3);

  const bridgeText = topObservations.length > 0
    ? `당신의 선택 ${topObservations.length}건에 대해 김상무가 직접 반응합니다.`
    : '당신의 실행 설계를 김상무의 관점에서 사전 검증합니다.';

  if (phase === 'extracting') {
    return (
      <div className="space-y-6 phrase-entrance">
        <div>
          <div className="flex items-center gap-2 text-[12px] text-[#6b4c9a] font-semibold tracking-wider uppercase mb-2">
            <Users size={14} /> 3악장 &middot; 리허설
          </div>
          <h2 className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>이해관계자를 식별하고 있습니다</h2>
          <p className="text-[14px] text-[var(--text-secondary)] mt-2">악보 해석과 편곡에서 내린 당신의 선택을 분석합니다.</p>
        </div>
        <Card className="!py-6">
          <div className="space-y-4">
            {[
              { label: `악보 해석: 전제 ${questionedCount > 0 ? questionedCount + '건 의심/불확실' : '3건 평가 완료'}`, done: extractStep >= 1 },
              { label: `편곡: AI ${aiOnlyCount}건 / 사람 ${humanInvolved}건 배정`, done: extractStep >= 2 },
              { label: '이 과제의 핵심 이해관계자를 식별합니다...', done: extractStep >= 3 },
              { label: '핵심 이해관계자 1명 추출 완료', done: extractStep >= 4 },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-3 transition-all duration-500 ${extractStep >= i ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                {item.done ? (
                  <div className="w-6 h-6 rounded-full bg-[#6b4c9a] flex items-center justify-center shrink-0"><Check size={12} className="text-white" /></div>
                ) : extractStep >= i ? (
                  <div className="w-6 h-6 rounded-full border-2 border-[#6b4c9a] border-t-transparent animate-spin shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] shrink-0" />
                )}
                <span className={`text-[14px] ${item.done ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'}`}>{item.label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 phrase-entrance">
      <div>
        <div className="flex items-center gap-2 text-[12px] text-[#6b4c9a] font-semibold tracking-wider uppercase mb-2">
          <Users size={14} /> 3악장 &middot; 리허설
        </div>
        <h2 className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>보고 전에, 상무의 반응을 예측하다</h2>
      </div>

      <div className="flex items-start gap-2.5 bg-[#6b4c9a]/[0.06] border border-[#6b4c9a]/20 rounded-xl px-4 py-3">
        <Link2 size={14} className="text-[#6b4c9a] shrink-0 mt-1" />
        <p className="text-[13px] text-[#6b4c9a]"><span className="font-bold">맥락 연결</span> &mdash; {bridgeText}</p>
      </div>

      <Card>
        <div className="flex items-center gap-3 mb-1">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-[#6b4c9a] flex items-center justify-center text-white text-[18px] font-bold shrink-0">김</div>
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 border border-red-200">높음</span>
          </div>
          <div>
            <span className="text-[16px] font-bold text-[var(--text-primary)]">{p.name}</span>
            <span className="text-[13px] text-[var(--text-secondary)] ml-2">{p.role}</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {p.traits.map((t: string, i: number) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">{t}</span>
              ))}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-[var(--text-tertiary)] mt-2 mb-2">자동 추출 &mdash; 이 과제의 최종 보고 대상이자, 대표에게 직보하는 의사결정자</p>
        <div className="rounded-xl bg-[var(--ai)] px-4 py-3.5">
          <p className="text-[15px] font-medium text-[var(--text-primary)] leading-relaxed italic">&ldquo;{overallReaction}&rdquo;</p>
        </div>
      </Card>

      {topObservations.length > 0 && (
        <Card className="!border-l-4 !border-l-[#6b4c9a] space-y-3">
          <p className="text-[14px] font-bold text-[#6b4c9a]">당신의 선택에 대해</p>
          {topObservations.map((obs, i) => (
            <div key={i} className="rounded-lg bg-[#6b4c9a]/[0.04] border border-[#6b4c9a]/10 px-4 py-3">
              <p className="text-[11px] font-bold text-[#6b4c9a] mb-1.5">{obs.choice}</p>
              <p className="text-[13px] text-[var(--text-primary)] leading-relaxed italic">&ldquo;{obs.reaction}&rdquo;</p>
            </div>
          ))}
        </Card>
      )}

      <Card className="!border-l-4 !border-l-red-400 space-y-4">
        <p className="text-[14px] font-bold text-red-600">이 계획의 리스크</p>
        <div>
          <p className="text-[13px] font-bold text-red-500 mb-1.5">실패 시나리오</p>
          <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">{f.failure_scenario}</p>
        </div>
        <div className="space-y-3 pt-1">
          {f.classified_risks.map((risk, i) => {
            const tag = risk.category === 'critical'
              ? { label: '핵심 위협', cls: 'bg-red-100 text-red-700' }
              : risk.category === 'manageable'
              ? { label: '관리 가능', cls: 'bg-amber-100 text-amber-700' }
              : { label: '침묵의 리스크', cls: 'bg-purple-100 text-purple-700' };
            return (
              <div key={i} className={`rounded-lg px-3.5 py-3 ${risk.category === 'unspoken' ? 'bg-purple-50 border border-purple-200' : 'bg-[var(--bg)]'}`}>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mb-1.5 ${tag.cls}`}>{tag.label}</span>
                <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{risk.text}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="!border-l-4 !border-l-[var(--success)]">
        <p className="text-[14px] font-bold text-[var(--success)] mb-2.5">이것을 보여주면 OK</p>
        <ul className="space-y-2">
          {f.approval_conditions.map((c, i) => (
            <li key={i} className="text-[14px] text-[var(--text-primary)] flex items-start gap-2.5">
              <Check size={16} className="text-[var(--success)] shrink-0 mt-0.5" /> {c}
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex items-start gap-3 bg-[var(--ai)] rounded-xl px-4 py-3">
        <Lightbulb size={16} className="text-[var(--accent)] shrink-0 mt-0.5" />
        <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">
          <span className="font-bold">핵심:</span> 이 페르소나는 악보 해석과 편곡에서 당신이 내린 선택으로부터 <strong>자동 추출</strong>되었습니다. &ldquo;침묵의 리스크&rdquo;를 보세요 &mdash; 모두 알지만 아무도 꺼내지 않는 문제를 미리 파악합니다.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   SECTION: 합주 연습 (interactive loop)
   ═══════════════════════════════════════ */

function RefinementSection() {
  const reportActor = demoUserChoices.actors[3] || DEMO.orchestrate.steps[3].actor;
  const pilotSelectActor = demoUserChoices.actors[1] || DEMO.orchestrate.steps[1].actor;
  const aiEval = demoUserChoices.evals[0];

  const dynamicIssues = [...DEMO_ISSUES];
  const dynamicRevisions = DEMO_REVISIONS.map(r => ({ ...r, changes: [...r.changes] }));

  if (reportActor === 'ai') {
    dynamicIssues.push({ id: 10, text: '대표 보고 문서를 AI가 단독 작성 — 판단의 주체가 불분명', severity: 'critical' as const, source: '당신의 선택' });
    dynamicRevisions[0].changes.push({ issue: 'AI 단독 보고서', fix: 'Step 4를 AI→협업으로 변경. AI가 데이터 정리, 사람이 프레이밍·톤 최종 결정' });
  }
  if (pilotSelectActor === 'ai') {
    dynamicIssues.push({ id: 11, text: '파일럿 대상 선정을 AI만 수행 — 현장 감각 부재', severity: 'concern' as const, source: '당신의 선택' });
    dynamicRevisions[1].changes.push({ issue: 'AI 단독 선정', fix: 'AI가 후보 3개 추천 → 팀장이 현장 적합성 판단 후 최종 선정하는 2단계 프로세스' });
  }
  if (aiEval === 'likely_true') {
    dynamicIssues.push({ id: 12, text: '"AI = 효율 향상"을 검증 없이 전제로 사용', severity: 'concern' as const, source: '당신의 선택' });
  }

  const [loopPhase, setLoopPhase] = useState<'issues' | 'loading-1' | 'result-1' | 'loading-2' | 'result-2'>('issues');
  const [selectedIssues, setSelectedIssues] = useState<Set<number>>(new Set([0, 1]));

  useEffect(() => {
    if (loopPhase === 'loading-1') { const t = setTimeout(() => setLoopPhase('result-1'), 2000); return () => clearTimeout(t); }
    if (loopPhase === 'loading-2') { const t = setTimeout(() => setLoopPhase('result-2'), 2000); return () => clearTimeout(t); }
  }, [loopPhase]);

  const severityTag = (s: string) => s === 'critical' ? { text: '핵심 위협', cls: 'bg-red-100 text-red-700' } : { text: '승인 조건', cls: 'bg-amber-100 text-amber-700' };
  const rawScore = loopPhase === 'result-2' ? 92 : loopPhase === 'result-1' ? 78 : 0;
  const currentScore = useCountUp(rawScore);
  const isConverged = loopPhase === 'result-2';

  return (
    <div className="space-y-5 phrase-entrance">
      <div>
        <div className="flex items-center gap-2 text-[12px] text-[#2d6b2d] font-semibold tracking-wider uppercase mb-2">
          <RefreshCw size={14} /> 4악장 &middot; 합주 연습
        </div>
        <h2 className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] leading-tight" style={{ fontFamily: 'var(--font-display)' }}>피드백을 반영하고, 다시 검토받다</h2>
        <p className="text-[14px] text-[var(--text-secondary)] mt-2 leading-relaxed">
          리허설에서 받은 피드백 중 반영할 이슈를 선택하고, <strong className="text-[var(--text-primary)]">직접 합주를 돌려보세요.</strong>
        </p>
      </div>

      <div className="flex items-start gap-2.5 bg-[var(--checkpoint)] rounded-xl px-4 py-3">
        <Link2 size={14} className="text-amber-700 shrink-0 mt-1" />
        <div className="text-[13px] text-amber-800">
          <span className="font-bold">맥락 체인</span> &mdash; 리허설에서 발견된 <strong className="text-red-700">핵심 위협 {dynamicIssues.filter(i => i.severity === 'critical').length}건</strong>, 기타 {dynamicIssues.filter(i => i.severity === 'concern').length}건{dynamicIssues.length > 4 ? <> + <strong className="text-[#6b4c9a]">당신의 선택에서 {dynamicIssues.length - 4}건</strong></> : ''}이 이 합주의 출발점입니다.
        </div>
      </div>

      {currentScore > 0 && (
        <div className="rounded-2xl overflow-hidden border border-[#2d6b2d]/20 animate-fade-in">
          <div className={`px-5 py-4 flex items-center justify-between ${isConverged ? 'bg-[#2d6b2d] text-white' : 'bg-[#2d6b2d]/[0.06]'}`}>
            <div>
              <p className={`text-[11px] font-medium mb-0.5 ${isConverged ? 'text-white/60' : 'text-[var(--text-tertiary)]'}`}>수렴도</p>
              <p className={`text-[32px] font-extrabold leading-none ${isConverged ? '' : 'text-[#2d6b2d]'}`}>{currentScore}%</p>
            </div>
            <div className="text-right">
              {isConverged ? (
                <div className="flex items-center gap-2"><Check size={18} /><span className="text-[14px] font-bold">수렴 완료</span></div>
              ) : (
                <><p className="text-[11px] text-[var(--text-tertiary)]">1차 반복</p><p className="text-[14px] font-bold text-[#2d6b2d]">2/{dynamicIssues.length}건 해결</p></>
              )}
            </div>
          </div>
          {!isConverged && <div className="h-2 bg-[var(--border)]"><div className="h-full bg-[#2d6b2d] transition-all duration-1000 rounded-r" style={{ width: `${currentScore}%` }} /></div>}
        </div>
      )}

      {loopPhase === 'issues' && (
        <div className="space-y-3 animate-fade-in">
          <p className="text-[14px] font-bold text-[var(--text-primary)]">김상무 피드백에서 추출된 이슈</p>
          <p className="text-[13px] text-[var(--text-secondary)]">반영할 이슈를 선택하세요. 핵심 위협은 반드시 해결해야 합니다.</p>
          <div className="space-y-2">
            {dynamicIssues.map((issue) => {
              const sev = severityTag(issue.severity);
              const checked = selectedIssues.has(issue.id);
              const isCritical = issue.severity === 'critical';
              return (
                <div key={issue.id} role="checkbox" aria-checked={checked} aria-disabled={isCritical} onClick={() => { if (isCritical) return; setSelectedIssues(prev => { const next = new Set(prev); next.has(issue.id) ? next.delete(issue.id) : next.add(issue.id); return next; }); }}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-all ${checked ? 'border-[#2d6b2d] bg-[#2d6b2d]/[0.03]' : 'border-[var(--border-subtle)] hover:border-[var(--border)]'} ${isCritical ? '' : 'cursor-pointer'}`}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${checked ? 'border-[#2d6b2d] bg-[#2d6b2d]' : 'border-[var(--border)]'}`}>
                    {checked && <Check size={12} className="text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${sev.cls}`}>{sev.text}</span>
                      {isCritical && <span className="text-[10px] text-red-500 font-medium">필수</span>}
                      {issue.source === '당신의 선택' && <span className="text-[10px] text-[#6b4c9a] font-medium">당신의 선택</span>}
                    </div>
                    <p className="text-[13px] text-[var(--text-primary)] leading-snug">{issue.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={() => setLoopPhase('loading-1')} disabled={selectedIssues.size === 0}
            className="w-full mt-4 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#2d6b2d] text-white text-[14px] font-bold hover:bg-[#245524] transition-colors disabled:opacity-40 cursor-pointer">
            {selectedIssues.size}건 선택 &mdash; 합주 시작 <ArrowRight size={14} />
          </button>
        </div>
      )}

      {(loopPhase === 'loading-1' || loopPhase === 'loading-2') && (
        <Card className="text-center !py-10 animate-fade-in">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#2d6b2d] border-t-transparent animate-spin" />
            <p className="text-[14px] font-semibold text-[var(--text-primary)]">{loopPhase === 'loading-1' ? '선택한 이슈를 반영하여 수정 중...' : '나머지 이슈를 반영하여 수정 중...'}</p>
            <p className="text-[12px] text-[var(--text-secondary)]">같은 이해관계자가 수정본을 다시 검토합니다</p>
          </div>
        </Card>
      )}

      {(loopPhase === 'result-1' || loopPhase === 'result-2') && (
        <div className="space-y-4 animate-fade-in">
          {dynamicRevisions.slice(0, loopPhase === 'result-2' ? 2 : 1).map((rev, idx) => (
            <div key={idx} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${idx === 1 && isConverged ? 'bg-[#2d6b2d] text-white' : 'bg-[var(--surface)] border-2 border-[var(--border)] text-[var(--text-secondary)]'}`}>{idx + 1}</div>
                <span className="text-[15px] font-bold text-[var(--text-primary)]">{idx + 1}차 수정</span>
                <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-[#2d6b2d]/10 text-[#2d6b2d]'}`}>&rarr; {rev.score}%</span>
              </div>
              <div className="ml-11 space-y-2">
                {rev.changes.map((c, ci) => (
                  <div key={ci} className="rounded-lg bg-[#2d6b2d]/[0.04] border border-[#2d6b2d]/10 px-3.5 py-2.5">
                    <p className="text-[11px] font-bold text-[#2d6b2d] mb-1">{c.issue}</p>
                    <p className="text-[13px] text-[var(--text-primary)] leading-snug">{c.fix}</p>
                  </div>
                ))}
                <div className="rounded-xl bg-[var(--ai)] px-4 py-3 mt-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-full bg-[#6b4c9a] flex items-center justify-center text-white text-[10px] font-bold">김</div>
                    <span className="text-[12px] font-bold text-[var(--text-primary)]">김상무 재검토</span>
                  </div>
                  <p className="text-[13px] text-[var(--text-primary)] leading-relaxed italic">&ldquo;{rev.reReview}&rdquo;</p>
                </div>
              </div>
            </div>
          ))}
          {loopPhase === 'result-1' && (
            <button onClick={() => setLoopPhase('loading-2')}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#2d6b2d] text-white text-[14px] font-bold hover:bg-[#245524] transition-colors cursor-pointer">
              나머지 이슈 반영 &mdash; 2차 합주 계속 <ArrowRight size={14} />
            </button>
          )}
          {isConverged && (
            <div className="rounded-xl border-2 border-[#2d6b2d] bg-[#2d6b2d]/[0.04] px-5 py-4 text-center animate-fade-in">
              <p className="text-[20px] font-extrabold text-[#2d6b2d] mb-1" style={{ fontFamily: 'var(--font-display)' }}>수렴 완료</p>
              <p className="text-[13px] text-[var(--text-secondary)]">핵심 위협 0건 / 승인 조건 충족 &mdash; 2회 반복으로 92%에 도달했습니다</p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-start gap-3 rounded-xl px-5 py-4 border border-[#2d6b2d]/20 bg-[#2d6b2d]/[0.03]">
        <Lightbulb size={18} className="text-[#2d6b2d] shrink-0 mt-0.5" />
        <div>
          <p className="text-[14px] font-bold text-[var(--text-primary)] mb-1">핵심: 반복이 아니라 맥락 누적</p>
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
            1차에서 반영한 수정이 2차의 제약조건이 됩니다. 같은 문서를 단순히 고치는 게 아니라, <strong className="text-[var(--text-primary)]">맥락이 쌓이면서 판단이 정교해지는 것</strong>이 합주 연습의 진짜 목적입니다.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   SECTION: 결과 (journey summary + CTA)
   ═══════════════════════════════════════ */

function OutroSection() {
  const evals = demoUserChoices.evals;
  const actors = demoUserChoices.actors;
  const decisions = demoUserChoices.decisions;

  const doubtCount = Object.values(evals).filter(v => v === 'doubtful').length;
  const uncertainCount = Object.values(evals).filter(v => v === 'uncertain').length;
  const actorChanges = DEMO.orchestrate.steps.filter((s, i) => actors[i] && actors[i] !== s.actor).length;
  const decisionCount = Object.keys(decisions).length;

  const journeyStats = [
    { value: `${doubtCount + uncertainCount}`, label: '전제를 직접 판단', show: doubtCount + uncertainCount > 0 },
    { value: `${actorChanges}`, label: 'AI/사람 역할 변경', show: actorChanges > 0 },
    { value: `${decisionCount}`, label: '판단을 직접 결정', show: decisionCount > 0 },
    { value: '1', label: '이해관계자 자동 추출', show: true },
    { value: '2', label: '합주로 92% 수렴', show: true },
  ].filter(s => s.show);

  const outputs = [
    { icon: FileText, name: '프로젝트 브리프', desc: '전체 맥락을 담은 의사결정 문서' },
    { icon: Code, name: '프롬프트 체인', desc: 'AI에게 바로 시킬 수 있는 단계별 프롬프트' },
    { icon: ClipboardList, name: '에이전트 스펙', desc: 'LangGraph/CrewAI용 워크플로우 정의' },
    { icon: ListChecks, name: '실행 체크리스트', desc: '현장에서 쓸 수 있는 할 일 목록' },
  ];

  return (
    <div className="space-y-6 phrase-entrance">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 text-[12px] text-[var(--success)] font-semibold tracking-wider uppercase mb-3">
          <Sparkles size={14} /> 공연 준비 완료
        </div>
        <h2 className="text-[28px] md:text-[36px] font-bold text-[var(--text-primary)] leading-tight tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          2번의 합주, 92% 수렴.
          <br /><span className="text-[var(--text-secondary)]">이제 무대에 올립니다.</span>
        </h2>
      </div>

      {journeyStats.length > 0 && (
        <Card className="!bg-[var(--surface)]">
          <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--text-tertiary)] mb-3">방금 당신이 한 일</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {journeyStats.map((stat, i) => (
              <div key={i} className="text-center py-2">
                <p className="text-[22px] font-extrabold text-[var(--accent)]">{stat.value}</p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <p className="text-[15px] text-[var(--text-secondary)] text-center leading-relaxed max-w-md mx-auto">
        4단계를 거치며 누적된 맥락이 4가지 형태의 산출물로 정리됩니다.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {outputs.map((o) => {
          const Icon = o.icon;
          return (
            <Card key={o.name} hoverable className="!p-5">
              <Icon size={20} className="text-[var(--accent)] mb-3" />
              <h3 className="text-[14px] font-bold text-[var(--text-primary)]">{o.name}</h3>
              <p className="text-[12px] text-[var(--text-secondary)] mt-1">{o.desc}</p>
            </Card>
          );
        })}
      </div>

      <Card variant="ai" className="text-center !py-8">
        <p className="text-[15px] text-[var(--text-primary)] leading-relaxed mb-1">
          이 모든 과정을 <strong>당신의 진짜 과제</strong>로 해보세요.
        </p>
        <p className="text-[13px] text-[var(--text-secondary)] mb-5">
          당신의 과제로, 당신의 이해관계자로, 당신의 판단으로.
        </p>
        <Link href="/workspace">
          <Button>
            워크스페이스에서 시작하기 <ArrowRight size={14} />
          </Button>
        </Link>
        <p className="text-[11px] text-[var(--text-tertiary)] mt-3">
          로그인 없이 3회 무료 체험 가능
        </p>
      </Card>
    </div>
  );
}

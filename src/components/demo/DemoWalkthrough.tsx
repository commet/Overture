'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import {
  Play, Layers, Map, Users, RefreshCw, Sparkles,
  Check, ArrowRight, ArrowLeft,
  Lightbulb, Link2, Bot, Brain, Flag,
  FileText, ListChecks, Code, ClipboardList,
  TrendingUp,
} from 'lucide-react';

/* ═══════════════════════════════════════
   DEMO DATA
   ═══════════════════════════════════════ */

const DEMO = {
  project: {
    name: '넥스트라 계약 위기 대응',
    scenario: '매출 40%를 차지하는 최대 고객사 넥스트라이 갑자기 "다음 분기 계약을 재검토하겠다"고 통보했다.',
    directive: '대표 지시: "2주 안에 대응 방안 만들어라."',
  },

  decompose: {
    surface_task: '넥스트라 계약 유지를 위한 대응 방안을 2주 안에 수립',
    hidden_assumptions: [
      { assumption: '넥스트라을 반드시 유지해야 한다', risk_if_false: '한솔이 적자 계약이라면 유지할수록 손해. 매출 의존도 40%가 오히려 구조적 리스크' },
      { assumption: '이탈 사유가 우리의 서비스 품질 때문이다', risk_if_false: '실은 한솔 내부 구조조정이나 경쟁사의 공격적 제안 때문일 수 있음. 원인 오진 시 엉뚱한 대응' },
      { assumption: '가격 양보나 추가 서비스로 잡을 수 있다', risk_if_false: '이미 적자인 계약에서 추가 양보는 손실 확대. 선례가 되면 다른 고객도 같은 요구' },
    ],
    reframed_question: '넥스트라 의존도 40%라는 구조적 리스크를 해소하면서, 이 위기를 포트폴리오 다각화의 전환점으로 만들 수 있는가?',
    why_reframing_matters: "'어떻게 잡을까'가 아니라 '잡아야 하는가, 어떤 조건에서 잡아야 하는가'로 바꾸면 대표에게 Go/No-Go 의사결정 근거를 제공할 수 있습니다.",
    reasoning_narrative: '처음에는 "한솔을 지켜야 한다"가 과제였지만, 매출 의존도 40% 자체가 문제의 원인이었다. 한솔 커스텀에 끌려다니느라 다른 고객 50곳의 요구가 1년째 밀리고 있었다.',
    hidden_questions: [
      { question: '한솔 계약의 실제 수익성(순이익 기여도)은 얼마이며, 이탈 시 재무 영향의 실체는?', reasoning: '매출 40%가 이익 40%는 아닐 수 있다. 숫자를 보면 판단이 달라진다' },
      { question: '한솔 의존도를 줄이면서 동시에 관계를 유지하는 조건부 전략이 가능한가?', reasoning: '올인 아니면 포기가 아닌 제3의 선택지를 설계할 수 있다' },
      { question: '한솔이 빠진 자리를 메울 수 있는 파이프라인은 현실적으로 존재하는가?', reasoning: '대안이 있어야 놓을 수 있는 카드가 된다' },
    ],
  },

  orchestrate: {
    governing_idea: '감정적 "무조건 유지"가 아니라, 수익성 팩트에 기반한 3가지 시나리오를 만들어 대표가 선택할 수 있게 한다',
    storyline: {
      situation: '넥스트라은 3년간 최대 고객이었고, 매출의 40%를 차지한다. 갑작스러운 계약 재검토 통보에 사내가 패닉 상태다.',
      complication: '그러나 한솔 계약은 커스텀 요구가 과중하여 실제 마진이 낮고, 제품 로드맵이 1년째 밀리고 있다. "무조건 잡아라"가 최선인지 불확실하다.',
      resolution: '먼저 한솔 계약의 실제 수익성을 밝히고, 3가지 시나리오별 재무 영향을 비교한 뒤, 대표가 데이터로 판단하게 한다.',
    },
    steps: [
      { task: '한솔 계약 수익성 정밀 분석', actor: 'both' as const, expected_output: '실수익률 보고서 + 기회비용 산출', checkpoint: true, checkpoint_reason: '이 숫자가 이후 모든 시나리오의 기반', estimated_time: '2일' },
      { task: '한솔 이탈 사유 파악 (내부 소스 + 경쟁사 동향)', actor: 'human' as const, expected_output: '이탈 사유 인텔리전스 보고서', checkpoint: false, estimated_time: '3일' },
      { task: '3가지 시나리오 재무 모델링', actor: 'ai' as const, expected_output: '시나리오별 12개월 P&L 시뮬레이션', checkpoint: false, estimated_time: '4시간' },
      { task: '대체 매출 파이프라인 현실성 평가', actor: 'both' as const, expected_output: '전환 가능 고객 리스트 + 시점 매트릭스', checkpoint: true, checkpoint_reason: "'놓을 수 있는 카드'인지 여기서 결정", estimated_time: '2일' },
      { task: '대표 보고용 의사결정 문서 작성', actor: 'human' as const, expected_output: '시나리오 비교표 + 추천안 (10p)', checkpoint: true, checkpoint_reason: '최종 보고 전 프레이밍 검수', estimated_time: '1일' },
    ],
    key_assumptions: [
      { assumption: '재무팀이 한솔 계약의 정밀 원가 데이터를 제공할 수 있다', importance: 'high' as const, if_wrong: '수익성 분석 신뢰도가 떨어져 시나리오 비교 불가' },
      { assumption: '한솔의 해지 검토가 협상 전술이지 확정은 아니다', importance: 'high' as const, if_wrong: '이미 경쟁사와 계약 서명 단계라면 유지 시나리오 자체가 무의미' },
      { assumption: '다른 고객사에게 한솔 이탈 소식이 퍼지지 않았다', importance: 'medium' as const, if_wrong: '연쇄 이탈 리스크 발생. 위기 커뮤니케이션이 별도 필요' },
    ],
  },

  persona: {
    name: '박정수 대표',
    role: 'CEO / 대표이사',
    traits: ['매출 중심 사고', '관계 중시', '리스크 회피'],
    feedback: {
      overall_reaction: '시나리오 3개를 보여주는 건 좋아. 근데 "전략적 이별" 시나리오까지 넣을 거면, 내가 한솔 김 사장한테 전화해서 뭐라고 말해야 하는지까지 나와야 해.',
      failure_scenario: '수익성 분석에서 한솔이 적자라는 게 나오는데, 이 정보가 한솔 측에 새어나감. "너네가 우리를 버리려 했다"는 인식이 생기면서 관계 완전 파탄.',
      classified_risks: [
        { text: '한솔이 이미 경쟁사와 MOU를 맺은 상태라면, 우리의 유지 시나리오는 시간 낭비다. 72시간 내에 한솔 내부 상황을 파악하지 못하면 모든 대응이 늦다.', category: 'critical' as const },
        { text: '한솔 이탈 소식이 다른 고객에게 퍼질 수 있다는 우려. 하지만 상위 10개 고객 중 한솔과 직접 경쟁하는 곳은 없어서 사전 커뮤니케이션으로 통제 가능.', category: 'manageable' as const },
        { text: '솔직히 한솔 계약은 내가 3년 전에 김 사장 골프장에서 따온 건데... 팀에서 "적자 계약"이라는 걸 1년 전부터 알고 있었으면서 아무도 나한테 보고를 안 했어. 그게 더 문제야.', category: 'unspoken' as const },
      ],
      approval_conditions: ['한솔 실수익률 데이터가 재무팀 검증을 거칠 것', '"조건부 축소" 시나리오에 한솔이 수용 가능한 구체적 조건 3개를 포함할 것'],
    },
  },

  convergence: {
    iterations: [
      { number: 1, score: 0.45, resolved: 2, unresolved: 3, total: 5, summary: '초기 분석 완료. 한솔 수익성 데이터 미확보, 한솔 측 내부 상황 미파악.' },
      { number: 2, score: 0.78, resolved: 4, unresolved: 1, total: 5, summary: '재무팀 원가 데이터 확보 (한솔 마진 -8% 확인). 경쟁사 MOU 미체결 확인. 용어 변경: "전략적 이별" → "포트폴리오 재구성".' },
      { number: 3, score: 0.92, resolved: 5, unresolved: 0, total: 5, summary: '대표가 한솔 김 사장과 사전 통화 — "조건부 축소"에 긍정 반응. 대체 파이프라인 3건 구체화. 모든 이해관계자 정렬.' },
    ],
  },
};

const STEPS = [
  { id: 'intro', label: '시작', icon: Play },
  { id: 'decompose', label: '악보 해석', icon: Layers },
  { id: 'orchestrate', label: '편곡', icon: Map },
  { id: 'persona', label: '리허설', icon: Users },
  { id: 'refinement', label: '합주 연습', icon: RefreshCw },
  { id: 'outro', label: '결과', icon: Sparkles },
];

const LOADING_MESSAGES: Record<number, string[]> = {
  1: ['과제의 전제를 점검하고 있습니다...', '숨겨진 질문을 찾고 있습니다...', '진짜 주제를 읽어내고 있습니다...'],
  2: ['워크플로우를 설계하고 있습니다...', '단계별 담당을 배정하고 있습니다...', '체크포인트를 배치하고 있습니다...'],
  3: ['이해관계자의 관점에서 검토하고 있습니다...', '리스크를 분류하고 있습니다...', '승인 조건을 정리하고 있습니다...'],
};

const NEXT_PREVIEWS: Record<number, { label: string; desc: string }> = {
  0: { label: '악보 해석', desc: '과제 뒤에 숨은 진짜 질문을 찾아냅니다' },
  1: { label: '편곡', desc: 'AI와 사람의 역할을 나눠 워크플로우를 설계합니다' },
  2: { label: '리허설', desc: '이해관계자의 반응을 시뮬레이션합니다' },
  3: { label: '합주 연습', desc: '피드백을 반영하여 수렴할 때까지 반복합니다' },
  4: { label: '결과', desc: '4가지 형태의 산출물로 정리합니다' },
};

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
  const [selectedQ, setSelectedQ] = useState(0);
  const [loading, setLoading] = useState(false);
  const visitedRef = useRef<Set<number>>(new Set([0]));
  const maxStep = STEPS.length - 1;

  const go = (target: number) => {
    const next = Math.max(0, Math.min(target, maxStep));
    setStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Loading simulation — only on first visit to analysis steps
  useEffect(() => {
    if (step >= 1 && step <= 3 && !visitedRef.current.has(step)) {
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
    <div className="max-w-3xl mx-auto">
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
                  active ? 'bg-[var(--accent)] text-white shadow-sm' :
                  done ? 'bg-[var(--accent)] text-white' :
                  'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)]'
                }`}>
                  {done ? <Check size={14} /> : <Icon size={14} />}
                </div>
                <span className={`text-[10px] font-semibold hidden md:block transition-colors ${active ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}>
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
            {step === 1 && <DecomposeSection selected={selectedQ} onSelect={setSelectedQ} />}
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
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-[12px] text-[var(--accent)] font-semibold tracking-wider uppercase mb-3">
          <Play size={14} /> Demo
        </div>
        <h2 className="text-[28px] md:text-[36px] font-extrabold text-[var(--text-primary)] leading-tight tracking-tight">
          5분 안에<br />Overture를 체험하세요
        </h2>
        <p className="text-[15px] text-[var(--text-secondary)] mt-3 leading-relaxed max-w-lg">
          실제 업무 시나리오를 4단계로 따라가 봅니다.<br />
          AI가 분석하고, 당신이 판단하는 과정을 경험하세요.
        </p>
      </div>

      <Card className="!border-2 !border-[var(--border)]">
        <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--text-tertiary)] mb-3">오늘의 과제</p>
        <p className="text-[18px] md:text-[20px] font-bold text-[var(--text-primary)] leading-snug">
          {DEMO.project.scenario}
        </p>
        <p className="text-[14px] text-[var(--accent)] font-semibold mt-3">
          {DEMO.project.directive}
        </p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="!bg-[var(--bg)]">
          <p className="text-[12px] font-bold text-[var(--text-secondary)] mb-2">보통이라면?</p>
          <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">
            바로 한솔 담당자에게 전화하고,<br />할인 제안서를 준비한다.
          </p>
        </Card>
        <Card className="!bg-[var(--ai)]">
          <p className="text-[12px] font-bold text-[#2d4a7c] mb-2">Overture라면?</p>
          <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">
            <strong>&ldquo;정말 잡아야 하는 고객인가?&rdquo;</strong><br />
            부터 묻습니다.
          </p>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   SECTION: 악보 해석
   ═══════════════════════════════════════ */

function DecomposeSection({ selected, onSelect }: { selected: number; onSelect: (i: number) => void }) {
  const d = DEMO.decompose;
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 text-[12px] text-[#2d4a7c] font-semibold tracking-wider uppercase mb-2">
          <Layers size={14} /> 1악장 &middot; 악보 해석
        </div>
        <h2 className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] leading-tight">
          진짜 질문을 찾아내다
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mt-2 leading-relaxed">
          &ldquo;한솔을 잡아야 한다&rdquo;는 과제 뒤에 검증되지 않은 전제 3개가 숨어 있었습니다.
        </p>
      </div>

      {/* Story Card */}
      <Card className="!p-0 overflow-hidden">
        <div className="px-5 pt-5 pb-4">
          <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[var(--text-secondary)] mb-1.5">받은 악보</p>
          <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">{d.surface_task}</p>
        </div>

        <div className="px-5 py-4 bg-amber-50/60 border-y border-amber-200/50">
          <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-amber-700 mb-1">숨겨진 불협화음</p>
          <p className="text-[12px] text-amber-600/80 mb-3">이 과제는 검증되지 않은 전제 위에 서 있습니다</p>
          <div className="space-y-2.5">
            {d.hidden_assumptions.map((a, i) => (
              <div key={i} className="pl-3 border-l-2 border-amber-400">
                <p className="text-[13px] text-[var(--text-primary)] font-medium leading-relaxed">&ldquo;{a.assumption}&rdquo;</p>
                <p className="text-[12px] text-amber-700 mt-0.5 leading-relaxed">거짓이면 &rarr; {a.risk_if_false}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 pt-4 pb-5">
          <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[var(--accent)] mb-2">이 곡의 진짜 주제</p>
          <p className="text-[17px] font-bold text-[var(--text-primary)] leading-snug">{d.reframed_question}</p>
          <p className="text-[13px] text-[var(--text-secondary)] mt-2.5 leading-relaxed">{d.why_reframing_matters}</p>
          <div className="mt-4 pt-3 border-t border-dashed border-[var(--border-subtle)]">
            <p className="text-[12px] text-[var(--text-secondary)] italic leading-relaxed">{d.reasoning_narrative}</p>
          </div>
        </div>
      </Card>

      {/* Question Selection */}
      <Card>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="checkpoint">판단 필요</Badge>
          <h3 className="text-[15px] font-bold text-[var(--text-primary)]">어떤 해석을 선택하시겠습니까?</h3>
        </div>
        <p className="text-[12px] text-[var(--text-secondary)] mb-4">선택한 방향이 편곡 단계의 출발점이 됩니다. 클릭해 보세요.</p>
        <div className="space-y-2">
          {d.hidden_questions.map((hq, i) => (
            <div
              key={i}
              onClick={() => onSelect(i)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selected === i
                  ? 'border-[var(--accent)] bg-[var(--ai)]'
                  : 'border-[var(--border-subtle)] hover:border-[var(--border)]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  selected === i ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--border)]'
                }`}>
                  {selected === i && <Check size={12} className="text-white" />}
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[var(--text-primary)]">{hq.question}</p>
                  <p className="text-[12px] text-[var(--text-secondary)] mt-1">택하면 &rarr; {hq.reasoning}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex items-start gap-3 bg-[var(--ai)] rounded-xl px-4 py-3">
        <Lightbulb size={16} className="text-[var(--accent)] shrink-0 mt-0.5" />
        <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">
          <span className="font-bold">핵심:</span> 대부분 &ldquo;한솔을 어떻게 잡을까&rdquo;부터 시작하지만, 전제가 거짓이면 보고서 전체가 무의미합니다. Overture는 실행 전에 이런 불협화음을 찾아냅니다.
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
  const steps = o.steps;
  const aiCount = steps.filter(s => s.actor === 'ai').length;
  const humanCount = steps.filter(s => s.actor === 'human').length;
  const bothCount = steps.filter(s => s.actor === 'both').length;
  const checkpoints = steps.filter(s => s.checkpoint).length;
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const actorConfig: Record<string, { label: string; color: string; text: string; bg: string }> = {
    ai: { label: 'AI 실행', color: '#3b6dcc', text: '#2d4a7c', bg: 'rgba(59,109,204,0.06)' },
    human: { label: '사람 판단', color: '#b8860b', text: '#8b6914', bg: 'rgba(184,134,11,0.06)' },
    both: { label: '협업', color: '#2d6b2d', text: '#2d6b2d', bg: 'rgba(45,107,45,0.06)' },
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 text-[12px] text-[#8b6914] font-semibold tracking-wider uppercase mb-2">
          <Map size={14} /> 2악장 &middot; 편곡
        </div>
        <h2 className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] leading-tight">
          실행을 설계하다
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mt-2 leading-relaxed">
          AI와 사람의 역할을 나누고, 체크포인트를 배치합니다.
        </p>
      </div>

      {/* Context chain */}
      <div className="flex items-start gap-2.5 bg-[var(--checkpoint)] rounded-xl px-4 py-3">
        <Link2 size={14} className="text-amber-700 shrink-0 mt-1" />
        <div className="text-[12px] text-amber-800">
          <span className="font-bold">맥락 체인</span> &mdash; 악보 해석에서 발견한 <strong>검증되지 않은 전제 3건</strong>이 이 설계의 출발점입니다.
        </div>
      </div>

      {/* Governing idea + storyline */}
      <Card className="!bg-[var(--ai)]">
        <div className="flex items-center gap-2 text-[12px] text-[#2d4a7c] font-semibold mb-2">
          <Bot size={14} /> 핵심 방향
        </div>
        <p className="text-[15px] font-bold text-[var(--text-primary)] mb-3">{o.governing_idea}</p>
        <div className="space-y-2 text-[13px] border-t border-[#2d4a7c]/10 pt-3">
          <div><span className="font-semibold text-[#2d4a7c]">상황:</span> <span className="text-[var(--text-primary)]">{o.storyline.situation}</span></div>
          <div><span className="font-semibold text-[#2d4a7c]">문제:</span> <span className="text-[var(--text-primary)]">{o.storyline.complication}</span></div>
          <div><span className="font-semibold text-[#2d4a7c]">접근:</span> <span className="text-[var(--text-primary)]">{o.storyline.resolution}</span></div>
        </div>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pb-3 border-b border-[var(--border-subtle)]">
        <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-widest font-semibold">범례</span>
        {Object.entries(actorConfig).map(([key, v]) => (
          <span key={key} className="flex items-center gap-1.5 text-[11px]" style={{ color: v.text }}>
            <span className="inline-block w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: v.color }} />
            <span className="font-medium">{v.label}</span>
          </span>
        ))}
        <span className="flex items-center gap-1 text-[11px] text-amber-700">
          <Flag size={10} />
          <span className="font-medium">체크포인트</span>
        </span>
      </div>

      {/* Workflow steps — swim lane cards */}
      <div className="space-y-2">
        {steps.map((s, i) => {
          const config = actorConfig[s.actor];
          const isExpanded = expandedStep === i;
          return (
            <div
              key={i}
              className="rounded-lg overflow-hidden cursor-pointer transition-all"
              style={{ borderLeft: `3px solid ${config.color}` }}
              onClick={() => setExpandedStep(prev => prev === i ? null : i)}
            >
              {s.checkpoint && (
                <div className="flex items-center gap-2 px-4 py-2" style={{ backgroundColor: '#fffbf0', borderBottom: '1px solid #f0e6c8' }}>
                  <Flag size={12} className="text-amber-600 shrink-0" />
                  <span className="text-[11px] font-semibold text-amber-700">체크포인트</span>
                  {s.checkpoint_reason && (
                    <span className="text-[11px] text-amber-600/80">&mdash; {s.checkpoint_reason}</span>
                  )}
                </div>
              )}
              <div className="px-4 py-3.5" style={{ backgroundColor: config.bg }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-[18px] font-bold tabular-nums leading-none pt-0.5 shrink-0 select-none" style={{ color: `${config.color}40` }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: config.text }}>
                        {config.label}
                      </span>
                      <p className="text-[13px] font-semibold text-[var(--text-primary)] leading-snug mt-0.5">{s.task}</p>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-1">{s.expected_output}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-[var(--text-tertiary)] shrink-0">{s.estimated_time}</span>
                </div>

                {/* Expanded: collab split for 'both' steps */}
                {isExpanded && s.actor === 'both' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 ml-0 sm:ml-[30px] animate-fade-in">
                    <div className="rounded-md p-2.5 border" style={{ backgroundColor: 'rgba(234,239,248,0.8)', borderColor: 'rgba(59,109,204,0.08)' }}>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#2d4a7c] flex items-center gap-1 mb-1">
                        <Bot size={9} /> AI가 만드는 것
                      </span>
                      <p className="text-[11px] text-[var(--text-primary)] leading-relaxed">{s.expected_output}</p>
                    </div>
                    <div className="rounded-md p-2.5 border" style={{ backgroundColor: 'rgba(254,244,228,0.8)', borderColor: 'rgba(184,134,11,0.08)' }}>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#8b6914] flex items-center gap-1 mb-1">
                        <Brain size={9} /> 사람이 결정하는 것
                      </span>
                      <p className="text-[11px] text-[var(--text-primary)] leading-relaxed">수익성 데이터 기반으로 시나리오 우선순위 결정</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Compact summary strip */}
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg)] px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--text-secondary)]">
        <span>AI <span className="font-bold text-[#2d4a7c]">{aiCount}</span></span>
        <span>사람 <span className="font-bold text-[#8b6914]">{humanCount}</span></span>
        <span>협업 <span className="font-bold text-[#2d6b2d]">{bothCount}</span></span>
        <span>체크포인트 <span className="font-bold text-amber-700">{checkpoints}</span></span>
      </div>

      {/* Prerequisites */}
      <div>
        <div className="flex items-baseline gap-2 mb-3">
          <h4 className="text-[14px] font-bold text-[var(--text-primary)]">전제 조건</h4>
          <span className="text-[11px] text-[var(--text-secondary)]">이 워크플로우가 유효하려면</span>
        </div>
        <div className="space-y-2">
          {o.key_assumptions.map((ka, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)]">
              <span className={`shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full ${
                ka.importance === 'high' ? 'bg-red-500' : 'bg-amber-500'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[var(--text-primary)] leading-snug">{ka.assumption}</p>
                <p className="text-[11px] text-red-600/70 mt-1">틀리면 &rarr; {ka.if_wrong}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-3 bg-[var(--ai)] rounded-xl px-4 py-3">
        <Lightbulb size={16} className="text-[var(--accent)] shrink-0 mt-0.5" />
        <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">
          <span className="font-bold">핵심:</span> AI가 재무 모델링을 하고, 사람은 한솔 내부 정보를 수집합니다. 체크포인트에서는 반드시 사람이 판단합니다. 이 경계를 설계하지 않으면 AI에게 맡길수록 방향이 틀어집니다.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   SECTION: 리허설
   ═══════════════════════════════════════ */

function PersonaSection() {
  const p = DEMO.persona;
  const f = p.feedback;
  const riskStyles: Record<string, { bg: string; border: string; label: string; labelColor: string }> = {
    critical: { bg: 'bg-red-50', border: 'border-l-[var(--risk-critical)]', label: '핵심 위협', labelColor: 'text-red-700 bg-red-100' },
    manageable: { bg: 'bg-amber-50', border: 'border-l-[var(--risk-manageable)]', label: '관리 가능', labelColor: 'text-amber-700 bg-amber-100' },
    unspoken: { bg: 'bg-purple-50', border: 'border-l-[var(--risk-unspoken)]', label: '침묵의 리스크', labelColor: 'text-purple-700 bg-purple-100' },
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 text-[12px] text-purple-600 font-semibold tracking-wider uppercase mb-2">
          <Users size={14} /> 3악장 &middot; 리허설
        </div>
        <h2 className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] leading-tight">
          이해관계자의 눈으로 보다
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mt-2 leading-relaxed">
          보고서를 보내기 전에, 박 대표라면 어떻게 반응할지 시뮬레이션합니다.
        </p>
      </div>

      {/* Context chain */}
      <div className="flex items-start gap-2.5 bg-[var(--checkpoint)] rounded-xl px-4 py-3">
        <Link2 size={14} className="text-amber-700 shrink-0 mt-1" />
        <div className="text-[12px] text-amber-800">
          <span className="font-bold">맥락 체인</span> &mdash; 편곡의 <strong>핵심 가정 3건</strong>을 이 리허설에서 검증합니다.
        </div>
      </div>

      {/* Persona card */}
      <Card className="!p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-[18px]">
            &#x1F454;
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold text-[var(--text-primary)]">{p.name}</h3>
              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">영향력 높음</span>
            </div>
            <p className="text-[12px] text-[var(--text-secondary)]">{p.role}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {p.traits.map((t, i) => (
            <span key={i} className="px-2 py-0.5 bg-[var(--ai)] text-[#2d4a7c] rounded-full text-[11px] font-semibold">{t}</span>
          ))}
        </div>
      </Card>

      {/* Overall reaction */}
      <Card>
        <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[var(--text-secondary)] mb-2">전반적 반응</p>
        <p className="text-[15px] text-[var(--text-primary)] leading-relaxed font-medium italic">
          &ldquo;{f.overall_reaction}&rdquo;
        </p>
      </Card>

      {/* Failure scenario */}
      <Card className="!bg-red-50/50 !border-red-200/50">
        <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-red-700 mb-2">프리모템 &mdash; 이 계획이 실패한다면</p>
        <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{f.failure_scenario}</p>
      </Card>

      {/* Risk cards */}
      <div>
        <p className="text-[13px] font-bold text-[var(--text-primary)] mb-3">3분류 리스크</p>
        <div className="space-y-2">
          {f.classified_risks.map((risk, i) => {
            const style = riskStyles[risk.category];
            return (
              <div key={i} className={`${style.bg} border-l-4 ${style.border} rounded-r-xl px-4 py-3 relative`}>
                {risk.category === 'unspoken' && (
                  <span className="absolute -top-2 right-3 text-[9px] font-bold text-white bg-[var(--risk-unspoken)] px-2 py-0.5 rounded-full shadow-sm">
                    주목
                  </span>
                )}
                <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mb-1.5 ${style.labelColor}`}>
                  {style.label}
                </span>
                <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{risk.text}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Approval conditions */}
      <Card className="!bg-[var(--collab)]">
        <p className="text-[12px] font-bold text-[#2d6b2d] mb-2">승인 조건</p>
        <ul className="space-y-1">
          {f.approval_conditions.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--text-primary)]">
              <Check size={14} className="text-[var(--success)] shrink-0 mt-0.5" />
              {c}
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex items-start gap-3 bg-purple-50 rounded-xl px-4 py-3">
        <Lightbulb size={16} className="text-purple-600 shrink-0 mt-0.5" />
        <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">
          <span className="font-bold">핵심:</span> &ldquo;침묵의 리스크&rdquo;를 보세요. CEO가 직접 따온 적자 계약이라는 사실 &mdash; 모두 알지만 아무도 꺼내지 않는 문제. 이걸 미리 파악하면 보고서의 톤과 프레이밍이 완전히 달라집니다.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   SECTION: 합주 연습
   ═══════════════════════════════════════ */

function RefinementSection() {
  const iters = DEMO.convergence.iterations;
  const yForPct = (pct: number) => 95 - (pct / 100) * 80;
  const xPos = [80, 160, 240];
  const thresholdY = yForPct(80);
  const points = iters.map((it, i) => `${xPos[i]},${yForPct(it.score * 100)}`).join(' ');

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 text-[12px] text-[#2d6b2d] font-semibold tracking-wider uppercase mb-2">
          <RefreshCw size={14} /> 4악장 &middot; 합주 연습
        </div>
        <h2 className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] leading-tight">
          수렴할 때까지 반복하다
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mt-2 leading-relaxed">
          이해관계자 피드백을 반영하여 분석을 반복합니다. 3회 만에 92%까지 수렴했습니다.
        </p>
      </div>

      {/* Context chain */}
      <div className="flex items-start gap-2.5 bg-[var(--checkpoint)] rounded-xl px-4 py-3">
        <Link2 size={14} className="text-amber-700 shrink-0 mt-1" />
        <div className="text-[12px] text-amber-800">
          <span className="font-bold">맥락 체인</span> &mdash; 리허설에서 발견된 <strong className="text-red-700">핵심 위협 1건</strong>, <strong className="text-purple-700">침묵의 리스크 1건</strong>을 이 합주에서 해결합니다.
        </div>
      </div>

      {/* Convergence bar */}
      <Card className="!bg-[var(--collab)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-bold text-[var(--text-primary)]">수렴 분석</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] font-bold text-[var(--success)]">92%</span>
            <TrendingUp size={14} className="text-[var(--success)]" />
          </div>
        </div>
        <div className="h-2.5 bg-white/50 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-[var(--success)] rounded-full transition-all" style={{ width: '92%' }} />
        </div>
        <p className="text-[12px] text-[#2d6b2d]">수렴 임계값(80%)을 초과했습니다. 보고 준비가 완료되었습니다.</p>
      </Card>

      {/* Chart */}
      <Card>
        <p className="text-[12px] font-bold text-[var(--text-primary)] mb-3">수렴 추이</p>
        <svg viewBox="0 0 300 110" className="w-full" style={{ height: '140px' }}>
          <line x1="50" y1="15" x2="50" y2="95" stroke="var(--border)" strokeWidth="0.5" />
          <line x1="50" y1="95" x2="260" y2="95" stroke="var(--border)" strokeWidth="0.5" />
          <line x1="50" y1={thresholdY} x2="260" y2={thresholdY} stroke="var(--success)" strokeWidth="0.8" strokeDasharray="4,3" />
          <text x="46" y={thresholdY + 3} textAnchor="end" fontSize="8" fill="var(--success)">80%</text>
          <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {iters.map((it, i) => {
            const y = yForPct(it.score * 100);
            const isLast = i === iters.length - 1;
            return (
              <g key={i}>
                <circle cx={xPos[i]} cy={y} r={isLast ? 5 : 4} fill={isLast ? 'var(--success)' : 'var(--accent)'} />
                <text x={xPos[i]} y={y - 10} textAnchor="middle" fontSize="10" fontWeight="bold" fill={isLast ? 'var(--success)' : 'var(--accent)'}>{Math.round(it.score * 100)}%</text>
                <text x={xPos[i]} y={108} textAnchor="middle" fontSize="9" fill="var(--text-secondary)">{it.number}차</text>
              </g>
            );
          })}
        </svg>
      </Card>

      {/* Iteration cards */}
      <div className="space-y-2">
        {iters.map((it, i) => {
          const prev = i > 0 ? iters[i - 1] : null;
          const delta = prev ? it.score - prev.score : it.score;
          return (
            <Card key={i} className="!p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold ${
                    it.score >= 0.8 ? 'bg-[var(--collab)] text-[var(--success)]' : 'bg-[var(--ai)] text-[#2d4a7c]'
                  }`}>
                    {it.number}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-[var(--text-primary)]">반복 {it.number}</p>
                      <span className={`text-[11px] font-bold ${delta > 0 ? 'text-[var(--success)]' : 'text-[var(--text-secondary)]'}`}>
                        +{Math.round(delta * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] mt-0.5">
                      <span className="text-[var(--success)]">{it.resolved}건 해결</span>
                      <span className="text-amber-600">{it.unresolved}건 미해결</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${it.score * 100}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-[var(--text-secondary)]">{Math.round(it.score * 100)}%</span>
                </div>
              </div>
              <p className="text-[12px] text-[var(--text-secondary)] mt-2 bg-[var(--bg)] rounded-lg px-3 py-2">{it.summary}</p>
            </Card>
          );
        })}
      </div>

      <div className="flex items-start gap-3 bg-[var(--collab)] rounded-xl px-4 py-3">
        <Lightbulb size={16} className="text-[#2d6b2d] shrink-0 mt-0.5" />
        <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">
          <span className="font-bold">핵심:</span> 1차 45% &rarr; 3차 92%. 핵심은 &ldquo;반복&rdquo;이 아니라 <strong>맥락 누적</strong> &mdash; 각 반복에서 발견한 사실이 다음 반복의 제약조건이 되면서 점점 정교해집니다.
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   SECTION: 결과
   ═══════════════════════════════════════ */

function OutroSection() {
  const outputs = [
    { icon: FileText, name: '프로젝트 브리프', desc: '전체 맥락을 담은 의사결정 문서' },
    { icon: Code, name: '프롬프트 체인', desc: 'AI에게 바로 시킬 수 있는 단계별 프롬프트' },
    { icon: ClipboardList, name: '에이전트 스펙', desc: 'LangGraph/CrewAI용 워크플로우 정의' },
    { icon: ListChecks, name: '실행 체크리스트', desc: '현장에서 쓸 수 있는 할 일 목록' },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 text-[12px] text-[var(--success)] font-semibold tracking-wider uppercase mb-3">
          <Sparkles size={14} /> 공연 준비 완료
        </div>
        <h2 className="text-[28px] md:text-[36px] font-extrabold text-[var(--text-primary)] leading-tight tracking-tight">
          3번의 반복, 92% 수렴.
          <br />
          <span className="text-[var(--text-secondary)]">이제 무대에 올립니다.</span>
        </h2>
        <p className="text-[15px] text-[var(--text-secondary)] mt-4 leading-relaxed max-w-md mx-auto">
          4단계를 거치며 누적된 맥락이 4가지 형태의 산출물로 정리됩니다.
        </p>
      </div>

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

      <Card className="!bg-[var(--ai)] text-center !py-8">
        <p className="text-[15px] text-[var(--text-primary)] leading-relaxed mb-1">
          이 모든 과정을 <strong>직접 해보세요.</strong>
        </p>
        <p className="text-[13px] text-[var(--text-secondary)]">
          당신의 과제로, 당신의 이해관계자로, 당신의 판단으로.
        </p>
      </Card>
    </div>
  );
}

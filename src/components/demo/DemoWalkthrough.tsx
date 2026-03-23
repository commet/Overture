'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import {
  Play, Layers, Map, Users, RefreshCw, Sparkles,
  Check, ArrowRight, ArrowLeft,
  Lightbulb, Link2, Bot, Brain, Handshake, Flag, Clock, Package,
  FileText, ListChecks, Code, ClipboardList,
  TrendingUp,
} from 'lucide-react';
import { track } from '@/lib/analytics';

/* ═══════════════════════════════════════
   DEMO DATA
   ═══════════════════════════════════════ */

const DEMO = {
  project: {
    name: 'Meridian 계약 위기 대응',
    scenario: '당신은 B2B SaaS 회사의 전략기획팀장입니다. 매출 40%를 차지하는 최대 고객사 Meridian(대기업 ERP 솔루션 고객)이 갑자기 "다음 분기 계약을 재검토하겠다"고 통보했습니다.',
    directive: '대표 지시: "2주 안에 대응 방안 만들어라."',
    context: '3년간 Meridian 맞춤 개발에 집중하느라 다른 고객 50곳의 요구가 밀려 있는 상황입니다.',
  },

  decompose: {
    surface_task: 'Meridian 계약 유지를 위한 대응 방안을 2주 안에 수립',
    hidden_assumptions: [
      { assumption: 'Meridian을 반드시 유지해야 한다', risk_if_false: 'Meridian이 적자 계약이라면 유지할수록 손해. 매출 의존도 40%가 오히려 구조적 리스크', evaluation: 'doubtful' as const },
      { assumption: '이탈 사유가 우리의 서비스 품질 때문이다', risk_if_false: '실은 Meridian 내부 구조조정이나 경쟁사의 공격적 제안 때문일 수 있음. 원인 오진 시 엉뚱한 대응', evaluation: 'uncertain' as const },
      { assumption: '가격 양보나 추가 서비스로 잡을 수 있다', risk_if_false: '이미 적자인 계약에서 추가 양보는 손실 확대. 선례가 되면 다른 고객도 같은 요구', evaluation: 'doubtful' as const },
    ],
    reframed_question: 'Meridian 의존도 40%라는 구조적 리스크를 해소하면서, 이 위기를 포트폴리오 다각화의 전환점으로 만들 수 있는가?',
    why_reframing_matters: "'어떻게 잡을까'가 아니라 '잡아야 하는가, 어떤 조건에서 잡아야 하는가'로 바꾸면 대표에게 Go/No-Go 의사결정 근거를 제공할 수 있습니다.",
    reasoning_narrative: '처음에는 "Meridian을 지켜야 한다"가 과제였지만, 매출 의존도 40% 자체가 문제의 원인이었다. Meridian 커스텀에 끌려다니느라 다른 고객 50곳의 요구가 1년째 밀리고 있었다.',
    hidden_questions: [
      { question: 'Meridian 계약의 실제 수익성(순이익 기여도)은 얼마이며, 이탈 시 재무 영향의 실체는?', reasoning: '매출 40%가 이익 40%는 아닐 수 있다. 숫자를 보면 판단이 달라진다' },
      { question: 'Meridian 의존도를 줄이면서 동시에 관계를 유지하는 조건부 전략이 가능한가?', reasoning: '올인 아니면 포기가 아닌 제3의 선택지를 설계할 수 있다' },
      { question: 'Meridian이 빠진 자리를 메울 수 있는 파이프라인은 현실적으로 존재하는가?', reasoning: '대안이 있어야 놓을 수 있는 카드가 된다' },
    ],
  },

  orchestrate: {
    governing_idea: '감정적 "무조건 유지"가 아니라, 수익성 팩트에 기반한 3가지 시나리오를 만들어 대표가 선택할 수 있게 한다',
    storyline: {
      situation: 'Meridian은 3년간 최대 고객이었고, 매출의 40%를 차지한다. 갑작스러운 계약 재검토 통보에 사내가 패닉 상태다.',
      complication: '그러나 Meridian 계약은 커스텀 요구가 과중하여 실제 마진이 낮고, 제품 로드맵이 1년째 밀리고 있다. "무조건 잡아라"가 최선인지 불확실하다.',
      resolution: '먼저 Meridian 계약의 실제 수익성을 밝히고, 3가지 시나리오별 재무 영향을 비교한 뒤, 대표가 데이터로 판단하게 한다.',
    },
    steps: [
      { task: 'Meridian 계약 수익성 정밀 분석', actor: 'both' as const, expected_output: '실수익률 보고서 + 기회비용 산출', checkpoint: true, checkpoint_reason: '이 숫자가 이후 모든 시나리오의 기반', estimated_time: '2일', judgment: '직접비만/간접비 포함/기회비용 포함 중 원가 분석 범위를 결정', user_ai_guide: 'Meridian 전용 인프라 비용과 인건비를 분리하여 실질 마진을 산출' },
      { task: 'Meridian 이탈 사유 파악', actor: 'human' as const, expected_output: '이탈 사유 인텔리전스 보고서', checkpoint: false, estimated_time: '3일', judgment: '내부 정보원 접촉/공식 미팅 요청/경쟁사 동향 우선 중 접근 순서를 결정' },
      { task: '3가지 시나리오 재무 모델링', actor: 'ai' as const, expected_output: '시나리오별 12개월 P&L 시뮬레이션', checkpoint: false, estimated_time: '4시간', user_ai_guide: '전면 유지, 조건부 축소, 포트폴리오 재구성 3가지 시나리오로 모델링' },
      { task: '대체 매출 파이프라인 현실성 평가', actor: 'both' as const, expected_output: '전환 가능 고객 리스트 + 시점 매트릭스', checkpoint: true, checkpoint_reason: "'놓을 수 있는 카드'인지 여기서 결정", estimated_time: '2일', judgment: '기존 파이프라인/신규 발굴/기존 고객 확대 중 집중 영역을 결정' },
      { task: '대표 보고용 의사결정 문서 작성', actor: 'human' as const, expected_output: '시나리오 비교표 + 추천안 (10p)', checkpoint: true, checkpoint_reason: '최종 보고 전 프레이밍 검수', estimated_time: '1일', judgment: '전면 유지/조건부 축소/포트폴리오 재구성 중 추천안을 선택' },
    ],
    key_assumptions: [
      { assumption: '재무팀이 Meridian 계약의 정밀 원가 데이터를 제공할 수 있다', importance: 'high' as const, if_wrong: '수익성 분석 신뢰도가 떨어져 시나리오 비교 불가' },
      { assumption: 'Meridian의 해지 검토가 협상 전술이지 확정은 아니다', importance: 'high' as const, if_wrong: '이미 경쟁사와 계약 서명 단계라면 유지 시나리오 자체가 무의미' },
      { assumption: '다른 고객사에게 Meridian 이탈 소식이 퍼지지 않았다', importance: 'medium' as const, if_wrong: '연쇄 이탈 리스크 발생. 위기 커뮤니케이션이 별도 필요' },
    ],
  },

  persona: {
    name: '박정수 대표',
    role: 'CEO / 대표이사',
    traits: ['매출 중심 사고', '관계 중시', '리스크 회피'],
    feedback: {
      overall_reaction: '시나리오 3개를 보여주는 건 좋아. 근데 "전략적 이별" 시나리오까지 넣을 거면, 내가 Meridian 이 대표한테 전화해서 뭐라고 말해야 하는지까지 나와야 해.',
      failure_scenario: '수익성 분석에서 Meridian이 적자라는 게 나오는데, 이 정보가 Meridian 측에 새어나감. "너네가 우리를 버리려 했다"는 인식이 생기면서 관계 완전 파탄.',
      classified_risks: [
        { text: 'Meridian이 이미 경쟁사와 MOU를 맺은 상태라면, 우리의 유지 시나리오는 시간 낭비다. 72시간 내에 Meridian 내부 상황을 파악하지 못하면 모든 대응이 늦다.', category: 'critical' as const },
        { text: 'Meridian 이탈 소식이 다른 고객에게 퍼질 수 있다는 우려. 하지만 상위 10개 고객 중 Meridian과 직접 경쟁하는 곳은 없어서 사전 커뮤니케이션으로 통제 가능.', category: 'manageable' as const },
        { text: '솔직히 Meridian 계약은 내가 3년 전에 이 대표 골프장에서 따온 건데... 팀에서 "적자 계약"이라는 걸 1년 전부터 알고 있었으면서 아무도 나한테 보고를 안 했어. 그게 더 문제야.', category: 'unspoken' as const },
      ],
      approval_conditions: ['Meridian 실수익률 데이터가 재무팀 검증을 거칠 것', '"조건부 축소" 시나리오에 Meridian이 수용 가능한 구체적 조건 3개를 포함할 것'],
    },
  },

  convergence: {
    iterations: [
      { number: 1, score: 0.45, resolved: 2, unresolved: 3, total: 5, summary: '초기 분석 완료. Meridian 수익성 데이터 미확보, Meridian 측 내부 상황 미파악.' },
      { number: 2, score: 0.78, resolved: 4, unresolved: 1, total: 5, summary: '재무팀 원가 데이터 확보 (Meridian 마진 -8% 확인). 경쟁사 MOU 미체결 확인. 용어 변경: "전략적 이별" → "포트폴리오 재구성".' },
      { number: 3, score: 0.92, resolved: 5, unresolved: 0, total: 5, summary: '대표가 Meridian 이 대표와 사전 통화 — "조건부 축소"에 긍정 반응. 대체 파이프라인 3건 구체화. 모든 이해관계자 정렬.' },
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
  const [loading, setLoading] = useState(false);
  const visitedRef = useRef<Set<number>>(new Set([0]));
  const maxStep = STEPS.length - 1;

  const go = (target: number) => {
    const next = Math.max(0, Math.min(target, maxStep));
    setStep(next);
    track('demo_step', { step: next, label: STEPS[next]?.id });
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
        <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--text-tertiary)] mb-3">오늘의 상황</p>
        <p className="text-[16px] md:text-[18px] font-semibold text-[var(--text-primary)] leading-relaxed">
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
          <p className="text-[12px] font-bold text-red-400 mb-2">보통이라면?</p>
          <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">
            긴급 TF를 꾸리고, 가격 양보안을 만들고,<br />어떻게든 잡으려 한다.
          </p>
          <p className="text-[12px] text-[var(--text-secondary)] mt-2">
            &rarr; 적자 계약을 더 키울 수 있다는 건 아무도 말하지 않는다.
          </p>
        </Card>
        <Card className="!bg-[var(--ai)]">
          <p className="text-[12px] font-bold text-[#2d4a7c] mb-2">Overture라면?</p>
          <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">
            <strong>&ldquo;정말 잡아야 하는 고객인가?&rdquo;</strong><br />
            부터 묻습니다.
          </p>
          <p className="text-[12px] text-[var(--text-secondary)] mt-2">
            &rarr; 숨겨진 전제를 점검하고, 데이터로 판단합니다.
          </p>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   SECTION: 악보 해석
   ═══════════════════════════════════════ */

function DecomposeSection() {
  const d = DEMO.decompose;
  const [evals, setEvals] = useState<Record<number, string>>(
    Object.fromEntries(d.hidden_assumptions.map((a, i) => [i, a.evaluation || 'uncertain']))
  );
  const evalOptions = [
    { key: 'likely_true', label: '확인', icon: '✅', bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', activeBg: 'bg-green-100' },
    { key: 'doubtful', label: '의심', icon: '❌', bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', activeBg: 'bg-red-100' },
    { key: 'uncertain', label: '불확실', icon: '❓', bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', activeBg: 'bg-amber-100' },
  ];
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-[12px] text-[#2d4a7c] font-semibold tracking-wider uppercase mb-2">
          <Layers size={14} /> 1악장 &middot; 악보 해석
        </div>
        <h2 className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] leading-tight">
          진짜 질문을 찾아내다
        </h2>
      </div>

      {/* 1. 받은 악보 — clean standalone */}
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-4">
        <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[var(--text-tertiary)] mb-2">받은 악보</p>
        <p className="text-[15px] font-semibold text-[var(--text-primary)] leading-snug">{d.surface_task}</p>
      </div>

      {/* 2. 전제 점검 — 3가지 판단 */}
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

      {/* 3. 재정의된 질문 — 전제 판단 결과와 연결 */}
      {(() => {
        const doubtCount = Object.values(evals).filter(v => v === 'doubtful').length;
        const uncertainCount = Object.values(evals).filter(v => v === 'uncertain').length;
        return (
          <div className="rounded-xl bg-[var(--primary)] text-[var(--bg)] p-5 md:p-6">
            {(doubtCount > 0 || uncertainCount > 0) && (
              <p className="text-[12px] text-white/60 mb-2">
                전제 {Object.keys(evals).length}건 중 {doubtCount > 0 ? `${doubtCount}건 의심` : ''}{doubtCount > 0 && uncertainCount > 0 ? ', ' : ''}{uncertainCount > 0 ? `${uncertainCount}건 불확실` : ''} &rarr; 질문을 다시 세워야 합니다
              </p>
            )}
            <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-white/40 mb-2">재정의된 질문</p>
            <p className="text-[17px] md:text-[19px] font-bold leading-snug">{d.reframed_question}</p>
          </div>
        );
      })()}

      <div className="flex items-start gap-3 bg-[var(--ai)] rounded-lg px-4 py-3">
        <Lightbulb size={14} className="text-[var(--accent)] shrink-0 mt-0.5" />
        <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">
          <span className="font-bold">핵심:</span> &ldquo;어떻게 잡을까&rdquo;가 아니라 &ldquo;잡아야 하는가&rdquo;로 질문이 바뀌면, 대표에게 Go/No-Go 근거를 줄 수 있습니다.
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

  // Stats
  const total = steps.length || 1;
  const counts = { ai: 0, human: 0, both: 0 };
  steps.forEach(s => { counts[s.actor] = (counts[s.actor] || 0) + 1; });
  const humanPct = Math.round(((counts.human + counts.both) / total) * 100);
  const checkpointCount = steps.filter(s => s.checkpoint).length;

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

      {/* Governing idea — primary block */}
      <div className="rounded-xl bg-[var(--primary)] text-[var(--bg)] px-5 py-4">
        <p className="text-[11px] font-medium text-white/50 mb-1">핵심 방향</p>
        <p className="text-[16px] font-bold leading-snug">{o.governing_idea}</p>
      </div>

      {/* Role distribution dashboard — matches real workspace */}
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

      {/* Lane headers — matching real workspace */}
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

      {/* Workflow steps — left/right lane layout */}
      <div className="relative">
        {/* Center line (desktop) */}
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-[var(--border-subtle)] -translate-x-1/2" />

        <div className="space-y-3">
          {steps.map((s, i) => {
            const a = ACTORS[s.actor] || ACTORS.ai;
            const AIcon = a.Icon;
            const isExpanded = expandedStep === i;
            const options = extractOptions(s.judgment);
            const hasDecision = s.actor !== 'ai';
            const decided = decisions[i];

            // Lane positioning — matches real WorkflowGraph
            const laneClass = s.actor === 'ai'
              ? 'md:mr-[52%]'
              : s.actor === 'human'
              ? 'md:ml-[52%]'
              : '';

            return (
              <div key={i} className={`relative ${laneClass}`}>
                <div
                  className={`rounded-xl overflow-hidden transition-all cursor-pointer bg-[var(--surface)] ${
                    isExpanded ? 'shadow-md border border-[var(--border)]' : 'border border-[var(--border-subtle)] hover:border-[var(--border)]'
                  }`}
                  style={{ borderLeft: `3px solid ${a.color}` }}
                  onClick={() => setExpandedStep(isExpanded ? null : i)}
                >
                  {/* Checkpoint bar */}
                  {s.checkpoint && (
                    <div className="flex items-center gap-2 px-4 py-2" style={{ backgroundColor: '#fffbf0', borderBottom: '1px solid #f0e6c8' }}>
                      <Flag size={12} className="text-amber-600 shrink-0" />
                      <span className="text-[11px] font-semibold text-amber-700">체크포인트</span>
                      <span className="text-[12px] text-amber-600/80">&mdash; {s.checkpoint_reason}</span>
                    </div>
                  )}

                  {/* Card body */}
                  <div className="px-4 py-3 bg-[var(--surface)]">
                    <div className="flex items-start gap-2.5">
                      <div className="shrink-0 flex flex-col items-center gap-0.5">
                        <span className="text-[18px] font-bold tabular-nums leading-none select-none" style={{ color: `${a.color}30` }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        {s.checkpoint && <Flag size={10} className="text-amber-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Actor toggle — clickable 3-way pill */}
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
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all duration-200 cursor-pointer ${
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

                        {/* Collapsed status */}
                        {!isExpanded && decided && (
                          <p className="text-[11px] text-[#8b6914] mt-1.5 font-medium truncate">결정: {decided}</p>
                        )}
                        {!isExpanded && hasDecision && !decided && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full mt-1.5">
                            결정 필요
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[var(--text-tertiary)] shrink-0">{s.estimated_time}</span>
                    </div>
                  </div>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 animate-fade-in bg-[var(--surface)]">
                      <div className="ml-0 sm:ml-[30px] pt-3 border-t border-[var(--border-subtle)] space-y-3">
                        {(s.actor === 'ai' || s.actor === 'both') && s.user_ai_guide && (
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider block mb-1" style={{ color: ACTORS.ai.text }}>
                              <Bot size={10} className="inline mr-1" style={{ verticalAlign: '-1px' }} />
                              AI 실행 가이드
                            </span>
                            <p className="text-[12px] text-[var(--text-primary)] leading-relaxed bg-[var(--bg)] rounded-md px-3 py-2 border border-[var(--border-subtle)]">
                              {s.user_ai_guide}
                            </p>
                          </div>
                        )}

                        {hasDecision && s.judgment && (
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: ACTORS.human.text }}>
                              <Brain size={10} className="inline mr-1" style={{ verticalAlign: '-1px' }} />
                              당신의 판단
                            </span>
                            <p className="text-[12px] text-[var(--text-primary)] mb-2.5 leading-relaxed bg-[var(--bg)] rounded-md px-3 py-2 border border-[var(--border-subtle)]">
                              {s.judgment}
                            </p>

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
                                  >
                                    {opt}
                                  </button>
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
   SECTION: 리허설
   ═══════════════════════════════════════ */

function PersonaSection() {
  const p = DEMO.persona;
  const f = p.feedback;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 text-[12px] text-[#6b4c9a] font-semibold tracking-wider uppercase mb-2">
          <Users size={14} /> 3악장 &middot; 리허설
        </div>
        <h2 className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] leading-tight">
          보고 전에, 대표의 반응을 예측하다
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mt-2 leading-relaxed">
          앞서 설계한 <strong className="text-[var(--text-primary)]">5단계 실행 계획</strong>을 박 대표에게 보고한다면 어떤 반응이 올까요?
        </p>
      </div>

      {/* Persona header + reaction */}
      <Card>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-[#6b4c9a] flex items-center justify-center text-white text-[18px] font-bold shrink-0">박</div>
          <div>
            <span className="text-[16px] font-bold text-[var(--text-primary)]">{p.name}</span>
            <span className="text-[13px] text-[var(--text-secondary)] ml-2">{p.role}</span>
            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">영향력 높음</span>
          </div>
        </div>
        <div className="rounded-xl bg-[var(--ai)] px-4 py-3.5">
          <p className="text-[15px] font-medium text-[var(--text-primary)] leading-relaxed">
            &ldquo;{f.overall_reaction}&rdquo;
          </p>
        </div>
      </Card>

      {/* 리스크 분석 — 통합 카드 */}
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

      {/* 승인 조건 */}
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
          <span className="font-bold">핵심:</span> &ldquo;침묵의 리스크&rdquo;를 보세요 &mdash; CEO가 직접 따온 적자 계약. 모두 알지만 아무도 꺼내지 않는 문제를 미리 파악하면 보고서의 톤이 완전히 달라집니다.
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
  const [activeIter, setActiveIter] = useState<number | null>(null);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 text-[12px] text-[#2d6b2d] font-semibold tracking-wider uppercase mb-2">
          <RefreshCw size={14} /> 4악장 &middot; 합주 연습
        </div>
        <h2 className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] leading-tight">
          이해관계자가 OK할 때까지
        </h2>
        <p className="text-[15px] text-[var(--text-secondary)] mt-2 leading-relaxed">
          리허설에서 받은 피드백을 반영하고, <strong className="text-[var(--text-primary)]">같은 이해관계자에게 다시 보여줍니다.</strong><br />
          핵심 위협이 0이 되고 승인 조건이 충족되면 수렴합니다.
        </p>
      </div>

      {/* How it works — friendly explanation */}
      <div className="rounded-xl border border-[#2d6b2d]/20 bg-[#2d6b2d]/[0.03] px-5 py-4">
        <p className="text-[13px] font-bold text-[#2d6b2d] mb-3">이 단계가 하는 일</p>
        <div className="space-y-2.5">
          {[
            { num: '1', text: '리허설에서 나온 이슈 중 반영할 것을 고릅니다', sub: '모든 피드백을 반영할 필요 없음 — 핵심만 선택' },
            { num: '2', text: 'AI가 기획안을 수정하고, 뭘 고쳤는지 보여줍니다', sub: '수정 전/후를 비교하여 변경점 명시' },
            { num: '3', text: '같은 이해관계자가 수정본을 다시 검토합니다', sub: '이전 피드백이 반영됐는지 자동 확인' },
            { num: '4', text: '핵심 위협 0건 + 승인 조건 80% 충족 → 수렴 완료', sub: '' },
          ].map((step) => (
            <div key={step.num} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#2d6b2d] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                {step.num}
              </span>
              <div>
                <p className="text-[13px] font-semibold text-[var(--text-primary)] leading-snug">{step.text}</p>
                {step.sub && <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">{step.sub}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Context chain */}
      <div className="flex items-start gap-2.5 bg-[var(--checkpoint)] rounded-xl px-4 py-3">
        <Link2 size={14} className="text-amber-700 shrink-0 mt-1" />
        <div className="text-[13px] text-amber-800">
          <span className="font-bold">맥락 체인</span> &mdash; 리허설에서 발견된 <strong className="text-red-700">핵심 위협 1건</strong>, <strong className="text-purple-700">침묵의 리스크 1건</strong>이 이 합주의 출발점입니다.
        </div>
      </div>

      {/* Current status — large, prominent */}
      <div className="rounded-2xl overflow-hidden border border-[#2d6b2d]/20">
        <div className="bg-[#2d6b2d] text-white px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-white/60 mb-0.5">현재 수렴도</p>
            <p className="text-[32px] font-extrabold leading-none">92%</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-white/60">3회 반복</p>
            <p className="text-[14px] font-bold">5/5건 해결</p>
          </div>
        </div>
        <div className="px-5 py-3 bg-[#2d6b2d]/[0.04] flex items-center gap-2">
          <Check size={14} className="text-[#2d6b2d]" />
          <p className="text-[13px] font-semibold text-[#2d6b2d]">수렴 완료 — 보고 준비가 되었습니다</p>
        </div>
      </div>

      {/* Convergence chart */}
      <Card>
        <p className="text-[13px] font-bold text-[var(--text-primary)] mb-1">수렴 추이</p>
        <p className="text-[12px] text-[var(--text-secondary)] mb-3">점선이 수렴 기준(80%)입니다. 아래 타임라인에서 각 반복의 상세를 확인하세요.</p>
        <svg viewBox="0 0 300 110" className="w-full" style={{ height: '150px' }}>
          {/* Grid */}
          <line x1="50" y1="15" x2="50" y2="95" stroke="var(--border)" strokeWidth="0.5" />
          <line x1="50" y1="95" x2="260" y2="95" stroke="var(--border)" strokeWidth="0.5" />
          {/* Y axis labels */}
          <text x="46" y="18" textAnchor="end" fontSize="8" fill="var(--text-tertiary)">100%</text>
          <text x="46" y="57" textAnchor="end" fontSize="8" fill="var(--text-tertiary)">50%</text>
          <text x="46" y="98" textAnchor="end" fontSize="8" fill="var(--text-tertiary)">0%</text>
          {/* Threshold */}
          <line x1="50" y1={thresholdY} x2="260" y2={thresholdY} stroke="#2d6b2d" strokeWidth="1" strokeDasharray="4,3" />
          <text x="264" y={thresholdY + 3} fontSize="8" fontWeight="bold" fill="#2d6b2d">수렴 기준</text>
          {/* Area fill */}
          <polygon points={`${xPos[0]},95 ${points} ${xPos[2]},95`} fill="var(--accent)" opacity="0.08" />
          {/* Line */}
          <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Data points */}
          {iters.map((it, i) => {
            const y = yForPct(it.score * 100);
            const isLast = i === iters.length - 1;
            return (
              <g key={i}>
                <circle cx={xPos[i]} cy={y} r={isLast ? 6 : 4} fill={isLast ? '#2d6b2d' : 'var(--accent)'} stroke="white" strokeWidth="2" />
                <text x={xPos[i]} y={y - 12} textAnchor="middle" fontSize="11" fontWeight="bold" fill={isLast ? '#2d6b2d' : 'var(--accent)'}>{Math.round(it.score * 100)}%</text>
                <text x={xPos[i]} y={108} textAnchor="middle" fontSize="9" fill="var(--text-secondary)">{it.number}차</text>
              </g>
            );
          })}
        </svg>
      </Card>

      {/* Iteration timeline — interactive, larger text */}
      <div>
        <p className="text-[13px] font-bold text-[var(--text-primary)] mb-3">각 반복에서 무슨 일이 있었나</p>
        <div className="relative">
          <div className="absolute left-[19px] top-4 bottom-4 w-px bg-[var(--border)]" />

          <div className="space-y-3">
            {iters.map((it, i) => {
              const prev = i > 0 ? iters[i - 1] : null;
              const delta = prev ? it.score - prev.score : it.score;
              const isLast = i === iters.length - 1;
              const isActive = activeIter === i;
              return (
                <div key={i} className="flex gap-4 relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 z-10 ${
                    isLast ? 'bg-[#2d6b2d] text-white' : 'bg-[var(--surface)] border-2 border-[var(--border)] text-[var(--text-secondary)]'
                  }`}>
                    {it.number}차
                  </div>
                  <div
                    className={`flex-1 rounded-xl border p-4 cursor-pointer transition-all ${
                      isActive
                        ? 'border-[#2d6b2d] bg-[#2d6b2d]/[0.03] shadow-sm'
                        : 'border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--border)]'
                    }`}
                    onClick={() => setActiveIter(isActive ? null : i)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-[16px] font-bold text-[var(--text-primary)]">{Math.round(it.score * 100)}%</span>
                        <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${
                          isLast ? 'bg-[#2d6b2d]/10 text-[#2d6b2d]' : 'bg-[var(--accent)]/10 text-[var(--accent)]'
                        }`}>
                          +{Math.round(delta * 100)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[12px] font-semibold ${it.unresolved === 0 ? 'text-[#2d6b2d]' : 'text-red-600'}`}>
                          {it.unresolved === 0 ? '모두 해결' : `${it.unresolved}건 미해결`}
                        </span>
                      </div>
                    </div>
                    <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{it.summary}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl px-5 py-4 border border-[#2d6b2d]/20 bg-[#2d6b2d]/[0.03]">
        <Lightbulb size={18} className="text-[#2d6b2d] shrink-0 mt-0.5" />
        <div>
          <p className="text-[14px] font-bold text-[var(--text-primary)] mb-1">핵심: 반복이 아니라 맥락 누적</p>
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
            1차에서 발견한 &ldquo;Meridian 마진 -8%&rdquo;가 2차의 제약조건이 되고, 2차에서 확인한 &ldquo;MOU 미체결&rdquo;이 3차의 근거가 됩니다. 같은 문서를 단순히 고치는 게 아니라, <strong className="text-[var(--text-primary)]">맥락이 쌓이면서 판단이 정교해지는 것</strong>이 합주 연습의 진짜 목적입니다.
          </p>
        </div>
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

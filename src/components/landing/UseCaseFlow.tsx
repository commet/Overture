'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Briefcase, Code, ClipboardList, ArrowDown, Bot, Brain, Users, MessageCircle, Check } from 'lucide-react';

interface FlowStep {
  label: string;
  description: string;
  actor: 'user' | 'ai' | 'checkpoint';
  tool?: string;
}

interface UseCase {
  key: string;
  icon: React.ReactNode;
  role: string;
  scenario: string;
  steps: FlowStep[];
  result: string;
}

const useCases: UseCase[] = [
  {
    key: 'planner',
    icon: <Briefcase size={16} />,
    role: '전략기획자',
    scenario: '"대표님이 동남아 진출 전략을 2주 안에 보고하라고 했다"',
    steps: [
      { label: '과제 입력', description: '받은 과제를 자연어로 입력', actor: 'user', tool: '과제 분해' },
      { label: 'AI 분석', description: '"동남아 진출이 맞는가, 기존 시장 수익 개선이 우선인가?" 등 숨겨진 질문 제안', actor: 'ai' },
      { label: '진짜 질문 선택', description: '3개 제안 중 핵심 질문을 선택하고 과제를 재정의', actor: 'checkpoint' },
      { label: '워크플로우 설계', description: 'AI가 7단계 워크플로우 자동 생성, 각 단계별 AI/사람 역할 배정', actor: 'ai', tool: '오케스트레이션 맵' },
      { label: '페르소나 피드백', description: '"김 CFO라면 ROI 근거부터 물어볼 것" — 보고 전 사전 검증', actor: 'ai', tool: '페르소나 피드백' },
    ],
    result: '2주 기한 내 의사결정에 필요한 보고서 구조 완성. AI가 80%, 사람이 판단의 20%.',
  },
  {
    key: 'developer',
    icon: <Code size={16} />,
    role: '개발자',
    scenario: '"3개 AI 에이전트로 코드 리뷰 시스템을 만들어야 한다"',
    steps: [
      { label: '목표 입력', description: '최종 결과물과 현재 상황 자유 입력', actor: 'user', tool: '오케스트레이션 맵' },
      { label: 'AI 워크플로우', description: '6단계 파이프라인 자동 설계 — 에이전트 역할 분배 + 체크포인트 배치', actor: 'ai' },
      { label: '체크포인트 검토', description: '"에이전트 3의 보안 분석 결과는 사람이 반드시 확인" — 드래그로 조정', actor: 'checkpoint' },
      { label: '산출물 비교', description: '3개 에이전트 결과를 한 화면에서 합의/쟁점 자동 분석', actor: 'ai', tool: '산출물 합성' },
      { label: '판단 입력', description: '쟁점별로 개발자의 기술적 판단 입력 → 최종 결론 자동 생성', actor: 'checkpoint' },
    ],
    result: '에이전트 오케스트레이션 설계 + 품질 관리 체크포인트가 포함된 실행 계획.',
  },
  {
    key: 'pm',
    icon: <ClipboardList size={16} />,
    role: 'PM',
    scenario: '"신규 기능 기획서를 CEO, CTO, 디자인 리드에게 동시에 보고해야 한다"',
    steps: [
      { label: '페르소나 등록', description: '"CEO는 시장 규모, CTO는 기술 부채, 디자인 리드는 UX 일관성을 중시" — 자유 텍스트로 등록', actor: 'user', tool: '페르소나 피드백' },
      { label: '기획서 입력', description: '작성한 기획서를 붙여넣기', actor: 'user' },
      { label: '3인 시점 피드백', description: 'CEO: "TAM 숫자가 없네" / CTO: "기존 API 호환은?" / 디자인: "기존 패턴과 불일치"', actor: 'ai' },
      { label: '우선순위 조정', description: '공통 지적(정량 데이터 부족)부터 해결, 개별 우려사항 순서 정리', actor: 'checkpoint' },
      { label: '피드백 로그 축적', description: '실제 보고 후 반응 기록 → 다음 피드백이 더 정확해짐', actor: 'user' },
    ],
    result: '보고 전에 3명의 이해관계자 우려사항 사전 파악. 피드백 정확도가 사용할수록 높아짐.',
  },
];

export function UseCaseFlow() {
  const [activeKey, setActiveKey] = useState('planner');
  const activeCase = useCases.find((uc) => uc.key === activeKey)!;

  return (
    <section className="py-8">
      <h2 className="text-[20px] font-bold text-[var(--text-primary)] text-center mb-2">
        이렇게 사용합니다
      </h2>
      <p className="text-[13px] text-[var(--text-secondary)] text-center mb-6">
        직무별 실제 사용 시나리오
      </p>

      {/* Role tabs */}
      <div className="flex justify-center gap-2 mb-6">
        {useCases.map((uc) => (
          <button
            key={uc.key}
            onClick={() => setActiveKey(uc.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium border transition-all cursor-pointer ${
              activeKey === uc.key
                ? 'border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm'
                : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]'
            }`}
          >
            {uc.icon}
            {uc.role}
          </button>
        ))}
      </div>

      {/* Scenario */}
      <Card className="!bg-[var(--bg)] !border-dashed mb-6">
        <p className="text-[14px] text-[var(--text-primary)] text-center font-medium italic">
          {activeCase.scenario}
        </p>
      </Card>

      {/* Flow steps */}
      <div className="space-y-0 max-w-2xl mx-auto">
        {activeCase.steps.map((step, i) => (
          <div key={i} className="flex gap-3 animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
            {/* Timeline connector */}
            <div className="flex flex-col items-center w-8 shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                step.actor === 'ai' ? 'bg-[var(--ai)] text-[#2d4a7c]'
                : step.actor === 'checkpoint' ? 'bg-[var(--checkpoint)] text-amber-700'
                : 'bg-[var(--human)] text-[#8b6914]'
              }`}>
                {step.actor === 'ai' ? <Bot size={14} /> : step.actor === 'checkpoint' ? <Brain size={14} /> : <Users size={14} />}
              </div>
              {i < activeCase.steps.length - 1 && (
                <div className="w-0.5 h-6 bg-[var(--border)]" />
              )}
            </div>
            {/* Step content */}
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[13px] font-bold text-[var(--text-primary)]">{step.label}</span>
                {step.tool && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--ai)] text-[#2d4a7c] font-semibold">
                    {step.tool}
                  </span>
                )}
                <Badge variant={step.actor === 'ai' ? 'ai' : step.actor === 'checkpoint' ? 'checkpoint' : 'human'}>
                  {step.actor === 'ai' ? 'AI' : step.actor === 'checkpoint' ? '판단' : '입력'}
                </Badge>
              </div>
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Result */}
      <Card className="!bg-[var(--collab)] max-w-2xl mx-auto mt-2">
        <div className="flex items-start gap-2">
          <Check size={16} className="text-[#2d6b2d] mt-0.5 shrink-0" />
          <p className="text-[13px] text-[#2d6b2d] font-medium">{activeCase.result}</p>
        </div>
      </Card>
    </section>
  );
}

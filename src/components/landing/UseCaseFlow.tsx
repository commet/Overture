'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Briefcase, Code, ClipboardList, ArrowRight, Bot, Brain, MessageSquare } from 'lucide-react';

interface UseCase {
  key: string;
  emoji: string;
  role: string;
  scenario: string;
  highlight: string;
  steps: string[];
  result: string;
}

const useCases: UseCase[] = [
  {
    key: 'planner',
    emoji: '📋',
    role: '기획자',
    scenario: '대표님이 동남아 진출 전략을 2주 안에 보고하라고 했다',
    highlight: '숨겨진 질문 발견 → 워크플로우 설계 → CFO 사전 검증',
    steps: [
      '과제 분해: "동남아 진출이 맞나, 기존 시장이 우선인가?" 발견',
      '오케스트레이션: 7단계 중 AI 5단계, 사람 2단계 설계',
      '페르소나: CFO 시점에서 "ROI 근거 부족" 사전 발견 → 보완',
    ],
    result: 'AI 80% + 판단 20%로 2주 내 완성',
  },
  {
    key: 'developer',
    emoji: '💻',
    role: '개발자',
    scenario: '3개 AI 에이전트의 코드 리뷰 결과가 서로 다르다',
    highlight: '결과 비교 → 쟁점 발견 → 기술 판단 → 실행 계획',
    steps: [
      '산출물 합성: 3개 에이전트 결과의 합의점/쟁점 자동 분석',
      '오케스트레이션: 보안 분석은 사람 필수 체크포인트로 설정',
      '과제 분해: "코드 품질"이 아니라 "배포 안정성"이 진짜 목표 발견',
    ],
    result: '에이전트 오케스트레이션 + 품질 체크포인트 포함 실행 계획',
  },
  {
    key: 'pm',
    emoji: '🎯',
    role: 'PM',
    scenario: '기획서를 CEO, CTO, 디자인 리드에게 동시에 보고해야 한다',
    highlight: '3명 페르소나 등록 → 동시 피드백 → 피드백 로그 축적',
    steps: [
      '페르소나: CEO "시장 규모?", CTO "기존 API 호환?", 디자인 "패턴 불일치"',
      '공통 지적(정량 데이터 부족) 우선 해결 → 개별 우려 순서 정리',
      '실제 보고 후 반응 기록 → 다음 피드백이 더 정확해짐',
    ],
    result: '피드백 정확도가 사용할수록 높아짐',
  },
];

export function UseCaseFlow() {
  const [activeKey, setActiveKey] = useState('planner');
  const activeCase = useCases.find((uc) => uc.key === activeKey)!;

  return (
    <section className="py-8">
      <h2 className="text-[18px] font-bold text-[var(--text-primary)] text-center mb-6">
        실제 사용 시나리오
      </h2>

      {/* Compact role tabs */}
      <div className="flex justify-center gap-2 mb-5">
        {useCases.map((uc) => (
          <button
            key={uc.key}
            onClick={() => setActiveKey(uc.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium transition-all cursor-pointer ${
              activeKey === uc.key
                ? 'bg-[var(--primary)] text-white shadow-sm'
                : 'bg-[var(--bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span>{uc.emoji}</span>
            {uc.role}
          </button>
        ))}
      </div>

      {/* Scenario card */}
      <div className="max-w-2xl mx-auto animate-fade-in" key={activeKey}>
        <Card className="!p-0 overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 bg-[var(--bg)] border-b border-[var(--border)]">
            <p className="text-[14px] font-medium text-[var(--text-primary)] italic">
              &ldquo;{activeCase.scenario}&rdquo;
            </p>
            <p className="text-[12px] text-[var(--accent)] font-semibold mt-1">
              {activeCase.highlight}
            </p>
          </div>

          {/* Steps - compact */}
          <div className="px-5 py-4 space-y-2.5">
            {activeCase.steps.map((step, i) => {
              const [tool, ...rest] = step.split(': ');
              return (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-5 h-5 rounded-full bg-[var(--ai)] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-[#2d4a7c]">{i + 1}</span>
                  </div>
                  <div className="text-[13px] leading-relaxed">
                    <span className="font-bold text-[var(--accent)]">{tool}</span>
                    <span className="text-[var(--text-secondary)]">: {rest.join(': ')}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Result */}
          <div className="px-5 py-3 bg-[var(--collab)] border-t border-green-200">
            <p className="text-[12px] font-semibold text-[#2d6b2d]">
              결과: {activeCase.result}
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
}

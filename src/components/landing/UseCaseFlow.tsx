'use client';

import { useState } from 'react';
import { AlertTriangle, Check, Lightbulb } from 'lucide-react';

interface UseCase {
  key: string;
  emoji: string;
  role: string;
  situation: string;
  withoutOverture: string;
  withOverture: { step: string; insight: string }[];
  result: string;
  difference: string;
}

const useCases: UseCase[] = [
  {
    key: 'planner',
    emoji: '📋',
    role: '기획자',
    situation: '대표가 "경쟁사가 AI 챗봇 출시했으니 우리도 빨리 만들어"라고 지시했다.',
    withoutOverture: 'ChatGPT에게 "AI 챗봇 기획서 작성해줘" → 기능 스펙은 나오지만, 우리 고객이 챗봇을 원하는지조차 검증 안 됨. 경영진 보고에서 "그래서 고객 수요 근거는?" 질문에 막힘.',
    withOverture: [
      { step: '주제 파악', insight: '"챗봇을 만들어야 하는가?"가 아니라 "고객 이탈의 진짜 원인이 뭔가?"가 선행 질문임을 발견' },
      { step: '역할 편성', insight: '고객 인터뷰 분석(AI) → 이탈 원인 해석(사람) → 솔루션 후보 도출(AI) → 최종 판단(사람) 으로 역할 설계' },
      { step: '리허설', insight: 'CFO 페르소나: "ROI 추정 없이 예산 요청 불가" → 재무 모델 추가 후 보고' },
    ],
    result: '"챗봇이 아니라 셀프서비스 포탈이 먼저"라는 결론 도출. 대표 설득 성공.',
    difference: '잘못된 질문으로 3주를 낭비할 뻔한 것을 → 올바른 질문으로 시작',
  },
  {
    key: 'developer',
    emoji: '💻',
    role: '개발자',
    situation: '새 서비스 아키텍처를 결정해야 한다. Claude, GPT, Gemini에게 각각 물어봤는데 답이 다르다.',
    withoutOverture: 'Claude는 마이크로서비스, GPT는 모놀리스, Gemini는 서버리스 추천. "그냥 종합해줘"라고 다시 AI에게 맡기면 "상황에 따라 다릅니다"라는 무의미한 답변.',
    withOverture: [
      { step: '조율', insight: '세 답변의 쟁점 자동 추출: "트래픽 규모 가정이 다름" / "팀 규모 고려 여부" / "마이그레이션 비용 포함 여부"' },
      { step: '조율', insight: '쟁점별로 내 상황 대입: "팀 4명 + 초기 트래픽 → 모놀리스 우선, 서버리스 전환 가능 구조"로 판단' },
      { step: '역할 편성', insight: '구현 워크플로우: 스키마 설계(AI) → 보안 리뷰(사람 필수) → 테스트(AI) → 배포 판단(사람)' },
    ],
    result: '"모놀리스 우선, 6개월 후 서버리스 전환" — 세 AI 답변 중 하나를 고른 게 아니라 내 맥락의 결론.',
    difference: '"상황에 따라 다릅니다"가 아닌 → 내 상황에서의 명확한 판단',
  },
  {
    key: 'pm',
    emoji: '🎯',
    role: 'PM',
    situation: '신규 기능 기획서를 완성했다. 내일 CEO, CTO, 디자인 리드 앞에서 동시 발표.',
    withoutOverture: '발표 중 CEO가 "시장 규모는?", CTO가 "기존 API 호환은?", 디자인 리드가 "기존 디자인 시스템과 일관성은?" 질문. 세 개 다 준비 안 됨. 발표 실패.',
    withOverture: [
      { step: '리허설', insight: '3명 페르소나 등록 후 기획서 피드백 요청 → CEO: "TAM 숫자 없음", CTO: "API 변경 범위 명시 필요", 디자인: "기존 컴포넌트 재사용 여부 불명확"' },
      { step: '리허설', insight: '공통 지적(정량 데이터 부족)부터 해결 → 각 이해관계자별 보완' },
      { step: '리허설', insight: '발표 후 실제 반응 기록: "CEO는 예상대로, CTO는 의외로 배포 일정을 더 물어봄" → 다음 피드백에 반영' },
    ],
    result: '세 이해관계자의 질문을 미리 파악하고 준비. 발표 후 반응을 기록해서 다음에 더 정확해짐.',
    difference: '발표장에서 당하는 대신 → 발표 전에 미리 연습',
  },
];

export function UseCaseFlow() {
  const [activeKey, setActiveKey] = useState('planner');
  const activeCase = useCases.find((uc) => uc.key === activeKey)!;

  return (
    <section className="py-16">
      <div className="text-center mb-10">
        <p className="text-[12px] font-semibold text-[var(--accent)] tracking-widest uppercase mb-3">
          Real scenarios
        </p>
        <h2 className="text-[22px] md:text-[26px] font-bold text-[var(--text-primary)] tracking-tight">
          실제 업무에서의 차이
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mt-2">
          같은 상황, 다른 접근. Overture가 만드는 차이.
        </p>
      </div>

      {/* Role tabs */}
      <div className="flex justify-center gap-2 mb-8">
        {useCases.map((uc) => (
          <button
            key={uc.key}
            onClick={() => setActiveKey(uc.key)}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-medium transition-all duration-300 ease-[var(--ease-spring)] cursor-pointer ${
              activeKey === uc.key
                ? 'bg-[var(--primary)] text-white shadow-[var(--shadow-sm)]'
                : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)] hover:border-[var(--border)]'
            }`}
          >
            <span>{uc.emoji}</span>
            {uc.role}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto space-y-4 animate-fade-in" key={activeKey}>
        {/* Situation */}
        <div className="px-5 py-4 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border-subtle)] shadow-[var(--shadow-xs)]">
          <p className="text-[13px] text-[var(--text-secondary)]">
            <span className="font-bold text-[var(--text-primary)]">상황</span> — {activeCase.situation}
          </p>
        </div>

        {/* Without Overture */}
        <div className="px-5 py-4 rounded-[var(--radius-lg)] bg-red-50/40 border border-red-100/60">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={14} className="text-red-400/70 mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] font-bold text-red-400/70 mb-1.5 tracking-wider uppercase">Overture 없이</p>
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{activeCase.withoutOverture}</p>
            </div>
          </div>
        </div>

        {/* With Overture */}
        <div className="rounded-[var(--radius-lg)] border border-green-200/60 overflow-hidden shadow-[var(--shadow-xs)]">
          <div className="px-5 py-3 bg-[var(--collab)]/50 border-b border-green-200/40">
            <p className="text-[11px] font-bold text-[#2d6b2d]/80 flex items-center gap-1.5 tracking-wider uppercase">
              <Lightbulb size={12} /> Overture를 쓰면
            </p>
          </div>
          <div className="px-5 py-4 space-y-3.5 bg-[var(--surface)]">
            {activeCase.withOverture.map((item, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="text-[10px] font-bold text-[var(--accent)] bg-[var(--ai)] px-2 py-0.5 rounded-full mt-0.5 shrink-0 tracking-wide">
                  {item.step}
                </span>
                <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{item.insight}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Result + Difference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="px-5 py-4 rounded-[var(--radius-lg)] bg-[var(--collab)]/40">
            <div className="flex items-start gap-2.5">
              <Check size={14} className="text-[#2d6b2d] mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-[#2d6b2d]/80 mb-1 tracking-wider uppercase">결과</p>
                <p className="text-[12px] text-[#2d6b2d] leading-relaxed">{activeCase.result}</p>
              </div>
            </div>
          </div>
          <div className="px-5 py-4 rounded-[var(--radius-lg)] bg-[var(--ai)]/40">
            <div className="flex items-start gap-2.5">
              <Lightbulb size={14} className="text-[#2d4a7c] mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-[#2d4a7c]/80 mb-1 tracking-wider uppercase">핵심 차이</p>
                <p className="text-[12px] text-[#2d4a7c] leading-relaxed font-medium">{activeCase.difference}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

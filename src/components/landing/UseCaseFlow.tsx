'use client';

import { useState } from 'react';

interface Scene {
  key: string;
  role: string;
  situation: string;
  naive: string;
  strategic: string;
  result: string;
}

const scenes: Scene[] = [
  {
    key: 'question',
    role: '질문을 만드는 사람',
    situation: '경영진이 "경쟁사가 AI 챗봇 출시했으니 우리도 빨리 만들어"라고 지시합니다.',
    naive: 'ChatGPT에게 "AI 챗봇 기획서 작성해줘" → 기능 스펙은 나오지만, 우리 고객이 챗봇을 원하는지조차 검증 안 됨.',
    strategic: '"챗봇을 만들어야 하는가?"가 아니라 "고객 이탈의 진짜 원인이 뭔가?"가 선행 질문임을 발견. 챗봇이 아니라 셀프서비스 포탈이 먼저라는 결론.',
    result: '잘못된 질문으로 3주를 낭비할 뻔한 것을 → 올바른 질문으로 시작',
  },
  {
    key: 'unify',
    role: '서로 다른 언어를 엮는 사람',
    situation: '새 서비스 아키텍처를 결정해야 합니다. Claude, GPT, Gemini에게 각각 물어봤는데 답이 다릅니다.',
    naive: '"그냥 종합해줘"라고 다시 AI에게 맡기면 "상황에 따라 다릅니다"라는 무의미한 답변.',
    strategic: '세 답변의 쟁점 자동 추출 → 쟁점별로 내 상황 대입: "팀 4명 + 초기 트래픽 → 모놀리스 우선, 서버리스 전환 가능 구조"로 판단.',
    result: '"상황에 따라 다릅니다"가 아닌 → 내 상황에서의 명확한 판단',
  },
  {
    key: 'design',
    role: '실행을 설계하는 사람',
    situation: '신규 기능 기획서를 완성했습니다. 내일 CEO, CTO, 디자인 리드 앞에서 동시 발표.',
    naive: '발표 중 CEO가 "시장 규모는?", CTO가 "기존 API 호환은?" — 세 개 다 준비 안 됨. 발표 실패.',
    strategic: '3명 페르소나로 사전 리허설. CEO: "TAM 숫자 없음", CTO: "API 변경 범위 명시 필요" → 공통 지적부터 해결. 발표 후 실제 반응 기록으로 다음엔 더 정확.',
    result: '발표장에서 당하는 대신 → 발표 전에 미리 연습',
  },
];

export function UseCaseFlow() {
  const [activeKey, setActiveKey] = useState('question');
  const active = scenes.find((s) => s.key === activeKey)!;

  return (
    <section className="bg-[var(--primary)] text-white overflow-hidden">
      <div className="max-w-5xl mx-auto px-6 py-24 md:py-32">
        {/* Header */}
        <div className="max-w-xl mb-16">
          <p className="text-[12px] font-medium tracking-[0.2em] uppercase text-white/30 mb-4">
            Three scenes
          </p>
          <h2 className="text-[28px] md:text-[36px] font-bold leading-tight tracking-tight">
            전략기획자가 매일 하던 일에
            <br />
            <span className="text-white/50">새로운 이름이 붙었습니다.</span>
          </h2>
        </div>

        {/* Scene selector */}
        <div className="flex gap-3 mb-12 overflow-x-auto pb-2">
          {scenes.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveKey(s.key)}
              className={`shrink-0 px-5 py-3 rounded-xl text-[14px] font-medium transition-all duration-300 cursor-pointer border ${
                activeKey === s.key
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'border-white/5 text-white/30 hover:text-white/60 hover:border-white/10'
              }`}
            >
              {s.role}
            </button>
          ))}
        </div>

        {/* Scene content */}
        <div className="animate-fade-in" key={activeKey}>
          {/* Situation */}
          <p className="text-[16px] md:text-[18px] text-white/70 leading-relaxed max-w-2xl mb-10">
            {active.situation}
          </p>

          {/* Before/After */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
              <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-red-400/60 mb-3">
                AI에게 바로 시키면
              </p>
              <p className="text-[14px] text-white/40 leading-relaxed">
                {active.naive}
              </p>
            </div>
            <div className="rounded-2xl bg-white/[0.06] border border-white/[0.1] p-6">
              <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-[var(--accent-light)] mb-3">
                Overture를 거치면
              </p>
              <p className="text-[14px] text-white/70 leading-relaxed">
                {active.strategic}
              </p>
            </div>
          </div>

          {/* Result */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 max-w-[24px] bg-white/20" />
            <p className="text-[14px] font-medium text-white/50">
              {active.result}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

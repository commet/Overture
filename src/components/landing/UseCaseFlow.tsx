'use client';

import { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';

interface Scene {
  key: string;
  tab: string;
  situation: string;
  naive: string;
  strategic: string;
  result: string;
}

const scenes: Scene[] = [
  {
    key: 'redefine',
    tab: '질문을 만드는 사람',
    situation: '경영진이 "경쟁사가 AI 챗봇 출시했으니 우리도 빨리 만들어"라고 지시합니다.',
    naive: 'ChatGPT에게 "AI 챗봇 기획서 작성해줘" → 기능 스펙은 나오지만, 우리 고객이 챗봇을 원하는지조차 검증 안 됨.',
    strategic: '"챗봇을 만들어야 하는가?"가 아니라 "고객 이탈의 진짜 원인이 뭔가?"가 선행 질문임을 발견. 챗봇이 아니라 셀프서비스 포탈이 먼저라는 결론.',
    result: '잘못된 질문으로 3주를 낭비할 뻔한 것을 → 올바른 질문으로 시작',
  },
  {
    key: 'align',
    tab: '서로 다른 언어를 잇는 사람',
    situation: '신규 기능 기획서를 완성했습니다. 내일 CEO, CTO, 디자인 리드 앞에서 동시 발표.',
    naive: '발표 중 CEO가 "시장 규모는?", CTO가 "기존 API 호환은?" — 다 준비 안 됨. 발표 실패.',
    strategic: '3명 페르소나로 사전 시뮬레이션. CEO가 물을 질문, CTO가 짚을 기술 이슈를 미리 파악. 공통 지적부터 해결하고 발표 진입.',
    result: '발표장에서 당하는 대신 → 발표 전에 미리 검증',
  },
  {
    key: 'design',
    tab: '실행을 설계하는 사람',
    situation: '2주 안에 투자 유치용 사업계획서를 만들어야 합니다. 혼자서.',
    naive: 'AI에게 "사업계획서 만들어줘" → 분량은 나오지만 투자자가 실제로 보는 포인트(시장 검증, 유닛 이코노믹스)가 빠져 있음.',
    strategic: '시장 검증(AI) → 유닛 이코노믹스(사람 판단) → 경쟁 분석(AI) → 스토리라인 편집(사람). AI와 사람의 역할을 먼저 설계하고 시작.',
    result: 'AI에게 전부 맡기는 대신 → AI와 사람의 역할을 설계하고 시작',
  },
];

export function UseCaseFlow() {
  const [activeKey, setActiveKey] = useState('redefine');
  const active = scenes.find((s) => s.key === activeKey)!;

  return (
    <section className="border-t border-[var(--border-subtle)]">
      <div className="max-w-5xl mx-auto px-6 py-10 md:py-14">
        {/* Header */}
        <div className="max-w-xl mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px w-8 bg-[var(--border)]" />
            <span className="text-[12px] font-medium tracking-[0.2em] uppercase text-[var(--text-tertiary)]">
              Three scenes
            </span>
          </div>
          <h2 className="text-[28px] md:text-[36px] font-bold text-[var(--text-primary)] leading-tight tracking-tight">
            전략기획자가 매일 하던 일에
            <br />
            <span className="text-[var(--text-secondary)]">새로운 이름이 붙었습니다.</span>
          </h2>
        </div>

        {/* Scene selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {scenes.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveKey(s.key)}
              className={`shrink-0 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 cursor-pointer border ${
                activeKey === s.key
                  ? 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-primary)] shadow-sm'
                  : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {s.tab}
            </button>
          ))}
        </div>

        {/* Scene content */}
        <div className="animate-fade-in" key={activeKey}>
          {/* Situation — compact callout */}
          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed max-w-2xl mb-5 pl-3 border-l-2 border-[var(--border)]">
            {active.situation}
          </p>

          {/* Before/After — strong visual contrast */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {/* Naive */}
            <div className="rounded-xl bg-red-50/50 border border-red-200/30 p-4 md:p-5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-400 uppercase tracking-wider mb-2">
                <X size={12} />
                AI에게 바로 시키면
              </div>
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                {active.naive}
              </p>
            </div>

            {/* Strategic */}
            <div className="rounded-xl bg-[var(--ai)] border-2 border-[var(--accent)]/15 p-4 md:p-5">
              <div className="text-[11px] font-bold text-[var(--accent)] uppercase tracking-wider mb-2">
                Overture를 거치면
              </div>
              <p className="text-[13px] text-[var(--text-primary)] leading-relaxed font-medium">
                {active.strategic}
              </p>
            </div>
          </div>

          {/* Result — prominent */}
          <div className="flex items-center gap-2.5 bg-[var(--surface)] rounded-lg px-4 py-2.5 border border-[var(--border-subtle)]">
            <ArrowRight size={14} className="text-[var(--accent)] shrink-0" />
            <p className="text-[13px] font-semibold text-[var(--accent)]">
              {active.result}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

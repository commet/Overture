'use client';

import { useState } from 'react';

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
    tab: '과제를 재정의할 때',
    situation: '경영진이 "경쟁사가 AI 챗봇 출시했으니 우리도 빨리 만들어"라고 지시합니다.',
    naive: 'ChatGPT에게 "AI 챗봇 기획서 작성해줘" → 기능 스펙은 나오지만, 우리 고객이 챗봇을 원하는지조차 검증 안 됨.',
    strategic: '"챗봇을 만들어야 하는가?"가 아니라 "고객 이탈의 진짜 원인이 뭔가?"가 선행 질문임을 발견. 챗봇이 아니라 셀프서비스 포탈이 먼저라는 결론.',
    result: '잘못된 질문으로 3주를 낭비할 뻔한 것을 → 올바른 질문으로 시작',
  },
  {
    key: 'align',
    tab: '이해관계자를 맞출 때',
    situation: '신규 기능 기획서를 완성했습니다. 내일 CEO, CTO, 디자인 리드 앞에서 동시 발표.',
    naive: '발표 중 CEO가 "시장 규모는?", CTO가 "기존 API 호환은?" — 다 준비 안 됨. 발표 실패.',
    strategic: '3명 페르소나로 사전 시뮬레이션. CEO가 물을 질문, CTO가 짚을 기술 이슈를 미리 파악. 공통 지적부터 해결하고 발표 진입.',
    result: '발표장에서 당하는 대신 → 발표 전에 미리 검증',
  },
  {
    key: 'design',
    tab: '실행 계획을 세울 때',
    situation: '2주 안에 투자 유치용 사업계획서를 만들어야 합니다. 혼자서.',
    naive: 'AI에게 "사업계획서 만들어줘" → 분량은 나오지만 투자자가 실제로 보는 포인트(시장 검증, 유닛 이코노믹스)가 빠져 있음.',
    strategic: '워크플로우를 설계: 시장 검증(AI) → 유닛 이코노믹스(사람 판단) → 경쟁 분석(AI) → 스토리라인 편집(사람). 어디서 AI를 쓰고 어디서 사람이 판단할지를 먼저 설계.',
    result: 'AI에게 전부 맡기는 대신 → AI와 사람의 역할을 설계하고 시작',
  },
];

export function UseCaseFlow() {
  const [activeKey, setActiveKey] = useState('redefine');
  const active = scenes.find((s) => s.key === activeKey)!;

  return (
    <section className="border-t border-[var(--border-subtle)]">
      <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        {/* Header */}
        <div className="max-w-xl mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8 bg-[var(--border)]" />
            <span className="text-[12px] font-medium tracking-[0.2em] uppercase text-[var(--text-tertiary)]">
              Use cases
            </span>
          </div>
          <h2 className="text-[32px] md:text-[40px] font-bold text-[var(--text-primary)] leading-tight tracking-tight">
            이런 상황에서 쓰세요
          </h2>
        </div>

        {/* Scene selector */}
        <div className="flex gap-3 mb-10 overflow-x-auto pb-2">
          {scenes.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveKey(s.key)}
              className={`shrink-0 px-5 py-3 rounded-xl text-[14px] font-medium transition-all duration-200 cursor-pointer border ${
                activeKey === s.key
                  ? 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-primary)] shadow-sm'
                  : 'border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--border)]'
              }`}
            >
              {s.tab}
            </button>
          ))}
        </div>

        {/* Scene content */}
        <div className="animate-fade-in" key={activeKey}>
          {/* Situation */}
          <p className="text-[16px] md:text-[18px] text-[var(--text-secondary)] leading-relaxed max-w-2xl mb-8">
            {active.situation}
          </p>

          {/* Before/After */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] p-6">
              <p className="text-[11px] font-bold tracking-[0.15em] uppercase text-red-400 mb-3">
                AI에게 바로 시키면
              </p>
              <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                {active.naive}
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--surface)] border-2 border-[var(--accent)]/20 p-6">
              <p className="text-[11px] font-bold tracking-[0.15em] uppercase text-[var(--accent)] mb-3">
                Overture를 거치면
              </p>
              <p className="text-[14px] text-[var(--text-primary)] leading-relaxed font-medium">
                {active.strategic}
              </p>
            </div>
          </div>

          {/* Result */}
          <div className="flex items-center gap-3">
            <div className="h-px w-6 bg-[var(--accent)]" />
            <p className="text-[14px] font-semibold text-[var(--accent)]">
              {active.result}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

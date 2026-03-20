'use client';

import Link from 'next/link';
import { Layers, Map, Users, RefreshCw, ArrowRight } from 'lucide-react';

const steps = [
  {
    number: '01',
    title: '문제 재정의',
    metaphor: '악보 해석',
    desc: '숨겨진 전제를 찾고, 진짜 질문을 재정의합니다',
    href: '/workspace?step=decompose',
    icon: Layers,
    color: '#2d4a7c',
    bg: '#eaeff8',
  },
  {
    number: '02',
    title: '실행 설계',
    metaphor: '편곡',
    desc: 'AI와 사람의 역할을 나누고 워크플로우를 설계합니다',
    href: '/workspace?step=orchestrate',
    icon: Map,
    color: '#8b6914',
    bg: '#fef4e4',
  },
  {
    number: '03',
    title: '사전 검증',
    metaphor: '리허설',
    desc: '이해관계자의 반응을 미리 시뮬레이션합니다',
    href: '/workspace?step=persona-feedback',
    icon: Users,
    color: '#6b4c9a',
    bg: '#f5f0fa',
  },
  {
    number: '04',
    title: '피드백 반영',
    metaphor: '합주 연습',
    desc: '피드백을 반영하며 반복, 수렴하면 실행합니다',
    href: '/workspace?step=refinement-loop',
    icon: RefreshCw,
    color: '#2d6b2d',
    bg: '#eaf5ea',
  },
];

export function ProcessFlow() {
  return (
    <section className="border-t border-[var(--border-subtle)]">
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-[28px] md:text-[36px] font-extrabold text-[var(--text-primary)] tracking-tight">
            네 단계로 작동합니다
          </h2>
          <p className="mt-2 text-[15px] text-[var(--text-secondary)] max-w-3xl mx-auto">
            오케스트라가 공연 전에 악보 해석, 편곡, 리허설, 합주를 거치듯 — Overture는 실행 전에 판단을 설계합니다.
          </p>
        </div>

        {/* 4 steps — cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <Link key={step.number} href={step.href} className="group">
                <div className="h-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-1 hover:border-[var(--border)]">
                  {/* Number + icon */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[28px] font-extrabold leading-none select-none" style={{ color: `${step.color}30` }}>
                      {step.number}
                    </span>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: step.bg }}>
                      <Icon size={16} style={{ color: step.color }} strokeWidth={2} />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-[17px] font-bold text-[var(--text-primary)] tracking-tight group-hover:text-[var(--accent)] transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-[12px] font-semibold uppercase tracking-wider mt-0.5 mb-2" style={{ color: step.color }}>
                    {step.metaphor}
                  </p>

                  {/* Description */}
                  <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

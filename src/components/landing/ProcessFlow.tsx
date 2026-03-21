'use client';

import Link from 'next/link';
import { Layers, Map, Users, RefreshCw } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

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

function StepCard({ step, delay }: { step: typeof steps[number]; delay: number }) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ delay });
  const Icon = step.icon;

  return (
    <div ref={ref} className={`h-full ${isVisible ? 'scroll-visible' : 'scroll-hidden'}`}>
      <Link href={step.href} className="group block h-full">
        <div className="h-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 md:p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-1 hover:border-[var(--border)]">
          <div className="flex items-center gap-3 mb-3 md:mb-4">
            <span className="text-[24px] md:text-[28px] font-extrabold leading-none select-none" style={{ color: step.color, opacity: 0.2 }}>
              {step.number}
            </span>
            <div className="w-7 md:w-8 h-7 md:h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: step.bg }}>
              <Icon size={15} style={{ color: step.color }} strokeWidth={2} />
            </div>
          </div>

          <h3 className="text-[16px] md:text-[17px] font-bold text-[var(--text-primary)] tracking-tight group-hover:text-[var(--accent)] transition-colors">
            {step.title}
          </h3>
          <p className="text-[11px] md:text-[12px] font-semibold uppercase tracking-wider mt-0.5 mb-2" style={{ color: step.color }}>
            {step.metaphor}
          </p>

          <p className="text-[13px] md:text-[14px] text-[var(--text-secondary)] leading-relaxed">
            {step.desc}
          </p>
        </div>
      </Link>
    </div>
  );
}

export function ProcessFlow() {
  return (
    <section>
      <div className="max-w-5xl mx-auto px-5 md:px-6 py-12 md:py-16">
        <div className="text-center mb-8 md:mb-10">
          <h2
            className="text-[24px] md:text-[36px] font-bold text-[var(--text-primary)] tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            네 단계로 작동합니다
          </h2>
          <p className="mt-2 text-[13px] md:text-[15px] text-[var(--text-secondary)] max-w-3xl mx-auto">
            오케스트라가 공연 전에 악보 해석, 편곡, 리허설, 합주를 거치듯 — Overture는 실행 전에 판단을 설계합니다.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3">
          {steps.map((step, i) => (
            <StepCard key={step.number} step={step} delay={i * 100} />
          ))}
        </div>
      </div>
    </section>
  );
}

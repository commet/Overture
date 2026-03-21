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
  },
  {
    number: '02',
    title: '실행 설계',
    metaphor: '편곡',
    desc: 'AI와 사람의 역할을 나누고 워크플로우를 설계합니다',
    href: '/workspace?step=orchestrate',
    icon: Map,
    color: '#8b6914',
  },
  {
    number: '03',
    title: '사전 검증',
    metaphor: '리허설',
    desc: '이해관계자의 반응을 미리 시뮬레이션합니다',
    href: '/workspace?step=persona-feedback',
    icon: Users,
    color: '#6b4c9a',
  },
  {
    number: '04',
    title: '피드백 반영',
    metaphor: '합주 연습',
    desc: '피드백을 반영하며 반복, 수렴하면 실행합니다',
    href: '/workspace?step=refinement-loop',
    icon: RefreshCw,
    color: '#2d6b2d',
  },
];

function StepRow({ step, delay, isLast }: { step: typeof steps[number]; delay: number; isLast: boolean }) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ delay });
  const Icon = step.icon;

  return (
    <div ref={ref} className={isVisible ? 'scroll-visible' : 'scroll-hidden'}>
      <Link href={step.href} className="group flex items-start gap-4 md:gap-5">
        {/* Number + line */}
        <div className="flex flex-col items-center shrink-0">
          <div
            className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-[14px] md:text-[16px] font-extrabold transition-colors group-hover:shadow-md"
            style={{ backgroundColor: `${step.color}12`, color: step.color }}
          >
            {step.number}
          </div>
          {!isLast && (
            <div className="w-px flex-1 min-h-[32px] mt-2" style={{ backgroundColor: `${step.color}20` }} />
          )}
        </div>

        {/* Content */}
        <div className="pt-1 pb-6 md:pb-8 flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            <h3 className="text-[16px] md:text-[18px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
              {step.title}
            </h3>
            <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-wider" style={{ color: step.color }}>
              {step.metaphor}
            </span>
            <Icon size={14} className="text-[var(--text-tertiary)] group-hover:text-[var(--accent)] transition-colors" />
          </div>
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
      <div className="max-w-2xl mx-auto px-5 md:px-6 py-12 md:py-16">
        <div className="text-center mb-8 md:mb-10">
          <h2
            className="text-[24px] md:text-[36px] font-bold text-[var(--text-primary)] tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            네 단계로 작동합니다
          </h2>
          <p className="mt-2 text-[13px] md:text-[15px] text-[var(--text-secondary)]">
            오케스트라가 악보 해석, 편곡, 리허설, 합주를 거치듯.
          </p>
        </div>

        <div>
          {steps.map((step, i) => (
            <StepRow key={step.number} step={step} delay={i * 100} isLast={i === steps.length - 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

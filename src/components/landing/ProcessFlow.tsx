'use client';

import Link from 'next/link';
import { Layers, Map, Users, RefreshCw } from 'lucide-react';

const steps = [
  {
    number: '01',
    metaphor: '악보 해석',
    title: '문제 재정의',
    desc: '숨겨진 전제를 찾고, 진짜 질문을 재정의합니다',
    href: '/tools/decompose',
    icon: Layers,
    color: '#2d4a7c',
    bg: 'var(--ai)',
  },
  {
    number: '02',
    metaphor: '편곡',
    title: '실행 설계',
    desc: 'AI와 사람의 역할을 나누고 워크플로우를 설계합니다',
    href: '/tools/orchestrate',
    icon: Map,
    color: '#8b6914',
    bg: 'var(--human)',
  },
  {
    number: '03',
    metaphor: '리허설',
    title: '사전 검증',
    desc: '이해관계자의 반응을 미리 시뮬레이션합니다',
    href: '/tools/persona-feedback',
    icon: Users,
    color: '#6b4c9a',
    bg: '#f5f0fa',
  },
  {
    number: '04',
    metaphor: '합주 연습',
    title: '피드백 반영',
    desc: '피드백을 반영하며 반복, 수렴하면 무대에 올립니다',
    href: '/tools/refinement-loop',
    icon: RefreshCw,
    color: '#2d6b2d',
    bg: 'var(--collab)',
  },
];

export function ProcessFlow() {
  return (
    <section className="border-t border-[var(--border-subtle)]">
      <div className="max-w-5xl mx-auto px-6 py-10 md:py-14">
        {/* Header */}
        <div className="max-w-xl mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px w-8 bg-[var(--border)]" />
            <span className="text-[12px] font-medium tracking-[0.2em] uppercase text-[var(--text-tertiary)]">
              The journey
            </span>
          </div>
          <h2 className="text-[28px] md:text-[36px] font-bold text-[var(--text-primary)] leading-tight tracking-tight">
            공연까지의 여정
          </h2>
          <p className="mt-2 text-[15px] text-[var(--text-secondary)]">
            과제를 받은 순간부터 보고까지, 네 단계의 준비.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-[11px] top-3 bottom-3 w-px bg-[var(--border)] md:hidden" />
          <div className="hidden md:block absolute left-0 right-0 top-[11px] h-px bg-[var(--border)]" />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-0">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <Link key={step.number} href={step.href} className="group relative">
                  <div className="flex items-start gap-4 md:flex-col md:gap-0 py-3 md:py-0 md:pr-5">
                    {/* Dot on timeline */}
                    <div
                      className="relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 md:mb-4 ring-[3px] ring-[var(--bg)]"
                      style={{ backgroundColor: step.bg }}
                    >
                      <Icon size={12} style={{ color: step.color }} strokeWidth={2} />
                    </div>

                    {/* Content */}
                    <div>
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span
                          className="text-[20px] font-extrabold leading-none select-none"
                          style={{ color: `${step.color}20` }}
                        >
                          {step.number}
                        </span>
                        <span
                          className="text-[10px] font-semibold tracking-[0.1em] uppercase"
                          style={{ color: step.color }}
                        >
                          {step.metaphor}
                        </span>
                      </div>
                      <h3 className="text-[16px] font-bold text-[var(--text-primary)] tracking-tight group-hover:text-[var(--accent)] transition-colors">
                        {step.title}
                      </h3>
                      <p className="text-[13px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

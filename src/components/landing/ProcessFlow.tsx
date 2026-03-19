'use client';

import Link from 'next/link';
import { Layers, Map, RefreshCw, Users } from 'lucide-react';

interface Movement {
  number: string;
  orchestraMetaphor: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const movements: Movement[] = [
  {
    number: '01',
    orchestraMetaphor: '악보 해석',
    title: '문제 재정의',
    description: '주어진 과제 뒤에 숨은 진짜 질문을 찾아냅니다. 경영진이 "중국 진출 검토하라"고 할 때, 진짜 문제가 중국인지 기존 수익 구조인지를 먼저 따져봅니다.',
    href: '/tools/decompose',
    icon: <Layers size={20} strokeWidth={1.5} />,
    color: 'text-[#2d4a7c]',
    bgColor: 'bg-[var(--ai)]',
  },
  {
    number: '02',
    orchestraMetaphor: '편곡',
    title: '실행 설계',
    description: '누가 어떤 순서로 움직일지 전체 흐름을 그립니다. AI에게 맡길 것과 사람이 판단할 것의 경계를 설계합니다.',
    href: '/tools/orchestrate',
    icon: <Map size={20} strokeWidth={1.5} />,
    color: 'text-[#8b6914]',
    bgColor: 'bg-[var(--human)]',
  },
  {
    number: '03',
    orchestraMetaphor: '리허설',
    title: '사전 검증',
    description: '본 무대에 오르기 전, 이해관계자의 반응을 시뮬레이션합니다. CFO가 뭘 물어볼지, CTO가 어디를 짚을지 미리 연습합니다.',
    href: '/tools/persona-feedback',
    icon: <Users size={20} strokeWidth={1.5} />,
    color: 'text-[#6b4c9a]',
    bgColor: 'bg-[#f5f0fa]',
  },
  {
    number: '04',
    orchestraMetaphor: '합주 연습',
    title: '피드백 반영',
    description: '이해관계자의 지적을 반영하여 반복적으로 개선합니다. 하모니가 맞을 때까지 연습하고, 수렴하면 무대에 올립니다.',
    href: '/tools/refinement-loop',
    icon: <RefreshCw size={20} strokeWidth={1.5} />,
    color: 'text-[#2d6b2d]',
    bgColor: 'bg-[var(--collab)]',
  },
];

export function ProcessFlow() {
  return (
    <section className="border-t border-[var(--border-subtle)]">
      <div className="max-w-5xl mx-auto px-6 py-28 md:py-36">
        {/* Section header — left aligned */}
        <div className="max-w-xl mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px w-8 bg-[var(--border)]" />
            <span className="text-[12px] font-medium tracking-[0.2em] uppercase text-[var(--text-tertiary)]">
              The journey
            </span>
          </div>
          <h2 className="text-[32px] md:text-[40px] font-bold text-[var(--text-primary)] leading-tight tracking-tight">
            공연까지의 여정
          </h2>
          <p className="mt-4 text-[16px] text-[var(--text-secondary)] leading-relaxed">
            무대에 오르기까지, 네 단계의 준비.
          </p>
        </div>

        {/* Movements grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {movements.map((m) => (
            <Link
              key={m.number}
              href={m.href}
              className="group block"
            >
              <div className="h-full border border-[var(--border-subtle)] rounded-2xl p-7 bg-[var(--surface)] transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-[var(--border)]">
                {/* Number + Metaphor */}
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-[32px] font-extrabold text-[var(--primary)]/8 leading-none select-none">
                    {m.number}
                  </span>
                  <div>
                    <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-[var(--text-tertiary)]">
                      {m.orchestraMetaphor}
                    </p>
                    <h3 className="text-[18px] font-bold text-[var(--text-primary)] tracking-tight">
                      {m.title}
                    </h3>
                  </div>
                </div>

                {/* Description */}
                <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed mb-6">
                  {m.description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-5 border-t border-[var(--border-subtle)]">
                  <div className={`w-9 h-9 rounded-xl ${m.bgColor} ${m.color} flex items-center justify-center`}>
                    {m.icon}
                  </div>
                  <span className="text-[13px] font-medium text-[var(--accent)] opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all duration-300">
                    시작하기 &rarr;
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

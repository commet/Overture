'use client';

import Link from 'next/link';
import { Layers, GitMerge, Map, Users } from 'lucide-react';

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
    title: '주제 파악',
    description: '주어진 과제 뒤에 숨은 진짜 질문을 찾아냅니다. 경영진이 "중국 진출 검토하라"고 할 때, 진짜 문제가 중국인지 기존 수익 구조인지를 먼저 따져봅니다.',
    href: '/tools/decompose',
    icon: <Layers size={20} strokeWidth={1.5} />,
    color: 'text-[#2d4a7c]',
    bgColor: 'bg-[var(--ai)]',
  },
  {
    number: '02',
    orchestraMetaphor: '파트 편성',
    title: '역할 편성',
    description: '누가 어떤 순서로 움직일지 전체 흐름을 그립니다. AI에게 맡길 것과 사람이 판단할 것의 경계를 설계합니다.',
    href: '/tools/orchestrate',
    icon: <Map size={20} strokeWidth={1.5} />,
    color: 'text-[#8b6914]',
    bgColor: 'bg-[var(--human)]',
  },
  {
    number: '03',
    orchestraMetaphor: '파트 조율',
    title: '조율',
    description: '서로 다른 관점들 사이에서 하나의 방향을 잡아냅니다. 여러 AI가 다른 답을 낼 때, 내 맥락에서 하나의 결론을 만듭니다.',
    href: '/tools/synthesize',
    icon: <GitMerge size={20} strokeWidth={1.5} />,
    color: 'text-[#2d6b2d]',
    bgColor: 'bg-[var(--collab)]',
  },
  {
    number: '04',
    orchestraMetaphor: '무대 리허설',
    title: '리허설',
    description: '본 무대에 오르기 전, 이해관계자의 반응을 시뮬레이션합니다. CFO가 뭘 물어볼지, CTO가 어디를 짚을지 미리 연습합니다.',
    href: '/tools/persona-feedback',
    icon: <Users size={20} strokeWidth={1.5} />,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
  },
];

export function ProcessFlow() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-24 md:py-32">
      {/* Section header */}
      <div className="max-w-xl mb-16">
        <p className="text-[12px] font-medium tracking-[0.2em] uppercase text-[var(--accent)] mb-4">
          Four movements
        </p>
        <h2 className="text-[28px] md:text-[36px] font-bold text-[var(--text-primary)] leading-tight tracking-tight">
          서곡의 네 악장
        </h2>
        <p className="mt-4 text-[16px] text-[var(--text-secondary)] leading-relaxed">
          오케스트라에서 서곡은 본 공연 전에 전체 음악의 주제를 미리 제시하는 곡입니다.
          Overture는 에이전트가 실행하기 전, 판단의 구조를 네 단계로 설계합니다.
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
            <div className="h-full border border-[#eceef4] rounded-2xl p-7 bg-[var(--surface)] transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-[var(--accent)]/30">
              {/* Number + Metaphor */}
              <div className="flex items-center gap-3 mb-5">
                <span className="text-[32px] font-extrabold text-[var(--primary)]/10 leading-none select-none">
                  {m.number}
                </span>
                <div>
                  <p className="text-[11px] font-medium tracking-[0.15em] uppercase text-[#a0a4b8]">
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
              <div className="flex items-center justify-between pt-5 border-t border-[#eceef4]">
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
    </section>
  );
}

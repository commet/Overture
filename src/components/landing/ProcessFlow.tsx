'use client';

import Link from 'next/link';
import { Layers, GitMerge, Map, Users, ArrowRight } from 'lucide-react';

interface ProcessStep {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  before: string;
  after: string;
  href: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const steps: ProcessStep[] = [
  {
    icon: <Layers size={18} strokeWidth={1.5} />,
    title: '주제 파악',
    subtitle: '풀어야 할 진짜 문제 찾기',
    before: '"경쟁사 분석해줘"라고 AI에게 바로 시킴',
    after: '"경쟁사보다 우리 고객의 미충족 니즈가 먼저 아닌가?" 발견',
    href: '/tools/decompose',
    color: 'text-[#2d4a7c]',
    bgColor: 'bg-[var(--ai)]',
    borderColor: 'border-[#2d4a7c]/10',
  },
  {
    icon: <Map size={18} strokeWidth={1.5} />,
    title: '역할 편성',
    subtitle: 'AI와 사람의 역할 경계 긋기',
    before: '모든 걸 AI에게 맡기거나, 모든 걸 직접 함',
    after: '"시장 데이터 수집은 AI, 내부 정치 판단은 내가, 3단계에서 검증"',
    href: '/tools/orchestrate',
    color: 'text-[#8b6914]',
    bgColor: 'bg-[var(--human)]',
    borderColor: 'border-[#8b6914]/10',
  },
  {
    icon: <GitMerge size={18} strokeWidth={1.5} />,
    title: '조율',
    subtitle: '서로 다른 AI 결과에서 내 결론 내리기',
    before: '"종합해줘"라고 다시 AI에게 맡기면 표면적 합의만 남음',
    after: '쟁점별로 왜 다른지 분석하고, 내 맥락에서 하나의 결론 도출',
    href: '/tools/synthesize',
    color: 'text-[#2d6b2d]',
    bgColor: 'bg-[var(--collab)]',
    borderColor: 'border-[#2d6b2d]/10',
  },
  {
    icon: <Users size={18} strokeWidth={1.5} />,
    title: '리허설',
    subtitle: '보내기 전에 상대방 반응 시뮬레이션',
    before: '보고서를 보냈는데 "그래서 ROI가 얼마야?"에 막힘',
    after: 'CFO 시점 사전 검증 후 약점 보완. 실제 반응 기록으로 점점 정확해짐',
    href: '/tools/persona-feedback',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-700/10',
  },
];

export function ProcessFlow() {
  return (
    <section className="py-16">
      <div className="text-center mb-12">
        <p className="text-[12px] font-semibold text-[var(--accent)] tracking-widest uppercase mb-3">
          Four movements
        </p>
        <h2 className="text-[22px] md:text-[26px] font-bold text-[var(--text-primary)] tracking-tight">
          네 단계의 사고 프로세스
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] mt-2 max-w-md mx-auto">
          AI에게 시키기 전에 거쳐야 할 판단의 구조
        </p>
      </div>

      <div className="space-y-4 max-w-2xl mx-auto">
        {steps.map((step, i) => (
          <Link
            key={i}
            href={step.href}
            className="block group"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className={`rounded-[var(--radius-lg)] border ${step.borderColor} bg-[var(--surface)] overflow-hidden shadow-[var(--shadow-xs)] transition-all duration-300 ease-[var(--ease-spring)] group-hover:shadow-[var(--shadow-md)] group-hover:-translate-y-1 group-hover:border-[var(--accent)]/30`}>
              {/* Header */}
              <div className="flex items-center gap-3.5 px-5 py-4">
                <div className={`w-10 h-10 rounded-[var(--radius-md)] ${step.bgColor} ${step.color} flex items-center justify-center shrink-0`}>
                  {step.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[11px] font-bold text-[var(--text-tertiary)]">{String(i + 1).padStart(2, '0')}</span>
                    <h3 className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight">{step.title}</h3>
                    <span className="text-[12px] text-[var(--border)]">|</span>
                    <span className={`text-[12px] font-medium ${step.color}`}>{step.subtitle}</span>
                  </div>
                </div>
                <ArrowRight size={15} className="text-[var(--text-tertiary)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all duration-300 shrink-0" />
              </div>

              {/* Before/After comparison */}
              <div className="grid grid-cols-2 border-t border-[var(--border-subtle)]">
                <div className="px-5 py-3 border-r border-[var(--border-subtle)]">
                  <p className="text-[10px] font-bold text-red-400/70 mb-1 tracking-wider uppercase">Without</p>
                  <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">{step.before}</p>
                </div>
                <div className={`px-5 py-3 ${step.bgColor}/30`}>
                  <p className={`text-[10px] font-bold ${step.color}/70 mb-1 tracking-wider uppercase`}>With Overture</p>
                  <p className="text-[12px] text-[var(--text-primary)] leading-relaxed font-medium">{step.after}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

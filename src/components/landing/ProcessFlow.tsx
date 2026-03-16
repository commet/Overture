'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Layers, GitMerge, Map, Users, ArrowRight, ChevronDown } from 'lucide-react';

interface ProcessStep {
  number: number;
  icon: React.ReactNode;
  title: string;
  action: string;
  detail: string;
  example: string;
  href: string;
  color: string;
  bgColor: string;
}

const steps: ProcessStep[] = [
  {
    number: 1,
    icon: <Layers size={18} />,
    title: '분해',
    action: '진짜 질문 찾기',
    detail: '받은 과제 이면의 숨겨진 질문을 AI가 찾아내고, 당신이 선택합니다.',
    example: '"경쟁사 분석" → "우리 제품의 미충족 니즈 파악이 먼저 아닌가?"',
    href: '/tools/decompose',
    color: 'text-[#2d4a7c]',
    bgColor: 'bg-[var(--ai)]',
  },
  {
    number: 2,
    icon: <Map size={18} />,
    title: '설계',
    action: 'AI/사람 역할 배정',
    detail: 'AI가 워크플로우를 자동 설계하고, 체크포인트를 배치합니다.',
    example: '"시장 조사는 AI, 내부 정치 판단은 사람, 3단계에서 검증"',
    href: '/tools/orchestrate',
    color: 'text-[#8b6914]',
    bgColor: 'bg-[var(--human)]',
  },
  {
    number: 3,
    icon: <GitMerge size={18} />,
    title: '합성',
    action: '하나의 판단으로',
    detail: '여러 AI 결과의 합의점과 쟁점을 분석하고, 쟁점에서 당신이 판단합니다.',
    example: '"ChatGPT는 500억, Claude는 300억 → 왜 다른지 분석 → 내 판단: 400억"',
    href: '/tools/synthesize',
    color: 'text-[#2d6b2d]',
    bgColor: 'bg-[var(--collab)]',
  },
  {
    number: 4,
    icon: <Users size={18} />,
    title: '검증',
    action: '이해관계자 시뮬레이션',
    detail: '"김 CFO라면 뭐라고 할까?" — 보내기 전에 반응을 미리 확인합니다.',
    example: '"ROI 근거가 부족합니다" → 수정 후 보고 → 실제 반응 기록 → 점점 정확해짐',
    href: '/tools/persona-feedback',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
  },
];

export function ProcessFlow() {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  return (
    <section className="py-8">
      <div className="text-center mb-8">
        <h2 className="text-[18px] font-bold text-[var(--text-primary)]">
          하나의 사고 프로세스, 네 단계
        </h2>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">
          각 도구는 독립적으로도, 연결해서도 사용할 수 있습니다
        </p>
      </div>

      {/* Process flow - connected steps */}
      <div className="relative">
        {/* Connection line (desktop) */}
        <div className="hidden md:block absolute top-8 left-[calc(12.5%+16px)] right-[calc(12.5%+16px)] h-0.5 bg-[var(--border)]" />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-2">
          {steps.map((step, i) => (
            <div key={step.number} className="relative">
              {/* Mobile connector */}
              {i > 0 && (
                <div className="md:hidden flex justify-center -mt-2 mb-2">
                  <div className="w-0.5 h-4 bg-[var(--border)]" />
                </div>
              )}

              {/* Step node */}
              <div
                className="group cursor-pointer"
                onClick={() => setExpandedStep(expandedStep === i ? null : i)}
              >
                {/* Number + icon circle */}
                <div className="flex md:justify-center mb-3">
                  <div className={`relative z-10 w-10 h-10 rounded-full ${step.bgColor} ${step.color} flex items-center justify-center font-bold text-[14px] shadow-sm ring-4 ring-[var(--bg)]`}>
                    {step.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="md:text-center px-2">
                  <div className="flex md:justify-center items-center gap-1.5 mb-0.5">
                    <span className="text-[11px] font-bold text-[var(--text-secondary)]">STEP {step.number}</span>
                  </div>
                  <h3 className="text-[15px] font-bold text-[var(--text-primary)]">{step.title}</h3>
                  <p className={`text-[12px] font-semibold ${step.color} mt-0.5`}>{step.action}</p>
                </div>

                {/* Expand indicator */}
                <div className="flex md:justify-center mt-2">
                  <ChevronDown
                    size={14}
                    className={`text-[var(--text-secondary)] transition-transform duration-200 ${
                      expandedStep === i ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Expanded detail */}
              {expandedStep === i && (
                <div className="mt-2 mx-1 animate-fade-in">
                  <div className={`rounded-xl p-4 ${step.bgColor} border border-opacity-20`}>
                    <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{step.detail}</p>
                    <div className="mt-3 bg-white/60 rounded-lg px-3 py-2">
                      <p className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1">예시</p>
                      <p className="text-[12px] text-[var(--text-primary)] italic">{step.example}</p>
                    </div>
                    <Link
                      href={step.href}
                      className={`inline-flex items-center gap-1 mt-3 text-[12px] font-semibold ${step.color} hover:underline`}
                    >
                      사용해보기 <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

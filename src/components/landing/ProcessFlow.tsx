'use client';

import Link from 'next/link';
import { MessageSquare, Sliders, UserCheck } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { CrescendoHairpin } from '@/components/ui/MusicalElements';

const steps = [
  {
    number: '01',
    title: '문제를 던져라',
    desc: '30초 안에 기획안 뼈대와 숨겨진 전제가 나온다',
    detail: '질문 하나면 충분합니다. 뭘 써야 할지 모르는 상태에서도 바로 시작할 수 있습니다.',
    pain: '프롬프트 짜는 시간만 해도 한참인데, 여기선 고민을 그대로 던지면 됩니다.',
    href: '/workspace',
    icon: MessageSquare,
    color: '#2d4a7c',
  },
  {
    number: '02',
    title: '질문에 답해라',
    desc: '답할 때마다 기획안이 진화한다',
    detail: '2-3개 질문에 답하면 전제가 검증되고, 구조가 날카로워집니다. 매 답변이 결과에 반영됩니다.',
    pain: '한 달 고민해서 프롬프트 넣으면 10분 컷이라는데 — 그 고민을 여기서 압축합니다.',
    href: '/workspace',
    icon: Sliders,
    color: '#8b6914',
  },
  {
    number: '03',
    title: '검증해봐라',
    desc: '판단자가 뭐라고 할지 시뮬레이션',
    detail: '대표님, 팀장님, 투자자... 실제로 보여주기 전에 반응을 미리 확인하고 약점을 고칩니다.',
    pain: 'CEO한테 그대로 보고할 수 있는지 — 보내기 전에 먼저 확인합니다.',
    href: '/workspace',
    icon: UserCheck,
    color: '#6b4c9a',
  },
];

function StepRow({ step, delay, isLast }: { step: typeof steps[number] & { pain?: string }; delay: number; isLast: boolean }) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ delay });
  const Icon = step.icon;

  return (
    <div ref={ref} className={isVisible ? 'scroll-visible' : 'scroll-hidden'}>
      <Link href={step.href} className="group flex items-start gap-4 md:gap-5">
        {/* Number + connector */}
        <div className="flex flex-col items-center shrink-0">
          <div
            className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-[14px] md:text-[16px] font-extrabold transition-all duration-300 shadow-[var(--shadow-sm)] group-hover:shadow-[var(--glow-gold)]"
            style={{ backgroundColor: `${step.color}12`, color: step.color }}
          >
            {step.number}
          </div>
          {!isLast && (
            <div className="flex flex-col items-center mt-2 min-h-[32px]">
              <CrescendoHairpin width={16} height={24} color={`${step.color}40`} className="rotate-90" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="pt-1 pb-6 md:pb-8 flex-1 min-w-0">
          <h3 className="text-[16px] md:text-[18px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors mb-1">
            {step.title}
          </h3>
          <p className="text-[14px] md:text-[15px] font-medium text-[var(--accent)] mb-1.5">
            {step.desc}
          </p>
          <p className="text-[13px] md:text-[14px] text-[var(--text-secondary)] leading-relaxed">
            {step.detail}
          </p>
          {step.pain && (
            <p className="text-[11px] text-[var(--text-tertiary)] italic mt-1.5 leading-relaxed">
              {step.pain}
            </p>
          )}
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
          <h2 className="text-display-lg text-[var(--text-primary)]">
            세 번이면 <span className="text-gold-gradient">충분합니다</span>
          </h2>
          <p className="mt-2 text-[13px] md:text-[15px] text-[var(--text-secondary)]">
            던지고, 채우고, 검증하기. 매 단계마다 바로 결과가 나옵니다.
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

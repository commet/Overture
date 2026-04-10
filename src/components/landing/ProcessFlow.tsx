'use client';

import { MessageSquare, Sliders, UserCheck } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { CrescendoHairpin } from '@/components/ui/MusicalElements';
import { useLocale } from '@/hooks/useLocale';

const steps_ko = [
  { number: '01', title: '고민 입력', desc: '뭘 써야 할지 모르는 상태에서도 바로 시작할 수 있습니다.', detail: '프롬프트를 고민할 필요 없이, 상황을 그대로 던지면 뼈대가 잡힙니다.', icon: MessageSquare, color: '#2d4a7c' },
  { number: '02', title: '생각 구체화', desc: '2-3개 질문에 답하면 전제가 검증되고, 결과물이 날카로워집니다.', detail: '매 답변이 문서에 반영됩니다. 답할수록 정밀해집니다.', icon: Sliders, color: '#8b6914' },
  { number: '03', title: '사전 검증', desc: '대표님, 팀장님, 투자자 — 실제로 보여주기 전에 반응을 미리 봅니다.', detail: '약점이 짚이고, 보완안이 자동으로 반영됩니다.', icon: UserCheck, color: '#6b4c9a' },
];

const steps_en = [
  { number: '01', title: 'Drop your problem', desc: "You can start even when you have no idea what to write.", detail: "No prompt engineering. Just describe your situation and get a structured outline.", icon: MessageSquare, color: '#2d4a7c' },
  { number: '02', title: 'Sharpen your thinking', desc: "Answer 2-3 questions and watch your assumptions get validated.", detail: "Every answer refines the document. The more you add, the sharper it gets.", icon: Sliders, color: '#8b6914' },
  { number: '03', title: 'Pre-validate', desc: "CEO, team lead, investor — see their reaction before you present.", detail: "Weak spots are flagged and fixes are applied automatically.", icon: UserCheck, color: '#6b4c9a' },
];

function StepRow({ step, delay, isLast }: { step: typeof steps_ko[number]; delay: number; isLast: boolean }) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ delay });
  const Icon = step.icon;

  return (
    <div ref={ref} className={isVisible ? 'scroll-visible' : 'scroll-hidden'}>
      <div className="flex items-start gap-4 md:gap-5">
        {/* Number + connector */}
        <div className="flex flex-col items-center shrink-0">
          <div
            className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-[14px] md:text-[16px] font-extrabold shadow-[var(--shadow-sm)]"
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

        {/* Content — desc + detail only, no pain */}
        <div className="pt-1 pb-6 md:pb-8 flex-1 min-w-0">
          <h3 className="text-[16px] md:text-[18px] font-bold text-[var(--text-primary)] mb-1">
            {step.title}
          </h3>
          <p className="text-[14px] md:text-[15px] text-[var(--text-primary)] leading-relaxed">
            {step.desc}
          </p>
          <p className="text-[13px] md:text-[14px] text-[var(--text-secondary)] leading-relaxed mt-1">
            {step.detail}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ProcessFlow() {
  const locale = useLocale();
  const steps = locale === 'ko' ? steps_ko : steps_en;
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;

  return (
    <section>
      <div className="max-w-2xl mx-auto px-5 md:px-6 py-12 md:py-16">
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-display-lg text-[var(--text-primary)]">
            {L('세 번이면 ', 'Three steps. ')}<span className="text-gold-gradient">{L('충분합니다', "That's all.")}</span>
          </h2>
          <p className="mt-2 text-[13px] md:text-[15px] text-[var(--text-secondary)]">
            {L('던지고, 채우고, 검증하기.', 'Drop, refine, validate.')}
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

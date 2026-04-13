'use client';

import { MessageSquare, Sliders, UserCheck, Sparkles } from 'lucide-react';
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

/* ─── Curated example output — shows what the result actually looks like ─── */
const EXAMPLE_KO = {
  input: '대표님이 2주 안에 신사업 기획안을 만들어오라고 했어',
  realQuestion: "대표님이 진짜 원하는 게 '새 사업 아이템'인가, 아니면 '성장 스토리'인가?",
  assumptions: [
    '대표님은 이미 원하는 방향을 갖고 있다',
    "'2주'는 협상 가능한 정치적 데드라인이다",
    '경쟁사 분석이 가장 중요한 콘텐츠일 것이다',
  ],
  skeleton: [
    "먼저 — 대표님의 '왜'를 5분 미팅으로 확인",
    '다음 — 이미 검토됐을 옵션 체크해서 중복 피하기',
    '그다음 — 차별화 가설 2~3개로 빠르게 좁히기',
    '마지막 — 실행 가능한 첫 30일 그림 그리기',
  ],
};

const EXAMPLE_EN = {
  input: 'My CEO wants a new product proposal in 2 weeks',
  realQuestion: 'Does my CEO actually want a new product — or a growth story?',
  assumptions: [
    'The CEO already has a direction in mind',
    '"2 weeks" is a negotiable political deadline, not literal',
    'Competitor analysis is what they\'ll care about most',
  ],
  skeleton: [
    'First — confirm the CEO\'s "why" in a 5-min sync',
    "Next — check what's already been explored to avoid repeats",
    'Then — narrow to 2-3 differentiation hypotheses, test fast',
    'Finally — show a concrete first 30-day plan',
  ],
};

function ExampleOutput() {
  const locale = useLocale();
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  const ex = locale === 'ko' ? EXAMPLE_KO : EXAMPLE_EN;
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ delay: 300 });

  return (
    <div ref={ref} className={isVisible ? 'scroll-visible' : 'scroll-hidden'}>
      <div className="mt-10 md:mt-14">
        {/* Section label */}
        <div className="text-center mb-5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--accent)] uppercase tracking-[0.18em]">
            <Sparkles size={11} />
            {L('이런 결과가 나옵니다', 'Here\'s what you get')}
          </span>
        </div>

        {/* Input echo */}
        <div className="flex items-start gap-2.5 mb-3 px-1">
          <div className="shrink-0 w-6 h-6 rounded-full bg-[var(--text-primary)]/8 flex items-center justify-center text-[10px] font-bold text-[var(--text-secondary)]">
            {L('나', 'Me')}
          </div>
          <p className="text-[13px] md:text-[14px] text-[var(--text-secondary)] italic leading-snug pt-1">
            &ldquo;{ex.input}&rdquo;
          </p>
        </div>

        {/* Output card */}
        <div className="rounded-2xl md:rounded-[1.5rem] p-[1px] bg-gradient-to-b from-[var(--accent)]/25 to-transparent">
          <div className="rounded-[calc(1rem-1px)] md:rounded-[calc(1.5rem-1px)] bg-[var(--surface)] shadow-[var(--shadow-md)]">
            <div className="h-[2px] w-full" style={{ background: 'var(--gradient-gold)' }} />
            <div className="p-5 md:p-6 space-y-4">
              {/* Real question */}
              <div>
                <div className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-[0.15em] mb-1.5">
                  {L('진짜 질문', 'Real question')}
                </div>
                <p className="text-[15px] md:text-[16px] font-semibold text-[var(--text-primary)] leading-snug tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                  {ex.realQuestion}
                </p>
              </div>

              <div className="h-px bg-[var(--border-subtle)]" />

              {/* Hidden assumptions */}
              <div>
                <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.15em] mb-1.5">
                  {L('숨은 가정', 'Hidden assumptions')}
                </div>
                <ul className="space-y-1">
                  {ex.assumptions.map((a, i) => (
                    <li key={i} className="text-[13px] md:text-[14px] text-[var(--text-secondary)] leading-snug flex gap-2">
                      <span className="text-[var(--accent)]/60 shrink-0">·</span>
                      <span className="flex-1">{a}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="h-px bg-[var(--border-subtle)]" />

              {/* Skeleton */}
              <div>
                <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.15em] mb-1.5">
                  {L('뼈대', 'Skeleton')}
                </div>
                <ol className="space-y-1.5">
                  {ex.skeleton.map((s, i) => (
                    <li key={i} className="text-[13px] md:text-[14px] text-[var(--text-secondary)] leading-snug flex gap-2">
                      <span className="text-[var(--accent)]/70 shrink-0 tabular-nums">{i + 1}.</span>
                      <span className="flex-1">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-3 text-center text-[11px] text-[var(--text-tertiary)]">
          {L('실제 결과물 예시 — 답변을 추가하면 더 구체화됩니다', 'Sample output — it sharpens as you answer questions')}
        </p>
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

        <ExampleOutput />
      </div>
    </section>
  );
}

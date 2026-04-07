'use client';

import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Code2, ClipboardList, Palette } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';

function RevealCard({ children, delay }: { children: React.ReactNode; delay: number }) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ delay });
  return (
    <div ref={ref} className={`h-full ${isVisible ? 'scroll-visible-x' : 'scroll-hidden-x'}`}>
      {children}
    </div>
  );
}

const scenarios_ko = [
  { icon: Code2, headline: '백엔드 개발자인데\n대표님이 기획안을 써오라고 했다', before: '뭘 써야 할지 모르겠다. 기획은 내 전문이 아닌데.', after: '기획안 구조가 잡혔다. 대표님이 뭘 보고 싶은지도 파악됐다.', color: '#2d4a7c' },
  { icon: ClipboardList, headline: 'PM인데 전략 제안서를\n2시간 안에 내야 한다', before: '시간이 없다. 어디서부터 시작해야 하지.', after: '핵심만 뽑아서 설득력 있게 정리됐다. 약점도 미리 파악했다.', color: '#6b4c9a' },
  { icon: Palette, headline: '디자이너인데\n비즈니스 케이스를 만들라고 했다', before: '비즈니스 언어를 모르겠다. ROI가 뭐지.', after: '숫자와 논리로 번역됐다. 경영진이 이해하는 언어로.', color: '#2d6b2d' },
];

const scenarios_en = [
  { icon: Code2, headline: "Backend developer asked\nto write a project proposal", before: "No idea where to start. Planning isn't my thing.", after: 'Proposal structure is ready. Now I know what the CEO actually wants to see.', color: '#2d4a7c' },
  { icon: ClipboardList, headline: "PM with a strategy deck\ndue in 2 hours", before: "No time. Where do I even begin?", after: "Key points extracted and structured persuasively. Weak spots caught early.", color: '#6b4c9a' },
  { icon: Palette, headline: "Designer told to build\na business case", before: "I don't speak business. What even is ROI?", after: "Translated into numbers and logic. In a language execs understand.", color: '#2d6b2d' },
];

export function UseCaseFlow() {
  const locale = useLocale();
  const scenarios = locale === 'ko' ? scenarios_ko : scenarios_en;
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;

  return (
    <section className="relative bg-[var(--surface)]">
      <div className="absolute inset-x-0 top-0 h-32 pointer-events-none" style={{ background: 'var(--gradient-concert-hall)' }} />
      <div className="relative max-w-5xl mx-auto px-5 md:px-6 py-12 md:py-16">
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-display-lg text-[var(--text-primary)]">
            {L('내 전문 분야가 아닌 걸 해야 하는 사람들', 'For people asked to do things outside their expertise')}
          </h2>
          <p className="mt-2 text-[13px] md:text-[15px] text-[var(--text-secondary)]">
            {L('막막한 상태에서 구조화된 결과물을 만들어 드립니다', 'From blank page to structured deliverable')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {scenarios.map((s, i) => (
            <RevealCard key={i} delay={i * 120}>
              <div
                className="h-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg)] p-5 md:p-6 flex flex-col shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-1.5 transition-all duration-300"
                style={{ borderTop: `2px solid ${s.color}` }}
              >
                {/* Icon + headline */}
                <div className="mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${s.color}0D` }}>
                    <s.icon size={20} strokeWidth={1.5} style={{ color: s.color }} />
                  </div>
                  <h3 className="text-[15px] md:text-[17px] font-bold text-[var(--text-primary)] leading-snug whitespace-pre-line">
                    {s.headline}
                  </h3>
                </div>

                {/* Before / After */}
                <div className="flex-1 space-y-3">
                  <div className="rounded-lg bg-[var(--surface)] p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-3.5 h-3.5 rounded-full bg-red-100 flex items-center justify-center text-[7px] text-red-500 font-bold">&times;</span>
                      <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">Before</span>
                    </div>
                    <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                      {s.before}
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <svg width="12" height="16" viewBox="0 0 12 16"><path d="M6 0v12M2 8l4 4 4-4" stroke="var(--accent)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>

                  <div className="rounded-lg bg-[var(--surface)] p-3 border border-[var(--accent)]/20">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-3.5 h-3.5 rounded-full bg-blue-100 flex items-center justify-center text-[7px] text-[#3b6dcc] font-bold">&#x2713;</span>
                      <span className="text-[11px] font-semibold" style={{ color: s.color }}>After</span>
                    </div>
                    <p className="text-[13px] text-[var(--text-primary)] leading-relaxed font-medium">
                      {s.after}
                    </p>
                  </div>
                </div>
              </div>
            </RevealCard>
          ))}
        </div>
      </div>
    </section>
  );
}

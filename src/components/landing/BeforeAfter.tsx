'use client';

import { X } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

export function BeforeAfter() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.2 });

  return (
    <section ref={ref} className={isVisible ? 'scroll-visible' : 'scroll-hidden'}>
      <div className="max-w-3xl mx-auto px-5 md:px-6 py-10 md:py-14">
        {/* Contextual heading */}
        <p className="text-center text-[13px] md:text-[14px] text-[var(--text-secondary)] mb-6 md:mb-8">
          같은 과제, 다른 접근 — Overture는 <strong className="text-[var(--text-primary)]">질문부터</strong> 바꿉니다
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {/* Before */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-6">
            <div className="flex items-center gap-2 text-[11px] md:text-[12px] font-bold text-red-400 uppercase tracking-wider mb-3 md:mb-4">
              <X size={14} />
              AI에게 바로 시키면
            </div>
            <p className="text-[15px] md:text-[16px] font-bold text-[var(--text-primary)] mb-2 leading-snug">
              &ldquo;경쟁사 대응 전략을 세워줘&rdquo;
            </p>
            <p className="text-[13px] md:text-[14px] text-[var(--text-secondary)] leading-relaxed">
              경쟁사 분석 보고서가 나오지만, 우리가 싸울 판이 어디인지 정의하지 않아 방향이 엉뚱합니다.
            </p>
          </div>

          {/* After */}
          <div className="rounded-2xl border-2 border-[var(--accent)] bg-[var(--surface)] p-4 md:p-6 relative">
            <div className="absolute -top-3 left-4 md:left-5 bg-[var(--accent)] text-white text-[10px] md:text-[11px] font-bold px-2.5 md:px-3 py-1 rounded-full tracking-wide uppercase">
              Overture를 거치면
            </div>

            <div className="mt-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-extrabold shrink-0">1</span>
                <span className="text-[11px] md:text-[12px] font-bold text-amber-700 uppercase tracking-wider">숨겨진 전제 발견</span>
              </div>
              <p className="text-[14px] md:text-[15px] text-[var(--text-primary)] font-semibold leading-snug ml-7">
                &ldquo;경쟁사와 같은 시장에서 싸워야 한다&rdquo;
              </p>
              <p className="text-[12px] md:text-[13px] text-amber-700 ml-7 mt-1">
                &rarr; 우리 강점은 경쟁사가 없는 틈새에 있을 수 있음
              </p>
            </div>

            <div className="flex items-center ml-2 my-2.5 md:my-3">
              <div className="w-px h-4 md:h-5 bg-[var(--accent)]/30 ml-[9px]" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-[var(--ai)] text-[var(--accent)] flex items-center justify-center text-[10px] font-extrabold shrink-0">2</span>
                <span className="text-[11px] md:text-[12px] font-bold text-[var(--accent)] uppercase tracking-wider">재정의된 질문</span>
              </div>
              <p className="text-[15px] md:text-[17px] font-bold text-[var(--text-primary)] leading-snug ml-7">
                경쟁사를 따라갈 것인가, 우리만의 판을 만들 것인가?
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

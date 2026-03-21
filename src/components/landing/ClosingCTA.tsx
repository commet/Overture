'use client';

import Link from 'next/link';
import { BarLine } from '@/components/ui/MusicalElements';
import { useScrollReveal } from '@/hooks/useScrollReveal';

export function ClosingCTA() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.3 });

  return (
    <section className="relative bg-[var(--surface)]">
      {/* Manuscript texture background */}
      <div className="absolute inset-0 manuscript-bg pointer-events-none" />

      <div className="max-w-5xl mx-auto px-5 md:px-6 py-10 md:py-14 relative">
        <div
          ref={ref}
          className={`max-w-2xl mx-auto text-center ${isVisible ? 'scroll-visible' : 'scroll-hidden'}`}
        >
          {/* Finale bar line */}
          <div className="flex justify-center mb-6 md:mb-8">
            <BarLine type="final" height={24} />
          </div>

          <blockquote
            className="text-[17px] md:text-[22px] font-normal text-[var(--text-primary)] leading-relaxed tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            에이전트는 점점 더 많은 것을 만들어 줄 것입니다.
            <br />
            <span className="text-[var(--text-secondary)]">
              만들 것을 결정하는 것은 여전히 사람의 몫입니다.
            </span>
          </blockquote>

          <p className="mt-4 md:mt-5 text-[13px] md:text-[14px] text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto">
            전략기획자가 머릿속에서 하던 것.
            <br />
            있었지만 도구화되지 않았던 것을 처음으로 도구화합니다.
          </p>

          <div className="mt-7 md:mt-8 flex flex-col items-center gap-3">
            <Link
              href="/workspace"
              className="inline-flex items-center gap-2.5 px-6 md:px-7 py-3 md:py-3.5 bg-[var(--primary)] text-white rounded-full text-[14px] md:text-[15px] font-semibold hover:opacity-90 transition-opacity duration-200 shadow-md"
            >
              서곡 시작하기
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link
              href="/demo"
              className="text-[13px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors underline underline-offset-4 decoration-[var(--border)]"
            >
              먼저 체험해보기
            </Link>
          </div>

          <p className="mt-7 md:mt-8 text-[11px] md:text-[12px] text-[var(--text-tertiary)] tracking-wide">
            Overture — 오픈소스 프로젝트
          </p>
        </div>
      </div>
    </section>
  );
}

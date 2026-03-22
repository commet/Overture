'use client';

import Link from 'next/link';
import { useScrollReveal } from '@/hooks/useScrollReveal';

export function ClosingCTA() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.3 });

  return (
    <section className="relative">
      <div className="max-w-3xl mx-auto px-5 md:px-6 py-14 md:py-20">
        <div
          ref={ref}
          className={`text-center ${isVisible ? 'scroll-visible' : 'scroll-hidden'}`}
        >
          <blockquote
            className="text-[18px] md:text-[24px] font-normal text-[var(--text-primary)] leading-relaxed tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            에이전트는 점점 더 많은 것을 만들어 줄 것입니다.
            <br />
            <span className="text-[var(--text-secondary)]">
              만들 것을 결정하는 것은 여전히 사람의 몫입니다.
            </span>
          </blockquote>

          <div className="mt-8 md:mt-10">
            <Link
              href="/workspace"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-[var(--primary)] text-[var(--bg)] rounded-full text-[15px] font-semibold hover:opacity-90 transition-opacity duration-200 shadow-md"
            >
              시작하기
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>

          <p className="mt-8 text-[11px] text-[var(--text-tertiary)]">
            로그인 없이 3회 무료 체험 가능
          </p>
        </div>
      </div>
    </section>
  );
}

'use client';

import Link from 'next/link';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Fermata, BarLine } from '@/components/ui/MusicalElements';

export function ClosingCTA() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.3 });

  return (
    <section className="relative overflow-hidden">
      {/* Orchestra photo background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/images/orchestra-violins.jpg)' }}
      />
      {/* Warm dark overlay — orchestra silhouettes visible through */}
      <div className="absolute inset-0 bg-[#1a1410]/75" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--gradient-warm-vignette)' }} />

      <div className="relative max-w-3xl mx-auto px-5 md:px-6 py-14 md:py-20">
        <div
          ref={ref}
          className={`text-center ${isVisible ? 'scroll-visible' : 'scroll-hidden'}`}
        >
          {/* Fermata — pause and reflect */}
          <div className="flex justify-center mb-4">
            <Fermata size={28} color="var(--gold-light)" />
          </div>

          {/* Gold opening quote mark */}
          <div className="text-gold-gradient text-[48px] md:text-[60px] leading-none font-serif select-none mb-2" aria-hidden="true">
            &ldquo;
          </div>

          <blockquote className="text-display-md !text-white/95">
            에이전트는 점점 더 많은 것을 만들어 줄 것입니다.
            <br />
            <span className="!text-white/60">
              만들 것을 결정하는 것은 여전히 사람의 몫입니다.
            </span>
          </blockquote>

          <div className="mt-8 md:mt-10">
            <Link
              href="/workspace"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 text-white rounded-full text-[15px] font-semibold shadow-[var(--shadow-lg)] hover:shadow-[var(--glow-gold-intense)] hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200"
              style={{ background: 'var(--gradient-gold)' }}
            >
              시작하기
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>

          <p className="mt-8 text-[11px] text-white/40">
            로그인 없이 3회 무료 체험 가능
          </p>

          {/* Final bar line — end of the score */}
          <div className="flex justify-center mt-8">
            <BarLine type="final" height={24} />
          </div>
        </div>
      </div>
    </section>
  );
}

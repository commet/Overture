'use client';

import Link from 'next/link';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { track } from '@/lib/analytics';
import { useLocale } from '@/hooks/useLocale';

export function ClosingCTA() {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.3 });
  const locale = useLocale();
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;

  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url(/images/orchestra-violins.jpg)' }}
      />
      <div className="absolute inset-0 bg-[#1a1410]/75" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--gradient-warm-vignette)' }} />

      <div className="relative max-w-3xl mx-auto px-5 md:px-6 py-14 md:py-20">
        <div
          ref={ref}
          className={`text-center ${isVisible ? 'scroll-visible' : 'scroll-hidden'}`}
        >
          <blockquote className="text-display-md !text-white/90">
            {L(
              '어려운 건 문서를 쓰는 게 아니라,',
              'The hard part was never the writing —'
            )}
            <br />
            <span className="text-gold-gradient">
              {L('뭘 써야 하는지 아는 것이었습니다.', 'it was knowing what to write.')}
            </span>
          </blockquote>

          <p className="mt-5 text-[14px] md:text-[15px] text-white/50 leading-relaxed max-w-md mx-auto">
            {L(
              '그래서 조언 대신 도구를 만들었습니다.',
              'So instead of giving advice, we built the tool.'
            )}
          </p>

          <div className="mt-8 md:mt-10">
            <Link
              href="/workspace"
              onClick={() => track('landing_cta_click', { cta: 'closing_workspace' })}
              className="inline-flex items-center gap-2.5 px-7 py-3.5 text-white rounded-full text-[15px] font-semibold shadow-[var(--shadow-lg)] hover:shadow-[var(--glow-gold-intense)] hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200"
              style={{ background: 'var(--gradient-gold)' }}
            >
              {L('지금 바로 써보기', 'Try it now')}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>

          <p className="mt-6 text-[11px] text-white/40">
            {L('로그인 없이 바로 시작', 'Free — no login required')}
          </p>
        </div>
      </div>
    </section>
  );
}

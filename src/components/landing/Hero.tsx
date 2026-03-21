'use client';

import Link from 'next/link';
import { StaffLines } from '@/components/ui/MusicalElements';

export function Hero() {
  return (
    <section className="relative min-h-[calc(100svh-64px)] flex items-center justify-center overflow-hidden">
      {/* ─── Atmospheric background ─── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(184, 150, 62, 0.06) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 30% 60%, rgba(59, 109, 204, 0.03) 0%, transparent 60%)',
        }}
      />
      <StaffLines opacity={0.04} spacing={14} />

      {/* ─── Content ─── */}
      <div className="relative z-10 text-center max-w-2xl mx-auto px-6 phrase-entrance">
        {/* Tagline */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-px w-8 bg-[var(--gold)]/30" />
          <span className="text-[12px] font-medium tracking-[0.2em] uppercase text-[var(--gold)]">
            Think before you orchestrate
          </span>
          <div className="h-px w-8 bg-[var(--gold)]/30" />
        </div>

        {/* H1 */}
        <h1
          className="text-[32px] md:text-[44px] lg:text-[52px] font-bold leading-[1.15] tracking-tight text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          AI에게 시키기 전에,
          <br />
          <span className="text-[var(--accent)]">뭘 시킬지부터.</span>
        </h1>

        {/* Support — 1줄 */}
        <p className="mt-6 text-[16px] md:text-[18px] text-[var(--text-secondary)] leading-relaxed max-w-lg mx-auto">
          질문이 틀리면 아무리 좋은 답도 쓸모없습니다.
          <br className="hidden md:block" />
          숨겨진 전제를 찾고, 진짜 질문을 재정의하세요.
        </p>

        {/* CTA group */}
        <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-[var(--primary)] text-white rounded-full text-[15px] font-semibold hover:opacity-90 transition-opacity duration-200 shadow-md hover:shadow-lg"
          >
            5분 데모 체험
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <Link
            href="/workspace"
            className="inline-flex items-center gap-2 px-5 py-3 border border-[var(--border)] text-[var(--text-primary)] rounded-full text-[14px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
          >
            바로 시작하기
          </Link>
        </div>
      </div>
    </section>
  );
}

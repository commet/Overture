'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import { StaffLines } from '@/components/ui/MusicalElements';

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* ─── Atmospheric background ─── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(184, 150, 62, 0.10) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 30% 70%, rgba(59, 109, 204, 0.05) 0%, transparent 60%)',
        }}
      />
      <StaffLines opacity={0.05} spacing={14} />

      <div className="relative z-10 max-w-3xl mx-auto px-5 md:px-6 pt-16 md:pt-24 pb-10 md:pb-16">
        {/* ─── Text ─── */}
        <div className="text-center phrase-entrance">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-6 md:w-8 bg-[var(--gold)]/30" />
            <span className="text-[11px] md:text-[12px] font-medium tracking-[0.2em] uppercase text-[var(--gold)]">
              Think before you orchestrate
            </span>
            <div className="h-px w-6 md:w-8 bg-[var(--gold)]/30" />
          </div>

          <h1
            className="text-[28px] md:text-[44px] lg:text-[52px] font-bold leading-[1.15] tracking-tight text-[var(--text-primary)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            AI에게 시키기 전에,
            <br />
            <span className="text-[var(--accent)]">뭘 시킬지부터.</span>
          </h1>

          <p className="mt-5 text-[15px] md:text-[18px] text-[var(--text-secondary)] leading-relaxed max-w-lg mx-auto">
            질문이 틀리면 아무리 좋은 답도 쓸모없습니다.
            <br className="hidden md:block" />
            숨겨진 전제를 찾고, 진짜 질문을 재정의하세요.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3 md:gap-4 flex-wrap">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2.5 px-6 md:px-7 py-3 md:py-3.5 bg-[var(--primary)] text-white rounded-full text-[14px] md:text-[15px] font-semibold hover:opacity-90 transition-opacity duration-200 shadow-md hover:shadow-lg"
            >
              5분 데모 체험
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <Link
              href="/workspace"
              className="inline-flex items-center gap-2 px-5 py-3 border border-[var(--border)] text-[var(--text-primary)] rounded-full text-[13px] md:text-[14px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
            >
              바로 시작하기
            </Link>
          </div>
        </div>

        {/* ─── Before / After (visual anchor) ─── */}
        <div className="mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {/* Before */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-sm p-4 md:p-5">
            <div className="flex items-center gap-2 text-[11px] font-bold text-red-400 uppercase tracking-wider mb-3">
              <X size={13} />
              AI에게 바로 시키면
            </div>
            <p className="text-[15px] font-bold text-[var(--text-primary)] mb-1.5 leading-snug">
              &ldquo;경쟁사 대응 전략을 세워줘&rdquo;
            </p>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
              분석 보고서는 나오지만, 싸울 판을 정의하지 않아 방향이 엉뚱합니다.
            </p>
          </div>

          {/* After */}
          <div className="rounded-2xl border-2 border-[var(--accent)] bg-[var(--surface)]/80 backdrop-blur-sm p-4 md:p-5 relative">
            <div className="absolute -top-2.5 left-4 bg-[var(--accent)] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wide uppercase">
              Overture를 거치면
            </div>

            <div className="mt-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-4.5 h-4.5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[9px] font-extrabold shrink-0">1</span>
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">숨겨진 전제 발견</span>
              </div>
              <p className="text-[13px] text-[var(--text-primary)] font-semibold leading-snug ml-6">
                &ldquo;경쟁사와 같은 시장에서 싸워야 한다&rdquo;
              </p>
            </div>

            <div className="ml-2 my-2">
              <div className="w-px h-3 bg-[var(--accent)]/30 ml-[7px]" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-4.5 h-4.5 rounded-full bg-[var(--ai)] text-[var(--accent)] flex items-center justify-center text-[9px] font-extrabold shrink-0">2</span>
                <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider">재정의된 질문</span>
              </div>
              <p className="text-[15px] font-bold text-[var(--text-primary)] leading-snug ml-6">
                경쟁사를 따라갈 것인가, 우리만의 판을 만들 것인가?
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

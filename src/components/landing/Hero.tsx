'use client';

import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative">
      <div className="max-w-5xl mx-auto px-5 md:px-6 pt-16 md:pt-28 pb-12 md:pb-20">
        {/* ─── Desktop: side-by-side / Mobile: stack ─── */}
        <div className="md:grid md:grid-cols-2 md:gap-16 md:items-center">

          {/* ─── Left: Message ─── */}
          <div className="phrase-entrance">
            <h1
              className="text-[28px] md:text-[42px] lg:text-[48px] font-bold leading-[1.15] tracking-tight text-[var(--text-primary)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              AI에게 시키기 전에,
              <br />
              <span className="text-[var(--accent)]">생각을 뾰족하게.</span>
            </h1>

            <p className="mt-5 text-[15px] md:text-[17px] text-[var(--text-secondary)] leading-relaxed max-w-md">
              질문이 뭉툭하면 AI도 뭉툭하게 답합니다.
              <br />
              숨겨진 전제를 찾고, 여러 관점의 반론을 듣고,
              <br />
              확신이 생기면 실행하세요.
            </p>

            <div className="mt-8">
              <Link
                href="/demo"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-[var(--primary)] text-[var(--bg)] rounded-full text-[15px] font-semibold hover:opacity-90 transition-opacity duration-200 shadow-md hover:shadow-lg"
              >
                5분 데모 체험
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>

              <p className="mt-4 text-[11px] text-[var(--text-tertiary)] flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="opacity-40 shrink-0"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 6.3-4 4a.7.7 0 0 1-1 0l-2-2a.7.7 0 1 1 1-1L7 8.8l3.5-3.5a.7.7 0 1 1 1 1z"/></svg>
                40편의 인지과학·AI 학술 논문에 기반한 의사결정 프레임워크
              </p>
            </div>
          </div>

          {/* ─── Right: Question Transformation (typography only, no cards) ─── */}
          <div className="mt-12 md:mt-0 phrase-entrance" style={{ animationDelay: '200ms' }}>
            {/* Before — faded, struck through */}
            <div className="mb-6 md:mb-8">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                AI에게 바로 시키면
              </p>
              <p className="text-[18px] md:text-[22px] text-[var(--text-tertiary)] line-through decoration-[var(--text-tertiary)]/30 decoration-1 leading-snug">
                &ldquo;경쟁사 대응 전략을 세워줘&rdquo;
              </p>
              <p className="mt-2 text-[13px] text-[var(--text-tertiary)]">
                보고서는 나오지만, 방향이 엉뚱합니다.
              </p>
            </div>

            {/* Transformation line */}
            <div className="flex items-center gap-3 mb-6 md:mb-8">
              <div className="h-px flex-1 bg-[var(--accent)]/20" />
              <span className="text-[11px] font-bold text-[var(--accent)] tracking-wider uppercase">Overture</span>
              <div className="h-px flex-1 bg-[var(--accent)]/20" />
            </div>

            {/* After — bold, vivid */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)] mb-2">
                숨겨진 전제를 발견하면
              </p>
              <p
                className="text-[22px] md:text-[28px] font-bold text-[var(--text-primary)] leading-snug tracking-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                경쟁사를 따라갈 것인가,
                <br />
                우리만의 판을 만들 것인가?
              </p>
              <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
                싸울 판을 먼저 정의해야 전략이 나옵니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

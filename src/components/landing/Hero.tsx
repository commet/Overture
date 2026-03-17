import Link from 'next/link';

export function Hero() {
  return (
    <section className="max-w-5xl mx-auto px-6 pt-28 md:pt-36 pb-24 md:pb-32">
      {/* Eyebrow */}
      <div className="flex items-center gap-3 mb-10">
        <div className="h-px w-8 bg-[var(--border)]" />
        <span className="text-[12px] font-medium tracking-[0.2em] uppercase text-[var(--text-tertiary)]">
          Think before you orchestrate
        </span>
      </div>

      {/* Headline — left aligned, large, confident */}
      <h1 className="text-[40px] md:text-[56px] lg:text-[64px] font-extrabold text-[var(--text-primary)] leading-[1.08] tracking-tight max-w-2xl">
        AI에게 일을 시키는 건
        <br />
        쉬워졌습니다.
      </h1>

      <p className="mt-6 text-[20px] md:text-[24px] font-medium text-[var(--text-secondary)] leading-snug max-w-xl">
        어려운 건 <span className="text-[var(--text-primary)]">무슨 일을 시킬지</span> 정하는 겁니다.
      </p>

      {/* The insight */}
      <p className="mt-10 text-[15px] md:text-[16px] text-[var(--text-tertiary)] leading-relaxed max-w-lg">
        실행의 비용이 0에 가까워질수록,
        <br className="hidden sm:block" />
        실행 이전의 판단의 가치는 올라갑니다.
      </p>

      {/* CTA */}
      <div className="mt-12 flex items-center gap-5">
        <Link
          href="/tools/decompose"
          className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-[var(--primary)] text-white rounded-full text-[15px] font-semibold hover:opacity-90 transition-opacity duration-200 shadow-md"
        >
          첫 번째 악장 시작
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
        <Link
          href="/guide"
          className="text-[14px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors underline underline-offset-4 decoration-[var(--border)]"
        >
          사용 가이드
        </Link>
      </div>
    </section>
  );
}

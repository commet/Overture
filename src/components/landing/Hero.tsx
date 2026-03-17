import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative bg-[var(--primary)] text-white overflow-hidden">
      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-28 md:pt-32 md:pb-36">
        {/* Eyebrow */}
        <div className="flex items-center gap-3 mb-10">
          <div className="h-px flex-1 max-w-[40px] bg-white/20" />
          <span className="text-[12px] font-medium tracking-[0.2em] uppercase text-white/50">
            Think before you orchestrate
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-[36px] md:text-[52px] lg:text-[60px] font-extrabold leading-[1.1] tracking-tight max-w-3xl">
          AI에게 일을 시키는 건
          <br />
          쉬워졌습니다.
        </h1>

        <p className="mt-6 text-[20px] md:text-[24px] font-medium text-white/60 leading-snug max-w-xl">
          어려운 건 <span className="text-white/90">무슨 일을 시킬지</span> 정하는 겁니다.
        </p>

        {/* The insight */}
        <div className="mt-12 max-w-xl">
          <p className="text-[15px] md:text-[16px] text-white/40 leading-relaxed">
            실행의 비용이 0에 가까워질수록,
            <br className="hidden sm:block" />
            실행 이전의 판단 — 무엇을, 왜, 어떤 순서로 — 의 가치는 올라갑니다.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-14 flex items-center gap-4">
          <Link
            href="/tools/decompose"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-white text-[var(--primary)] rounded-full text-[15px] font-bold hover:bg-white/90 transition-all duration-300 shadow-lg shadow-white/10"
          >
            첫 번째 악장 시작
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="translate-x-0 group-hover:translate-x-1 transition-transform">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <Link
            href="/guide"
            className="text-[14px] font-medium text-white/40 hover:text-white/70 transition-colors underline underline-offset-4 decoration-white/20"
          >
            사용 가이드
          </Link>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[var(--bg)] to-transparent" />
    </section>
  );
}

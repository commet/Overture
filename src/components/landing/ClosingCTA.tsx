import Link from 'next/link';

export function ClosingCTA() {
  return (
    <section className="border-t border-[var(--border-subtle)]">
      <div className="max-w-5xl mx-auto px-6 py-28 md:py-36">
        <div className="max-w-2xl mx-auto text-center">
          <blockquote className="text-[20px] md:text-[24px] font-medium text-[var(--text-primary)] leading-relaxed tracking-tight">
            에이전트는 점점 더 많은 것을 만들어 줄 것입니다.
            <br />
            <span className="text-[var(--text-secondary)]">
              만들 것을 결정하는 것은 여전히 사람의 몫입니다.
            </span>
          </blockquote>

          <p className="mt-8 text-[15px] text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto">
            전략기획자가 머릿속에서 하던 것.
            <br />
            있었지만 도구화되지 않았던 것을 처음으로 도구화합니다.
          </p>

          <div className="mt-12">
            <Link
              href="/tools/decompose"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-[var(--primary)] text-white rounded-full text-[15px] font-semibold hover:opacity-90 transition-opacity duration-200 shadow-md"
            >
              서곡 시작하기
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>

          <p className="mt-16 text-[12px] text-[var(--text-tertiary)] tracking-wide">
            Overture — 오픈소스 프로젝트
          </p>
        </div>
      </div>
    </section>
  );
}

import Link from 'next/link';
import { AlertTriangle, Sparkles, X } from 'lucide-react';

export function Hero() {
  return (
    <section className="max-w-5xl mx-auto px-6 pt-16 md:pt-24 pb-10 md:pb-14">
      {/* ─── Text ─── */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="h-px w-6 bg-[var(--border)]" />
          <span className="text-[12px] font-medium tracking-[0.2em] uppercase text-[var(--text-tertiary)]">
            Think before you orchestrate
          </span>
          <div className="h-px w-6 bg-[var(--border)]" />
        </div>

        <h1 className="text-[32px] md:text-[44px] lg:text-[52px] font-extrabold text-[var(--text-primary)] leading-[1.1] tracking-tight">
          AI에게 시키기 전에,
          <br />
          <span className="text-[var(--accent)]">뭘 시킬지부터.</span>
        </h1>

        <p className="mt-5 text-[16px] md:text-[18px] text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto">
          과제를 받으면 바로 AI에게 시키고 싶지만, 질문이 틀리면 아무리 좋은 답도 쓸모없습니다.
        </p>
        <p className="mt-2 text-[15px] text-[var(--text-tertiary)] leading-relaxed max-w-lg mx-auto">
          Overture는 <strong className="text-[var(--text-primary)]">숨겨진 전제를 찾고, 진짜 질문을 재정의</strong>합니다.
        </p>

        <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-[var(--primary)] text-white rounded-full text-[15px] font-semibold hover:opacity-90 transition-opacity duration-200 shadow-md"
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

      {/* ─── Before / After ─── */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {/* Before */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6">
          <div className="flex items-center gap-2 text-[12px] font-bold text-red-400 uppercase tracking-wider mb-4">
            <X size={14} />
            AI에게 바로 시키면
          </div>
          <p className="text-[16px] font-bold text-[var(--text-primary)] mb-2 leading-snug">
            &ldquo;경쟁사 대응 전략을 세워줘&rdquo;
          </p>
          <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
            경쟁사 분석 보고서가 나오지만, 우리가 싸울 판이 어디인지 정의하지 않아 방향이 엉뚱합니다.
          </p>
        </div>

        {/* After — structured flow */}
        <div className="rounded-2xl border-2 border-[var(--accent)] bg-[var(--surface)] p-5 md:p-6 relative">
          <div className="absolute -top-3 left-5 bg-[var(--accent)] text-white text-[11px] font-bold px-3 py-1 rounded-full tracking-wide uppercase">
            Overture를 거치면
          </div>

          {/* Step 1: Premise */}
          <div className="mt-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-extrabold shrink-0">1</span>
              <span className="text-[12px] font-bold text-amber-700 uppercase tracking-wider">숨겨진 전제 발견</span>
            </div>
            <p className="text-[15px] text-[var(--text-primary)] font-semibold leading-snug ml-7">
              &ldquo;경쟁사와 같은 시장에서 싸워야 한다&rdquo;
            </p>
            <p className="text-[13px] text-amber-700 ml-7 mt-1">
              &rarr; 우리 강점은 경쟁사가 없는 틈새에 있을 수 있음
            </p>
          </div>

          {/* Connector */}
          <div className="flex items-center ml-2 my-3">
            <div className="w-px h-5 bg-[var(--accent)]/30 ml-[9px]" />
          </div>

          {/* Step 2: Reframed question */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-[var(--ai)] text-[var(--accent)] flex items-center justify-center text-[10px] font-extrabold shrink-0">2</span>
              <span className="text-[12px] font-bold text-[var(--accent)] uppercase tracking-wider">재정의된 질문</span>
            </div>
            <p className="text-[17px] font-bold text-[var(--text-primary)] leading-snug ml-7">
              경쟁사를 따라갈 것인가, 우리만의 판을 만들 것인가?
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

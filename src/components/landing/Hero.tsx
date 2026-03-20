import Link from 'next/link';
import { AlertTriangle, Sparkles } from 'lucide-react';

export function Hero() {
  return (
    <section className="max-w-6xl mx-auto px-6 pt-24 md:pt-32 pb-20 md:pb-28">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* ─── Copy ─── */}
        <div>
          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px w-8 bg-[var(--border)]" />
            <span className="text-[12px] font-medium tracking-[0.2em] uppercase text-[var(--text-tertiary)]">
              Think before you orchestrate
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-[36px] md:text-[48px] lg:text-[56px] font-extrabold text-[var(--text-primary)] leading-[1.08] tracking-tight">
            완벽한 답변,
            <br />
            <span className="text-[var(--accent)]">엉뚱한 질문.</span>
          </h1>

          {/* Hook */}
          <p className="mt-6 text-[18px] md:text-[20px] text-[var(--text-secondary)] leading-relaxed max-w-md">
            AI는 시키는 대로 합니다.
            <br />
            문제는, <span className="text-[var(--text-primary)] font-semibold">뭘 시켜야 하는지</span>.
          </p>

          {/* What it does — concrete */}
          <p className="mt-5 text-[15px] text-[var(--text-tertiary)] leading-relaxed max-w-md">
            숨겨진 전제를 찾고, 진짜 질문을 재정의하고, 이해관계자 반응을 시뮬레이션합니다. 전략기획자의 사고 과정을 처음으로 도구화합니다.
          </p>

          {/* CTA — two only */}
          <div className="mt-10 flex items-center gap-4 flex-wrap">
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

        {/* ─── Visual proof ─── */}
        <div className="animate-fade-in" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-subtle)] shadow-lg overflow-hidden">
            {/* Card header */}
            <div className="px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg)]">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-[var(--primary)] flex items-center justify-center">
                  <span className="text-white text-[9px] font-black">O</span>
                </div>
                <span className="text-[11px] font-semibold text-[var(--text-tertiary)] tracking-wider uppercase">
                  Overture 분석 결과
                </span>
              </div>
            </div>

            {/* 1. Surface task */}
            <div className="px-5 pt-4 pb-3">
              <p className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[var(--text-secondary)] mb-1.5">
                받은 과제
              </p>
              <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">
                &ldquo;신규 고객 확보 전략을 세워라&rdquo;
              </p>
            </div>

            {/* 2. Hidden assumption */}
            <div className="px-5 py-3.5 bg-amber-50/60 border-y border-amber-200/40">
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlertTriangle size={11} className="text-amber-600" />
                <p className="text-[10px] font-semibold tracking-[0.08em] uppercase text-amber-700">
                  숨겨진 전제
                </p>
              </div>
              <p className="text-[13px] text-[var(--text-primary)] font-medium leading-relaxed pl-3 border-l-2 border-amber-400">
                &ldquo;더 많은 신규 고객이 필요하다&rdquo;
              </p>
              <p className="text-[12px] text-amber-700 mt-1 pl-3">
                &rarr; 기존 고객 확장이 5배 효율적일 수 있음
              </p>
            </div>

            {/* 3. Real question */}
            <div className="px-5 py-4 bg-[var(--ai)]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles size={11} className="text-[var(--accent)]" />
                <p className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[var(--accent)]">
                  진짜 질문
                </p>
              </div>
              <p className="text-[15px] font-bold text-[var(--text-primary)] leading-snug">
                매출 성장의 최적 레버는 신규 확보인가, 기존 확장인가?
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

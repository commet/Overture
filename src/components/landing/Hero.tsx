'use client';

import Link from 'next/link';
import { StaffLines, CrescendoHairpin, Fermata, TrebleClef, DynamicMark } from '@/components/ui/MusicalElements';

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Concert hall atmosphere */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--gradient-concert-hall)' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--gradient-warm-vignette)' }} />
      <StaffLines opacity={0.04} spacing={14} />

      <div className="relative max-w-5xl mx-auto px-5 md:px-6 pt-16 md:pt-28 pb-12 md:pb-20">
        <div className="md:grid md:grid-cols-2 md:gap-16 md:items-center">

          {/* ─── Left: Message ─── */}
          <div className="phrase-entrance">
            <h1 className="text-display-xl text-[var(--text-primary)]">
              AI에게 시키기 전에,
              <br />
              <span className="text-gold-gradient">생각을 뾰족하게.</span>
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
                className="inline-flex items-center gap-2.5 px-7 py-3.5 text-white rounded-full text-[15px] font-semibold shadow-[var(--shadow-md)] hover:shadow-[var(--glow-gold-intense)] hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200"
                style={{ background: 'var(--gradient-gold)' }}
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

          {/* ─── Right: Orchestral Score Visual ─── */}
          <div className="mt-12 md:mt-0 phrase-entrance" style={{ animationDelay: '200ms' }}>
            <div className="relative rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-lg)] overflow-hidden">

              {/* Score header bar */}
              <div className="h-[2px] w-full" style={{ background: 'var(--gradient-gold)' }} />

              {/* Before — blurred score with real sheet music texture */}
              <div className="relative px-5 pt-5 pb-4 bg-[var(--bg)] overflow-hidden">
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-[0.07] blur-[1px]"
                  style={{ backgroundImage: 'url(/images/sheet-music.jpg)' }}
                />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <DynamicMark level="pp" className="text-[13px] text-[var(--text-tertiary)]" />
                    <span className="text-section-label">Before</span>
                  </div>
                  <p className="text-[17px] md:text-[20px] text-[var(--text-tertiary)] line-through decoration-[var(--text-tertiary)]/30 decoration-1 leading-snug blur-[0.5px]">
                    &ldquo;경쟁사 대응 전략을 세워줘&rdquo;
                  </p>
                  <p className="mt-1.5 text-[12px] text-[var(--text-tertiary)]">
                    보고서는 나오지만, 방향이 엉뚱합니다.
                  </p>
                </div>
              </div>

              {/* Transformation — crescendo hairpin */}
              <div className="flex items-center justify-center gap-3 px-5 py-2 bg-[var(--surface)]">
                <div className="h-px flex-1 bg-[var(--accent)]/20" />
                <CrescendoHairpin width={48} height={12} color="var(--accent)" />
                <span className="text-[10px] font-bold text-[var(--accent)] tracking-wider uppercase">Overture</span>
                <CrescendoHairpin width={48} height={12} color="var(--accent)" className="scale-x-[-1]" />
                <div className="h-px flex-1 bg-[var(--accent)]/20" />
              </div>

              {/* After — vivid score with clearer sheet music texture */}
              <div className="relative px-5 pt-4 pb-5 overflow-hidden">
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-[0.12]"
                  style={{ backgroundImage: 'url(/images/sheet-music.jpg)' }}
                />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <DynamicMark level="ff" className="text-[13px] text-[var(--accent)]" />
                    <span className="text-section-label !text-[var(--accent)]">After</span>
                    <Fermata size={16} color="var(--accent)" className="ml-auto" />
                  </div>
                  <p
                    className="text-[20px] md:text-[24px] font-bold text-[var(--text-primary)] leading-snug tracking-tight"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    경쟁사를 따라갈 것인가,
                    <br />
                    우리만의 판을 만들 것인가?
                  </p>
                  <p className="mt-2 text-[12px] text-[var(--text-secondary)]">
                    싸울 판을 먼저 정의해야 전략이 나옵니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Treble clef watermark */}
            <div className="absolute -bottom-8 -right-4 pointer-events-none">
              <TrebleClef size={80} color="var(--accent)" opacity={0.04} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

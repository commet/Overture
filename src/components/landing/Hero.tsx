'use client';

import Link from 'next/link';
import { StaffLines, CrescendoHairpin, TrebleClef } from '@/components/ui/MusicalElements';

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
              <span className="lg:whitespace-nowrap">내 전문 분야가 아닌 걸</span>
              <br />
              <span className="text-gold-gradient">해야 할 때.</span>
            </h1>

            <p className="mt-5 text-[15px] md:text-[17px] text-[var(--text-secondary)] leading-relaxed max-w-md">
              기획안, 전략 제안서, 비즈니스 케이스...
              <br />
              질문 하나 던지면, 30초 안에 뼈대가 나옵니다.
              <br />
              채울수록 날카로워집니다.
            </p>

            <div className="mt-8">
              <Link
                href="/workspace"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 text-white rounded-full text-[15px] font-semibold shadow-[var(--shadow-md)] hover:shadow-[var(--glow-gold-intense)] hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200"
                style={{ background: 'var(--gradient-gold)' }}
              >
                지금 바로 써보기
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>

              <p className="mt-4 text-[11px] text-[var(--text-tertiary)] flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="opacity-40 shrink-0"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 6.3-4 4a.7.7 0 0 1-1 0l-2-2a.7.7 0 1 1 1-1L7 8.8l3.5-3.5a.7.7 0 1 1 1 1z"/></svg>
                인지과학 + 전략기획 실무 기반 프레임워크
              </p>
            </div>
          </div>

          {/* ─── Right: Example Prompt Visual ─── */}
          <div className="mt-12 md:mt-0 phrase-entrance" style={{ animationDelay: '200ms' }}>
            <div className="relative rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-lg)] overflow-hidden">

              {/* Header bar */}
              <div className="h-[2px] w-full" style={{ background: 'var(--gradient-gold)' }} />

              {/* Input — the user's problem */}
              <div className="relative px-5 pt-5 pb-4 bg-[var(--bg)] overflow-hidden">
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-section-label text-[var(--text-tertiary)]">입력</span>
                  </div>
                  <p className="text-[15px] md:text-[17px] text-[var(--text-primary)] leading-snug">
                    &ldquo;나는 개발자인데 갑자기 대표님이 2주일 안에 기획안을 짜오라고 했어&rdquo;
                  </p>
                </div>
              </div>

              {/* Transformation */}
              <div className="flex items-center justify-center gap-3 px-5 py-2 bg-[var(--surface)]">
                <div className="h-px flex-1 bg-[var(--accent)]/20" />
                <CrescendoHairpin width={48} height={12} color="var(--accent)" />
                <span className="text-[10px] font-bold text-[var(--accent)] tracking-wider uppercase">30초</span>
                <CrescendoHairpin width={48} height={12} color="var(--accent)" className="scale-x-[-1]" />
                <div className="h-px flex-1 bg-[var(--accent)]/20" />
              </div>

              {/* Output — immediate result */}
              <div className="relative px-5 pt-4 pb-5 overflow-hidden">
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-section-label !text-[var(--accent)]">결과</span>
                  </div>
                  <p className="text-[13px] md:text-[14px] font-semibold text-[var(--accent)] mb-2">
                    진짜 질문
                  </p>
                  <p
                    className="text-[17px] md:text-[20px] font-bold text-[var(--text-primary)] leading-snug tracking-tight mb-3"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    기획안의 형식이 아니라,
                    <br />
                    대표님이 확인하고 싶은 것이 뭔지가 먼저다.
                  </p>
                  <div className="space-y-1.5">
                    <p className="text-[12px] text-[var(--text-secondary)] flex items-center gap-1.5">
                      <span className="text-red-400">?</span> 숨겨진 전제 3개
                    </p>
                    <p className="text-[12px] text-[var(--text-secondary)] flex items-center gap-1.5">
                      <span className="text-[var(--accent)]">▸</span> 기획안 뼈대 5줄
                    </p>
                  </div>
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

'use client';

import Link from 'next/link';
import { StaffLines, TrebleClef } from '@/components/ui/MusicalElements';
import { track } from '@/lib/analytics';

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Concert hall atmosphere */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--gradient-concert-hall)' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--gradient-warm-vignette)' }} />
      <StaffLines opacity={0.04} spacing={14} />

      <div className="relative max-w-5xl mx-auto px-5 md:px-6 pt-16 md:pt-28 pb-12 md:pb-20">
        <div className="lg:grid lg:grid-cols-[1.15fr_1fr] lg:gap-12 lg:items-center">

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

            <div className="mt-8 flex items-center gap-3">
              <Link
                href="/workspace"
                onClick={() => track('landing_cta_click', { cta: 'hero_workspace' })}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 text-white rounded-full text-[15px] font-semibold shadow-[var(--shadow-md)] hover:shadow-[var(--glow-gold-intense)] hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200"
                style={{ background: 'var(--gradient-gold)' }}
              >
                지금 바로 써보기
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              <Link
                href="/demo"
                onClick={() => track('landing_cta_click', { cta: 'hero_demo' })}
                className="text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
              >
                데모 보기
              </Link>

              <p className="mt-4 text-[11px] text-[var(--text-tertiary)] flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="opacity-40 shrink-0"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 6.3-4 4a.7.7 0 0 1-1 0l-2-2a.7.7 0 1 1 1-1L7 8.8l3.5-3.5a.7.7 0 1 1 1 1z"/></svg>
                인지과학 + 전략기획 실무 기반 프레임워크
              </p>
            </div>
          </div>

          {/* ─── Right: Progressive Flow Preview ─── */}
          <div className="mt-12 lg:mt-0 phrase-entrance" style={{ animationDelay: '200ms' }}>
            <div className="relative space-y-3">

              {/* Step 1: Input + Result */}
              <div className="rounded-[1.25rem] border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-lg)] overflow-hidden">
                <div className="h-[2px] w-full" style={{ background: 'var(--gradient-gold)' }} />
                <div className="px-5 pt-4 pb-3 bg-[var(--bg)]">
                  <p className="text-[13px] text-[var(--text-secondary)] leading-snug">
                    &ldquo;개발자인데 대표님이 2주 안에 기획안을 짜오라고 했어&rdquo;
                  </p>
                </div>
                <div className="px-5 pt-3 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-[0.15em] bg-[var(--accent)]/8 px-2 py-0.5 rounded-full">진짜 질문</span>
                  </div>
                  <p className="text-[15px] md:text-[17px] font-bold text-[var(--text-primary)] leading-snug tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                    기획안의 형식이 아니라,<br />대표님이 확인하고 싶은 것이 뭔지가 먼저다.
                  </p>
                  <div className="flex gap-3 mt-2.5">
                    <span className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1"><span className="text-red-400 text-[10px]">?</span> 전제 3개</span>
                    <span className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1"><span className="text-[var(--accent)]">▸</span> 뼈대 5줄</span>
                  </div>
                </div>
              </div>

              {/* Step 2: Q&A pill */}
              <div className="flex items-center gap-2 px-1">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--accent)]/[0.04] border border-[var(--accent)]/10 text-[11px]">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M3 8H13" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  <span className="text-[var(--text-tertiary)]">누가 봐?</span>
                  <span className="text-[var(--text-primary)] font-medium">대표님</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--accent)]/[0.04] border border-[var(--accent)]/10 text-[11px]">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M3 8H13" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  <span className="text-[var(--text-tertiary)]">기한?</span>
                  <span className="text-[var(--text-primary)] font-medium">2주</span>
                </div>
              </div>

              {/* Step 3: DM Feedback preview */}
              <div className="rounded-[1.25rem] border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-sm)] overflow-hidden">
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-[var(--accent)]/8 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 1a5 5 0 0 1 5 5v1a5 5 0 0 1-10 0V6a5 5 0 0 1 5-5z" stroke="var(--accent)" strokeWidth="1.2"/><path d="M5.5 14.5h5" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round"/></svg>
                    </div>
                    <span className="text-[12px] font-semibold text-[var(--text-primary)]">대표님은 뭐라고 할까?</span>
                  </div>
                  <p className="text-[12px] text-[var(--text-secondary)] italic leading-relaxed">
                    &ldquo;방향은 좋은데, 경쟁사 대비 우위가 빠져있어. 그거 넣으면 통과.&rdquo;
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">필수</span>
                    <span className="text-[10px] text-[var(--text-tertiary)]">경쟁 분석 추가</span>
                    <span className="text-[10px] text-[var(--accent)] font-medium">→ 자동 반영</span>
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

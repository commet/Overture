'use client';

import { useScrollReveal } from '@/hooks/useScrollReveal';

function RevealCard({ children, delay }: { children: React.ReactNode; delay: number }) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ delay });
  return (
    <div ref={ref} className={`h-full ${isVisible ? 'scroll-visible' : 'scroll-hidden'}`}>
      {children}
    </div>
  );
}

export function UseCaseFlow() {
  return (
    <section className="bg-[var(--surface)]">
      <div className="max-w-5xl mx-auto px-5 md:px-6 py-12 md:py-16">
        <div className="text-center mb-8 md:mb-10">
          <h2
            className="text-[24px] md:text-[36px] font-bold text-[var(--text-primary)] tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            AI 시대, 실행 전의 판단을 설계합니다
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {/* ── Feature 1: 질문 재정의 ── */}
          <RevealCard delay={0}>
            <div className="h-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg)] p-5 md:p-6 flex flex-col">
              <div className="mb-4 md:mb-5 rounded-xl bg-[var(--surface)] p-3.5 md:p-4 min-h-[100px] md:min-h-[120px] flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center text-[8px] text-red-500 font-bold">&times;</span>
                  <span className="text-[12px] md:text-[13px] text-[var(--text-secondary)] line-through decoration-red-300">&ldquo;경쟁사 대응 전략 세워줘&rdquo;</span>
                </div>
                <div className="flex justify-center my-1.5">
                  <svg width="12" height="16" viewBox="0 0 12 16"><path d="M6 0v12M2 8l4 4 4-4" stroke="var(--accent)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-[8px] text-[var(--accent)] font-bold">&check;</span>
                  <span className="text-[12px] md:text-[13px] font-semibold text-[var(--text-primary)]">&ldquo;우리만의 판은 어디인가?&rdquo;</span>
                </div>
              </div>

              <h3 className="text-[16px] md:text-[18px] font-bold text-[var(--text-primary)] mb-2 leading-snug">
                질문을 재정의합니다
              </h3>
              <p className="text-[13px] md:text-[14px] text-[var(--text-primary)]/80 leading-relaxed">
                과제 뒤에 숨은 전제를 찾아내고, 진짜 물어야 할 질문을 발견합니다.
              </p>
            </div>
          </RevealCard>

          {/* ── Feature 2: 이해관계자 시뮬레이션 ── */}
          <RevealCard delay={120}>
            <div className="h-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg)] p-5 md:p-6 flex flex-col">
              <div className="mb-4 md:mb-5 rounded-xl bg-[var(--surface)] p-3.5 md:p-4 min-h-[100px] md:min-h-[120px] flex flex-col justify-center">
                <div className="flex items-center justify-center gap-3">
                  {[
                    { initial: 'C', role: 'CEO', q: '시장 규모는?', color: '#E24B4A' },
                    { initial: 'F', role: 'CFO', q: 'ROI 근거는?', color: '#EF9F27' },
                    { initial: 'T', role: 'CTO', q: 'API 호환?', color: '#7F77DD' },
                  ].map((p) => (
                    <div key={p.role} className="flex flex-col items-center gap-1.5">
                      <div className="w-8 md:w-9 h-8 md:h-9 rounded-full flex items-center justify-center text-white text-[11px] md:text-[12px] font-bold" style={{ backgroundColor: p.color }}>
                        {p.initial}
                      </div>
                      <span className="text-[10px] md:text-[11px] font-semibold text-[var(--text-secondary)]">{p.role}</span>
                      <span className="text-[10px] md:text-[11px] text-[var(--text-primary)] bg-[var(--bg)] rounded px-1.5 py-0.5 border border-[var(--border-subtle)] font-medium">
                        {p.q}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <h3 className="text-[16px] md:text-[18px] font-bold text-[var(--text-primary)] mb-2 leading-snug">
                이해관계자를 시뮬레이션합니다
              </h3>
              <p className="text-[13px] md:text-[14px] text-[var(--text-primary)]/80 leading-relaxed">
                주요 이해관계자의 관점에서 반응과 리스크를 미리 시뮬레이션합니다.
              </p>
            </div>
          </RevealCard>

          {/* ── Feature 3: 가중 수렴 루프 ── */}
          <RevealCard delay={240}>
            <div className="h-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg)] p-5 md:p-6 flex flex-col">
              <div className="mb-4 md:mb-5 rounded-xl bg-[var(--surface)] p-3.5 md:p-4 min-h-[100px] md:min-h-[120px] flex flex-col justify-center">
                <svg viewBox="0 0 140 65" className="w-full" style={{ height: '80px' }}>
                  <line x1="20" y1="55" x2="130" y2="55" stroke="var(--border)" strokeWidth="0.5" />
                  <line x1="20" y1="15" x2="130" y2="15" stroke="var(--success)" strokeWidth="0.7" strokeDasharray="3,2" />
                  <text x="17" y="18" textAnchor="end" fontSize="7" fill="var(--success)" fontWeight="bold">80%</text>
                  <polyline points="40,32 75,17 110,10" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="40" cy="32" r="3.5" fill="var(--accent)" />
                  <circle cx="75" cy="17" r="3.5" fill="var(--accent)" />
                  <circle cx="110" cy="10" r="4" fill="var(--success)" />
                  <text x="40" y="44" textAnchor="middle" fontSize="8" fill="var(--text-secondary)" fontWeight="bold">45%</text>
                  <text x="75" y="28" textAnchor="middle" fontSize="8" fill="var(--text-secondary)" fontWeight="bold">78%</text>
                  <text x="110" y="22" textAnchor="middle" fontSize="9" fill="var(--success)" fontWeight="bold">92%</text>
                  <text x="40" y="62" textAnchor="middle" fontSize="7" fill="var(--text-tertiary)">1차</text>
                  <text x="75" y="62" textAnchor="middle" fontSize="7" fill="var(--text-tertiary)">2차</text>
                  <text x="110" y="62" textAnchor="middle" fontSize="7" fill="var(--text-tertiary)">3차</text>
                </svg>
              </div>

              <h3 className="text-[16px] md:text-[18px] font-bold text-[var(--text-primary)] mb-2 leading-snug">
                피드백을 반영하며 수렴합니다
              </h3>
              <p className="text-[13px] md:text-[14px] text-[var(--text-primary)]/80 leading-relaxed">
                매 반복마다 맥락이 누적되고, 충분히 수렴하면 실행에 옮깁니다.
              </p>
            </div>
          </RevealCard>
        </div>
      </div>
    </section>
  );
}

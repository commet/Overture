export function UseCaseFlow() {
  return (
    <section className="border-t border-[var(--border-subtle)]">
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-16">
        <div className="text-center mb-10">
          <h2 className="text-[28px] md:text-[36px] font-extrabold text-[var(--text-primary)] tracking-tight">
            AI 시대, 실행 전의 판단을 설계합니다
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* ── Feature 1: 질문 재정의 ── */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 flex flex-col">
            {/* Visual: before → after mini */}
            <div className="mb-5 rounded-xl bg-[var(--bg)] p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center text-[8px] text-red-500 font-bold">✕</span>
                <span className="text-[13px] text-[var(--text-secondary)] line-through decoration-red-300">&ldquo;경쟁사 대응 전략 세워줘&rdquo;</span>
              </div>
              <div className="flex justify-center my-1.5">
                <svg width="12" height="16" viewBox="0 0 12 16"><path d="M6 0v12M2 8l4 4 4-4" stroke="var(--accent)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-[8px] text-[var(--accent)] font-bold">✓</span>
                <span className="text-[13px] font-semibold text-[var(--text-primary)]">&ldquo;우리만의 판은 어디인가?&rdquo;</span>
              </div>
            </div>

            <h3 className="text-[18px] font-bold text-[var(--text-primary)] mb-2 leading-snug">
              질문을 재정의합니다
            </h3>
            <p className="text-[14px] text-[var(--text-primary)]/80 leading-relaxed">
              과제 뒤에 숨은 전제를 찾아내고, 진짜 물어야 할 질문을 발견합니다.
            </p>
          </div>

          {/* ── Feature 2: 이해관계자 시뮬레이션 ── */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 flex flex-col">
            {/* Visual: persona avatars with reactions */}
            <div className="mb-5 rounded-xl bg-[var(--bg)] p-4">
              <div className="flex items-center justify-center gap-3">
                {[
                  { initial: 'C', role: 'CEO', q: '시장 규모는?', color: '#E24B4A' },
                  { initial: 'F', role: 'CFO', q: 'ROI 근거는?', color: '#EF9F27' },
                  { initial: 'T', role: 'CTO', q: 'API 호환?', color: '#7F77DD' },
                ].map((p) => (
                  <div key={p.role} className="flex flex-col items-center gap-1.5">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold" style={{ backgroundColor: p.color }}>
                      {p.initial}
                    </div>
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)]">{p.role}</span>
                    <span className="text-[11px] text-[var(--text-primary)] bg-[var(--surface)] rounded px-1.5 py-0.5 border border-[var(--border-subtle)] font-medium">
                      {p.q}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <h3 className="text-[18px] font-bold text-[var(--text-primary)] mb-2 leading-snug">
              이해관계자를 시뮬레이션합니다
            </h3>
            <p className="text-[14px] text-[var(--text-primary)]/80 leading-relaxed">
              보고서를 보내기 전에 CEO, CFO, CTO의 반응과 리스크를 미리 시뮬레이션합니다.
            </p>
          </div>

          {/* ── Feature 3: 가중 수렴 루프 ── */}
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 flex flex-col">
            {/* Visual: mini convergence chart */}
            <div className="mb-5 rounded-xl bg-[var(--bg)] p-4">
              <svg viewBox="0 0 140 65" className="w-full" style={{ height: '80px' }}>
                {/* Grid */}
                <line x1="20" y1="55" x2="130" y2="55" stroke="var(--border)" strokeWidth="0.5" />
                {/* Threshold */}
                <line x1="20" y1="15" x2="130" y2="15" stroke="var(--success)" strokeWidth="0.7" strokeDasharray="3,2" />
                <text x="17" y="18" textAnchor="end" fontSize="7" fill="var(--success)" fontWeight="bold">80%</text>
                {/* Line: 45% → 78% → 92% */}
                <polyline points="40,32 75,17 110,10" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {/* Dots */}
                <circle cx="40" cy="32" r="3.5" fill="var(--accent)" />
                <circle cx="75" cy="17" r="3.5" fill="var(--accent)" />
                <circle cx="110" cy="10" r="4" fill="var(--success)" />
                {/* Labels */}
                <text x="40" y="44" textAnchor="middle" fontSize="8" fill="var(--text-secondary)" fontWeight="bold">45%</text>
                <text x="75" y="28" textAnchor="middle" fontSize="8" fill="var(--text-secondary)" fontWeight="bold">78%</text>
                <text x="110" y="22" textAnchor="middle" fontSize="9" fill="var(--success)" fontWeight="bold">92%</text>
                {/* X-axis */}
                <text x="40" y="62" textAnchor="middle" fontSize="7" fill="var(--text-tertiary)">1차</text>
                <text x="75" y="62" textAnchor="middle" fontSize="7" fill="var(--text-tertiary)">2차</text>
                <text x="110" y="62" textAnchor="middle" fontSize="7" fill="var(--text-tertiary)">3차</text>
              </svg>
            </div>

            <h3 className="text-[18px] font-bold text-[var(--text-primary)] mb-2 leading-snug">
              핵심 위협부터 해결합니다
            </h3>
            <p className="text-[14px] text-[var(--text-primary)]/80 leading-relaxed">
              핵심 위협(3배 가중) → 개선 사항 → 참고 순으로 우선순위를 매기고, 가중 수렴률이 임계점을 넘을 때까지 반복합니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

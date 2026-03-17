export function Hero() {
  return (
    <section className="max-w-3xl mx-auto pt-16 md:pt-24 pb-8">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--surface)] border border-[#eceef4] shadow-xs text-[12px] font-semibold text-[var(--text-secondary)] mb-8 tracking-wide">
          Think before you orchestrate
        </div>
        <h1 className="text-[32px] md:text-[44px] font-extrabold text-[var(--primary)] leading-[1.15] tracking-tight">
          AI에게 시키기 전에,
          <br />
          <span className="text-[var(--accent)]">무엇을 시킬지</span> 먼저.
        </h1>
        <p className="mt-6 text-[16px] text-[var(--text-secondary)] leading-relaxed max-w-lg mx-auto">
          대부분은 과제를 받으면 바로 AI에게 넘깁니다.
          <br className="hidden sm:block" />
          Overture는 그 사이에 <span className="text-[var(--text-primary)] font-semibold">판단의 구조</span>를 넣습니다.
        </p>
      </div>

      {/* The Missing Layer Visual */}
      <div className="mt-14 space-y-3">
        {/* Without Overture */}
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-red-50/50 border border-red-100/80">
          <span className="text-[12px] font-bold text-red-400/80 w-14 shrink-0 tracking-wide">Before</span>
          <div className="flex items-center gap-2 flex-1 overflow-x-auto text-[13px]">
            <span className="px-3 py-1.5 rounded-lg bg-white/80 border border-red-100 text-[var(--text-secondary)] whitespace-nowrap">과제 받음</span>
            <span className="text-red-300 shrink-0">&rarr;</span>
            <span className="px-3 py-1.5 rounded-lg bg-white/80 border border-red-100 text-[var(--text-secondary)] whitespace-nowrap">바로 AI에게</span>
            <span className="text-red-300 shrink-0">&rarr;</span>
            <span className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200/60 text-red-400 whitespace-nowrap line-through">그럴듯하지만 쓸 수 없는 결과</span>
          </div>
        </div>

        {/* With Overture */}
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-[var(--collab)]/60 border border-green-200/60">
          <span className="text-[12px] font-bold text-[#2d6b2d]/80 w-14 shrink-0 tracking-wide">After</span>
          <div className="flex items-center gap-2 flex-1 overflow-x-auto text-[13px]">
            <span className="px-3 py-1.5 rounded-lg bg-white/80 border border-green-200/60 text-[var(--text-primary)] whitespace-nowrap">과제 받음</span>
            <span className="text-[#2d6b2d]/60 shrink-0">&rarr;</span>
            <span className="px-3 py-2 rounded-lg bg-[var(--primary)] text-white font-semibold whitespace-nowrap shadow-sm">Overture로 판단</span>
            <span className="text-[#2d6b2d]/60 shrink-0">&rarr;</span>
            <span className="px-3 py-1.5 rounded-lg bg-white/80 border border-green-200/60 text-[var(--text-primary)] whitespace-nowrap">AI 실행</span>
            <span className="text-[#2d6b2d]/60 shrink-0">&rarr;</span>
            <span className="px-3 py-1.5 rounded-lg bg-white/80 border border-green-200/60 text-[#2d6b2d] font-semibold whitespace-nowrap">의사결정에 쓸 수 있는 결과</span>
          </div>
        </div>
      </div>
    </section>
  );
}

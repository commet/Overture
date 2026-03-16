export function Hero() {
  return (
    <section className="max-w-3xl mx-auto pt-10 md:pt-14 pb-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--ai)] text-[#2d4a7c] text-[12px] font-semibold mb-5">
          Think before you orchestrate
        </div>
        <h1 className="text-[30px] md:text-[36px] font-extrabold text-[var(--primary)] leading-[1.2] tracking-tight">
          AI에게 시키기 전에,
          <br />
          <span className="text-[var(--accent)]">무엇을 시킬지</span> 먼저.
        </h1>
        <p className="mt-4 text-[15px] text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto">
          대부분은 과제를 받으면 바로 AI에게 넘깁니다.
          <br className="hidden sm:block" />
          Overture는 그 사이에 <span className="text-[var(--text-primary)] font-semibold">판단의 구조</span>를 넣습니다.
        </p>
      </div>

      {/* The Missing Layer Visual */}
      <div className="mt-10 space-y-3">
        {/* Without Overture */}
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50/60 border border-red-100">
          <span className="text-[12px] font-bold text-red-400 w-16 shrink-0">Before</span>
          <div className="flex items-center gap-2 flex-1 overflow-x-auto text-[13px]">
            <span className="px-2.5 py-1 rounded-lg bg-white border border-red-100 text-[var(--text-secondary)] whitespace-nowrap">과제 받음</span>
            <span className="text-red-300">&rarr;</span>
            <span className="px-2.5 py-1 rounded-lg bg-white border border-red-100 text-[var(--text-secondary)] whitespace-nowrap">바로 AI에게</span>
            <span className="text-red-300">&rarr;</span>
            <span className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-400 whitespace-nowrap line-through">그럴듯하지만 쓸 수 없는 결과</span>
          </div>
        </div>

        {/* With Overture */}
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--collab)] border border-green-200">
          <span className="text-[12px] font-bold text-[#2d6b2d] w-16 shrink-0">After</span>
          <div className="flex items-center gap-2 flex-1 overflow-x-auto text-[13px]">
            <span className="px-2.5 py-1 rounded-lg bg-white border border-green-200 text-[var(--text-primary)] whitespace-nowrap">과제 받음</span>
            <span className="text-[#2d6b2d]">&rarr;</span>
            <span className="px-2.5 py-1.5 rounded-lg bg-[var(--primary)] text-white font-semibold whitespace-nowrap shadow-sm">Overture로 판단</span>
            <span className="text-[#2d6b2d]">&rarr;</span>
            <span className="px-2.5 py-1 rounded-lg bg-white border border-green-200 text-[var(--text-primary)] whitespace-nowrap">AI 실행</span>
            <span className="text-[#2d6b2d]">&rarr;</span>
            <span className="px-2.5 py-1 rounded-lg bg-white border border-green-200 text-[#2d6b2d] font-semibold whitespace-nowrap">의사결정에 쓸 수 있는 결과</span>
          </div>
        </div>
      </div>
    </section>
  );
}

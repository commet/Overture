export function Hero() {
  return (
    <section className="text-center max-w-2xl mx-auto pt-12 md:pt-16 pb-8">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--ai)] text-[#2d4a7c] text-[12px] font-semibold mb-5">
        Thinking Stack for AI Orchestration
      </div>
      <h1 className="text-[32px] md:text-[38px] font-extrabold text-[var(--primary)] leading-[1.2] tracking-tight">
        AI에게 시키기 전에,
        <br />
        <span className="text-[var(--accent)]">무엇을 시킬지</span> 먼저.
      </h1>
      <p className="mt-5 text-[15px] text-[var(--text-secondary)] leading-relaxed max-w-lg mx-auto">
        LangGraph가 에이전트를 실행한다면,
        이 도구는 실행 이전의 판단을 구조화합니다.
        <br className="hidden sm:block" />
        전략기획자의 사고법을 누구나 쓸 수 있는 도구로.
      </p>
    </section>
  );
}

import { Hero } from '@/components/landing/Hero';
import { ProcessFlow } from '@/components/landing/ProcessFlow';
import { UseCaseFlow } from '@/components/landing/UseCaseFlow';

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <Hero />

      <div className="border-t border-[var(--border)]" />

      <ProcessFlow />

      <div className="border-t border-[var(--border)]" />

      <UseCaseFlow />

      <div className="border-t border-[var(--border)]" />

      <section className="text-center py-10">
        <div className="text-[14px] text-[var(--text-secondary)] leading-relaxed space-y-1 max-w-md mx-auto">
          <p>
            McKinsey 컨설턴트가 화이트보드에서 하던 것,
            <br className="hidden sm:block" />
            전략기획자가 머릿속에서 하던 것.
          </p>
          <p className="text-[var(--text-primary)] font-medium mt-2">
            있었지만 도구화되지 않았던 것을 처음으로 도구화합니다.
          </p>
        </div>
        <p className="mt-6 text-[12px] text-[var(--text-secondary)]">
          Overture — 오픈소스 프로젝트
        </p>
      </section>
    </div>
  );
}

import { Hero } from '@/components/landing/Hero';
import { ToolCard } from '@/components/landing/ToolCard';
import { UseCaseFlow } from '@/components/landing/UseCaseFlow';
import { Layers, GitMerge, Map, Users } from 'lucide-react';

const tools = [
  {
    href: '/tools/decompose',
    icon: Layers,
    title: '과제 분해',
    description: '과제를 그대로 AI에 넘기지 마세요. 숨겨진 진짜 질문을 먼저 찾아냅니다.',
    color: 'bg-[var(--ai)] text-[#2d4a7c]',
  },
  {
    href: '/tools/synthesize',
    icon: GitMerge,
    title: '산출물 합성',
    description: '여러 AI의 답변이 다를 때, 쟁점을 시각화하고 당신의 판단을 구조화합니다.',
    color: 'bg-[var(--collab)] text-[#2d6b2d]',
  },
  {
    href: '/tools/orchestrate',
    icon: Map,
    title: '오케스트레이션 맵',
    description: 'AI와 사람의 역할 경계를 설계합니다. 체크포인트까지 자동 배치.',
    color: 'bg-[var(--human)] text-[#8b6914]',
  },
  {
    href: '/tools/persona-feedback',
    icon: Users,
    title: '페르소나 피드백',
    description: '"김 상무라면 뭐라고 할까?" — 보고 전에 이해관계자 반응을 시뮬레이션.',
    color: 'bg-purple-50 text-purple-600',
  },
];

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <Hero />

      {/* Tool cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-8">
        {tools.map((tool) => (
          <ToolCard key={tool.href} {...tool} />
        ))}
      </section>

      {/* Divider */}
      <div className="border-t border-[var(--border)]" />

      {/* Use case flows */}
      <UseCaseFlow />

      {/* Divider */}
      <div className="border-t border-[var(--border)]" />

      {/* Bottom */}
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
          Strategic Orchestration Toolkit — 오픈소스 프로젝트
        </p>
      </section>
    </div>
  );
}

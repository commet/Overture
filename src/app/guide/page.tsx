import { Card } from '@/components/ui/Card';
import { Layers, Map, Users, RefreshCw, ArrowRight, Link2 } from 'lucide-react';
import Link from 'next/link';

const tools = [
  {
    icon: Layers,
    number: '01',
    title: '악보 해석',
    subtitle: '문제 재정의',
    color: '#2d4a7c',
    bg: 'var(--ai)',
    href: '/workspace?step=decompose',
    why: '과제를 받으면 바로 실행하고 싶지만, 전제가 틀리면 보고서 전체가 무의미합니다. 이 단계에서 과제 뒤에 숨은 전제를 점검하고, 진짜 물어야 할 질문을 재정의합니다.',
    flow: [
      '과제의 맥락을 입력합니다 (출처, 성공 기준, 이해관계자)',
      'AI가 과제의 숨겨진 전제를 도출합니다',
      '각 전제를 직접 평가합니다 — 맞을 가능성 높음 / 확실하지 않음 / 의심됨',
      '당신의 평가를 바탕으로 AI가 질문을 재정의합니다',
      '여러 방향 중 하나를 선택하거나 직접 작성합니다',
    ],
    tip: '전제 평가가 핵심입니다. "의심됨"으로 표시한 전제가 많을수록 재정의 방향이 근본적으로 바뀝니다.',
  },
  {
    icon: Map,
    number: '02',
    title: '편곡',
    subtitle: '실행 설계',
    color: '#8b6914',
    bg: 'var(--human)',
    href: '/workspace?step=orchestrate',
    why: 'AI에게 전부 맡기면 방향이 틀어집니다. 이 단계에서 AI와 사람이 각각 무엇을 맡을지 정하고, 사람이 판단해야 할 곳에서 실제로 결정을 내립니다.',
    flow: [
      '결과물 유형, 팀 규모, 기간을 선택하고 목표를 입력합니다',
      'AI가 워크플로우를 설계합니다 (핵심 방향, 스토리라인, 단계별 역할)',
      '각 단계를 클릭하여 AI에게 가이드를 주거나, 사람의 판단이 필요한 곳에 결정을 입력합니다',
      '역할 배분(AI/사람/협업)과 체크포인트를 조정합니다',
      '전제 조건과 크리티컬 패스를 확인한 뒤 확정합니다',
    ],
    tip: '사람/협업 단계에서 선택지 칩을 클릭하면 빠르게 결정할 수 있습니다. AI 단계에는 집중할 방향이나 제약조건을 입력하세요.',
  },
  {
    icon: Users,
    number: '03',
    title: '리허설',
    subtitle: '사전 검증',
    color: '#6b4c9a',
    bg: '#f5f0fa',
    href: '/workspace?step=persona-feedback',
    why: '같은 보고서도 CEO에게 보여줄 때와 실무진에게 보여줄 때 프레이밍이 달라야 합니다. 보내기 전에 주요 이해관계자의 반응을 시뮬레이션하면 약점을 미리 보완할 수 있습니다.',
    flow: [
      '이해관계자 페르소나를 설정합니다 (프리셋 선택 또는 직접 입력)',
      '검토할 자료를 입력합니다 (이전 단계에서 자동 연결 가능)',
      'AI가 해당 페르소나의 관점에서 피드백을 생성합니다',
      '프리모템(실패 시나리오)과 3분류 리스크를 확인합니다 — 핵심 위협, 관리 가능, 침묵의 리스크',
      '승인 조건을 확인하고 보완 방향을 결정합니다',
    ],
    tip: '"침묵의 리스크"에 주목하세요. 모두 알지만 아무도 꺼내지 않는 문제가 종종 가장 위험합니다.',
  },
  {
    icon: RefreshCw,
    number: '04',
    title: '합주 연습',
    subtitle: '피드백 반영',
    color: '#2d6b2d',
    bg: 'var(--collab)',
    href: '/workspace?step=refinement-loop',
    why: '한 번의 분석으로 완벽한 결과가 나오지 않습니다. 이해관계자의 지적을 반영하여 반복하면, 매 반복마다 맥락이 누적되면서 결과가 정교해집니다.',
    flow: [
      '리허설에서 받은 피드백을 입력합니다',
      'AI가 피드백을 반영하여 분석을 개선합니다',
      '수렴률을 확인합니다 — 충분히 수렴하면 실행 준비 완료',
      '필요하면 추가 반복합니다 (맥락이 누적됩니다)',
    ],
    tip: '핵심은 "반복" 자체가 아니라 맥락 누적입니다. 각 반복에서 발견한 사실이 다음 반복의 제약조건이 됩니다.',
  },
];

export default function GuidePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[22px] font-bold text-[var(--text-primary)]">사용 가이드</h1>
        <p className="text-[14px] text-[var(--text-secondary)] mt-2 leading-relaxed max-w-2xl">
          Overture는 네 단계로 작동합니다. 각 단계는 독립적으로 사용할 수 있지만,
          순서대로 진행하면 이전 단계의 맥락이 자동으로 연결됩니다.
        </p>
        <div className="mt-4 flex items-start gap-2.5 bg-[var(--ai)] rounded-xl px-4 py-3 text-[13px] text-[#2d4a7c]">
          <Link2 size={14} className="shrink-0 mt-0.5" />
          <p>
            <strong>맥락 체인:</strong> 악보 해석의 결과가 편곡으로, 편곡의 결과가 리허설로 자동 전달됩니다.
            각 단계에서 쌓인 판단이 다음 단계의 품질을 높입니다.
          </p>
        </div>
        <div className="mt-3 text-[13px] text-[var(--text-secondary)]">
          처음이라면 <Link href="/demo" className="underline font-semibold text-[var(--accent)]">5분 데모</Link>를 먼저 체험해보세요.
        </div>
      </div>

      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <Card key={tool.number}>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-[24px] font-extrabold leading-none select-none" style={{ color: `${tool.color}25` }}>
                {tool.number}
              </span>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: tool.bg }}>
                <Icon size={18} style={{ color: tool.color }} />
              </div>
              <div>
                <h2 className="text-[18px] font-bold text-[var(--text-primary)]">{tool.title} <span className="text-[14px] font-normal text-[var(--text-secondary)]">| {tool.subtitle}</span></h2>
              </div>
            </div>

            <div className="space-y-4">
              {/* Why */}
              <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">{tool.why}</p>

              {/* Flow */}
              <div>
                <p className="text-[13px] font-bold text-[var(--text-primary)] mb-2">사용 흐름</p>
                <div className="space-y-1.5">
                  {tool.flow.map((step, j) => (
                    <div key={j} className="flex items-start gap-2.5">
                      <span
                        className="text-[12px] font-bold tabular-nums leading-none pt-1 shrink-0 select-none"
                        style={{ color: `${tool.color}50` }}
                      >
                        {j + 1}
                      </span>
                      <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tip */}
              <div className="rounded-lg px-4 py-3" style={{ backgroundColor: `${tool.bg}` }}>
                <p className="text-[13px] leading-relaxed" style={{ color: tool.color }}>
                  <strong>Tip:</strong> {tool.tip}
                </p>
              </div>

              {/* CTA */}
              <Link
                href={tool.href}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--accent)] hover:underline"
              >
                시작하기 <ArrowRight size={14} />
              </Link>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

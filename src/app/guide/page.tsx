import { Card } from '@/components/ui/Card';
import { Layers, Map, Users, RefreshCw, ArrowRight, Link2, Zap, Bot, Sparkles, MessageSquare } from 'lucide-react';
import Link from 'next/link';

const tools = [
  {
    icon: Layers,
    number: '01',
    title: '악보 해석',
    subtitle: '문제 재정의',
    color: '#2d4a7c',
    bg: 'var(--ai)',
    href: '/workspace?step=reframe',
    why: '과제를 받으면 바로 실행하고 싶지만, 전제가 틀리면 보고서 전체가 무의미합니다. 이 단계에서 과제 뒤에 숨은 전제를 점검하고, 진짜 물어야 할 질문을 재정의합니다.',
    flow: [
      '과제의 맥락을 입력합니다 (출처, 성공 기준, 이해관계자)',
      '과제의 숨겨진 전제를 함께 도출합니다',
      '각 전제를 직접 평가합니다 — 맞을 가능성 높음 / 확실하지 않음 / 의심됨',
      '당신의 평가에 따라 질문이 재정의됩니다',
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
    href: '/workspace?step=recast',
    why: 'AI에게 전부 맡기면 방향이 틀어집니다. 이 단계에서 AI와 사람이 각각 무엇을 맡을지 정하고, 사람이 판단해야 할 곳에서 실제로 결정을 내립니다.',
    flow: [
      '결과물 유형, 팀 규모, 기간을 선택하고 목표를 입력합니다',
      '워크플로우가 설계됩니다 (핵심 방향, 스토리라인, 단계별 역할)',
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
    href: '/workspace?step=rehearse',
    why: '같은 보고서도 CEO에게 보여줄 때와 실무진에게 보여줄 때 프레이밍이 달라야 합니다. 보내기 전에 주요 이해관계자의 반응을 시뮬레이션하면 약점을 미리 보완할 수 있습니다.',
    flow: [
      '이해관계자 페르소나를 설정합니다 (프리셋 선택 또는 직접 입력)',
      '검토할 자료를 입력합니다 (이전 단계에서 전달 가능)',
      '해당 페르소나의 관점에서 피드백을 시뮬레이션합니다',
      '실패 시나리오와 3분류 리스크를 확인합니다 — 핵심 위협, 관리 가능, 침묵의 리스크',
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
    href: '/workspace?step=refine',
    why: '한 번의 분석으로 완벽한 결과가 나오지 않습니다. 이해관계자의 지적을 반영하여 반복하면, 매 반복마다 맥락이 누적되면서 결과가 정교해집니다.',
    flow: [
      '리허설에서 받은 피드백을 입력합니다',
      '피드백이 반영되어 분석이 개선됩니다',
      '수렴률을 확인합니다 — 충분히 수렴하면 실행 준비 완료',
      '필요하면 추가 반복합니다 (맥락이 누적됩니다)',
    ],
    tip: '핵심은 "반복" 자체가 아니라 맥락 누적입니다. 각 반복에서 발견한 사실이 다음 반복의 제약조건이 됩니다.',
  },
  {
    icon: Sparkles,
    number: '05',
    title: '종합',
    subtitle: '다중 관점 통합',
    color: '#9b5de5',
    bg: '#f3ecff',
    href: '/workspace?step=synthesize',
    why: '여러 분석 결과나 의견이 있을 때, 단순히 합치면 핵심이 묻힙니다. 이 단계에서 합의점과 쟁점을 구조화하고, 쟁점별로 직접 판단을 내려 최종 결론을 완성합니다.',
    flow: [
      '비교할 소스(AI 분석 결과, 전문가 의견 등)를 입력합니다',
      '각 소스의 핵심 주장을 추출하고 정리합니다',
      '합의점과 충돌 쟁점을 자동으로 분류합니다',
      '각 쟁점에서 어느 쪽을 취할지 직접 결정합니다',
      '최종 종합 문서가 생성됩니다',
    ],
    tip: '이전 단계(합주 연습)에서 넘어오면 맥락이 자동으로 연결됩니다. 독립적으로 사용할 때는 소스를 직접 붙여넣으세요.',
  },
];

export default function GuidePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[22px] font-bold text-[var(--text-primary)]">사용 가이드</h1>
        <p className="text-[14px] text-[var(--text-secondary)] mt-2 leading-relaxed max-w-2xl">
          고민을 입력하면 에이전트 팀이 분석·조사·작성을 수행하고, 제출 가능한 문서를 만들어줍니다.
        </p>
      </div>

      {/* 빠른 시작 */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-gold)' }}>
            <Zap size={18} className="text-white" />
          </div>
          <h2 className="text-[18px] font-bold text-[var(--text-primary)]">빠른 시작</h2>
        </div>
        <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed mb-4">
          워크스페이스에서 고민을 입력하면 바로 시작됩니다. 질문 몇 개에 답하면 에이전트 팀이 병렬로 작업하고, 초안이 완성됩니다.
        </p>
        <div className="space-y-2 mb-4">
          {['고민 입력 → 30초 안에 분석 뼈대', '질문 2~3개 응답 → 에이전트 팀 자동 배정', '팀이 병렬 작업 → 결과 승인/거부', '초안 조합 + 의사결정자 시뮬레이션'].map((step, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="text-[12px] font-bold tabular-nums leading-none pt-1 shrink-0 select-none" style={{ color: 'var(--accent)' }}>{i + 1}</span>
              <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{step}</p>
            </div>
          ))}
        </div>
        <Link href="/workspace" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--accent)] hover:underline">
          워크스페이스로 가기 <ArrowRight size={14} />
        </Link>
      </Card>

      {/* 에이전트 팀 */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--surface)] border border-[var(--border)]">
            <Bot size={18} className="text-[var(--text-secondary)]" />
          </div>
          <h2 className="text-[18px] font-bold text-[var(--text-primary)]">에이전트 팀</h2>
        </div>
        <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed mb-3">
          17명의 전문 에이전트가 각자의 방법론으로 작업합니다. 사용할수록 레벨업하고, 당신의 선호를 학습합니다.
        </p>
        <div className="grid grid-cols-2 gap-2 text-[12px] text-[var(--text-primary)] mb-4">
          <div><span className="text-[var(--text-tertiary)]">리서치:</span> 하윤 → 다은 → 도윤</div>
          <div><span className="text-[var(--text-tertiary)]">전략:</span> 정민 → 현우 → 승현</div>
          <div><span className="text-[var(--text-tertiary)]">실행:</span> 서연 · 규민 · 혜연 · 수진 · 민서 · 준서 · 예린</div>
          <div><span className="text-[var(--text-tertiary)]">검증:</span> 동혁 · 지은 · 윤석</div>
        </div>
        <div className="rounded-lg px-4 py-3 bg-[var(--bg)] space-y-2">
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
            <strong>Tip:</strong> 에이전트 결과를 승인/거부하면 XP가 쌓이고 레벨업합니다. Lv.2부터 당신의 패턴을 학습해서 결과가 달라집니다.
          </p>
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
            <strong>해금:</strong> 일부 에이전트(도윤, 승현 등)는 체인 내 다른 에이전트의 작업 횟수가 일정 수에 도달하면 자동으로 해금됩니다.
          </p>
        </div>
        <Link href="/agents" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--accent)] hover:underline mt-4">
          에이전트 허브 <ArrowRight size={14} />
        </Link>
      </Card>

      {/* 4R 상세 도구 */}
      <div>
        <h2 className="text-[16px] font-bold text-[var(--text-primary)] mb-1">상세 도구</h2>
        <p className="text-[13px] text-[var(--text-secondary)] mb-4">
          빠른 시작 외에, 각 단계를 독립적으로 사용할 수도 있습니다. 순서대로 진행하면 맥락이 이어집니다.
        </p>
        <div className="flex items-start gap-2.5 bg-[var(--ai)] rounded-xl px-4 py-3 text-[13px] text-[#2d4a7c] mb-6">
          <Link2 size={14} className="shrink-0 mt-0.5" />
          <p>
            <strong>맥락 체인:</strong> 악보 해석 → 편곡 → 리허설 → 합주 → 종합으로 맥락이 이어집니다.
          </p>
        </div>
      </div>

      {/* 팀장 시뮬레이터 */}
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-red-50 border border-red-100">
            <MessageSquare size={18} className="text-red-500" />
          </div>
          <h2 className="text-[18px] font-bold text-[var(--text-primary)]">팀장 시뮬레이터</h2>
        </div>
        <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed mb-3">
          MBTI + 사주 기반으로 실제 팀장의 성격을 설정하고, 보고 연습을 할 수 있습니다.
          팀장의 기분이 실시간으로 변하며, 입력창 힌트로 코칭을 받습니다.
        </p>
        <div className="space-y-2 mb-4">
          {['팀장의 MBTI 4축 + 생년월일 입력', '상황 설명 (보고, 제안, 갈등 등)', '대화 시작 — 팀장 mood가 실시간 반응', '설득에 성공하거나 결론이 나면 종료'].map((step, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="text-[12px] font-bold tabular-nums leading-none pt-1 shrink-0 select-none text-red-400">{i + 1}</span>
              <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{step}</p>
            </div>
          ))}
        </div>
        <Link href="/boss" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--accent)] hover:underline">
          팀장 시뮬레이터 <ArrowRight size={14} />
        </Link>
      </Card>

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

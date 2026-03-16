import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Layers, GitMerge, Map, Users, Zap, SlidersHorizontal } from 'lucide-react';

const guides = [
  {
    icon: Layers,
    title: '주제 파악',
    subtitle: '풀어야 할 진짜 문제 찾기',
    why: 'AI에게 "경쟁사 분석 보고서 작성해줘"라고 바로 시키면, 결과물은 그럴듯하지만 의사결정에 쓸 수 없는 경우가 많습니다. 전략기획자는 과제를 받으면 바로 실행하지 않고, 먼저 "이 과제의 진짜 목적이 뭔지" 질문합니다.',
    autoFlow: '과제를 자연어로 입력 → AI가 숨겨진 질문 2~3개 제안 → 진짜 질문 선택 → AI/사람 역할 자동 분배 → 마크다운 복사',
    guidedFlow: '과제 입력 → 단계별로 목적/재정의/역할을 직접 작성 → AI가 각 단계를 검토하고 제안',
    color: 'bg-[var(--ai)] text-[#2d4a7c]',
  },
  {
    icon: GitMerge,
    title: '조율',
    subtitle: '서로 다른 AI 결과를 내 기준으로 맞추기',
    why: 'ChatGPT, Claude, Gemini에게 같은 질문을 했는데 답이 다르다면? "그냥 종합해줘"라고 AI에게 다시 맡기면, 갈등이 묻히고 표면적 합의만 남습니다. 진짜 쟁점을 드러내고, 당신의 맥락에서 판단해야 합니다.',
    autoFlow: '결과물을 한 번에 붙여넣기 → AI가 소스 분리 + 합의점/쟁점 자동 분석 → 쟁점별 판단 입력 → 종합 결론 생성',
    guidedFlow: '소스를 하나씩 추가 → 합의/쟁점을 직접 정리 → AI가 누락된 관점 제안',
    color: 'bg-[var(--collab)] text-[#2d6b2d]',
  },
  {
    icon: Map,
    title: '역할 편성',
    subtitle: 'AI와 사람의 역할 경계 설계',
    why: '"이 단계는 AI가 초안을 쓰고, 여기서 사람이 검증하고" — 이 설계 없이 AI와 협업하면 효율이 크게 떨어집니다. 전략기획자가 프로젝트 R&R과 타임라인을 설계하는 것과 같은 원리입니다.',
    autoFlow: '최종 목표 + 상황 입력 → AI가 전체 워크플로우 자동 설계 (3~8단계) → 드래그로 순서/담당 조정 → 체크포인트 확인',
    guidedFlow: '목표 입력 → 단계를 직접 추가하며 구성 → AI가 체크포인트와 역할 배분 제안',
    color: 'bg-[var(--human)] text-[#8b6914]',
  },
  {
    icon: Users,
    title: '리허설',
    subtitle: '보내기 전 이해관계자 반응 시뮬레이션',
    why: '"김 상무라면 이 보고서 보고 뭐라고 할까?" — 같은 자료도 CEO에게 보여줄 때와 실무진에게 보여줄 때 프레이밍이 달라야 합니다. 미리 시뮬레이션하면 보고 전에 약점을 보완할 수 있습니다.',
    autoFlow: '프리셋(CEO, CFO 등)에서 선택하거나 자유 텍스트로 페르소나 등록 → 자료 붙여넣기 → AI가 질문/칭찬/우려/추가요청 구조화 피드백 생성',
    guidedFlow: '파일 업로드로 페르소나 자동 추출 → 피드백 로그 축적 → 실제 반응 기록으로 정확도 향상',
    color: 'bg-purple-50 text-purple-600',
    highlight: '피드백 로그가 쌓일수록 AI의 시뮬레이션 정확도가 높아집니다. 실제 이해관계자의 반응을 기록해두세요.',
  },
];

export default function GuidePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[22px] font-bold text-[var(--text-primary)]">사용 가이드</h1>
        <p className="text-[14px] text-[var(--text-secondary)] mt-2 leading-relaxed">
          각 도구는 두 가지 모드로 사용할 수 있습니다.
        </p>
        <div className="flex items-center gap-4 mt-3 text-[13px]">
          <span className="flex items-center gap-1.5 text-[var(--text-primary)] font-medium">
            <Zap size={14} className="text-[var(--accent)]" /> <strong>Auto</strong> — AI가 80%, 당신은 판단만
          </span>
          <span className="flex items-center gap-1.5 text-[var(--text-primary)] font-medium">
            <SlidersHorizontal size={14} className="text-[var(--accent)]" /> <strong>Guided</strong> — 단계별 직접 제어
          </span>
        </div>
      </div>

      {guides.map((guide, i) => {
        const Icon = guide.icon;
        return (
          <Card key={i}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${guide.color}`}>
                <Icon size={20} />
              </div>
              <div>
                <h2 className="text-[18px] font-bold text-[var(--text-primary)]">{guide.title}</h2>
                <p className="text-[12px] text-[var(--text-secondary)]">{guide.subtitle}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-[13px] font-bold text-[var(--accent)] mb-1">왜 필요한가?</h3>
                <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">{guide.why}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-[var(--ai)] rounded-xl p-4">
                  <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#2d4a7c] mb-2">
                    <Zap size={12} /> Auto 모드
                  </div>
                  <p className="text-[13px] text-[#2d4a7c] leading-relaxed">{guide.autoFlow}</p>
                </div>
                <div className="bg-[var(--bg)] rounded-xl p-4 border border-[var(--border)]">
                  <div className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--text-primary)] mb-2">
                    <SlidersHorizontal size={12} /> Guided 모드
                  </div>
                  <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{guide.guidedFlow}</p>
                </div>
              </div>

              {guide.highlight && (
                <div className="bg-[var(--checkpoint)] rounded-lg px-4 py-3">
                  <p className="text-[12px] text-amber-800 font-medium">{guide.highlight}</p>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

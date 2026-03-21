'use client';

import { useEffect } from 'react';
import { useDecomposeStore } from '@/stores/useDecomposeStore';
import { useOrchestrateStore } from '@/stores/useOrchestrateStore';
import { usePersonaStore } from '@/stores/usePersonaStore';
import { useRefinementStore } from '@/stores/useRefinementStore';
import { useJudgmentStore } from '@/stores/useJudgmentStore';
import { Check, AlertTriangle, Circle, Shield } from 'lucide-react';

interface Props {
  projectId: string;
}

interface ReadinessCheck {
  label: string;
  status: 'done' | 'partial' | 'missing';
  detail: string;
  weight: number;
  action?: string;
}

export function ExecutionReadiness({ projectId }: Props) {
  const { items: decomposeItems, loadItems: loadDecompose } = useDecomposeStore();
  const { items: orchestrateItems, loadItems: loadOrchestrate } = useOrchestrateStore();
  const { feedbackHistory, loadData: loadPersona } = usePersonaStore();
  const { loops, loadLoops } = useRefinementStore();
  const { judgments, loadJudgments } = useJudgmentStore();

  useEffect(() => {
    loadDecompose();
    loadOrchestrate();
    loadPersona();
    loadLoops();
    loadJudgments();
  }, [loadDecompose, loadOrchestrate, loadPersona, loadLoops, loadJudgments]);

  const d = decomposeItems.filter(i => i.project_id === projectId);
  const o = orchestrateItems.filter(i => i.project_id === projectId);
  const fb = feedbackHistory.filter(i => i.project_id === projectId);
  const lp = loops.filter(i => i.project_id === projectId);

  const latestD = d[d.length - 1];
  const latestO = o[o.length - 1];
  const latestFb = fb[fb.length - 1];
  const latestLoop = lp[lp.length - 1];

  const assumptions = latestD?.analysis?.hidden_assumptions || [];
  const steps = latestO?.steps || [];
  const keyAssumptions = latestO?.analysis?.key_assumptions || [];
  const personaCount = latestFb?.results?.length || 0;
  const criticalRisks = latestFb?.results?.flatMap(r => r.classified_risks?.filter(cr => cr.category === 'critical') || []) || [];
  const lastIter = latestLoop?.iterations?.[latestLoop.iterations.length - 1];
  const convergence = lastIter?.convergence ? (lastIter.convergence.critical_risks === 0 ? 1 : 0.5) : 0;

  const checks: ReadinessCheck[] = [
    {
      label: '숨겨진 전제 발견',
      status: assumptions.length >= 2 ? 'done' : assumptions.length >= 1 ? 'partial' : 'missing',
      detail: assumptions.length > 0 ? `${assumptions.length}건` : '—',
      weight: 20,
      action: assumptions.length < 2 ? '악보 해석에서 과제를 분석하세요' : undefined,
    },
    {
      label: '진짜 질문 재정의',
      status: latestD?.selected_question ? 'done' : latestD?.analysis ? 'partial' : 'missing',
      detail: latestD?.selected_question ? '완료' : latestD?.analysis ? '미선택' : '—',
      weight: 20,
      action: !latestD?.selected_question && latestD?.analysis ? '질문을 선택하고 확정하세요' : !latestD?.analysis ? '악보 해석을 먼저 실행하세요' : undefined,
    },
    {
      label: 'AI/사람 역할 설계',
      status: steps.length >= 3 ? 'done' : steps.length > 0 ? 'partial' : 'missing',
      detail: steps.length > 0 ? `${steps.length}단계` : '—',
      weight: 20,
      action: steps.length === 0 ? '편곡에서 워크플로우를 설계하세요' : undefined,
    },
    {
      label: '이해관계자 검증',
      status: personaCount >= 2 ? 'done' : personaCount >= 1 ? 'partial' : 'missing',
      detail: personaCount > 0 ? `${personaCount}명` : '—',
      weight: 20,
      action: personaCount === 0 ? '리허설에서 페르소나를 등록하고 피드백을 받으세요' : personaCount === 1 ? '이해관계자 1명 추가를 권장합니다' : undefined,
    },
    {
      label: '리스크 식별 및 대응',
      status: criticalRisks.length > 0 && latestLoop ? 'done' : criticalRisks.length > 0 ? 'partial' : personaCount > 0 ? 'partial' : 'missing',
      detail: criticalRisks.length > 0 ? `핵심 ${criticalRisks.length}건${latestLoop ? ', 대응 진행' : ''}` : personaCount > 0 ? '위협 없음' : '—',
      weight: 10,
      action: criticalRisks.length > 0 && !latestLoop ? '합주 연습에서 핵심 위협에 대응하세요' : undefined,
    },
    {
      label: '피드백 수렴',
      status: convergence >= 0.8 ? 'done' : convergence > 0 ? 'partial' : 'missing',
      detail: latestLoop ? `${Math.round(convergence * 100)}%` : '선택적',
      weight: 10,
      action: latestLoop && convergence < 0.8 ? '수렴률이 80% 미만입니다. 반복을 계속하세요' : undefined,
    },
  ];

  // Don't render if no data at all
  if (checks.every(c => c.status === 'missing')) return null;

  const score = checks.reduce((sum, c) => {
    if (c.status === 'done') return sum + c.weight;
    if (c.status === 'partial') return sum + Math.round(c.weight * 0.4);
    return sum;
  }, 0);

  const label = score >= 80 ? '실행 준비 완료' : score >= 50 ? '추가 검증 권장' : '분석 진행 중';
  const color = score >= 80 ? 'var(--success)' : score >= 50 ? '#d97706' : 'var(--accent)';

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 bg-[var(--bg)] border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={16} style={{ color }} />
            <h3 className="text-[14px] font-bold text-[var(--text-primary)]">실행 준비도</h3>
          </div>
          <span className="text-[22px] font-extrabold tabular-nums" style={{ color }}>{score}%</span>
        </div>
        <div className="flex h-1.5 rounded-full overflow-hidden mt-2 bg-[var(--border)]">
          <div className="rounded-full transition-all duration-500" style={{ width: `${score}%`, backgroundColor: color }} />
        </div>
        <p className="text-[12px] font-semibold mt-1.5" style={{ color }}>{label}</p>
      </div>

      {/* Checks */}
      <div className="px-5 py-3 divide-y divide-[var(--border-subtle)]">
        {checks.map((check, i) => (
          <div key={i} className="py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {check.status === 'done' ? (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--success)' }}>
                    <Check size={12} className="text-white" />
                  </div>
                ) : check.status === 'partial' ? (
                  <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
                    <AlertTriangle size={11} className="text-white" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[var(--border)] flex items-center justify-center">
                    <Circle size={8} className="text-[var(--text-tertiary)]" />
                  </div>
                )}
                <span className={`text-[13px] ${check.status === 'missing' ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'}`}>
                  {check.label}
                </span>
              </div>
              <span className={`text-[11px] tabular-nums ${check.status === 'done' ? 'text-[var(--success)] font-semibold' : 'text-[var(--text-secondary)]'}`}>
                {check.detail}
              </span>
            </div>
            {check.action && (
              <p className="text-[11px] text-[var(--accent)] ml-[30px] mt-0.5">&rarr; {check.action}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

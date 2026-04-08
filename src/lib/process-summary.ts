/**
 * Process Summary — 단일 의사결정의 Inner Loop 스코어보드
 *
 * 사용자가 하나의 의사결정을 완료한 후 즉각적인 프로세스 품질 피드백을 제공한다.
 * "First Use Must Astonish" 원칙의 핵심 구현체.
 *
 * Autoresearch 패턴의 SCORE 단계에 해당:
 * DQ score + 축 커버리지 + 가정 발견 수 = 즉각적 프로세스 점수
 */

import { getStorage, STORAGE_KEYS } from '@/lib/storage';
import { getDQScores } from '@/lib/decision-quality';
import { getLatestDone } from '@/lib/storage-helpers';
import type {
  ReframeItem,
  RecastItem,
  FeedbackRecord,
  RefineLoop,
  Project,
  DecisionQualityScore,
} from '@/stores/types';

const ASSUMPTION_AXES = ['customer_value', 'feasibility', 'business', 'org_capacity'] as const;

export interface ProcessSummary {
  project_id: string;
  project_name: string;

  // Reframe
  assumptions_found: number;
  assumptions_evaluated: number;
  axes_covered: string[];
  axes_missing: string[];

  // Recast
  steps_designed: number;
  has_checkpoints: boolean;

  // Rehearse
  personas_used: number;
  risks_identified: { critical: number; manageable: number; unspoken: number };

  // Refine
  convergence_iterations: number;
  converged: boolean;

  // DQ
  dq_score: number | null;
  strongest_element: string | null;
  weakest_element: string | null;

  // Completeness (which steps were completed)
  steps_completed: number;
  total_steps: number;
}

const DQ_ELEMENT_LABELS: Record<string, string> = {
  appropriate_frame: '프레이밍',
  creative_alternatives: '대안 탐색',
  relevant_information: '정보 수집',
  clear_values: '관점 다양성',
  sound_reasoning: '추론 품질',
  commitment_to_action: '실행 가능성',
};

export function buildProcessSummary(projectId: string): ProcessSummary | null {
  const projects = getStorage<Project[]>(STORAGE_KEYS.PROJECTS, []);
  const project = projects.find(p => p.id === projectId);
  if (!project) return null;

  // Helper: find linked item by tool type
  const refs = project.refs || [];
  const findRef = (tool: string) => refs.find(r => r.tool === tool)?.itemId;

  // ── Reframe ──
  const reframeItems = getStorage<ReframeItem[]>(STORAGE_KEYS.REFRAME_LIST, []);
  const reframeRefId = findRef('reframe');
  const reframeItem = reframeItems.find(
    d => d.status === 'done' && d.id === reframeRefId
  ) || getLatestDone(reframeItems);

  const assumptions = reframeItem?.analysis?.hidden_assumptions || [];
  const assumptionsFound = assumptions.length;
  const assumptionsEvaluated = assumptions.filter(
    a => !!a.evaluation
  ).length;

  const axesCovered = [...new Set(
    assumptions.map(a => a.axis).filter(Boolean) as string[]
  )];
  const axesMissing = ASSUMPTION_AXES.filter(ax => !axesCovered.includes(ax));

  // ── Recast ──
  const recastItems = getStorage<RecastItem[]>(STORAGE_KEYS.RECAST_LIST, []);
  const recastRefId = findRef('recast');
  const recastItem = recastItems.find(
    o => o.status === 'done' && o.id === recastRefId
  ) || getLatestDone(recastItems);

  const steps = recastItem?.analysis?.steps || [];
  const hasCheckpoints = steps.some(s => s.checkpoint);

  // ── Rehearse ──
  const feedbackRecords = getStorage<FeedbackRecord[]>(STORAGE_KEYS.FEEDBACK_HISTORY, []);
  const rehearseRefId = findRef('rehearse');
  const feedbackRecord = feedbackRecords.find(
    f => f.id === rehearseRefId
  ) || feedbackRecords[feedbackRecords.length - 1];

  let personasUsed = 0;
  const risks = { critical: 0, manageable: 0, unspoken: 0 };

  if (feedbackRecord?.results) {
    personasUsed = feedbackRecord.results.length;
    for (const result of feedbackRecord.results) {
      for (const risk of result.classified_risks || []) {
        const cat = risk.category as keyof typeof risks;
        if (cat in risks) risks[cat]++;
      }
    }
  }

  // ── Refine ──
  const refineLoops = getStorage<RefineLoop[]>(STORAGE_KEYS.REFINE_LOOPS, []);
  const refineLoop = refineLoops.find(l => l.project_id === projectId)
    || refineLoops[refineLoops.length - 1];

  const convergenceIterations = refineLoop?.iterations?.length || 0;
  const converged = refineLoop?.status === 'converged';

  // ── DQ ──
  const dqScores = getDQScores(projectId);
  const latestDQ = dqScores.length > 0 ? dqScores[dqScores.length - 1] : null;

  let strongestElement: string | null = null;
  let weakestElement: string | null = null;

  if (latestDQ) {
    const elements = Object.keys(DQ_ELEMENT_LABELS) as (keyof DecisionQualityScore)[];
    let maxVal = -1;
    let minVal = 6;
    for (const key of elements) {
      const val = (latestDQ[key] as number) || 0;
      if (val > maxVal) { maxVal = val; strongestElement = DQ_ELEMENT_LABELS[key]; }
      if (val < minVal) { minVal = val; weakestElement = DQ_ELEMENT_LABELS[key]; }
    }
  }

  // ── Completeness ──
  let stepsCompleted = 0;
  if (reframeItem) stepsCompleted++;
  if (recastItem) stepsCompleted++;
  if (feedbackRecord) stepsCompleted++;
  if (refineLoop) stepsCompleted++;

  return {
    project_id: projectId,
    project_name: project.name || '제목 없음',
    assumptions_found: assumptionsFound,
    assumptions_evaluated: assumptionsEvaluated,
    axes_covered: axesCovered,
    axes_missing: axesMissing,
    steps_designed: steps.length,
    has_checkpoints: hasCheckpoints,
    personas_used: personasUsed,
    risks_identified: risks,
    convergence_iterations: convergenceIterations,
    converged,
    dq_score: latestDQ?.overall_dq ?? null,
    strongest_element: strongestElement,
    weakest_element: weakestElement,
    steps_completed: stepsCompleted,
    total_steps: 4,
  };
}

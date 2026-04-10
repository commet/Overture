/**
 * Progressive ↔ 4R Pipeline Handoff
 *
 * Progressive 세션에서 Reframe/Rehearse로 분기하거나,
 * 4R 결과를 가지고 Progressive로 복귀할 때 사용하는 변환 함수.
 */

import type {
  ProgressiveSession,
  AnalysisSnapshot,
  ReframeItem,
  ReframeAnalysis,
  HiddenAssumption,
  RecastItem,
  RecastAnalysis,
  RecastStep,
  ActorRelationship,
} from '@/stores/types';
import { generateId } from '@/lib/uuid';

// ─── Progressive → Reframe ───

/**
 * 현재 Progressive 스냅샷을 ReframeItem으로 변환.
 * 사용자가 "더 깊이 재정의"하고 싶을 때 호출.
 */
export function exportProgressiveAsReframe(session: ProgressiveSession): ReframeItem {
  const latestSnapshot = session.snapshots[session.snapshots.length - 1];
  if (!latestSnapshot) {
    throw new Error('No snapshots in session');
  }

  // Q&A를 reasoning narrative로 변환
  const narrative = session.answers
    .map((a, i) => {
      const q = session.questions[i];
      return q ? `Q: ${q.text}\nA: ${a.value}` : `A: ${a.value}`;
    })
    .join('\n\n');

  const analysis: ReframeAnalysis = {
    surface_task: session.problem_text,
    reframed_question: latestSnapshot.real_question,
    why_reframing_matters: latestSnapshot.insight || 'Progressive 분석에서 도출된 질문',
    reasoning_narrative: narrative,
    hidden_assumptions: latestSnapshot.hidden_assumptions.map((a): HiddenAssumption => ({
      assumption: a,
      risk_if_false: '미분석',
      verified: false,
    })),
    hidden_questions: [],
    ai_limitations: [],
  };

  return {
    id: generateId(),
    project_id: session.project_id,
    input_text: session.problem_text,
    analysis,
    selected_question: latestSnapshot.real_question,
    status: 'review',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ─── Progressive → Recast (for Rehearse) ───

/**
 * 현재 Progressive 스냅샷을 RecastItem으로 변환.
 * execution_plan이 있을 때, Rehearse에서 이해관계자 피드백을 받기 위해.
 */
export function exportProgressiveAsRecast(session: ProgressiveSession): RecastItem {
  const latestSnapshot = session.snapshots[session.snapshots.length - 1];
  if (!latestSnapshot) {
    throw new Error('No snapshots in session');
  }

  const steps: RecastStep[] = (latestSnapshot.execution_plan?.steps || []).map((step, i) => {
    // v2 agent_type → actor 변환
    const agentType = step.agent_type || (step.who === 'both' ? 'ai' : step.who === 'human' ? 'self' : 'ai');
    const actor: ActorRelationship = agentType === 'self' ? 'human'
      : agentType === 'human' ? 'human'
      : step.self_scope ? 'human→ai'
      : 'ai';
    return {
      task: step.task,
      actor,
      actor_reasoning: 'Progressive 분석에서 도출',
      expected_output: step.output,
      checkpoint: i === 0,
      checkpoint_reason: i === 0 ? '첫 단계는 항상 검증 필요' : '',
      estimated_time: '미정',
      ai_scope: step.ai_scope || '',
      human_scope: step.self_scope || '',
    };
  });

  const analysis: RecastAnalysis = {
    governing_idea: latestSnapshot.real_question,
    storyline: {
      situation: session.problem_text.slice(0, 200),
      complication: latestSnapshot.hidden_assumptions[0] || '미정의',
      resolution: latestSnapshot.real_question,
    },
    goal_summary: latestSnapshot.skeleton[0] || session.problem_text.slice(0, 100),
    steps,
    key_assumptions: (latestSnapshot.execution_plan?.key_assumptions || latestSnapshot.hidden_assumptions).map(a => ({
      assumption: a,
      importance: 'medium' as const,
      certainty: 'medium' as const,
      if_wrong: '검토 필요',
    })),
    critical_path: steps.length > 0 ? [0, steps.length - 1] : [],
    total_estimated_time: '미정',
    ai_ratio: 0.5,
    human_ratio: 0.5,
    design_rationale: 'Progressive 분석에서 자동 변환',
  };

  return {
    id: generateId(),
    project_id: session.project_id,
    input_text: session.problem_text,
    analysis,
    steps,
    status: 'review',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ─── Reframe → Progressive (복귀) ───

/**
 * Reframe 결과를 가지고 Progressive 세션의 real_question을 업데이트.
 * 원래 세션의 Q&A와 snapshots는 유지하면서 방향만 재설정.
 */
export function applyReframeToProgressive(
  session: ProgressiveSession,
  reframedQuestion: string,
  newAssumptions?: string[],
): Partial<ProgressiveSession> {
  const snapshots = [...session.snapshots];
  const latest = snapshots[snapshots.length - 1];

  if (latest) {
    const updated: AnalysisSnapshot = {
      ...latest,
      real_question: reframedQuestion,
      version: latest.version + 0.5, // 외부 수정 표시
      framing_locked: true,
      framing_confidence: 90, // Reframe을 거쳤으므로 높은 확신
    };

    if (newAssumptions && newAssumptions.length > 0) {
      updated.hidden_assumptions = newAssumptions;
    }

    snapshots[snapshots.length - 1] = updated;
  }

  return {
    snapshots,
    reframe_item_id: undefined, // consumed
    re_entry_point: 'conversing',
    phase: 'conversing',
  };
}

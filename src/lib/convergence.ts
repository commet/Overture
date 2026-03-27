import type { RefineLoop, FeedbackRecord, ApprovalCondition, Persona } from '@/stores/types';
import { computeSimilarity } from './similarity';

export interface ConvergenceResult {
  converged: boolean;
  critical_remaining: number;
  approval_met: number;
  approval_total: number;
  total_issues: number;
  issue_trend: number[];
  guidance: string;
}

/**
 * Extract issues from a FeedbackRecord for display and tracking.
 */
export function extractIssuesFromFeedback(
  record: FeedbackRecord,
  personas: Persona[]
): Array<{ text: string; persona_name: string; persona_id: string; severity: 'critical' | 'concern' | 'question' | 'wants_more'; influence: string }> {
  const issues: Array<{ text: string; persona_name: string; persona_id: string; severity: 'critical' | 'concern' | 'question' | 'wants_more'; influence: string }> = [];

  for (const result of record.results) {
    const persona = personas.find(p => p.id === result.persona_id);
    const pName = persona?.name || 'Unknown';
    const influence = persona?.influence || 'medium';

    // Critical risks
    for (const risk of (result.classified_risks || []).filter(r => r.category === 'critical')) {
      issues.push({ text: risk.text, persona_name: pName, persona_id: result.persona_id, severity: 'critical', influence });
    }

    // Concerns
    for (const concern of (result.concerns || [])) {
      issues.push({ text: concern, persona_name: pName, persona_id: result.persona_id, severity: 'concern', influence });
    }

    // Questions
    for (const q of (result.first_questions || [])) {
      issues.push({ text: q, persona_name: pName, persona_id: result.persona_id, severity: 'question', influence });
    }

    // Wants more
    for (const w of (result.wants_more || [])) {
      issues.push({ text: w, persona_name: pName, persona_id: result.persona_id, severity: 'wants_more', influence });
    }
  }

  return issues;
}

/**
 * Extract approval conditions from a FeedbackRecord.
 */
export function extractApprovalConditions(
  record: FeedbackRecord,
  personas: Persona[]
): ApprovalCondition[] {
  const conditions: ApprovalCondition[] = [];
  for (const result of record.results) {
    const persona = personas.find(p => p.id === result.persona_id);
    for (const condition of result.approval_conditions || []) {
      conditions.push({
        persona_id: result.persona_id,
        persona_name: persona?.name || '',
        influence: persona?.influence || 'medium',
        condition,
        met: false,
      });
    }
  }
  return conditions;
}

/**
 * Check convergence based on principled criteria:
 * 1. Hard gate: zero critical risks
 * 2. Approval gate: ≥80% of high-influence approval conditions met
 * 3. Progress: issue count trending down
 */
export function checkLoopConvergence(loop: RefineLoop): ConvergenceResult {
  const highInfluenceConditions = loop.initial_approval_conditions
    .filter(ac => ac.influence === 'high');

  if (loop.iterations.length === 0) {
    return {
      converged: false,
      critical_remaining: -1,
      approval_met: 0,
      approval_total: highInfluenceConditions.length,
      total_issues: 0,
      issue_trend: [],
      guidance: '이슈를 선택하고 개선을 시작하세요.',
    };
  }

  const latest = loop.iterations[loop.iterations.length - 1];
  const criticalRemaining = latest.convergence.critical_risks;

  // Track approval conditions across all iterations
  const currentConditions = latest.convergence.approval_conditions;
  const metCount = currentConditions.filter(ac => ac.met && ac.influence === 'high').length;
  const highTotal = currentConditions.filter(ac => ac.influence === 'high').length;

  // Issue trend
  const trend = loop.iterations.map(it => it.convergence.total_issues);

  // Convergence check
  const converged = criticalRemaining === 0
    && (highTotal === 0 || metCount >= highTotal * 0.8);

  // Guidance
  let guidance: string;
  if (converged) {
    guidance = '핵심 위협이 해소되고 주요 승인 조건이 충족되었습니다. 합주를 마무리할 수 있습니다.';
  } else if (criticalRemaining > 0) {
    guidance = `핵심 위협 ${criticalRemaining}건이 남아있습니다. 이것을 먼저 해결해야 합니다.`;
  } else if (metCount < highTotal) {
    guidance = `핵심 위협은 해소되었지만, 고영향력 승인 조건 ${highTotal - metCount}건이 아직 미충족입니다.`;
  } else {
    guidance = '진행 중입니다. 이슈를 선택하고 다음 반복을 진행하세요.';
  }

  if (loop.iterations.length >= loop.max_iterations && !converged) {
    guidance = `최대 반복 횟수(${loop.max_iterations}회)에 도달했습니다. ${guidance}`;
  }

  return {
    converged,
    critical_remaining: criticalRemaining,
    approval_met: metCount,
    approval_total: highTotal,
    total_issues: latest.convergence.total_issues,
    issue_trend: trend,
    guidance,
  };
}

/**
 * Match approval conditions between initial and re-review.
 * A condition is considered "met" if the re-review's praise mentions it
 * or if the condition no longer appears in the re-review's approval_conditions.
 */
export function matchApprovalConditions(
  initial: ApprovalCondition[],
  reReviewRecord: FeedbackRecord,
  iterationNumber: number
): ApprovalCondition[] {
  return initial.map(ac => {
    // Already met in a previous iteration
    if (ac.met) return ac;

    // Find this persona's re-review result
    const result = reReviewRecord.results.find(r => r.persona_id === ac.persona_id);
    if (!result) return ac;

    // Check if condition is still in approval_conditions (similarity-based)
    const stillRequired = (result.approval_conditions || [])
      .some(newCond => computeSimilarity(newCond, ac.condition) > 0.5);

    // Check if condition is mentioned in praise (similarity-based)
    const praisedAsResolved = (result.praise || [])
      .some(p => computeSimilarity(p, ac.condition) > 0.4);

    if (!stillRequired || praisedAsResolved) {
      return { ...ac, met: true, met_at_iteration: iterationNumber };
    }

    return ac;
  });
}

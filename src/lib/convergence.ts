import type { RefinementLoop, RefinementIssue } from '@/stores/types';
import { computeSimilarity } from './similarity';

export interface ConvergenceResult {
  score: number;
  shouldStop: boolean;
  reason: string;
  recommendation: 'continue' | 'one_more' | 'stop';
  breakdown: {
    blocker: { resolved: number; total: number };
    improvement: { resolved: number; total: number };
    nice_to_have: { resolved: number; total: number };
  };
  guidance: string;
}

const WEIGHTS = { blocker: 3, improvement: 1, nice_to_have: 0.5 } as const;

/**
 * Calculate weighted convergence score from issues.
 */
export function calculateWeightedScore(issues: RefinementIssue[]): {
  score: number;
  breakdown: ConvergenceResult['breakdown'];
} {
  const breakdown = {
    blocker: { resolved: 0, total: 0 },
    improvement: { resolved: 0, total: 0 },
    nice_to_have: { resolved: 0, total: 0 },
  };

  for (const issue of issues) {
    const sev = issue.severity || 'improvement';
    breakdown[sev].total++;
    if (issue.resolved) breakdown[sev].resolved++;
  }

  let weightedResolved = 0;
  let weightedTotal = 0;
  for (const [sev, data] of Object.entries(breakdown)) {
    const w = WEIGHTS[sev as keyof typeof WEIGHTS];
    weightedResolved += data.resolved * w;
    weightedTotal += data.total * w;
  }

  const score = weightedTotal > 0 ? weightedResolved / weightedTotal : 1;
  return { score, breakdown };
}

/**
 * Generate human-readable guidance for the next iteration.
 */
function buildGuidance(breakdown: ConvergenceResult['breakdown'], score: number, threshold: number): string {
  const { blocker, improvement } = breakdown;
  const unresolvedBlockers = blocker.total - blocker.resolved;
  const unresolvedImprovements = improvement.total - improvement.resolved;

  if (unresolvedBlockers > 0) {
    return `차단 이슈 ${unresolvedBlockers}건이 남아있습니다. 이것을 먼저 해결해야 승인을 받을 수 있습니다.`;
  }

  if (score >= threshold) {
    return `수렴 목표(${Math.round(threshold * 100)}%)에 도달했습니다. 합주를 마무리할 수 있습니다.`;
  }

  if (unresolvedImprovements > 0) {
    const needed = Math.ceil((threshold * (blocker.total * 3 + improvement.total + breakdown.nice_to_have.total * 0.5) - (blocker.resolved * 3 + improvement.resolved + breakdown.nice_to_have.resolved * 0.5)));
    return `차단 이슈는 해결되었습니다. 개선 이슈 ${unresolvedImprovements}건 중 일부를 해결하면 목표에 도달합니다.`;
  }

  return `참고 이슈만 남았습니다. 필요하다면 합주를 마무리하세요.`;
}

export function detectConvergence(loop: RefinementLoop): ConvergenceResult {
  const { iterations, max_iterations, convergence_threshold } = loop;
  const emptyBreakdown = { blocker: { resolved: 0, total: 0 }, improvement: { resolved: 0, total: 0 }, nice_to_have: { resolved: 0, total: 0 } };

  if (iterations.length === 0) {
    return { score: 0, shouldStop: false, reason: '아직 반복이 없습니다.', recommendation: 'continue', breakdown: emptyBreakdown, guidance: '리허설에서 피드백을 받은 후 합주를 시작하세요.' };
  }

  const latest = iterations[iterations.length - 1];
  const { score, breakdown } = calculateWeightedScore(latest.issues_from_feedback);
  const guidance = buildGuidance(breakdown, score, convergence_threshold);

  if (iterations.length >= max_iterations) {
    return { score, shouldStop: true, reason: `최대 반복 횟수(${max_iterations}회)에 도달했습니다.`, recommendation: 'stop', breakdown, guidance };
  }

  if (score >= convergence_threshold) {
    return { score, shouldStop: true, reason: `수렴 목표(${Math.round(convergence_threshold * 100)}%)에 도달했습니다.`, recommendation: 'stop', breakdown, guidance };
  }

  if (iterations.length >= 2) {
    const prev = iterations[iterations.length - 2];
    const prevResult = calculateWeightedScore(prev.issues_from_feedback);
    const improvement = score - prevResult.score;

    if (improvement <= 0.02) {
      return { score, shouldStop: false, reason: '수렴이 정체되고 있습니다. 접근 방식을 변경하거나 루프를 종료하세요.', recommendation: 'one_more', breakdown, guidance };
    }

    if (latest.total_issue_count > prev.total_issue_count && latest.unresolved_count >= prev.unresolved_count) {
      return { score, shouldStop: false, reason: '새 이슈가 해결보다 빨리 발생하고 있습니다.', recommendation: 'one_more', breakdown, guidance };
    }
  }

  return { score, shouldStop: false, reason: `수렴 중 (${Math.round(score * 100)}% / ${Math.round(convergence_threshold * 100)}%)`, recommendation: 'continue', breakdown, guidance };
}

/**
 * Match issues across iterations using text similarity.
 * Returns which previous issues are resolved, persisting, or new.
 */
export function matchIssuesAcrossIterations(
  previousIssues: RefinementIssue[],
  newConcerns: string[]
): { resolved: string[]; persisting: string[]; newIssues: string[] } {
  const resolved: string[] = [];
  const persisting: string[] = [];
  const matchedNew = new Set<number>();

  for (const prevIssue of previousIssues) {
    if (prevIssue.resolved) continue;

    let matched = false;
    for (let i = 0; i < newConcerns.length; i++) {
      if (matchedNew.has(i)) continue;
      if (computeSimilarity(prevIssue.text, newConcerns[i]) > 0.4) {
        persisting.push(prevIssue.text);
        matchedNew.add(i);
        matched = true;
        break;
      }
    }
    if (!matched) {
      resolved.push(prevIssue.text);
    }
  }

  const newIssues = newConcerns.filter((_, i) => !matchedNew.has(i));
  return { resolved, persisting, newIssues };
}

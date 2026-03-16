import type { RefinementLoop, RefinementIssue } from '@/stores/types';
import { computeSimilarity } from './similarity';

export interface ConvergenceResult {
  score: number;
  shouldStop: boolean;
  reason: string;
  recommendation: 'continue' | 'one_more' | 'stop';
}

export function detectConvergence(loop: RefinementLoop): ConvergenceResult {
  const { iterations, max_iterations, convergence_threshold } = loop;

  if (iterations.length === 0) {
    return { score: 0, shouldStop: false, reason: '아직 반복이 없습니다.', recommendation: 'continue' };
  }

  if (iterations.length >= max_iterations) {
    const latest = iterations[iterations.length - 1];
    return {
      score: latest.convergence_score,
      shouldStop: true,
      reason: `최대 반복 횟수(${max_iterations}회)에 도달했습니다.`,
      recommendation: 'stop',
    };
  }

  const latest = iterations[iterations.length - 1];

  if (latest.convergence_score >= convergence_threshold) {
    return {
      score: latest.convergence_score,
      shouldStop: true,
      reason: `수렴 목표(${Math.round(convergence_threshold * 100)}%)에 도달했습니다.`,
      recommendation: 'stop',
    };
  }

  // Check for stagnation
  if (iterations.length >= 2) {
    const prev = iterations[iterations.length - 2];
    const improvement = latest.convergence_score - prev.convergence_score;

    if (improvement <= 0.02) {
      return {
        score: latest.convergence_score,
        shouldStop: false,
        reason: '수렴이 정체되고 있습니다. 접근 방식을 변경하거나 루프를 종료하세요.',
        recommendation: 'one_more',
      };
    }

    // Check for issue inflation
    if (latest.total_issue_count > prev.total_issue_count && latest.unresolved_count >= prev.unresolved_count) {
      return {
        score: latest.convergence_score,
        shouldStop: false,
        reason: '새 이슈가 해결보다 빨리 발생하고 있습니다.',
        recommendation: 'one_more',
      };
    }
  }

  return {
    score: latest.convergence_score,
    shouldStop: false,
    reason: `수렴 중 (${Math.round(latest.convergence_score * 100)}% / ${Math.round(convergence_threshold * 100)}%)`,
    recommendation: 'continue',
  };
}

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

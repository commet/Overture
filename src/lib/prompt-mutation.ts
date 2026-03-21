/**
 * Prompt Mutation — Phase 4B (자가 개선)
 *
 * Eval 결과 패턴을 분석하여 시스템 프롬프트에
 * 자동 보정 지시를 추가한다.
 *
 * autoresearch 원칙:
 * - eval이 실패하면 프롬프트를 고친다
 * - 프롬프트 수정은 additive (기존 삭제 X)
 * - 각 mutation은 하나의 eval 실패에 대응
 */

import { getStorage } from '@/lib/storage';
import type { EvalResult } from '@/lib/eval-engine';

const EVAL_STORAGE_KEY = 'overture_eval_results';
const MIN_SAMPLES = 5;
const FAILURE_THRESHOLD = 0.4; // 40% 미만이면 문제

interface PromptMutation {
  evalId: string;
  instruction: string;
  passRate: number;
}

/**
 * Analyze recent eval results and identify underperforming evals.
 * Returns the worst-performing evals that fall below the threshold.
 */
export function getWorstPerformingEvals(): PromptMutation[] {
  const history = getStorage<EvalResult[]>(EVAL_STORAGE_KEY, []);
  if (history.length < MIN_SAMPLES) return [];

  const recent = history.slice(-20); // Last 20 sessions

  // Calculate per-eval pass rates
  const evalStats: Record<string, { pass: number; total: number }> = {};
  for (const result of recent) {
    for (const [evalId, passed] of Object.entries(result.evals)) {
      if (!evalStats[evalId]) evalStats[evalId] = { pass: 0, total: 0 };
      evalStats[evalId].total++;
      if (passed) evalStats[evalId].pass++;
    }
  }

  const mutations: PromptMutation[] = [];

  for (const [evalId, stats] of Object.entries(evalStats)) {
    const passRate = stats.pass / stats.total;
    if (passRate >= FAILURE_THRESHOLD) continue;

    const instruction = MUTATION_MAP[evalId];
    if (instruction) {
      mutations.push({ evalId, instruction, passRate });
    }
  }

  // Sort by worst first
  return mutations.sort((a, b) => a.passRate - b.passRate);
}

/**
 * Apply prompt mutations to a base system prompt.
 * Adds corrective instructions based on underperforming evals.
 */
export function applyPromptMutations(basePrompt: string): string {
  const mutations = getWorstPerformingEvals();
  if (mutations.length === 0) return basePrompt;

  const additions = mutations
    .slice(0, 2) // Max 2 mutations at a time
    .map(m => m.instruction)
    .join('\n');

  return `${basePrompt}\n\n[자동 보정 — eval 기반]\n${additions}`;
}

/**
 * Mapping from eval IDs to corrective prompt instructions.
 */
const MUTATION_MAP: Record<string, string> = {
  question_accepted:
    '- hidden_questions를 더 실용적이고 구체적으로 만드세요. 사용자가 바로 채택할 수 있는 질문이어야 합니다. 너무 추상적이거나 학술적인 질문은 피하세요.',

  assumptions_engaged:
    '- hidden_assumptions를 사용자의 실제 업무 맥락과 연결하세요. "~라고 가정하고 있습니다"보다 "만약 ~가 아니라면, 전략이 바뀝니다"처럼 판단에 직접 연결되는 전제를 찾으세요.',

  no_immediate_reanalyze:
    '- 첫 분석에서 충분한 깊이를 제공하세요. 사용자가 바로 재분석을 요청한다면 초기 분석이 피상적이었다는 뜻입니다. surface_task를 더 정확하게 파악하고, reasoning_narrative에서 "왜 이렇게 재정의했는지"를 설득력 있게 설명하세요.',

  has_useful_assumptions:
    '- 미확인 전제를 더 적극적으로 찾으세요. 모든 전제가 이미 확인됨 상태라면 AI가 충분히 깊게 탐색하지 않은 것입니다. "당연하다고 생각하지만 실제로 검증하지 않은 것"을 찾아내세요.',
};

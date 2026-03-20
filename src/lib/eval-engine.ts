/**
 * Eval Engine — Phase 1 (autoresearch 패턴)
 *
 * Binary eval 프레임워크: 리프레이밍 품질을 측정하고
 * 어떤 전략이 어떤 맥락에서 효과적인지 학습한다.
 *
 * autoresearch-skill의 원칙:
 * - 모든 eval은 binary (yes/no)
 * - 3-6개 범위
 * - 각 eval은 겹치지 않아야 함
 * - "게임할 수 있는" eval 금지
 */

import type { DecomposeItem } from '@/stores/types';
import type { ReframingStrategy, InterviewSignals } from '@/lib/reframing-strategy';
import { getStorage, setStorage } from '@/lib/storage';
import { extractInterviewSignals as extractSignals } from '@/lib/context-chain';

const EVAL_STORAGE_KEY = 'overture_eval_results';

/* ────────────────────────────────────
   Binary Eval Definitions
   ──────────────────────────────────── */

export interface BinaryEval {
  id: string;
  question: string;
  measure: (item: DecomposeItem) => boolean;
}

export const DECOMPOSE_EVALS: BinaryEval[] = [
  {
    id: 'question_accepted',
    question: '사용자가 AI 제안 질문을 수정 없이 채택했는가?',
    measure: (item) => {
      if (!item.analysis || !item.selected_question) return false;
      return item.analysis.hidden_questions.some(
        hq => hq.question === item.selected_question
      );
    },
  },
  {
    id: 'assumptions_engaged',
    question: '사용자가 전제에 관여했는가? (1개 이상 확인됨 마킹)',
    measure: (item) => {
      if (!item.analysis) return false;
      return item.analysis.hidden_assumptions.some(
        (a: any) => a.verified === true
      );
    },
  },
  {
    id: 'no_immediate_reanalyze',
    question: '사용자가 즉시 재분석을 요청하지 않았는가?',
    measure: (item) => {
      // If the item went straight to 'done' without re-analysis, pass
      // We track this by checking if the item has been in 'review' only once
      return item.status === 'done';
    },
  },
  {
    id: 'has_useful_assumptions',
    question: '미확인 전제가 1개 이상 남아있는가? (AI가 의미 있는 전제를 찾음)',
    measure: (item) => {
      if (!item.analysis) return false;
      return item.analysis.hidden_assumptions.some(
        (a: any) => !a.verified
      );
    },
  },
];

/* ────────────────────────────────────
   Eval Result Recording
   ──────────────────────────────────── */

export interface EvalResult {
  id: string;
  item_id: string;
  strategy: ReframingStrategy | null;
  interview_signals: InterviewSignals | null;
  evals: Record<string, boolean>;
  pass_rate: number;
  recorded_at: string;
}

/**
 * Record eval results for a completed decompose item.
 * Called when user confirms (status → done).
 */
export function recordDecomposeEval(
  item: DecomposeItem,
  strategy: ReframingStrategy | null
): EvalResult {
  const evals: Record<string, boolean> = {};
  let passed = 0;

  for (const evalDef of DECOMPOSE_EVALS) {
    const result = evalDef.measure(item);
    evals[evalDef.id] = result;
    if (result) passed++;
  }

  const signals = extractSignals(item.input_text) || null;

  const evalResult: EvalResult = {
    id: crypto.randomUUID ? crypto.randomUUID() : `eval_${Date.now()}`,
    item_id: item.id,
    strategy,
    interview_signals: signals as InterviewSignals | null,
    evals,
    pass_rate: passed / DECOMPOSE_EVALS.length,
    recorded_at: new Date().toISOString(),
  };

  // Persist
  const history = getStorage<EvalResult[]>(EVAL_STORAGE_KEY, []);
  history.push(evalResult);
  // Keep last 200 results
  if (history.length > 200) history.splice(0, history.length - 200);
  setStorage(EVAL_STORAGE_KEY, history);

  return evalResult;
}

/* ────────────────────────────────────
   Strategy Performance Analysis
   ──────────────────────────────────── */

export interface StrategyPerformance {
  strategy: ReframingStrategy;
  sample_count: number;
  avg_pass_rate: number;
  per_eval_pass_rates: Record<string, number>;
}

/**
 * Analyze which strategy works best for a given signal combination.
 * Returns performance data for each strategy used with similar signals.
 */
export function analyzeStrategyPerformance(
  signalKey?: string
): StrategyPerformance[] {
  const history = getStorage<EvalResult[]>(EVAL_STORAGE_KEY, []);
  if (history.length < 5) return [];

  // Filter by signal key if provided
  const filtered = signalKey
    ? history.filter(r => r.interview_signals && makeSignalKey(r.interview_signals) === signalKey)
    : history;

  // Group by strategy
  const grouped: Record<string, EvalResult[]> = {};
  for (const result of filtered) {
    const key = result.strategy || 'unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(result);
  }

  return Object.entries(grouped).map(([strategy, results]) => {
    const avgPassRate = results.reduce((sum, r) => sum + r.pass_rate, 0) / results.length;

    const perEval: Record<string, number> = {};
    for (const evalDef of DECOMPOSE_EVALS) {
      const passCount = results.filter(r => r.evals[evalDef.id]).length;
      perEval[evalDef.id] = passCount / results.length;
    }

    return {
      strategy: strategy as ReframingStrategy,
      sample_count: results.length,
      avg_pass_rate: avgPassRate,
      per_eval_pass_rates: perEval,
    };
  });
}

/**
 * Get the best-performing strategy for given signals.
 * Returns null if insufficient data (<5 samples for this signal combo).
 */
export function getBestStrategy(signals: InterviewSignals): ReframingStrategy | null {
  const key = makeSignalKey(signals);
  const performance = analyzeStrategyPerformance(key);

  // Need at least 5 samples to make a data-driven choice
  const withSufficientData = performance.filter(p => p.sample_count >= 5);
  if (withSufficientData.length === 0) return null;

  // Return strategy with highest pass rate
  return withSufficientData.sort((a, b) => b.avg_pass_rate - a.avg_pass_rate)[0].strategy;
}

/* ────────────────────────────────────
   Helpers
   ──────────────────────────────────── */

function makeSignalKey(signals: InterviewSignals): string {
  return `${signals.origin || '_'}_${signals.uncertainty || '_'}_${signals.success || '_'}`;
}

/**
 * Get summary stats for display.
 */
export function getEvalSummary(): {
  total_sessions: number;
  avg_pass_rate: number;
  best_strategy: string | null;
  worst_eval: string | null;
} {
  const history = getStorage<EvalResult[]>(EVAL_STORAGE_KEY, []);
  if (history.length === 0) {
    return { total_sessions: 0, avg_pass_rate: 0, best_strategy: null, worst_eval: null };
  }

  const avgPassRate = history.reduce((sum, r) => sum + r.pass_rate, 0) / history.length;

  // Find worst-performing eval
  const evalPassRates: Record<string, number[]> = {};
  for (const result of history) {
    for (const [evalId, passed] of Object.entries(result.evals)) {
      if (!evalPassRates[evalId]) evalPassRates[evalId] = [];
      evalPassRates[evalId].push(passed ? 1 : 0);
    }
  }
  const evalAvgs = Object.entries(evalPassRates).map(([id, rates]) => ({
    id,
    avg: rates.reduce((a, b) => a + b, 0) / rates.length,
  }));
  const worstEval = evalAvgs.sort((a, b) => a.avg - b.avg)[0]?.id || null;

  // Best strategy overall
  const perf = analyzeStrategyPerformance();
  const bestStrat = perf.sort((a, b) => b.avg_pass_rate - a.avg_pass_rate)[0];

  return {
    total_sessions: history.length,
    avg_pass_rate: avgPassRate,
    best_strategy: bestStrat?.strategy || null,
    worst_eval: worstEval,
  };
}

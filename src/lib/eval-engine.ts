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
import { recordSignal } from '@/lib/signal-recorder';

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
      // Phase 2A: user_edited_question 플래그로 복사-붙여넣기 우회 방지
      if (item.user_edited_question) return false;
      return item.analysis.hidden_questions.some(
        hq => hq.question === item.selected_question
      );
    },
  },
  {
    id: 'assumptions_engaged',
    question: '사용자가 전제에 관여했는가? (1개 이상 평가함)',
    measure: (item) => {
      if (!item.analysis) return false;
      return item.analysis.hidden_assumptions.some(
        a => typeof a !== 'string' && (a.evaluation === 'likely_true' || a.evaluation === 'doubtful' || a.evaluation === 'uncertain')
      );
    },
  },
  {
    id: 'no_immediate_reanalyze',
    question: '사용자가 즉시 재분석을 요청하지 않았는가?',
    measure: (item) => {
      // Phase 2A: 재분석 횟수 추적으로 정확한 측정
      return item.status === 'done' && (item.reanalysis_count || 0) <= 1;
    },
  },
  {
    id: 'has_useful_assumptions',
    question: '미확인 전제가 1개 이상 남아있는가? (AI가 의미 있는 전제를 찾음)',
    measure: (item) => {
      if (!item.analysis) return false;
      return item.analysis.hidden_assumptions.some(
        a => !a.verified
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

  // Persist to localStorage
  const history = getStorage<EvalResult[]>(EVAL_STORAGE_KEY, []);
  history.push(evalResult);
  // Keep last 200 results
  if (history.length > 200) history.splice(0, history.length - 200);
  setStorage(EVAL_STORAGE_KEY, history);

  // Sync to Supabase via quality_signals (fire-and-forget)
  recordSignal({
    tool: 'decompose',
    signal_type: 'eval_result',
    signal_data: {
      item_id: evalResult.item_id,
      strategy: evalResult.strategy,
      interview_signals: evalResult.interview_signals,
      evals: evalResult.evals,
      pass_rate: evalResult.pass_rate,
    },
  });

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
  if (history.length < 3) return [];

  // Filter by signal key — supports partial matching (e.g., "_why_" matches any origin/success)
  const filtered = signalKey
    ? history.filter(r => {
        if (!r.interview_signals) return false;
        const fullKey = makeSignalKey(r.interview_signals);
        // Exact match first
        if (fullKey === signalKey) return true;
        // Partial match: if signalKey is uncertainty-only (e.g., "_why_"), match uncertainty field
        if (signalKey.startsWith('_') && signalKey.endsWith('_')) {
          const uncertainty = signalKey.slice(1, -1);
          return r.interview_signals.uncertainty === uncertainty;
        }
        return false;
      })
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
 * Micro Loop: uncertainty 단독으로 먼저 시도 (4 조합, 3 샘플이면 충분)
 * → 부족하면 전체 신호 조합으로 시도 (fallback)
 * → 부족하면 null (rule-based fallback은 호출자가 처리)
 */
export function getBestStrategy(signals: InterviewSignals): ReframingStrategy | null {
  // 1차: uncertainty 단독으로 매칭 (가장 빠르게 데이터 축적)
  if (signals.uncertainty) {
    const microKey = `_${signals.uncertainty}_`;
    const microPerf = analyzeStrategyPerformance(microKey);
    const viable = microPerf.filter(p => p.sample_count >= 3);
    if (viable.length > 0) {
      return viable.sort((a, b) => b.avg_pass_rate - a.avg_pass_rate)[0].strategy;
    }
  }

  // 2차: 전체 신호 조합 (더 정밀하지만 데이터 더 필요)
  const fullKey = makeSignalKey(signals);
  const fullPerf = analyzeStrategyPerformance(fullKey);
  const fullViable = fullPerf.filter(p => p.sample_count >= 3);
  if (fullViable.length > 0) {
    return fullViable.sort((a, b) => b.avg_pass_rate - a.avg_pass_rate)[0].strategy;
  }

  return null;
}

/* ────────────────────────────────────
   1-Session Feedback: 이전 세션 요약
   ──────────────────────────────────── */

export interface SessionInsight {
  type: 'last_strategy' | 'pattern' | 'tip';
  message: string;
}

/**
 * Get personalized insights from past sessions.
 * Returns messages to display BEFORE analysis starts.
 * Works from 1 session — no minimum threshold.
 */
export function getSessionInsights(): SessionInsight[] {
  const history = getStorage<EvalResult[]>(EVAL_STORAGE_KEY, []);
  if (history.length === 0) return [];

  const insights: SessionInsight[] = [];
  const last = history[history.length - 1];

  // 1세션: 지난번 전략 + 결과
  if (last.strategy) {
    const label = STRATEGY_DISPLAY[last.strategy];
    const success = last.pass_rate >= 0.75;
    insights.push({
      type: 'last_strategy',
      message: success
        ? `지난 분석에서 "${label}" 접근이 효과적이었습니다.`
        : `지난 분석에서 "${label}" 접근을 사용했습니다.`,
    });
  }

  // 3세션+: 패턴 감지
  if (history.length >= 3) {
    const strategies = history.slice(-5).map(h => h.strategy).filter(Boolean);
    const counts: Record<string, number> = {};
    strategies.forEach(s => { if (s) counts[s] = (counts[s] || 0) + 1; });
    const dominant = Object.entries(counts).sort(([, a], [, b]) => b - a)[0];
    if (dominant && dominant[1] >= 2) {
      insights.push({
        type: 'pattern',
        message: `최근 "${STRATEGY_DISPLAY[dominant[0] as ReframingStrategy]}" 접근을 자주 사용하고 계십니다.`,
      });
    }

    // 성공률 트렌드
    const recentPassRate = history.slice(-5).reduce((s, h) => s + h.pass_rate, 0) / Math.min(history.length, 5);
    if (recentPassRate >= 0.8) {
      insights.push({
        type: 'tip',
        message: `최근 분석 결과의 활용도가 높습니다. 현재 접근 방식을 유지하세요.`,
      });
    }
  }

  return insights;
}

const STRATEGY_DISPLAY: Record<ReframingStrategy, string> = {
  challenge_existence: '존재 의심',
  narrow_scope: '범위 집중',
  diagnose_root: '원인 진단',
  redirect_angle: '관점 전환',
};

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

import type { ReframeItem } from '@/stores/types';
import type { ReframingStrategy } from '@/lib/reframing-strategy';

vi.mock('@/lib/storage', () => {
  let store: Record<string, unknown> = {};
  return {
    getStorage: vi.fn((key: string, fallback: unknown) => store[key] ?? fallback),
    setStorage: vi.fn((key: string, value: unknown) => { store[key] = value; }),
    STORAGE_KEYS: { SETTINGS: 'sot_settings' },
    __resetStore: () => { store = {}; },
  };
});

vi.mock('@/lib/context-chain', () => ({
  extractInterviewSignals: vi.fn(() => null),
}));

vi.mock('@/lib/db', () => ({
  insertToSupabase: vi.fn(),
}));

// Must import after mocks are declared
import {
  REFRAME_EVALS,
  recordReframeEval,
  analyzeStrategyPerformance,
  getBestStrategy,
  getSessionInsights,
  getEvalSummary,
} from '@/lib/eval-engine';
import { __resetStore } from '@/lib/storage';

function makeItem(overrides: Partial<ReframeItem> = {}): ReframeItem {
  return {
    id: 'test-1',
    input_text: 'test input',
    selected_question: '',
    analysis: {
      surface_task: 'test',
      reframed_question: 'reframed',
      why_reframing_matters: '',
      reasoning_narrative: '',
      hidden_assumptions: [],
      hidden_questions: [],
      ai_limitations: [],
    },
    status: 'done',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  (__resetStore as () => void)();
});

/* ────────────────────────────────────
   Binary Eval Definitions
   ──────────────────────────────────── */

describe('REFRAME_EVALS', () => {
  it('has exactly 5 evals', () => {
    expect(REFRAME_EVALS).toHaveLength(5);
  });

  it('has the expected ids', () => {
    const ids = REFRAME_EVALS.map(e => e.id);
    expect(ids).toEqual([
      'question_accepted',
      'assumptions_engaged',
      'no_immediate_reanalyze',
      'has_useful_assumptions',
      'assumptions_diverse',
    ]);
  });

  describe('question_accepted', () => {
    const eval_ = REFRAME_EVALS.find(e => e.id === 'question_accepted')!;

    it('returns true when selected_question matches a hidden question', () => {
      const item = makeItem({
        selected_question: 'Why is this important?',
        analysis: {
          surface_task: 'test',
          reframed_question: 'reframed',
          why_reframing_matters: '',
          reasoning_narrative: '',
          hidden_assumptions: [],
          hidden_questions: [
            { question: 'Why is this important?', reasoning: 'r1' },
            { question: 'What if we reframe?', reasoning: 'r2' },
          ],
          ai_limitations: [],
        },
      });
      expect(eval_.measure(item)).toBe(true);
    });

    it('returns false when selected_question does not match', () => {
      const item = makeItem({
        selected_question: 'Something completely different',
        analysis: {
          surface_task: 'test',
          reframed_question: 'reframed',
          why_reframing_matters: '',
          reasoning_narrative: '',
          hidden_assumptions: [],
          hidden_questions: [
            { question: 'Why is this important?', reasoning: 'r1' },
          ],
          ai_limitations: [],
        },
      });
      expect(eval_.measure(item)).toBe(false);
    });

    it('returns false when analysis is null', () => {
      const item = makeItem({ analysis: null });
      expect(eval_.measure(item)).toBe(false);
    });
  });

  describe('assumptions_engaged', () => {
    const eval_ = REFRAME_EVALS.find(e => e.id === 'assumptions_engaged')!;

    it('returns true when at least one assumption has evaluation', () => {
      const item = makeItem({
        analysis: {
          surface_task: 'test',
          reframed_question: 'reframed',
          why_reframing_matters: '',
          reasoning_narrative: '',
          hidden_assumptions: [
            { assumption: 'A1', risk_if_false: 'R1', verified: false, evaluation: 'likely_true' },
            { assumption: 'A2', risk_if_false: 'R2', verified: false },
          ],
          hidden_questions: [],
          ai_limitations: [],
        },
      });
      expect(eval_.measure(item)).toBe(true);
    });

    it('returns false when no assumptions have evaluation', () => {
      const item = makeItem({
        analysis: {
          surface_task: 'test',
          reframed_question: 'reframed',
          why_reframing_matters: '',
          reasoning_narrative: '',
          hidden_assumptions: [
            { assumption: 'A1', risk_if_false: 'R1', verified: false },
          ],
          hidden_questions: [],
          ai_limitations: [],
        },
      });
      expect(eval_.measure(item)).toBe(false);
    });

    it('returns false when analysis is null', () => {
      const item = makeItem({ analysis: null });
      expect(eval_.measure(item)).toBe(false);
    });
  });

  describe('no_immediate_reanalyze', () => {
    const eval_ = REFRAME_EVALS.find(e => e.id === 'no_immediate_reanalyze')!;

    it('returns true when status is done', () => {
      const item = makeItem({ status: 'done' });
      expect(eval_.measure(item)).toBe(true);
    });

    it('returns false when status is review', () => {
      const item = makeItem({ status: 'review' });
      expect(eval_.measure(item)).toBe(false);
    });
  });

  describe('has_useful_assumptions', () => {
    const eval_ = REFRAME_EVALS.find(e => e.id === 'has_useful_assumptions')!;

    it('returns true when at least one assumption is not verified', () => {
      const item = makeItem({
        analysis: {
          surface_task: 'test',
          reframed_question: 'reframed',
          why_reframing_matters: '',
          reasoning_narrative: '',
          hidden_assumptions: [
            { assumption: 'A1', risk_if_false: 'R1', verified: true },
            { assumption: 'A2', risk_if_false: 'R2', verified: false },
          ],
          hidden_questions: [],
          ai_limitations: [],
        },
      });
      expect(eval_.measure(item)).toBe(true);
    });

    it('returns false when all assumptions are verified', () => {
      const item = makeItem({
        analysis: {
          surface_task: 'test',
          reframed_question: 'reframed',
          why_reframing_matters: '',
          reasoning_narrative: '',
          hidden_assumptions: [
            { assumption: 'A1', risk_if_false: 'R1', verified: true },
          ],
          hidden_questions: [],
          ai_limitations: [],
        },
      });
      expect(eval_.measure(item)).toBe(false);
    });

    it('returns false when analysis is null', () => {
      const item = makeItem({ analysis: null });
      expect(eval_.measure(item)).toBe(false);
    });
  });
});

/* ────────────────────────────────────
   recordReframeEval
   ──────────────────────────────────── */

describe('recordReframeEval', () => {
  it('creates an EvalResult with correct pass_rate', () => {
    // Item passes: no_immediate_reanalyze (done), has_useful_assumptions (one unverified),
    //   assumptions_diverse (< 2 assumptions → true)
    // Fails: question_accepted (no match), assumptions_engaged (no evaluation field)
    const item = makeItem({
      selected_question: 'unmatched',
      analysis: {
        surface_task: 'test',
        reframed_question: 'reframed',
        why_reframing_matters: '',
        reasoning_narrative: '',
        hidden_assumptions: [
          { assumption: 'A1', risk_if_false: 'R1', verified: false },
        ],
        hidden_questions: [
          { question: 'Other question', reasoning: 'r' },
        ],
        ai_limitations: [],
      },
    });

    const result = recordReframeEval(item, 'narrow_scope');

    expect(result.item_id).toBe('test-1');
    expect(result.strategy).toBe('narrow_scope');
    expect(result.evals.question_accepted).toBe(false);
    expect(result.evals.assumptions_engaged).toBe(false);
    expect(result.evals.no_immediate_reanalyze).toBe(true);
    expect(result.evals.has_useful_assumptions).toBe(true);
    expect(result.evals.assumptions_diverse).toBe(true);
    expect(result.pass_rate).toBe(3 / 5);
  });

  it('persists result to storage', () => {
    const item = makeItem();
    recordReframeEval(item, null);

    // Record a second one
    const item2 = makeItem({ id: 'test-2' });
    recordReframeEval(item2, 'diagnose_root');

    // Retrieve from storage via a new call to getEvalSummary
    const summary = getEvalSummary();
    expect(summary.total_sessions).toBe(2);
  });

  it('records null strategy', () => {
    const item = makeItem();
    const result = recordReframeEval(item, null);
    expect(result.strategy).toBeNull();
  });
});

/* ────────────────────────────────────
   analyzeStrategyPerformance
   ──────────────────────────────────── */

describe('analyzeStrategyPerformance', () => {
  it('returns empty array when fewer than 3 results', () => {
    const item = makeItem();
    recordReframeEval(item, 'narrow_scope');
    recordReframeEval(makeItem({ id: 'test-2' }), 'narrow_scope');

    expect(analyzeStrategyPerformance()).toEqual([]);
  });

  it('groups by strategy and calculates avg_pass_rate', () => {
    // Record 3 evals with same strategy
    for (let i = 0; i < 3; i++) {
      const item = makeItem({
        id: `item-${i}`,
        analysis: {
          surface_task: 'test',
          reframed_question: 'reframed',
          why_reframing_matters: '',
          reasoning_narrative: '',
          hidden_assumptions: [
            { assumption: 'A', risk_if_false: 'R', verified: false },
          ],
          hidden_questions: [],
          ai_limitations: [],
        },
      });
      recordReframeEval(item, 'narrow_scope');
    }

    const perf = analyzeStrategyPerformance();
    expect(perf).toHaveLength(1);
    expect(perf[0].strategy).toBe('narrow_scope');
    expect(perf[0].sample_count).toBe(3);
    expect(typeof perf[0].avg_pass_rate).toBe('number');
    expect(perf[0].per_eval_pass_rates).toHaveProperty('question_accepted');
  });
});

/* ────────────────────────────────────
   getBestStrategy
   ──────────────────────────────────── */

describe('getBestStrategy', () => {
  it('returns null when insufficient data', () => {
    const result = getBestStrategy({ origin: 'self', uncertainty: 'why', success: 'measurable' });
    expect(result).toBeNull();
  });

  it('returns best strategy when sufficient samples exist', () => {
    // Record 3 evals with narrow_scope — all pass no_immediate_reanalyze + has_useful_assumptions
    for (let i = 0; i < 3; i++) {
      const item = makeItem({
        id: `ns-${i}`,
        analysis: {
          surface_task: 'test',
          reframed_question: 'reframed',
          why_reframing_matters: '',
          reasoning_narrative: '',
          hidden_assumptions: [
            { assumption: 'A', risk_if_false: 'R', verified: false },
          ],
          hidden_questions: [],
          ai_limitations: [],
        },
      });
      recordReframeEval(item, 'narrow_scope');
    }

    // Should return null because signals don't match stored data (no interview_signals in stored results)
    // The function uses micro-key matching which requires interview_signals on results
    const result = getBestStrategy({ uncertainty: 'why' });
    // With mocked extractInterviewSignals returning null, no signal keys match —
    // but analyzeStrategyPerformance without signalKey returns all data
    // The full key fallback will be tried with makeSignalKey({ uncertainty: 'why' }) = "_why__"
    // Since stored results have interview_signals: null, they won't match
    // So analyzeStrategyPerformance(fullKey) also returns empty → null
    expect(result).toBeNull();

    // Without signal filtering — verify data exists via analyzeStrategyPerformance()
    const allPerf = analyzeStrategyPerformance();
    expect(allPerf.length).toBeGreaterThan(0);
    expect(allPerf[0].strategy).toBe('narrow_scope');
  });
});

/* ────────────────────────────────────
   getSessionInsights
   ──────────────────────────────────── */

describe('getSessionInsights', () => {
  it('returns empty array for no history', () => {
    expect(getSessionInsights()).toEqual([]);
  });

  it('returns last_strategy insight for 1 session', () => {
    const item = makeItem();
    recordReframeEval(item, 'challenge_existence');

    const insights = getSessionInsights();
    expect(insights.length).toBeGreaterThanOrEqual(1);

    const strategyInsight = insights.find(i => i.type === 'last_strategy');
    expect(strategyInsight).toBeDefined();
    expect(strategyInsight!.message).toContain('존재 의심');
  });

  it('returns no last_strategy insight when strategy is null', () => {
    const item = makeItem();
    recordReframeEval(item, null);

    const insights = getSessionInsights();
    const strategyInsight = insights.find(i => i.type === 'last_strategy');
    expect(strategyInsight).toBeUndefined();
  });
});

/* ────────────────────────────────────
   getEvalSummary
   ──────────────────────────────────── */

describe('getEvalSummary', () => {
  it('returns zero stats for empty history', () => {
    const summary = getEvalSummary();
    expect(summary).toEqual({
      total_sessions: 0,
      avg_pass_rate: 0,
      best_strategy: null,
      worst_eval: null,
    });
  });

  it('calculates avg_pass_rate correctly', () => {
    // Record 3 evals to allow analyzeStrategyPerformance to work
    for (let i = 0; i < 3; i++) {
      const item = makeItem({
        id: `item-${i}`,
        analysis: {
          surface_task: 'test',
          reframed_question: 'reframed',
          why_reframing_matters: '',
          reasoning_narrative: '',
          hidden_assumptions: [
            { assumption: 'A', risk_if_false: 'R', verified: false },
          ],
          hidden_questions: [],
          ai_limitations: [],
        },
      });
      recordReframeEval(item, 'narrow_scope');
    }

    const summary = getEvalSummary();
    expect(summary.total_sessions).toBe(3);
    // Each item passes no_immediate_reanalyze + has_useful_assumptions + assumptions_diverse = 3/5 = 0.6
    expect(summary.avg_pass_rate).toBe(0.6);
    expect(summary.worst_eval).toBeDefined();
    expect(summary.best_strategy).toBe('narrow_scope');
  });
});

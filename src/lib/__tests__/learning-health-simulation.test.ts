/**
 * Learning Health Simulation — 학습 건강도 평가 시뮬레이션
 *
 * 핵심 검증:
 * - signal_count: 신호 수 정확 반환
 * - eval_coverage: assumption_diversity / reframeItems 비율
 * - override_trend: 오버라이드율 감소 여부 판별
 * - convergence_trend: 수렴 속도 변화 추적
 * - learning_tier: 데이터량 기반 티어 결정
 * - recommendations: 상황별 권장사항 생성
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  insertToSupabase: vi.fn(),
}));

const mockGetSignals = vi.fn(() => []);
vi.mock('@/lib/signal-recorder', () => ({
  getSignals: (...args: unknown[]) => mockGetSignals(...args),
  recordSignal: vi.fn(),
}));

const mockStorage: Record<string, unknown> = {};
vi.mock('@/lib/storage', () => ({
  getStorage: vi.fn((key: string, fallback: unknown) => mockStorage[key] ?? fallback),
  setStorage: vi.fn(),
  STORAGE_KEYS: {
    SETTINGS: 'sot_settings',
    JUDGMENTS: 'sot_judgments',
    REFINE_LOOPS: 'sot_refine_loops',
    ACCURACY_RATINGS: 'sot_accuracy_ratings',
    REFRAME_LIST: 'sot_reframe_list',
  },
}));

import { assessLearningHealth } from '@/lib/learning-health';

// ── Helpers ──

function makeSignal(type = 'test_signal') {
  return { id: `s-${Math.random().toString(36).slice(2)}`, signal_type: type, signal_data: {}, tool: 'reframe', created_at: new Date().toISOString() };
}

function makeJudgment(overrides: Record<string, unknown> = {}) {
  return {
    id: `j-${Math.random().toString(36).slice(2)}`,
    type: 'actor_override',
    user_changed: true,
    created_at: new Date().toISOString(),
    context: '',
    decision: '',
    original_ai_suggestion: '',
    tool: 'rehearse',
    ...overrides,
  };
}

function makeLoop(overrides: Record<string, unknown> = {}) {
  return {
    id: `l-${Math.random().toString(36).slice(2)}`,
    status: 'converged',
    iterations: [{ iteration_number: 1 }],
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ── Tests ──

describe('Learning Health Simulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSignals.mockReturnValue([]);
    for (const key of Object.keys(mockStorage)) delete mockStorage[key];
  });

  // ── Signal Count ──

  describe('signal_count', () => {
    it('returns 0 when no signals', () => {
      const result = assessLearningHealth();
      expect(result.signal_count).toBe(0);
    });

    it('returns correct count with signals', () => {
      mockGetSignals.mockReturnValue([makeSignal(), makeSignal(), makeSignal()] as never);
      const result = assessLearningHealth();
      expect(result.signal_count).toBe(3);
    });
  });

  // ── Eval Coverage ──

  describe('eval_coverage', () => {
    it('returns 0 when no reframe items', () => {
      mockGetSignals.mockReturnValue([makeSignal('assumption_diversity')] as never);
      const result = assessLearningHealth();
      expect(result.eval_coverage).toBe(0);
    });

    it('computes correct percentage', () => {
      mockGetSignals.mockReturnValue([
        makeSignal('assumption_diversity'),
        makeSignal('assumption_diversity'),
        makeSignal('other_type'),
      ] as never);
      mockStorage['sot_reframe_list'] = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }];

      const result = assessLearningHealth();
      expect(result.eval_coverage).toBe(50); // 2 / 4 = 50%
    });
  });

  // ── Override Trend ──

  describe('override_trend', () => {
    it('returns not_enough_data when < 4 overrides', () => {
      mockStorage['sot_judgments'] = [
        makeJudgment({ user_changed: true, created_at: '2025-01-01' }),
        makeJudgment({ user_changed: true, created_at: '2025-01-02' }),
        makeJudgment({ user_changed: true, created_at: '2025-01-03' }),
      ];
      const result = assessLearningHealth();
      expect(result.override_trend).toBe('not_enough_data');
    });

    it('returns improving when second-half override rate < 80% of first-half rate', () => {
      // First half: 2 overrides out of 3 actor_override judgments → rate 2/3
      // Second half: 2 overrides out of 5 actor_override judgments → rate 2/5
      // 2/5 = 0.4 < (2/3)*0.8 = 0.533 → improving
      mockStorage['sot_judgments'] = [
        makeJudgment({ user_changed: true, created_at: '2025-01-01' }),
        makeJudgment({ user_changed: false, created_at: '2025-01-02' }),
        makeJudgment({ user_changed: true, created_at: '2025-01-03' }),
        // boundary: first half ends at created_at '2025-01-03'
        makeJudgment({ user_changed: true, created_at: '2025-01-04' }),
        makeJudgment({ user_changed: false, created_at: '2025-01-05' }),
        makeJudgment({ user_changed: false, created_at: '2025-01-06' }),
        makeJudgment({ user_changed: false, created_at: '2025-01-07' }),
        makeJudgment({ user_changed: true, created_at: '2025-01-08' }),
      ];
      const result = assessLearningHealth();
      expect(result.override_trend).toBe('improving');
    });

    it('returns stable when second-half rate >= 80% of first-half rate', () => {
      // 4 overrides, all actor_override with user_changed=true, evenly distributed
      // First half: 2/2 = 1.0, Second half: 2/2 = 1.0 → stable
      mockStorage['sot_judgments'] = [
        makeJudgment({ user_changed: true, created_at: '2025-01-01' }),
        makeJudgment({ user_changed: true, created_at: '2025-01-02' }),
        makeJudgment({ user_changed: true, created_at: '2025-01-03' }),
        makeJudgment({ user_changed: true, created_at: '2025-01-04' }),
      ];
      const result = assessLearningHealth();
      expect(result.override_trend).toBe('stable');
    });
  });

  // ── Convergence Trend ──

  describe('convergence_trend', () => {
    it('returns not_enough_data when < 3 converged loops', () => {
      mockStorage['sot_refine_loops'] = [
        makeLoop({ created_at: '2025-01-01' }),
        makeLoop({ created_at: '2025-01-02' }),
      ];
      const result = assessLearningHealth();
      expect(result.convergence_trend).toBe('not_enough_data');
    });

    it('returns improving when later loops have fewer iterations', () => {
      // 4 loops: early avg = (5+5)/2 = 5, late avg = (2+2)/2 = 2
      // 2 < 5*0.8 = 4 → improving
      const iters = (n: number) => Array.from({ length: n }, (_, i) => ({ iteration_number: i + 1 }));
      mockStorage['sot_refine_loops'] = [
        makeLoop({ iterations: iters(5), created_at: '2025-01-01' }),
        makeLoop({ iterations: iters(5), created_at: '2025-01-02' }),
        makeLoop({ iterations: iters(2), created_at: '2025-01-03' }),
        makeLoop({ iterations: iters(2), created_at: '2025-01-04' }),
      ];
      const result = assessLearningHealth();
      expect(result.convergence_trend).toBe('improving');
    });

    it('returns stable when late loops have similar iteration count', () => {
      const iters = (n: number) => Array.from({ length: n }, (_, i) => ({ iteration_number: i + 1 }));
      mockStorage['sot_refine_loops'] = [
        makeLoop({ iterations: iters(3), created_at: '2025-01-01' }),
        makeLoop({ iterations: iters(3), created_at: '2025-01-02' }),
        makeLoop({ iterations: iters(3), created_at: '2025-01-03' }),
      ];
      const result = assessLearningHealth();
      expect(result.convergence_trend).toBe('stable');
    });
  });

  // ── Learning Tier ──

  describe('learning_tier', () => {
    it('defaults to tier 1', () => {
      const result = assessLearningHealth();
      expect(result.learning_tier).toBe(1);
    });

    it('tier 2 when signal_count >= 10 and judgments >= 5', () => {
      mockGetSignals.mockReturnValue(Array.from({ length: 10 }, () => makeSignal()) as never);
      mockStorage['sot_judgments'] = Array.from({ length: 5 }, () => makeJudgment({ type: 'conflict_resolution' }));

      const result = assessLearningHealth();
      expect(result.learning_tier).toBe(2);
    });

    it('tier 3 when signal_count >= 30, judgments >= 15, completedLoops >= 3', () => {
      mockGetSignals.mockReturnValue(Array.from({ length: 30 }, () => makeSignal()) as never);
      mockStorage['sot_judgments'] = Array.from({ length: 15 }, () => makeJudgment({ type: 'conflict_resolution' }));
      mockStorage['sot_refine_loops'] = Array.from({ length: 3 }, (_, i) =>
        makeLoop({ created_at: `2025-01-0${i + 1}` }),
      );

      const result = assessLearningHealth();
      expect(result.learning_tier).toBe(3);
    });
  });

  // ── Recommendations ──

  describe('recommendations', () => {
    it('suggests more data when signal_count < 5', () => {
      mockGetSignals.mockReturnValue([makeSignal()] as never);
      const result = assessLearningHealth();
      expect(result.recommendations).toEqual(
        expect.arrayContaining([expect.stringContaining('학습 데이터가 축적')]),
      );
    });

    it('suggests assumption evaluation when eval_coverage < 50 and reframeItems >= 3', () => {
      // 0 assumption_diversity signals, 3 reframe items → coverage = 0
      mockStorage['sot_reframe_list'] = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const result = assessLearningHealth();
      expect(result.recommendations).toEqual(
        expect.arrayContaining([expect.stringContaining('전제를 평가')]),
      );
    });

    it('suggests persona ratings when ratings < 2', () => {
      const result = assessLearningHealth();
      expect(result.recommendations).toEqual(
        expect.arrayContaining([expect.stringContaining('페르소나 캘리브레이션')]),
      );
    });

    it('notes stable override rate when override_trend=stable and overrideJudgments >= 6', () => {
      mockStorage['sot_judgments'] = Array.from({ length: 6 }, (_, i) =>
        makeJudgment({ user_changed: true, created_at: `2025-01-0${i + 1}` }),
      );
      const result = assessLearningHealth();
      expect(result.override_trend).toBe('stable');
      expect(result.recommendations).toEqual(
        expect.arrayContaining([expect.stringContaining('오버라이드율이 줄어들지 않고')]),
      );
    });

    it('positive message when override improving', () => {
      // 4 overrides + extra non-override actor_override in second half to dilute rate
      mockStorage['sot_judgments'] = [
        makeJudgment({ user_changed: true, created_at: '2025-01-01' }),
        makeJudgment({ user_changed: true, created_at: '2025-01-02' }),
        makeJudgment({ user_changed: true, created_at: '2025-01-03' }),
        makeJudgment({ user_changed: true, created_at: '2025-01-04' }),
        makeJudgment({ user_changed: false, created_at: '2025-01-05' }),
        makeJudgment({ user_changed: false, created_at: '2025-01-06' }),
        makeJudgment({ user_changed: false, created_at: '2025-01-07' }),
        makeJudgment({ user_changed: false, created_at: '2025-01-08' }),
        makeJudgment({ user_changed: false, created_at: '2025-01-09' }),
      ];
      const result = assessLearningHealth();
      expect(result.override_trend).toBe('improving');
      expect(result.recommendations).toEqual(
        expect.arrayContaining([expect.stringContaining('학습이 작동')]),
      );
    });

    it('positive message when convergence improving', () => {
      const iters = (n: number) => Array.from({ length: n }, (_, i) => ({ iteration_number: i + 1 }));
      mockStorage['sot_refine_loops'] = [
        makeLoop({ iterations: iters(6), created_at: '2025-01-01' }),
        makeLoop({ iterations: iters(6), created_at: '2025-01-02' }),
        makeLoop({ iterations: iters(1), created_at: '2025-01-03' }),
        makeLoop({ iterations: iters(1), created_at: '2025-01-04' }),
      ];
      const result = assessLearningHealth();
      expect(result.convergence_trend).toBe('improving');
      expect(result.recommendations).toEqual(
        expect.arrayContaining([expect.stringContaining('수렴 속도가 빨라지고')]),
      );
    });
  });
});

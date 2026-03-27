import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildConcertmasterProfile,
  buildConcertmasterInsights,
  getStepCoaching,
} from '@/lib/concertmaster';
import type { ConcertmasterProfile } from '@/lib/concertmaster';

// Mock dependencies
vi.mock('@/lib/eval-engine', () => ({
  getSessionInsights: vi.fn(() => []),
  getEvalSummary: vi.fn(() => ({
    total_sessions: 0,
    avg_pass_rate: 0,
    best_strategy: null,
    worst_eval: null,
  })),
  analyzeStrategyPerformance: vi.fn(() => []),
}));

vi.mock('@/lib/prompt-mutation', () => ({
  getWorstPerformingEvals: vi.fn(() => []),
}));

vi.mock('@/lib/storage', () => ({
  getStorage: vi.fn(() => []),
  STORAGE_KEYS: {
    JUDGMENTS: 'sot_judgments',
    PROJECTS: 'sot_projects',
    ACCURACY_RATINGS: 'sot_accuracy_ratings',
  },
}));

// Get mock references
import { getSessionInsights, getEvalSummary, analyzeStrategyPerformance } from '@/lib/eval-engine';
import { getWorstPerformingEvals } from '@/lib/prompt-mutation';
import { getStorage } from '@/lib/storage';

const mockGetSessionInsights = vi.mocked(getSessionInsights);
const mockGetEvalSummary = vi.mocked(getEvalSummary);
const mockAnalyzeStrategyPerformance = vi.mocked(analyzeStrategyPerformance);
const mockGetWorstPerformingEvals = vi.mocked(getWorstPerformingEvals);
const mockGetStorage = vi.mocked(getStorage);

describe('concertmaster', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildConcertmasterProfile', () => {
    it('returns tier 1 for new users', () => {
      mockGetEvalSummary.mockReturnValue({
        total_sessions: 0,
        avg_pass_rate: 0,
        best_strategy: null,
        worst_eval: null,
      });
      mockGetStorage.mockReturnValue([]);
      mockAnalyzeStrategyPerformance.mockReturnValue([]);

      const profile = buildConcertmasterProfile();
      expect(profile.tier).toBe(1);
      expect(profile.sessionCount).toBe(0);
      expect(profile.totalJudgments).toBe(0);
    });

    it('returns tier 2 for 3+ sessions', () => {
      mockGetEvalSummary.mockReturnValue({
        total_sessions: 5,
        avg_pass_rate: 0.7,
        best_strategy: 'redirect_angle',
        worst_eval: null,
      });
      mockGetStorage.mockImplementation((key: string) => {
        if (key === 'sot_judgments') return [
          { id: '1', user_changed: true, type: 'actor_override', decision: 'human', tool: 'recast', context: '', original_ai_suggestion: '', created_at: '' },
          { id: '2', user_changed: false, type: 'actor_override', decision: 'ai', tool: 'recast', context: '', original_ai_suggestion: '', created_at: '' },
        ];
        if (key === 'sot_projects') return [{ id: 'p1', name: 'P1' }];
        return [];
      });
      mockAnalyzeStrategyPerformance.mockReturnValue([
        { strategy: 'redirect_angle', sample_count: 4, avg_pass_rate: 0.8, per_eval_pass_rates: {} },
      ]);

      const profile = buildConcertmasterProfile();
      expect(profile.tier).toBe(2);
      expect(profile.sessionCount).toBe(5);
      expect(profile.dominantStrategy).toBe('redirect_angle');
      expect(profile.overrideRate).toBe(0.5);
    });

    it('returns tier 3 for 10+ sessions and 2+ projects', () => {
      mockGetEvalSummary.mockReturnValue({
        total_sessions: 12,
        avg_pass_rate: 0.8,
        best_strategy: 'diagnose_root',
        worst_eval: null,
      });
      mockGetStorage.mockImplementation((key: string) => {
        if (key === 'sot_judgments') return [];
        if (key === 'sot_projects') return [{ id: 'p1' }, { id: 'p2' }];
        return [];
      });
      mockAnalyzeStrategyPerformance.mockReturnValue([
        { strategy: 'diagnose_root', sample_count: 8, avg_pass_rate: 0.85, per_eval_pass_rates: {} },
      ]);

      const profile = buildConcertmasterProfile();
      expect(profile.tier).toBe(3);
    });
  });

  describe('buildConcertmasterInsights', () => {
    it('returns empty for tier 1 with no history', () => {
      mockGetSessionInsights.mockReturnValue([]);
      mockGetStorage.mockReturnValue([]);
      mockGetWorstPerformingEvals.mockReturnValue([]);

      const profile: ConcertmasterProfile = {
        sessionCount: 0, projectCount: 0, totalJudgments: 0,
        overrideRate: 0, dominantStrategy: null, avgPassRate: 0, tier: 1,
      };

      const insights = buildConcertmasterInsights(profile);
      expect(insights).toHaveLength(0);
    });

    it('includes session insights at tier 1', () => {
      mockGetSessionInsights.mockReturnValue([
        { type: 'last_strategy', message: '지난 분석에서 "관점 전환" 접근이 효과적이었습니다.' },
      ]);
      mockGetStorage.mockReturnValue([]);
      mockGetWorstPerformingEvals.mockReturnValue([]);

      const profile: ConcertmasterProfile = {
        sessionCount: 1, projectCount: 1, totalJudgments: 0,
        overrideRate: 0, dominantStrategy: null, avgPassRate: 0.5, tier: 1,
      };

      const insights = buildConcertmasterInsights(profile);
      expect(insights.length).toBeGreaterThanOrEqual(1);
      expect(insights[0].category).toBe('pattern');
    });

    it('includes eval coaching at tier 2', () => {
      mockGetSessionInsights.mockReturnValue([]);
      mockGetEvalSummary.mockReturnValue({
        total_sessions: 5, avg_pass_rate: 0.6, best_strategy: null, worst_eval: 'assumptions_engaged',
      });
      mockGetWorstPerformingEvals.mockReturnValue([
        { evalId: 'assumptions_engaged', instruction: '전제를 더 적극적으로 찾으세요', passRate: 0.3 },
      ]);
      mockGetStorage.mockReturnValue([]);

      const profile: ConcertmasterProfile = {
        sessionCount: 5, projectCount: 1, totalJudgments: 5,
        overrideRate: 0.2, dominantStrategy: null, avgPassRate: 0.6, tier: 2,
      };

      const insights = buildConcertmasterInsights(profile);
      const coaching = insights.filter((i) => i.category === 'coaching');
      expect(coaching.length).toBeGreaterThanOrEqual(1);
    });

    it('includes cross-project insights at tier 3', () => {
      mockGetSessionInsights.mockReturnValue([]);
      mockGetEvalSummary.mockReturnValue({
        total_sessions: 12, avg_pass_rate: 0.8, best_strategy: 'redirect_angle', worst_eval: null,
      });
      mockGetWorstPerformingEvals.mockReturnValue([]);
      mockAnalyzeStrategyPerformance.mockReturnValue([
        { strategy: 'redirect_angle', sample_count: 5, avg_pass_rate: 0.9, per_eval_pass_rates: {} },
        { strategy: 'diagnose_root', sample_count: 4, avg_pass_rate: 0.6, per_eval_pass_rates: {} },
      ]);
      mockGetStorage.mockImplementation((key: string) => {
        if (key === 'sot_projects') return [
          { id: 'p1', name: '프로젝트A', meta_reflection: { surprising_discovery: '시장이 예상보다 성숙했다' } },
        ];
        return [];
      });

      const profile: ConcertmasterProfile = {
        sessionCount: 12, projectCount: 3, totalJudgments: 10,
        overrideRate: 0.3, dominantStrategy: 'redirect_angle', avgPassRate: 0.8, tier: 3,
      };

      const insights = buildConcertmasterInsights(profile);
      const growth = insights.filter((i) => i.category === 'growth');
      expect(growth.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getStepCoaching', () => {
    it('returns welcome for reframe with 0 sessions', () => {
      mockGetSessionInsights.mockReturnValue([]);
      mockGetWorstPerformingEvals.mockReturnValue([]);

      const profile: ConcertmasterProfile = {
        sessionCount: 0, projectCount: 0, totalJudgments: 0,
        overrideRate: 0, dominantStrategy: null, avgPassRate: 0, tier: 1,
      };

      const coaching = getStepCoaching('reframe', profile);
      expect(coaching).not.toBeNull();
      expect(coaching!.message).toContain('첫 분석');
    });

    it('returns override coaching for recast', () => {
      mockGetStorage.mockReturnValue([
        { id: '1', type: 'actor_override', user_changed: true, decision: 'human', tool: 'recast', context: '', original_ai_suggestion: '', created_at: '' },
        { id: '2', type: 'actor_override', user_changed: true, decision: 'human', tool: 'recast', context: '', original_ai_suggestion: '', created_at: '' },
        { id: '3', type: 'actor_override', user_changed: true, decision: 'ai', tool: 'recast', context: '', original_ai_suggestion: '', created_at: '' },
      ]);

      const profile: ConcertmasterProfile = {
        sessionCount: 5, projectCount: 1, totalJudgments: 5,
        overrideRate: 0.5, dominantStrategy: null, avgPassRate: 0.6, tier: 2,
      };

      const coaching = getStepCoaching('recast', profile);
      expect(coaching).not.toBeNull();
      expect(coaching!.message).toContain('수정');
    });

    it('returns null for recast with few judgments', () => {
      const profile: ConcertmasterProfile = {
        sessionCount: 1, projectCount: 1, totalJudgments: 1,
        overrideRate: 0, dominantStrategy: null, avgPassRate: 0, tier: 1,
      };

      const coaching = getStepCoaching('recast', profile);
      expect(coaching).toBeNull();
    });

    it('returns persona accuracy coaching when ratings exist', () => {
      mockGetStorage.mockImplementation((key: string) => {
        if (key === 'sot_accuracy_ratings') return [
          {
            id: 'r1', persona_id: 'p1', accuracy_score: 3.5,
            which_aspects_accurate: ['톤', '관점'],
            which_aspects_inaccurate: ['깊이'],
            created_at: '',
          },
          {
            id: 'r2', persona_id: 'p1', accuracy_score: 4.0,
            which_aspects_accurate: ['톤'],
            which_aspects_inaccurate: ['깊이', '현실성'],
            created_at: '',
          },
        ];
        return [];
      });

      const profile: ConcertmasterProfile = {
        sessionCount: 5, projectCount: 1, totalJudgments: 5,
        overrideRate: 0.2, dominantStrategy: null, avgPassRate: 0.7, tier: 2,
      };

      const coaching = getStepCoaching('rehearse', profile);
      expect(coaching).not.toBeNull();
      expect(coaching!.message).toContain('정확도');
    });

    it('returns convergence coaching for refine step', () => {
      mockGetStorage.mockImplementation((key: string) => {
        if (key === 'sot_refine_loops') return [
          { iterations: [{}, {}, {}] },
        ];
        return [];
      });

      const profile: ConcertmasterProfile = {
        sessionCount: 5, projectCount: 1, totalJudgments: 5,
        overrideRate: 0.2, dominantStrategy: null, avgPassRate: 0.7, tier: 2,
      };

      const coaching = getStepCoaching('refine', profile);
      expect(coaching).not.toBeNull();
      expect(coaching!.message).toContain('3회 반복');
    });
  });
});

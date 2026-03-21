import type { RefinementLoop, RefinementIssue, RefinementIteration } from '@/stores/types';
import {
  calculateWeightedScore,
  detectConvergence,
  matchIssuesAcrossIterations,
} from '@/lib/convergence';
import { computeSimilarity } from '@/lib/similarity';

vi.mock('@/lib/similarity', () => ({
  computeSimilarity: vi.fn(),
}));

const mockedComputeSimilarity = computeSimilarity as ReturnType<typeof vi.fn>;

/* ────────────────────────────────────
   Helper: create a RefinementIssue
   ──────────────────────────────────── */

function makeIssue(
  overrides: Partial<RefinementIssue> = {}
): RefinementIssue {
  return {
    id: 'issue-1',
    source_persona_id: 'p1',
    source_persona_name: 'Persona 1',
    category: 'concern',
    severity: 'improvement',
    text: '이슈 텍스트',
    resolved: false,
    ...overrides,
  };
}

/* ────────────────────────────────────
   Helper: create a RefinementIteration
   ──────────────────────────────────── */

function makeIteration(
  overrides: Partial<RefinementIteration> = {}
): RefinementIteration {
  return {
    iteration_number: 1,
    trigger_reason: '피드백 기반',
    issues_from_feedback: [],
    constraints_added: [],
    depth: 'quick',
    delta_summary: '',
    unresolved_count: 0,
    total_issue_count: 0,
    convergence_score: 0,
    created_at: '2024-01-01',
    ...overrides,
  };
}

/* ────────────────────────────────────
   Helper: create a RefinementLoop
   ──────────────────────────────────── */

function makeLoop(
  overrides: Partial<RefinementLoop> = {}
): RefinementLoop {
  return {
    id: 'loop-1',
    project_id: 'proj-1',
    name: '테스트 루프',
    goal: '수렴 테스트',
    iterations: [],
    status: 'active',
    max_iterations: 5,
    convergence_threshold: 0.8,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    ...overrides,
  };
}

/* ────────────────────────────────────
   calculateWeightedScore
   ──────────────────────────────────── */

describe('calculateWeightedScore', () => {
  it('returns score 1 for empty issues', () => {
    const { score } = calculateWeightedScore([]);
    expect(score).toBe(1);
  });

  it('applies blocker weight 3x, improvement 1x, nice_to_have 0.5x', () => {
    const issues: RefinementIssue[] = [
      makeIssue({ id: '1', severity: 'blocker', resolved: true }),
      makeIssue({ id: '2', severity: 'improvement', resolved: false }),
      makeIssue({ id: '3', severity: 'nice_to_have', resolved: false }),
    ];

    const { score } = calculateWeightedScore(issues);
    // weighted resolved = 3 (blocker resolved)
    // weighted total = 3 + 1 + 0.5 = 4.5
    // score = 3 / 4.5 = 0.6667
    expect(score).toBeCloseTo(3 / 4.5, 4);
  });

  it('counts resolved items correctly', () => {
    const issues: RefinementIssue[] = [
      makeIssue({ id: '1', severity: 'blocker', resolved: true }),
      makeIssue({ id: '2', severity: 'blocker', resolved: false }),
      makeIssue({ id: '3', severity: 'improvement', resolved: true }),
    ];

    const { score, breakdown } = calculateWeightedScore(issues);
    expect(breakdown.blocker.resolved).toBe(1);
    expect(breakdown.blocker.total).toBe(2);
    expect(breakdown.improvement.resolved).toBe(1);
    expect(breakdown.improvement.total).toBe(1);
    // weighted resolved = 3 + 1 = 4, weighted total = 6 + 1 = 7
    expect(score).toBeCloseTo(4 / 7, 4);
  });

  it('breakdown has correct totals', () => {
    const issues: RefinementIssue[] = [
      makeIssue({ id: '1', severity: 'blocker', resolved: false }),
      makeIssue({ id: '2', severity: 'improvement', resolved: true }),
      makeIssue({ id: '3', severity: 'improvement', resolved: false }),
      makeIssue({ id: '4', severity: 'nice_to_have', resolved: true }),
    ];

    const { breakdown } = calculateWeightedScore(issues);
    expect(breakdown.blocker).toEqual({ resolved: 0, total: 1 });
    expect(breakdown.improvement).toEqual({ resolved: 1, total: 2 });
    expect(breakdown.nice_to_have).toEqual({ resolved: 1, total: 1 });
  });
});

/* ────────────────────────────────────
   detectConvergence
   ──────────────────────────────────── */

describe('detectConvergence', () => {
  it('returns score 0 and continue for empty iterations', () => {
    const loop = makeLoop({ iterations: [] });
    const result = detectConvergence(loop);
    expect(result.score).toBe(0);
    expect(result.recommendation).toBe('continue');
    expect(result.shouldStop).toBe(false);
  });

  it('returns shouldStop when max iterations reached', () => {
    const iterations = [
      makeIteration({
        iteration_number: 1,
        issues_from_feedback: [makeIssue({ resolved: false })],
      }),
      makeIteration({
        iteration_number: 2,
        issues_from_feedback: [makeIssue({ resolved: false })],
      }),
    ];

    const loop = makeLoop({ iterations, max_iterations: 2 });
    const result = detectConvergence(loop);
    expect(result.shouldStop).toBe(true);
    expect(result.recommendation).toBe('stop');
  });

  it('returns shouldStop when score >= threshold', () => {
    const iterations = [
      makeIteration({
        iteration_number: 1,
        issues_from_feedback: [
          makeIssue({ id: '1', severity: 'blocker', resolved: true }),
          makeIssue({ id: '2', severity: 'improvement', resolved: true }),
        ],
      }),
    ];

    const loop = makeLoop({ iterations, convergence_threshold: 0.8 });
    const result = detectConvergence(loop);
    // All resolved → score = 1, which is >= 0.8
    expect(result.score).toBe(1);
    expect(result.shouldStop).toBe(true);
    expect(result.recommendation).toBe('stop');
  });

  it('recommends one_more when stalling (improvement <= 0.02)', () => {
    // Two iterations with nearly identical scores
    const issues1: RefinementIssue[] = [
      makeIssue({ id: '1', severity: 'improvement', resolved: false }),
      makeIssue({ id: '2', severity: 'improvement', resolved: true }),
    ];
    const issues2: RefinementIssue[] = [
      makeIssue({ id: '1', severity: 'improvement', resolved: false }),
      makeIssue({ id: '2', severity: 'improvement', resolved: true }),
    ];

    const iterations = [
      makeIteration({ iteration_number: 1, issues_from_feedback: issues1 }),
      makeIteration({ iteration_number: 2, issues_from_feedback: issues2 }),
    ];

    const loop = makeLoop({ iterations, convergence_threshold: 0.8, max_iterations: 5 });
    const result = detectConvergence(loop);
    // Both have score 0.5, improvement = 0 <= 0.02
    expect(result.recommendation).toBe('one_more');
    expect(result.shouldStop).toBe(false);
  });

  it('continues when score is below threshold and improving', () => {
    const issues1: RefinementIssue[] = [
      makeIssue({ id: '1', severity: 'improvement', resolved: false }),
      makeIssue({ id: '2', severity: 'improvement', resolved: false }),
      makeIssue({ id: '3', severity: 'improvement', resolved: false }),
      makeIssue({ id: '4', severity: 'improvement', resolved: false }),
    ];
    const issues2: RefinementIssue[] = [
      makeIssue({ id: '1', severity: 'improvement', resolved: true }),
      makeIssue({ id: '2', severity: 'improvement', resolved: true }),
      makeIssue({ id: '3', severity: 'improvement', resolved: false }),
      makeIssue({ id: '4', severity: 'improvement', resolved: false }),
    ];

    const iterations = [
      makeIteration({ iteration_number: 1, issues_from_feedback: issues1 }),
      makeIteration({ iteration_number: 2, issues_from_feedback: issues2 }),
    ];

    const loop = makeLoop({ iterations, convergence_threshold: 0.8, max_iterations: 5 });
    const result = detectConvergence(loop);
    // iter1 score = 0, iter2 score = 0.5, improvement = 0.5 > 0.02
    expect(result.recommendation).toBe('continue');
    expect(result.shouldStop).toBe(false);
  });
});

/* ────────────────────────────────────
   matchIssuesAcrossIterations
   ──────────────────────────────────── */

describe('matchIssuesAcrossIterations', () => {
  beforeEach(() => {
    mockedComputeSimilarity.mockReset();
  });

  it('marks issues as resolved when not found in new concerns', () => {
    mockedComputeSimilarity.mockReturnValue(0.1);

    const previousIssues: RefinementIssue[] = [
      makeIssue({ id: '1', text: '이전 이슈', resolved: false }),
    ];

    const result = matchIssuesAcrossIterations(previousIssues, ['완전히 다른 내용']);
    expect(result.resolved).toContain('이전 이슈');
    expect(result.persisting).toHaveLength(0);
    expect(result.newIssues).toContain('완전히 다른 내용');
  });

  it('marks issues as persisting when similarity > 0.4', () => {
    mockedComputeSimilarity.mockReturnValue(0.6);

    const previousIssues: RefinementIssue[] = [
      makeIssue({ id: '1', text: '비용 이슈', resolved: false }),
    ];

    const result = matchIssuesAcrossIterations(previousIssues, ['비용 관련 문제']);
    expect(result.persisting).toContain('비용 이슈');
    expect(result.resolved).toHaveLength(0);
    expect(result.newIssues).toHaveLength(0);
  });

  it('identifies new issues with no match to previous', () => {
    mockedComputeSimilarity.mockReturnValue(0.1);

    const previousIssues: RefinementIssue[] = [
      makeIssue({ id: '1', text: '이전 이슈', resolved: false }),
    ];

    const result = matchIssuesAcrossIterations(previousIssues, ['이전 이슈와 비슷', '완전 새 이슈']);
    expect(result.newIssues).toHaveLength(2);
    expect(result.resolved).toContain('이전 이슈');
  });

  it('skips already-resolved previous issues', () => {
    mockedComputeSimilarity.mockReturnValue(0.8);

    const previousIssues: RefinementIssue[] = [
      makeIssue({ id: '1', text: '이미 해결됨', resolved: true }),
    ];

    const result = matchIssuesAcrossIterations(previousIssues, ['이미 해결됨 비슷']);
    // resolved:true issues are skipped entirely
    expect(result.resolved).toHaveLength(0);
    expect(result.persisting).toHaveLength(0);
    expect(result.newIssues).toContain('이미 해결됨 비슷');
  });

  it('does not double-match new concerns', () => {
    // First call matches, second does not
    mockedComputeSimilarity
      .mockReturnValueOnce(0.6) // prev1 vs new[0] → match
      .mockReturnValueOnce(0.1) // prev2 vs new[0] → already matched, skip
      .mockReturnValueOnce(0.1); // prev2 vs new[1] → no match

    const previousIssues: RefinementIssue[] = [
      makeIssue({ id: '1', text: '이슈A', resolved: false }),
      makeIssue({ id: '2', text: '이슈B', resolved: false }),
    ];

    const result = matchIssuesAcrossIterations(previousIssues, ['비슷한A', '새로운C']);
    expect(result.persisting).toEqual(['이슈A']);
    expect(result.resolved).toEqual(['이슈B']);
    expect(result.newIssues).toEqual(['새로운C']);
  });
});

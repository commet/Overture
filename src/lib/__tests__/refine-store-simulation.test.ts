/**
 * RefineStore Simulation — addIteration, checkConvergence, getLoopsByProject, getActiveLoop
 *
 * 핵심 검증:
 * - createLoop이 올바른 필드로 루프를 생성하고 activeLoopId를 설정하는가
 * - addIteration이 created_at을 자동 생성하여 iterations 배열에 추가하는가
 * - checkConvergence가 존재하지 않는 loopId에 빈 결과를 반환하는가
 * - checkConvergence가 실제 loop에 대해 checkLoopConvergence에 위임하는가
 * - getLoopsByProject가 project_id로 정확히 필터링하는가
 * - getActiveLoop이 activeLoopId 기반으로 올바른 loop을 반환하는가
 * - deleteLoop이 active loop 삭제 시 activeLoopId를 초기화하는가
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mocks (MUST be before store imports) ───

vi.mock('@/lib/db', () => ({
  insertToSupabase: vi.fn(),
  upsertToSupabase: vi.fn(),
  deleteFromSupabase: vi.fn(),
  loadAndMerge: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({ select: vi.fn(() => ({ data: [], error: null })) })),
    auth: { getSession: vi.fn(() => Promise.resolve({ data: { session: null } })) },
  },
}));

vi.mock('@/lib/storage', () => {
  let store: Record<string, unknown> = {};
  return {
    getStorage: vi.fn((key: string, fallback: unknown) => store[key] ?? fallback),
    setStorage: vi.fn((key: string, value: unknown) => { store[key] = value; }),
    STORAGE_KEYS: { REFINE_LOOPS: 'sot_refine_loops', SETTINGS: 'sot_settings' },
    __resetStore: () => { store = {}; },
  };
});

vi.mock('@/lib/uuid', () => ({
  generateId: vi.fn(() => 'mock-id-' + Math.random().toString(36).slice(2, 8)),
}));

// Mock convergence with controllable return
const mockCheckConvergence = vi.fn(() => ({
  converged: false,
  critical_remaining: 2,
  approval_met: 1,
  approval_total: 3,
  total_issues: 5,
  issue_trend: [5, 3],
  guidance: '테스트 가이드',
}));
vi.mock('@/lib/convergence', () => ({
  checkLoopConvergence: (...args: unknown[]) => mockCheckConvergence(...args),
}));

// ─── Imports (after mocks) ───

import { useRefineStore } from '@/stores/useRefineStore';
import { __resetStore } from '@/lib/storage';
import type { RefineIteration } from '@/stores/types';

// ─── Helpers ───

const makeCreateParams = (overrides: Record<string, unknown> = {}) => ({
  projectId: 'proj-1',
  goal: 'Reduce onboarding friction by 50%',
  originalPlan: 'Step 1: audit current flow. Step 2: redesign.',
  initialFeedbackRecordId: 'fb-rec-1',
  initialApprovalConditions: [
    { persona_id: 'p1', persona_name: 'CTO', influence: 'high' as const, condition: 'Technical feasibility confirmed', met: false },
    { persona_id: 'p2', persona_name: 'PM', influence: 'medium' as const, condition: 'Timeline acceptable', met: false },
  ],
  personaIds: ['p1', 'p2'],
  ...overrides,
});

const makeIteration = (num: number): Omit<RefineIteration, 'created_at'> => ({
  iteration_number: num,
  issues_to_address: ['보안 이슈', '성능 문제'],
  revised_plan: `Revised plan v${num}`,
  changes: [{ what: 'Added caching', why: 'Performance', addressing: '성능 문제' }],
  feedback_record_id: `fb-iter-${num}`,
  convergence: {
    critical_risks: 1,
    total_issues: 3,
    approval_conditions: [],
  },
});

// ─── Tests ───

describe('RefineStore Simulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (__resetStore as () => void)();
    useRefineStore.setState({ loops: [], activeLoopId: null });
  });

  // ── createLoop + addIteration ──

  describe('createLoop + addIteration', () => {
    it('1. createLoop creates a loop with correct fields and sets it as active', () => {
      const { createLoop, getActiveLoop } = useRefineStore.getState();
      const loopId = createLoop(makeCreateParams());

      expect(loopId).toBeTruthy();

      const state = useRefineStore.getState();
      expect(state.loops).toHaveLength(1);
      expect(state.activeLoopId).toBe(loopId);

      const loop = state.loops[0];
      expect(loop.id).toBe(loopId);
      expect(loop.project_id).toBe('proj-1');
      expect(loop.goal).toBe('Reduce onboarding friction by 50%');
      expect(loop.original_plan).toContain('audit current flow');
      expect(loop.initial_feedback_record_id).toBe('fb-rec-1');
      expect(loop.initial_approval_conditions).toHaveLength(2);
      expect(loop.persona_ids).toEqual(['p1', 'p2']);
      expect(loop.iterations).toEqual([]);
      expect(loop.status).toBe('active');
      expect(loop.max_iterations).toBe(3);
      expect(loop.created_at).toBeTruthy();
      expect(loop.updated_at).toBeTruthy();

      // getActiveLoop should return the same loop
      const active = useRefineStore.getState().getActiveLoop();
      expect(active?.id).toBe(loopId);
    });

    it('2. addIteration appends iteration with auto-generated created_at', () => {
      const { createLoop, addIteration } = useRefineStore.getState();
      const loopId = createLoop(makeCreateParams());

      addIteration(loopId, makeIteration(1));

      const loop = useRefineStore.getState().loops.find(l => l.id === loopId)!;
      expect(loop.iterations).toHaveLength(1);

      const iter = loop.iterations[0];
      expect(iter.iteration_number).toBe(1);
      expect(iter.created_at).toBeTruthy();
      expect(typeof iter.created_at).toBe('string');
      expect(iter.revised_plan).toBe('Revised plan v1');
      expect(iter.issues_to_address).toEqual(['보안 이슈', '성능 문제']);
    });

    it('3. addIteration on nonexistent loopId does not crash (no-op)', () => {
      const { addIteration } = useRefineStore.getState();

      // Should not throw
      expect(() => {
        addIteration('nonexistent-id', makeIteration(1));
      }).not.toThrow();

      // State unchanged
      expect(useRefineStore.getState().loops).toHaveLength(0);
    });

    it('4. Multiple iterations accumulate in order', () => {
      const { createLoop, addIteration } = useRefineStore.getState();
      const loopId = createLoop(makeCreateParams());

      addIteration(loopId, makeIteration(1));
      addIteration(loopId, makeIteration(2));
      addIteration(loopId, makeIteration(3));

      const loop = useRefineStore.getState().loops.find(l => l.id === loopId)!;
      expect(loop.iterations).toHaveLength(3);
      expect(loop.iterations[0].iteration_number).toBe(1);
      expect(loop.iterations[1].iteration_number).toBe(2);
      expect(loop.iterations[2].iteration_number).toBe(3);

      // Each has its own created_at
      const timestamps = loop.iterations.map(i => i.created_at);
      timestamps.forEach(t => expect(t).toBeTruthy());
    });
  });

  // ── checkConvergence ──

  describe('checkConvergence', () => {
    it('5. Returns empty result for nonexistent loopId', () => {
      const { checkConvergence } = useRefineStore.getState();
      const result = checkConvergence('does-not-exist');

      expect(result).toEqual({
        converged: false,
        critical_remaining: 0,
        approval_met: 0,
        approval_total: 0,
        total_issues: 0,
        issue_trend: [],
        guidance: '',
      });
      // Should NOT have called the real convergence check
      expect(mockCheckConvergence).not.toHaveBeenCalled();
    });

    it('6. Delegates to checkLoopConvergence for existing loop', () => {
      const { createLoop, checkConvergence } = useRefineStore.getState();
      const loopId = createLoop(makeCreateParams());

      checkConvergence(loopId);

      expect(mockCheckConvergence).toHaveBeenCalledTimes(1);
      const calledWith = mockCheckConvergence.mock.calls[0][0] as { id: string };
      expect(calledWith.id).toBe(loopId);
    });

    it('7. Returns mocked convergence result', () => {
      const { createLoop, checkConvergence } = useRefineStore.getState();
      const loopId = createLoop(makeCreateParams());

      const result = checkConvergence(loopId);

      expect(result.converged).toBe(false);
      expect(result.critical_remaining).toBe(2);
      expect(result.approval_met).toBe(1);
      expect(result.approval_total).toBe(3);
      expect(result.total_issues).toBe(5);
      expect(result.issue_trend).toEqual([5, 3]);
      expect(result.guidance).toBe('테스트 가이드');
    });
  });

  // ── getLoopsByProject ──

  describe('getLoopsByProject', () => {
    it('8. Returns empty for no matching project', () => {
      const { createLoop, getLoopsByProject } = useRefineStore.getState();
      createLoop(makeCreateParams({ projectId: 'proj-A' }));

      const result = useRefineStore.getState().getLoopsByProject('proj-nonexistent');
      expect(result).toEqual([]);
    });

    it('9. Filters loops by project_id correctly', () => {
      const { createLoop } = useRefineStore.getState();
      createLoop(makeCreateParams({ projectId: 'proj-A' }));
      createLoop(makeCreateParams({ projectId: 'proj-B' }));
      createLoop(makeCreateParams({ projectId: 'proj-A' }));

      const loopsA = useRefineStore.getState().getLoopsByProject('proj-A');
      const loopsB = useRefineStore.getState().getLoopsByProject('proj-B');

      expect(loopsA).toHaveLength(2);
      expect(loopsB).toHaveLength(1);
      loopsA.forEach(l => expect(l.project_id).toBe('proj-A'));
      loopsB.forEach(l => expect(l.project_id).toBe('proj-B'));
    });
  });

  // ── getActiveLoop ──

  describe('getActiveLoop', () => {
    it('10. Returns undefined when no active loop', () => {
      const result = useRefineStore.getState().getActiveLoop();
      expect(result).toBeUndefined();
    });

    it('11. Returns correct loop when activeLoopId is set', () => {
      const { createLoop } = useRefineStore.getState();
      const id1 = createLoop(makeCreateParams({ projectId: 'proj-X' }));
      const id2 = createLoop(makeCreateParams({ projectId: 'proj-Y' }));

      // createLoop sets activeLoopId to the last created loop
      expect(useRefineStore.getState().activeLoopId).toBe(id2);
      expect(useRefineStore.getState().getActiveLoop()?.id).toBe(id2);

      // Manually switch active loop
      useRefineStore.getState().setActiveLoopId(id1);
      expect(useRefineStore.getState().getActiveLoop()?.id).toBe(id1);
      expect(useRefineStore.getState().getActiveLoop()?.project_id).toBe('proj-X');
    });
  });

  // ── deleteLoop ──

  describe('deleteLoop', () => {
    it('12. Clears activeLoopId if deleted loop was active', () => {
      const { createLoop, deleteLoop } = useRefineStore.getState();
      const id1 = createLoop(makeCreateParams());
      const id2 = createLoop(makeCreateParams());

      // id2 is active (last created)
      expect(useRefineStore.getState().activeLoopId).toBe(id2);

      // Delete the active loop
      useRefineStore.getState().deleteLoop(id2);

      expect(useRefineStore.getState().activeLoopId).toBeNull();
      expect(useRefineStore.getState().loops).toHaveLength(1);
      expect(useRefineStore.getState().loops[0].id).toBe(id1);
    });
  });
});

import { create } from 'zustand';
import type { RefineLoop, RefineIteration, ApprovalCondition } from '@/stores/types';
import { getStorage, setStorage, STORAGE_KEYS } from '@/lib/storage';
import { generateId } from '@/lib/uuid';
import { checkLoopConvergence } from '@/lib/convergence';
import { upsertToSupabase, deleteFromSupabase, loadAndMerge } from '@/lib/db';

interface RefineState {
  loops: RefineLoop[];
  activeLoopId: string | null;
  loadLoops: () => void;
  createLoop: (params: {
    projectId: string;
    goal: string;
    originalPlan: string;
    initialFeedbackRecordId: string;
    initialApprovalConditions: ApprovalCondition[];
    personaIds: string[];
    name?: string;
  }) => string;
  updateLoop: (id: string, data: Partial<RefineLoop>) => void;
  deleteLoop: (id: string) => void;
  setActiveLoopId: (id: string | null) => void;
  getActiveLoop: () => RefineLoop | undefined;
  addIteration: (loopId: string, iteration: Omit<RefineIteration, 'created_at'>) => void;
  getLoopsByProject: (projectId: string) => RefineLoop[];
  checkConvergence: (loopId: string) => ReturnType<typeof checkLoopConvergence>;
}

export const useRefineStore = create<RefineState>((set, get) => ({
  loops: [],
  activeLoopId: null,

  loadLoops: () => {
    const local = getStorage<RefineLoop[]>(STORAGE_KEYS.REFINE_LOOPS, []);
    set({ loops: local });
    loadAndMerge<RefineLoop>('refine_loops', STORAGE_KEYS.REFINE_LOOPS)
      .then((merged) => set({ loops: merged }));
  },

  createLoop: (params) => {
    const now = new Date().toISOString();
    const loop: RefineLoop = {
      id: generateId(),
      project_id: params.projectId,
      name: params.name || params.goal.slice(0, 30),
      goal: params.goal,
      original_plan: params.originalPlan,
      initial_feedback_record_id: params.initialFeedbackRecordId,
      initial_approval_conditions: params.initialApprovalConditions,
      persona_ids: params.personaIds,
      iterations: [],
      status: 'active',
      max_iterations: 3,
      created_at: now,
      updated_at: now,
    };
    const loops = [...get().loops, loop];
    set({ loops, activeLoopId: loop.id });
    setStorage(STORAGE_KEYS.REFINE_LOOPS, loops);
    upsertToSupabase('refine_loops', loop);
    return loop.id;
  },

  updateLoop: (id, data) => {
    const loops = get().loops.map((l) =>
      l.id === id ? { ...l, ...data, updated_at: new Date().toISOString() } : l
    );
    set({ loops });
    setStorage(STORAGE_KEYS.REFINE_LOOPS, loops);
    const updated = get().loops.find(l => l.id === id);
    if (updated) upsertToSupabase('refine_loops', updated);
  },

  deleteLoop: (id) => {
    const loops = get().loops.filter((l) => l.id !== id);
    const activeLoopId = get().activeLoopId === id ? null : get().activeLoopId;
    set({ loops, activeLoopId });
    setStorage(STORAGE_KEYS.REFINE_LOOPS, loops);
    deleteFromSupabase('refine_loops', id);
  },

  setActiveLoopId: (id) => set({ activeLoopId: id }),

  getActiveLoop: () => {
    const { loops, activeLoopId } = get();
    return loops.find((l) => l.id === activeLoopId);
  },

  addIteration: (loopId, iteration) => {
    const loops = get().loops.map((l) => {
      if (l.id !== loopId) return l;
      return {
        ...l,
        iterations: [...l.iterations, { ...iteration, created_at: new Date().toISOString() }],
        updated_at: new Date().toISOString(),
      };
    });
    set({ loops });
    setStorage(STORAGE_KEYS.REFINE_LOOPS, loops);
    const updated = get().loops.find(l => l.id === loopId);
    if (updated) upsertToSupabase('refine_loops', updated);
  },

  getLoopsByProject: (projectId) =>
    get().loops.filter((l) => l.project_id === projectId),

  checkConvergence: (loopId) => {
    const loop = get().loops.find((l) => l.id === loopId);
    if (!loop) return {
      converged: false, critical_remaining: 0, approval_met: 0,
      approval_total: 0, total_issues: 0, issue_trend: [],
      guidance: '',
    };
    return checkLoopConvergence(loop);
  },
}));

import { create } from 'zustand';
import type { RefineLoop, RefineIteration, ApprovalCondition } from '@/stores/types';
import { STORAGE_KEYS } from '@/lib/storage';
import { checkLoopConvergence } from '@/lib/convergence';
import { generateId, loadItems, addNewItem, updateItem, deleteItem, updateNestedField } from './createItemStore';

const TABLE = 'refine_loops' as const;
const KEY = STORAGE_KEYS.REFINE_LOOPS;

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

  loadLoops: () => loadItems(KEY, TABLE, () => get().loops, (loops) => set({ loops })),

  createLoop: (params) => {
    const now = new Date().toISOString();
    return addNewItem(KEY, TABLE, () => get().loops, (loops, id) => set({ loops, activeLoopId: id }), {
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
    });
  },

  updateLoop: (id, data) => updateItem(KEY, TABLE, () => get().loops, (loops) => set({ loops }), id, data),
  deleteLoop: (id) => deleteItem(KEY, TABLE, () => get().loops, (loops) => set({ loops }), () => get().activeLoopId, (aid) => set({ activeLoopId: aid }), id),
  setActiveLoopId: (id) => set({ activeLoopId: id }),
  getActiveLoop: () => get().loops.find((l) => l.id === get().activeLoopId),

  addIteration: (loopId, iteration) =>
    updateNestedField(KEY, TABLE, () => get().loops, (loops) => set({ loops }), loopId, (l) => ({
      ...l, iterations: [...l.iterations, { ...iteration, created_at: new Date().toISOString() }],
    })),

  getLoopsByProject: (projectId) => get().loops.filter((l) => l.project_id === projectId),

  checkConvergence: (loopId) => {
    const loop = get().loops.find((l) => l.id === loopId);
    if (!loop) return {
      converged: false, critical_remaining: 0, approval_met: 0,
      approval_total: 0, total_issues: 0, issue_trend: [], guidance: '',
    };
    return checkLoopConvergence(loop);
  },
}));

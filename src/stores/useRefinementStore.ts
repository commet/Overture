import { create } from 'zustand';
import type { RefinementLoop, RefinementIteration } from '@/stores/types';
import { getStorage, setStorage, STORAGE_KEYS } from '@/lib/storage';
import { generateId } from '@/lib/uuid';
import { detectConvergence } from '@/lib/convergence';
import { upsertToSupabase, deleteFromSupabase, syncToSupabase } from '@/lib/db';

interface RefinementState {
  loops: RefinementLoop[];
  activeLoopId: string | null;
  loadLoops: () => void;
  createLoop: (projectId: string, goal: string, name?: string) => string;
  updateLoop: (id: string, data: Partial<RefinementLoop>) => void;
  deleteLoop: (id: string) => void;
  setActiveLoopId: (id: string | null) => void;
  getActiveLoop: () => RefinementLoop | undefined;
  addIteration: (loopId: string, iteration: Omit<RefinementIteration, 'created_at'>) => void;
  getLoopsByProject: (projectId: string) => RefinementLoop[];
  checkConvergence: (loopId: string) => ReturnType<typeof detectConvergence>;
}

export const useRefinementStore = create<RefinementState>((set, get) => ({
  loops: [],
  activeLoopId: null,

  loadLoops: () => {
    const loops = getStorage<RefinementLoop[]>(STORAGE_KEYS.REFINEMENT_LOOPS, []);
    set({ loops });
    // Background sync to Supabase
    syncToSupabase('refinement_loops', loops);
  },

  createLoop: (projectId, goal, name) => {
    const now = new Date().toISOString();
    const loop: RefinementLoop = {
      id: generateId(),
      project_id: projectId,
      name: name || goal.slice(0, 30),
      goal,
      iterations: [],
      status: 'active',
      max_iterations: 5,
      convergence_threshold: 0.85,
      created_at: now,
      updated_at: now,
    };
    const loops = [...get().loops, loop];
    set({ loops, activeLoopId: loop.id });
    setStorage(STORAGE_KEYS.REFINEMENT_LOOPS, loops);
    upsertToSupabase('refinement_loops', loop);
    return loop.id;
  },

  updateLoop: (id, data) => {
    const loops = get().loops.map((l) =>
      l.id === id ? { ...l, ...data, updated_at: new Date().toISOString() } : l
    );
    set({ loops });
    setStorage(STORAGE_KEYS.REFINEMENT_LOOPS, loops);
    const updated = get().loops.find(l => l.id === id);
    if (updated) upsertToSupabase('refinement_loops', updated);
  },

  deleteLoop: (id) => {
    const loops = get().loops.filter((l) => l.id !== id);
    const activeLoopId = get().activeLoopId === id ? null : get().activeLoopId;
    set({ loops, activeLoopId });
    setStorage(STORAGE_KEYS.REFINEMENT_LOOPS, loops);
    deleteFromSupabase('refinement_loops', id);
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
    setStorage(STORAGE_KEYS.REFINEMENT_LOOPS, loops);
    const updated = get().loops.find(l => l.id === loopId);
    if (updated) upsertToSupabase('refinement_loops', updated);
  },

  getLoopsByProject: (projectId) =>
    get().loops.filter((l) => l.project_id === projectId),

  checkConvergence: (loopId) => {
    const loop = get().loops.find((l) => l.id === loopId);
    if (!loop) return { score: 0, shouldStop: false, reason: '', recommendation: 'continue' as const };
    return detectConvergence(loop);
  },
}));

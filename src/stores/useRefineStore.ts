import { create } from 'zustand';
import type { RefineLoop, RefineIteration, ApprovalCondition } from '@/stores/types';
import { STORAGE_KEYS } from '@/lib/storage';
import { checkLoopConvergence } from '@/lib/convergence';
import { nextChildLabel, promoteToMajor, ROOT_LABEL } from '@/lib/version-numbering';
import { generateId, loadItems, addNewItem, updateItem, deleteItem, updateNestedField } from './createItemStore';

const TABLE = 'refine_loops' as const;
const KEY = STORAGE_KEYS.REFINE_LOOPS;

// ─── Migration ──────────────────────────────────────────────
// Legacy loops stored iterations as a flat list without ids or version
// labels. Fill missing fields deterministically so parent_iteration_id
// links stay stable across reloads.
function migrateLoop(loop: RefineLoop): RefineLoop {
  const needs = loop.iterations.some((it) => !it.id || !it.version_label);
  const needsActive = loop.active_iteration_id === undefined;
  if (!needs && !needsActive) return loop;

  const legacyId = (i: number) => `legacy-${loop.id}-${i}`;
  const migrated: RefineIteration[] = loop.iterations.map((it, i) => {
    const id = it.id || legacyId(i);
    const parent =
      it.parent_iteration_id !== undefined
        ? it.parent_iteration_id
        : i === 0
          ? null
          : loop.iterations[i - 1].id || legacyId(i - 1);
    const label = it.version_label || `v0.${i + 1}`;
    const summary =
      it.change_summary ||
      (it.issues_to_address && it.issues_to_address.length > 0
        ? it.issues_to_address.slice(0, 2).join(', ').slice(0, 60)
        : `반복 ${it.iteration_number}`);
    return { ...it, id, parent_iteration_id: parent, version_label: label, change_summary: summary };
  });

  const activeId =
    loop.active_iteration_id !== undefined
      ? loop.active_iteration_id
      : migrated.length > 0
        ? migrated[migrated.length - 1].id || null
        : null;

  return { ...loop, iterations: migrated, active_iteration_id: activeId };
}

function migrateAll(loops: RefineLoop[]): RefineLoop[] {
  return loops.map(migrateLoop);
}

// ─── Tree helpers ───────────────────────────────────────────
function findById(loop: RefineLoop, id: string | null | undefined): RefineIteration | undefined {
  if (!id) return undefined;
  return loop.iterations.find((it) => it.id === id);
}

function childrenOf(loop: RefineLoop, parentId: string | null): RefineIteration[] {
  return loop.iterations.filter((it) => (it.parent_iteration_id ?? null) === parentId);
}

/**
 * Walk from the active leaf up to root, returning the path in root-first order.
 * Falls back to the last iteration in the flat array if active_iteration_id is
 * stale or unset.
 */
export function getActivePathFromLoop(loop: RefineLoop): RefineIteration[] {
  if (loop.iterations.length === 0) return [];
  const leafId =
    loop.active_iteration_id ??
    loop.iterations[loop.iterations.length - 1].id ??
    null;
  if (!leafId) return [];
  const byId = new Map<string, RefineIteration>();
  for (const it of loop.iterations) if (it.id) byId.set(it.id, it);
  let cur = byId.get(leafId);
  // Stale active id → fall back to last iteration.
  if (!cur) cur = loop.iterations[loop.iterations.length - 1];
  const path: RefineIteration[] = [];
  const guard = new Set<string>();
  while (cur && cur.id && !guard.has(cur.id)) {
    guard.add(cur.id);
    path.unshift(cur);
    const parentId = cur.parent_iteration_id;
    if (!parentId) break;
    cur = byId.get(parentId);
  }
  return path;
}

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
  /**
   * Append a new iteration as a child of `parentId` (null = direct child of
   * the original_plan root). Returns the new iteration's id. The new node
   * automatically becomes the active_iteration_id.
   */
  addIteration: (
    loopId: string,
    parentId: string | null,
    iteration: Omit<RefineIteration, 'created_at' | 'id' | 'parent_iteration_id' | 'version_label'>,
  ) => string | null;
  setActiveIteration: (loopId: string, iterationId: string | null) => void;
  promoteToV1: (loopId: string, iterationId: string) => void;
  getActivePath: (loopId: string) => RefineIteration[];
  getLoopsByProject: (projectId: string) => RefineLoop[];
  checkConvergence: (loopId: string) => ReturnType<typeof checkLoopConvergence>;
}

export const useRefineStore = create<RefineState>((set, get) => ({
  loops: [],
  activeLoopId: null,

  loadLoops: () =>
    loadItems(
      KEY,
      TABLE,
      () => get().loops,
      (loops) => {
        // active_iteration_id is a local-only transient (stripped by
        // sanitizeItem before upsert). When a background Supabase merge
        // replaces a loop, restore the user's currently-selected branch
        // so mid-session merges don't yank them off the chosen iteration.
        const prev = new Map(get().loops.map((l) => [l.id, l.active_iteration_id]));
        const preserved = loops.map((l) => {
          if (l.active_iteration_id !== undefined) return l;
          const carry = prev.get(l.id);
          return carry !== undefined ? { ...l, active_iteration_id: carry } : l;
        });
        set({ loops: migrateAll(preserved) });
      },
    ),

  createLoop: (params) => {
    const now = new Date().toISOString();
    return addNewItem(
      KEY,
      TABLE,
      () => get().loops,
      (loops, id) => set({ loops, activeLoopId: id }),
      {
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
        active_iteration_id: null,
        created_at: now,
        updated_at: now,
      },
    );
  },

  updateLoop: (id, data) => updateItem(KEY, TABLE, () => get().loops, (loops) => set({ loops }), id, data),
  deleteLoop: (id) =>
    deleteItem(
      KEY,
      TABLE,
      () => get().loops,
      (loops) => set({ loops }),
      () => get().activeLoopId,
      (aid) => set({ activeLoopId: aid }),
      id,
    ),
  setActiveLoopId: (id) => set({ activeLoopId: id }),
  getActiveLoop: () => get().loops.find((l) => l.id === get().activeLoopId),

  addIteration: (loopId, parentId, iteration) => {
    const loop = get().loops.find((l) => l.id === loopId);
    if (!loop) return null;
    const parentLabel = parentId ? findById(loop, parentId)?.version_label || ROOT_LABEL : ROOT_LABEL;
    const siblingLabels = childrenOf(loop, parentId)
      .map((c) => c.version_label)
      .filter((l): l is string => !!l);
    const newLabel = nextChildLabel(parentLabel, siblingLabels);
    const newId = generateId();
    const newNode: RefineIteration = {
      ...iteration,
      id: newId,
      parent_iteration_id: parentId,
      version_label: newLabel,
      created_at: new Date().toISOString(),
    };
    updateNestedField(
      KEY,
      TABLE,
      () => get().loops,
      (loops) => set({ loops }),
      loopId,
      (l) => ({ ...l, iterations: [...l.iterations, newNode], active_iteration_id: newId }),
    );
    return newId;
  },

  setActiveIteration: (loopId, iterationId) =>
    updateNestedField(
      KEY,
      TABLE,
      () => get().loops,
      (loops) => set({ loops }),
      loopId,
      (l) => ({ ...l, active_iteration_id: iterationId }),
    ),

  promoteToV1: (loopId, iterationId) =>
    updateNestedField(
      KEY,
      TABLE,
      () => get().loops,
      (loops) => set({ loops }),
      loopId,
      (l) => {
        const target = l.iterations.find((it) => it.id === iterationId);
        if (!target || !target.version_label) return l;
        const newLabel = promoteToMajor(target.version_label);
        return {
          ...l,
          iterations: l.iterations.map((it) =>
            it.id === iterationId ? { ...it, version_label: newLabel } : it,
          ),
        };
      },
    ),

  getActivePath: (loopId) => {
    const loop = get().loops.find((l) => l.id === loopId);
    if (!loop) return [];
    return getActivePathFromLoop(loop);
  },

  getLoopsByProject: (projectId) => get().loops.filter((l) => l.project_id === projectId),

  checkConvergence: (loopId) => {
    const loop = get().loops.find((l) => l.id === loopId);
    if (!loop)
      return {
        converged: false,
        critical_remaining: -1,
        approval_met: 0,
        approval_total: 0,
        total_issues: -1,
        issue_trend: [],
        guidance: 'Loop not found',
      };
    return checkLoopConvergence(loop, getActivePathFromLoop(loop));
  },
}));

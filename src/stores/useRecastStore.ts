import { create } from 'zustand';
import type { RecastItem, RecastStep } from '@/stores/types';
import { STORAGE_KEYS } from '@/lib/storage';
import { generateId, loadItems, addNewItem, addItemIfNew, updateItem, deleteItem, updateNestedField } from './createItemStore';

const TABLE = 'recast_items' as const;
const KEY = STORAGE_KEYS.RECAST_LIST;

interface RecastState {
  items: RecastItem[];
  currentId: string | null;
  loadItems: () => void;
  createItem: () => string;
  addItem: (item: RecastItem) => void;
  updateItem: (id: string, data: Partial<RecastItem>) => void;
  deleteItem: (id: string) => void;
  setCurrentId: (id: string | null) => void;
  getCurrentItem: () => RecastItem | undefined;
  updateStep: (id: string, stepIndex: number, data: Partial<RecastStep>) => void;
  removeStep: (id: string, stepIndex: number) => void;
  addStep: (id: string) => void;
  reorderSteps: (id: string, fromIndex: number, toIndex: number) => void;
}

export const useRecastStore = create<RecastState>((set, get) => ({
  items: [],
  currentId: null,

  loadItems: () => loadItems(KEY, TABLE, () => get().items, (items) => set({ items })),

  createItem: () => {
    const now = new Date().toISOString();
    return addNewItem(KEY, TABLE, () => get().items, (items, id) => set({ items, currentId: id }), {
      id: generateId(), input_text: '', analysis: null, steps: [],
      status: 'input', created_at: now, updated_at: now,
    });
  },

  addItem: (item) => addItemIfNew(KEY, TABLE, () => get().items, (items, id) => set({ items, currentId: id }), item),
  updateItem: (id, data) => updateItem(KEY, TABLE, () => get().items, (items) => set({ items }), id, data),
  deleteItem: (id) => deleteItem(KEY, TABLE, () => get().items, (items) => set({ items }), () => get().currentId, (cid) => set({ currentId: cid }), id),
  setCurrentId: (id) => set({ currentId: id }),
  getCurrentItem: () => get().items.find((item) => item.id === get().currentId),

  updateStep: (id, stepIndex, data) =>
    updateNestedField(KEY, TABLE, () => get().items, (items) => set({ items }), id, (item) => ({
      ...item, steps: item.steps.map((step, i) => (i === stepIndex ? { ...step, ...data } : step)),
    })),

  removeStep: (id, stepIndex) =>
    updateNestedField(KEY, TABLE, () => get().items, (items) => set({ items }), id, (item) => ({
      ...item, steps: item.steps.filter((_, i) => i !== stepIndex),
    })),

  addStep: (id) =>
    updateNestedField(KEY, TABLE, () => get().items, (items) => set({ items }), id, (item) => ({
      ...item, steps: [...item.steps, { task: '', actor: 'ai' as const, actor_reasoning: '', expected_output: '', checkpoint: false, checkpoint_reason: '' }],
    })),

  reorderSteps: (id, fromIndex, toIndex) =>
    updateNestedField(KEY, TABLE, () => get().items, (items) => set({ items }), id, (item) => {
      const steps = [...item.steps];
      if (fromIndex < 0 || fromIndex >= steps.length || toIndex < 0 || toIndex >= steps.length) return item;
      const [moved] = steps.splice(fromIndex, 1);
      steps.splice(toIndex, 0, moved);
      return { ...item, steps };
    }),
}));

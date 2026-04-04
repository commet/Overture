import { create } from 'zustand';
import type { RecastItem, RecastStep } from '@/stores/types';
import { getStorage, setStorage, STORAGE_KEYS } from '@/lib/storage';
import { generateId } from '@/lib/uuid';
import { upsertToSupabase, deleteFromSupabase, loadAndMerge } from '@/lib/db';

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

  loadItems: () => {
    const local = getStorage<RecastItem[]>(STORAGE_KEYS.RECAST_LIST, []);
    set({ items: local });
    loadAndMerge<RecastItem>('recast_items', STORAGE_KEYS.RECAST_LIST)
      .then((merged) => set({ items: merged }));
  },

  createItem: () => {
    const now = new Date().toISOString();
    const newItem: RecastItem = {
      id: generateId(),
      input_text: '',
      analysis: null,
      steps: [],
      status: 'input',
      created_at: now,
      updated_at: now,
    };
    const items = [...get().items, newItem];
    set({ items, currentId: newItem.id });
    setStorage(STORAGE_KEYS.RECAST_LIST, items);
    upsertToSupabase('recast_items', newItem);
    return newItem.id;
  },

  addItem: (item) => {
    if (get().items.some(i => i.id === item.id)) return;
    const items = [...get().items, item];
    set({ items, currentId: item.id });
    setStorage(STORAGE_KEYS.RECAST_LIST, items);
    upsertToSupabase('recast_items', item);
  },

  updateItem: (id, data) => {
    const items = get().items.map((item) =>
      item.id === id ? { ...item, ...data, updated_at: new Date().toISOString() } : item
    );
    set({ items });
    setStorage(STORAGE_KEYS.RECAST_LIST, items);
    const updated = get().items.find(i => i.id === id);
    if (updated) upsertToSupabase('recast_items', updated);
  },

  deleteItem: (id) => {
    const items = get().items.filter((item) => item.id !== id);
    const currentId = get().currentId === id ? null : get().currentId;
    set({ items, currentId });
    setStorage(STORAGE_KEYS.RECAST_LIST, items);
    deleteFromSupabase('recast_items', id);
  },

  setCurrentId: (id) => set({ currentId: id }),

  getCurrentItem: () => {
    const { items, currentId } = get();
    return items.find((item) => item.id === currentId);
  },

  updateStep: (id, stepIndex, data) => {
    const items = get().items.map((item) => {
      if (item.id !== id) return item;
      const steps = item.steps.map((step, i) => (i === stepIndex ? { ...step, ...data } : step));
      return { ...item, steps, updated_at: new Date().toISOString() };
    });
    set({ items });
    setStorage(STORAGE_KEYS.RECAST_LIST, items);
    const updated = get().items.find(i => i.id === id);
    if (updated) upsertToSupabase('recast_items', updated);
  },

  removeStep: (id, stepIndex) => {
    const items = get().items.map((item) => {
      if (item.id !== id) return item;
      return { ...item, steps: item.steps.filter((_, i) => i !== stepIndex), updated_at: new Date().toISOString() };
    });
    set({ items });
    setStorage(STORAGE_KEYS.RECAST_LIST, items);
    const updated = get().items.find(i => i.id === id);
    if (updated) upsertToSupabase('recast_items', updated);
  },

  addStep: (id) => {
    const items = get().items.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        steps: [...item.steps, { task: '', actor: 'ai' as const, actor_reasoning: '', expected_output: '', checkpoint: false, checkpoint_reason: '' }],
        updated_at: new Date().toISOString(),
      };
    });
    set({ items });
    setStorage(STORAGE_KEYS.RECAST_LIST, items);
    const updated = get().items.find(i => i.id === id);
    if (updated) upsertToSupabase('recast_items', updated);
  },

  reorderSteps: (id, fromIndex, toIndex) => {
    const items = get().items.map((item) => {
      if (item.id !== id) return item;
      const steps = [...item.steps];
      const [moved] = steps.splice(fromIndex, 1);
      steps.splice(toIndex, 0, moved);
      return { ...item, steps, updated_at: new Date().toISOString() };
    });
    set({ items });
    setStorage(STORAGE_KEYS.RECAST_LIST, items);
    const updated = get().items.find(i => i.id === id);
    if (updated) upsertToSupabase('recast_items', updated);
  },
}));

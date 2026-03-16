import { create } from 'zustand';
import type { OrchestrateItem, OrchestrateStep } from '@/stores/types';
import { getStorage, setStorage, STORAGE_KEYS } from '@/lib/storage';
import { generateId } from '@/lib/uuid';

interface OrchestrateState {
  items: OrchestrateItem[];
  currentId: string | null;
  loadItems: () => void;
  createItem: () => string;
  updateItem: (id: string, data: Partial<OrchestrateItem>) => void;
  deleteItem: (id: string) => void;
  setCurrentId: (id: string | null) => void;
  getCurrentItem: () => OrchestrateItem | undefined;
  updateStep: (id: string, stepIndex: number, data: Partial<OrchestrateStep>) => void;
  removeStep: (id: string, stepIndex: number) => void;
  addStep: (id: string) => void;
  reorderSteps: (id: string, fromIndex: number, toIndex: number) => void;
}

export const useOrchestrateStore = create<OrchestrateState>((set, get) => ({
  items: [],
  currentId: null,

  loadItems: () => {
    const items = getStorage<OrchestrateItem[]>(STORAGE_KEYS.ORCHESTRATE_LIST, []);
    set({ items });
  },

  createItem: () => {
    const now = new Date().toISOString();
    const newItem: OrchestrateItem = {
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
    setStorage(STORAGE_KEYS.ORCHESTRATE_LIST, items);
    return newItem.id;
  },

  updateItem: (id, data) => {
    const items = get().items.map((item) =>
      item.id === id ? { ...item, ...data, updated_at: new Date().toISOString() } : item
    );
    set({ items });
    setStorage(STORAGE_KEYS.ORCHESTRATE_LIST, items);
  },

  deleteItem: (id) => {
    const items = get().items.filter((item) => item.id !== id);
    const currentId = get().currentId === id ? null : get().currentId;
    set({ items, currentId });
    setStorage(STORAGE_KEYS.ORCHESTRATE_LIST, items);
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
    setStorage(STORAGE_KEYS.ORCHESTRATE_LIST, items);
  },

  removeStep: (id, stepIndex) => {
    const items = get().items.map((item) => {
      if (item.id !== id) return item;
      return { ...item, steps: item.steps.filter((_, i) => i !== stepIndex), updated_at: new Date().toISOString() };
    });
    set({ items });
    setStorage(STORAGE_KEYS.ORCHESTRATE_LIST, items);
  },

  addStep: (id) => {
    const items = get().items.map((item) => {
      if (item.id !== id) return item;
      return {
        ...item,
        steps: [...item.steps, { task: '', actor: 'ai' as const, actor_reasoning: '', checkpoint: false, checkpoint_reason: '' }],
        updated_at: new Date().toISOString(),
      };
    });
    set({ items });
    setStorage(STORAGE_KEYS.ORCHESTRATE_LIST, items);
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
    setStorage(STORAGE_KEYS.ORCHESTRATE_LIST, items);
  },
}));

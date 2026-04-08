import { create } from 'zustand';
import type { SynthesizeItem } from '@/stores/types';
import { STORAGE_KEYS } from '@/lib/storage';
import { generateId, loadItems, addNewItem, updateItem, deleteItem } from './createItemStore';

const TABLE = 'synthesize_items' as const;
const KEY = STORAGE_KEYS.SYNTHESIZE_LIST;

interface SynthesizeState {
  items: SynthesizeItem[];
  currentId: string | null;
  loadItems: () => void;
  createItem: () => string;
  updateItem: (id: string, data: Partial<SynthesizeItem>) => void;
  deleteItem: (id: string) => void;
  setCurrentId: (id: string | null) => void;
  getCurrentItem: () => SynthesizeItem | undefined;
}

export const useSynthesizeStore = create<SynthesizeState>((set, get) => ({
  items: [],
  currentId: null,

  loadItems: () => loadItems(KEY, TABLE, () => get().items, (items) => set({ items })),

  createItem: () => {
    const now = new Date().toISOString();
    return addNewItem(KEY, TABLE, () => get().items, (items, id) => set({ items, currentId: id }), {
      id: generateId(), raw_input: '', sources: [], analysis: null,
      final_synthesis: '', status: 'input', created_at: now, updated_at: now,
    });
  },

  updateItem: (id, data) => updateItem(KEY, TABLE, () => get().items, (items) => set({ items }), id, data),
  deleteItem: (id) => deleteItem(KEY, TABLE, () => get().items, (items) => set({ items }), () => get().currentId, (cid) => set({ currentId: cid }), id),
  setCurrentId: (id) => set({ currentId: id }),
  getCurrentItem: () => get().items.find((item) => item.id === get().currentId),
}));

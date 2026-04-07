import { create } from 'zustand';
import type { SynthesizeItem } from '@/stores/types';
import { getStorage, setStorage, STORAGE_KEYS } from '@/lib/storage';
import { generateId } from '@/lib/uuid';
import { upsertToSupabase, softDeleteFromSupabase, loadAndMerge } from '@/lib/db';

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

  loadItems: () => {
    const local = getStorage<SynthesizeItem[]>(STORAGE_KEYS.SYNTHESIZE_LIST, []);
    set({ items: local });
    loadAndMerge<SynthesizeItem>('synthesize_items', STORAGE_KEYS.SYNTHESIZE_LIST)
      .then((merged) => {
        const current = get().items;
        const newLocal = current.filter(c => !merged.find(m => m.id === c.id));
        set({ items: [...merged, ...newLocal] });
      });
  },

  createItem: () => {
    const now = new Date().toISOString();
    const newItem: SynthesizeItem = {
      id: generateId(),
      raw_input: '',
      sources: [],
      analysis: null,
      final_synthesis: '',
      status: 'input',
      created_at: now,
      updated_at: now,
    };
    const items = [...get().items, newItem];
    set({ items, currentId: newItem.id });
    setStorage(STORAGE_KEYS.SYNTHESIZE_LIST, items);
    upsertToSupabase('synthesize_items', newItem);
    return newItem.id;
  },

  updateItem: (id, data) => {
    const items = get().items.map((item) =>
      item.id === id ? { ...item, ...data, updated_at: new Date().toISOString() } : item
    );
    set({ items });
    setStorage(STORAGE_KEYS.SYNTHESIZE_LIST, items);
    const updated = get().items.find(i => i.id === id);
    if (updated) upsertToSupabase('synthesize_items', updated);
  },

  deleteItem: (id) => {
    const items = get().items.filter((item) => item.id !== id);
    const currentId = get().currentId === id ? null : get().currentId;
    set({ items, currentId });
    setStorage(STORAGE_KEYS.SYNTHESIZE_LIST, items);
    softDeleteFromSupabase('synthesize_items', id);
  },

  setCurrentId: (id) => set({ currentId: id }),

  getCurrentItem: () => {
    const { items, currentId } = get();
    return items.find((item) => item.id === currentId);
  },
}));

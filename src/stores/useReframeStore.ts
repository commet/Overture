import { create } from 'zustand';
import type { ReframeItem } from '@/stores/types';
import { getStorage, setStorage, STORAGE_KEYS } from '@/lib/storage';
import { generateId } from '@/lib/uuid';
import { upsertToSupabase, deleteFromSupabase, loadAndMerge } from '@/lib/db';

interface ReframeState {
  items: ReframeItem[];
  currentId: string | null;
  loadItems: () => void;
  createItem: (inputText: string) => string;
  updateItem: (id: string, data: Partial<ReframeItem>) => void;
  deleteItem: (id: string) => void;
  setCurrentId: (id: string | null) => void;
  getCurrentItem: () => ReframeItem | undefined;
}

export const useReframeStore = create<ReframeState>((set, get) => ({
  items: [],
  currentId: null,

  loadItems: () => {
    // Instant: load from localStorage
    const local = getStorage<ReframeItem[]>(STORAGE_KEYS.REFRAME_LIST, []);
    set({ items: local });
    // Background: merge with Supabase (fetches remote + merges + saves)
    loadAndMerge<ReframeItem>('reframe_items', STORAGE_KEYS.REFRAME_LIST)
      .then((merged) => set({ items: merged }));
  },

  createItem: (inputText: string) => {
    const now = new Date().toISOString();
    const newItem: ReframeItem = {
      id: generateId(),
      input_text: inputText,
      analysis: null,
      selected_question: '',
      final_decomposition: [],
      status: 'input',
      created_at: now,
      updated_at: now,
    };
    const items = [...get().items, newItem];
    set({ items, currentId: newItem.id });
    setStorage(STORAGE_KEYS.REFRAME_LIST, items);
    upsertToSupabase('reframe_items', newItem);
    return newItem.id;
  },

  updateItem: (id, data) => {
    const items = get().items.map((item) =>
      item.id === id ? { ...item, ...data, updated_at: new Date().toISOString() } : item
    );
    set({ items });
    setStorage(STORAGE_KEYS.REFRAME_LIST, items);
    const updated = get().items.find(i => i.id === id);
    if (updated) upsertToSupabase('reframe_items', updated);
  },

  deleteItem: (id) => {
    const items = get().items.filter((item) => item.id !== id);
    const currentId = get().currentId === id ? null : get().currentId;
    set({ items, currentId });
    setStorage(STORAGE_KEYS.REFRAME_LIST, items);
    deleteFromSupabase('reframe_items', id);
  },

  setCurrentId: (id) => set({ currentId: id }),

  getCurrentItem: () => {
    const { items, currentId } = get();
    return items.find((item) => item.id === currentId);
  },
}));

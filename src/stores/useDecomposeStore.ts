import { create } from 'zustand';
import type { DecomposeItem, DecomposeSubtask } from '@/stores/types';
import { getStorage, setStorage, STORAGE_KEYS } from '@/lib/storage';
import { generateId } from '@/lib/uuid';

interface DecomposeState {
  items: DecomposeItem[];
  currentId: string | null;
  loadItems: () => void;
  createItem: (inputText: string) => string;
  updateItem: (id: string, data: Partial<DecomposeItem>) => void;
  deleteItem: (id: string) => void;
  setCurrentId: (id: string | null) => void;
  getCurrentItem: () => DecomposeItem | undefined;
}

export const useDecomposeStore = create<DecomposeState>((set, get) => ({
  items: [],
  currentId: null,

  loadItems: () => {
    const items = getStorage<DecomposeItem[]>(STORAGE_KEYS.DECOMPOSE_LIST, []);
    set({ items });
  },

  createItem: (inputText: string) => {
    const now = new Date().toISOString();
    const newItem: DecomposeItem = {
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
    setStorage(STORAGE_KEYS.DECOMPOSE_LIST, items);
    return newItem.id;
  },

  updateItem: (id, data) => {
    const items = get().items.map((item) =>
      item.id === id ? { ...item, ...data, updated_at: new Date().toISOString() } : item
    );
    set({ items });
    setStorage(STORAGE_KEYS.DECOMPOSE_LIST, items);
  },

  deleteItem: (id) => {
    const items = get().items.filter((item) => item.id !== id);
    const currentId = get().currentId === id ? null : get().currentId;
    set({ items, currentId });
    setStorage(STORAGE_KEYS.DECOMPOSE_LIST, items);
  },

  setCurrentId: (id) => set({ currentId: id }),

  getCurrentItem: () => {
    const { items, currentId } = get();
    return items.find((item) => item.id === currentId);
  },
}));

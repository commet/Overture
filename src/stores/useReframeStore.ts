import { create } from 'zustand';
import type { ReframeItem } from '@/stores/types';
import { STORAGE_KEYS } from '@/lib/storage';
import { generateId, loadItems, addNewItem, addItemIfNew, updateItem, deleteItem } from './createItemStore';

const TABLE = 'reframe_items' as const;
const KEY = STORAGE_KEYS.REFRAME_LIST;

interface ReframeState {
  items: ReframeItem[];
  currentId: string | null;
  loadItems: () => void;
  createItem: (inputText: string) => string;
  addItem: (item: ReframeItem) => void;
  updateItem: (id: string, data: Partial<ReframeItem>) => void;
  deleteItem: (id: string) => void;
  setCurrentId: (id: string | null) => void;
  getCurrentItem: () => ReframeItem | undefined;
}

export const useReframeStore = create<ReframeState>((set, get) => ({
  items: [],
  currentId: null,

  loadItems: () => loadItems(KEY, TABLE, () => get().items, (items) => set({ items })),

  createItem: (inputText: string) => {
    const now = new Date().toISOString();
    return addNewItem(KEY, TABLE, () => get().items, (items, id) => set({ items, currentId: id }), {
      id: generateId(), input_text: inputText, analysis: null,
      selected_question: '', final_decomposition: [], status: 'input',
      created_at: now, updated_at: now,
    });
  },

  addItem: (item) => addItemIfNew(KEY, TABLE, () => get().items, (items, id) => set({ items, currentId: id }), item),
  updateItem: (id, data) => updateItem(KEY, TABLE, () => get().items, (items) => set({ items }), id, data),
  deleteItem: (id) => deleteItem(KEY, TABLE, () => get().items, (items) => set({ items }), () => get().currentId, (cid) => set({ currentId: cid }), id),
  setCurrentId: (id) => set({ currentId: id }),
  getCurrentItem: () => get().items.find((item) => item.id === get().currentId),
}));

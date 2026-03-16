import { create } from 'zustand';
import type { Handoff } from '@/stores/types';

interface HandoffState {
  handoff: Handoff | null;
  setHandoff: (handoff: Handoff) => void;
  clearHandoff: () => void;
}

export const useHandoffStore = create<HandoffState>((set) => ({
  handoff: null,
  setHandoff: (handoff) => set({ handoff }),
  clearHandoff: () => set({ handoff: null }),
}));

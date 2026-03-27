import { create } from 'zustand';
import type { Handoff } from '@/stores/types';
import { track } from '@/lib/analytics';

interface HandoffState {
  handoff: Handoff | null;
  setHandoff: (handoff: Handoff) => void;
  clearHandoff: () => void;
}

const STEP_MAP: Record<string, string> = {
  'reframe': '악보 해석',
  'recast': '편곡',
  'rehearse': '리허설',
  'refine': '합주 연습',
};

export const useHandoffStore = create<HandoffState>((set) => ({
  handoff: null,
  setHandoff: (handoff) => {
    track('step_transition', { from: handoff.from, from_label: STEP_MAP[handoff.from] || handoff.from });
    set({ handoff });
  },
  clearHandoff: () => set({ handoff: null }),
}));

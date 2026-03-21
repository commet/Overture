import { create } from 'zustand';
import type { Handoff } from '@/stores/types';
import { track } from '@/lib/analytics';

interface HandoffState {
  handoff: Handoff | null;
  setHandoff: (handoff: Handoff) => void;
  clearHandoff: () => void;
}

const STEP_MAP: Record<string, string> = {
  'decompose': '악보 해석',
  'orchestrate': '편곡',
  'persona-feedback': '리허설',
  'refinement-loop': '합주 연습',
};

export const useHandoffStore = create<HandoffState>((set) => ({
  handoff: null,
  setHandoff: (handoff) => {
    track('step_transition', { from: handoff.from, from_label: STEP_MAP[handoff.from] || handoff.from });
    set({ handoff });
  },
  clearHandoff: () => set({ handoff: null }),
}));

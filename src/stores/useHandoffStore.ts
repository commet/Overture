import { create } from 'zustand';
import type { Handoff } from '@/stores/types';
import { track } from '@/lib/analytics';

interface HandoffState {
  handoff: Handoff | null;
  setHandoff: (handoff: Handoff) => void;
  clearHandoff: () => void;
}

const STEP_MAP: Record<string, string> = {
  'reframe': 'Score Reading',
  'recast': 'Arrangement',
  'rehearse': 'Rehearsal',
  'refine': 'Ensemble Practice',
  'synthesize': 'Synthesis',
};

export const useHandoffStore = create<HandoffState>((set) => ({
  handoff: null,
  setHandoff: (handoff) => {
    track('step_transition', { from: handoff.from, from_label: STEP_MAP[handoff.from] || handoff.from });
    set({ handoff });
  },
  clearHandoff: () => set({ handoff: null }),
}));

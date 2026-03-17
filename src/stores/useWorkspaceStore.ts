import { create } from 'zustand';

export type StepId = 'decompose' | 'orchestrate' | 'persona-feedback' | 'refinement-loop';

interface WorkspaceState {
  activeStep: StepId;
  sidebarOpen: boolean;
  setActiveStep: (step: StepId) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeStep: 'decompose',
  sidebarOpen: true,
  setActiveStep: (step) => set({ activeStep: step }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));

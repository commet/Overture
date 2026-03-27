import { create } from 'zustand';

export type StepId = 'reframe' | 'recast' | 'rehearse' | 'refine';

interface WorkspaceState {
  activeStep: StepId;
  sidebarOpen: boolean;
  concertmasterOpen: boolean;
  setActiveStep: (step: StepId) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleConcertmaster: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeStep: 'reframe',
  sidebarOpen: true,
  concertmasterOpen: false,
  setActiveStep: (step) => set({ activeStep: step }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleConcertmaster: () => set((s) => ({ concertmasterOpen: !s.concertmasterOpen })),
}));

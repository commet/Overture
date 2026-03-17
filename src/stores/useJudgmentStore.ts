import { create } from 'zustand';
import type { JudgmentRecord } from '@/stores/types';
import { getStorage, setStorage, STORAGE_KEYS } from '@/lib/storage';
import { generateId } from '@/lib/uuid';
import { insertToSupabase, syncToSupabase } from '@/lib/db';

interface JudgmentState {
  judgments: JudgmentRecord[];
  loadJudgments: () => void;
  addJudgment: (data: Omit<JudgmentRecord, 'id' | 'created_at'>) => void;
  getJudgmentsByProject: (projectId: string) => JudgmentRecord[];
  getJudgmentsByType: (type: JudgmentRecord['type']) => JudgmentRecord[];
  getRecentJudgments: (limit?: number) => JudgmentRecord[];
  getUserPatterns: () => {
    totalJudgments: number;
    overrideRate: number;
    preferredActors: Record<string, number>;
    commonThemes: string[];
  };
}

export const useJudgmentStore = create<JudgmentState>((set, get) => ({
  judgments: [],

  loadJudgments: () => {
    const judgments = getStorage<JudgmentRecord[]>(STORAGE_KEYS.JUDGMENTS, []);
    set({ judgments });
    // Background sync to Supabase
    syncToSupabase('judgment_records', judgments);
  },

  addJudgment: (data) => {
    const judgment: JudgmentRecord = {
      ...data,
      id: generateId(),
      created_at: new Date().toISOString(),
    };
    const judgments = [...get().judgments, judgment];
    set({ judgments });
    setStorage(STORAGE_KEYS.JUDGMENTS, judgments);
    insertToSupabase('judgment_records', judgment);
  },

  getJudgmentsByProject: (projectId) =>
    get().judgments.filter((j) => j.project_id === projectId),

  getJudgmentsByType: (type) =>
    get().judgments.filter((j) => j.type === type),

  getRecentJudgments: (limit = 10) =>
    get().judgments.slice(-limit),

  getUserPatterns: () => {
    const judgments = get().judgments;
    const overrides = judgments.filter((j) => j.user_changed);
    const actorOverrides = judgments.filter((j) => j.type === 'actor_override');
    const actorCounts: Record<string, number> = {};
    actorOverrides.forEach((j) => {
      actorCounts[j.decision] = (actorCounts[j.decision] || 0) + 1;
    });

    return {
      totalJudgments: judgments.length,
      overrideRate: judgments.length > 0 ? overrides.length / judgments.length : 0,
      preferredActors: actorCounts,
      commonThemes: [],
    };
  },
}));

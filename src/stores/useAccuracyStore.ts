import { create } from 'zustand';
import type { PersonaAccuracyRating } from '@/stores/types';
import { getStorage, setStorage, STORAGE_KEYS } from '@/lib/storage';
import { generateId } from '@/lib/uuid';

interface AccuracyState {
  ratings: PersonaAccuracyRating[];
  loadRatings: () => void;
  addRating: (data: Omit<PersonaAccuracyRating, 'id' | 'created_at'>) => void;
  getRatingsByPersona: (personaId: string) => PersonaAccuracyRating[];
  getPersonaAccuracySummary: (personaId: string) => {
    averageScore: number;
    totalRatings: number;
    bestAspects: string[];
    worstAspects: string[];
  };
}

export const useAccuracyStore = create<AccuracyState>((set, get) => ({
  ratings: [],

  loadRatings: () => {
    const ratings = getStorage<PersonaAccuracyRating[]>(STORAGE_KEYS.ACCURACY_RATINGS, []);
    set({ ratings });
  },

  addRating: (data) => {
    const rating: PersonaAccuracyRating = {
      ...data,
      id: generateId(),
      created_at: new Date().toISOString(),
    };
    const ratings = [...get().ratings, rating];
    set({ ratings });
    setStorage(STORAGE_KEYS.ACCURACY_RATINGS, ratings);
  },

  getRatingsByPersona: (personaId) =>
    get().ratings.filter((r) => r.persona_id === personaId),

  getPersonaAccuracySummary: (personaId) => {
    const ratings = get().ratings.filter((r) => r.persona_id === personaId);
    if (ratings.length === 0) {
      return { averageScore: 0, totalRatings: 0, bestAspects: [], worstAspects: [] };
    }

    const avg = ratings.reduce((sum, r) => sum + r.accuracy_score, 0) / ratings.length;

    const aspectCounts: Record<string, { accurate: number; inaccurate: number }> = {};
    for (const r of ratings) {
      for (const a of r.which_aspects_accurate) {
        if (!aspectCounts[a]) aspectCounts[a] = { accurate: 0, inaccurate: 0 };
        aspectCounts[a].accurate++;
      }
      for (const a of r.which_aspects_inaccurate) {
        if (!aspectCounts[a]) aspectCounts[a] = { accurate: 0, inaccurate: 0 };
        aspectCounts[a].inaccurate++;
      }
    }

    const sorted = Object.entries(aspectCounts).sort(
      ([, a], [, b]) => (b.accurate - b.inaccurate) - (a.accurate - a.inaccurate)
    );

    return {
      averageScore: Math.round(avg * 10) / 10,
      totalRatings: ratings.length,
      bestAspects: sorted.filter(([, v]) => v.accurate > v.inaccurate).map(([k]) => k).slice(0, 3),
      worstAspects: sorted.filter(([, v]) => v.inaccurate >= v.accurate).map(([k]) => k).slice(0, 3),
    };
  },
}));

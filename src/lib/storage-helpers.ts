import { getStorage, STORAGE_KEYS } from '@/lib/storage';
import type { ReframeItem, RecastItem, SynthesizeItem, Project, JudgmentRecord, PersonaAccuracyRating, FeedbackRecord, DecisionQualityScore, VitalityAssessment } from '@/stores/types';

/**
 * Typed data accessors — single source of truth for reading from localStorage.
 *
 * Benefits:
 * - Type is bound to the storage key (no mismatched generics)
 * - Consistent empty-array fallback
 * - Common filters (done items, latest done, by project) in one place
 */

type HasStatus = { status: string; created_at: string };

/** Get the latest "done" item, sorted by created_at (guaranteed chronological). */
export function getLatestDone<T extends HasStatus>(items: T[]): T | undefined {
  return [...items]
    .filter((d) => d.status === 'done')
    .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
    .pop();
}

/** Get all "done" items, sorted by created_at. */
export function getDoneItems<T extends HasStatus>(items: T[]): T[] {
  return items
    .filter((d) => d.status === 'done')
    .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
}

/** Typed data readers — eliminates getStorage<Type>(KEY, []) boilerplate. */
export const data = {
  reframeItems: () => getStorage<ReframeItem[]>(STORAGE_KEYS.REFRAME_LIST, []),
  recastItems: () => getStorage<RecastItem[]>(STORAGE_KEYS.RECAST_LIST, []),
  synthesizeItems: () => getStorage<SynthesizeItem[]>(STORAGE_KEYS.SYNTHESIZE_LIST, []),
  projects: () => getStorage<Project[]>(STORAGE_KEYS.PROJECTS, []),
  judgments: () => getStorage<JudgmentRecord[]>(STORAGE_KEYS.JUDGMENTS, []),
  ratings: () => getStorage<PersonaAccuracyRating[]>(STORAGE_KEYS.ACCURACY_RATINGS, []),
  feedbacks: () => getStorage<FeedbackRecord[]>(STORAGE_KEYS.FEEDBACK_HISTORY, []),
  dqScores: () => getStorage<DecisionQualityScore[]>(STORAGE_KEYS.DQ_SCORES, []),
  vitalityAssessments: () => getStorage<VitalityAssessment[]>(STORAGE_KEYS.VITALITY_ASSESSMENTS, []),
};

export const STORAGE_KEYS = {
  DECOMPOSE_LIST: 'sot_decompose_list',
  SYNTHESIZE_LIST: 'sot_synthesize_list',
  ORCHESTRATE_LIST: 'sot_orchestrate_list',
  PERSONAS: 'sot_personas',
  FEEDBACK_HISTORY: 'sot_feedback_history',
  PROJECTS:          'sot_projects',
  JUDGMENTS:         'sot_judgments',
  REFINEMENT_LOOPS:  'sot_refinement_loops',
  ACCURACY_RATINGS:  'sot_accuracy_ratings',
  QUALITY_SIGNALS:   'sot_quality_signals',
  EVAL_ORCHESTRATE:  'overture_eval_orchestrate',
  EVAL_REHEARSAL:    'overture_eval_rehearsal',
  EVAL_REFINEMENT:   'overture_eval_refinement',
  OUTCOME_RECORDS:   'sot_outcome_records',
  RETROSPECTIVE_ANSWERS: 'sot_retrospective_answers',
  DQ_SCORES: 'sot_dq_scores',
  SETTINGS: 'sot_settings',
} as const;

export function getStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

export function setStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Use console directly to avoid circular dependency with logger
    if (typeof console !== 'undefined') console.error('[storage] localStorage write failed:', e);
  }
}

export function removeStorage(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

export function clearAllStorage(): void {
  if (typeof window === 'undefined') return;
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}

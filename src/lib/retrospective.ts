/**
 * Retrospective insights reader.
 *
 * The legacy RefineStep used `generateRetrospectiveQuestions(loop)` +
 * `saveRetrospectiveAnswer()` to collect structured reflection data at
 * convergence time. That UI is gone. What remains is the read-side surface
 * used by `context-builder.ts:buildEnhancedSystemPrompt` to enrich live
 * workspace prompts with past-project learnings.
 */

import type { RetrospectiveAnswer } from '@/stores/types';
import { getStorage, STORAGE_KEYS } from './storage';

export function getActionableInsights(excludeProjectId?: string): string[] {
  return getStorage<RetrospectiveAnswer[]>(STORAGE_KEYS.RETROSPECTIVE_ANSWERS, [])
    .filter((a) => a.project_id !== excludeProjectId)
    .filter((a) => a.category === 'process' || a.category === 'learning')
    .filter((a) => a.answer.length > 10)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5)
    .map((a) => a.answer);
}

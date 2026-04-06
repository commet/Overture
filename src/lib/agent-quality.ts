/**
 * agent-quality.ts — 품질 기반 XP 계산
 *
 * 기존 flat XP (approve=+10, reject=-5) 대신
 * 검증 점수에 따라 XP 배율을 적용한다.
 * LLM 호출 없음.
 */

import { XP_REWARDS } from '@/stores/agent-types';

/**
 * 검증 점수 기반 XP 배율 적용.
 * - score 90+: 1.5배 (exceptional)
 * - score 70-89: 1.0배 (standard)
 * - score 50-69: 0.5배 (mediocre)
 * - score <50: 0배 (placeholder-level)
 */
export function computeQualityXP(
  activityType: 'task_approved' | 'task_rejected' | 'task_completed',
  validationScore?: number,
): number {
  const baseXP = XP_REWARDS[activityType] || 0;

  // rejection은 배율 없이 그대로 패널티
  if (activityType === 'task_rejected') return baseXP;

  // 검증 점수 없으면 기본 1.0배
  if (validationScore === undefined) return baseXP;

  let multiplier = 1.0;
  if (validationScore >= 90) multiplier = 1.5;
  else if (validationScore >= 70) multiplier = 1.0;
  else if (validationScore >= 50) multiplier = 0.5;
  else multiplier = 0;

  return Math.round(baseXP * multiplier);
}

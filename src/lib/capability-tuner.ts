/**
 * capability-tuner.ts — AutoAgent 패턴 기반 자기개선
 *
 * 에이전트의 capability profile을 사용 데이터로 자동 조정.
 *
 * 원리 (AutoAgent hill-climbing):
 * - 에이전트가 특정 task type에서 hit rate가 높으면 → 그 역량 부스트
 * - 에이전트가 특정 task type에서 hit rate가 낮으면 → 그 역량 다운
 * - 변경은 점진적 (한 번에 ±0.1 이내)
 *
 * 코드가 아닌 데이터가 진화하는 구조:
 * - agent-capabilities.ts의 AGENT_CAPABILITIES는 기본값 (baseline)
 * - 이 모듈이 localStorage에 보정치를 저장
 * - scoreAgentForTask에서 기본값 + 보정치로 최종 점수 계산
 *
 * LLM 호출 없음. 결정론적.
 */

import { getStorage, setStorage } from '@/lib/storage';
import { getAgentHitRate } from './hit-rate';
import type { TaskType } from './task-classifier';

/* ─── Types ─── */

interface CapabilityAdjustment {
  agentId: string;
  taskType: TaskType;
  delta: number;        // -0.3 ~ +0.3 범위
  sampleCount: number;  // 이 조정의 근거가 된 데이터 수
  updatedAt: string;
}

/* ─── Storage ─── */

const STORAGE_KEY = 'sot_capability_adjustments';

function getAdjustments(): CapabilityAdjustment[] {
  return getStorage<CapabilityAdjustment[]>(STORAGE_KEY, []);
}

function saveAdjustments(adjustments: CapabilityAdjustment[]): void {
  setStorage(STORAGE_KEY, adjustments);
}

/* ─── Public API ─── */

/**
 * 에이전트 + task type에 대한 보정치를 반환.
 * 보정치가 없으면 0 (기본값 그대로 사용).
 */
export function getCapabilityDelta(agentId: string, taskType: TaskType): number {
  const adjustments = getAdjustments();
  const match = adjustments.find(a => a.agentId === agentId && a.taskType === taskType);
  return match?.delta ?? 0;
}

/**
 * 히트레이트 데이터를 기반으로 capability 보정치를 재계산.
 * 주기적으로 호출 (세션 종료 시 또는 10건 히트 반응 후).
 *
 * AutoAgent의 hill-climbing과 같은 원리:
 * - hit rate > 0.7 (10건+) → +0.1 부스트
 * - hit rate < 0.3 (10건+) → -0.1 다운
 * - hit rate 0.3~0.7 → 보정치 0으로 수렴 (decay)
 *
 * 최대 보정 범위: ±0.3
 */
export function recalibrateCapabilities(agentIds: string[], taskTypes: TaskType[]): void {
  const adjustments = getAdjustments();

  for (const agentId of agentIds) {
    for (const taskType of taskTypes) {
      const hitRate = getAgentHitRate(agentId, 20); // 최근 20건
      if (hitRate.total < 5) continue; // 데이터 부족하면 건너뜀

      const existing = adjustments.find(a => a.agentId === agentId && a.taskType === taskType);
      const currentDelta = existing?.delta ?? 0;

      let newDelta = currentDelta;

      if (hitRate.rate > 0.7) {
        // 이 에이전트가 이 task type에서 잘 하고 있음 → 부스트
        newDelta = Math.min(0.3, currentDelta + 0.05);
      } else if (hitRate.rate < 0.3) {
        // 잘 못 하고 있음 → 다운
        newDelta = Math.max(-0.3, currentDelta - 0.05);
      } else {
        // 중간 → 기본값으로 서서히 복귀 (decay)
        newDelta = currentDelta * 0.9; // 10%씩 감쇠
        if (Math.abs(newDelta) < 0.01) newDelta = 0;
      }

      // 변화가 있으면 저장
      if (newDelta !== currentDelta) {
        const updated: CapabilityAdjustment = {
          agentId,
          taskType,
          delta: Math.round(newDelta * 1000) / 1000,
          sampleCount: hitRate.total,
          updatedAt: new Date().toISOString(),
        };

        const idx = adjustments.findIndex(a => a.agentId === agentId && a.taskType === taskType);
        if (idx >= 0) adjustments[idx] = updated;
        else adjustments.push(updated);
      }
    }
  }

  saveAdjustments(adjustments);
}

/**
 * 모든 에이전트의 현재 보정 상태 요약.
 * 디버깅/대시보드용.
 */
export function getCapabilityTuningStatus(): Array<{
  agentId: string;
  taskType: string;
  delta: number;
  sampleCount: number;
}> {
  return getAdjustments()
    .filter(a => Math.abs(a.delta) > 0.01)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

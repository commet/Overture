/**
 * hit-rate.ts — 에이전트별 히트레이트 추적
 *
 * 사용자 반응 3종: 'hit' (몰랐다) / 'miss' (이미 알아) / 'irrelevant' (중요하지 않아)
 * 히트레이트는 orchestrator-select의 Pass 3에서 에이전트 선택 가중치에 반영.
 * localStorage 기반, Supabase 동기화는 추후.
 */

import { getStorage, setStorage } from '@/lib/storage';
import type { TaskType } from './task-classifier';

/* ─── Types ─── */

export interface HitRecord {
  id: string;
  agent_id: string;
  task_id: string;
  reaction: 'hit' | 'miss' | 'irrelevant';
  domain_tag?: string;
  created_at: string;
}

/* ─── Storage ─── */

const STORAGE_KEY = 'sot_hit_records';

function getRecords(): HitRecord[] {
  return getStorage<HitRecord[]>(STORAGE_KEY, []);
}

function saveRecords(records: HitRecord[]): void {
  setStorage(STORAGE_KEY, records);
}

/* ─── Public API ─── */

/**
 * 사용자 반응 기록.
 */
export function recordHitReaction(
  agentId: string,
  taskId: string,
  reaction: 'hit' | 'miss' | 'irrelevant',
  domainTag?: string,
): void {
  const records = getRecords();
  records.push({
    id: `hit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    agent_id: agentId,
    task_id: taskId,
    reaction,
    domain_tag: domainTag,
    created_at: new Date().toISOString(),
  });
  // 최근 200건만 유지 (메모리 관리)
  if (records.length > 200) records.splice(0, records.length - 200);
  saveRecords(records);

  // 자동 튜닝 트리거: 10건마다 capability 재보정
  const agentRecords = records.filter(r => r.agent_id === agentId);
  if (agentRecords.length % 10 === 0) {
    // 동적 import로 순환 참조 방지
    import('./capability-tuner').then(({ recalibrateCapabilities }) => {
      const allTaskTypes: TaskType[] = ['research', 'analysis', 'synthesis', 'strategy', 'calculation', 'writing', 'critique', 'design', 'legal_review', 'planning'];
      recalibrateCapabilities([agentId], allTaskTypes);
    }).catch(() => {});
  }
}

/**
 * 에이전트별 히트레이트 계산.
 * @param windowSize 최근 N건 기준 (기본 10)
 */
export function getAgentHitRate(
  agentId: string,
  windowSize: number = 10,
): { hits: number; total: number; rate: number } {
  const records = getRecords()
    .filter(r => r.agent_id === agentId)
    .slice(-windowSize);

  const hits = records.filter(r => r.reaction === 'hit').length;
  const total = records.length;
  const rate = total > 0 ? hits / total : 0.5; // 데이터 없으면 중립

  return { hits, total, rate };
}

/**
 * 도메인별 히트레이트.
 */
export function getAgentDomainHitRate(
  agentId: string,
  domainTag: string,
): { hits: number; total: number; rate: number } {
  const records = getRecords()
    .filter(r => r.agent_id === agentId && r.domain_tag === domainTag);

  const hits = records.filter(r => r.reaction === 'hit').length;
  const total = records.length;
  const rate = total > 0 ? hits / total : 0.5;

  return { hits, total, rate };
}

/**
 * 사용자의 전체 블라인드스팟 패턴.
 * 최소 minSamples 이상 데이터가 있는 도메인만 반환.
 */
export function getUserBlindspotPattern(
  minSamples: number = 5,
): Array<{ domainTag: string; hitRate: number; frequency: number }> {
  const records = getRecords();
  const byDomain = new Map<string, HitRecord[]>();

  for (const r of records) {
    if (!r.domain_tag) continue;
    const list = byDomain.get(r.domain_tag) || [];
    list.push(r);
    byDomain.set(r.domain_tag, list);
  }

  const patterns: Array<{ domainTag: string; hitRate: number; frequency: number }> = [];
  for (const [tag, list] of byDomain) {
    if (list.length < minSamples) continue;
    const hits = list.filter(r => r.reaction === 'hit').length;
    patterns.push({ domainTag: tag, hitRate: hits / list.length, frequency: list.length });
  }

  return patterns.sort((a, b) => b.hitRate - a.hitRate);
}

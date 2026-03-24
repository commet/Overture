/**
 * Outcome Tracker — Phase 1
 *
 * 실행 후 결과를 기록하여 의사결정 품질의 "증거"를 만드는 모듈.
 *
 * 학술 근거:
 * - Spetzler (2016): "좋은 결정 ≠ 좋은 결과" — 의사결정 시점과 결과를 분리 측정
 * - Klein (2007): 프리모템의 효과를 사후 검증 — 예측된 리스크가 실현됐는가?
 * - Argyle (2023): 합성 페르소나 정확도 추적 — 페르소나 예측 vs 실제 결과
 *
 * 데이터 흐름:
 * 프로젝트 완료 → 사용자 실행 → (시간 경과) → 결과 기록 → 학습 루프 피드백
 */

import type {
  OutcomeRecord,
  MaterializedRisk,
  FeedbackRecord,
  RefinementLoop,
  Persona,
} from '@/stores/types';
import { getStorage, setStorage, STORAGE_KEYS } from './storage';
import { insertToSupabase } from './db';
import { generateId } from './uuid';
import { recordSignal } from './signal-recorder';

/* ────────────────────────────────────
   Outcome Recording
   ──────────────────────────────────── */

/**
 * Save an outcome record for a completed project.
 */
export function saveOutcomeRecord(record: Omit<OutcomeRecord, 'id' | 'created_at'>): OutcomeRecord {
  const full: OutcomeRecord = {
    ...record,
    id: generateId(),
    created_at: new Date().toISOString(),
  };

  // localStorage
  const existing = getStorage<OutcomeRecord[]>(STORAGE_KEYS.OUTCOME_RECORDS, []);
  existing.push(full);
  if (existing.length > 100) existing.splice(0, existing.length - 100);
  setStorage(STORAGE_KEYS.OUTCOME_RECORDS, existing);

  // Supabase (fire-and-forget)
  insertToSupabase('outcome_records', full);

  // Record quality signal
  recordSignal({
    tool: 'refinement',
    signal_type: 'outcome_recorded',
    signal_data: {
      project_id: full.project_id,
      hypothesis_result: full.hypothesis_result,
      overall_success: full.overall_success,
      risks_materialized: full.materialized_risks.filter(r => r.actually_happened).length,
      risks_total: full.materialized_risks.length,
    },
    project_id: full.project_id,
  });

  return full;
}

/**
 * Get outcome records, optionally for a specific project.
 */
export function getOutcomeRecords(projectId?: string): OutcomeRecord[] {
  const all = getStorage<OutcomeRecord[]>(STORAGE_KEYS.OUTCOME_RECORDS, []);
  if (!projectId) return all;
  return all.filter(r => r.project_id === projectId);
}

/* ────────────────────────────────────
   Outcome Analysis — 페르소나 예측 정확도
   ──────────────────────────────────── */

export interface PersonaPredictionAccuracy {
  persona_id: string;
  persona_name: string;
  total_risks_predicted: number;
  risks_materialized: number;
  accuracy_rate: number;
  // 카테고리별 정확도
  critical_accuracy: number;
  manageable_accuracy: number;
  unspoken_accuracy: number;
}

/**
 * Compute persona prediction accuracy from outcome records.
 * Compares risks identified during rehearsal with actual outcomes.
 */
export function analyzePersonaPredictionAccuracy(
  outcomes: OutcomeRecord[],
  personas: Persona[]
): PersonaPredictionAccuracy[] {
  // Aggregate materialized risks by persona
  const personaStats: Record<string, {
    total: number;
    materialized: number;
    byCat: Record<string, { total: number; materialized: number }>;
  }> = {};

  for (const outcome of outcomes) {
    for (const risk of outcome.materialized_risks) {
      if (!personaStats[risk.persona_id]) {
        personaStats[risk.persona_id] = {
          total: 0,
          materialized: 0,
          byCat: {
            critical: { total: 0, materialized: 0 },
            manageable: { total: 0, materialized: 0 },
            unspoken: { total: 0, materialized: 0 },
          },
        };
      }

      const stats = personaStats[risk.persona_id];
      stats.total++;
      if (risk.actually_happened) stats.materialized++;

      const cat = stats.byCat[risk.category];
      if (cat) {
        cat.total++;
        if (risk.actually_happened) cat.materialized++;
      }
    }
  }

  return Object.entries(personaStats).map(([personaId, stats]) => {
    const persona = personas.find(p => p.id === personaId);
    const catRate = (cat: string) => {
      const c = stats.byCat[cat];
      return c && c.total > 0 ? c.materialized / c.total : 0;
    };

    return {
      persona_id: personaId,
      persona_name: persona?.name || 'Unknown',
      total_risks_predicted: stats.total,
      risks_materialized: stats.materialized,
      accuracy_rate: stats.total > 0 ? stats.materialized / stats.total : 0,
      critical_accuracy: catRate('critical'),
      manageable_accuracy: catRate('manageable'),
      unspoken_accuracy: catRate('unspoken'),
    };
  });
}

/* ────────────────────────────────────
   Outcome Analysis — 가설 검증 패턴
   ──────────────────────────────────── */

export interface HypothesisTrackRecord {
  total_projects: number;
  confirmed: number;
  partially_confirmed: number;
  refuted: number;
  not_testable: number;
  confirmation_rate: number;
}

/**
 * Analyze hypothesis validation track record across all projects.
 */
export function analyzeHypothesisTrackRecord(outcomes: OutcomeRecord[]): HypothesisTrackRecord {
  const counts = { confirmed: 0, partially_confirmed: 0, refuted: 0, not_testable: 0 };

  for (const outcome of outcomes) {
    counts[outcome.hypothesis_result]++;
  }

  const testable = counts.confirmed + counts.partially_confirmed + counts.refuted;

  return {
    total_projects: outcomes.length,
    ...counts,
    confirmation_rate: testable > 0 ? (counts.confirmed + counts.partially_confirmed) / testable : 0,
  };
}

/* ────────────────────────────────────
   Outcome Analysis — 전체 성공률
   ──────────────────────────────────── */

export interface OverallOutcomeSummary {
  total_projects: number;
  exceeded: number;
  met: number;
  partial: number;
  failed: number;
  success_rate: number;           // exceeded + met
  avg_risk_materialization: number; // 예측 리스크 중 실현 비율
  unspoken_materialization: number; // unspoken 리스크 실현 비율
}

/**
 * Get overall success metrics from all outcome records.
 */
export function getOverallOutcomeSummary(outcomes: OutcomeRecord[]): OverallOutcomeSummary {
  if (outcomes.length === 0) {
    return {
      total_projects: 0, exceeded: 0, met: 0, partial: 0, failed: 0,
      success_rate: 0, avg_risk_materialization: 0, unspoken_materialization: 0,
    };
  }

  const counts = { exceeded: 0, met: 0, partial: 0, failed: 0 };
  let totalRisks = 0;
  let materializedRisks = 0;
  let unspokenTotal = 0;
  let unspokenMaterialized = 0;

  for (const outcome of outcomes) {
    counts[outcome.overall_success]++;

    for (const risk of outcome.materialized_risks) {
      totalRisks++;
      if (risk.actually_happened) materializedRisks++;
      if (risk.category === 'unspoken') {
        unspokenTotal++;
        if (risk.actually_happened) unspokenMaterialized++;
      }
    }
  }

  return {
    total_projects: outcomes.length,
    ...counts,
    success_rate: (counts.exceeded + counts.met) / outcomes.length,
    avg_risk_materialization: totalRisks > 0 ? materializedRisks / totalRisks : 0,
    unspoken_materialization: unspokenTotal > 0 ? unspokenMaterialized / unspokenTotal : 0,
  };
}

/* ────────────────────────────────────
   Helper: Build Risk Checklist from Feedback
   ──────────────────────────────────── */

/**
 * Extract all classified risks from feedback records to create
 * a pre-filled outcome checklist for the user.
 */
export function buildRiskChecklist(
  feedbackRecords: FeedbackRecord[]
): MaterializedRisk[] {
  const risks: MaterializedRisk[] = [];

  for (const record of feedbackRecords) {
    for (const result of record.results) {
      for (const risk of result.classified_risks || []) {
        risks.push({
          risk_text: risk.text,
          persona_id: result.persona_id,
          category: risk.category,
          actually_happened: false,
        });
      }
    }
  }

  return risks;
}

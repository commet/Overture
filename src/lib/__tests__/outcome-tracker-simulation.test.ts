/**
 * Outcome Tracker Simulation — 결과 추적 분석 함수 시뮬레이션
 *
 * 핵심 검증:
 * - saveOutcomeRecord: localStorage + Supabase 저장, 100개 상한, signal 기록
 * - getOutcomeRecords: 전체 조회, projectId 필터
 * - analyzePersonaPredictionAccuracy: 페르소나별 리스크 예측 정확도 (카테고리별)
 * - analyzeHypothesisTrackRecord: 가설 검증 패턴 (confirmation_rate)
 * - getOverallOutcomeSummary: 성공률 + 리스크 실현율
 * - buildRiskChecklist: 피드백에서 리스크 체크리스트 추출
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  OutcomeRecord,
  MaterializedRisk,
  FeedbackRecord,
  Persona,
  RehearsalResult,
  ClassifiedRisk,
} from '@/stores/types';

// ── Mocks ──

vi.mock('@/lib/db', () => ({ insertToSupabase: vi.fn() }));
vi.mock('@/lib/uuid', () => ({
  generateId: vi.fn(() => 'mock-id-' + Math.random().toString(36).slice(2, 8)),
}));
vi.mock('@/lib/signal-recorder', () => ({
  recordSignal: vi.fn(),
  getSignals: vi.fn(() => []),
}));

let mockStorage: Record<string, unknown> = {};
vi.mock('@/lib/storage', () => ({
  getStorage: vi.fn((key: string, fallback: unknown) => mockStorage[key] ?? fallback),
  setStorage: vi.fn((key: string, value: unknown) => { mockStorage[key] = value; }),
  STORAGE_KEYS: { OUTCOME_RECORDS: 'sot_outcome_records', SETTINGS: 'sot_settings' },
}));

import {
  saveOutcomeRecord,
  getOutcomeRecords,
  analyzePersonaPredictionAccuracy,
  analyzeHypothesisTrackRecord,
  getOverallOutcomeSummary,
  buildRiskChecklist,
} from '@/lib/outcome-tracker';
import { insertToSupabase } from '@/lib/db';
import { recordSignal } from '@/lib/signal-recorder';

const mockInsert = vi.mocked(insertToSupabase);
const mockRecordSignal = vi.mocked(recordSignal);

// ── Helpers ──

function makeRisk(overrides: Partial<MaterializedRisk> = {}): MaterializedRisk {
  return {
    risk_text: 'Some risk',
    persona_id: 'p1',
    category: 'critical',
    actually_happened: false,
    ...overrides,
  };
}

function makeOutcome(overrides: Partial<OutcomeRecord> = {}): OutcomeRecord {
  return {
    id: `o-${Math.random().toString(36).slice(2)}`,
    project_id: 'proj-1',
    hypothesis_result: 'confirmed',
    hypothesis_notes: 'Test notes',
    materialized_risks: [],
    approval_outcomes: [],
    overall_success: 'met',
    key_learnings: 'Learned something',
    what_would_change: 'Nothing',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makePersona(overrides: Partial<Persona> = {}): Persona {
  return {
    id: 'p1',
    name: 'CTO',
    role: 'Technical Lead',
    organization: 'Acme',
    priorities: 'Ship fast',
    communication_style: 'Direct',
    known_concerns: 'Tech debt',
    relationship_notes: '',
    influence: 'high',
    extracted_traits: [],
    feedback_logs: [],
    ...overrides,
  };
}

function makeFeedbackRecord(overrides: Partial<FeedbackRecord> = {}): FeedbackRecord {
  return {
    id: `fr-${Math.random().toString(36).slice(2)}`,
    document_title: 'Test Doc',
    document_text: 'Test content',
    persona_ids: ['p1'],
    feedback_perspective: 'critical',
    feedback_intensity: 'high',
    results: [],
    synthesis: 'Summary',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeRehearsalResult(overrides: Partial<RehearsalResult> = {}): RehearsalResult {
  return {
    persona_id: 'p1',
    overall_reaction: 'Concerned',
    failure_scenario: 'Could fail',
    untested_assumptions: [],
    classified_risks: [],
    first_questions: [],
    praise: [],
    concerns: [],
    wants_more: [],
    approval_conditions: [],
    ...overrides,
  };
}

// ── Tests ──

describe('Outcome Tracker Simulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = {};
  });

  // ────────────────────────────────────
  // saveOutcomeRecord + getOutcomeRecords
  // ────────────────────────────────────

  describe('saveOutcomeRecord', () => {
    it('should assign id and created_at, persist to storage and Supabase', () => {
      const result = saveOutcomeRecord({
        project_id: 'proj-1',
        hypothesis_result: 'confirmed',
        hypothesis_notes: 'Worked as expected',
        materialized_risks: [],
        approval_outcomes: [],
        overall_success: 'met',
        key_learnings: 'Good call',
        what_would_change: 'Nothing',
      });

      expect(result.id).toBeTruthy();
      expect(result.created_at).toBeTruthy();
      expect(mockInsert).toHaveBeenCalledWith('outcome_records', result);
      expect(mockRecordSignal).toHaveBeenCalledOnce();

      // Should be retrievable
      const records = getOutcomeRecords();
      expect(records).toHaveLength(1);
      expect(records[0].project_id).toBe('proj-1');
    });

    it('should enforce 100-record cap with FIFO eviction', () => {
      // Pre-fill with 99 records
      const existing = Array.from({ length: 99 }, (_, i) =>
        makeOutcome({ id: `old-${i}`, project_id: `proj-${i}` })
      );
      mockStorage['sot_outcome_records'] = existing;

      // Add two more to exceed 100
      saveOutcomeRecord({
        project_id: 'proj-new-1',
        hypothesis_result: 'refuted',
        hypothesis_notes: '',
        materialized_risks: [],
        approval_outcomes: [],
        overall_success: 'failed',
        key_learnings: '',
        what_would_change: '',
      });
      saveOutcomeRecord({
        project_id: 'proj-new-2',
        hypothesis_result: 'confirmed',
        hypothesis_notes: '',
        materialized_risks: [],
        approval_outcomes: [],
        overall_success: 'met',
        key_learnings: '',
        what_would_change: '',
      });

      const all = getOutcomeRecords();
      expect(all.length).toBeLessThanOrEqual(100);
      // Oldest should have been evicted
      expect(all.find(r => r.id === 'old-0')).toBeUndefined();
    });

    it('should record a quality signal with risk counts', () => {
      saveOutcomeRecord({
        project_id: 'proj-x',
        hypothesis_result: 'partially_confirmed',
        hypothesis_notes: '',
        materialized_risks: [
          makeRisk({ actually_happened: true }),
          makeRisk({ actually_happened: false }),
          makeRisk({ actually_happened: true }),
        ],
        approval_outcomes: [],
        overall_success: 'partial',
        key_learnings: '',
        what_would_change: '',
      });

      expect(mockRecordSignal).toHaveBeenCalledWith(
        expect.objectContaining({
          tool: 'refine',
          signal_type: 'outcome_recorded',
          signal_data: expect.objectContaining({
            risks_materialized: 2,
            risks_total: 3,
          }),
        })
      );
    });
  });

  describe('getOutcomeRecords', () => {
    it('should return empty array when no records exist', () => {
      expect(getOutcomeRecords()).toEqual([]);
    });

    it('should filter by projectId when provided', () => {
      mockStorage['sot_outcome_records'] = [
        makeOutcome({ project_id: 'proj-A' }),
        makeOutcome({ project_id: 'proj-B' }),
        makeOutcome({ project_id: 'proj-A' }),
      ];

      expect(getOutcomeRecords('proj-A')).toHaveLength(2);
      expect(getOutcomeRecords('proj-B')).toHaveLength(1);
      expect(getOutcomeRecords('proj-C')).toHaveLength(0);
    });

    it('should return all records when projectId is undefined', () => {
      mockStorage['sot_outcome_records'] = [
        makeOutcome({ project_id: 'proj-A' }),
        makeOutcome({ project_id: 'proj-B' }),
      ];

      expect(getOutcomeRecords()).toHaveLength(2);
    });
  });

  // ────────────────────────────────────
  // analyzePersonaPredictionAccuracy
  // ────────────────────────────────────

  describe('analyzePersonaPredictionAccuracy', () => {
    it('should return empty array for no outcomes', () => {
      const result = analyzePersonaPredictionAccuracy([], [makePersona()]);
      expect(result).toEqual([]);
    });

    it('should return empty array when outcomes have no risks', () => {
      const result = analyzePersonaPredictionAccuracy(
        [makeOutcome({ materialized_risks: [] })],
        [makePersona()]
      );
      expect(result).toEqual([]);
    });

    it('should compute accuracy for a single persona with mixed results', () => {
      const outcomes = [
        makeOutcome({
          materialized_risks: [
            makeRisk({ persona_id: 'p1', category: 'critical', actually_happened: true }),
            makeRisk({ persona_id: 'p1', category: 'critical', actually_happened: false }),
            makeRisk({ persona_id: 'p1', category: 'manageable', actually_happened: true }),
          ],
        }),
      ];
      const personas = [makePersona({ id: 'p1', name: 'CTO' })];

      const result = analyzePersonaPredictionAccuracy(outcomes, personas);
      expect(result).toHaveLength(1);
      expect(result[0].persona_id).toBe('p1');
      expect(result[0].persona_name).toBe('CTO');
      expect(result[0].total_risks_predicted).toBe(3);
      expect(result[0].risks_materialized).toBe(2);
      expect(result[0].accuracy_rate).toBeCloseTo(2 / 3);
      expect(result[0].critical_accuracy).toBeCloseTo(1 / 2);
      expect(result[0].manageable_accuracy).toBe(1);
      expect(result[0].unspoken_accuracy).toBe(0); // no unspoken risks
    });

    it('should aggregate across multiple outcomes for the same persona', () => {
      const outcomes = [
        makeOutcome({
          materialized_risks: [
            makeRisk({ persona_id: 'p1', category: 'unspoken', actually_happened: true }),
          ],
        }),
        makeOutcome({
          materialized_risks: [
            makeRisk({ persona_id: 'p1', category: 'unspoken', actually_happened: false }),
            makeRisk({ persona_id: 'p1', category: 'unspoken', actually_happened: true }),
          ],
        }),
      ];
      const personas = [makePersona({ id: 'p1', name: 'CFO' })];

      const result = analyzePersonaPredictionAccuracy(outcomes, personas);
      expect(result).toHaveLength(1);
      expect(result[0].total_risks_predicted).toBe(3);
      expect(result[0].risks_materialized).toBe(2);
      expect(result[0].unspoken_accuracy).toBeCloseTo(2 / 3);
    });

    it('should track multiple personas independently', () => {
      const outcomes = [
        makeOutcome({
          materialized_risks: [
            makeRisk({ persona_id: 'p1', category: 'critical', actually_happened: true }),
            makeRisk({ persona_id: 'p2', category: 'manageable', actually_happened: false }),
          ],
        }),
      ];
      const personas = [
        makePersona({ id: 'p1', name: 'CTO' }),
        makePersona({ id: 'p2', name: 'CFO' }),
      ];

      const result = analyzePersonaPredictionAccuracy(outcomes, personas);
      expect(result).toHaveLength(2);

      const cto = result.find(r => r.persona_id === 'p1')!;
      const cfo = result.find(r => r.persona_id === 'p2')!;

      expect(cto.accuracy_rate).toBe(1);
      expect(cto.critical_accuracy).toBe(1);
      expect(cfo.accuracy_rate).toBe(0);
      expect(cfo.manageable_accuracy).toBe(0);
    });

    it('should use "Unknown" for persona name if persona not found in list', () => {
      const outcomes = [
        makeOutcome({
          materialized_risks: [
            makeRisk({ persona_id: 'deleted-persona', actually_happened: true }),
          ],
        }),
      ];

      const result = analyzePersonaPredictionAccuracy(outcomes, []);
      expect(result).toHaveLength(1);
      expect(result[0].persona_name).toBe('Unknown');
    });

    it('should handle unknown risk category gracefully', () => {
      const outcomes = [
        makeOutcome({
          materialized_risks: [
            makeRisk({
              persona_id: 'p1',
              category: 'unknown_cat' as MaterializedRisk['category'],
              actually_happened: true,
            }),
          ],
        }),
      ];
      const personas = [makePersona({ id: 'p1' })];

      const result = analyzePersonaPredictionAccuracy(outcomes, personas);
      expect(result).toHaveLength(1);
      // Overall accuracy still counts it
      expect(result[0].accuracy_rate).toBe(1);
      // Category-specific rates remain 0 since the unknown cat doesn't match
      expect(result[0].critical_accuracy).toBe(0);
      expect(result[0].manageable_accuracy).toBe(0);
      expect(result[0].unspoken_accuracy).toBe(0);
    });
  });

  // ────────────────────────────────────
  // analyzeHypothesisTrackRecord
  // ────────────────────────────────────

  describe('analyzeHypothesisTrackRecord', () => {
    it('should return zeroes for empty outcomes', () => {
      const result = analyzeHypothesisTrackRecord([]);
      expect(result).toEqual({
        total_projects: 0,
        confirmed: 0,
        partially_confirmed: 0,
        refuted: 0,
        not_testable: 0,
        confirmation_rate: 0,
      });
    });

    it('should count a single confirmed outcome', () => {
      const result = analyzeHypothesisTrackRecord([
        makeOutcome({ hypothesis_result: 'confirmed' }),
      ]);
      expect(result.total_projects).toBe(1);
      expect(result.confirmed).toBe(1);
      expect(result.confirmation_rate).toBe(1);
    });

    it('should compute confirmation_rate excluding not_testable', () => {
      const outcomes = [
        makeOutcome({ hypothesis_result: 'confirmed' }),
        makeOutcome({ hypothesis_result: 'partially_confirmed' }),
        makeOutcome({ hypothesis_result: 'refuted' }),
        makeOutcome({ hypothesis_result: 'not_testable' }),
      ];

      const result = analyzeHypothesisTrackRecord(outcomes);
      expect(result.total_projects).toBe(4);
      expect(result.confirmed).toBe(1);
      expect(result.partially_confirmed).toBe(1);
      expect(result.refuted).toBe(1);
      expect(result.not_testable).toBe(1);
      // confirmation_rate = (confirmed + partially_confirmed) / testable
      // testable = confirmed + partially_confirmed + refuted = 3
      expect(result.confirmation_rate).toBeCloseTo(2 / 3);
    });

    it('should return 0 confirmation_rate when all are not_testable (division by zero guard)', () => {
      const outcomes = [
        makeOutcome({ hypothesis_result: 'not_testable' }),
        makeOutcome({ hypothesis_result: 'not_testable' }),
      ];

      const result = analyzeHypothesisTrackRecord(outcomes);
      expect(result.total_projects).toBe(2);
      expect(result.confirmation_rate).toBe(0);
    });

    it('should handle all refuted as 0% confirmation rate', () => {
      const outcomes = [
        makeOutcome({ hypothesis_result: 'refuted' }),
        makeOutcome({ hypothesis_result: 'refuted' }),
      ];

      const result = analyzeHypothesisTrackRecord(outcomes);
      expect(result.confirmation_rate).toBe(0);
      expect(result.refuted).toBe(2);
    });
  });

  // ────────────────────────────────────
  // getOverallOutcomeSummary
  // ────────────────────────────────────

  describe('getOverallOutcomeSummary', () => {
    it('should return all zeroes for empty outcomes', () => {
      const result = getOverallOutcomeSummary([]);
      expect(result).toEqual({
        total_projects: 0,
        exceeded: 0,
        met: 0,
        partial: 0,
        failed: 0,
        success_rate: 0,
        avg_risk_materialization: 0,
        unspoken_materialization: 0,
      });
    });

    it('should compute success_rate as (exceeded + met) / total', () => {
      const outcomes = [
        makeOutcome({ overall_success: 'exceeded' }),
        makeOutcome({ overall_success: 'met' }),
        makeOutcome({ overall_success: 'partial' }),
        makeOutcome({ overall_success: 'failed' }),
      ];

      const result = getOverallOutcomeSummary(outcomes);
      expect(result.total_projects).toBe(4);
      expect(result.exceeded).toBe(1);
      expect(result.met).toBe(1);
      expect(result.success_rate).toBe(0.5);
    });

    it('should compute avg_risk_materialization across all outcomes', () => {
      const outcomes = [
        makeOutcome({
          materialized_risks: [
            makeRisk({ category: 'critical', actually_happened: true }),
            makeRisk({ category: 'critical', actually_happened: false }),
          ],
        }),
        makeOutcome({
          materialized_risks: [
            makeRisk({ category: 'manageable', actually_happened: true }),
            makeRisk({ category: 'manageable', actually_happened: true }),
          ],
        }),
      ];

      const result = getOverallOutcomeSummary(outcomes);
      // 3 materialized out of 4 total
      expect(result.avg_risk_materialization).toBe(3 / 4);
    });

    it('should compute unspoken_materialization separately', () => {
      const outcomes = [
        makeOutcome({
          materialized_risks: [
            makeRisk({ category: 'unspoken', actually_happened: true }),
            makeRisk({ category: 'unspoken', actually_happened: false }),
            makeRisk({ category: 'unspoken', actually_happened: true }),
            makeRisk({ category: 'critical', actually_happened: true }),
          ],
        }),
      ];

      const result = getOverallOutcomeSummary(outcomes);
      expect(result.unspoken_materialization).toBeCloseTo(2 / 3);
      // avg_risk_materialization = 3/4 overall
      expect(result.avg_risk_materialization).toBe(3 / 4);
    });

    it('should return 0 for risk rates when no risks exist (division by zero guard)', () => {
      const outcomes = [
        makeOutcome({ materialized_risks: [], overall_success: 'met' }),
      ];

      const result = getOverallOutcomeSummary(outcomes);
      expect(result.total_projects).toBe(1);
      expect(result.success_rate).toBe(1);
      expect(result.avg_risk_materialization).toBe(0);
      expect(result.unspoken_materialization).toBe(0);
    });

    it('should handle single exceeded project correctly', () => {
      const result = getOverallOutcomeSummary([
        makeOutcome({ overall_success: 'exceeded' }),
      ]);
      expect(result.success_rate).toBe(1);
      expect(result.exceeded).toBe(1);
    });

    it('should handle all-failed scenario', () => {
      const outcomes = Array.from({ length: 5 }, () =>
        makeOutcome({ overall_success: 'failed' })
      );
      const result = getOverallOutcomeSummary(outcomes);
      expect(result.success_rate).toBe(0);
      expect(result.failed).toBe(5);
    });
  });

  // ────────────────────────────────────
  // buildRiskChecklist
  // ────────────────────────────────────

  describe('buildRiskChecklist', () => {
    it('should return empty array for empty feedback records', () => {
      expect(buildRiskChecklist([])).toEqual([]);
    });

    it('should return empty array when results have no classified_risks', () => {
      const records = [
        makeFeedbackRecord({
          results: [makeRehearsalResult({ classified_risks: [] })],
        }),
      ];
      expect(buildRiskChecklist(records)).toEqual([]);
    });

    it('should extract risks from a single feedback record', () => {
      const records = [
        makeFeedbackRecord({
          results: [
            makeRehearsalResult({
              persona_id: 'p1',
              classified_risks: [
                { text: 'Budget overrun', category: 'critical' },
                { text: 'Timeline slip', category: 'manageable' },
              ],
            }),
          ],
        }),
      ];

      const checklist = buildRiskChecklist(records);
      expect(checklist).toHaveLength(2);
      expect(checklist[0]).toEqual({
        risk_text: 'Budget overrun',
        persona_id: 'p1',
        category: 'critical',
        actually_happened: false,
      });
      expect(checklist[1]).toEqual({
        risk_text: 'Timeline slip',
        persona_id: 'p1',
        category: 'manageable',
        actually_happened: false,
      });
    });

    it('should aggregate risks from multiple records and multiple personas', () => {
      const records = [
        makeFeedbackRecord({
          results: [
            makeRehearsalResult({
              persona_id: 'p1',
              classified_risks: [{ text: 'Risk A', category: 'critical' }],
            }),
            makeRehearsalResult({
              persona_id: 'p2',
              classified_risks: [{ text: 'Risk B', category: 'unspoken' }],
            }),
          ],
        }),
        makeFeedbackRecord({
          results: [
            makeRehearsalResult({
              persona_id: 'p1',
              classified_risks: [{ text: 'Risk C', category: 'manageable' }],
            }),
          ],
        }),
      ];

      const checklist = buildRiskChecklist(records);
      expect(checklist).toHaveLength(3);
      expect(checklist.map(r => r.risk_text)).toEqual(['Risk A', 'Risk B', 'Risk C']);
      expect(checklist.every(r => r.actually_happened === false)).toBe(true);
    });

    it('should handle results with missing classified_risks (defensive access)', () => {
      const records = [
        makeFeedbackRecord({
          results: [
            makeRehearsalResult({
              persona_id: 'p1',
              classified_risks: undefined as unknown as ClassifiedRisk[],
            }),
          ],
        }),
      ];

      // Should not throw — the code uses `|| []` guard
      expect(() => buildRiskChecklist(records)).not.toThrow();
      expect(buildRiskChecklist(records)).toEqual([]);
    });
  });
});

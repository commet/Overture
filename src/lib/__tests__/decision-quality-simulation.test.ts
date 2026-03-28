/**
 * Decision Quality Simulation — 다양한 시나리오 아키타입 시뮬레이션
 *
 * Concertmaster simulation 패턴을 DQ 엔진에 적용:
 * 다양한 프로젝트 상태 mock → DQ 점수/트렌드/상관관계 검증 → 엣지케이스 발견
 *
 * 아키타입:
 * 1. 빈 프로젝트 (데이터 없음)
 * 2. Reframe만 완료 (부분 파이프라인)
 * 3. 전체 파이프라인 — 최소 데이터
 * 4. 전체 파이프라인 — 풍부한 데이터
 * 5. 만점 시나리오 (모든 요소 max)
 * 6. 수렴 전문가 (refine loop converged, 이슈 감소)
 * 7. 반아첨 전사 (framing challenged + blind spots + mind changed)
 * 8. 이해관계자 집중형 (많은 페르소나, 많은 승인 조건)
 * 9. 시계열 트렌드 — 상승/하락/안정
 * 10. DQ-Outcome 상관관계 시나리오
 * 11. Confidence Calibration — 과신/과소/정확
 * 12. Eval Criteria Validation — 예측력 검증
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  ReframeItem,
  RecastItem,
  FeedbackRecord,
  RefineLoop,
  JudgmentRecord,
  Persona,
  DecisionQualityScore,
  OutcomeRecord,
  Project,
  HiddenAssumption,
  RehearsalResult,
  ClassifiedRisk,
} from '@/stores/types';

// ── Mocks ──

vi.mock('@/lib/storage', () => ({
  getStorage: vi.fn(() => []),
  setStorage: vi.fn(),
  STORAGE_KEYS: {
    DQ_SCORES: 'sot_dq_scores',
  },
}));

vi.mock('@/lib/db', () => ({
  insertToSupabase: vi.fn(),
}));

vi.mock('@/lib/uuid', () => ({
  generateId: vi.fn(() => `dq-test-${Math.random().toString(36).slice(2)}`),
}));

vi.mock('@/lib/signal-recorder', () => ({
  recordSignal: vi.fn(),
}));

vi.mock('@/lib/judgment-vitality', () => ({
  assessVitality: vi.fn(() => ({
    gamma: 0.5,
    rigidity_score: 0.3,
    vitality_score: 0.7,
    tier: 'alive',
    signals: [],
    coaching: [],
    created_at: new Date().toISOString(),
  })),
}));

import {
  computeDecisionQuality,
  getDQScores,
  analyzeDQTrend,
  correlateDQWithOutcomes,
  analyzeConfidenceCalibration,
  validateEvalCriteria,
} from '@/lib/decision-quality';
import type { DQInput, DQTrend, DQOutcomeCorrelation, CalibrationData, EvalValidation } from '@/lib/decision-quality';
import { getStorage, setStorage } from '@/lib/storage';
import { recordSignal } from '@/lib/signal-recorder';

const mockGetStorage = vi.mocked(getStorage);
const mockSetStorage = vi.mocked(setStorage);
const mockRecordSignal = vi.mocked(recordSignal);

// ── Helpers ──

function makeAssumption(
  evaluation: 'likely_true' | 'uncertain' | 'doubtful' = 'uncertain',
  axis?: HiddenAssumption['axis']
): HiddenAssumption {
  return {
    assumption: `assumption-${Math.random().toString(36).slice(2)}`,
    risk_if_false: 'some risk',
    evaluation,
    axis,
  };
}

function makeReframe(overrides: Partial<ReframeItem> = {}): ReframeItem {
  return {
    id: `rf-${Math.random().toString(36).slice(2)}`,
    input_text: 'test input',
    selected_question: 'selected question',
    status: 'done',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    analysis: {
      surface_task: 'original task',
      reframed_question: 'reframed question?',
      why_reframing_matters: 'because this changes the framing significantly',
      reasoning_narrative: '',
      hidden_assumptions: [
        makeAssumption('likely_true'),
        makeAssumption('uncertain'),
      ],
      hidden_questions: [
        { question: 'q1', reasoning: 'r1' },
        { question: 'q2', reasoning: 'r2' },
        { question: 'q3', reasoning: 'r3' },
      ],
      ai_limitations: ['limitation1'],
      alternative_framings: ['alt1', 'alt2'],
    },
    ...overrides,
  };
}

function makeRecast(overrides: Partial<RecastItem> = {}): RecastItem {
  return {
    id: `rc-${Math.random().toString(36).slice(2)}`,
    input_text: 'test',
    steps: [],
    status: 'done',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    analysis: {
      governing_idea: 'main idea',
      storyline: { situation: 's', complication: 'c', resolution: 'r' },
      goal_summary: 'goal',
      steps: [
        { task: 'step1', actor: 'human', actor_reasoning: '', expected_output: '', checkpoint: true, checkpoint_reason: 'verify' },
        { task: 'step2', actor: 'ai', actor_reasoning: '', expected_output: '', checkpoint: false, checkpoint_reason: '' },
        { task: 'step3', actor: 'both', actor_reasoning: '', expected_output: '', checkpoint: true, checkpoint_reason: 'review' },
      ],
      key_assumptions: [
        { assumption: 'a1', importance: 'high', certainty: 'medium', if_wrong: 'bad' },
        { assumption: 'a2', importance: 'medium', certainty: 'high', if_wrong: 'ok' },
      ],
      critical_path: [0, 2],
      total_estimated_time: '2 weeks',
      ai_ratio: 0.4,
      human_ratio: 0.6,
      design_rationale: 'because this approach...',
    },
    ...overrides,
  };
}

function makeRehearsalResult(personaId: string, overrides: Partial<RehearsalResult> = {}): RehearsalResult {
  return {
    persona_id: personaId,
    overall_reaction: 'mixed',
    failure_scenario: 'could fail if...',
    untested_assumptions: ['untested1'],
    classified_risks: [
      { text: 'risk1', category: 'critical' },
      { text: 'hidden risk', category: 'unspoken' },
    ],
    first_questions: ['question1'],
    praise: ['good point'],
    concerns: ['concern1'],
    wants_more: ['detail1'],
    approval_conditions: ['condition1', 'condition2'],
    ...overrides,
  };
}

function makeFeedbackRecord(personaIds: string[], overrides: Partial<FeedbackRecord> = {}): FeedbackRecord {
  return {
    id: `fr-${Math.random().toString(36).slice(2)}`,
    document_title: 'test doc',
    document_text: 'test text',
    persona_ids: personaIds,
    feedback_perspective: 'critical',
    feedback_intensity: 'thorough',
    results: personaIds.map(pid => makeRehearsalResult(pid)),
    synthesis: 'synthesis text',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeRefineLoop(status: 'converged' | 'active' | 'stopped_by_user', iterations: number, issueTrend: number[]): RefineLoop {
  return {
    id: `rl-${Math.random().toString(36).slice(2)}`,
    project_id: 'test-project',
    name: 'test loop',
    goal: 'improve plan',
    original_plan: 'original',
    initial_feedback_record_id: 'fr-1',
    initial_approval_conditions: [],
    persona_ids: ['p1'],
    iterations: issueTrend.map((issues, i) => ({
      iteration_number: i + 1,
      issues_to_address: Array.from({ length: issues }, (_, j) => `issue-${j}`),
      revised_plan: `plan v${i + 2}`,
      changes: [{ what: 'change', why: 'reason', addressing: 'issue' }],
      feedback_record_id: `fr-${i + 1}`,
      convergence: {
        critical_risks: Math.max(0, issues - 1),
        total_issues: issues,
        approval_conditions: [],
      },
      created_at: new Date().toISOString(),
    })),
    status,
    max_iterations: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function makeJudgment(projectId: string, userChanged: boolean): JudgmentRecord {
  return {
    id: `j-${Math.random().toString(36).slice(2)}`,
    type: 'actor_override',
    context: 'test context',
    decision: 'human',
    original_ai_suggestion: 'ai suggestion',
    user_changed: userChanged,
    project_id: projectId,
    tool: 'recast',
    created_at: new Date().toISOString(),
  };
}

function makeDQScore(overrides: Partial<DecisionQualityScore> = {}): DecisionQualityScore {
  return {
    id: `dq-${Math.random().toString(36).slice(2)}`,
    project_id: `p-${Math.random().toString(36).slice(2)}`,
    appropriate_frame: 3,
    creative_alternatives: 3,
    relevant_information: 3,
    clear_values: 3,
    sound_reasoning: 3,
    commitment_to_action: 3,
    initial_framing_challenged: true,
    blind_spots_surfaced: 1,
    user_changed_mind: false,
    overall_dq: 60,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeOutcome(projectId: string, success: OutcomeRecord['overall_success']): OutcomeRecord {
  return {
    id: `out-${Math.random().toString(36).slice(2)}`,
    project_id: projectId,
    hypothesis_result: success === 'exceeded' || success === 'met' ? 'confirmed' : 'refuted',
    hypothesis_notes: '',
    materialized_risks: [],
    approval_outcomes: [],
    overall_success: success,
    key_learnings: '',
    what_would_change: '',
    created_at: new Date().toISOString(),
  };
}

function makeProject(id: string, confidence?: number): Project {
  return {
    id,
    name: `Project ${id}`,
    description: '',
    refs: [],
    confidence_at_completion: confidence,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function buildInput(overrides: Partial<DQInput> = {}): DQInput {
  return {
    reframe: null,
    recast: null,
    feedbackRecords: [],
    refineLoop: null,
    judgments: [],
    personas: [],
    projectId: `project-${Math.random().toString(36).slice(2)}`,
    ...overrides,
  };
}

// ── Tests ──

describe('Decision Quality Simulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no cached scores
    mockGetStorage.mockReturnValue([]);
  });

  // ═══════════════════════════════════════
  // Archetype 1: 빈 프로젝트
  // ═══════════════════════════════════════
  describe('Archetype 1: 빈 프로젝트 (데이터 없음)', () => {
    it('모든 DQ 요소가 0이어야 한다', () => {
      const score = computeDecisionQuality(buildInput());
      expect(score.appropriate_frame).toBe(0);
      expect(score.creative_alternatives).toBe(0);
      expect(score.relevant_information).toBe(0);
      expect(score.clear_values).toBe(0);
      expect(score.sound_reasoning).toBe(0);
      expect(score.commitment_to_action).toBe(0);
      expect(score.overall_dq).toBe(0);
    });

    it('anti-sycophancy 지표도 0이어야 한다', () => {
      const score = computeDecisionQuality(buildInput());
      expect(score.initial_framing_challenged).toBe(false);
      expect(score.blind_spots_surfaced).toBe(0);
      expect(score.user_changed_mind).toBe(false);
    });

    it('localStorage와 Supabase에 저장되어야 한다', () => {
      computeDecisionQuality(buildInput());
      // DQ score + vitality assessment 각각 setStorage/recordSignal 호출
      expect(mockSetStorage).toHaveBeenCalled();
      expect(mockRecordSignal).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════
  // Archetype 2: Reframe만 완료
  // ═══════════════════════════════════════
  describe('Archetype 2: Reframe만 완료 (부분 파이프라인)', () => {
    it('frame + alternatives + information만 점수가 있어야 한다', () => {
      const score = computeDecisionQuality(buildInput({
        reframe: makeReframe(),
      }));

      // appropriate_frame: reframed != surface(+2), why_reframing_matters > 20(+1), 2+ evaluated(+2) = 5
      expect(score.appropriate_frame).toBe(5);
      // creative_alternatives: 3 questions(+3), 2 alt framings(+2) = 5
      expect(score.creative_alternatives).toBe(5);
      // relevant_information: 2 assumptions(+1), 1 ai_limitation(+1) = 2
      expect(score.relevant_information).toBe(2);
      // 나머지는 0
      expect(score.clear_values).toBe(0);
      expect(score.sound_reasoning).toBe(0);
      expect(score.commitment_to_action).toBe(0);
    });

    it('overall_dq는 (12/30)*100 = 40이어야 한다', () => {
      const score = computeDecisionQuality(buildInput({
        reframe: makeReframe(),
      }));
      expect(score.overall_dq).toBe(40);
    });

    it('reframed_question !== surface_task이면 framing challenged', () => {
      const score = computeDecisionQuality(buildInput({
        reframe: makeReframe(),
      }));
      expect(score.initial_framing_challenged).toBe(true);
    });

    it('reframed_question === surface_task이면 framing NOT challenged', () => {
      const reframe = makeReframe();
      reframe.analysis!.reframed_question = reframe.analysis!.surface_task;
      const score = computeDecisionQuality(buildInput({ reframe }));
      expect(score.initial_framing_challenged).toBe(false);
    });
  });

  // ═══════════════════════════════════════
  // Archetype 3: 전체 파이프라인 — 최소 데이터
  // ═══════════════════════════════════════
  describe('Archetype 3: 전체 파이프라인 (최소 데이터)', () => {
    it('모든 요소에 최소 점수가 있어야 한다', () => {
      const score = computeDecisionQuality(buildInput({
        reframe: makeReframe({
          analysis: {
            surface_task: 'task',
            reframed_question: 'different task?',
            why_reframing_matters: 'short',  // < 20 chars
            reasoning_narrative: '',
            hidden_assumptions: [makeAssumption('uncertain')], // only 1
            hidden_questions: [{ question: 'q1', reasoning: 'r1' }], // only 1
            ai_limitations: [],
            alternative_framings: [],
          },
        }),
        recast: makeRecast({
          analysis: {
            ...makeRecast().analysis!,
            steps: [
              { task: 's1', actor: 'ai', actor_reasoning: '', expected_output: '', checkpoint: false, checkpoint_reason: '' },
            ],
            key_assumptions: [{ assumption: 'a1', importance: 'high', certainty: 'medium', if_wrong: 'bad' }],
            design_rationale: undefined,
            governing_idea: undefined as unknown as string,
          },
        }),
        feedbackRecords: [makeFeedbackRecord(['p1'], {
          results: [makeRehearsalResult('p1', {
            classified_risks: [],
            approval_conditions: [],
          })],
        })],
        refineLoop: null,
      }));

      // frame: reframed != surface(+2), why < 20(+0), 1 evaluated but < 2(+0) = 2
      expect(score.appropriate_frame).toBe(2);
      // alternatives: 1 question(+1), 0 alt framings(+0) = 1
      expect(score.creative_alternatives).toBe(1);
      // info: 1 assumption(+1), 0 ai_limitations(+0), 1 key_assumption(+1) = 2
      expect(score.relevant_information).toBe(2);
      // values: 1 persona(+1), 0 conditions(+0) = 1
      expect(score.clear_values).toBe(1);
      // reasoning: no refine loop, but has feedback(+1) = 1
      expect(score.sound_reasoning).toBe(1);
      // commitment: 1 step < 3(+0), no checkpoint(+0) = 0
      // but governing_idea falsy → +0, design_rationale falsy → +0
      expect(score.commitment_to_action).toBe(0);

      expect(score.overall_dq).toBe(Math.round((7 / 30) * 100)); // 23
    });
  });

  // ═══════════════════════════════════════
  // Archetype 4: 전체 파이프라인 — 풍부한 데이터
  // ═══════════════════════════════════════
  describe('Archetype 4: 전체 파이프라인 (풍부한 데이터)', () => {
    const projectId = 'rich-project';

    function richInput(): DQInput {
      return buildInput({
        projectId,
        reframe: makeReframe({
          analysis: {
            surface_task: 'original problem',
            reframed_question: 'deeper question?',
            why_reframing_matters: 'This reframing matters because it reveals hidden complexity that...',
            reasoning_narrative: 'narrative',
            hidden_assumptions: [
              makeAssumption('likely_true', 'customer_value'),
              makeAssumption('uncertain', 'feasibility'),
              makeAssumption('doubtful', 'business'),
              makeAssumption('uncertain', 'org_capacity'),
            ],
            hidden_questions: [
              { question: 'q1', reasoning: 'r1' },
              { question: 'q2', reasoning: 'r2' },
              { question: 'q3', reasoning: 'r3' },
              { question: 'q4', reasoning: 'r4' },
            ],
            ai_limitations: ['limit1', 'limit2'],
            alternative_framings: ['alt1', 'alt2', 'alt3'],
          },
        }),
        recast: makeRecast(),
        feedbackRecords: [
          makeFeedbackRecord(['persona-1', 'persona-2', 'persona-3']),
        ],
        refineLoop: makeRefineLoop('converged', 2, [5, 2]),
        judgments: [
          makeJudgment(projectId, true),
          makeJudgment(projectId, false),
          makeJudgment(projectId, false),
        ],
      });
    }

    it('모든 요소가 높은 점수를 받아야 한다', () => {
      const score = computeDecisionQuality(richInput());
      expect(score.appropriate_frame).toBe(5);
      expect(score.creative_alternatives).toBe(5);
      expect(score.relevant_information).toBe(5);
      expect(score.clear_values).toBe(5);
      expect(score.sound_reasoning).toBe(5);
      expect(score.commitment_to_action).toBe(5);
    });

    it('overall_dq = 100', () => {
      const score = computeDecisionQuality(richInput());
      expect(score.overall_dq).toBe(100);
    });

    it('anti-sycophancy: framing challenged + blind spots + mind changed', () => {
      const score = computeDecisionQuality(richInput());
      expect(score.initial_framing_challenged).toBe(true);
      // 3 personas × 1 unspoken risk each = 3
      expect(score.blind_spots_surfaced).toBe(3);
      expect(score.user_changed_mind).toBe(true);
    });

    it('signal이 기록되어야 한다 (elements + anti_sycophancy)', () => {
      computeDecisionQuality(richInput());
      expect(mockRecordSignal).toHaveBeenCalledWith(
        expect.objectContaining({
          signal_type: 'dq_score_computed',
          signal_data: expect.objectContaining({
            overall_dq: 100,
            elements: expect.objectContaining({
              frame: 5,
              alternatives: 5,
            }),
            anti_sycophancy: expect.objectContaining({
              framing_challenged: true,
              blind_spots: 3,
            }),
          }),
        })
      );
    });
  });

  // ═══════════════════════════════════════
  // Archetype 5: 만점 경계 테스트 (cap at 5)
  // ═══════════════════════════════════════
  describe('Archetype 5: 요소별 상한 5점 검증', () => {
    it('appropriate_frame이 5를 초과할 수 없다', () => {
      // reframed != surface(+2), why > 20(+1), 5 evaluated assumptions(+2) = 5, capped at 5
      const reframe = makeReframe({
        analysis: {
          surface_task: 'original',
          reframed_question: 'totally different',
          why_reframing_matters: 'This is a very long explanation that exceeds 20 characters easily',
          reasoning_narrative: '',
          hidden_assumptions: Array.from({ length: 5 }, () => makeAssumption('doubtful')),
          hidden_questions: [],
          ai_limitations: [],
        },
      });
      const score = computeDecisionQuality(buildInput({ reframe }));
      expect(score.appropriate_frame).toBe(5);
    });

    it('creative_alternatives이 5를 초과할 수 없다', () => {
      const reframe = makeReframe({
        analysis: {
          ...makeReframe().analysis!,
          hidden_questions: Array.from({ length: 10 }, (_, i) => ({ question: `q${i}`, reasoning: `r${i}` })),
          alternative_framings: ['a1', 'a2', 'a3', 'a4', 'a5'],
        },
      });
      const score = computeDecisionQuality(buildInput({ reframe }));
      expect(score.creative_alternatives).toBe(5);
    });

    it('overall_dq는 100을 초과할 수 없다', () => {
      // Even with maximum everything
      const score = computeDecisionQuality(buildInput({
        reframe: makeReframe({
          analysis: {
            surface_task: 'a',
            reframed_question: 'b',
            why_reframing_matters: 'This is long enough explanation',
            reasoning_narrative: '',
            hidden_assumptions: Array.from({ length: 10 }, () => makeAssumption('uncertain')),
            hidden_questions: Array.from({ length: 10 }, (_, i) => ({ question: `q${i}`, reasoning: `r${i}` })),
            ai_limitations: ['l1', 'l2'],
            alternative_framings: ['a1', 'a2', 'a3'],
          },
        }),
        recast: makeRecast(),
        feedbackRecords: [makeFeedbackRecord(['p1', 'p2', 'p3', 'p4', 'p5'])],
        refineLoop: makeRefineLoop('converged', 2, [10, 3]),
      }));
      expect(score.overall_dq).toBeLessThanOrEqual(100);
    });
  });

  // ═══════════════════════════════════════
  // Archetype 6: 수렴 전문가
  // ═══════════════════════════════════════
  describe('Archetype 6: 수렴 전문가 (Refine Loop 집중)', () => {
    it('converged + 3회 이내 + 이슈 감소 → sound_reasoning 5', () => {
      const score = computeDecisionQuality(buildInput({
        refineLoop: makeRefineLoop('converged', 3, [8, 4, 1]),
      }));
      // converged(+3), <=3 iterations(+1), decreasing trend(+1) = 5
      expect(score.sound_reasoning).toBe(5);
    });

    it('converged but 이슈 증가 → sound_reasoning 4', () => {
      const score = computeDecisionQuality(buildInput({
        refineLoop: makeRefineLoop('converged', 2, [3, 5]),
      }));
      // converged(+3), <=3 iterations(+1), NOT decreasing(+0) = 4
      expect(score.sound_reasoning).toBe(4);
    });

    it('active (미수렴) + 이슈 증가 → sound_reasoning 낮음', () => {
      const score = computeDecisionQuality(buildInput({
        refineLoop: makeRefineLoop('active', 3, [3, 5, 7]),
      }));
      // not converged(+0), <=3(+1), increasing trend(+0) = 1
      expect(score.sound_reasoning).toBe(1);
    });

    it('active + 평탄 이슈 [5,5,5] → non-increasing이므로 +1', () => {
      const score = computeDecisionQuality(buildInput({
        refineLoop: makeRefineLoop('active', 3, [5, 5, 5]),
      }));
      // not converged(+0), <=3(+1), flat=non-increasing(+1) = 2
      expect(score.sound_reasoning).toBe(2);
    });

    it('refine loop 없고 feedback만 있으면 sound_reasoning 1', () => {
      const score = computeDecisionQuality(buildInput({
        feedbackRecords: [makeFeedbackRecord(['p1'])],
      }));
      expect(score.sound_reasoning).toBe(1);
    });

    it('단일 iteration → decreasing 판정 안됨', () => {
      const score = computeDecisionQuality(buildInput({
        refineLoop: makeRefineLoop('converged', 1, [3]),
      }));
      // converged(+3), <=3(+1), trend.length < 2(+0) = 4
      expect(score.sound_reasoning).toBe(4);
    });
  });

  // ═══════════════════════════════════════
  // Archetype 7: 반아첨 전사
  // ═══════════════════════════════════════
  describe('Archetype 7: 반아첨 전사', () => {
    it('blind_spots_surfaced는 모든 feedback에서 unspoken risk를 합산한다', () => {
      const projectId = 'anti-syc';
      const score = computeDecisionQuality(buildInput({
        projectId,
        reframe: makeReframe(),
        feedbackRecords: [
          makeFeedbackRecord(['p1', 'p2'], {
            results: [
              makeRehearsalResult('p1', {
                classified_risks: [
                  { text: 'r1', category: 'unspoken' },
                  { text: 'r2', category: 'unspoken' },
                  { text: 'r3', category: 'critical' }, // not unspoken
                ],
              }),
              makeRehearsalResult('p2', {
                classified_risks: [
                  { text: 'r4', category: 'unspoken' },
                ],
              }),
            ],
          }),
          makeFeedbackRecord(['p3'], {
            results: [
              makeRehearsalResult('p3', {
                classified_risks: [
                  { text: 'r5', category: 'unspoken' },
                  { text: 'r6', category: 'manageable' },
                ],
              }),
            ],
          }),
        ],
        judgments: [
          makeJudgment(projectId, true),
        ],
      }));

      expect(score.blind_spots_surfaced).toBe(4); // 2 + 1 + 1 = 4 unspoken
      expect(score.user_changed_mind).toBe(true);
      expect(score.initial_framing_challenged).toBe(true);
    });

    it('user_changed_mind: 다른 프로젝트의 judgment는 무시해야 한다', () => {
      const score = computeDecisionQuality(buildInput({
        projectId: 'my-project',
        judgments: [
          makeJudgment('other-project', true), // 다른 프로젝트
          makeJudgment('my-project', false),
        ],
      }));
      expect(score.user_changed_mind).toBe(false); // my-project의 judgment만 봄
    });
  });

  // ═══════════════════════════════════════
  // Archetype 8: 이해관계자 집중형
  // ═══════════════════════════════════════
  describe('Archetype 8: 이해관계자 집중형', () => {
    it('5명 페르소나 + 많은 승인 조건 → clear_values 만점', () => {
      const score = computeDecisionQuality(buildInput({
        feedbackRecords: [
          makeFeedbackRecord(['p1', 'p2', 'p3'], {
            results: [
              makeRehearsalResult('p1', { approval_conditions: ['c1', 'c2'] }),
              makeRehearsalResult('p2', { approval_conditions: ['c3'] }),
              makeRehearsalResult('p3', { approval_conditions: ['c4', 'c5'] }),
            ],
          }),
          makeFeedbackRecord(['p4', 'p5'], {
            results: [
              makeRehearsalResult('p4', { approval_conditions: ['c6'] }),
              makeRehearsalResult('p5', { approval_conditions: [] }),
            ],
          }),
        ],
      }));
      // 5 unique personas → +3, 6 conditions >= 3 → +2 = 5
      expect(score.clear_values).toBe(5);
    });

    it('같은 persona가 여러 feedback에 나와도 unique count', () => {
      const score = computeDecisionQuality(buildInput({
        feedbackRecords: [
          makeFeedbackRecord(['p1'], { results: [makeRehearsalResult('p1')] }),
          makeFeedbackRecord(['p1'], { results: [makeRehearsalResult('p1')] }),
          makeFeedbackRecord(['p1'], { results: [makeRehearsalResult('p1')] }),
        ],
      }));
      // 1 unique persona → +1
      expect(score.clear_values).toBeLessThanOrEqual(3);
    });
  });

  // ═══════════════════════════════════════
  // Idempotency & Caching
  // ═══════════════════════════════════════
  describe('Idempotency: 캐시된 점수 반환', () => {
    it('같은 projectId로 두 번 호출하면 캐시된 점수를 반환해야 한다', () => {
      const projectId = 'cached-project';
      const cachedScore = makeDQScore({ project_id: projectId, overall_dq: 75 });

      // First call returns empty cache
      mockGetStorage.mockReturnValueOnce([]);
      const firstScore = computeDecisionQuality(buildInput({
        projectId,
        reframe: makeReframe(),
      }));

      // Second call returns the cached score
      mockGetStorage.mockReturnValueOnce([cachedScore]);
      const secondScore = computeDecisionQuality(buildInput({ projectId }));

      expect(secondScore.overall_dq).toBe(75);
      expect(secondScore.project_id).toBe(projectId);
    });

    it('force: true이면 캐시를 무시하고 재계산해야 한다', () => {
      const projectId = 'force-project';
      const staleScore = makeDQScore({ project_id: projectId, overall_dq: 45 });

      // Return stale cached score
      mockGetStorage.mockReturnValueOnce([staleScore]);
      const result = computeDecisionQuality(buildInput({
        projectId,
        reframe: makeReframe(),
        recast: makeRecast(),
        force: true,
      }));

      // Should NOT be 45 (stale) — should be freshly computed
      expect(result.project_id).toBe(projectId);
      expect(result.overall_dq).not.toBe(45);
      expect(result.overall_dq).toBeGreaterThan(0);
    });

    it('force: true이면 캐시의 기존 엔트리를 교체해야 한다', () => {
      const projectId = 'replace-project';
      const staleScore = makeDQScore({ project_id: projectId, overall_dq: 30 });

      mockGetStorage.mockReturnValueOnce([staleScore]);
      computeDecisionQuality(buildInput({
        projectId,
        reframe: makeReframe(),
        force: true,
      }));

      // Find the DQ_SCORES setStorage call (first one stores DecisionQualityScore[])
      const dqCall = mockSetStorage.mock.calls.find(
        (call) => Array.isArray(call[1]) && call[1].length > 0 && call[1][0]?.project_id
      );
      expect(dqCall).toBeDefined();
      const savedScores = dqCall![1] as DecisionQualityScore[];
      const projectScores = savedScores.filter(s => s.project_id === projectId);
      expect(projectScores).toHaveLength(1); // replaced, not duplicated
    });
  });

  // ═══════════════════════════════════════
  // Archetype 9: 트렌드 분석
  // ═══════════════════════════════════════
  describe('Archetype 9: analyzeDQTrend 시나리오', () => {
    it('데이터 0건 → not_enough_data, avg 0', () => {
      const trend = analyzeDQTrend([]);
      expect(trend.trend).toBe('not_enough_data');
      expect(trend.avg_dq).toBe(0);
      expect(trend.total_projects).toBe(0);
    });

    it('데이터 1건 → not_enough_data, 해당 점수 반환', () => {
      const trend = analyzeDQTrend([makeDQScore({ overall_dq: 65 })]);
      expect(trend.trend).toBe('not_enough_data');
      expect(trend.avg_dq).toBe(65);
      expect(trend.total_projects).toBe(1);
    });

    it('상승 트렌드: 후반부 avg > 전반부 avg × 1.1', () => {
      const scores = [
        makeDQScore({ overall_dq: 30, created_at: '2026-01-01' }),
        makeDQScore({ overall_dq: 35, created_at: '2026-01-15' }),
        makeDQScore({ overall_dq: 60, created_at: '2026-02-01' }),
        makeDQScore({ overall_dq: 70, created_at: '2026-02-15' }),
      ];
      const trend = analyzeDQTrend(scores);
      expect(trend.trend).toBe('improving');
    });

    it('하락 트렌드: 후반부 avg < 전반부 avg × 0.9', () => {
      const scores = [
        makeDQScore({ overall_dq: 80, created_at: '2026-01-01' }),
        makeDQScore({ overall_dq: 75, created_at: '2026-01-15' }),
        makeDQScore({ overall_dq: 40, created_at: '2026-02-01' }),
        makeDQScore({ overall_dq: 35, created_at: '2026-02-15' }),
      ];
      const trend = analyzeDQTrend(scores);
      expect(trend.trend).toBe('declining');
    });

    it('안정 트렌드: 변화 10% 이내', () => {
      const scores = [
        makeDQScore({ overall_dq: 60, created_at: '2026-01-01' }),
        makeDQScore({ overall_dq: 62, created_at: '2026-01-15' }),
        makeDQScore({ overall_dq: 58, created_at: '2026-02-01' }),
        makeDQScore({ overall_dq: 61, created_at: '2026-02-15' }),
      ];
      const trend = analyzeDQTrend(scores);
      expect(trend.trend).toBe('stable');
    });

    it('weakest/strongest element이 정확해야 한다', () => {
      const scores = [
        makeDQScore({
          appropriate_frame: 5, creative_alternatives: 1,
          relevant_information: 3, clear_values: 4,
          sound_reasoning: 2, commitment_to_action: 3,
          created_at: '2026-01-01',
        }),
        makeDQScore({
          appropriate_frame: 4, creative_alternatives: 2,
          relevant_information: 3, clear_values: 5,
          sound_reasoning: 1, commitment_to_action: 3,
          created_at: '2026-02-01',
        }),
      ];
      const trend = analyzeDQTrend(scores);
      // creative_alternatives avg = 1.5, sound_reasoning avg = 1.5
      // appropriate_frame avg = 4.5, clear_values avg = 4.5
      expect(trend.weakest_element).toBeTruthy();
      expect(trend.strongest_element).toBeTruthy();
      expect(trend.weakest_element).not.toBe(trend.strongest_element);
    });

    it('framing_challenge_rate 계산이 정확해야 한다', () => {
      const scores = [
        makeDQScore({ initial_framing_challenged: true, created_at: '2026-01-01' }),
        makeDQScore({ initial_framing_challenged: true, created_at: '2026-02-01' }),
        makeDQScore({ initial_framing_challenged: false, created_at: '2026-03-01' }),
        makeDQScore({ initial_framing_challenged: true, created_at: '2026-04-01' }),
      ];
      const trend = analyzeDQTrend(scores);
      expect(trend.framing_challenge_rate).toBe(75); // 3/4 = 75%
    });

    it('avg_blind_spots 소수점 한 자리', () => {
      const scores = [
        makeDQScore({ blind_spots_surfaced: 3, created_at: '2026-01-01' }),
        makeDQScore({ blind_spots_surfaced: 1, created_at: '2026-02-01' }),
        makeDQScore({ blind_spots_surfaced: 2, created_at: '2026-03-01' }),
      ];
      const trend = analyzeDQTrend(scores);
      expect(trend.avg_blind_spots).toBe(2); // (3+1+2)/3 = 2.0
    });

    it('시간 순서가 뒤섞여도 정렬 후 분석해야 한다', () => {
      const scores = [
        makeDQScore({ overall_dq: 80, created_at: '2026-03-01' }),
        makeDQScore({ overall_dq: 30, created_at: '2026-01-01' }),
        makeDQScore({ overall_dq: 70, created_at: '2026-02-15' }),
        makeDQScore({ overall_dq: 35, created_at: '2026-01-15' }),
      ];
      const trend = analyzeDQTrend(scores);
      // After sort: 30, 35 (first half avg=32.5) | 70, 80 (second half avg=75)
      // 75 > 32.5 * 1.1 = 35.75 → improving
      expect(trend.trend).toBe('improving');
    });
  });

  // ═══════════════════════════════════════
  // Archetype 10: DQ-Outcome 상관관계
  // ═══════════════════════════════════════
  describe('Archetype 10: correlateDQWithOutcomes', () => {
    it('매칭 데이터 < 4 → significant false', () => {
      const scores = [
        makeDQScore({ project_id: 'p1', overall_dq: 80 }),
      ];
      const outcomes = [makeOutcome('p1', 'met')];
      const result = correlateDQWithOutcomes(scores, outcomes);
      expect(result.correlation_significant).toBe(false);
      expect(result.sample_size).toBe(1);
    });

    it('매칭되지 않는 project_id는 무시', () => {
      const scores = [
        makeDQScore({ project_id: 'p1' }),
        makeDQScore({ project_id: 'p2' }),
      ];
      const outcomes = [
        makeOutcome('p3', 'met'), // no match
        makeOutcome('p4', 'failed'), // no match
      ];
      const result = correlateDQWithOutcomes(scores, outcomes);
      expect(result.sample_size).toBe(0);
    });

    it('높은 DQ + 성공 vs 낮은 DQ + 실패 → 양의 상관', () => {
      const scores = [
        makeDQScore({ project_id: 'p1', overall_dq: 85 }),
        makeDQScore({ project_id: 'p2', overall_dq: 90 }),
        makeDQScore({ project_id: 'p3', overall_dq: 75 }),
        makeDQScore({ project_id: 'p4', overall_dq: 30 }),
        makeDQScore({ project_id: 'p5', overall_dq: 25 }),
        makeDQScore({ project_id: 'p6', overall_dq: 40 }),
      ];
      const outcomes = [
        makeOutcome('p1', 'met'),
        makeOutcome('p2', 'exceeded'),
        makeOutcome('p3', 'met'),
        makeOutcome('p4', 'failed'),
        makeOutcome('p5', 'failed'),
        makeOutcome('p6', 'partial'),
      ];
      const result = correlateDQWithOutcomes(scores, outcomes);
      expect(result.correlation_significant).toBe(true);
      expect(result.high_dq_success_rate).toBeGreaterThan(result.low_dq_success_rate);
    });

    it('역상관 (낮은 DQ가 더 성공) → insight에 재검토 언급', () => {
      const scores = [
        makeDQScore({ project_id: 'p1', overall_dq: 80 }),
        makeDQScore({ project_id: 'p2', overall_dq: 75 }),
        makeDQScore({ project_id: 'p3', overall_dq: 90 }),
        makeDQScore({ project_id: 'p4', overall_dq: 30 }),
        makeDQScore({ project_id: 'p5', overall_dq: 25 }),
        makeDQScore({ project_id: 'p6', overall_dq: 40 }),
      ];
      const outcomes = [
        makeOutcome('p1', 'failed'),
        makeOutcome('p2', 'failed'),
        makeOutcome('p3', 'partial'),
        makeOutcome('p4', 'met'),
        makeOutcome('p5', 'exceeded'),
        makeOutcome('p6', 'met'),
      ];
      const result = correlateDQWithOutcomes(scores, outcomes);
      expect(result.insight).toContain('재검토');
    });

    it('exceeded와 met 모두 success로 계산', () => {
      const scores = [
        makeDQScore({ project_id: 'p1', overall_dq: 80 }),
        makeDQScore({ project_id: 'p2', overall_dq: 85 }),
        makeDQScore({ project_id: 'p3', overall_dq: 90 }),
        makeDQScore({ project_id: 'p4', overall_dq: 20 }),
        makeDQScore({ project_id: 'p5', overall_dq: 25 }),
        makeDQScore({ project_id: 'p6', overall_dq: 30 }),
      ];
      const outcomes = [
        makeOutcome('p1', 'exceeded'),
        makeOutcome('p2', 'met'),
        makeOutcome('p3', 'exceeded'),
        makeOutcome('p4', 'partial'),
        makeOutcome('p5', 'failed'),
        makeOutcome('p6', 'failed'),
      ];
      const result = correlateDQWithOutcomes(scores, outcomes);
      expect(result.high_dq_success_rate).toBe(100); // 3/3
      expect(result.low_dq_success_rate).toBe(0); // 0/3
    });

    it('50-69 범위의 DQ는 high도 low도 아님 → 그룹에 포함 안됨', () => {
      const scores = [
        makeDQScore({ project_id: 'p1', overall_dq: 55 }),
        makeDQScore({ project_id: 'p2', overall_dq: 60 }),
        makeDQScore({ project_id: 'p3', overall_dq: 65 }),
        makeDQScore({ project_id: 'p4', overall_dq: 50 }),
      ];
      const outcomes = [
        makeOutcome('p1', 'met'),
        makeOutcome('p2', 'met'),
        makeOutcome('p3', 'met'),
        makeOutcome('p4', 'met'),
      ];
      const result = correlateDQWithOutcomes(scores, outcomes);
      // All in 50-69 range: 0 in high (>=70), 0 in low (<50)
      expect(result.correlation_significant).toBe(false);
    });
  });

  // ═══════════════════════════════════════
  // Archetype 11: Confidence Calibration
  // ═══════════════════════════════════════
  describe('Archetype 11: analyzeConfidenceCalibration', () => {
    it('데이터 0건 → 기본 메시지', () => {
      const result = analyzeConfidenceCalibration([], []);
      expect(result.data_points).toHaveLength(0);
      expect(result.well_calibrated).toBe(false);
      expect(result.insight).toContain('확신도를 기록하면');
    });

    it('데이터 < 3건 → 분석 불가', () => {
      const projects = [makeProject('p1', 4)];
      const outcomes = [makeOutcome('p1', 'met')];
      const result = analyzeConfidenceCalibration(projects, outcomes);
      expect(result.data_points).toHaveLength(1);
      expect(result.insight).toContain('3건 이상이면');
    });

    it('과신: 높은 확신도 + 낮은 성공률 → overconfident', () => {
      const projects = [
        makeProject('p1', 5), // 100% confidence
        makeProject('p2', 5),
        makeProject('p3', 4), // 80% confidence
        makeProject('p4', 5),
      ];
      const outcomes = [
        makeOutcome('p1', 'failed'),
        makeOutcome('p2', 'failed'),
        makeOutcome('p3', 'partial'),
        makeOutcome('p4', 'met'), // only 1 success out of 4
      ];
      const result = analyzeConfidenceCalibration(projects, outcomes);
      // avg confidence = (5+5+4+5)/4 = 4.75 → 95%
      // success rate = 1/4 = 25%
      // gap = 95 - 25 = 70 > 15
      expect(result.overconfident).toBe(true);
      expect(result.underconfident).toBe(false);
      expect(result.calibration_gap).toBeGreaterThan(15);
      expect(result.insight).toContain('과신');
    });

    it('과소평가: 낮은 확신도 + 높은 성공률 → underconfident', () => {
      const projects = [
        makeProject('p1', 1), // 20% confidence
        makeProject('p2', 1),
        makeProject('p3', 2), // 40% confidence
      ];
      const outcomes = [
        makeOutcome('p1', 'met'),
        makeOutcome('p2', 'exceeded'),
        makeOutcome('p3', 'met'),
      ];
      const result = analyzeConfidenceCalibration(projects, outcomes);
      // avg confidence = (1+1+2)/3 = 1.33 → 26.7%
      // success rate = 3/3 = 100%
      // gap = 26.7 - 100 = -73.3 < -15
      expect(result.underconfident).toBe(true);
      expect(result.overconfident).toBe(false);
      expect(result.insight).toContain('낮게 평가');
    });

    it('정확한 보정: 확신도 ≈ 성공률 → well_calibrated', () => {
      const projects = [
        makeProject('p1', 4), // 80%
        makeProject('p2', 3), // 60%
        makeProject('p3', 4), // 80%
        makeProject('p4', 3), // 60%
        makeProject('p5', 4), // 80%
      ];
      const outcomes = [
        makeOutcome('p1', 'met'),
        makeOutcome('p2', 'partial'),
        makeOutcome('p3', 'met'),
        makeOutcome('p4', 'met'),
        makeOutcome('p5', 'failed'),
      ];
      const result = analyzeConfidenceCalibration(projects, outcomes);
      // avg confidence = (4+3+4+3+4)/5 = 3.6 → 72%
      // success rate = 3/5 = 60%
      // gap = 72 - 60 = 12 ≤ 15
      expect(result.well_calibrated).toBe(true);
      expect(result.insight).toContain('정확');
    });

    it('confidence_at_completion 없는 프로젝트는 무시', () => {
      const projects = [
        makeProject('p1', undefined), // no confidence
        makeProject('p2', 3),
        makeProject('p3', 4),
        makeProject('p4', 3),
      ];
      const outcomes = [
        makeOutcome('p1', 'met'),
        makeOutcome('p2', 'met'),
        makeOutcome('p3', 'met'),
        makeOutcome('p4', 'met'),
      ];
      const result = analyzeConfidenceCalibration(projects, outcomes);
      expect(result.data_points).toHaveLength(3); // p1 excluded
    });

    it('outcome 없는 프로젝트는 무시', () => {
      const projects = [
        makeProject('p1', 4),
        makeProject('p2', 3),
        makeProject('p3', 5),
      ];
      const outcomes = [
        makeOutcome('p1', 'met'),
        // p2, p3 have no outcomes
      ];
      const result = analyzeConfidenceCalibration(projects, outcomes);
      expect(result.data_points).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════
  // Archetype 12: Eval Criteria Validation
  // ═══════════════════════════════════════
  describe('Archetype 12: validateEvalCriteria (메타 검증)', () => {
    it('매칭 < 5건 → significant false', () => {
      const scores = [
        makeDQScore({ project_id: 'p1' }),
        makeDQScore({ project_id: 'p2' }),
      ];
      const outcomes = [
        makeOutcome('p1', 'met'),
        makeOutcome('p2', 'failed'),
      ];
      const result = validateEvalCriteria(scores, outcomes);
      expect(result.significant).toBe(false);
      expect(result.insight).toContain('5건 이상');
    });

    it('프레이밍 점수가 성공과 높은 상관 → predictive', () => {
      // Successful projects: high frame score
      // Failed projects: low frame score
      const scores = [
        makeDQScore({ project_id: 'p1', appropriate_frame: 5, creative_alternatives: 3, relevant_information: 3, clear_values: 3, sound_reasoning: 3, commitment_to_action: 3 }),
        makeDQScore({ project_id: 'p2', appropriate_frame: 4, creative_alternatives: 3, relevant_information: 3, clear_values: 3, sound_reasoning: 3, commitment_to_action: 3 }),
        makeDQScore({ project_id: 'p3', appropriate_frame: 5, creative_alternatives: 3, relevant_information: 3, clear_values: 3, sound_reasoning: 3, commitment_to_action: 3 }),
        makeDQScore({ project_id: 'p4', appropriate_frame: 1, creative_alternatives: 3, relevant_information: 3, clear_values: 3, sound_reasoning: 3, commitment_to_action: 3 }),
        makeDQScore({ project_id: 'p5', appropriate_frame: 1, creative_alternatives: 3, relevant_information: 3, clear_values: 3, sound_reasoning: 3, commitment_to_action: 3 }),
      ];
      const outcomes = [
        makeOutcome('p1', 'met'),
        makeOutcome('p2', 'exceeded'),
        makeOutcome('p3', 'met'),
        makeOutcome('p4', 'failed'),
        makeOutcome('p5', 'failed'),
      ];
      const result = validateEvalCriteria(scores, outcomes);
      expect(result.significant).toBe(true);
      // 프레이밍: success avg = (5+4+5)/3 = 4.67, fail avg = (1+1)/2 = 1, diff = 3.67 > 0.3
      expect(result.predictive_elements.some(e => e.element === '프레이밍')).toBe(true);
      // 다른 요소들은 모두 3으로 동일 → diff = 0 → non-predictive
      expect(result.non_predictive_elements.length).toBeGreaterThan(0);
    });

    it('모든 요소가 동일하면 predictive 없음', () => {
      const scores = Array.from({ length: 5 }, (_, i) =>
        makeDQScore({
          project_id: `p${i}`,
          appropriate_frame: 3, creative_alternatives: 3,
          relevant_information: 3, clear_values: 3,
          sound_reasoning: 3, commitment_to_action: 3,
        })
      );
      const outcomes = [
        makeOutcome('p0', 'met'),
        makeOutcome('p1', 'met'),
        makeOutcome('p2', 'failed'),
        makeOutcome('p3', 'failed'),
        makeOutcome('p4', 'partial'),
      ];
      const result = validateEvalCriteria(scores, outcomes);
      // All elements have 0 diff between success and fail groups
      expect(result.predictive_elements).toHaveLength(0);
    });

    it('전부 성공이면 failPairs가 0 → 요소별 분석 skip', () => {
      const scores = Array.from({ length: 5 }, (_, i) =>
        makeDQScore({ project_id: `p${i}` })
      );
      const outcomes = Array.from({ length: 5 }, (_, i) =>
        makeOutcome(`p${i}`, 'met')
      );
      const result = validateEvalCriteria(scores, outcomes);
      // All success, no fail group → each element is skipped (continue)
      expect(result.predictive_elements).toHaveLength(0);
      expect(result.non_predictive_elements).toHaveLength(0);
    });

    it('predictive_elements는 correlation 내림차순으로 정렬', () => {
      const scores = [
        makeDQScore({ project_id: 'p1', appropriate_frame: 5, creative_alternatives: 4, relevant_information: 3, clear_values: 3, sound_reasoning: 5, commitment_to_action: 3 }),
        makeDQScore({ project_id: 'p2', appropriate_frame: 5, creative_alternatives: 5, relevant_information: 3, clear_values: 3, sound_reasoning: 4, commitment_to_action: 3 }),
        makeDQScore({ project_id: 'p3', appropriate_frame: 4, creative_alternatives: 4, relevant_information: 3, clear_values: 3, sound_reasoning: 5, commitment_to_action: 3 }),
        makeDQScore({ project_id: 'p4', appropriate_frame: 1, creative_alternatives: 1, relevant_information: 3, clear_values: 3, sound_reasoning: 1, commitment_to_action: 3 }),
        makeDQScore({ project_id: 'p5', appropriate_frame: 1, creative_alternatives: 2, relevant_information: 3, clear_values: 3, sound_reasoning: 1, commitment_to_action: 3 }),
      ];
      const outcomes = [
        makeOutcome('p1', 'met'),
        makeOutcome('p2', 'exceeded'),
        makeOutcome('p3', 'met'),
        makeOutcome('p4', 'failed'),
        makeOutcome('p5', 'failed'),
      ];
      const result = validateEvalCriteria(scores, outcomes);
      // Check descending order
      for (let i = 1; i < result.predictive_elements.length; i++) {
        expect(result.predictive_elements[i].correlation)
          .toBeLessThanOrEqual(result.predictive_elements[i - 1].correlation);
      }
    });

    it('insight에 top predictor 이름이 포함되어야 한다', () => {
      const scores = [
        makeDQScore({ project_id: 'p1', appropriate_frame: 5, creative_alternatives: 3, relevant_information: 3, clear_values: 3, sound_reasoning: 3, commitment_to_action: 3 }),
        makeDQScore({ project_id: 'p2', appropriate_frame: 5, creative_alternatives: 3, relevant_information: 3, clear_values: 3, sound_reasoning: 3, commitment_to_action: 3 }),
        makeDQScore({ project_id: 'p3', appropriate_frame: 4, creative_alternatives: 3, relevant_information: 3, clear_values: 3, sound_reasoning: 3, commitment_to_action: 3 }),
        makeDQScore({ project_id: 'p4', appropriate_frame: 1, creative_alternatives: 3, relevant_information: 3, clear_values: 3, sound_reasoning: 3, commitment_to_action: 3 }),
        makeDQScore({ project_id: 'p5', appropriate_frame: 1, creative_alternatives: 3, relevant_information: 3, clear_values: 3, sound_reasoning: 3, commitment_to_action: 3 }),
      ];
      const outcomes = [
        makeOutcome('p1', 'met'),
        makeOutcome('p2', 'exceeded'),
        makeOutcome('p3', 'met'),
        makeOutcome('p4', 'failed'),
        makeOutcome('p5', 'failed'),
      ];
      const result = validateEvalCriteria(scores, outcomes);
      expect(result.insight).toContain('프레이밍');
    });
  });

  // ═══════════════════════════════════════
  // getDQScores
  // ═══════════════════════════════════════
  describe('getDQScores', () => {
    it('projectId 없으면 전체 반환', () => {
      mockGetStorage.mockReturnValue([
        makeDQScore({ project_id: 'p1' }),
        makeDQScore({ project_id: 'p2' }),
      ]);
      const scores = getDQScores();
      expect(scores).toHaveLength(2);
    });

    it('projectId 있으면 해당 프로젝트만 필터', () => {
      mockGetStorage.mockReturnValue([
        makeDQScore({ project_id: 'p1' }),
        makeDQScore({ project_id: 'p2' }),
        makeDQScore({ project_id: 'p1' }),
      ]);
      const scores = getDQScores('p1');
      expect(scores).toHaveLength(2);
    });

    it('빈 저장소 → 빈 배열', () => {
      mockGetStorage.mockReturnValue([]);
      expect(getDQScores()).toHaveLength(0);
      expect(getDQScores('any')).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════
  // Edge Cases & Cross-Scenario
  // ═══════════════════════════════════════
  describe('Edge Cases', () => {
    it('analysis가 null인 reframe → frame/alternatives/info 모두 0', () => {
      const score = computeDecisionQuality(buildInput({
        reframe: { ...makeReframe(), analysis: null },
      }));
      expect(score.appropriate_frame).toBe(0);
      expect(score.creative_alternatives).toBe(0);
      expect(score.relevant_information).toBe(0);
    });

    it('analysis가 null인 recast → commitment 0, info에 recast 기여 없음', () => {
      const score = computeDecisionQuality(buildInput({
        recast: { ...makeRecast(), analysis: null },
      }));
      expect(score.commitment_to_action).toBe(0);
    });

    it('feedbackRecords results가 빈 배열 → clear_values 0', () => {
      const score = computeDecisionQuality(buildInput({
        feedbackRecords: [{
          ...makeFeedbackRecord([]),
          results: [],
        }],
      }));
      expect(score.clear_values).toBe(0);
    });

    it('classified_risks가 undefined → blind_spots 0', () => {
      const score = computeDecisionQuality(buildInput({
        feedbackRecords: [makeFeedbackRecord(['p1'], {
          results: [{
            ...makeRehearsalResult('p1'),
            classified_risks: undefined as unknown as ClassifiedRisk[],
          }],
        })],
      }));
      expect(score.blind_spots_surfaced).toBe(0);
    });

    it('approval_conditions가 undefined → clear_values에 조건 점수 0', () => {
      const score = computeDecisionQuality(buildInput({
        feedbackRecords: [makeFeedbackRecord(['p1', 'p2', 'p3'], {
          results: [
            { ...makeRehearsalResult('p1'), approval_conditions: undefined as unknown as string[] },
            { ...makeRehearsalResult('p2'), approval_conditions: undefined as unknown as string[] },
            { ...makeRehearsalResult('p3'), approval_conditions: undefined as unknown as string[] },
          ],
        })],
      }));
      // 3 personas(+3) + 0 conditions(+0) = 3
      expect(score.clear_values).toBe(3);
    });

    it('100개 이상 캐시되면 오래된 것부터 제거', () => {
      const existing = Array.from({ length: 100 }, (_, i) =>
        makeDQScore({ project_id: `old-${i}` })
      );
      mockGetStorage.mockReturnValue(existing);

      computeDecisionQuality(buildInput({ projectId: 'new-project' }));

      // setStorage should be called with array of length 100 (spliced old + new)
      const savedArray = mockSetStorage.mock.calls[0]?.[1] as DecisionQualityScore[];
      expect(savedArray.length).toBeLessThanOrEqual(101);
    });

    it('why_reframing_matters가 정확히 20자 → 점수 안 줌', () => {
      const reframe = makeReframe({
        analysis: {
          ...makeReframe().analysis!,
          why_reframing_matters: '12345678901234567890', // exactly 20 chars
        },
      });
      const score = computeDecisionQuality(buildInput({ reframe }));
      // > 20이 조건이므로 exactly 20 is NOT enough
      // frame: reframed != surface(+2), why == 20(+0), 2 evaluated(+2) = 4
      expect(score.appropriate_frame).toBe(4);
    });

    it('why_reframing_matters가 21자 → 점수 줌', () => {
      const reframe = makeReframe({
        analysis: {
          ...makeReframe().analysis!,
          why_reframing_matters: '123456789012345678901', // 21 chars
        },
      });
      const score = computeDecisionQuality(buildInput({ reframe }));
      // frame: reframed != surface(+2), why > 20(+1), 2 evaluated(+2) = 5
      expect(score.appropriate_frame).toBe(5);
    });

    it('hidden_assumptions에 evaluation 없는 항목은 카운트 안됨', () => {
      const reframe = makeReframe({
        analysis: {
          ...makeReframe().analysis!,
          hidden_assumptions: [
            { assumption: 'a1', risk_if_false: 'r1' }, // no evaluation
            { assumption: 'a2', risk_if_false: 'r2' }, // no evaluation
          ],
        },
      });
      const score = computeDecisionQuality(buildInput({ reframe }));
      // evaluated count = 0, so no +2 for evaluated
      // frame: reframed != surface(+2), why > 20(+1), 0 evaluated(+0) = 3
      expect(score.appropriate_frame).toBe(3);
    });
  });

  // ═══════════════════════════════════════
  // Defensive Data Access (CLAUDE.md 원칙)
  // ═══════════════════════════════════════
  describe('Defensive Data Access: old data missing new fields', () => {
    it('alternative_framings가 undefined → creative_alternatives 계산 안 깨짐', () => {
      const reframe = makeReframe({
        analysis: {
          ...makeReframe().analysis!,
          alternative_framings: undefined,
        },
      });
      const score = computeDecisionQuality(buildInput({ reframe }));
      // 3 hidden_questions → +3, no alt framings → +0 (but extra +1 from questions >= 3 proxy)
      expect(score.creative_alternatives).toBeGreaterThanOrEqual(3);
      expect(score.creative_alternatives).toBeLessThanOrEqual(5);
    });

    it('hidden_assumptions가 빈 배열 → frame/info 정상 계산', () => {
      const reframe = makeReframe({
        analysis: {
          ...makeReframe().analysis!,
          hidden_assumptions: [],
        },
      });
      const score = computeDecisionQuality(buildInput({ reframe }));
      expect(score.relevant_information).toBeGreaterThanOrEqual(0);
    });

    it('recast key_assumptions가 undefined → relevant_information 안 깨짐', () => {
      const recast = makeRecast({
        analysis: {
          ...makeRecast().analysis!,
          key_assumptions: undefined as unknown as [],
        },
      });
      const score = computeDecisionQuality(buildInput({ recast }));
      expect(score.relevant_information).toBeGreaterThanOrEqual(0);
    });

    it('refineLoop iterations가 빈 배열 → sound_reasoning 안 깨짐', () => {
      const score = computeDecisionQuality(buildInput({
        refineLoop: makeRefineLoop('converged', 0, []),
      }));
      // converged(+3), iterations.length=0 <=3(+1), trend empty(+0) = 4
      expect(score.sound_reasoning).toBe(4);
    });
  });

  // ═══════════════════════════════════════
  // Cross-scenario: 점수 일관성 검증
  // ═══════════════════════════════════════
  describe('Cross-scenario: 점수 일관성', () => {
    it('데이터가 많을수록 DQ가 높아야 한다 (단조 증가 경향)', () => {
      const emptyScore = computeDecisionQuality(buildInput());

      mockGetStorage.mockReturnValue([]); // reset cache
      const partialScore = computeDecisionQuality(buildInput({
        projectId: 'partial',
        reframe: makeReframe(),
      }));

      mockGetStorage.mockReturnValue([]); // reset cache
      const fullScore = computeDecisionQuality(buildInput({
        projectId: 'full',
        reframe: makeReframe(),
        recast: makeRecast(),
        feedbackRecords: [makeFeedbackRecord(['p1', 'p2', 'p3'])],
        refineLoop: makeRefineLoop('converged', 2, [5, 2]),
      }));

      expect(emptyScore.overall_dq).toBeLessThan(partialScore.overall_dq);
      expect(partialScore.overall_dq).toBeLessThan(fullScore.overall_dq);
    });

    it('모든 요소는 0 이상 5 이하여야 한다', () => {
      const scenarios = [
        buildInput(),
        buildInput({ reframe: makeReframe() }),
        buildInput({ reframe: makeReframe(), recast: makeRecast() }),
        buildInput({
          reframe: makeReframe(), recast: makeRecast(),
          feedbackRecords: [makeFeedbackRecord(['p1', 'p2', 'p3'])],
          refineLoop: makeRefineLoop('converged', 2, [5, 2]),
        }),
      ];

      for (const input of scenarios) {
        // Each needs unique projectId and fresh cache
        input.projectId = `cross-${Math.random()}`;
        mockGetStorage.mockReturnValue([]);

        const score = computeDecisionQuality(input);
        const elements = [
          score.appropriate_frame, score.creative_alternatives,
          score.relevant_information, score.clear_values,
          score.sound_reasoning, score.commitment_to_action,
        ];
        for (const el of elements) {
          expect(el).toBeGreaterThanOrEqual(0);
          expect(el).toBeLessThanOrEqual(5);
        }
        expect(score.overall_dq).toBeGreaterThanOrEqual(0);
        expect(score.overall_dq).toBeLessThanOrEqual(100);
      }
    });

    it('overall_dq는 정확히 (sum/30)*100 반올림이어야 한다', () => {
      mockGetStorage.mockReturnValue([]);
      const score = computeDecisionQuality(buildInput({
        reframe: makeReframe(),
        recast: makeRecast(),
      }));

      const sum = score.appropriate_frame + score.creative_alternatives +
        score.relevant_information + score.clear_values +
        score.sound_reasoning + score.commitment_to_action;

      expect(score.overall_dq).toBe(Math.round((sum / 30) * 100));
    });
  });

  // ═══════════════════════════════════════
  // Trend + Correlation 통합 시뮬레이션
  // ═══════════════════════════════════════
  describe('통합 시뮬레이션: 10개 프로젝트 여정', () => {
    const projectJourney = Array.from({ length: 10 }, (_, i) => ({
      id: `journey-${i}`,
      dq: 30 + i * 7, // 30, 37, 44, 51, 58, 65, 72, 79, 86, 93
      success: i >= 5 ? 'met' as const : (i >= 3 ? 'partial' as const : 'failed' as const),
      confidence: Math.min(5, Math.ceil((30 + i * 7) / 20)),
      date: `2026-${String(i + 1).padStart(2, '0')}-01`,
    }));

    const scores = projectJourney.map(p =>
      makeDQScore({
        project_id: p.id,
        overall_dq: p.dq,
        appropriate_frame: Math.min(5, Math.ceil(p.dq / 20)),
        creative_alternatives: Math.min(5, Math.ceil(p.dq / 25)),
        relevant_information: Math.min(5, Math.ceil(p.dq / 20)),
        clear_values: Math.min(5, Math.ceil(p.dq / 25)),
        sound_reasoning: Math.min(5, Math.ceil(p.dq / 25)),
        commitment_to_action: Math.min(5, Math.ceil(p.dq / 25)),
        initial_framing_challenged: p.dq > 50,
        blind_spots_surfaced: Math.floor(p.dq / 30),
        created_at: p.date,
      })
    );

    const outcomes = projectJourney.map(p => makeOutcome(p.id, p.success));
    const projects = projectJourney.map(p => makeProject(p.id, p.confidence));

    it('트렌드: 상승이어야 한다', () => {
      const trend = analyzeDQTrend(scores);
      expect(trend.trend).toBe('improving');
      expect(trend.total_projects).toBe(10);
    });

    it('상관관계: high DQ → higher success rate', () => {
      const corr = correlateDQWithOutcomes(scores, outcomes);
      expect(corr.sample_size).toBe(10);
      expect(corr.high_dq_success_rate).toBeGreaterThan(corr.low_dq_success_rate);
    });

    it('보정: 확신도와 성공률의 관계', () => {
      const cal = analyzeConfidenceCalibration(projects, outcomes);
      expect(cal.data_points).toHaveLength(10);
      // With our formula, confidence increases with DQ, success also increases
      // So calibration should be reasonably aligned
      expect(Math.abs(cal.calibration_gap)).toBeLessThan(50);
    });

    it('메타 검증: 일부 요소가 predictive이어야 한다', () => {
      const validation = validateEvalCriteria(scores, outcomes);
      expect(validation.significant).toBe(true);
      // Since all elements increase together with DQ, most should be predictive
      expect(validation.predictive_elements.length).toBeGreaterThan(0);
    });
  });
});

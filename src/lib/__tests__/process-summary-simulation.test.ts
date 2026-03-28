/**
 * Process Summary Simulation — 의사결정 프로세스 요약 시뮬레이션
 *
 * buildProcessSummary 핵심 검증:
 * - 프로젝트 찾기 실패 → null
 * - Ref 기반 lookup vs fallback (최신 done 항목)
 * - 각 단계별 데이터 추출 정확성
 * - DQ 요소 min/max 계산
 * - 완성도 카운팅
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Project, ReframeItem, RecastItem, FeedbackRecord, RefineLoop, DecisionQualityScore } from '@/stores/types';

const mockGetStorage = vi.fn((): unknown => []);

vi.mock('@/lib/storage', () => ({
  getStorage: (...args: unknown[]) => mockGetStorage(...args),
  setStorage: vi.fn(),
  STORAGE_KEYS: {
    PROJECTS: 'sot_projects',
    REFRAME_LIST: 'sot_reframe_list',
    RECAST_LIST: 'sot_recast_list',
    FEEDBACK_HISTORY: 'sot_feedback_history',
    REFINE_LOOPS: 'sot_refine_loops',
    DQ_SCORES: 'sot_dq_scores',
  },
}));

vi.mock('@/lib/decision-quality', () => ({
  getDQScores: vi.fn(() => []),
}));

vi.mock('@/lib/db', () => ({
  insertToSupabase: vi.fn(),
}));

import { buildProcessSummary } from '@/lib/process-summary';
import { getDQScores } from '@/lib/decision-quality';

const mockGetDQ = vi.mocked(getDQScores);

function setupStorage(data: Record<string, unknown[]>) {
  mockGetStorage.mockImplementation((key: string, fallback?: unknown) => data[key] || fallback || []);
}

function makeProject(id: string, refs: Project['refs'] = []): Project {
  return { id, name: `Project ${id}`, description: '', refs, created_at: '', updated_at: '' };
}

function makeDQ(overrides: Partial<DecisionQualityScore> = {}): DecisionQualityScore {
  return {
    id: 'dq-1', project_id: 'p1', overall_dq: 60,
    appropriate_frame: 3, creative_alternatives: 3, relevant_information: 3,
    clear_values: 3, sound_reasoning: 3, commitment_to_action: 3,
    initial_framing_challenged: true, blind_spots_surfaced: 1, user_changed_mind: false,
    created_at: '', ...overrides,
  };
}

describe('Process Summary Simulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStorage.mockReturnValue([]);
    mockGetDQ.mockReturnValue([]);
  });

  it('프로젝트 없으면 null', () => {
    setupStorage({ sot_projects: [] });
    expect(buildProcessSummary('nonexistent')).toBeNull();
  });

  describe('빈 프로젝트 (데이터 없음)', () => {
    it('모든 값이 0/null/빈 배열', () => {
      setupStorage({ sot_projects: [makeProject('p1')] });
      const result = buildProcessSummary('p1')!;
      expect(result.project_name).toBe('Project p1');
      expect(result.assumptions_found).toBe(0);
      expect(result.assumptions_evaluated).toBe(0);
      expect(result.axes_covered).toEqual([]);
      expect(result.axes_missing).toEqual(['customer_value', 'feasibility', 'business', 'org_capacity']);
      expect(result.steps_designed).toBe(0);
      expect(result.has_checkpoints).toBe(false);
      expect(result.personas_used).toBe(0);
      expect(result.risks_identified).toEqual({ critical: 0, manageable: 0, unspoken: 0 });
      expect(result.convergence_iterations).toBe(0);
      expect(result.converged).toBe(false);
      expect(result.dq_score).toBeNull();
      expect(result.strongest_element).toBeNull();
      expect(result.weakest_element).toBeNull();
      expect(result.steps_completed).toBe(0);
      expect(result.total_steps).toBe(4);
    });
  });

  describe('Ref 기반 lookup vs fallback', () => {
    it('ref가 있으면 해당 ID의 done 항목 사용', () => {
      const project = makeProject('p1', [
        { tool: 'reframe', itemId: 'rf-target', label: '', linkedAt: '' },
      ]);
      setupStorage({
        sot_projects: [project],
        sot_reframe_list: [
          { id: 'rf-other', status: 'done', analysis: { hidden_assumptions: [{ assumption: 'wrong', risk_if_false: 'r' }], hidden_questions: [], ai_limitations: [] }, input_text: '', selected_question: '', created_at: '', updated_at: '' },
          { id: 'rf-target', status: 'done', analysis: { hidden_assumptions: [{ assumption: 'a1', risk_if_false: 'r', evaluation: 'uncertain', axis: 'business' }, { assumption: 'a2', risk_if_false: 'r' }], hidden_questions: [], ai_limitations: [] }, input_text: '', selected_question: '', created_at: '', updated_at: '' },
        ],
      });
      const result = buildProcessSummary('p1')!;
      expect(result.assumptions_found).toBe(2);
      expect(result.assumptions_evaluated).toBe(1); // only a1 has evaluation
      expect(result.axes_covered).toEqual(['business']);
    });

    it('ref ID가 없으면 최신 done 항목 fallback', () => {
      setupStorage({
        sot_projects: [makeProject('p1')],
        sot_reframe_list: [
          { id: 'rf-1', status: 'done', analysis: { hidden_assumptions: [{ assumption: 'a1', risk_if_false: 'r' }] }, input_text: '', selected_question: '', created_at: '', updated_at: '' },
          { id: 'rf-2', status: 'done', analysis: { hidden_assumptions: [{ assumption: 'a1', risk_if_false: 'r' }, { assumption: 'a2', risk_if_false: 'r' }] }, input_text: '', selected_question: '', created_at: '', updated_at: '' },
        ],
      });
      const result = buildProcessSummary('p1')!;
      // rf-2 is last done → 2 assumptions
      expect(result.assumptions_found).toBe(2);
    });

    it('ref ID가 있지만 status가 done이 아니면 fallback', () => {
      const project = makeProject('p1', [
        { tool: 'reframe', itemId: 'rf-pending', label: '', linkedAt: '' },
      ]);
      setupStorage({
        sot_projects: [project],
        sot_reframe_list: [
          { id: 'rf-pending', status: 'pending', analysis: null, input_text: '', selected_question: '', created_at: '', updated_at: '' },
          { id: 'rf-done', status: 'done', analysis: { hidden_assumptions: [{ assumption: 'a', risk_if_false: 'r' }] }, input_text: '', selected_question: '', created_at: '', updated_at: '' },
        ],
      });
      const result = buildProcessSummary('p1')!;
      expect(result.assumptions_found).toBe(1); // fallback to rf-done
    });
  });

  describe('Reframe 데이터 추출', () => {
    it('축 커버리지 계산', () => {
      setupStorage({
        sot_projects: [makeProject('p1')],
        sot_reframe_list: [{
          id: 'rf-1', status: 'done', input_text: '', selected_question: '', created_at: '', updated_at: '',
          analysis: {
            hidden_assumptions: [
              { assumption: 'a1', risk_if_false: 'r', axis: 'customer_value' },
              { assumption: 'a2', risk_if_false: 'r', axis: 'feasibility' },
              { assumption: 'a3', risk_if_false: 'r', axis: 'customer_value' }, // duplicate axis
            ],
          },
        }],
      });
      const result = buildProcessSummary('p1')!;
      expect(result.axes_covered).toEqual(['customer_value', 'feasibility']);
      expect(result.axes_missing).toEqual(['business', 'org_capacity']);
    });

    it('axis 없는 가정은 커버리지에 안 들어감', () => {
      setupStorage({
        sot_projects: [makeProject('p1')],
        sot_reframe_list: [{
          id: 'rf-1', status: 'done', input_text: '', selected_question: '', created_at: '', updated_at: '',
          analysis: {
            hidden_assumptions: [
              { assumption: 'a1', risk_if_false: 'r' }, // no axis
            ],
          },
        }],
      });
      const result = buildProcessSummary('p1')!;
      expect(result.axes_covered).toEqual([]);
      expect(result.axes_missing).toHaveLength(4);
    });
  });

  describe('Recast 데이터 추출', () => {
    it('step 수와 checkpoint 감지', () => {
      setupStorage({
        sot_projects: [makeProject('p1')],
        sot_recast_list: [{
          id: 'rc-1', status: 'done', input_text: '', steps: [], created_at: '', updated_at: '',
          analysis: {
            steps: [
              { task: 's1', actor: 'ai', checkpoint: true, checkpoint_reason: '', actor_reasoning: '', expected_output: '' },
              { task: 's2', actor: 'human', checkpoint: false, checkpoint_reason: '', actor_reasoning: '', expected_output: '' },
              { task: 's3', actor: 'both', checkpoint: false, checkpoint_reason: '', actor_reasoning: '', expected_output: '' },
            ],
          },
        }],
      });
      const result = buildProcessSummary('p1')!;
      expect(result.steps_designed).toBe(3);
      expect(result.has_checkpoints).toBe(true);
    });

    it('checkpoint 없는 경우', () => {
      setupStorage({
        sot_projects: [makeProject('p1')],
        sot_recast_list: [{
          id: 'rc-1', status: 'done', input_text: '', steps: [], created_at: '', updated_at: '',
          analysis: {
            steps: [
              { task: 's1', actor: 'ai', checkpoint: false, checkpoint_reason: '', actor_reasoning: '', expected_output: '' },
            ],
          },
        }],
      });
      expect(buildProcessSummary('p1')!.has_checkpoints).toBe(false);
    });
  });

  describe('Rehearse 데이터 추출', () => {
    it('페르소나 수 + 리스크 분류 카운팅', () => {
      setupStorage({
        sot_projects: [makeProject('p1')],
        sot_feedback_history: [{
          id: 'fr-1', document_title: '', document_text: '', persona_ids: [],
          feedback_perspective: '', feedback_intensity: '', synthesis: '', created_at: '',
          results: [
            {
              persona_id: 'p1',
              classified_risks: [
                { text: 'r1', category: 'critical' },
                { text: 'r2', category: 'unspoken' },
              ],
              overall_reaction: '', failure_scenario: '', untested_assumptions: [],
              first_questions: [], praise: [], concerns: [], wants_more: [], approval_conditions: [],
            },
            {
              persona_id: 'p2',
              classified_risks: [
                { text: 'r3', category: 'manageable' },
                { text: 'r4', category: 'critical' },
              ],
              overall_reaction: '', failure_scenario: '', untested_assumptions: [],
              first_questions: [], praise: [], concerns: [], wants_more: [], approval_conditions: [],
            },
          ],
        }],
      });
      const result = buildProcessSummary('p1')!;
      expect(result.personas_used).toBe(2);
      expect(result.risks_identified).toEqual({ critical: 2, manageable: 1, unspoken: 1 });
    });

    it('classified_risks가 없으면 0으로 안전 처리', () => {
      setupStorage({
        sot_projects: [makeProject('p1')],
        sot_feedback_history: [{
          id: 'fr-1', document_title: '', document_text: '', persona_ids: [],
          feedback_perspective: '', feedback_intensity: '', synthesis: '', created_at: '',
          results: [{
            persona_id: 'p1',
            classified_risks: undefined,
            overall_reaction: '', failure_scenario: '', untested_assumptions: [],
            first_questions: [], praise: [], concerns: [], wants_more: [], approval_conditions: [],
          }],
        }],
      });
      const result = buildProcessSummary('p1')!;
      expect(result.risks_identified).toEqual({ critical: 0, manageable: 0, unspoken: 0 });
    });
  });

  describe('Refine 데이터 추출', () => {
    it('project_id로 매칭', () => {
      setupStorage({
        sot_projects: [makeProject('p1')],
        sot_refine_loops: [
          { id: 'rl-other', project_id: 'p2', status: 'converged', iterations: [1, 2, 3] },
          { id: 'rl-1', project_id: 'p1', status: 'converged', iterations: [1, 2] },
        ],
      });
      const result = buildProcessSummary('p1')!;
      expect(result.convergence_iterations).toBe(2);
      expect(result.converged).toBe(true);
    });

    it('project_id 매칭 없으면 마지막 loop fallback', () => {
      setupStorage({
        sot_projects: [makeProject('p1')],
        sot_refine_loops: [
          { id: 'rl-1', project_id: 'p99', status: 'active', iterations: [1] },
        ],
      });
      const result = buildProcessSummary('p1')!;
      expect(result.convergence_iterations).toBe(1);
      expect(result.converged).toBe(false);
    });
  });

  describe('DQ 요소 min/max', () => {
    it('요소별 최강/최약 감지', () => {
      setupStorage({ sot_projects: [makeProject('p1')] });
      mockGetDQ.mockReturnValue([makeDQ({
        appropriate_frame: 5, creative_alternatives: 1,
        relevant_information: 3, clear_values: 4,
        sound_reasoning: 2, commitment_to_action: 3,
      })]);
      const result = buildProcessSummary('p1')!;
      expect(result.dq_score).toBe(60);
      expect(result.strongest_element).toBe('프레이밍'); // 5
      expect(result.weakest_element).toBe('대안 탐색'); // 1
    });

    it('DQ 없으면 null', () => {
      setupStorage({ sot_projects: [makeProject('p1')] });
      mockGetDQ.mockReturnValue([]);
      const result = buildProcessSummary('p1')!;
      expect(result.dq_score).toBeNull();
      expect(result.strongest_element).toBeNull();
    });

    it('여러 DQ 점수 있으면 마지막 사용', () => {
      setupStorage({ sot_projects: [makeProject('p1')] });
      mockGetDQ.mockReturnValue([
        makeDQ({ overall_dq: 40 }),
        makeDQ({ overall_dq: 80 }),
      ]);
      const result = buildProcessSummary('p1')!;
      expect(result.dq_score).toBe(80);
    });
  });

  describe('완성도 카운팅', () => {
    it('전체 파이프라인 완료 → steps_completed = 4', () => {
      setupStorage({
        sot_projects: [makeProject('p1')],
        sot_reframe_list: [{ id: 'rf', status: 'done', analysis: { hidden_assumptions: [] }, input_text: '', selected_question: '', created_at: '', updated_at: '' }],
        sot_recast_list: [{ id: 'rc', status: 'done', analysis: { steps: [] }, input_text: '', steps: [], created_at: '', updated_at: '' }],
        sot_feedback_history: [{ id: 'fr', document_title: '', document_text: '', persona_ids: [], feedback_perspective: '', feedback_intensity: '', results: [], synthesis: '', created_at: '' }],
        sot_refine_loops: [{ id: 'rl', project_id: 'p1', status: 'active', iterations: [] }],
      });
      expect(buildProcessSummary('p1')!.steps_completed).toBe(4);
    });

    it('Reframe만 완료 → steps_completed = 1', () => {
      setupStorage({
        sot_projects: [makeProject('p1')],
        sot_reframe_list: [{ id: 'rf', status: 'done', analysis: { hidden_assumptions: [] }, input_text: '', selected_question: '', created_at: '', updated_at: '' }],
      });
      expect(buildProcessSummary('p1')!.steps_completed).toBe(1);
    });

    it('total_steps는 항상 4', () => {
      setupStorage({ sot_projects: [makeProject('p1')] });
      expect(buildProcessSummary('p1')!.total_steps).toBe(4);
    });
  });

  describe('Edge cases', () => {
    it('프로젝트 name 없으면 "제목 없음"', () => {
      setupStorage({ sot_projects: [{ id: 'p1', name: '', description: '', refs: [], created_at: '', updated_at: '' }] });
      expect(buildProcessSummary('p1')!.project_name).toBe('제목 없음');
    });

    it('reframe analysis가 null → 가정 0개', () => {
      setupStorage({
        sot_projects: [makeProject('p1')],
        sot_reframe_list: [{ id: 'rf', status: 'done', analysis: null, input_text: '', selected_question: '', created_at: '', updated_at: '' }],
      });
      const result = buildProcessSummary('p1')!;
      expect(result.assumptions_found).toBe(0);
      expect(result.steps_completed).toBe(1); // reframeItem exists
    });
  });
});

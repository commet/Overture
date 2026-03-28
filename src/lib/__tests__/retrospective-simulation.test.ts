/**
 * Retrospective Simulation — 회고 질문 생성/저장/조회 시뮬레이션
 *
 * 핵심 검증:
 * - generateRetrospectiveQuestions: 신호 기반 질문 생성, 카테고리 중복 제거, 최대 4개
 * - saveRetrospectiveAnswer: id/created_at 부여, localStorage+Supabase 이중 저장, 200개 상한
 * - getRetrospectiveAnswers: 전체/프로젝트별 필터
 * - getActionableInsights: process/learning만, 짧은 답변 제외, 최신순, 최대 5개
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  RefineLoop,
  FeedbackRecord,
  RetrospectiveAnswer,
  QualitySignal,
} from '@/stores/types';

// ── Mocks (before imports) ──

vi.mock('@/lib/db', () => ({
  insertToSupabase: vi.fn(),
}));

vi.mock('@/lib/uuid', () => ({
  generateId: vi.fn(() => 'mock-id-' + Math.random().toString(36).slice(2, 8)),
}));

const mockGetSignals = vi.fn(() => [] as Partial<QualitySignal>[]);
vi.mock('@/lib/signal-recorder', () => ({
  getSignals: (...args: unknown[]) => mockGetSignals(...args),
  recordSignal: vi.fn(),
}));

let mockStorage: Record<string, unknown> = {};
vi.mock('@/lib/storage', () => ({
  getStorage: vi.fn((key: string, fallback: unknown) => mockStorage[key] ?? fallback),
  setStorage: vi.fn((key: string, value: unknown) => { mockStorage[key] = value; }),
  STORAGE_KEYS: {
    RETROSPECTIVE_ANSWERS: 'sot_retrospective_answers',
    SETTINGS: 'sot_settings',
  },
}));

// ── Imports (after mocks) ──

import {
  generateRetrospectiveQuestions,
  saveRetrospectiveAnswer,
  getRetrospectiveAnswers,
  getActionableInsights,
} from '@/lib/retrospective';
import { insertToSupabase } from '@/lib/db';

const mockInsert = vi.mocked(insertToSupabase);

// ── Helpers ──

function makeLoop(overrides: Partial<RefineLoop> = {}): RefineLoop {
  return {
    id: 'loop-1',
    project_id: 'p1',
    name: 'Test Loop',
    goal: 'test',
    original_plan: 'plan',
    initial_feedback_record_id: 'fr-1',
    initial_approval_conditions: [],
    persona_ids: [],
    iterations: [{ id: 'iter-1' }] as RefineLoop['iterations'],
    status: 'converged',
    max_iterations: 5,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeFeedbackRecord(overrides: Partial<FeedbackRecord> = {}): FeedbackRecord {
  return {
    id: 'fb-1',
    project_id: 'p1',
    document_title: 'doc',
    document_text: 'text',
    persona_ids: [],
    feedback_perspective: 'critical',
    feedback_intensity: 'high',
    results: [],
    synthesis: '',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeAnswer(overrides: Partial<RetrospectiveAnswer> = {}): RetrospectiveAnswer {
  return {
    id: 'ans-1',
    project_id: 'p1',
    question_id: 'q-1',
    question_text: '질문',
    category: 'process',
    answer: '충분히 긴 답변입니다 - 이것은 테스트용 답변입니다.',
    data_basis: 'basis',
    created_at: '2024-01-15T00:00:00Z',
    ...overrides,
  };
}

// ═══════════════════════════════════════
// Tests
// ═══════════════════════════════════════

describe('Retrospective Simulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSignals.mockReturnValue([]);
    mockStorage = {};
  });

  // ═══════════════════════════════════════
  // generateRetrospectiveQuestions
  // ═══════════════════════════════════════
  describe('generateRetrospectiveQuestions', () => {
    it('1회 수렴 시 수렴 속도 질문 생성', () => {
      const loop = makeLoop({ iterations: [{ id: 'i1' }] as RefineLoop['iterations'] });
      const questions = generateRetrospectiveQuestions(loop, []);

      expect(questions).toHaveLength(1);
      expect(questions[0].category).toBe('process');
      expect(questions[0].question).toContain('1회');
      expect(questions[0].data_basis).toContain('1회');
    });

    it('4회 이상 반복 시 수렴 속도 질문 생성', () => {
      const iterations = Array.from({ length: 5 }, (_, i) => ({ id: `i${i}` }));
      const loop = makeLoop({ iterations: iterations as RefineLoop['iterations'] });
      const questions = generateRetrospectiveQuestions(loop, []);

      expect(questions).toHaveLength(1);
      expect(questions[0].category).toBe('process');
      expect(questions[0].question).toContain('5회');
    });

    it('2-3회 반복에서는 수렴 질문 미생성', () => {
      const iterations = [{ id: 'i1' }, { id: 'i2' }];
      const loop = makeLoop({ iterations: iterations as RefineLoop['iterations'] });
      const questions = generateRetrospectiveQuestions(loop, []);

      expect(questions).toHaveLength(0);
    });

    it('actor_override_direction 신호 2건 이상 + from_actor=ai → 오버라이드 질문', () => {
      mockGetSignals.mockReturnValue([
        { signal_type: 'actor_override_direction', signal_data: { from_actor: 'ai', step_task: 'task-A' }, project_id: 'p1' },
        { signal_type: 'actor_override_direction', signal_data: { from_actor: 'ai', step_task: 'task-B' }, project_id: 'p1' },
      ]);
      const loop = makeLoop({ iterations: [{ id: 'i1' }, { id: 'i2' }] as RefineLoop['iterations'] });
      const questions = generateRetrospectiveQuestions(loop, []);

      expect(questions).toHaveLength(1);
      expect(questions[0].category).toBe('judgment');
      expect(questions[0].question).toContain('2건');
      expect(questions[0].data_basis).toContain('task-A');
    });

    it('step_structural_change 신호 add+delete 합계 2건 이상 → 구조 변경 질문', () => {
      mockGetSignals.mockReturnValue([
        { signal_type: 'step_structural_change', signal_data: { action: 'delete' }, project_id: 'p1' },
        { signal_type: 'step_structural_change', signal_data: { action: 'add' }, project_id: 'p1' },
      ]);
      const loop = makeLoop({ iterations: [{ id: 'i1' }, { id: 'i2' }] as RefineLoop['iterations'] });
      const questions = generateRetrospectiveQuestions(loop, []);

      expect(questions).toHaveLength(1);
      expect(questions[0].category).toBe('process');
      expect(questions[0].question).toContain('추가 1건');
      expect(questions[0].question).toContain('삭제 1건');
    });

    it('assumption_diversity 신호 doubtful > 0 → 전제 다양성 질문', () => {
      mockGetSignals.mockReturnValue([
        { signal_type: 'assumption_diversity', signal_data: { doubtful: 2, total: 4 }, project_id: 'p1' },
      ]);
      const loop = makeLoop({ iterations: [{ id: 'i1' }, { id: 'i2' }] as RefineLoop['iterations'] });
      const questions = generateRetrospectiveQuestions(loop, []);

      expect(questions).toHaveLength(1);
      expect(questions[0].category).toBe('learning');
      expect(questions[0].question).toContain('4건');
      expect(questions[0].question).toContain('2건');
    });

    it('FeedbackRecord에 unspoken 리스크 존재 시 침묵의 리스크 질문', () => {
      const feedback = makeFeedbackRecord({
        project_id: 'p1',
        results: [{
          persona_id: 'persona-1',
          overall_reaction: 'concerned',
          failure_scenario: 'scenario',
          untested_assumptions: [],
          classified_risks: [{ text: 'hidden risk', category: 'unspoken' }],
          first_questions: [],
          praise: [],
          concerns: [],
          wants_more: [],
          approval_conditions: [],
        }],
      });
      const loop = makeLoop({ iterations: [{ id: 'i1' }, { id: 'i2' }] as RefineLoop['iterations'] });
      const questions = generateRetrospectiveQuestions(loop, [feedback]);

      expect(questions).toHaveLength(1);
      expect(questions[0].category).toBe('learning');
      expect(questions[0].question).toContain('침묵의 리스크');
    });

    it('최대 4개 질문까지만 반환', () => {
      // 1회 수렴 → process 질문
      const loop = makeLoop({ iterations: [{ id: 'i1' }] as RefineLoop['iterations'] });

      // override 신호 → judgment 질문
      // structural 신호 → process 질문 (2번째)
      // assumption 신호 → learning 질문
      // unspoken 리스크 → learning 질문 (2번째)
      mockGetSignals.mockReturnValue([
        { signal_type: 'actor_override_direction', signal_data: { from_actor: 'ai', step_task: 'x' }, project_id: 'p1' },
        { signal_type: 'actor_override_direction', signal_data: { from_actor: 'ai', step_task: 'y' }, project_id: 'p1' },
        { signal_type: 'step_structural_change', signal_data: { action: 'add' }, project_id: 'p1' },
        { signal_type: 'step_structural_change', signal_data: { action: 'delete' }, project_id: 'p1' },
        { signal_type: 'assumption_diversity', signal_data: { doubtful: 1, total: 3 }, project_id: 'p1' },
      ]);

      const feedback = makeFeedbackRecord({
        project_id: 'p1',
        results: [{
          persona_id: 'persona-1',
          overall_reaction: '',
          failure_scenario: '',
          untested_assumptions: [],
          classified_risks: [{ text: 'risk', category: 'unspoken' }],
          first_questions: [],
          praise: [],
          concerns: [],
          wants_more: [],
          approval_conditions: [],
        }],
      });

      const questions = generateRetrospectiveQuestions(loop, [feedback]);
      expect(questions.length).toBeLessThanOrEqual(4);
    });

    it('카테고리별 중복 제거 — 카테고리 당 하나씩 먼저, 나머지 채움', () => {
      // 1회 수렴 → process
      const loop = makeLoop({ iterations: [{ id: 'i1' }] as RefineLoop['iterations'] });

      // structural → process (2nd)
      // override → judgment
      // assumption → learning
      mockGetSignals.mockReturnValue([
        { signal_type: 'actor_override_direction', signal_data: { from_actor: 'ai', step_task: 'a' }, project_id: 'p1' },
        { signal_type: 'actor_override_direction', signal_data: { from_actor: 'ai', step_task: 'b' }, project_id: 'p1' },
        { signal_type: 'step_structural_change', signal_data: { action: 'add' }, project_id: 'p1' },
        { signal_type: 'step_structural_change', signal_data: { action: 'delete' }, project_id: 'p1' },
        { signal_type: 'assumption_diversity', signal_data: { doubtful: 1, total: 2 }, project_id: 'p1' },
      ]);

      const questions = generateRetrospectiveQuestions(loop, []);

      // First pass: process(convergence), judgment(override), learning(assumption) = 3 unique
      // Second pass: process(structural) fills to 4
      const categories = questions.map(q => q.category);
      // First three should each be unique categories
      const firstThree = categories.slice(0, 3);
      expect(new Set(firstThree).size).toBe(3);
    });

    it('어떤 신호도 매칭되지 않으면 빈 배열 반환', () => {
      const loop = makeLoop({ iterations: [{ id: 'i1' }, { id: 'i2' }] as RefineLoop['iterations'] });
      const questions = generateRetrospectiveQuestions(loop, []);

      expect(questions).toEqual([]);
    });
  });

  // ═══════════════════════════════════════
  // getRetrospectiveAnswers
  // ═══════════════════════════════════════
  describe('getRetrospectiveAnswers', () => {
    it('저장된 답변이 없으면 빈 배열', () => {
      const result = getRetrospectiveAnswers();
      expect(result).toEqual([]);
    });

    it('projectId 없이 호출 시 전체 답변 반환', () => {
      mockStorage['sot_retrospective_answers'] = [
        makeAnswer({ project_id: 'p1' }),
        makeAnswer({ id: 'ans-2', project_id: 'p2' }),
      ];

      const result = getRetrospectiveAnswers();
      expect(result).toHaveLength(2);
    });

    it('projectId 지정 시 해당 프로젝트만 필터', () => {
      mockStorage['sot_retrospective_answers'] = [
        makeAnswer({ project_id: 'p1' }),
        makeAnswer({ id: 'ans-2', project_id: 'p2' }),
        makeAnswer({ id: 'ans-3', project_id: 'p1' }),
      ];

      const result = getRetrospectiveAnswers('p1');
      expect(result).toHaveLength(2);
      expect(result.every(a => a.project_id === 'p1')).toBe(true);
    });
  });

  // ═══════════════════════════════════════
  // getActionableInsights
  // ═══════════════════════════════════════
  describe('getActionableInsights', () => {
    it('답변이 없으면 빈 배열', () => {
      expect(getActionableInsights()).toEqual([]);
    });

    it('process와 learning 카테고리만 반환', () => {
      mockStorage['sot_retrospective_answers'] = [
        makeAnswer({ category: 'process', answer: '프로세스 개선이 필요했습니다' }),
        makeAnswer({ id: 'a2', category: 'judgment', answer: '판단 관련 답변입니다 길게' }),
        makeAnswer({ id: 'a3', category: 'learning', answer: '이번에 배운 점이 많습니다' }),
      ];

      const insights = getActionableInsights();
      expect(insights).toHaveLength(2);
      expect(insights).toContain('프로세스 개선이 필요했습니다');
      expect(insights).toContain('이번에 배운 점이 많습니다');
    });

    it('excludeProjectId에 해당하는 프로젝트 제외', () => {
      mockStorage['sot_retrospective_answers'] = [
        makeAnswer({ project_id: 'p1', category: 'process', answer: '프로젝트1 인사이트입니다' }),
        makeAnswer({ id: 'a2', project_id: 'p2', category: 'process', answer: '프로젝트2 인사이트입니다' }),
      ];

      const insights = getActionableInsights('p1');
      expect(insights).toHaveLength(1);
      expect(insights[0]).toBe('프로젝트2 인사이트입니다');
    });

    it('10자 이하 짧은 답변 필터링', () => {
      mockStorage['sot_retrospective_answers'] = [
        makeAnswer({ category: 'process', answer: '짧은답변' }),  // 4 chars
        makeAnswer({ id: 'a2', category: 'process', answer: '충분히 긴 답변이어야 합니다' }),
      ];

      const insights = getActionableInsights();
      expect(insights).toHaveLength(1);
      expect(insights[0]).toBe('충분히 긴 답변이어야 합니다');
    });

    it('최대 5개까지만 반환', () => {
      mockStorage['sot_retrospective_answers'] = Array.from({ length: 8 }, (_, i) =>
        makeAnswer({
          id: `a${i}`,
          category: 'process',
          answer: `인사이트 번호 ${i} — 충분히 긴 답변입니다`,
          created_at: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
        }),
      );

      const insights = getActionableInsights();
      expect(insights).toHaveLength(5);
    });

    it('최신순 정렬 — created_at 내림차순', () => {
      mockStorage['sot_retrospective_answers'] = [
        makeAnswer({ id: 'a1', category: 'process', answer: '오래된 답변이지만 길이가 충분함', created_at: '2024-01-01T00:00:00Z' }),
        makeAnswer({ id: 'a2', category: 'learning', answer: '최신 답변이고 길이도 충분합니다', created_at: '2024-01-20T00:00:00Z' }),
        makeAnswer({ id: 'a3', category: 'process', answer: '중간 날짜 답변 충분히 긴 것임', created_at: '2024-01-10T00:00:00Z' }),
      ];

      const insights = getActionableInsights();
      expect(insights[0]).toBe('최신 답변이고 길이도 충분합니다');
      expect(insights[2]).toBe('오래된 답변이지만 길이가 충분함');
    });
  });

  // ═══════════════════════════════════════
  // saveRetrospectiveAnswer
  // ═══════════════════════════════════════
  describe('saveRetrospectiveAnswer', () => {
    it('id와 created_at이 자동 부여됨', () => {
      const result = saveRetrospectiveAnswer({
        project_id: 'p1',
        question_id: 'q1',
        question_text: '질문 내용',
        category: 'process',
        answer: '답변',
        data_basis: 'basis',
      });

      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^mock-id-/);
      expect(result.created_at).toBeDefined();
      expect(new Date(result.created_at).getTime()).not.toBeNaN();
    });

    it('localStorage에 저장됨', () => {
      saveRetrospectiveAnswer({
        project_id: 'p1',
        question_id: 'q1',
        question_text: '질문',
        category: 'process',
        answer: '답변',
        data_basis: 'basis',
      });

      const stored = mockStorage['sot_retrospective_answers'] as RetrospectiveAnswer[];
      expect(stored).toHaveLength(1);
      expect(stored[0].project_id).toBe('p1');
    });

    it('insertToSupabase가 호출됨', () => {
      saveRetrospectiveAnswer({
        project_id: 'p1',
        question_id: 'q1',
        question_text: '질문',
        category: 'process',
        answer: '답변',
        data_basis: 'basis',
      });

      expect(mockInsert).toHaveBeenCalledWith('retrospective_answers', expect.objectContaining({
        project_id: 'p1',
        question_id: 'q1',
      }));
    });

    it('200개 초과 시 오래된 항목 삭제', () => {
      // Pre-fill storage with 200 entries
      mockStorage['sot_retrospective_answers'] = Array.from({ length: 200 }, (_, i) =>
        makeAnswer({ id: `old-${i}` }),
      );

      saveRetrospectiveAnswer({
        project_id: 'p1',
        question_id: 'q-new',
        question_text: '새 질문',
        category: 'learning',
        answer: '새 답변',
        data_basis: 'basis',
      });

      const stored = mockStorage['sot_retrospective_answers'] as RetrospectiveAnswer[];
      expect(stored).toHaveLength(200);
      // The newest entry should be last
      expect(stored[stored.length - 1].question_id).toBe('q-new');
      // The first old entry should have been trimmed
      expect(stored[0].id).toBe('old-1');
    });
  });
});

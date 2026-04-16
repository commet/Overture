/**
 * Shared Test Factories
 *
 * Canonical factory functions for test data.
 * Each returns a minimal valid object with optional overrides.
 *
 * Usage:
 *   import { makeReframe, makePersona } from './helpers/factories';
 */

import type {
  ReframeItem,
  RecastItem,
  RecastStep,
  Persona,
  FeedbackRecord,
  JudgmentRecord,
  QualitySignal,
  HiddenAssumption,
  KeyAssumption,
  PersonaAccuracyRating,
  Project,
  RetrospectiveAnswer,
} from '@/stores/types';

/* ── Reframe ── */

export function makeReframe(overrides: Partial<ReframeItem> = {}): ReframeItem {
  return {
    id: `rf-${Math.random().toString(36).slice(2)}`,
    input_text: '신규 서비스 런칭 전략을 세우고 싶습니다',
    selected_question: 'selected',
    status: 'done',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    analysis: {
      surface_task: '서비스 런칭 전략 수립',
      reframed_question: '어떤 조건에서 이 서비스가 시장에서 살아남을 수 있는가?',
      why_reframing_matters: '런칭 전략이 아니라 생존 조건을 먼저 정의해야',
      reasoning_narrative: '',
      hidden_assumptions: [
        { assumption: '시장 수요가 있다', risk_if_false: '런칭 실패', evaluation: 'uncertain', axis: 'customer_value' },
        { assumption: '기술팀이 충분하다', risk_if_false: '일정 지연', evaluation: 'likely_true', axis: 'feasibility' },
      ],
      hidden_questions: [{ question: 'q1', reasoning: 'r1' }],
      ai_limitations: ['market research'],
    },
    ...overrides,
  };
}

/* ── Recast ── */

export function makeRecast(overrides: Partial<RecastItem> = {}): RecastItem {
  return {
    id: `rc-${Math.random().toString(36).slice(2)}`,
    input_text: '서비스 런칭 계획을 실행 가능한 스토리로 만들어주세요',
    steps: [],
    status: 'done',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    analysis: {
      governing_idea: '고객 검증 우선 → 점진적 확장',
      storyline: { situation: '시장 진입', complication: '경쟁 심화', resolution: '차별화 전략' },
      goal_summary: '3개월 내 PMF 달성',
      steps: [
        makeStep({ task: '고객 인터뷰 50명', actor: 'human', checkpoint: true, checkpoint_reason: 'PMF 검증' }),
        makeStep({ task: 'MVP 개발', actor: 'ai' }),
        makeStep({ task: '파일럿 런칭', actor: 'both', checkpoint: true, checkpoint_reason: '투자 결정' }),
      ],
      key_assumptions: [
        { assumption: '고객 50명 확보 가능', importance: 'high', certainty: 'medium', if_wrong: '검증 불가' },
        { assumption: '3개월 일정 현실적', importance: 'medium', certainty: 'low', if_wrong: '예산 초과' },
      ],
      critical_path: [0, 2],
      total_estimated_time: '3개월',
      ai_ratio: 0.3,
      human_ratio: 0.7,
      design_rationale: '고객 검증 없이 개발하면 리스크가 너무 크다',
    },
    ...overrides,
  };
}

export function makeStep(overrides: Partial<RecastStep> = {}): RecastStep {
  return {
    task: '작업',
    actor: 'ai',
    actor_reasoning: '',
    expected_output: '산출물',
    checkpoint: false,
    checkpoint_reason: '',
    ...overrides,
  };
}

/* ── Persona ── */

export function makePersona(overrides: Partial<Persona> = {}): Persona {
  return {
    id: 'persona-1',
    name: '김 부장',
    role: '영업본부장',
    organization: '매출팀',
    priorities: '매출 성장, 고객 확보',
    communication_style: '숫자 중심, 결론부터',
    known_concerns: '신규 사업 수익성',
    relationship_notes: '',
    influence: 'high',
    decision_style: 'analytical',
    risk_tolerance: 'low',
    success_metric: 'ROI 150%',
    extracted_traits: ['데이터 중심', '리스크 회피'],
    feedback_logs: [],
    is_example: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/* ── FeedbackRecord ── */

export function makeFeedbackRecord(overrides: Partial<FeedbackRecord> = {}): FeedbackRecord {
  return {
    id: 'fb-1',
    document_title: '',
    document_text: '',
    persona_ids: ['p1'],
    feedback_perspective: '',
    feedback_intensity: '',
    results: [],
    synthesis: '',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/* ── JudgmentRecord ── */

export function makeJudgment(overrides: Partial<JudgmentRecord> = {}): JudgmentRecord {
  return {
    id: `j-${Math.random().toString(36).slice(2)}`,
    type: 'actor_override',
    user_changed: false,
    created_at: new Date().toISOString(),
    ...overrides,
  } as JudgmentRecord;
}

/* ── QualitySignal ── */

export function makeSignal(overrides: Partial<QualitySignal> = {}): QualitySignal {
  return {
    id: `sig-${Math.random().toString(36).slice(2)}`,
    tool: 'reframe',
    signal_type: 'assumption_diversity',
    signal_data: {},
    project_id: 'proj-1',
    created_at: new Date().toISOString(),
    ...overrides,
  } as QualitySignal;
}

/* ── Assumption ── */

export function makeAssumption(overrides: Partial<HiddenAssumption> = {}): HiddenAssumption {
  return {
    assumption: '테스트 가정',
    risk_if_false: '위험',
    verified: false,
    ...overrides,
  };
}

export function makeKeyAssumption(overrides: Partial<KeyAssumption> = {}): KeyAssumption {
  return {
    assumption: '핵심 가정',
    importance: 'high',
    certainty: 'medium',
    if_wrong: '위험',
    ...overrides,
  };
}

/* ── Project ── */

export function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    name: '테스트 프로젝트',
    description: '',
    reframe_ids: [],
    recast_ids: [],
    feedback_ids: [],
    refine_ids: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as Project;
}

/* ── RetrospectiveAnswer ── */

export function makeAnswer(overrides: Partial<RetrospectiveAnswer> = {}): RetrospectiveAnswer {
  return {
    id: `ans-${Math.random().toString(36).slice(2)}`,
    question_id: 'q-1',
    project_id: 'proj-1',
    category: 'process',
    answer: '테스트 답변입니다. 충분히 긴 답변.',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/* ── PersonaAccuracyRating ── */

export function makeRating(overrides: Partial<PersonaAccuracyRating> = {}): PersonaAccuracyRating {
  return {
    id: `rat-${Math.random().toString(36).slice(2)}`,
    persona_id: 'persona-1',
    project_id: 'proj-1',
    overall_accuracy: 4,
    created_at: new Date().toISOString(),
    ...overrides,
  } as PersonaAccuracyRating;
}

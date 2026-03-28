/**
 * Judgment Vitality Engine — Simulation Tests
 *
 * 실제 시나리오를 시뮬레이션해서 vitality score가 직관과 맞는지 검증.
 */

import type {
  ReframeItem, RecastItem, FeedbackRecord, RefineLoop,
  VitalityAssessment,
} from '@/stores/types';

vi.mock('@/lib/storage', () => {
  let store: Record<string, unknown> = {};
  return {
    getStorage: vi.fn((key: string, fallback: unknown) => store[key] ?? fallback),
    setStorage: vi.fn((key: string, value: unknown) => { store[key] = value; }),
    STORAGE_KEYS: { FEEDBACK_HISTORY: 'sot_feedback_history', VITALITY_ASSESSMENTS: 'sot_vitality_assessments' },
    __resetStore: () => { store = {}; },
  };
});
vi.mock('@/lib/db', () => ({ insertToSupabase: vi.fn() }));
vi.mock('@/lib/signal-recorder', () => ({ recordSignal: vi.fn(), getSignals: vi.fn(() => []) }));

import { assessVitality, analyzeVitalityTrend } from '@/lib/judgment-vitality';

// ─── Scenario Builders ───

function goodReframe(): ReframeItem {
  return {
    id: 'rf-good', input_text: '매출이 정체되어 있는데 어떻게 하면 좋을까',
    selected_question: '', project_id: 'proj-sim',
    analysis: {
      surface_task: '매출 정체 해결',
      reframed_question: '고객 이탈률과 신규 유입 비율의 불균형이 매출 정체의 원인인가, 아니면 객단가 하락이 원인인가?',
      why_reframing_matters: '매출 정체의 근본 원인을 먼저 진단해야 처방이 정확',
      reasoning_narrative: '',
      hidden_assumptions: [
        { assumption: '매출 정체는 마케팅 문제다', risk_if_false: '근본 원인 놓침', axis: 'customer_value' },
        { assumption: '기존 고객은 유지되고 있다', risk_if_false: '이탈 감지 실패', axis: 'business' },
        { assumption: '가격 경쟁력이 있다', risk_if_false: '객단가 하락 간과', axis: 'feasibility' },
        { assumption: '시장 자체가 성장 중이다', risk_if_false: '시장 포화 무시', axis: 'org_capacity' },
      ],
      hidden_questions: [], ai_limitations: ['실시간 매출 데이터 접근 불가'],
    },
    status: 'done', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  } as ReframeItem;
}

function lazyReframe(): ReframeItem {
  return {
    id: 'rf-lazy', input_text: '매출 올리는 방법', selected_question: '', project_id: 'proj-sim-lazy',
    analysis: {
      surface_task: '매출 올리는 방법을 알고 싶습니다',
      reframed_question: '매출 올리는 방법을 알고 싶습니다',
      why_reframing_matters: '', reasoning_narrative: '',
      hidden_assumptions: [],
      hidden_questions: [], ai_limitations: [],
    },
    status: 'done', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  } as ReframeItem;
}

function goodRecast(): RecastItem {
  return {
    id: 'rc-good', reframe_id: 'rf-good', project_id: 'proj-sim',
    analysis: {
      governing_idea: '고객 세그먼트별 이탈-유입 분석 기반 매출 복원 전략',
      storyline: { situation: '매출 정체 3분기째', complication: '원인 미파악', resolution: '데이터 기반 진단 후 처방' },
      steps: [
        { task: '고객 코호트 분석', actor: 'ai', actor_reasoning: 'AI가 데이터 처리', expected_output: '세그먼트별 이탈률 리포트', checkpoint: false, checkpoint_reason: '' },
        { task: '이탈 원인 인터뷰 설계', actor: 'human→ai', actor_reasoning: '사람이 질문 설계, AI가 정리', expected_output: '인터뷰 가이드', checkpoint: true, checkpoint_reason: '고객 접촉 전 확인' },
        { task: '가격 탄력성 분석', actor: 'ai→human', actor_reasoning: 'AI 분석 후 사람 해석', expected_output: '가격 시나리오 3개', checkpoint: true, checkpoint_reason: '가격 결정은 사람' },
        { task: '실행 계획 수립', actor: 'human', actor_reasoning: '전략 결정은 사람', expected_output: '90일 액션플랜', checkpoint: true, checkpoint_reason: '최종 의사결정' },
      ],
      key_assumptions: [
        { assumption: '기존 고객은 유지되고 있다', importance: 'high' as const, certainty: 'low' as const, if_wrong: '이탈 감지 실패' },
      ],
      critical_path: [1, 2, 3],
      design_rationale: '진단 → 원인 파악 → 처방 순서',
    },
    status: 'done', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  } as RecastItem;
}

function goodFeedback(): FeedbackRecord {
  return {
    id: 'fb-good', document_title: 'plan', document_text: 'plan text',
    persona_ids: ['cfo', 'cmo', 'customer'],
    feedback_perspective: '전반적 인상', feedback_intensity: '솔직하게',
    results: [
      {
        persona_id: 'cfo', overall_reaction: '비용 우려',
        failure_scenario: '분석 비용이 매출 개선 효과를 초과',
        untested_assumptions: ['분석 ROI가 양수'],
        classified_risks: [
          { text: '분석 기간 동안 추가 매출 하락 가능', category: 'critical' },
          { text: '인터뷰 대상 고객 섭외 어려움', category: 'manageable' },
          { text: '경쟁사가 같은 시기에 프로모션 진행 가능성', category: 'unspoken' },
        ],
        first_questions: ['분석 비용 예산은?'],
        praise: ['단계적 접근이 좋다'], concerns: ['시간이 너무 오래 걸릴 수 있다'],
        wants_more: ['벤치마크'], approval_conditions: ['분석 비용이 월 매출의 5% 이내'],
      },
      {
        persona_id: 'cmo', overall_reaction: '방향 동의',
        failure_scenario: '데이터만 보고 감을 놓침',
        untested_assumptions: [],
        classified_risks: [
          { text: '정량 분석에만 의존하면 질적 인사이트 놓침', category: 'manageable' },
        ],
        first_questions: ['정성 조사도 병행하나?'],
        praise: ['고객 인터뷰 포함 좋다'], concerns: ['분석 마비 가능성'],
        wants_more: [], approval_conditions: ['정성 조사 병행'],
      },
    ],
    synthesis: '', created_at: new Date().toISOString(), project_id: 'proj-sim',
  };
}

function goodRefineLoop(): RefineLoop {
  return {
    id: 'rl-good', project_id: 'proj-sim', name: 'test', goal: 'converge',
    original_plan: 'original', initial_feedback_record_id: 'fb-good',
    initial_approval_conditions: [], persona_ids: ['cfo', 'cmo'],
    iterations: [
      {
        iteration_number: 1, issues_to_address: ['분석 비용', '정성 조사'],
        revised_plan: 'v1: 비용 한도 추가 + 정성 인터뷰 3건 추가',
        changes: [
          { what: '분석 예산 한도 설정', why: 'CFO 우려 반영', type: 'add' },
          { what: '정성 인터뷰 추가', why: 'CMO 요청 반영', type: 'add' },
        ],
        feedback_record_id: 'fb-2',
        convergence: { critical_risks: 0, total_issues: 1, approval_conditions: [
          { persona_id: 'cfo', persona_name: 'CFO', influence: 'high', condition: '비용 5% 이내', met: true, met_at_iteration: 1 },
          { persona_id: 'cmo', persona_name: 'CMO', influence: 'medium', condition: '정성 조사 병행', met: true, met_at_iteration: 1 },
        ]},
        created_at: new Date().toISOString(),
      },
    ],
    status: 'converged', max_iterations: 3,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  } as RefineLoop;
}

// ─── Simulation Tests ───

describe('Scenario 1: 건강한 전체 파이프라인', () => {
  test('vitality should be alive or coasting', () => {
    const va = assessVitality(goodReframe(), goodRecast(), [goodFeedback()], goodRefineLoop(), 82);
    console.log(`[건강한 프로젝트] gamma=${va.gamma.toFixed(3)}, rigidity=${va.rigidity_score.toFixed(3)}, vitality=${va.vitality_score.toFixed(3)}, tier=${va.tier}`);
    console.log(`  signals: ${va.signals.map(s => s.signal_type).join(', ') || 'none'}`);
    expect(['alive', 'coasting']).toContain(va.tier);
    expect(va.gamma).toBeGreaterThan(0.3);
  });
});

describe('Scenario 2: 리프레임만 하고 끝남', () => {
  test('should not be dead (incomplete ≠ bad)', () => {
    const va = assessVitality(goodReframe(), null, [], null);
    console.log(`[리프레임만] gamma=${va.gamma.toFixed(3)}, rigidity=${va.rigidity_score.toFixed(3)}, vitality=${va.vitality_score.toFixed(3)}, tier=${va.tier}`);
    expect(va.tier).not.toBe('dead');
  });
});

describe('Scenario 3: 형식적 수행 (lazy reframe + high DQ)', () => {
  test('should detect low_gamma_high_dq signal', () => {
    const rf = lazyReframe();
    const va = assessVitality(rf, null, [], null, 85);
    console.log(`[형식적 수행] gamma=${va.gamma.toFixed(3)}, rigidity=${va.rigidity_score.toFixed(3)}, vitality=${va.vitality_score.toFixed(3)}, tier=${va.tier}`);
    console.log(`  fingerprints:`, JSON.stringify(va.fingerprints.map(f => f.fingerprint)));
    console.log(`  signals: ${va.signals.map(s => `${s.signal_type}(${s.severity})`).join(', ') || 'none'}`);
    const gamingSignal = va.signals.find(s => s.signal_type === 'low_gamma_high_dq');
    expect(gamingSignal).toBeDefined();
  });
});

describe('Scenario 4: 1회 수렴 (rubber-stamp refine)', () => {
  test('should detect convergence_too_fast when gamma is low', () => {
    const fastLoop: RefineLoop = {
      ...goodRefineLoop(),
      iterations: [{
        ...goodRefineLoop().iterations[0],
        convergence: { critical_risks: 0, total_issues: 0, approval_conditions: [] },
      }],
    };
    // lazy reframe → low gamma → fast convergence should be flagged
    const va = assessVitality(lazyReframe(), null, [], fastLoop, 70);
    console.log(`[1회 수렴] gamma=${va.gamma.toFixed(3)}, rigidity=${va.rigidity_score.toFixed(3)}, vitality=${va.vitality_score.toFixed(3)}, tier=${va.tier}`);
    console.log(`  signals: ${va.signals.map(s => `${s.signal_type}(${s.severity})`).join(', ') || 'none'}`);
    const fastSignal = va.signals.find(s => s.signal_type === 'convergence_too_fast');
    expect(fastSignal).toBeDefined();
  });
});

describe('Scenario 5: 같은 페르소나 3회 연속', () => {
  test('should detect same_persona_set', () => {
    const pastFeedback = [
      { ...goodFeedback(), id: 'fb-a', persona_ids: ['cfo', 'cmo'] },
      { ...goodFeedback(), id: 'fb-b', persona_ids: ['cfo', 'cmo'] },
      { ...goodFeedback(), id: 'fb-c', persona_ids: ['cfo', 'cmo'] },
    ];
    const va = assessVitality(goodReframe(), goodRecast(), [goodFeedback()], goodRefineLoop(), 75, pastFeedback);
    console.log(`[같은 페르소나] gamma=${va.gamma.toFixed(3)}, rigidity=${va.rigidity_score.toFixed(3)}, vitality=${va.vitality_score.toFixed(3)}, tier=${va.tier}`);
    console.log(`  signals: ${va.signals.map(s => s.signal_type).join(', ') || 'none'}`);
    const personaSignal = va.signals.find(s => s.signal_type === 'same_persona_set');
    expect(personaSignal).toBeDefined();
  });
});

describe('Scenario 6: Vitality 추세 — 점점 경직되는 사용자', () => {
  test('should detect declining trend', () => {
    const assessments: VitalityAssessment[] = [
      { id: '1', gamma: 0.7, rigidity_score: 0.1, vitality_score: 0.63, signals: [], fingerprints: [], tier: 'coasting', created_at: '2026-01-01' },
      { id: '2', gamma: 0.5, rigidity_score: 0.3, vitality_score: 0.35, signals: [], fingerprints: [], tier: 'performing', created_at: '2026-01-15' },
      { id: '3', gamma: 0.3, rigidity_score: 0.5, vitality_score: 0.15, signals: [], fingerprints: [], tier: 'performing', created_at: '2026-02-01' },
      { id: '4', gamma: 0.2, rigidity_score: 0.6, vitality_score: 0.08, signals: [], fingerprints: [], tier: 'dead', created_at: '2026-02-15' },
    ];
    const trend = analyzeVitalityTrend(assessments);
    console.log(`[경직 추세] trend=${trend.trend}, avg_vitality=${trend.avg_vitality.toFixed(3)}, avg_gamma=${trend.avg_gamma.toFixed(3)}`);
    console.log(`  insight: ${trend.insight}`);
    expect(trend.trend).toBe('declining');
  });
});

describe('Scenario 7: 빈 프로젝트 (아무것도 없음)', () => {
  test('should be neutral, not crash', () => {
    const va = assessVitality(null, null, [], null);
    console.log(`[빈 프로젝트] gamma=${va.gamma.toFixed(3)}, vitality=${va.vitality_score.toFixed(3)}, tier=${va.tier}`);
    expect(va.gamma).toBe(0.5);
    expect(va.tier).not.toBe('dead');
    expect(va.signals.length).toBe(0);
  });
});

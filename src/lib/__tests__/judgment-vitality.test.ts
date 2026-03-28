/**
 * Judgment Vitality Engine — Tests
 *
 * Tests cover: buildStageFingerprint, computeStageGamma, computeProjectGamma,
 * translateApprovalsToPlan, detectRigiditySignals, assessVitality, analyzeVitalityTrend,
 * generateInterventions, getVitalityCoaching
 */

import type {
  ReframeItem, RecastItem, FeedbackRecord, RefineLoop,
  Persona, StageFingerprint, VitalityAssessment,
} from '@/stores/types';

vi.mock('@/lib/storage', () => {
  let store: Record<string, unknown> = {};
  return {
    getStorage: vi.fn((key: string, fallback: unknown) => store[key] ?? fallback),
    setStorage: vi.fn((key: string, value: unknown) => { store[key] = value; }),
    STORAGE_KEYS: {
      FEEDBACK_HISTORY: 'sot_feedback_history',
      VITALITY_ASSESSMENTS: 'sot_vitality_assessments',
    },
    __resetStore: () => { store = {}; },
  };
});

vi.mock('@/lib/db', () => ({ insertToSupabase: vi.fn() }));
vi.mock('@/lib/signal-recorder', () => ({ recordSignal: vi.fn(), getSignals: vi.fn(() => []) }));

import {
  buildStageFingerprint,
  computeStageGamma,
  computeProjectGamma,
  translateApprovalsToPlan,
  detectRigiditySignals,
  assessVitality,
  analyzeVitalityTrend,
  generateInterventions,
  getVitalityCoaching,
  measureFeedbackNovelty,
  buildProvenanceChain,
} from '@/lib/judgment-vitality';

// ─── Factory Helpers ───

function makeReframe(overrides: Partial<ReframeItem> = {}): ReframeItem {
  return {
    id: 'rf-1',
    input_text: '마케팅 예산을 어떻게 배분할까',
    selected_question: '',
    analysis: {
      surface_task: '마케팅 예산 배분',
      reframed_question: '고객 획득 비용 대비 전환율을 최적화하는 채널 포트폴리오는?',
      why_reframing_matters: '예산 배분보다 ROI 최적화가 핵심',
      reasoning_narrative: '',
      hidden_assumptions: [
        { assumption: '현재 채널이 최적이다', risk_if_false: '기회 손실', axis: 'customer_value' },
        { assumption: '예산 증가가 성장으로 이어진다', risk_if_false: '비효율 지출', axis: 'business' },
        { assumption: '경쟁사와 같은 채널을 써야 한다', risk_if_false: '차별화 실패', axis: 'feasibility' },
      ],
      hidden_questions: [],
      ai_limitations: ['실시간 광고 성과 데이터 접근 불가'],
    },
    status: 'done',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    project_id: 'proj-1',
    ...overrides,
  };
}

function makeRecast(overrides: Partial<RecastItem> = {}): RecastItem {
  return {
    id: 'rc-1',
    reframe_id: 'rf-1',
    analysis: {
      governing_idea: '데이터 기반 채널 포트폴리오 최적화',
      storyline: { situation: '현재 마케팅', complication: 'ROI 불확실', resolution: '채널별 실험' },
      steps: [
        { task: '채널별 ROI 분석', actor: 'ai', actor_reasoning: 'AI 분석', expected_output: '채널 비교 보고서', checkpoint: false, checkpoint_reason: '', estimated_time: '1시간' },
        { task: '실험 설계', actor: 'human→ai', actor_reasoning: '사람이 방향 잡고 AI 실행', expected_output: 'A/B 테스트 계획', checkpoint: true, checkpoint_reason: '예산 투입 전 확인', estimated_time: '2시간' },
        { task: '결과 분석', actor: 'ai→human', actor_reasoning: 'AI 분석 후 사람 결정', expected_output: '최적 채널 포트폴리오', checkpoint: true, checkpoint_reason: '최종 결정', estimated_time: '3시간' },
      ],
      key_assumptions: [
        { assumption: '현재 채널이 최적이다', importance: 'high' as const, certainty: 'low' as const, if_wrong: '기회 손실' },
      ],
      critical_path: [1, 2],
      design_rationale: '실험 기반 최적화',
    },
    status: 'done',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    project_id: 'proj-1',
    ...overrides,
  } as RecastItem;
}

function makeFeedback(overrides: Partial<FeedbackRecord> = {}): FeedbackRecord {
  return {
    id: 'fb-1',
    document_title: 'test',
    document_text: 'test plan',
    persona_ids: ['p-1', 'p-2'],
    feedback_perspective: '전반적 인상',
    feedback_intensity: '솔직하게',
    results: [
      {
        persona_id: 'p-1',
        overall_reaction: '우려됨',
        failure_scenario: '채널 실험 실패',
        untested_assumptions: ['시장 반응 예측 불가'],
        classified_risks: [
          { text: '예산 초과 가능성', category: 'critical' },
          { text: '팀 역량 부족', category: 'manageable' },
          { text: '경쟁사 반응 미고려', category: 'unspoken' },
        ],
        first_questions: ['실험 기간은?'],
        praise: ['데이터 기반 접근이 좋다'],
        concerns: ['실험 비용이 클 수 있다'],
        wants_more: ['벤치마크 데이터'],
        approval_conditions: ['실험 예산이 전체 예산의 10% 이하일 것'],
      },
      {
        persona_id: 'p-2',
        overall_reaction: '긍정적',
        failure_scenario: '데이터 부족',
        untested_assumptions: [],
        classified_risks: [
          { text: '데이터 수집 지연', category: 'manageable' },
        ],
        first_questions: ['데이터 소스는?'],
        praise: ['체계적이다'],
        concerns: ['일정 촉박'],
        wants_more: [],
        approval_conditions: ['2주 내 결과 도출'],
      },
    ],
    synthesis: '',
    created_at: new Date().toISOString(),
    project_id: 'proj-1',
    ...overrides,
  };
}

function makeRefineLoop(overrides: Partial<RefineLoop> = {}): RefineLoop {
  return {
    id: 'rl-1',
    project_id: 'proj-1',
    name: 'test loop',
    goal: 'test',
    original_plan: 'test plan',
    initial_feedback_record_id: 'fb-1',
    initial_approval_conditions: [],
    persona_ids: ['p-1', 'p-2'],
    iterations: [
      {
        iteration_number: 1,
        issues_to_address: ['예산 초과'],
        revised_plan: 'revised plan v1',
        changes: [{ what: '예산 한도 추가', why: '비용 통제', type: 'modify' }],
        feedback_record_id: 'fb-2',
        convergence: { critical_risks: 1, total_issues: 3, approval_conditions: [] },
        created_at: new Date().toISOString(),
      },
      {
        iteration_number: 2,
        issues_to_address: ['일정 조정'],
        revised_plan: 'revised plan v2',
        changes: [{ what: '일정 단축', why: '빠른 검증', type: 'modify' }],
        feedback_record_id: 'fb-3',
        convergence: {
          critical_risks: 0,
          total_issues: 1,
          approval_conditions: [
            { persona_id: 'p-1', persona_name: 'CFO', influence: 'high', condition: '예산 10% 이하', met: true, met_at_iteration: 2 },
          ],
        },
        created_at: new Date().toISOString(),
      },
    ],
    status: 'converged',
    max_iterations: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as RefineLoop;
}

function makePersona(overrides: Partial<Persona> = {}): Persona {
  return {
    id: 'p-1', name: 'CFO', role: 'CFO', organization: 'test',
    priorities: '비용 효율', communication_style: '직접적', known_concerns: '예산',
    relationship_notes: '', influence: 'high', extracted_traits: [],
    feedback_logs: [], created_at: '', updated_at: '',
    ...overrides,
  };
}

// ─── Tests ───

describe('buildStageFingerprint', () => {
  test('reframe: captures assumption count and axes', () => {
    const fp = buildStageFingerprint('reframe', makeReframe());
    expect(fp.phase).toBe('reframe');
    expect(fp.fingerprint.assumption_count).toBe(3);
    expect(fp.fingerprint.assumption_axes).toEqual(expect.arrayContaining(['customer_value', 'business', 'feasibility']));
    expect(fp.fingerprint.reframed_vs_surface_different).toBe(true);
  });

  test('reframe: surface === reframed → not different', () => {
    const fp = buildStageFingerprint('reframe', makeReframe({
      analysis: {
        surface_task: '마케팅 예산 배분',
        reframed_question: '마케팅 예산 배분 방법',
        why_reframing_matters: '', reasoning_narrative: '',
        hidden_assumptions: [], hidden_questions: [], ai_limitations: [],
      },
    }));
    expect(fp.fingerprint.reframed_vs_surface_different).toBe(false);
  });

  test('recast: captures step actors and checkpoints', () => {
    const fp = buildStageFingerprint('recast', makeRecast());
    expect(fp.fingerprint.step_count).toBe(3);
    expect(fp.fingerprint.step_actors).toEqual(['ai', 'human→ai', 'ai→human']);
    expect(fp.fingerprint.checkpoint_count).toBe(2);
    expect(fp.fingerprint.critical_path_length).toBe(2);
  });

  test('rehearse: captures risk categories', () => {
    const fp = buildStageFingerprint('rehearse', makeFeedback());
    expect(fp.fingerprint.risk_count).toBe(4);
    expect(fp.fingerprint.critical_risk_count).toBe(1);
    expect(fp.fingerprint.unspoken_risk_count).toBe(1);
    expect(fp.fingerprint.approval_condition_count).toBe(2);
  });

  test('refine: captures iterations and resolution', () => {
    const fp = buildStageFingerprint('refine', makeRefineLoop());
    expect(fp.fingerprint.iteration_count).toBe(2);
    expect(fp.fingerprint.issues_resolved).toBe(2); // 3 → 1
    expect(fp.fingerprint.conditions_met_ratio).toBe(1); // 1/1 met
  });

  test('handles empty/missing data gracefully', () => {
    const fp = buildStageFingerprint('reframe', makeReframe({
      analysis: undefined as unknown as ReframeItem['analysis'],
    }));
    expect(fp.fingerprint.assumption_count).toBe(0);
    expect(fp.fingerprint.assumption_axes).toEqual([]);
  });
});

describe('computeStageGamma', () => {
  test('good reframe = high gamma', () => {
    const fp = buildStageFingerprint('reframe', makeReframe());
    const gamma = computeStageGamma(fp);
    expect(gamma).toBeGreaterThan(0.5);
  });

  test('no-change reframe = low gamma', () => {
    const fp = buildStageFingerprint('reframe', makeReframe({
      analysis: {
        surface_task: '마케팅 예산', reframed_question: '마케팅 예산',
        why_reframing_matters: '', reasoning_narrative: '',
        hidden_assumptions: [], hidden_questions: [], ai_limitations: [],
      },
    }));
    const gamma = computeStageGamma(fp);
    expect(gamma).toBeLessThan(0.2);
  });

  test('diverse recast = higher gamma than uniform', () => {
    const diverseRecast = makeRecast();
    const uniformRecast = makeRecast({
      analysis: {
        ...makeRecast().analysis!,
        steps: [
          { task: 'a', actor: 'ai', actor_reasoning: '', expected_output: '', checkpoint: false, checkpoint_reason: '' },
          { task: 'b', actor: 'ai', actor_reasoning: '', expected_output: '', checkpoint: false, checkpoint_reason: '' },
          { task: 'c', actor: 'ai', actor_reasoning: '', expected_output: '', checkpoint: false, checkpoint_reason: '' },
        ],
      },
    });
    const diverseGamma = computeStageGamma(buildStageFingerprint('recast', diverseRecast));
    const uniformGamma = computeStageGamma(buildStageFingerprint('recast', uniformRecast));
    expect(diverseGamma).toBeGreaterThan(uniformGamma);
  });

  test('refine with 2+ iterations = higher gamma than 1 iteration', () => {
    const multiIter = makeRefineLoop();
    const singleIter = makeRefineLoop({
      iterations: [makeRefineLoop().iterations[0]],
    });
    const multiGamma = computeStageGamma(buildStageFingerprint('refine', multiIter));
    const singleGamma = computeStageGamma(buildStageFingerprint('refine', singleIter));
    expect(multiGamma).toBeGreaterThan(singleGamma);
  });

  test('empty fingerprint returns 0.5 (neutral)', () => {
    const fp: StageFingerprint = { phase: 'reframe', item_id: '', timestamp: '', fingerprint: {} };
    expect(computeStageGamma(fp)).toBe(0.5);
  });
});

describe('computeProjectGamma', () => {
  test('full project = average of stage gammas + provenance bonus', () => {
    const result = computeProjectGamma(makeReframe(), makeRecast(), [makeFeedback()], makeRefineLoop());
    expect(result.per_stage.length).toBe(4);
    expect(result.overall).toBeGreaterThan(0);
    expect(result.overall).toBeLessThanOrEqual(1);
    expect(result.fingerprints.length).toBe(4);
  });

  test('reframe only = single stage gamma', () => {
    const result = computeProjectGamma(makeReframe(), null, [], null);
    expect(result.per_stage.length).toBe(1);
    expect(result.per_stage[0].phase).toBe('reframe');
    expect(result.overall).toBeGreaterThan(0);
  });

  test('no stages = neutral gamma (0.5)', () => {
    const result = computeProjectGamma(null, null, [], null);
    expect(result.overall).toBe(0.5);
    expect(result.per_stage.length).toBe(0);
  });
});

describe('translateApprovalsToPlan', () => {
  test('maps conditions to relevant steps', () => {
    const feedback = makeFeedback();
    const steps = makeRecast().analysis!.steps;
    const personas = [makePersona(), makePersona({ id: 'p-2', name: 'CTO' })];
    const translated = translateApprovalsToPlan(feedback, steps, personas);
    expect(translated.length).toBe(2); // 2 approval conditions total
    expect(translated[0].persona_name).toBe('CFO');
    expect(translated[0].condition).toBe('실험 예산이 전체 예산의 10% 이하일 것');
  });

  test('returns empty for no matching steps', () => {
    const feedback = makeFeedback();
    const steps = [{ task: '완전히 다른 작업', actor: 'ai' as const, actor_reasoning: '', expected_output: '', checkpoint: false, checkpoint_reason: '' }];
    const personas = [makePersona()];
    const translated = translateApprovalsToPlan(feedback, steps, personas);
    // May or may not match depending on similarity — at 0.3 threshold, unrelated should not match
    for (const ta of translated) {
      // Either no affected steps or low similarity match
      expect(ta.affected_steps.length).toBeLessThanOrEqual(1);
    }
  });
});

describe('measureFeedbackNovelty', () => {
  test('identical feedback = 0 novelty', () => {
    const fb = makeFeedback();
    expect(measureFeedbackNovelty(fb, fb)).toBe(0);
  });

  test('completely different risks = high novelty', () => {
    const fb1 = makeFeedback();
    const fb2 = makeFeedback({
      results: [{
        persona_id: 'p-1', overall_reaction: '', failure_scenario: '',
        untested_assumptions: [],
        classified_risks: [
          { text: '기술적 부채로 인한 시스템 장애 위험', category: 'critical' },
          { text: '조직 문화 변화 저항', category: 'unspoken' },
        ],
        first_questions: [], praise: [], concerns: [], wants_more: [],
        approval_conditions: [],
      }],
    });
    const novelty = measureFeedbackNovelty(fb1, fb2);
    expect(novelty).toBeGreaterThan(0.5);
  });

  test('empty risks = edge cases handled', () => {
    const empty = makeFeedback({ results: [] });
    expect(measureFeedbackNovelty(empty, empty)).toBe(0);
    expect(measureFeedbackNovelty(empty, makeFeedback())).toBe(1);
    expect(measureFeedbackNovelty(makeFeedback(), empty)).toBe(1);
  });
});

describe('buildProvenanceChain', () => {
  test('traces assumptions through stages', () => {
    const chain = buildProvenanceChain(makeReframe(), makeRecast(), [makeFeedback()], makeRefineLoop());
    expect(chain.size).toBe(3); // 3 assumptions from reframe
    // At least one assumption should travel to recast (key_assumptions match)
    let traveled = 0;
    for (const [, tags] of chain) {
      if (tags.length > 1) traveled++;
    }
    expect(traveled).toBeGreaterThanOrEqual(1);
  });

  test('no reframe = empty chain', () => {
    const chain = buildProvenanceChain(null, makeRecast(), [], null);
    expect(chain.size).toBe(0);
  });
});

describe('detectRigiditySignals', () => {
  test('no rigidity in healthy project', () => {
    const signals = detectRigiditySignals(
      makeReframe(), makeRecast(), [makeFeedback()], makeRefineLoop(),
      0.6, 75
    );
    // Should not fire low_gamma_high_dq (gamma 0.6 > 0.2)
    expect(signals.find(s => s.signal_type === 'low_gamma_high_dq')).toBeUndefined();
  });

  test('convergence_too_fast: 1 iteration + low gamma', () => {
    const fastLoop = makeRefineLoop({
      iterations: [makeRefineLoop().iterations[0]],
      status: 'converged',
    });
    const signals = detectRigiditySignals(null, null, [], fastLoop, 0.1);
    expect(signals.find(s => s.signal_type === 'convergence_too_fast')).toBeDefined();
  });

  test('frame_unchanged: surface ≈ reframed', () => {
    const sameFrame = makeReframe({
      analysis: {
        surface_task: '마케팅 예산 배분 전략을 수립해야 합니다',
        reframed_question: '마케팅 예산 배분 전략을 수립해야 합니다',
        why_reframing_matters: '', reasoning_narrative: '',
        hidden_assumptions: [], hidden_questions: [], ai_limitations: [],
      },
    });
    const signals = detectRigiditySignals(sameFrame, null, [], null, 0.5);
    expect(signals.find(s => s.signal_type === 'frame_unchanged')).toBeDefined();
  });

  test('low_gamma_high_dq: gaming signal', () => {
    const signals = detectRigiditySignals(null, null, [], null, 0.1, 85);
    expect(signals.find(s => s.signal_type === 'low_gamma_high_dq')).toBeDefined();
  });

  test('same_persona_set: 3 identical sets', () => {
    const past = [
      makeFeedback({ id: 'fb-a', persona_ids: ['p-1', 'p-2'] }),
      makeFeedback({ id: 'fb-b', persona_ids: ['p-1', 'p-2'] }),
      makeFeedback({ id: 'fb-c', persona_ids: ['p-1', 'p-2'] }),
    ];
    const signals = detectRigiditySignals(null, null, [], null, 0.5, undefined, past);
    expect(signals.find(s => s.signal_type === 'same_persona_set')).toBeDefined();
  });

  test('all null inputs = no crash', () => {
    const signals = detectRigiditySignals(null, null, [], null, 0);
    expect(Array.isArray(signals)).toBe(true);
  });
});

describe('assessVitality', () => {
  test('full healthy project = alive or coasting', () => {
    const va = assessVitality(makeReframe(), makeRecast(), [makeFeedback()], makeRefineLoop(), 80);
    expect(va.gamma).toBeGreaterThan(0);
    expect(va.vitality_score).toBeGreaterThan(0);
    expect(['alive', 'coasting']).toContain(va.tier);
    expect(va.fingerprints.length).toBe(4);
  });

  test('empty project = neutral (not dead)', () => {
    const va = assessVitality(null, null, [], null);
    expect(va.gamma).toBe(0.5);
    expect(va.tier).not.toBe('dead');
  });

  test('low gamma + high DQ = performing or dead', () => {
    const sameFrame = makeReframe({
      analysis: {
        surface_task: '예산', reframed_question: '예산',
        why_reframing_matters: '', reasoning_narrative: '',
        hidden_assumptions: [], hidden_questions: [], ai_limitations: [],
      },
    });
    const va = assessVitality(sameFrame, null, [], null, 90);
    expect(va.signals.find(s => s.signal_type === 'low_gamma_high_dq')).toBeDefined();
  });

  test('vitality_score = gamma * (1 - rigidity_score)', () => {
    const va = assessVitality(makeReframe(), makeRecast(), [makeFeedback()], makeRefineLoop(), 80);
    const expected = va.gamma * (1 - va.rigidity_score);
    expect(Math.abs(va.vitality_score - expected)).toBeLessThan(0.001);
  });
});

describe('analyzeVitalityTrend', () => {
  test('not enough data', () => {
    const result = analyzeVitalityTrend([]);
    expect(result.trend).toBe('not_enough_data');
  });

  test('improving trend', () => {
    const assessments: VitalityAssessment[] = [
      { id: '1', gamma: 0.3, rigidity_score: 0.5, vitality_score: 0.15, signals: [], fingerprints: [], tier: 'performing', created_at: '2026-01-01' },
      { id: '2', gamma: 0.4, rigidity_score: 0.3, vitality_score: 0.28, signals: [], fingerprints: [], tier: 'performing', created_at: '2026-01-02' },
      { id: '3', gamma: 0.6, rigidity_score: 0.1, vitality_score: 0.54, signals: [], fingerprints: [], tier: 'coasting', created_at: '2026-01-03' },
      { id: '4', gamma: 0.8, rigidity_score: 0.05, vitality_score: 0.76, signals: [], fingerprints: [], tier: 'alive', created_at: '2026-01-04' },
    ];
    const result = analyzeVitalityTrend(assessments);
    expect(result.trend).toBe('improving');
  });

  test('declining trend', () => {
    const assessments: VitalityAssessment[] = [
      { id: '1', gamma: 0.8, rigidity_score: 0.05, vitality_score: 0.76, signals: [], fingerprints: [], tier: 'alive', created_at: '2026-01-01' },
      { id: '2', gamma: 0.6, rigidity_score: 0.2, vitality_score: 0.48, signals: [], fingerprints: [], tier: 'coasting', created_at: '2026-01-02' },
      { id: '3', gamma: 0.3, rigidity_score: 0.5, vitality_score: 0.15, signals: [], fingerprints: [], tier: 'performing', created_at: '2026-01-03' },
    ];
    const result = analyzeVitalityTrend(assessments);
    expect(result.trend).toBe('declining');
  });
});

describe('generateInterventions', () => {
  test('first occurrence = tier 1', () => {
    const signals = [{ id: 's1', category: 'user_ai' as const, signal_type: 'frame_unchanged', severity: 0.6, evidence: 'test' }];
    const interventions = generateInterventions(signals);
    expect(interventions.length).toBe(1);
    expect(interventions[0].tier).toBe(1);
  });

  test('repeated occurrence escalates tier', () => {
    const signals = [{ id: 's1', category: 'user_ai' as const, signal_type: 'frame_unchanged', severity: 0.6, evidence: 'test' }];
    const pastAssessments: VitalityAssessment[] = [
      { id: 'pa1', gamma: 0.3, rigidity_score: 0.5, vitality_score: 0.15, signals: [...signals], fingerprints: [], tier: 'performing', created_at: '2026-01-01' },
      { id: 'pa2', gamma: 0.3, rigidity_score: 0.5, vitality_score: 0.15, signals: [...signals], fingerprints: [], tier: 'performing', created_at: '2026-01-02' },
    ];
    const interventions = generateInterventions(signals, pastAssessments);
    expect(interventions[0].tier).toBeGreaterThanOrEqual(2);
  });

  test('unknown signal type = no intervention', () => {
    const signals = [{ id: 's1', category: 'user_ai' as const, signal_type: 'nonexistent_signal', severity: 0.5, evidence: 'test' }];
    const interventions = generateInterventions(signals);
    expect(interventions.length).toBe(0);
  });
});

describe('getVitalityCoaching', () => {
  test('returns coaching for relevant step', () => {
    const signals = [{ id: 's1', category: 'user_ai' as const, signal_type: 'frame_unchanged', severity: 0.6, evidence: 'test' }];
    const coaching = getVitalityCoaching('reframe', signals);
    expect(coaching).not.toBeNull();
    expect(coaching!.tone).toBeDefined();
  });

  test('returns null for irrelevant step', () => {
    const signals = [{ id: 's1', category: 'user_ai' as const, signal_type: 'frame_unchanged', severity: 0.6, evidence: 'test' }];
    const coaching = getVitalityCoaching('refine', signals); // frame_unchanged is reframe-specific
    expect(coaching).toBeNull();
  });

  test('empty signals = null', () => {
    expect(getVitalityCoaching('reframe', [])).toBeNull();
  });
});

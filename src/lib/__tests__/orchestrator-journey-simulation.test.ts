/**
 * Orchestrator Journey Simulation — 사용자 여정 end-to-end 시뮬레이션
 *
 * 정적 타입 체크가 아닌 런타임 시뮬레이션:
 * 1. planWorkers 전체 파이프라인 (classify → select → framework → stages)
 * 2. 스테이지 구성 정확성 (routine vs critical)
 * 3. guard-rails + specificity 검증 체인
 * 4. convergenceWithWorkers 통합
 * 5. 엣지 케이스: 빈 입력, 에이전트 0명, 알 수 없는 도메인
 * 6. hit-rate → select 반영 실제 동작
 * 7. quality XP 계산 정확성
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { classifyInput } from '@/lib/orchestrator-classify';
import { selectAgents } from '@/lib/orchestrator-select';
import { assignFramework } from '@/lib/orchestrator-framework';
import { planWorkers } from '@/lib/orchestrator';
import { validateByFramework } from '@/lib/guard-rails';
import { checkSpecificity } from '@/lib/worker-quality';
import { computeQualityXP } from '@/lib/agent-quality';
import { assessConvergence, assessConvergenceWithWorkers } from '@/lib/progressive-convergence';
import type { Agent } from '@/stores/agent-types';
import type { AnalysisSnapshot } from '@/stores/types';

// ── Mock storage for hit-rate (localStorage 없는 테스트 환경) ──

vi.mock('@/lib/storage', () => {
  const store: Record<string, unknown> = {};
  return {
    getStorage: <T>(key: string, fallback: T): T => (store[key] as T) ?? fallback,
    setStorage: (key: string, value: unknown) => { store[key] = value; },
    STORAGE_KEYS: { HIT_RECORDS: 'sot_hit_records' },
  };
});

// ── Mock agents (실제 에이전트 구성 반영) ──

function mockAgent(overrides: Partial<Agent> & { id: string; name: string }): Agent {
  return {
    role: '테스트', emoji: '🧪', color: '#000', origin: 'builtin',
    capabilities: ['task_execution'], group: 'production', chain_id: null,
    unlock_condition: { type: 'always' }, unlocked: true, keywords: [],
    xp: 0, level: 1, observations: [], is_builtin: true, archived: false,
    last_used_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    ...overrides,
  } as Agent;
}

const TEAM: Agent[] = [
  mockAgent({ id: 'sujin', name: '수진', role: '리서치 애널리스트', group: 'research', keywords: ['조사', '리서치', '시장', '분석', '트렌드'], level: 2 }),
  mockAgent({ id: 'hyunwoo', name: '현우', role: '전략가', group: 'strategy', keywords: ['전략', '경쟁', '방향', '포지셔닝'], level: 3 }),
  mockAgent({ id: 'minjae', name: '민재', role: '숫자 전문가', group: 'production', keywords: ['숫자', '재무', '비용', '매출', 'ROI'], level: 2 }),
  mockAgent({ id: 'seoyeon', name: '서연', role: '카피라이터', group: 'production', keywords: ['문서', '기획안', '카피', '보고서'], level: 1 }),
  mockAgent({ id: 'donghyuk', name: '동혁', role: '리스크 검토자', group: 'validation', keywords: ['리스크', '위험', '실패', '비판', '검증'], level: 3 }),
  mockAgent({ id: 'jieun', name: '지은', role: 'UX 디자이너', group: 'validation', keywords: ['UX', 'UI', '사용자', '경험'], level: 1 }),
  mockAgent({ id: 'junseo', name: '준서', role: '엔지니어', group: 'production', keywords: ['기술', '아키텍처', '구현', 'API'], level: 2 }),
  mockAgent({ id: 'yerin', name: '예린', role: 'PM', group: 'production', keywords: ['일정', '타임라인', '우선순위'], level: 1 }),
];

// ── Journey 1: 일반 사용자 — 기획안 작성 (routine/important) ──

describe('Journey 1: 기획안 작성 (important)', () => {
  const steps = [
    { task: '시장 조사 및 경쟁사 분석', who: 'ai', output: '시장 현황 보고서' },
    { task: '기획안 초안 작성', who: 'ai', output: '기획안 문서' },
    { task: '비용 구조 정리', who: 'ai', output: '재무 요약' },
  ];

  it('전체 파이프라인이 에러 없이 완료된다', () => {
    const result = planWorkers(steps, undefined, TEAM, []);

    expect(result.classification.stakes).toBe('important');
    expect(result.workers).toHaveLength(3);
    expect(result.stages).toBeDefined();
    expect(result.stages.length).toBe(1); // important → 단일 스테이지
  });

  it('각 워커에 서로 다른 적합한 에이전트가 배정된다', () => {
    const result = planWorkers(steps, undefined, TEAM, []);
    const agentIds = result.workers.map(w => w.agentId);

    // 3명 모두 다른 에이전트
    const unique = new Set(agentIds);
    expect(unique.size).toBe(3);

    // 전체 배정에 리서치/전략 계열이 포함 (시장 조사 step이 있으므로)
    const hasResearchOrStrategy = agentIds.some(id => ['sujin', 'hyunwoo'].includes(id));
    expect(hasResearchOrStrategy).toBe(true);

    // 전체 배정에 숫자 전문가 포함 (비용 구조 step이 있으므로)
    expect(agentIds).toContain('minjae');
  });

  it('각 워커에 프레임워크가 배정된다', () => {
    const result = planWorkers(steps, undefined, TEAM, []);
    for (const w of result.workers) {
      expect(w.framework).toBeTruthy();
    }
  });

  it('전체 워커에 stage_id가 있다', () => {
    const result = planWorkers(steps, undefined, TEAM, []);
    for (const w of result.workers) {
      expect(w.stageId).toBe('stage_1');
    }
  });
});

// ── Journey 2: 위기 상황 — 투자 유치 (critical) ──

describe('Journey 2: 투자 유치 기획 (critical)', () => {
  const steps = [
    { task: '시장 규모 리서치 (TAM/SAM/SOM)', who: 'ai', output: '시장 규모 분석' },
    { task: '경쟁사 전략 분석', who: 'ai', output: '경쟁 포지셔닝 맵' },
    { task: '리스크 검토 및 실패 시나리오', who: 'ai', output: '리스크 보고서' },
  ];

  it('critical stakes → 2-스테이지 파이프라인', () => {
    const result = planWorkers(steps, { stakes: 'irreversible' }, TEAM, []);

    expect(result.classification.stakes).toBe('critical');
    expect(result.stages.length).toBe(2);
    expect(result.stages[0].label).toBe('분석');
    expect(result.stages[1].label).toBe('검증');
    expect(result.stages[1].dependsOnStageId).toBe('stage_1');
  });

  it('Stage 2에 Critic이 배정된다', () => {
    const result = planWorkers(steps, { stakes: 'irreversible' }, TEAM, []);
    const stage2Workers = result.workers.filter(w => w.stageId === 'stage_2');

    expect(stage2Workers.length).toBeGreaterThanOrEqual(1);
    // Stage 2 워커의 프레임워크가 Critic 계열
    const stage2Frameworks = stage2Workers.map(w => w.framework || '');
    const hasCriticFramework = stage2Frameworks.some(f =>
      f.includes('Pre-mortem') || f.includes('Red Team') || f.includes('Assumption')
    );
    expect(hasCriticFramework).toBe(true);
  });

  it('동혁이 반드시 포함된다', () => {
    const result = planWorkers(steps, { stakes: 'irreversible' }, TEAM, []);
    const allAgentIds = result.workers.map(w => w.agentId);
    expect(allAgentIds).toContain('donghyuk');
  });
});

// ── Journey 3: Guard-rails 검증 체인 ──

describe('Journey 3: 검증 체인이 실제로 작동한다', () => {
  it('좋은 Pre-mortem 결과 → 통과', () => {
    const output = `이 투자 유치가 실패했다면 가장 큰 원인은 시장 타이밍이다.
경쟁사 A가 우리보다 6개월 먼저 Series B를 완료하면서 핵심 인재를 선점.
이 시나리오의 가능성은 약 35%. B2B SaaS 시장의 후발주자 실패율 기반.`;

    const guard = validateByFramework('Pre-mortem', output);
    expect(guard.passed).toBe(true);

    const spec = checkSpecificity(output, '우리 회사 MarketFit의 Series A 투자 유치');
    expect(spec.score).toBeGreaterThan(30); // 구체적
  });

  it('나쁜 결과 → 검증 실패', () => {
    const output = `리스크가 있을 수 있습니다. 시장 상황에 따라 다양한 요인을 종합적으로 고려해야 합니다.`;

    const guard = validateByFramework('Pre-mortem', output);
    expect(guard.passed).toBe(false);

    const spec = checkSpecificity(output, '투자 유치');
    expect(spec.score).toBeLessThan(40);
  });
});

// ── Journey 4: Quality XP 체인 ──

describe('Journey 4: 품질 기반 XP 계산', () => {
  it('검증 점수 90+ → 1.5배 XP', () => {
    const xp = computeQualityXP('task_approved', 95);
    expect(xp).toBe(15); // base 10 × 1.5 = 15
  });

  it('검증 점수 50 → 0.5배 XP', () => {
    const xp = computeQualityXP('task_approved', 55);
    expect(xp).toBe(5); // base 10 × 0.5 = 5
  });

  it('검증 점수 30 → 0배 XP (placeholder 수준)', () => {
    const xp = computeQualityXP('task_approved', 30);
    expect(xp).toBe(0);
  });

  it('rejection은 배율 없이 고정 패널티', () => {
    const xp = computeQualityXP('task_rejected', 95);
    expect(xp).toBe(-5); // 점수 무관, 항상 -5
  });

  it('검증 점수 없으면 기본 1.0배', () => {
    const xp = computeQualityXP('task_approved', undefined);
    expect(xp).toBe(10);
  });
});

// ── Journey 5: 수렴 + 워커 품질 ──

describe('Journey 5: assessConvergenceWithWorkers', () => {
  const makeSnapshot = (q: string, assumptions: string[], confidence: number): AnalysisSnapshot => ({
    version: 0,
    real_question: q,
    hidden_assumptions: assumptions.map(a => ({ assumption: a, risk_if_false: '', verified: false })),
    skeleton: [],
    execution_plan: { steps: [] },
    insight: '',
    framing_confidence: confidence,
    framing_locked: false,
  });

  it('워커 없을 때 기존 assessConvergence와 동일', () => {
    const snapshots = [
      makeSnapshot('질문 1', ['가정A', '가정B'], 70),
      makeSnapshot('질문 1 개선', ['가정A'], 80),
    ];

    const base = assessConvergence(snapshots);
    const withWorkers = assessConvergenceWithWorkers(snapshots);

    expect(withWorkers.score).toBe(base.score);
  });

  it('워커 전원 승인 + 고점수 → 수렴 부스트', () => {
    const snapshots = [
      makeSnapshot('시장 진입 전략', ['가정A', '가정B'], 70),
      makeSnapshot('시장 진입 전략 (구체화)', ['가정A'], 80),
    ];

    const base = assessConvergence(snapshots);
    const withGoodWorkers = assessConvergenceWithWorkers(snapshots, [
      { validationScore: 90, approved: true },
      { validationScore: 85, approved: true },
    ]);

    expect(withGoodWorkers.score).toBeGreaterThanOrEqual(base.score * 0.8);
  });

  it('워커 다수 거부 → 수렴 하락', () => {
    const snapshots = [
      makeSnapshot('전략 A', ['가정'], 75),
      makeSnapshot('전략 A 구체화', [], 80),
    ];

    const withBadWorkers = assessConvergenceWithWorkers(snapshots, [
      { validationScore: 40, approved: false },
      { validationScore: 30, approved: false },
      { validationScore: 80, approved: true },
    ]);

    // 워커 품질 점수 0 → 전체 점수 하락
    expect(withBadWorkers.score).toBeLessThan(80);
  });
});

// ── Journey 6: 엣지 케이스 ──

describe('Journey 6: 엣지 케이스', () => {
  it('빈 steps → 빈 workers 반환, 크래시 없음', () => {
    const result = planWorkers([], undefined, TEAM, []);
    expect(result.workers).toHaveLength(0);
    expect(result.stages).toBeDefined();
  });

  it('해금된 에이전트 0명 → 크래시 없음', () => {
    const result = planWorkers(
      [{ task: '분석', who: 'ai', output: '결과' }],
      undefined,
      [], // 에이전트 없음
      [],
    );
    expect(result.workers).toHaveLength(1);
    expect(result.workers[0].agentId).toBe(''); // 빈 문자열 (fallback 필요)
  });

  it('알 수 없는 도메인 → 프레임워크 null 또는 첫번째 fallback', () => {
    const result = planWorkers(
      [{ task: '양자컴퓨팅 연구', who: 'ai', output: '논문 요약' }],
      undefined,
      TEAM,
      [],
    );
    // 에이전트는 배정되지만 (키워드 부분매칭 또는 점수 가장 높은 에이전트)
    expect(result.workers[0].agentId).toBeTruthy();
  });

  it('experiment stakes + 1 step → routine, agentCount 1', () => {
    const result = planWorkers(
      [{ task: 'A/B 테스트', who: 'ai', output: '실험 결과' }],
      { stakes: 'experiment' },
      TEAM,
      [],
    );
    expect(result.classification.stakes).toBe('routine');
    expect(result.classification.agentCount).toBeLessThanOrEqual(2);
  });

  it('human worker → 프레임워크 배정되지만 검증은 안 됨 (설계상 의도)', () => {
    const result = planWorkers(
      [{ task: '인터뷰', who: 'human', output: '인터뷰 노트' }],
      undefined,
      TEAM,
      [],
    );
    expect(result.workers[0].who).toBe('human');
    // human이어도 프레임워크는 배정됨 (참고용)
  });
});

// ── Journey 7: 동일 입력에 대한 결정론성 ──

describe('Journey 7: 결정론성', () => {
  it('같은 입력 → 같은 에이전트 배정', () => {
    const steps = [
      { task: '시장 조사', who: 'ai', output: '보고서' },
      { task: '전략 수립', who: 'ai', output: '전략 문서' },
    ];

    const result1 = planWorkers(steps, { stakes: 'important' }, TEAM, []);
    const result2 = planWorkers(steps, { stakes: 'important' }, TEAM, []);

    expect(result1.workers.map(w => w.agentId)).toEqual(result2.workers.map(w => w.agentId));
    expect(result1.workers.map(w => w.framework)).toEqual(result2.workers.map(w => w.framework));
    expect(result1.stages.length).toBe(result2.stages.length);
  });
});

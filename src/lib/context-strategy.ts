/**
 * context-strategy.ts — 적응형 Context 전략 엔진
 *
 * 문제: 모든 에이전트에 동일한 context(전체 Q&A + 가정 + 골격)를 줌.
 * - 리서치 에이전트에 사용자 대화를 주면 → 확증편향
 * - 숫자 에이전트에 서사적 대화를 주면 → 노이즈
 * - 비판 에이전트에 Q&A를 주면 → 대상 결과물이 아닌 대화를 비판
 *
 * 해결: task type에 따라 context 조립 전략을 자동 선택.
 *
 * 이건 기존 프레임워크(CrewAI, AutoGen, LangGraph 등)가 안 하는 것.
 * - CrewAI: 항상 이전 output만
 * - AutoGen: 항상 전체 broadcast
 * - LangGraph: 개발자가 수동 설계
 * - 우리: task type → 자동 전략 선택 → 자기개선
 *
 * AgentSwing(2026)의 "state-dependent routing" 개념을 정보 유형 레벨에 적용.
 */

import type { TaskType } from './task-classifier';
import { getStorage, setStorage } from './storage';

/* ─── Types ─── */

export type ContextStrategy =
  | 'full'           // 전체 context (Q&A + 가정 + 골격 + 문제). 종합/작성에 적합.
  | 'focused'        // 이전 stage 결과만. 비판/검증에 적합.
  | 'structured'     // 숫자, 가정, 데이터만 추출. 계산/분석에 적합.
  | 'compressed'     // 핵심 질문 + 문제 요약만. 전략/계획에 적합.
  | 'minimal';       // 문제 + task만. 독립 리서치에 적합 (편향 방지).

export interface ContextStrategyResult {
  strategy: ContextStrategy;
  reason: string;
}

/**
 * 각 전략이 user prompt에 포함하는 정보:
 *
 * | 정보          | full | focused | structured | compressed | minimal |
 * |---------------|------|---------|------------|------------|---------|
 * | problemText   |  ✓   |    ✓    |     ✓      |     ✓      |    ✓    |
 * | realQuestion  |  ✓   |    ✓    |     ✓      |     ✓      |    ✓    |
 * | skeleton      |  ✓   |    ✗    |     ✗      |     ✓      |    ✗    |
 * | qaHistory     |  ✓   |    ✗    |  숫자만    |  최근1개   |    ✗    |
 * | assumptions   |  ✓   |    ✓    |     ✓      |     ✓      |    ✗    |
 * | peerResults   |  ✗   |    ✓    |     ✗      |     ✗      |    ✗    |
 */

/* ─── Default Strategy Map ─── */

const DEFAULT_STRATEGY: Record<TaskType, ContextStrategy> = {
  research:     'minimal',      // 독립 리서치 — 사용자 편향 최소화
  analysis:     'structured',   // 분석 — 데이터와 가정에 집중
  synthesis:    'full',         // 종합 — 전체 맥락 필요
  strategy:     'compressed',   // 전략 — 핵심만 빠르게
  calculation:  'structured',   // 계산 — 숫자와 가정만
  writing:      'full',         // 작성 — 톤, 맥락, 대상 전체 필요
  critique:     'focused',      // 비판 — 대상 결과물만 (Stage 1 results)
  design:       'compressed',   // 설계 — 요구사항 요약
  legal_review: 'structured',   // 법률 — 사실 관계만
  planning:     'compressed',   // 계획 — 목표와 제약
};

/* ─── Strategy Reason (디버깅/투명성) ─── */

const STRATEGY_REASONS: Record<ContextStrategy, string> = {
  full:       '전체 맥락 필요 (종합/작성)',
  focused:    '대상 결과물에 집중 (비판/검증)',
  structured: '데이터와 가정에 집중 (분석/계산)',
  compressed: '핵심만 압축 (전략/계획)',
  minimal:    '독립 실행, 편향 방지 (리서치)',
};

/* ─── Self-Tuning: 전략별 효과 추적 ─── */

interface StrategyRecord {
  agentId: string;
  taskType: TaskType;
  strategy: ContextStrategy;
  wasHit: boolean;  // 사용자 반응이 'hit'이었는지
}

const STRATEGY_STORAGE_KEY = 'sot_context_strategy_records';

function getStrategyRecords(): StrategyRecord[] {
  return getStorage<StrategyRecord[]>(STRATEGY_STORAGE_KEY, []);
}

/**
 * 전략 효과 기록.
 * hit-rate.ts의 recordHitReaction 후에 호출하여
 * "이 agent + task type에 이 전략이 효과적이었는지" 추적.
 */
export function recordStrategyOutcome(
  agentId: string,
  taskType: TaskType,
  strategy: ContextStrategy,
  wasHit: boolean,
): void {
  const records = getStrategyRecords();
  records.push({ agentId, taskType, strategy, wasHit });
  // 최근 500건만 유지
  if (records.length > 500) records.splice(0, records.length - 500);
  setStorage(STRATEGY_STORAGE_KEY, records);
}

/* ─── Main: 전략 결정 ─── */

/**
 * task type과 에이전트 기반으로 최적의 context 전략을 결정.
 *
 * 1순위: 축적된 데이터에서 이 agent+taskType의 가장 효과적인 전략
 * 2순위: taskType 기본 전략 (DEFAULT_STRATEGY)
 */
export function selectContextStrategy(
  taskType: TaskType,
  agentId?: string,
): ContextStrategyResult {
  // 데이터 기반 전략 선택 (10건 이상 데이터가 있을 때)
  if (agentId) {
    const records = getStrategyRecords()
      .filter(r => r.agentId === agentId && r.taskType === taskType);

    if (records.length >= 10) {
      // 전략별 히트율 계산
      const strategyHitRates = new Map<ContextStrategy, { hits: number; total: number }>();
      for (const r of records) {
        const entry = strategyHitRates.get(r.strategy) || { hits: 0, total: 0 };
        entry.total++;
        if (r.wasHit) entry.hits++;
        strategyHitRates.set(r.strategy, entry);
      }

      // 가장 효과적인 전략 찾기 (5건 이상 데이터가 있는 것만)
      let bestStrategy: ContextStrategy | null = null;
      let bestRate = 0;
      for (const [strategy, { hits, total }] of strategyHitRates) {
        if (total < 5) continue;
        const rate = hits / total;
        if (rate > bestRate) {
          bestRate = rate;
          bestStrategy = strategy;
        }
      }

      if (bestStrategy && bestRate > 0.5) {
        return {
          strategy: bestStrategy,
          reason: `데이터 기반: ${agentId}의 ${taskType} 작업에서 ${bestStrategy} 전략이 히트율 ${Math.round(bestRate * 100)}%`,
        };
      }
    }
  }

  // 기본 전략
  const strategy = DEFAULT_STRATEGY[taskType];
  return {
    strategy,
    reason: STRATEGY_REASONS[strategy],
  };
}

/* ─── Context Builder: 전략에 따른 context 조립 ─── */

export interface WorkerContextInput {
  problemText: string;
  realQuestion: string;
  skeleton: string[];
  hiddenAssumptions: string[];
  qaHistory: Array<{ q: string; a: string }>;
  peerResults?: string;  // 이전 stage 완료된 워커들의 결과
}

export interface AssembledContext {
  userPromptParts: string[];  // user prompt에 포함될 파트들
  tokenEstimate: number;      // 대략적 토큰 추정 (한국어 기준 1자≈1토큰)
}

/**
 * context 전략에 따라 user prompt의 context 파트를 조립.
 * buildWorkerTaskPrompt에서 호출.
 */
export function assembleContext(
  strategy: ContextStrategy,
  input: WorkerContextInput,
): AssembledContext {
  const parts: string[] = [];

  switch (strategy) {
    case 'full': {
      // 전부 포함
      parts.push(`프로젝트 배경: ${input.problemText}`);
      parts.push(`핵심 질문: ${input.realQuestion}`);
      if (input.skeleton.length > 0) {
        parts.push(`뼈대: ${input.skeleton.join(' / ')}`);
      }
      if (input.hiddenAssumptions.length > 0) {
        parts.push(`검증 필요 가정:\n${input.hiddenAssumptions.map(a => `- ${a}`).join('\n')}`);
      }
      if (input.qaHistory.length > 0) {
        const qaText = input.qaHistory.map((qa, i) => `Q${i + 1}: ${qa.q}\nA${i + 1}: ${qa.a}`).join('\n');
        parts.push(`Q&A:\n${qaText}`);
      }
      break;
    }

    case 'focused': {
      // 핵심 질문 + 이전 워커 결과만 (비판/검증용)
      parts.push(`프로젝트: ${input.problemText.slice(0, 200)}`);
      parts.push(`핵심 질문: ${input.realQuestion}`);
      if (input.hiddenAssumptions.length > 0) {
        parts.push(`전제:\n${input.hiddenAssumptions.map(a => `- ${a}`).join('\n')}`);
      }
      if (input.peerResults) {
        parts.push(`팀원들의 분석 결과:\n${input.peerResults}`);
      }
      // Q&A, skeleton 제외 — 대상 결과물에 집중
      break;
    }

    case 'structured': {
      // 데이터, 숫자, 가정만 추출 (계산/분석용)
      parts.push(`프로젝트: ${input.problemText.slice(0, 200)}`);
      parts.push(`핵심 질문: ${input.realQuestion}`);
      if (input.hiddenAssumptions.length > 0) {
        parts.push(`가정:\n${input.hiddenAssumptions.map(a => `- ${a}`).join('\n')}`);
      }
      // Q&A에서 숫자/데이터가 포함된 답변만 추출
      if (input.qaHistory.length > 0) {
        const dataAnswers = input.qaHistory.filter(qa => {
          const hasNumbers = /\d[\d,.]*\s*(%|만|억|조|원|달러|명|건|개|배|\$|M|K)/.test(qa.a);
          const hasData = /데이터|수치|통계|예산|비용|매출|가격/.test(qa.a);
          return hasNumbers || hasData;
        });
        if (dataAnswers.length > 0) {
          const dataText = dataAnswers.map(qa => `Q: ${qa.q}\nA: ${qa.a}`).join('\n');
          parts.push(`관련 데이터:\n${dataText}`);
        }
      }
      break;
    }

    case 'compressed': {
      // 핵심만 압축 (전략/계획용)
      parts.push(`프로젝트: ${input.problemText.slice(0, 300)}`);
      parts.push(`핵심 질문: ${input.realQuestion}`);
      if (input.skeleton.length > 0) {
        parts.push(`뼈대: ${input.skeleton.join(' / ')}`);
      }
      if (input.hiddenAssumptions.length > 0) {
        parts.push(`핵심 가정: ${input.hiddenAssumptions.slice(0, 3).join(', ')}`);
      }
      // Q&A는 최근 1개만
      if (input.qaHistory.length > 0) {
        const last = input.qaHistory[input.qaHistory.length - 1];
        parts.push(`최근 논의: Q: ${last.q}\nA: ${last.a}`);
      }
      break;
    }

    case 'minimal': {
      // 문제 + 핵심 질문만 (독립 리서치, 편향 방지)
      parts.push(`프로젝트: ${input.problemText}`);
      parts.push(`핵심 질문: ${input.realQuestion}`);
      // skeleton, Q&A, assumptions 전부 제외 — 편향 없이 독립 조사
      break;
    }
  }

  const text = parts.join('\n\n');
  return {
    userPromptParts: parts,
    tokenEstimate: text.length, // 한국어 대략 1자≈1토큰
  };
}

/**
 * Agent Delegation — 에이전트간 위임
 *
 * Planning 단계에서 감지된 delegation step을 실행.
 * 원래 에이전트가 자신의 한계를 인식하고 다른 전문가에게 서브태스크를 위임.
 *
 * 무한 루프 방지:
 * - delegation_depth 필드: 원본 task = 0, 위임 task = 1
 * - depth >= 1인 task는 planning 비활성화 + 재위임 불가
 * - 구조적으로 최대 depth 1 보장
 *
 * XP:
 * - 위임자: review_given (+20 XP) — 작업을 감독
 * - 수임자: task_completed (+15 XP) — 작업을 실행
 */

import type { WorkerTask, AgentPlanStep } from '@/stores/types';
import type { Agent } from '@/stores/agent-types';
import type { WorkerContext, WorkerTaskResult } from '@/lib/worker-engine';
import { useAgentStore } from '@/stores/useAgentStore';

// ─── Types ───

export interface DelegationRequest {
  from_agent_id: string;
  from_agent_name: string;
  to_agent_id: string;
  to_agent_name: string;
  capability: string;
  sub_task: string;
  expected_output: string;
  reason: string;
}

export interface DelegationResult {
  request: DelegationRequest;
  result: string;
}

// ─── Capability 매핑 ───

const CAPABILITY_KEYWORDS: Record<string, string[]> = {
  research: ['조사', '리서치', '자료', '사례', '벤치마크', '현황', '분석'],
  strategy: ['전략', '방향', '포지셔닝', '우선순위'],
  numbers: ['수치', '숫자', '재무', 'ROI', '비용', '매출', '예산', '계산', 'KPI'],
  writing: ['작성', '문서', '카피', '초안', '보고서', '정리', '요약'],
  tech: ['기술', '개발', '구현', '아키텍처', '시스템', 'API'],
  planning: ['일정', '계획', '마일스톤', '타임라인', '실행'],
  risk: ['리스크', '위험', '반론', '약점', '검토', '비판'],
  ux: ['UX', 'UI', '사용자', '인터페이스', '디자인'],
  legal_review: ['법', '규정', '계약', '라이선스', '개인정보', '약관', '컴플라이언스'],
};

// ─── 위임 대상 찾기 ───

export function findDelegateAgent(
  capability: string,
  excludeIds: Set<string>,
): Agent | null {
  const agents = useAgentStore.getState().getUnlockedAgents();
  const available = agents.filter(a =>
    !excludeIds.has(a.id) &&
    a.capabilities.includes('task_execution') &&
    !a.archived,
  );

  if (available.length === 0) return null;

  // 1차: keywords 매칭
  const keywords = CAPABILITY_KEYWORDS[capability] || [capability];
  let bestAgent: Agent | null = null;
  let bestScore = 0;

  for (const agent of available) {
    const agentKeywords = agent.keywords || [];
    const matchCount = keywords.filter(kw =>
      agentKeywords.some(ak => ak.includes(kw) || kw.includes(ak)),
    ).length;

    // expertise 텍스트에서도 매칭
    const expertiseHits = keywords.filter(kw =>
      (agent.expertise || '').includes(kw),
    ).length;

    const score = matchCount * 2 + expertiseHits;
    if (score > bestScore) {
      bestScore = score;
      bestAgent = agent;
    }
  }

  // 2차: fallback — 아무 agent라도
  return bestAgent || available[0] || null;
}

// ─── 위임 가능 capability 목록 ───

export function getAvailableCapabilities(excludeAgentId?: string): string[] {
  const agents = useAgentStore.getState().getUnlockedAgents();
  const available = agents.filter(a =>
    a.id !== excludeAgentId &&
    a.capabilities.includes('task_execution') &&
    !a.archived,
  );

  const capabilities = new Set<string>();
  for (const agent of available) {
    for (const [cap, keywords] of Object.entries(CAPABILITY_KEYWORDS)) {
      const agentKeywords = agent.keywords || [];
      const hasMatch = keywords.some(kw =>
        agentKeywords.some(ak => ak.includes(kw)) || (agent.expertise || '').includes(kw),
      );
      if (hasMatch) capabilities.add(cap);
    }
  }

  return Array.from(capabilities);
}

// ─── 위임 실행 ───

export async function executeDelegation(
  request: DelegationRequest,
  originalTask: WorkerTask,
  context: WorkerContext,
  onStream: (text: string) => void,
  signal?: AbortSignal,
): Promise<DelegationResult> {
  // 위임 task 생성 — delegation_depth: 1 (재위임 불가)
  const delegatedTask: WorkerTask = {
    ...originalTask,
    id: `${originalTask.id}_delegate_${request.to_agent_id}`,
    task: request.sub_task,
    expected_output: request.expected_output,
    agent_id: request.to_agent_id,
    delegation_depth: 1, // 재위임 방지
    delegated_from: { agent_id: request.from_agent_id, agent_name: request.from_agent_name },
    status: 'pending',
    result: null,
    stream_text: '',
    plan: undefined,
    plan_step_results: undefined,
  };

  // Dynamic import to avoid circular dependency
  const { runWorkerTask } = await import('@/lib/worker-engine');

  onStream(`\n\n> 📋 ${request.from_agent_name} → ${request.to_agent_name}에게 위임: ${request.sub_task}\n\n`);

  const result = await runWorkerTask(delegatedTask, context, onStream, signal);

  // XP 기록: 위임자 = review_given, 수임자 = task_completed (runWorkerTask에서 이미 기록)
  useAgentStore.getState().recordActivity(
    request.from_agent_id,
    'review_given',
    `위임: ${request.sub_task} → ${request.to_agent_name}`,
    context.sessionId,
  );

  return {
    request,
    result: result.text,
  };
}

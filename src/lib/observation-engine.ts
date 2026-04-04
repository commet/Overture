/**
 * Observation Engine — 에이전트가 사용자에 대해 학습하는 시스템
 *
 * 작업 승인/거부 패턴에서 규칙 기반으로 observation 생성.
 * 에이전트당 5회째 작업마다 LLM 배치 분석.
 *
 * Observation이 쌓이면 Lv.2+ 프롬프트에 주입되어
 * 에이전트가 사용자에게 맞춤화된 결과물을 생산.
 */

import { useAgentStore } from '@/stores/useAgentStore';
import { callLLMJson } from '@/lib/llm';
import type { AgentObservation } from '@/stores/agent-types';

// ─── 규칙 기반: 승인 시 ───

export function onTaskApproved(agentId: string, task: string, result: string): void {
  const store = useAgentStore.getState();
  const agent = store.getAgent(agentId);
  if (!agent) return;

  // 승인 횟수 세기
  const approvals = store.activities.filter(
    a => a.agent_id === agentId && a.type === 'task_approved',
  ).length;

  // 3회째 승인: 선호도 observation 생성
  if (approvals === 3) {
    store.addObservation(agentId, {
      category: 'preference',
      observation: `이 사용자는 ${agent.role} 관점의 결과물에 만족하는 경향이 있다`,
    });
  }

  // 작업 내용에서 패턴 추출
  const domainObs = extractDomainPattern(agentId, task);
  if (domainObs) {
    store.addObservation(agentId, domainObs);
  }

  // 5회마다 LLM 배치 분석 (비동기, 비차단)
  if (approvals > 0 && approvals % 5 === 0) {
    runBatchAnalysis(agentId).catch(() => {});
  }
}

// ─── 규칙 기반: 거부 시 ───

export function onTaskRejected(agentId: string, task: string): void {
  const store = useAgentStore.getState();
  const agent = store.getAgent(agentId);
  if (!agent) return;

  // 거부 시 기존 선호도 observation 약화
  const prefObs = agent.observations.find(
    o => o.category === 'preference' && o.observation.includes('만족하는 경향'),
  );
  if (prefObs) {
    // confidence 감소 (-0.2)
    const updated = agent.observations.map(o =>
      o.id === prefObs.id
        ? { ...o, confidence: Math.max(0, o.confidence - 0.2) }
        : o,
    ).filter(o => o.confidence >= 0.1);
    store.updateAgent(agentId, { observations: updated });
  }

  // 거부 패턴 기록
  const rejections = store.activities.filter(
    a => a.agent_id === agentId && a.type === 'task_rejected',
  ).length;

  if (rejections === 2) {
    store.addObservation(agentId, {
      category: 'communication_style',
      observation: `이 사용자는 ${agent.role}의 결과물 톤이나 깊이를 조정해야 할 수 있다`,
    });
  }
}

// ─── 도메인 패턴 추출 (규칙 기반) ───

const DOMAIN_KEYWORDS: Record<string, string> = {
  'B2B': 'B2B 비즈니스',
  'SaaS': 'SaaS 제품',
  '스타트업': '스타트업',
  '투자': '투자/펀딩',
  '마케팅': '마케팅',
  '앱': '모바일 앱',
  'AI': 'AI/ML',
  '커머스': '이커머스',
  '교육': '교육/에듀테크',
  '헬스': '헬스케어',
  '핀테크': '핀테크/금융',
  '콘텐츠': '콘텐츠/미디어',
};

function extractDomainPattern(
  agentId: string,
  task: string,
): Pick<AgentObservation, 'category' | 'observation'> | null {
  const store = useAgentStore.getState();
  const agent = store.getAgent(agentId);
  if (!agent) return null;

  // 이미 도메인 observation이 있으면 스킵
  if (agent.observations.some(o => o.category === 'work_pattern' && o.observation.includes('분야'))) {
    return null;
  }

  const text = task.toLowerCase();
  for (const [keyword, domain] of Object.entries(DOMAIN_KEYWORDS)) {
    if (text.includes(keyword.toLowerCase())) {
      return {
        category: 'work_pattern',
        observation: `이 사용자의 프로젝트는 ${domain} 분야와 관련이 있다`,
      };
    }
  }

  return null;
}

// ─── LLM 배치 분석 (5회마다, 비동기) ───

async function runBatchAnalysis(agentId: string): Promise<void> {
  const store = useAgentStore.getState();
  const agent = store.getAgent(agentId);
  if (!agent) return;

  // 최근 5개 활동 수집
  const recent = store.activities
    .filter(a => a.agent_id === agentId && (a.type === 'task_completed' || a.type === 'task_approved' || a.type === 'task_rejected'))
    .slice(-5);

  if (recent.length < 3) return;

  const taskSummary = recent.map(a => {
    const status = a.type === 'task_rejected' ? '거부됨' : '승인됨';
    return `- ${a.context.slice(0, 80)} → ${status}`;
  }).join('\n');

  const existingObs = agent.observations
    .map(o => o.observation)
    .join(', ');

  try {
    const result = await callLLMJson<{
      observation: string | null;
      category: 'preference' | 'skill_gap' | 'communication_style' | 'work_pattern';
    }>(
      [{
        role: 'user',
        content: `이 에이전트(${agent.name}, ${agent.role})의 최근 작업 기록:
${taskSummary}

기존 관찰: ${existingObs || '없음'}

이 사용자에 대해 새로 파악할 수 있는 구체적인 것이 하나 있다면?
기존 관찰과 중복되지 않는 새로운 인사이트만.
없으면 observation: null.

JSON: { "observation": "한 줄 관찰 또는 null", "category": "preference|skill_gap|communication_style|work_pattern" }`,
      }],
      {
        system: '사용자의 업무 패턴을 분석하는 관찰자. 구체적이고 실용적인 관찰만. Korean only.',
        maxTokens: 150,
        shape: { observation: 'string', category: 'string' },
      },
    );

    if (result.observation && result.observation !== 'null') {
      store.addObservation(agentId, {
        category: result.category || 'preference',
        observation: result.observation,
      });
    }
  } catch {
    // LLM 실패 시 무시 — observation은 보조 기능
  }
}

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

// ─── Phase 3: Boss Chat 메타 관찰 추출 ───

const TOPIC_KEYWORDS: Record<string, string> = {
  ...DOMAIN_KEYWORDS,
  '연봉': '연봉/보상', '협상': '협상', '승진': '승진/경력',
  '퇴사': '이직/퇴사', '피드백': '피드백', '평가': '성과 평가',
  '보고': '보고/발표', '기획': '기획안', '제안': '제안서',
  '일정': '일정/마감', '지연': '프로젝트 지연', '갈등': '팀 갈등',
  '재택': '재택근무', '회의': '회의 문화', '리더': '리더십',
};

/**
 * 규칙 기반: Boss 대화에서 토픽 키워드만 추출 (프라이버시 경계).
 * 원본 문장 절대 포함 안 함. 카테고리 라벨만 반환.
 */
export function summarizeBossChatTopic(
  messages: Array<{ role: string; content: string }>,
): string {
  const allText = messages.map(m => m.content).join(' ').toLowerCase();
  const matched: string[] = [];

  for (const [keyword, label] of Object.entries(TOPIC_KEYWORDS)) {
    if (allText.includes(keyword.toLowerCase()) && !matched.includes(label)) {
      matched.push(label);
    }
  }

  return matched.slice(0, 3).join(', ') || '';
}

/**
 * 토픽 요약으로 boss agent에 observation 생성.
 * 반복 토픽이면 기존 observation reinforce.
 */
export function extractBossChatObservation(agentId: string, topic: string): void {
  const store = useAgentStore.getState();
  const agent = store.getAgent(agentId);
  if (!agent || !topic) return;

  // 기존에 비슷한 토픽 observation이 있으면 reinforce
  const existing = agent.observations.find(
    o => o.category === 'work_pattern' && o.observation.includes(topic.split(',')[0]),
  );
  if (existing) {
    store.reinforceObservation(agentId, existing.id);
    return;
  }

  store.addObservation(agentId, {
    category: 'work_pattern',
    observation: `이 사용자가 ${topic} 관련 대화를 상사와 나눴다`,
  });
}

// ─── Phase 4: Workspace → Boss 업데이트 ───

import type { DMFeedbackResult } from '@/stores/types';

/**
 * Boss 리뷰 완료 후 boss agent observation 업데이트.
 * DM 피드백의 핵심 우려와 승인 조건을 관찰로 축적.
 */
export function onBossReviewCompleted(agentId: string, feedback: DMFeedbackResult): void {
  const store = useAgentStore.getState();
  const agent = store.getAgent(agentId);
  if (!agent) return;

  // Critical 우려 → boss_feedback_theme observation
  const criticalConcerns = (feedback.concerns || []).filter(c => c.severity === 'critical');
  for (const concern of criticalConcerns.slice(0, 2)) {
    const summary = concern.text.slice(0, 70);
    // 기존에 비슷한 관찰 있으면 reinforce
    const existing = agent.observations.find(
      o => o.category === 'preference' && o.observation.includes(summary.slice(0, 20)),
    );
    if (existing) {
      store.reinforceObservation(agentId, existing.id);
    } else {
      store.addObservation(agentId, {
        category: 'preference',
        observation: `이 팀장은 "${summary}"에 민감하다`,
      });
    }
  }

  // 승인 조건 → observation
  if (feedback.approval_condition) {
    const condSummary = feedback.approval_condition.slice(0, 70);
    const existing = agent.observations.find(
      o => o.category === 'preference' && o.observation.includes('승인 조건'),
    );
    if (existing) {
      // 기존 승인 조건 업데이트 (replace)
      const updated = agent.observations.map(o =>
        o.id === existing.id
          ? { ...o, observation: `이 팀장의 승인 조건: ${condSummary}`, confidence: Math.min(0.95, o.confidence + 0.15) }
          : o,
      );
      store.updateAgent(agentId, { observations: updated });
    } else {
      store.addObservation(agentId, {
        category: 'preference',
        observation: `이 팀장의 승인 조건: ${condSummary}`,
      });
    }
  }
}

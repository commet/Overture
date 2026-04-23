/**
 * Agent ↔ WorkerPersona ↔ Persona 양방향 변환
 *
 * 기존 코드(WorkerCard, rehearsal 등)가 WorkerPersona/Persona 타입을 사용하므로
 * Agent를 기존 타입으로 변환하는 어댑터 제공.
 */

import type { Agent } from '@/stores/agent-types';
import type { WorkerPersona, Persona } from '@/stores/types';

/** Agent → WorkerPersona. WorkerCard 등 기존 UI 호환. */
export function agentToWorkerPersona(agent: Agent): WorkerPersona {
  return {
    id: agent.id,
    name: agent.name,
    nameEn: agent.nameEn,
    role: agent.role,
    roleEn: agent.roleEn,
    emoji: agent.emoji,
    expertise: agent.expertise || '',
    tone: agent.tone || '',
    color: agent.color,
  };
}

/** Agent → Persona. 기존 rehearsal/refine flow 호환. */
export function agentToPersona(agent: Agent): Persona {
  return {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    organization: agent.organization || '',
    priorities: agent.priorities || '',
    communication_style: agent.communication_style || '',
    known_concerns: agent.known_concerns || '',
    relationship_notes: agent.relationship_notes || '',
    influence: agent.influence || 'medium',
    decision_style: agent.decision_style,
    risk_tolerance: agent.risk_tolerance,
    success_metric: agent.success_metric,
    extracted_traits: agent.extracted_traits || [],
    feedback_logs: agent.feedback_logs || [],
    is_example: agent.is_example,
    created_at: agent.created_at,
    updated_at: agent.updated_at,
  };
}

/** 기존 Persona → Agent 생성 input. migrateFromPersonas()에서 사용. */
export function personaToAgentInput(persona: Persona): Partial<Agent> {
  return {
    id: persona.id,
    name: persona.name,
    role: persona.role,
    emoji: '👤',
    color: '#6B7280',
    origin: 'stakeholder',
    capabilities: ['review'],
    group: 'people',
    chain_id: null,
    unlock_condition: { type: 'always', required: 0 },
    unlocked: true,
    organization: persona.organization,
    priorities: persona.priorities,
    communication_style: persona.communication_style,
    known_concerns: persona.known_concerns,
    relationship_notes: persona.relationship_notes,
    influence: persona.influence,
    decision_style: persona.decision_style,
    risk_tolerance: persona.risk_tolerance,
    success_metric: persona.success_metric,
    extracted_traits: persona.extracted_traits,
    feedback_logs: persona.feedback_logs,
    is_example: persona.is_example,
    xp: (persona.feedback_logs?.length || 0) * 10,
  };
}

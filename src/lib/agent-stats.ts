/**
 * agent-stats.ts — derived stats for an Agent.
 *
 * The store keeps activities + XP + level + observations as raw data; UI
 * surfaces ("Lv.3 · 12회 함께", "처음 모시는 분") need a few derivations on
 * top. Centralizing here so every display path shares the same definitions
 * (totalTasks counts approved-or-completed work, not retries; familiarity
 * tier comes from one threshold table).
 *
 * Snapshot reads only — no subscriptions. Components call this at render
 * time; if they need reactive updates they should already be subscribed
 * to useAgentStore via a selector.
 */

import { useAgentStore } from '@/stores/useAgentStore';
import type { Agent, AgentActivity } from '@/stores/agent-types';

export interface AgentStats {
  agent: Agent;
  /** Lifetime task_completed count for this agent. */
  totalTasks: number;
  /** Lifetime synthesis_completed count (lead role). */
  totalSyntheses: number;
  /** Lifetime review_given count. */
  totalReviews: number;
  /** Activities filtered to this agent (recent first). */
  recentActivities: AgentActivity[];
  /** observations.length — used to surface "learned N patterns" cue. */
  observationCount: number;
  /** Familiarity bucket — drives label text in compact UI. */
  familiarity: 'first_time' | 'few' | 'familiar' | 'veteran';
}

const FEW_THRESHOLD = 3;
const FAMILIAR_THRESHOLD = 8;
const VETERAN_THRESHOLD = 20;

export function getAgentStats(agentId: string | undefined | null): AgentStats | null {
  if (!agentId) return null;
  const { agents, activities } = useAgentStore.getState();
  const agent = agents.find(a => a.id === agentId);
  if (!agent) return null;

  const mine = activities.filter(a => a.agent_id === agentId);
  // Sort newest first for any caller that wants a recency view.
  const recent = mine.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));

  const totalTasks = mine.filter(a => a.type === 'task_completed').length;
  const totalSyntheses = mine.filter(a => a.type === 'synthesis_completed').length;
  const totalReviews = mine.filter(a => a.type === 'review_given').length;

  // "Together count" combines the user-visible work (tasks + syntheses).
  // Reviews are separate role and not the primary familiarity signal.
  const togetherCount = totalTasks + totalSyntheses;
  const familiarity: AgentStats['familiarity'] =
    togetherCount === 0 ? 'first_time'
    : togetherCount < FEW_THRESHOLD ? 'few'
    : togetherCount < FAMILIAR_THRESHOLD ? 'familiar'
    : togetherCount < VETERAN_THRESHOLD ? 'familiar'
    : 'veteran';

  return {
    agent,
    totalTasks,
    totalSyntheses,
    totalReviews,
    recentActivities: recent,
    observationCount: agent.observations.length,
    familiarity,
  };
}

/** Compact "Lv.3 · 12회 함께" style label, locale-aware. */
export function formatAgentInline(stats: AgentStats, locale: 'ko' | 'en'): string {
  const together = stats.totalTasks + stats.totalSyntheses;
  if (together === 0) {
    return locale === 'ko' ? `Lv.${stats.agent.level} · 처음` : `Lv.${stats.agent.level} · first time`;
  }
  return locale === 'ko' ? `Lv.${stats.agent.level} · ${together}회 함께` : `Lv.${stats.agent.level} · ${together}× together`;
}

/** Slightly longer phrasing for the persona-pool modal cards. */
export function formatAgentFamiliarity(stats: AgentStats, locale: 'ko' | 'en'): string {
  const together = stats.totalTasks + stats.totalSyntheses;
  if (together === 0) return locale === 'ko' ? '처음 모시는 분' : 'First time working together';
  if (stats.familiarity === 'few') return locale === 'ko' ? `${together}번 함께` : `${together}× together`;
  if (stats.familiarity === 'familiar') return locale === 'ko' ? `${together}번 함께 — 익숙한 동료` : `${together}× together — familiar`;
  return locale === 'ko' ? `${together}번 함께 — 오랜 동료` : `${together}× together — long-time partner`;
}

/**
 * Compute what changed for each agent during a session — used by FinalCard
 * to celebrate growth ("이번 분석으로 영희 +30 XP, 도윤 Lv.2 → Lv.3").
 *
 * Strategy: rather than snapshotting agent state at session start, derive
 * the deltas from activities filtered to the session_id. Each activity has
 * the xp_earned at the time it was recorded — summing those gives total
 * XP gain. Level transitions are inferred from cumulative XP crossing
 * AGENT_LEVELS thresholds.
 */
export interface AgentSessionDelta {
  agentId: string;
  name: string;
  xpGained: number;
  /** True when the agent crossed a level threshold during this session. */
  leveledUp: boolean;
  fromLevel: number;
  toLevel: number;
  taskCount: number;
}

import { AGENT_LEVELS, calculateLevel } from '@/stores/agent-types';

export function getSessionDeltas(sessionId: string | null | undefined): AgentSessionDelta[] {
  if (!sessionId) return [];
  const { agents, activities } = useAgentStore.getState();
  const sessionActs = activities.filter(a => a.session_id === sessionId);
  if (sessionActs.length === 0) return [];

  // Group by agent, sum XP gained, count tasks.
  const byAgent = new Map<string, { xpGained: number; tasks: number }>();
  for (const a of sessionActs) {
    const cur = byAgent.get(a.agent_id) || { xpGained: 0, tasks: 0 };
    cur.xpGained += a.xp_earned;
    if (a.type === 'task_completed' || a.type === 'synthesis_completed') cur.tasks += 1;
    byAgent.set(a.agent_id, cur);
  }

  const deltas: AgentSessionDelta[] = [];
  byAgent.forEach((entry, agentId) => {
    if (entry.xpGained === 0) return;
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;
    const xpAfter = agent.xp; // current XP (post-session)
    const xpBefore = Math.max(0, xpAfter - entry.xpGained);
    const fromLevel = calculateLevel(xpBefore);
    const toLevel = calculateLevel(xpAfter);
    deltas.push({
      agentId,
      name: agent.name,
      xpGained: entry.xpGained,
      leveledUp: toLevel > fromLevel,
      fromLevel,
      toLevel,
      taskCount: entry.tasks,
    });
  });

  // Surface biggest gains first.
  deltas.sort((a, b) => b.xpGained - a.xpGained);
  return deltas;
}

// Re-export for callers that want raw thresholds.
export { AGENT_LEVELS };

'use client';

import type { Agent } from '@/stores/agent-types';
import { getLevelProgress } from '@/stores/agent-types';

interface AgentCardProps {
  agent: Agent;
  onClick?: () => void;
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
  const { progress } = getLevelProgress(agent.xp);
  const isConcertmaster = agent.id === 'concertmaster';

  if (!agent.unlocked) {
    return <LockedAgentCard agent={agent} isConcertmaster={isConcertmaster} />;
  }

  return (
    <div
      className={`agent-card ${isConcertmaster ? 'agent-card-concertmaster' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      <div className="agent-card-emoji">{agent.emoji}</div>
      <div className="agent-card-role">{agent.role}</div>
      <div className="agent-card-name">{agent.name}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="agent-lv" data-level={agent.level}>
          Lv.{agent.level}
        </span>
        {agent.observations.length > 0 && (
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            {agent.observations.length}개 관찰
          </span>
        )}
      </div>
      <div className="agent-xp-bar">
        <div
          className="agent-xp-fill"
          style={{
            width: `${Math.round(progress * 100)}%`,
            background: agent.color,
          }}
        />
      </div>
    </div>
  );
}

function LockedAgentCard({ agent, isConcertmaster }: { agent: Agent; isConcertmaster: boolean }) {
  const conditionText = getUnlockText(agent);

  return (
    <div className={`agent-card agent-card-locked ${isConcertmaster ? 'agent-card-concertmaster' : ''}`}>
      <div className="agent-lock">
        <div className="agent-lock-icon">🔒</div>
        <div className="agent-card-name" style={{ opacity: 0.4 }}>{agent.name}</div>
        <div className="agent-card-role" style={{ opacity: 0.5 }}>{agent.role}</div>
        <div className="agent-lock-text">{conditionText}</div>
      </div>
    </div>
  );
}

function getUnlockText(agent: Agent): string {
  const cond = agent.unlock_condition;
  switch (cond.type) {
    case 'chain_tasks':
      return `${cond.required}회 작업 후 해금`;
    case 'total_tasks':
      return `전체 ${cond.required}회 작업 후 해금`;
    default:
      return '';
  }
}

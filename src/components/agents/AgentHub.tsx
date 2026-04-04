'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAgentStore } from '@/stores/useAgentStore';
import type { Agent, AgentChain } from '@/stores/agent-types';
import { AgentCard } from './AgentCard';
import { AgentProfile } from './AgentProfile';

const GROUP_META: Record<string, { label: string; emoji: string }> = {
  research: { label: '리서치', emoji: '🔍' },
  strategy: { label: '전략', emoji: '🎯' },
  production: { label: '실행', emoji: '⚡' },
  validation: { label: '검증', emoji: '🛡️' },
  people: { label: '사람들', emoji: '👥' },
  special: { label: '총괄', emoji: '🎻' },
};

export function AgentHub() {
  const agents = useAgentStore(s => s.agents);
  const chains = useAgentStore(s => s.chains);
  const loadAgents = useAgentStore(s => s.loadAgents);

  useEffect(() => {
    if (agents.length === 0) loadAgents();
  }, [agents.length, loadAgents]);

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  if (agents.length === 0) return null;

  // 체인 에이전트
  const researchChain = chains.find(c => c.id === 'research');
  const strategyChain = chains.find(c => c.id === 'strategy');
  const researchAgents = getChainAgents('research', agents, researchChain);
  const strategyAgents = getChainAgents('strategy', agents, strategyChain);

  // 독립 에이전트
  const productionAgents = agents.filter(a => a.group === 'production' && !a.archived);
  const validationAgents = agents.filter(a => a.group === 'validation' && !a.archived);

  // 사람들 (Boss, Stakeholder)
  const peopleAgents = agents.filter(a => a.group === 'people' && !a.archived);

  // 악장
  const concertmaster = agents.find(a => a.id === 'concertmaster');

  return (
    <div className="agent-hub">
      <h1 className="agent-hub-title">에이전트</h1>
      <p className="agent-hub-subtitle">
        당신의 팀입니다. 사용할수록 성장합니다.
      </p>

      {/* 체인 에이전트: 리서치 */}
      {researchChain && (
        <ChainSection
          chain={researchChain}
          agents={researchAgents}
          meta={GROUP_META.research}
          onSelect={setSelectedAgent}
        />
      )}

      {/* 체인 에이전트: 전략 */}
      {strategyChain && (
        <ChainSection
          chain={strategyChain}
          agents={strategyAgents}
          meta={GROUP_META.strategy}
          onSelect={setSelectedAgent}
        />
      )}

      {/* 독립: 실행 */}
      <GroupSection
        agents={productionAgents}
        meta={GROUP_META.production}
        onSelect={setSelectedAgent}
      />

      {/* 독립: 검증 */}
      <GroupSection
        agents={validationAgents}
        meta={GROUP_META.validation}
        onSelect={setSelectedAgent}
      />

      {/* 사람들 + 팀장 시뮬레이터 진입 */}
      <section className="agent-section">
        <SectionHeader meta={GROUP_META.people} />
        <div className="agent-grid">
          {peopleAgents.map(agent => (
            <AgentCard key={agent.id} agent={agent} onClick={() => agent.unlocked && setSelectedAgent(agent)} />
          ))}
          <Link href="/boss" className="agent-card agent-card-boss-cta" style={{ textDecoration: 'none' }}>
            <div className="agent-card-emoji">👔</div>
            <div className="agent-card-role">팀장 시뮬레이터</div>
            <div className="agent-card-name">내 팀장은 뭐라고 할까?</div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 600, color: 'var(--accent)',
              marginTop: 6,
            }}>
              시작하기 →
            </span>
          </Link>
        </div>
      </section>

      {/* 악장 */}
      {concertmaster && (
        <section className="agent-section">
          <SectionHeader meta={GROUP_META.special} />
          <div className="agent-grid">
            <AgentCard agent={concertmaster} onClick={() => concertmaster.unlocked && setSelectedAgent(concertmaster)} />
          </div>
        </section>
      )}

      {/* Agent Profile Modal */}
      <AnimatePresence>
        {selectedAgent && (
          <AgentProfile agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sub-components ───

function SectionHeader({ meta, extra }: { meta: { label: string; emoji: string }; extra?: React.ReactNode }) {
  return (
    <div className="agent-section-header">
      <span style={{ fontSize: 14 }}>{meta.emoji}</span>
      <span className="agent-section-name">{meta.label}</span>
      {extra}
    </div>
  );
}

function ChainSection({ chain, agents, meta, onSelect }: {
  chain: AgentChain;
  agents: Agent[];
  meta: { label: string; emoji: string };
  onSelect: (agent: Agent) => void;
}) {
  // 다음 해금까지 진행도
  const nextThreshold = agents.find(a => !a.unlocked)
    ? agents.find(a => !a.unlocked)!.unlock_condition.required
    : chain.total_tasks;
  const progress = nextThreshold > 0
    ? Math.min(1, chain.total_tasks / nextThreshold)
    : 1;

  return (
    <section className="agent-section">
      <SectionHeader
        meta={meta}
        extra={
          <>
            <div className="chain-progress">
              <div className="chain-progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <span className="agent-section-badge">
              {chain.total_tasks}회 작업
            </span>
          </>
        }
      />
      <div className="agent-grid">
        {agents.map(agent => (
          <AgentCard key={agent.id} agent={agent} onClick={() => agent.unlocked && onSelect(agent)} />
        ))}
      </div>
    </section>
  );
}

function GroupSection({ agents, meta, onSelect }: {
  agents: Agent[];
  meta: { label: string; emoji: string };
  onSelect: (agent: Agent) => void;
}) {
  return (
    <section className="agent-section">
      <SectionHeader meta={meta} />
      <div className="agent-grid">
        {agents.map(agent => (
          <AgentCard key={agent.id} agent={agent} onClick={() => agent.unlocked && onSelect(agent)} />
        ))}
      </div>
    </section>
  );
}

// ─── Helpers ───

function getChainAgents(chainId: string, agents: Agent[], chain?: AgentChain): Agent[] {
  if (!chain) return [];
  return chain.agent_ids
    .map(id => agents.find(a => a.id === id))
    .filter((a): a is Agent => !!a);
}

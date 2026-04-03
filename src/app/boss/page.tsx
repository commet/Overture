'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BossSetup } from '@/components/boss/BossSetup';
import { BossChat } from '@/components/boss/BossChat';
import { useBossStore } from '@/stores/useBossStore';
import { useAgentStore } from '@/stores/useAgentStore';
import type { Agent } from '@/stores/agent-types';

function SavedBossList() {
  const [bosses, setBosses] = useState<Agent[]>([]);
  const loadBossFromAgent = useBossStore(s => s.loadBossFromAgent);

  useEffect(() => {
    const store = useAgentStore.getState();
    if (store.agents.length === 0) store.loadAgents();
    setBosses(store.agents.filter(a => a.origin === 'boss_sim' && !a.archived));
  }, []);

  if (bosses.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      style={{ padding: '0 24px', maxWidth: 520, margin: '0 auto 24px' }}
    >
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
        저장된 팀장
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {bosses.map(boss => (
          <button
            key={boss.id}
            onClick={() => loadBossFromAgent(boss.id)}
            className="agent-card"
            style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}
          >
            <span style={{ fontSize: 20 }}>{boss.emoji}</span>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {boss.name}
              </p>
              {boss.personality_code && (
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{boss.personality_code}</p>
              )}
            </div>
            {boss.level >= 2 && (
              <span className="agent-lv" data-level={boss.level} style={{ fontSize: 10 }}>
                Lv.{boss.level}
              </span>
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

export default function BossPage() {
  const phase = useBossStore((s) => s.phase);

  return (
    <main className="boss-page">
      <AnimatePresence mode="wait">
        {phase === 'setup' ? (
          <div key="setup-wrapper">
            <SavedBossList />
            <BossSetup key="setup" />
          </div>
        ) : (
          <BossChat key="chat" />
        )}
      </AnimatePresence>
    </main>
  );
}

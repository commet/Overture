'use client';

import { AnimatePresence } from 'framer-motion';
import { BossSetup } from '@/components/boss/BossSetup';
import { BossChat } from '@/components/boss/BossChat';
import { useBossStore } from '@/stores/useBossStore';

export default function BossPage() {
  const phase = useBossStore((s) => s.phase);

  return (
    <main className="boss-page">
      <AnimatePresence mode="wait">
        {phase === 'setup' ? (
          <BossSetup key="setup" />
        ) : (
          <BossChat key="chat" />
        )}
      </AnimatePresence>
    </main>
  );
}

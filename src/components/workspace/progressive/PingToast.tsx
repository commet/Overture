'use client';

/**
 * PingToast — short-lived pill that confirms the user's input reached the team.
 *
 * Subscribes to `lastPingAt` / `lastPingSource` from `useAgentAttentionStore`.
 * When the store fires a ping, we show a small toast at the top-right of the
 * main column for ~2s. The toast slides right-ward (toward the sidebar) to
 * reinforce the mental model that the input is "traveling" to the agents.
 *
 * Mount once near the top of the progressive flow's main scroll area.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useAgentAttentionStore, type PingSource } from '@/stores/useAgentAttentionStore';
import { useLocale } from '@/hooks/useLocale';
import { EASE } from './shared/constants';

const VISIBLE_MS = 2100;

function messageFor(source: PingSource | null, locale: string): string {
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  switch (source) {
    case 'answer':
      return L('답변을 팀에 전달했어요', 'Sent to the team');
    case 'chat':
      return L('요청을 팀에 전달했어요', 'Request sent to the team');
    case 'retry':
      return L('다시 분석 시작', 'Re-analysis started');
    case 'deploy':
      return L('팀이 작업을 시작했어요', 'Team started working');
    default:
      return L('팀에 전달했어요', 'Sent to the team');
  }
}

export function PingToast() {
  const locale = useLocale();
  const lastPingAt = useAgentAttentionStore(s => s.lastPingAt);
  const lastSource = useAgentAttentionStore(s => s.lastPingSource);
  const [visiblePing, setVisiblePing] = useState<{ at: number; source: PingSource | null } | null>(null);

  useEffect(() => {
    if (!lastPingAt) return;
    // Defer one microtask so setState isn't called synchronously during the subscribe callback.
    const showTimer = setTimeout(() => setVisiblePing({ at: lastPingAt, source: lastSource }), 0);
    const hideTimer = setTimeout(() => setVisiblePing(null), VISIBLE_MS);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [lastPingAt, lastSource]);

  return (
    <div className="absolute top-4 right-4 z-20 pointer-events-none">
      <AnimatePresence>
        {visiblePing && (
          <motion.div
            key={visiblePing.at}
            initial={{ opacity: 0, x: -12, scale: 0.94 }}
            animate={{ opacity: [0, 1, 1, 0], x: [-12, 0, 18, 36], scale: [0.94, 1, 1, 0.96] }}
            exit={{ opacity: 0 }}
            transition={{ duration: VISIBLE_MS / 1000, ease: EASE, times: [0, 0.12, 0.78, 1] }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--accent)]/12 backdrop-blur-sm border border-[var(--accent)]/25 shadow-[0_0_14px_-4px_rgba(180,160,100,0.4)]"
          >
            <motion.span
              animate={{ x: [0, 2, 0] }}
              transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
              className="flex"
            >
              <ArrowRight size={11} className="text-[var(--accent)]" />
            </motion.span>
            <span className="text-[11px] font-semibold text-[var(--accent)] whitespace-nowrap">
              {messageFor(visiblePing.source, locale)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

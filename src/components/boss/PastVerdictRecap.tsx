'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sparkles } from 'lucide-react';
import { useAgentStore } from '@/stores/useAgentStore';

interface PastVerdictRecapProps {
  agentId: string;
}

const VERDICT_META: Record<string, { label: string; icon: string; color: string }> = {
  approved: { label: '승인', icon: '✅', color: 'rgb(29, 125, 63)' },
  conditional: { label: '조건부', icon: '🤔', color: 'rgb(184, 150, 62)' },
  rejected: { label: '반려', icon: '❌', color: 'rgb(220, 53, 69)' },
};

/**
 * 저장된 boss를 로드했을 때, 복원된 대화 스레드 뒤에 표시.
 * 현재 세션의 verdict는 local state라 복원되지 않는데,
 * agent.inner_monologue_archive의 마지막 entry를 "이전 결론" 카드로 복구한다.
 * 감정 완결성 + 지난 이면 재열람 루프 동시 달성.
 */
export function PastVerdictRecap({ agentId }: PastVerdictRecapProps) {
  const agent = useAgentStore(s => s.agents.find(a => a.id === agentId));
  const [openInner, setOpenInner] = useState(false);

  if (!agent || !agent.inner_monologue_archive || agent.inner_monologue_archive.length === 0) {
    return null;
  }

  const latest = agent.inner_monologue_archive[agent.inner_monologue_archive.length - 1];
  const total = agent.inner_monologue_archive.length;
  const verdictMeta = VERDICT_META[latest.verdict] || VERDICT_META.conditional;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="bc-recap"
    >
      <div className="bc-recap-header">
        <span className="bc-recap-icon">{verdictMeta.icon}</span>
        <div className="bc-recap-meta">
          <span className="bc-recap-label">지난 결론</span>
          <span className="bc-recap-verdict" style={{ color: verdictMeta.color }}>
            {verdictMeta.label}
          </span>
          {latest.situation && (
            <span className="bc-recap-situation">— {latest.situation}</span>
          )}
        </div>
      </div>
      {latest.verdict_reason && (
        <p className="bc-recap-reason">{latest.verdict_reason}</p>
      )}
      <button
        type="button"
        onClick={() => setOpenInner(!openInner)}
        className="bc-recap-toggle"
      >
        <Sparkles size={11} />
        <span>{openInner ? '속마음 접기' : '지난 속마음 보기'}</span>
        {total > 1 && !openInner && (
          <span className="bc-recap-count">· 전체 {total}개</span>
        )}
        <ChevronDown
          size={12}
          style={{
            transform: openInner ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.25s',
            marginLeft: 'auto',
          }}
        />
      </button>
      <AnimatePresence>
        {openInner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="bc-recap-inner">
              <p className="bc-recap-inner-text">{latest.text}</p>
              {latest.daily_mood_label && (
                <p className="bc-recap-inner-meta">
                  그날 기운: {latest.daily_mood_label}
                  {latest.daily_name ? ` · ${latest.daily_name}일` : ''}
                </p>
              )}
              {total > 1 && (
                <p className="bc-recap-inner-hint">
                  프로필에서 전체 {total}개 기록 볼 수 있음
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

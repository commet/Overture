'use client';

import { useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Sparkles } from 'lucide-react';
import { useBossStore } from '@/stores/useBossStore';
import { useAgentStore } from '@/stores/useAgentStore';
import { callLLMStream } from '@/lib/llm';
import {
  buildInnerMonologuePrompt,
  buildInnerMonologuePromptFromAgent,
} from '@/lib/boss/boss-prompt';

interface InnerMonologueCardProps {
  verdict: { verdict: string; reason: string; tip?: string };
}

/**
 * 이면(裏面) 공개 카드.
 * 판정 직후 등장. 잠긴 상태에서 tap 시 팀장 속마음을 스트리밍으로 공개.
 * "표면 vs 이면"의 간극이 감정적 피크를 만드는 장치.
 */
export function InnerMonologueCard({ verdict }: InnerMonologueCardProps) {
  const {
    innerMonologue,
    innerStreamingText,
    innerLoading,
    startInnerMonologue,
    updateInnerStreamingText,
    commitInnerMonologue,
    getPersonalityType,
    sajuProfile,
    yearMonthProfile,
    gender,
    loadedAgentId,
  } = useBossStore();

  const typeData = getPersonalityType();
  const abortRef = useRef<AbortController | null>(null);

  const revealed = !!innerMonologue || innerLoading || !!innerStreamingText;
  const hasHiddenLayer = !!sajuProfile || !!yearMonthProfile;

  const handleReveal = useCallback(async () => {
    if (!typeData || innerLoading || innerMonologue) return;

    const agent = loadedAgentId ? useAgentStore.getState().getAgent(loadedAgentId) : undefined;
    const system = agent?.personality_profile
      ? buildInnerMonologuePromptFromAgent(agent, verdict)
      : buildInnerMonologuePrompt(
          { type: typeData, saju: sajuProfile, yearMonth: yearMonthProfile, gender },
          verdict,
        );

    startInnerMonologue();
    abortRef.current = new AbortController();

    await callLLMStream(
      [{ role: 'user', content: '지금 자리에 돌아와서 혼잣말로 속마음을 써라.' }],
      { system, maxTokens: 300, signal: abortRef.current.signal },
      {
        onToken: (text) => updateInnerStreamingText(text),
        onComplete: () => commitInnerMonologue(),
        onError: () => {
          updateInnerStreamingText('...잠깐 생각이 끊겼네. 다시 시도해봐.');
          commitInnerMonologue();
        },
      },
    );
  }, [typeData, sajuProfile, yearMonthProfile, gender, loadedAgentId, verdict,
      innerLoading, innerMonologue, startInnerMonologue, updateInnerStreamingText, commitInnerMonologue]);

  // ─── Locked state ───
  if (!revealed) {
    return (
      <motion.button
        type="button"
        onClick={handleReveal}
        className="bc-inner bc-inner-locked"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="bc-inner-locked-glow" />
        <div className="bc-inner-locked-row">
          <motion.div
            className="bc-inner-locked-icon"
            animate={{ rotate: [0, -8, 8, -4, 0] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut', delay: 1 }}
          >
            <Lock size={18} strokeWidth={2} />
          </motion.div>
          <div className="bc-inner-locked-copy">
            <span className="bc-inner-locked-title">
              {typeData?.name} 팀장의 <em>이면</em> 공개
            </span>
            <span className="bc-inner-locked-sub">
              {hasHiddenLayer
                ? '말 안 한 속마음이 있어요 · 타고난 결이 배어나요'
                : '말 안 한 속마음이 있어요 · 열어볼까?'}
            </span>
          </div>
          <motion.span
            className="bc-inner-locked-sparkle"
            animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          >
            <Sparkles size={14} />
          </motion.span>
        </div>
      </motion.button>
    );
  }

  // ─── Revealed / Streaming state ───
  const text = innerMonologue || innerStreamingText;
  const isStreaming = innerLoading && !innerMonologue;

  return (
    <motion.div
      className="bc-inner bc-inner-revealed"
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="bc-inner-revealed-header">
        <span className="bc-inner-revealed-emoji">{typeData?.emoji || '👔'}</span>
        <div className="bc-inner-revealed-meta">
          <span className="bc-inner-revealed-label">속마음</span>
          <span className="bc-inner-revealed-sub">{typeData?.name} · 자리에 돌아와서</span>
        </div>
        {hasHiddenLayer && (
          <span className="bc-inner-revealed-saju" title="타고난 결이 반영됨">
            <Sparkles size={12} />
          </span>
        )}
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={isStreaming ? 'streaming' : 'final'}
          className="bc-inner-text"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {text || (
            <motion.span
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
              style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}
            >
              자리로 돌아가는 중...
            </motion.span>
          )}
          {isStreaming && text && (
            <motion.span
              className="bc-inner-caret"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ repeat: Infinity, duration: 0.9 }}
            />
          )}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
}

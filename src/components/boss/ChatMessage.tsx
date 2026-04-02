'use client';

import { motion } from 'framer-motion';
import type { PersonalityType } from '@/lib/boss/personality-types';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  bossType?: PersonalityType;
}

export function ChatMessage({ role, content, isStreaming, bossType }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <motion.div
      className={`bm ${isUser ? 'bm-user' : 'bm-boss'}`}
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {!isUser && (
        <div className="bm-avatar">
          <span className="bm-avatar-emoji">{bossType?.emoji || '👔'}</span>
        </div>
      )}
      <div className={`bm-bubble ${isUser ? 'bm-bubble-user' : 'bm-bubble-boss'}`}>
        <p className="bm-text">
          {content}
          {isStreaming && (
            <motion.span
              className="bm-cursor"
              animate={{ opacity: [1, 0.2] }}
              transition={{ repeat: Infinity, duration: 0.6, ease: 'easeInOut' }}
            >
              &thinsp;|
            </motion.span>
          )}
        </p>
      </div>
      {isUser && (
        <div className="bm-tail-user" />
      )}
    </motion.div>
  );
}

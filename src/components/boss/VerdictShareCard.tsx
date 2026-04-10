'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy } from 'lucide-react';
import { getPersonalityType } from '@/lib/boss/personality-types';
import { useBossStore } from '@/stores/useBossStore';

interface VerdictShareCardProps {
  verdict: { verdict: string; reason: string; tip?: string };
  typeCode: string;
  situation: string;
  onClose: () => void;
}

const VERDICT_LABELS: Record<string, string> = {
  approved: '승인',
  conditional: '조건부 승인',
  rejected: '반려',
};

const VERDICT_EMOJI: Record<string, string> = {
  approved: '✅',
  conditional: '🤔',
  rejected: '❌',
};

/**
 * 보스의 가장 인상적인 대사를 찾음.
 * 가장 긴 assistant 메시지 (= 가장 캐릭터가 드러나는 답변)
 */
function findBestQuote(messages: Array<{ role: string; content: string }>): string {
  const bossMessages = messages.filter(m => m.role === 'assistant' && m.content.length > 10);
  if (bossMessages.length === 0) return '';
  // 첫 번째 답변이 보통 가장 캐릭터성이 강함
  const first = bossMessages[0];
  // 너무 길면 첫 2문장만
  const sentences = first.content.split(/[.!?]\s|[.!?]$/).filter(Boolean);
  return sentences.slice(0, 2).join('. ').trim();
}

export function VerdictShareCard({ verdict, typeCode, situation, onClose }: VerdictShareCardProps) {
  const [copied, setCopied] = useState(false);
  const type = getPersonalityType(typeCode);
  const messages = useBossStore(s => s.messages);

  const bestQuote = findBestQuote(messages);
  const situationShort = situation.length > 25 ? situation.slice(0, 25) + '...' : situation;

  // 대화체 공유 텍스트 — 카카오톡에 붙여넣으면 자연스러운 형태
  const shareText = `${type?.emoji || '👔'} ${typeCode} 팀장한테 "${situationShort}" 해봤는데

"${bestQuote || verdict.reason}"

${VERDICT_EMOJI[verdict.verdict]} 결과: ${VERDICT_LABELS[verdict.verdict] || verdict.verdict}

너네 팀장은 뭐 유형이야? ㅋㅋ
▸ overture.so/boss`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = shareText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      style={{
        margin: '8px 0',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
        background: 'var(--surface)',
      }}
    >
      {/* Quote-first card */}
      <div style={{ padding: '20px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 28 }}>{type?.emoji || '👔'}</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{type?.name || typeCode} 팀장</p>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>&ldquo;{situationShort}&rdquo;에 대한 반응</p>
          </div>
        </div>

        {/* The quote — the star of the card */}
        {bestQuote && (
          <div style={{
            padding: '14px 16px',
            borderRadius: '14px 14px 14px 4px',
            background: 'var(--bg)',
            border: '1px solid var(--border-subtle)',
            marginBottom: 12,
          }}>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.55, margin: 0 }}>
              &ldquo;{bestQuote}&rdquo;
            </p>
          </div>
        )}

        {/* Verdict — secondary, not primary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>{VERDICT_EMOJI[verdict.verdict]}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{VERDICT_LABELS[verdict.verdict]}</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>— {verdict.reason.length > 30 ? verdict.reason.slice(0, 30) + '...' : verdict.reason}</span>
        </div>
      </div>

      {/* Copy button — prominent */}
      <button
        onClick={handleCopy}
        style={{
          width: '100%', padding: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: copied ? 'var(--success)' : 'var(--text-primary)',
          color: 'var(--bg)',
          border: 'none', cursor: 'pointer',
          fontSize: 14, fontWeight: 700,
          transition: 'background 0.2s',
        }}
      >
        {copied ? <><Check size={16} /> 복사 완료! 카톡에 붙여넣기</> : <><Copy size={16} /> 카톡에 공유하기</>}
      </button>
    </motion.div>
  );
}

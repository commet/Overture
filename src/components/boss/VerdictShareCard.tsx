'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy } from 'lucide-react';
import { getPersonalityType } from '@/lib/boss/personality-types';
import { getCollection } from './CollectionProgress';

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

const VERDICT_COLORS: Record<string, string> = {
  approved: '#2d8a4e',
  conditional: '#b8963e',
  rejected: '#dc3545',
};

export function VerdictShareCard({ verdict, typeCode, situation, onClose }: VerdictShareCardProps) {
  const [copied, setCopied] = useState(false);
  const type = getPersonalityType(typeCode);
  const collection = getCollection();
  const count = new Set(collection.map(c => c.typeCode)).size;

  const situationShort = situation.length > 30 ? situation.slice(0, 30) + '...' : situation;

  const shareText = `${type?.emoji || '👔'} ${typeCode} ${type?.name || ''} 팀장한테 "${situationShort}" 해봤는데...

📋 결과: ${VERDICT_LABELS[verdict.verdict] || verdict.verdict}
💬 "${verdict.reason}"${verdict.tip ? `\n💡 ${verdict.tip}` : ''}

▸ 나도 해보기: overture.so/boss`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = shareText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
      {/* Card content — screenshot-friendly */}
      <div style={{ padding: 20, textAlign: 'center' }}>
        <span style={{ fontSize: 36 }}>{type?.emoji || '👔'}</span>
        <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', margin: '8px 0 2px' }}>{type?.name || typeCode}</p>
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{typeCode} 팀장</p>

        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '12px 0 16px', lineHeight: 1.4 }}>
          &ldquo;{situationShort}&rdquo;
        </p>

        {/* Verdict banner */}
        <div style={{
          padding: '10px 16px', borderRadius: 10,
          background: VERDICT_COLORS[verdict.verdict] || 'var(--accent)',
          color: 'white',
          display: 'inline-block',
        }}>
          <span style={{ fontSize: 16, marginRight: 6 }}>{VERDICT_EMOJI[verdict.verdict]}</span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{VERDICT_LABELS[verdict.verdict] || verdict.verdict}</span>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: '12px 0 4px', lineHeight: 1.5 }}>
          &ldquo;{verdict.reason}&rdquo;
        </p>
        {verdict.tip && (
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0' }}>💡 {verdict.tip}</p>
        )}

        {count > 0 && (
          <p style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 12 }}>16유형 중 {count}개 완료</p>
        )}
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex', gap: 0,
        borderTop: '1px solid var(--border-subtle)',
      }}>
        <button
          onClick={handleCopy}
          style={{
            flex: 1, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            color: copied ? 'var(--success)' : 'var(--accent)',
          }}
        >
          {copied ? <><Check size={14} /> 복사됨!</> : <><Copy size={14} /> 텍스트 복사</>}
        </button>
        <button
          onClick={onClose}
          style={{
            padding: '12px 16px', background: 'none', border: 'none',
            borderLeft: '1px solid var(--border-subtle)',
            cursor: 'pointer', fontSize: 12, color: 'var(--text-tertiary)',
          }}
        >
          닫기
        </button>
      </div>
    </motion.div>
  );
}

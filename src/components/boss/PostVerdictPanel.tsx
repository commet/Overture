'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, MessageSquare, Share2 } from 'lucide-react';
import { useBossStore } from '@/stores/useBossStore';
import { getPersonalityType, PERSONALITY_TYPES } from '@/lib/boss/personality-types';
import { pickScenarios, detectCategory, DIFFICULTY_LABELS, type Scenario } from '@/lib/boss/scenarios';
import { CollectionProgress } from './CollectionProgress';
import { getStorage, STORAGE_KEYS } from '@/lib/storage';

interface PostVerdictPanelProps {
  verdict: { verdict: string; reason: string; tip?: string };
  onShare: () => void;
}

export function PostVerdictPanel({ verdict, onShare }: PostVerdictPanelProps) {
  const { lastSituation, resetForNewType, resetForNewSituation, addUserMessage, startChat } = useBossStore();
  const axes = useBossStore(s => s.axes);
  const typeCode = `${axes.ei}${axes.sn}${axes.tf}${axes.jp}`;
  const [showScenarios, setShowScenarios] = useState(false);

  // 다른 유형 이름 미리보기
  const allCodes = Object.keys(PERSONALITY_TYPES);
  const otherCodes = allCodes.filter(c => c !== typeCode);
  const suggestedCode = otherCodes[Math.floor(Math.random() * otherCodes.length)];
  const suggestedType = getPersonalityType(suggestedCode);

  // 시나리오 추천
  const currentCategory = detectCategory(lastSituation);
  const scenarios = pickScenarios(null, currentCategory);

  const handleNewType = () => {
    resetForNewType(lastSituation);
  };

  const handleScenario = (scenario: Scenario) => {
    resetForNewSituation();
    addUserMessage(scenario.text);
    startChat();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ margin: '8px 0', display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button
          onClick={handleNewType}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 16px', borderRadius: 14,
            background: 'var(--surface)', border: '1px solid var(--border-subtle)',
            cursor: 'pointer', textAlign: 'left', width: '100%',
            transition: 'border-color 0.15s',
          }}
          onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
        >
          <RefreshCw size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>다른 유형으로 같은 상황</p>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
              {suggestedType ? `${suggestedType.emoji} ${suggestedType.name} 팀장이면 뭐라 할까?` : '랜덤 유형으로 시도'}
            </p>
          </div>
        </button>

        <button
          onClick={() => setShowScenarios(!showScenarios)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 16px', borderRadius: 14,
            background: 'var(--surface)', border: '1px solid var(--border-subtle)',
            cursor: 'pointer', textAlign: 'left', width: '100%',
            transition: 'border-color 0.15s',
          }}
          onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
        >
          <MessageSquare size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>같은 팀장, 다른 상황</p>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>이번엔 다른 얘기 해볼까?</p>
          </div>
        </button>

        <button
          onClick={onShare}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 16px', borderRadius: 14,
            background: 'var(--surface)', border: '1px solid var(--border-subtle)',
            cursor: 'pointer', textAlign: 'left', width: '100%',
            transition: 'border-color 0.15s',
          }}
          onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
        >
          <Share2 size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>결과 공유하기</p>
        </button>
      </div>

      {/* Scenario suggestions (expandable) */}
      {showScenarios && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.25 }}
          style={{ overflow: 'hidden' }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '8px 0 6px' }}>
            이 상황도 해보세요
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            {scenarios.map(s => {
              const diff = DIFFICULTY_LABELS[s.difficulty];
              return (
                <button
                  key={s.id}
                  onClick={() => handleScenario(s)}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 12,
                    background: 'var(--bg)', border: '1px solid var(--border-subtle)',
                    cursor: 'pointer', textAlign: 'center',
                    transition: 'border-color 0.15s, transform 0.1s',
                  }}
                  onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                >
                  <span style={{ fontSize: 20, display: 'block', marginBottom: 4 }}>{s.emoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>{s.displayText}</span>
                  <span style={{ fontSize: 10, color: diff.color, fontWeight: 500 }}>{diff.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Collection progress */}
      <CollectionProgress />
    </motion.div>
  );
}

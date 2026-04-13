'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, MessageSquare, Share2 } from 'lucide-react';
import { useBossStore } from '@/stores/useBossStore';
import { getPersonalityType, PERSONALITY_TYPES } from '@/lib/boss/personality-types';
import { pickScenarios, detectCategory, DIFFICULTY_LABELS, type Scenario } from '@/lib/boss/scenarios';
import { CollectionProgress } from './CollectionProgress';
import { InnerMonologueCard } from './InnerMonologueCard';

interface PostVerdictPanelProps {
  verdict: { verdict: string; reason: string; tip?: string };
  onShare: () => void;
}

export function PostVerdictPanel({ verdict, onShare }: PostVerdictPanelProps) {
  const { lastSituation, resetForNewType, resetForNewSituation, addUserMessage, startChat } = useBossStore();
  const axes = useBossStore(s => s.axes);
  const innerMonologue = useBossStore(s => s.innerMonologue);
  const innerLoading = useBossStore(s => s.innerLoading);
  const typeCode = `${axes.ei}${axes.sn}${axes.tf}${axes.jp}`;
  const [showScenarios, setShowScenarios] = useState(false);

  // 이면 공개 후에야 secondary actions 노출
  const innerUnlocked = !!innerMonologue;
  const innerActive = innerLoading || innerUnlocked;

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
      transition={{ delay: 0.5, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ margin: '12px 0', display: 'flex', flexDirection: 'column', gap: 12 }}
    >
      {/* ── Hero: 이면 공개 (판정 직후 감정의 피크) ── */}
      <InnerMonologueCard verdict={verdict} />

      {/* ── Secondary actions: 이면 공개/스트리밍 이후에만 노출 ── */}
      <AnimatePresence>
        {innerActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ delay: innerUnlocked ? 0.4 : 0, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                onClick={handleNewType}
                className="bc-post-btn"
                title={suggestedType ? `${suggestedType.emoji} ${suggestedType.name} 팀장이면?` : '랜덤 유형'}
              >
                <RefreshCw size={12} />
                <span>다른 유형</span>
              </button>
              <button
                onClick={() => setShowScenarios(!showScenarios)}
                className="bc-post-btn"
              >
                <MessageSquare size={12} />
                <span>다른 상황</span>
              </button>
              <button
                onClick={onShare}
                className="bc-post-btn"
              >
                <Share2 size={12} />
                <span>공유</span>
              </button>
            </div>

            {/* Scenario suggestions (expandable) */}
            <AnimatePresence>
              {showScenarios && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ overflow: 'hidden' }}
                >
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 6px' }}>
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
            </AnimatePresence>

            <div style={{ marginTop: 10 }}>
              <CollectionProgress />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

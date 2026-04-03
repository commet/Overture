'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { Agent } from '@/stores/agent-types';
import { getLevelProgress, AGENT_LEVELS } from '@/stores/agent-types';

const EASE = [0.32, 0.72, 0, 1] as const;

const GROUP_LABELS: Record<string, string> = {
  research: '리서치',
  strategy: '전략',
  production: '실행',
  validation: '검증',
  special: '총괄',
  people: '사람들',
};

const OBS_CATEGORY_LABELS: Record<string, string> = {
  preference: '선호',
  skill_gap: '약점',
  communication_style: '소통 방식',
  work_pattern: '업무 패턴',
};

interface AgentProfileProps {
  agent: Agent;
  onClose: () => void;
}

export function AgentProfile({ agent, onClose }: AgentProfileProps) {
  const { current, next, progress } = getLevelProgress(agent.xp);
  const levelData = AGENT_LEVELS.find(l => l.level === agent.level);
  const isMaxLevel = agent.level >= AGENT_LEVELS[AGENT_LEVELS.length - 1].level;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="relative w-full sm:max-w-md max-h-[85vh] sm:max-h-[80vh] rounded-t-2xl sm:rounded-2xl bg-[var(--surface)] shadow-[var(--shadow-xl)] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 shrink-0" style={{ borderBottom: `3px solid ${agent.color}` }}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2.5 hover:bg-[var(--bg)] rounded-lg cursor-pointer transition-colors"
            aria-label="닫기"
          >
            <X size={18} className="text-[var(--text-tertiary)]" />
          </button>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            {/* Avatar */}
            <div
              style={{
                width: 56, height: 56, borderRadius: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, background: `${agent.color}14`,
                border: `2px solid ${agent.color}30`,
              }}
            >
              {agent.emoji}
            </div>

            {/* Identity */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                {agent.name}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                {agent.role}
                <span style={{ color: 'var(--text-tertiary)', marginLeft: 8 }}>
                  {GROUP_LABELS[agent.group] || agent.group}
                </span>
              </p>

              {/* Level + XP */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <span className="agent-lv" data-level={agent.level} style={{ fontSize: 11 }}>
                  Lv.{agent.level}
                </span>
                <div style={{ flex: 1, maxWidth: 120 }}>
                  <div className="agent-xp-bar" style={{ height: 4 }}>
                    <div
                      className="agent-xp-fill"
                      style={{ width: `${Math.round(progress * 100)}%`, background: agent.color }}
                    />
                  </div>
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                  {isMaxLevel ? 'MAX' : `${current}/${next}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* Expertise & Tone */}
          {(agent.expertise || agent.tone) && (
            <section>
              {agent.expertise && (
                <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, marginBottom: 6 }}>
                  {agent.expertise}
                </p>
              )}
              {agent.tone && (
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>
                  {agent.tone}
                </p>
              )}
            </section>
          )}

          {/* Stakeholder info (for people agents) */}
          {agent.group === 'people' && agent.organization && (
            <section>
              <SectionLabel>프로필</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '4px 12px', fontSize: 12 }}>
                {agent.organization && <><span style={{ color: 'var(--text-tertiary)' }}>소속</span><span style={{ color: 'var(--text-primary)' }}>{agent.organization}</span></>}
                {agent.priorities && <><span style={{ color: 'var(--text-tertiary)' }}>우선</span><span style={{ color: 'var(--text-primary)' }}>{agent.priorities}</span></>}
                {agent.known_concerns && <><span style={{ color: 'var(--text-tertiary)' }}>우려</span><span style={{ color: 'var(--text-primary)' }}>{agent.known_concerns}</span></>}
              </div>
            </section>
          )}

          {/* Boss personality (for boss agents) */}
          {agent.personality_code && (
            <section>
              <SectionLabel>성격 프로필</SectionLabel>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <InfoPill label="유형" value={agent.personality_code} />
                {agent.personality_profile?.bossVibe && (
                  <InfoPill label="분위기" value={agent.personality_profile.bossVibe} />
                )}
              </div>
            </section>
          )}

          {/* Observations */}
          {agent.observations.length > 0 && (
            <section>
              <SectionLabel>관찰 ({agent.observations.length})</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {agent.observations
                  .sort((a, b) => b.confidence - a.confidence)
                  .map(obs => (
                    <div
                      key={obs.id}
                      style={{
                        fontSize: 12, lineHeight: 1.6, padding: '8px 12px',
                        borderRadius: 10, background: 'var(--bg)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <span style={{
                        fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)',
                        marginRight: 6,
                      }}>
                        {OBS_CATEGORY_LABELS[obs.category] || obs.category}
                      </span>
                      {obs.observation}
                      <span style={{
                        fontSize: 10, color: 'var(--text-tertiary)',
                        marginLeft: 8, fontVariantNumeric: 'tabular-nums',
                      }}>
                        {Math.round(obs.confidence * 100)}%
                      </span>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* Empty observations state */}
          {agent.observations.length === 0 && (
            <section>
              <SectionLabel>관찰</SectionLabel>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                아직 축적된 관찰이 없습니다. 작업을 수행할수록 사용자에 대한 이해가 쌓입니다.
              </p>
            </section>
          )}

          {/* Stats */}
          <section>
            <SectionLabel>통계</SectionLabel>
            <div style={{ display: 'flex', gap: 16 }}>
              <Stat label="XP" value={agent.xp.toString()} />
              <Stat label="관찰" value={agent.observations.length.toString()} />
              {agent.last_used_at && (
                <Stat label="마지막 사용" value={formatRelativeDate(agent.last_used_at)} />
              )}
            </div>
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)',
      letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8,
    }}>
      {children}
    </p>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <span style={{
      fontSize: 11, padding: '3px 10px', borderRadius: 99,
      background: 'var(--bg)', color: 'var(--text-primary)',
    }}>
      <span style={{ color: 'var(--text-tertiary)', marginRight: 4 }}>{label}</span>
      {value}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </p>
      <p style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{label}</p>
    </div>
  );
}

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

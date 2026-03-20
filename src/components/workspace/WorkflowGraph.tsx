'use client';

import { useState, useEffect, useRef } from 'react';
import type { OrchestrateStep as StepType, OrchestrateAnalysis } from '@/stores/types';
import { Bot, Brain, Handshake, Flag, Clock, Package, Zap, Trash2 } from 'lucide-react';

interface WorkflowGraphProps {
  steps: StepType[];
  analysis: OrchestrateAnalysis | null;
  editable?: boolean;
  onUpdateActor?: (index: number, actor: 'ai' | 'human' | 'both') => void;
  onToggleCheckpoint?: (index: number) => void;
  onRemoveStep?: (index: number) => void;
  onUpdateField?: (index: number, updates: Partial<StepType>) => void;
}

const ACTORS = {
  ai: { label: 'AI', color: '#3b6dcc', bg: '#eaeff8', text: '#2d4a7c', Icon: Bot },
  human: { label: '사람', color: '#b8860b', bg: '#fef4e4', text: '#8b6914', Icon: Brain },
  both: { label: '협업', color: '#2d6b2d', bg: '#eaf5ea', text: '#2d6b2d', Icon: Handshake },
} as const;

/** Extract selectable options from judgment text */
function extractOptions(judgment?: string): string[] {
  if (!judgment || !judgment.includes('/')) return [];
  const clauses = judgment.split(/[,.]\s*/);
  for (const clause of clauses) {
    if (!clause.includes('/')) continue;
    const opts = clause.split('/').map(o => o.trim()).filter(o => o.length >= 1 && o.length <= 20);
    if (opts.length >= 2) return opts;
  }
  return [];
}

/* ────────────────────────────────────
   Role Distribution Dashboard
   ──────────────────────────────────── */

function RoleDashboard({ steps }: { steps: StepType[] }) {
  const total = steps.length || 1;
  const counts = { ai: 0, human: 0, both: 0 };
  steps.forEach(s => { counts[s.actor] = (counts[s.actor] || 0) + 1; });

  return (
    <div className="grid grid-cols-3 gap-2 mb-5">
      {(['ai', 'human', 'both'] as const).map((actor) => {
        const a = ACTORS[actor];
        const pct = Math.round((counts[actor] / total) * 100);
        const AIcon = a.Icon;
        return (
          <div key={actor} className="rounded-xl p-3 text-center" style={{ backgroundColor: a.bg }}>
            <div className="flex items-center justify-center gap-1.5 mb-1.5">
              <AIcon size={13} style={{ color: a.text }} />
              <span className="text-[12px] font-bold" style={{ color: a.text }}>{a.label}</span>
            </div>
            <div className="text-[20px] font-bold tracking-tight" style={{ color: a.text }}>
              {counts[actor]}<span className="text-[12px] font-normal opacity-60">/{total}</span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${a.color}20` }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: a.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────
   Actor Toggle — 3-position pill
   ──────────────────────────────────── */

function ActorToggle({
  current,
  onChange,
}: {
  current: 'ai' | 'human' | 'both';
  onChange: (actor: 'ai' | 'human' | 'both') => void;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-[var(--border-subtle)] bg-white/60 p-0.5">
      {(['ai', 'both', 'human'] as const).map((actor) => {
        const a = ACTORS[actor];
        const active = current === actor;
        const AIcon = a.Icon;
        return (
          <button
            key={actor}
            onClick={(e) => { e.stopPropagation(); onChange(actor); }}
            className={`
              flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold
              transition-all duration-200 cursor-pointer
              ${active
                ? 'shadow-sm'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }
            `}
            style={active ? { backgroundColor: a.bg, color: a.text } : {}}
          >
            <AIcon size={10} />
            {a.label}
          </button>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────
   Main Component
   ──────────────────────────────────── */

export function WorkflowGraph({
  steps,
  analysis,
  editable = false,
  onUpdateActor,
  onToggleCheckpoint,
  onRemoveStep,
  onUpdateField,
}: WorkflowGraphProps) {
  const criticalSet = new Set(analysis?.critical_path || []);

  return (
    <div>
      {/* ── Dashboard ── */}
      <RoleDashboard steps={steps} />

      {/* ── Lane headers ── */}
      <div className="hidden md:grid grid-cols-[1fr_auto_1fr] gap-0 mb-3">
        <div className="flex items-center gap-1.5 pl-1">
          <Bot size={12} style={{ color: ACTORS.ai.text }} />
          <span className="text-[11px] font-semibold" style={{ color: ACTORS.ai.text }}>AI 실행</span>
        </div>
        <div className="w-px" />
        <div className="flex items-center justify-end gap-1.5 pr-1">
          <span className="text-[11px] font-semibold" style={{ color: ACTORS.human.text }}>사람 판단</span>
          <Brain size={12} style={{ color: ACTORS.human.text }} />
        </div>
      </div>

      {/* ── Steps in lane layout ── */}
      <div className="relative">
        {/* Center line (desktop only) */}
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-[var(--border-subtle)] -translate-x-1/2" />

        <div className="space-y-3">
          {steps.map((step, i) => {
            const a = ACTORS[step.actor] || ACTORS.ai;
            const AIcon = a.Icon;
            const isCritical = criticalSet.has(i + 1) || criticalSet.has(i);
            const options = extractOptions(step.judgment);

            // Lane positioning
            const laneClass = step.actor === 'ai'
              ? 'md:mr-[52%]'                    // left lane
              : step.actor === 'human'
              ? 'md:ml-[52%]'                    // right lane
              : '';                               // full width (collaboration)

            return (
              <div key={i} className={`relative ${laneClass}`}>
                <div
                  className={`rounded-xl border overflow-hidden transition-all ${
                    isCritical ? 'ring-1 ring-red-200' : ''
                  }`}
                  style={{ borderColor: `${a.color}30` }}
                >
                  {/* Checkpoint banner */}
                  {step.checkpoint && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#fffbf0] border-b border-[#f0e6c8]">
                      <Flag size={11} className="text-amber-600" />
                      <span className="text-[10px] font-semibold text-amber-700">체크포인트</span>
                      {step.checkpoint_reason && (
                        <span className="text-[10px] text-amber-600/70">— {step.checkpoint_reason}</span>
                      )}
                    </div>
                  )}

                  {/* Card body */}
                  <div className="px-4 py-3" style={{ backgroundColor: `${a.color}06` }}>
                    {/* Header row: number + actor + task */}
                    <div className="flex items-start gap-2.5">
                      <span
                        className="text-[16px] font-bold tabular-nums leading-none pt-0.5 shrink-0 select-none"
                        style={{ color: `${a.color}35` }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {editable ? (
                            <ActorToggle current={step.actor} onChange={(actor) => onUpdateActor?.(i, actor)} />
                          ) : (
                            <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: a.text }}>
                              <AIcon size={10} /> {a.label}
                            </span>
                          )}
                          {isCritical && (
                            <span className="text-[9px] text-red-500 font-bold flex items-center gap-0.5">
                              <Zap size={9} /> 크리티컬
                            </span>
                          )}
                          {step.estimated_time && (
                            <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1 ml-auto">
                              <Clock size={9} /> {step.estimated_time}
                            </span>
                          )}
                        </div>

                        <p className="text-[13px] font-semibold text-[var(--text-primary)] leading-snug">
                          {step.task}
                        </p>

                        {step.expected_output && (
                          <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 flex items-start gap-1.5">
                            <Package size={10} className="shrink-0 mt-0.5 opacity-40" />
                            {step.expected_output}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ── Inline inputs (always visible, no click needed) ── */}

                    {/* AI guide input */}
                    {editable && (step.actor === 'ai' || step.actor === 'both') && (
                      <div className="mt-3 ml-[26px]">
                        <input
                          type="text"
                          value={step.user_ai_guide || ''}
                          onChange={(e) => onUpdateField?.(i, { user_ai_guide: e.target.value })}
                          placeholder="AI에게 지시할 방향이나 제약조건..."
                          className="w-full text-[12px] px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-white/60 placeholder:text-[var(--text-tertiary)] focus:border-[#3b6dcc] focus:outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}

                    {/* Human decision — options chips + input */}
                    {editable && (step.actor === 'human' || step.actor === 'both') && (
                      <div className="mt-3 ml-[26px]">
                        {step.judgment?.trim() && (
                          <p className="text-[11px] text-[var(--text-secondary)] mb-2">
                            {step.judgment}
                          </p>
                        )}
                        {options.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {options.map((opt, j) => (
                              <button
                                key={j}
                                onClick={(e) => { e.stopPropagation(); onUpdateField?.(i, { user_decision: opt }); }}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border cursor-pointer transition-all ${
                                  step.user_decision === opt
                                    ? 'border-[#8b6914] bg-[var(--human)] text-[#8b6914]'
                                    : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[#8b6914]'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                        <input
                          type="text"
                          value={step.user_decision || ''}
                          onChange={(e) => onUpdateField?.(i, { user_decision: e.target.value })}
                          placeholder={options.length > 0 ? '또는 직접 입력...' : '결정 사항을 입력하세요...'}
                          className="w-full text-[12px] px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-white/60 placeholder:text-[var(--text-tertiary)] focus:border-[#8b6914] focus:outline-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}

                    {/* Read-only: show filled values */}
                    {!editable && step.user_ai_guide?.trim() && (
                      <p className="text-[11px] text-[#2d4a7c] mt-2 ml-[26px] italic">
                        AI 가이드: {step.user_ai_guide}
                      </p>
                    )}
                    {!editable && step.user_decision?.trim() && (
                      <p className="text-[11px] text-[#8b6914] mt-1 ml-[26px] font-medium">
                        결정: {step.user_decision}
                      </p>
                    )}

                    {/* Collaboration split — visible for 'both' */}
                    {step.actor === 'both' && !editable && (
                      <div className="grid grid-cols-2 gap-2 mt-3 ml-[26px]">
                        <div className="rounded-lg p-2 border" style={{ backgroundColor: `${ACTORS.ai.bg}cc`, borderColor: `${ACTORS.ai.color}15` }}>
                          <span className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 mb-1" style={{ color: ACTORS.ai.text }}>
                            <Bot size={9} /> AI
                          </span>
                          <p className="text-[11px] text-[var(--text-primary)]">{step.expected_output || step.task}</p>
                        </div>
                        <div className="rounded-lg p-2 border" style={{ backgroundColor: `${ACTORS.human.bg}cc`, borderColor: `${ACTORS.human.color}15` }}>
                          <span className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 mb-1" style={{ color: ACTORS.human.text }}>
                            <Brain size={9} /> 사람
                          </span>
                          <p className="text-[11px] text-[var(--text-primary)]">{step.judgment || '판단 필요'}</p>
                        </div>
                      </div>
                    )}

                    {/* Actor reasoning — subtle */}
                    {step.actor_reasoning?.trim() && (
                      <p className="text-[10px] text-[var(--text-tertiary)] mt-2 ml-[26px] italic">
                        {step.actor_reasoning}
                      </p>
                    )}
                  </div>

                  {/* Edit controls */}
                  {editable && (
                    <div className="flex items-center justify-between px-3 py-1.5 bg-white/40 border-t border-[var(--border-subtle)]">
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleCheckpoint?.(i); }}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border cursor-pointer transition-colors ${
                          step.checkpoint
                            ? 'border-amber-400 bg-amber-50 text-amber-700'
                            : 'border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:border-amber-300'
                        }`}
                      >
                        <Flag size={9} className="inline mr-1" /> 체크포인트
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemoveStep?.(i); }}
                        className="p-1 rounded text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-50 cursor-pointer transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

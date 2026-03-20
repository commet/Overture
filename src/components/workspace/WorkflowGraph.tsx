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

function RoleDashboard({ steps, checkpoints, totalTime }: { steps: StepType[]; checkpoints?: number; totalTime?: string }) {
  const total = steps.length || 1;
  const counts = { ai: 0, human: 0, both: 0 };
  steps.forEach(s => { counts[s.actor] = (counts[s.actor] || 0) + 1; });
  const humanPct = Math.round(((counts.human + counts.both) / total) * 100);

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 mb-5">
      {/* Unified ratio bar — tall enough to show numbers */}
      <div className="flex h-6 rounded-lg overflow-hidden mb-3 text-[11px] font-bold text-white">
        {counts.ai > 0 && (
          <div
            className="transition-all duration-500 flex items-center justify-center gap-1"
            style={{ width: `${(counts.ai / total) * 100}%`, backgroundColor: ACTORS.ai.color }}
          >
            AI {counts.ai}
          </div>
        )}
        {counts.both > 0 && (
          <div
            className="transition-all duration-500 flex items-center justify-center gap-1"
            style={{ width: `${(counts.both / total) * 100}%`, backgroundColor: ACTORS.both.color }}
          >
            협업 {counts.both}
          </div>
        )}
        {counts.human > 0 && (
          <div
            className="transition-all duration-500 flex items-center justify-center gap-1"
            style={{ width: `${(counts.human / total) * 100}%`, backgroundColor: ACTORS.human.color }}
          >
            사람 {counts.human}
          </div>
        )}
      </div>

      {/* Stats — compact */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
        <span className="text-[var(--text-primary)] font-semibold">사람 개입 {humanPct}%</span>
        {checkpoints !== undefined && checkpoints > 0 && (
          <>
            <span className="text-[var(--text-tertiary)]">|</span>
            <span className="text-amber-700 font-semibold"><Flag size={10} className="inline mr-0.5" />체크포인트 {checkpoints}</span>
          </>
        )}
        {totalTime && (
          <>
            <span className="text-[var(--text-tertiary)]">|</span>
            <span className="text-[var(--text-secondary)]"><Clock size={10} className="inline mr-0.5" />총 {totalTime}</span>
          </>
        )}
      </div>
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
    <div className="inline-flex items-center rounded-lg border border-[var(--border-subtle)] bg-white/80 p-0.5">
      {(['ai', 'both', 'human'] as const).map((actor) => {
        const a = ACTORS[actor];
        const active = current === actor;
        const AIcon = a.Icon;
        return (
          <button
            key={actor}
            onClick={(e) => { e.stopPropagation(); onChange(actor); }}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold
              transition-all duration-200 cursor-pointer
              ${active
                ? 'shadow-sm'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
              }
            `}
            style={active ? { backgroundColor: a.color, color: '#fff' } : {}}
          >
            <AIcon size={11} />
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
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const toggleStep = (i: number) => setExpandedSteps(prev => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  return (
    <div>
      {/* ── Dashboard — unified bar ── */}
      <RoleDashboard
        steps={steps}
        checkpoints={steps.filter(s => s.checkpoint).length}
        totalTime={analysis?.total_estimated_time}
      />

      {/* ── Lane headers — large, centered in each half ── */}
      <div className="hidden md:grid grid-cols-2 gap-0 mb-4">
        <div className="flex items-center justify-center gap-2 py-2 rounded-l-lg" style={{ backgroundColor: `${ACTORS.ai.color}08` }}>
          <Bot size={16} style={{ color: ACTORS.ai.text }} />
          <span className="text-[15px] font-bold" style={{ color: ACTORS.ai.text }}>AI 실행</span>
        </div>
        <div className="flex items-center justify-center gap-2 py-2 rounded-r-lg" style={{ backgroundColor: `${ACTORS.human.color}08` }}>
          <Brain size={16} style={{ color: ACTORS.human.text }} />
          <span className="text-[15px] font-bold" style={{ color: ACTORS.human.text }}>사람 판단</span>
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

            const isExpanded = expandedSteps.has(i);
            const hasInput = !!(step.user_ai_guide?.trim() || step.user_decision?.trim());

            return (
              <div key={i} className={`relative ${laneClass}`}>
                <div
                  className={`rounded-xl overflow-hidden transition-all cursor-pointer bg-[var(--surface)] ${
                    isCritical ? 'ring-1 ring-red-200' : ''
                  } ${isExpanded ? 'shadow-md border border-[var(--border)]' : 'border border-[var(--border-subtle)] hover:border-[var(--border)]'}`}
                  style={{ borderLeft: `3px solid ${a.color}` }}
                  onClick={() => toggleStep(i)}
                >
                  {/* Card body — clean white, no pastel tint */}
                  <div className="px-4 py-3 bg-[var(--surface)]">
                    {/* Header: number + actor + task + time */}
                    <div className="flex items-start gap-2.5">
                      <div className="shrink-0 flex flex-col items-center gap-0.5">
                        <span
                          className="text-[18px] font-bold tabular-nums leading-none select-none"
                          style={{ color: `${a.color}30` }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        {step.checkpoint && (
                          <span title="체크포인트: 사람이 반드시 확인"><Flag size={10} className="text-amber-600" /></span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {editable ? (
                            <ActorToggle current={step.actor} onChange={(actor) => onUpdateActor?.(i, actor)} />
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold"
                              style={{ backgroundColor: a.color, color: '#fff' }}
                            >
                              <AIcon size={11} /> {a.label}
                            </span>
                          )}
                          {isCritical && (
                            <span className="text-[10px] text-red-600 font-bold flex items-center gap-0.5">
                              <Zap size={10} /> 크리티컬
                            </span>
                          )}
                          {step.estimated_time && (
                            <span className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1 ml-auto">
                              <Clock size={10} /> {step.estimated_time}
                            </span>
                          )}
                        </div>

                        <p className="text-[14px] font-semibold text-[var(--text-primary)] leading-snug">
                          {step.task}
                        </p>

                        {step.expected_output && (
                          <p className="text-[12px] text-[var(--text-primary)]/70 mt-1.5 flex items-start gap-1.5">
                            <Package size={11} className="shrink-0 mt-0.5 opacity-50" />
                            {step.expected_output}
                          </p>
                        )}

                        {/* Filled input indicators (collapsed view) */}
                        {!isExpanded && hasInput && (
                          <div className="flex gap-2 mt-2">
                            {step.user_ai_guide?.trim() && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--ai)] text-[#2d4a7c] font-medium">AI 가이드 입력됨</span>
                            )}
                            {step.user_decision?.trim() && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--human)] text-[#8b6914] font-medium">결정 입력됨</span>
                            )}
                          </div>
                        )}

                        {/* Expand hint */}
                        {!isExpanded && editable && (
                          <p className="text-[11px] text-[var(--text-secondary)] mt-2">상세 입력 &darr;</p>
                        )}
                      </div>
                    </div>

                    {/* ── Expanded: inputs + details ── */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] animate-fade-in space-y-3">
                        {/* AI guide input */}
                        {editable && (step.actor === 'ai' || step.actor === 'both') && (
                          <div>
                            <p className="text-[11px] font-semibold text-[#2d4a7c] mb-1">AI에게 방향 지시</p>
                            <input
                              type="text"
                              value={step.user_ai_guide || ''}
                              onChange={(e) => onUpdateField?.(i, { user_ai_guide: e.target.value })}
                              placeholder="예: 국내 시장 중심으로, 최근 3년 데이터 기준으로"
                              className="w-full text-[13px] px-3 py-2 rounded-lg border border-[var(--border)] bg-white placeholder:text-[var(--text-tertiary)] focus:border-[#3b6dcc] focus:outline-none"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}

                        {/* Human judgment + decision */}
                        {editable && (step.actor === 'human' || step.actor === 'both') && (
                          <div>
                            <p className="text-[11px] font-semibold text-[#8b6914] mb-1">사람의 판단</p>
                            {step.judgment?.trim() && (
                              <p className="text-[12px] text-[var(--text-primary)] mb-2 leading-relaxed">
                                {step.judgment}
                              </p>
                            )}
                            {options.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {options.map((opt, j) => (
                                  <button
                                    key={j}
                                    onClick={(e) => { e.stopPropagation(); onUpdateField?.(i, { user_decision: opt }); }}
                                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border cursor-pointer transition-all ${
                                      step.user_decision === opt
                                        ? 'border-[#8b6914] bg-[#8b6914] text-white'
                                        : 'border-[var(--border)] text-[var(--text-primary)] hover:border-[#8b6914]'
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
                              className="w-full text-[13px] px-3 py-2 rounded-lg border border-[var(--border)] bg-white placeholder:text-[var(--text-tertiary)] focus:border-[#8b6914] focus:outline-none"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}

                        {/* Read-only filled values */}
                        {!editable && step.user_ai_guide?.trim() && (
                          <div className="rounded-lg bg-[var(--ai)] px-3 py-2">
                            <p className="text-[11px] font-bold text-[#2d4a7c] mb-0.5">AI 가이드</p>
                            <p className="text-[12px] text-[var(--text-primary)]">{step.user_ai_guide}</p>
                          </div>
                        )}
                        {!editable && step.user_decision?.trim() && (
                          <div className="rounded-lg bg-[var(--human)] px-3 py-2">
                            <p className="text-[11px] font-bold text-[#8b6914] mb-0.5">결정</p>
                            <p className="text-[12px] text-[var(--text-primary)]">{step.user_decision}</p>
                          </div>
                        )}

                        {/* Actor reasoning — readable */}
                        {step.actor_reasoning?.trim() && (
                          <p className="text-[12px] text-[var(--text-primary)]/70 leading-relaxed italic">
                            {step.actor_reasoning}
                          </p>
                        )}

                        {/* Checkpoint reason — only in expanded */}
                        {step.checkpoint && step.checkpoint_reason && (
                          <div className="flex items-start gap-2 text-[12px] bg-amber-50 rounded-lg px-3 py-2">
                            <Flag size={11} className="text-amber-700 shrink-0 mt-0.5" />
                            <p className="text-amber-800"><span className="font-semibold">체크포인트:</span> {step.checkpoint_reason}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Edit controls — only in expanded editable */}
                  {editable && isExpanded && (
                    <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg)] border-t border-[var(--border-subtle)]">
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleCheckpoint?.(i); }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border cursor-pointer transition-colors ${
                          step.checkpoint
                            ? 'border-amber-400 bg-amber-50 text-amber-800'
                            : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-amber-300'
                        }`}
                      >
                        <Flag size={10} className="inline mr-1" /> 체크포인트 {step.checkpoint ? '해제' : '설정'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onRemoveStep?.(i); }}
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-50 cursor-pointer transition-colors"
                      >
                        <Trash2 size={13} />
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

'use client';

import { useState, useEffect, useRef } from 'react';
import type { OrchestrateStep as StepType, OrchestrateAnalysis } from '@/stores/types';
import { Bot, Brain, Handshake, Flag, Clock, Package, Scale, ChevronDown, ChevronUp, Zap } from 'lucide-react';

interface WorkflowGraphProps {
  steps: StepType[];
  analysis: OrchestrateAnalysis | null;
  editable?: boolean;
  onUpdateActor?: (index: number, actor: 'ai' | 'human' | 'both') => void;
  onToggleCheckpoint?: (index: number) => void;
  onRemoveStep?: (index: number) => void;
  onUpdateField?: (index: number, updates: Partial<StepType>) => void;
}

const ACTORS: Record<
  string,
  { label: string; color: string; bg: string; bgSubtle: string; text: string; Icon: typeof Bot }
> = {
  ai: {
    label: 'AI 실행',
    color: '#3b6dcc',
    bg: '#eaeff8',
    bgSubtle: 'rgba(59, 109, 204, 0.06)',
    text: '#2d4a7c',
    Icon: Bot,
  },
  human: {
    label: '사람 판단',
    color: '#b8860b',
    bg: '#fef4e4',
    bgSubtle: 'rgba(184, 134, 11, 0.06)',
    text: '#8b6914',
    Icon: Brain,
  },
  both: {
    label: '협업',
    color: '#2d6b2d',
    bg: '#eaf5ea',
    bgSubtle: 'rgba(45, 107, 45, 0.06)',
    text: '#2d6b2d',
    Icon: Handshake,
  },
};

/** Extract selectable options from judgment text (e.g. "프리미엄/볼륨/구독" → ["프리미엄","볼륨","구독"]) */
function extractDecisionOptions(judgment?: string): string[] {
  if (!judgment || !judgment.includes('/')) return [];
  const clauses = judgment.split(/[,.]\s*/);
  const STOP_WORDS = ['등', '중', '에서', '또는', '혹은', '어떤', '어디', '무엇', '어떻게'];
  for (const clause of clauses) {
    if (!clause.includes('/')) continue;
    const rawOpts = clause.split('/');
    if (rawOpts.length < 2) continue;
    const cleaned = rawOpts
      .map((o) => o.trim())
      .map((o) => {
        const words = o.split(/\s+/);
        let result = '';
        for (const w of words) {
          if (STOP_WORDS.includes(w)) break;
          if (result.length + w.length > 15) break;
          result += (result ? ' ' : '') + w;
        }
        return result;
      })
      .filter((o) => o.length >= 1);
    if (cleaned.length >= 2) return cleaned;
  }
  return [];
}

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
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const didAutoExpand = useRef(false);

  // Auto-expand first step needing decision in review mode
  useEffect(() => {
    if (didAutoExpand.current || !editable) return;
    didAutoExpand.current = true;
    const idx = steps.findIndex(
      (s) => (s.actor === 'human' || s.actor === 'both') && !s.user_decision?.trim()
    );
    if (idx >= 0) setExpandedIdx(idx);
  }, [editable, steps]);

  const toggle = (i: number) => setExpandedIdx((prev) => (prev === i ? null : i));

  const needsDecisionCount = editable
    ? steps.filter((s) => (s.actor === 'human' || s.actor === 'both') && !s.user_decision?.trim()).length
    : 0;

  return (
    <div>
      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-5 gap-y-1.5 pb-3 mb-4 border-b border-[var(--border-subtle)]">
        <span className="text-[11px] sm:text-[10px] text-[var(--text-tertiary)] uppercase tracking-widest font-semibold">
          범례
        </span>
        {Object.entries(ACTORS).map(([key, v]) => (
          <span key={key} className="flex items-center gap-1.5 text-[11px]" style={{ color: v.text }}>
            <span
              className="inline-block w-2.5 h-2.5 rounded-[2px]"
              style={{ backgroundColor: v.color }}
            />
            <span className="font-medium">{v.label}</span>
          </span>
        ))}
        <span className="flex items-center gap-1 text-[11px] text-amber-700">
          <Flag size={10} />
          <span className="font-medium">체크포인트 — 사람 검토 필수</span>
        </span>
        {criticalSet.size > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-red-500">
            <Zap size={10} />
            <span className="font-medium">크리티컬 패스</span>
          </span>
        )}
      </div>

      {/* ── Review guidance ── */}
      {editable && needsDecisionCount > 0 && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <p className="text-[12px] text-[var(--text-secondary)]">
            각 단계를 클릭하여 판단을 입력하세요.
            <span className="font-semibold text-amber-700 ml-1">결정 필요 {needsDecisionCount}건</span>
          </p>
        </div>
      )}

      {/* ── Steps ── */}
      <div className="space-y-2">
        {steps.map((step, i) => {
          const a = ACTORS[step.actor] || ACTORS.ai;
          const AIcon = a.Icon;
          const isCritical = criticalSet.has(i + 1) || criticalSet.has(i);
          const isExpanded = expandedIdx === i;
          const options = extractDecisionOptions(step.judgment);

          const hasExpandContent =
            editable ||
            !!step.actor_reasoning?.trim() ||
            (step.actor !== 'ai' && !!step.judgment?.trim()) ||
            (step.checkpoint && !!step.checkpoint_reason) ||
            !!step.user_ai_guide?.trim() ||
            !!step.user_decision?.trim();

          return (
            <div
              key={i}
              className={`relative rounded-lg overflow-hidden transition-all ${
                isCritical ? 'ring-1 ring-red-200/80' : ''
              }`}
              style={{ borderLeft: `3px solid ${a.color}` }}
            >
              {/* Checkpoint banner */}
              {step.checkpoint && (
                <div
                  className="flex items-center gap-2 px-4 py-2"
                  style={{ backgroundColor: '#fffbf0', borderBottom: '1px solid #f0e6c8' }}
                >
                  <Flag size={12} className="text-amber-600 shrink-0" />
                  <span className="text-[11px] font-semibold text-amber-700">체크포인트</span>
                  {step.checkpoint_reason && (
                    <span className="text-[11px] text-amber-600/80">— {step.checkpoint_reason}</span>
                  )}
                </div>
              )}

              {/* Main content — clickable to expand */}
              <div
                className={`px-4 py-3.5 ${hasExpandContent ? 'cursor-pointer' : ''}`}
                style={{ backgroundColor: a.bgSubtle }}
                onClick={() => hasExpandContent && toggle(i)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span
                      className="text-[18px] font-bold tabular-nums leading-none pt-0.5 shrink-0 select-none"
                      style={{ color: `${a.color}40` }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                          style={{ color: a.text }}
                        >
                          <AIcon size={10} />
                          {a.label}
                        </span>
                        {isCritical && (
                          <span className="text-[9px] text-red-500 font-bold flex items-center gap-0.5">
                            <Zap size={9} /> 크리티컬
                          </span>
                        )}
                      </div>

                      <p className="text-[13px] font-semibold text-[var(--text-primary)] leading-snug">
                        {step.task}
                      </p>

                      {step.expected_output && (
                        <p className="text-[11px] text-[var(--text-secondary)] mt-1 flex items-start gap-1.5">
                          <Package size={10} className="shrink-0 mt-0.5 opacity-40" />
                          {step.expected_output}
                        </p>
                      )}

                      {/* Inline indicators: filled inputs or needs-action prompts */}
                      {!isExpanded && step.user_ai_guide?.trim() && (
                        <p className="text-[10px] text-[#2d4a7c] mt-1.5 italic truncate">
                          가이드: {step.user_ai_guide}
                        </p>
                      )}
                      {!isExpanded && step.user_decision?.trim() && (
                        <p className="text-[10px] text-[#8b6914] mt-1 font-medium truncate">
                          결정: {step.user_decision}
                        </p>
                      )}
                      {/* Needs-input prompts (review mode only) */}
                      {!isExpanded && editable && step.actor !== 'ai' && !step.user_decision?.trim() && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full mt-1.5">
                          <Scale size={9} /> 결정 필요
                        </span>
                      )}
                      {!isExpanded && editable && step.actor === 'ai' && !step.user_ai_guide?.trim() && (
                        <span className="text-[10px] text-[var(--text-tertiary)] mt-1.5 block">
                          클릭하여 가이드 입력
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {step.estimated_time && (
                      <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                        <Clock size={9} /> {step.estimated_time}
                      </span>
                    )}
                    {hasExpandContent && (
                      <span className="text-[var(--text-tertiary)]">
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </span>
                    )}
                  </div>
                </div>

                {/* Collab split — always visible for 'both' steps */}
                {step.actor === 'both' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 ml-0 sm:ml-[30px]">
                    <div
                      className="rounded-md p-2.5 border"
                      style={{
                        backgroundColor: `${ACTORS.ai.bg}cc`,
                        borderColor: `${ACTORS.ai.color}15`,
                      }}
                    >
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 mb-1"
                        style={{ color: ACTORS.ai.text }}
                      >
                        <Bot size={9} /> AI가 만드는 것
                      </span>
                      <p className="text-[11px] text-[var(--text-primary)] leading-relaxed">
                        {step.expected_output || step.task}
                      </p>
                      {step.user_ai_guide?.trim() && !isExpanded && (
                        <p className="text-[10px] text-[#2d4a7c] mt-1 italic truncate">
                          {step.user_ai_guide}
                        </p>
                      )}
                    </div>
                    <div
                      className="rounded-md p-2.5 border"
                      style={{
                        backgroundColor: `${ACTORS.human.bg}cc`,
                        borderColor: `${ACTORS.human.color}15`,
                      }}
                    >
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 mb-1"
                        style={{ color: ACTORS.human.text }}
                      >
                        <Brain size={9} /> 사람이 결정하는 것
                      </span>
                      {step.user_decision?.trim() ? (
                        <div>
                          <p className="text-[11px] font-medium leading-relaxed" style={{ color: ACTORS.human.text }}>
                            {step.user_decision}
                          </p>
                          <span className="text-[9px] text-[var(--text-tertiary)] mt-0.5 block">결정됨</span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-[var(--text-primary)] leading-relaxed">
                          {step.judgment?.trim() || '클릭하여 결정하세요'}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Expanded panel ── */}
              {isExpanded && hasExpandContent && (
                <div className="px-4 pb-4 pt-0 animate-fade-in" style={{ backgroundColor: a.bgSubtle }}>
                  <div className="ml-0 sm:ml-[30px] pt-3 border-t border-[var(--border-subtle)] space-y-3">

                    {/* === AI Guide (for ai and both steps) === */}
                    {(step.actor === 'ai' || step.actor === 'both') && (
                      <div>
                        <label
                          className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block"
                          style={{ color: ACTORS.ai.text }}
                        >
                          AI 실행 가이드
                        </label>
                        {editable ? (
                          <>
                            <textarea
                              className="w-full text-[12px] p-2.5 rounded-md border border-[var(--border-subtle)] bg-white/80 resize-none leading-relaxed placeholder:text-[var(--text-tertiary)] focus:border-[#3b6dcc] focus:outline-none"
                              rows={2}
                              placeholder="이 단계에서 AI가 집중할 방향이나 제약조건"
                              value={step.user_ai_guide || ''}
                              onChange={(e) => onUpdateField?.(i, { user_ai_guide: e.target.value })}
                              onClick={(e) => e.stopPropagation()}
                            />
                            {step.user_ai_guide?.trim() && (
                              <span className="text-[9px] text-[var(--text-tertiary)] mt-1 block">자동 저장됨</span>
                            )}
                          </>
                        ) : step.user_ai_guide?.trim() ? (
                          <p className="text-[12px] text-[var(--text-primary)] leading-relaxed">
                            {step.user_ai_guide}
                          </p>
                        ) : (
                          <p className="text-[11px] text-[var(--text-tertiary)] italic">미입력</p>
                        )}
                      </div>
                    )}

                    {/* === Human Decision (for human and both steps) === */}
                    {(step.actor === 'human' || step.actor === 'both') && (
                      <div>
                        <label
                          className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block"
                          style={{ color: ACTORS.human.text }}
                        >
                          <Scale size={10} className="inline mr-1" style={{ verticalAlign: '-1px' }} />
                          당신의 판단
                        </label>

                        {/* Judgment question */}
                        {step.judgment?.trim() && (
                          <p className="text-[12px] text-[var(--text-primary)] mb-2 leading-relaxed bg-white/50 rounded-md px-3 py-2 border border-[var(--border-subtle)]">
                            {step.judgment}
                          </p>
                        )}

                        {editable ? (
                          <>
                            {/* Extracted option chips */}
                            {options.length > 0 && (
                              <div className="mb-2">
                                <span className="text-[10px] text-[var(--text-secondary)] block mb-1.5">선택하세요</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {options.map((opt, j) => (
                                    <button
                                      key={j}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onUpdateField?.(i, { user_decision: opt });
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border-2 cursor-pointer transition-all ${
                                        step.user_decision === opt
                                          ? 'border-[#8b6914] bg-[var(--human)] text-[#8b6914] shadow-sm'
                                          : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[#8b6914] hover:text-[#8b6914] hover:bg-amber-50/50'
                                      }`}
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Free text input */}
                            <textarea
                              className="w-full text-[12px] p-2.5 rounded-md border border-[var(--border-subtle)] bg-white/80 resize-none leading-relaxed placeholder:text-[var(--text-tertiary)] focus:border-[#8b6914] focus:outline-none"
                              rows={2}
                              placeholder={options.length > 0 ? '또는 직접 입력' : '결정 사항을 입력하세요'}
                              value={step.user_decision || ''}
                              onChange={(e) => onUpdateField?.(i, { user_decision: e.target.value })}
                              onClick={(e) => e.stopPropagation()}
                            />
                            {step.user_decision?.trim() && (
                              <span className="text-[9px] text-[var(--text-tertiary)] mt-1 block">자동 저장됨</span>
                            )}
                          </>
                        ) : step.user_decision?.trim() ? (
                          <div className="flex items-start gap-2 bg-[var(--human)] rounded-md px-3 py-2">
                            <span className="text-[10px] font-bold shrink-0 mt-0.5" style={{ color: ACTORS.human.text }}>
                              결정:
                            </span>
                            <p className="text-[12px] text-[var(--text-primary)] leading-relaxed font-medium">
                              {step.user_decision}
                            </p>
                          </div>
                        ) : (
                          <p className="text-[11px] text-[var(--text-tertiary)] italic">미결정</p>
                        )}
                      </div>
                    )}

                    {/* Actor reasoning (reference info) */}
                    {step.actor_reasoning?.trim() && (
                      <p className="text-[11px] text-[var(--text-secondary)] italic leading-relaxed pt-1 border-t border-[var(--border-subtle)]">
                        {step.actor_reasoning}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ── Edit controls ── */}
              {editable && (
                <div
                  className="flex flex-wrap items-center gap-1.5 px-3 sm:px-4 py-2"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.5)',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <span className="text-[10px] text-[var(--text-tertiary)] mr-1 font-semibold">
                    담당
                  </span>
                  {(['ai', 'human', 'both'] as const).map((actor) => {
                    const c = ACTORS[actor];
                    const active = step.actor === actor;
                    return (
                      <button
                        key={actor}
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateActor?.(i, actor);
                        }}
                        className="px-2.5 py-1 rounded text-[10px] font-semibold border cursor-pointer transition-colors"
                        style={
                          active
                            ? { borderColor: c.color, backgroundColor: c.bg, color: c.text }
                            : { borderColor: 'var(--border)', color: 'var(--text-tertiary)' }
                        }
                      >
                        {c.label}
                      </button>
                    );
                  })}
                  <span className="flex-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCheckpoint?.(i);
                    }}
                    className={`px-2.5 py-1 rounded text-[10px] font-semibold border cursor-pointer transition-colors hidden sm:inline-flex ${
                      step.checkpoint
                        ? 'border-amber-400 bg-amber-50 text-amber-700'
                        : 'border-[var(--border)] text-[var(--text-tertiary)]'
                    }`}
                  >
                    체크포인트
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveStep?.(i);
                    }}
                    className="px-2.5 py-1 rounded text-[10px] font-semibold border border-[var(--border)] text-red-400 cursor-pointer hover:bg-red-50"
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

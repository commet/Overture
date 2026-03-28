'use client';

import { useState, useEffect, useRef } from 'react';
import type { RecastStep as StepType, RecastAnalysis, ActorRelationship } from '@/stores/types';
import { Bot, Brain, Handshake, ArrowRight, Flag, Clock, Package, Zap, Trash2 } from 'lucide-react';

interface WorkflowGraphProps {
  steps: StepType[];
  analysis: RecastAnalysis | null;
  editable?: boolean;
  onUpdateActor?: (index: number, actor: ActorRelationship) => void;
  onToggleCheckpoint?: (index: number) => void;
  onRemoveStep?: (index: number) => void;
  onUpdateField?: (index: number, updates: Partial<StepType>) => void;
}

const ACTORS: Record<string, { label: string; color: string; bg: string; text: string; Icon: typeof Bot }> = {
  ai: { label: 'AI', color: '#3b6dcc', bg: '#eaeff8', text: '#2d4a7c', Icon: Bot },
  human: { label: '사람', color: '#b8860b', bg: '#fef4e4', text: '#8b6914', Icon: Brain },
  both: { label: '협업', color: '#2d6b2d', bg: '#eaf5ea', text: '#2d6b2d', Icon: Handshake },
  'human→ai': { label: '사람→AI', color: '#6b4fa0', bg: '#f3eef9', text: '#5a3d8a', Icon: ArrowRight },
  'ai→human': { label: 'AI→사람', color: '#2d6b6b', bg: '#eaf5f5', text: '#1e5050', Icon: ArrowRight },
};

/** Strip Korean particles from end of option text */
function stripParticles(text: string): string {
  return text
    .replace(/\s*(중에서|사이에서|으로|를|을|에서|로|이|가|은|는|와|과|도|만)\s*.*$/, '')
    .replace(/\s*(결정|선택|판단|비교|검토).*$/, '')
    .trim();
}

/** Extract selectable options from judgment text */
function extractOptions(judgment?: string): string[] {
  if (!judgment) return [];

  // Strategy 1: "vs" separated
  if (judgment.includes(' vs ')) {
    const sentences = judgment.split(/[.]\s*/);
    for (const sentence of sentences) {
      if (!sentence.includes(' vs ')) continue;
      const cleaned = sentence.replace(/^[^:]*:\s*/, '');
      const opts = cleaned
        .split(/\s+vs\.?\s+/)
        .map(o => stripParticles(o))
        .filter(o => o.length >= 2 && o.length <= 40);
      if (opts.length >= 2) return opts;
    }
  }

  // Strategy 2: "/" separated (but not dates like 2024/2025)
  if (judgment.includes('/') && !/\d{4}\/\d/.test(judgment)) {
    const clauses = judgment.split(/[,.]\s*/);
    for (const clause of clauses) {
      if (!clause.includes('/')) continue;
      const opts = clause.split('/').map(o => o.trim()).filter(o => o.length >= 2 && o.length <= 40);
      if (opts.length >= 2 && opts.length <= 5) return opts;
    }
  }

  // Strategy 3: "~할지 ~할지" pattern (Korean decision phrasing)
  const haljiMatch = judgment.match(/(.{2,20})할지[,\s]+(.{2,20})할지/);
  if (haljiMatch) {
    return [haljiMatch[1].trim() + '하기', haljiMatch[2].trim() + '하기'];
  }

  // Strategy 4: "~인지 ~인지" pattern
  const injiMatch = judgment.match(/(.{2,20})인지[,\s]+(.{2,20})인지/);
  if (injiMatch) {
    return [injiMatch[1].trim(), injiMatch[2].trim()];
  }

  // Strategy 5: numbered list "1) A 2) B" or "1. A 2. B"
  const numbered = judgment.match(/[1-5][.)]\s*([^1-5]{2,30})/g);
  if (numbered && numbered.length >= 2) {
    return numbered.map(n => n.replace(/^[1-5][.)]\s*/, '').trim()).filter(o => o.length >= 2);
  }

  return [];
}

/* ────────────────────────────────────
   Role Distribution Dashboard
   ──────────────────────────────────── */

function RoleDashboard({ steps, checkpoints, totalTime }: { steps: StepType[]; checkpoints?: number; totalTime?: string }) {
  const total = steps.length || 1;
  const counts: Record<string, number> = { ai: 0, human: 0, both: 0, 'human→ai': 0, 'ai→human': 0 };
  steps.forEach(s => { counts[s.actor] = (counts[s.actor] || 0) + 1; });
  const collaborativeCnt = counts.both + counts['human→ai'] + counts['ai→human'];
  const humanPct = Math.round(((counts.human + collaborativeCnt) / total) * 100);

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
        {counts['ai→human'] > 0 && (
          <div
            className="transition-all duration-500 flex items-center justify-center gap-1"
            style={{ width: `${(counts['ai→human'] / total) * 100}%`, backgroundColor: ACTORS['ai→human'].color }}
          >
            AI→사람 {counts['ai→human']}
          </div>
        )}
        {counts['human→ai'] > 0 && (
          <div
            className="transition-all duration-500 flex items-center justify-center gap-1"
            style={{ width: `${(counts['human→ai'] / total) * 100}%`, backgroundColor: ACTORS['human→ai'].color }}
          >
            사람→AI {counts['human→ai']}
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
            <span className="text-amber-700 font-semibold"><Flag size={10} className="inline mr-0.5" />체크포인트 {checkpoints} <span className="font-normal text-[var(--text-secondary)]">(사람 확인 필수)</span></span>
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
  current: ActorRelationship;
  onChange: (actor: ActorRelationship) => void;
}) {
  const options: ActorRelationship[] = ['ai', 'ai→human', 'human→ai', 'human'];
  // Legacy 'both' → highlight 'human→ai' as closest match
  const effectiveCurrent = current === 'both' ? 'human→ai' : current;
  return (
    <div className="inline-flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)]/80 p-0.5">
      {options.map((actor) => {
        const a = ACTORS[actor];
        const active = effectiveCurrent === actor;
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
  const rawCritical = new Set(analysis?.critical_path || []);
  // If more than half the steps are "critical", it's meaningless — suppress
  const criticalSet = rawCritical.size > Math.ceil(steps.length / 2) ? new Set<number>() : rawCritical;
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
              : '';                               // full width (collaboration / directional)

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
                          <span title="이 단계는 반드시 사람이 확인해야 합니다"><Flag size={10} className="text-amber-600" /></span>
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
                          <p className="text-[12px] text-[var(--text-primary)] mt-1.5 flex items-start gap-1.5">
                            <Package size={11} className="shrink-0 mt-0.5 text-[var(--text-secondary)]" />
                            {step.expected_output}
                          </p>
                        )}

                        {/* AI/Human scope for "both" steps */}
                        {step.actor === 'both' && (step.ai_scope || step.human_scope) && (
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {step.ai_scope && (
                              <div className="flex items-start gap-1.5 text-[11px] px-2 py-1.5 rounded-md bg-[#3b6dcc]/5">
                                <span className="font-bold text-[#2d4a7c] shrink-0">AI:</span>
                                <span className="text-[var(--text-secondary)]">{step.ai_scope}</span>
                              </div>
                            )}
                            {step.human_scope && (
                              <div className="flex items-start gap-1.5 text-[11px] px-2 py-1.5 rounded-md bg-[#8b6914]/5">
                                <span className="font-bold text-[#8b6914] shrink-0">사람:</span>
                                <span className="text-[var(--text-secondary)]">{step.human_scope}</span>
                              </div>
                            )}
                          </div>
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
                          <p className="text-[11px] text-[var(--text-secondary)] mt-2">
                            {step.actor === 'ai' ? 'AI 방향 설정 ↓' : step.actor === 'human' ? '판단 입력 ↓' : '방향 설정 & 판단 ↓'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ── Expanded: inputs + details ── */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] animate-fade-in space-y-3">
                        {/* Actor reasoning */}
                        {step.actor_reasoning && (
                          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed italic">
                            {step.actor_reasoning}
                          </p>
                        )}

                        {/* AI + Human inputs — side-by-side for "both" */}
                        {editable && step.actor === 'both' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* AI column */}
                            <div className="rounded-lg p-3" style={{ backgroundColor: `${ACTORS.ai.color}06` }}>
                              <div className="flex items-center gap-1.5 mb-2.5">
                                <Bot size={12} style={{ color: ACTORS.ai.text }} />
                                <p className="text-[12px] font-semibold text-[#2d4a7c]">AI 실행 방향</p>
                              </div>
                              {step.ai_direction_options && step.ai_direction_options.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  {step.ai_direction_options.map((opt, j) => (
                                    <button
                                      key={j}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const current = step.user_ai_guide || '';
                                        const isSelected = current.includes(opt);
                                        const next = isSelected
                                          ? current.split(', ').filter(s => s !== opt).join(', ')
                                          : current ? `${current}, ${opt}` : opt;
                                        onUpdateField?.(i, { user_ai_guide: next });
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border cursor-pointer transition-all ${
                                        (step.user_ai_guide || '').includes(opt)
                                          ? 'border-[#3b6dcc] bg-[#3b6dcc]/10 text-[#2d4a7c]'
                                          : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[#3b6dcc]/50'
                                      }`}
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              )}
                              <input
                                type="text"
                                value={step.user_ai_guide || ''}
                                onChange={(e) => onUpdateField?.(i, { user_ai_guide: e.target.value })}
                                placeholder={step.ai_direction_options?.length ? '또는 직접 입력...' : '예: 국내 시장 중심으로'}
                                className="w-full text-[12px] px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] placeholder:text-[var(--text-tertiary)] focus:border-[#3b6dcc] focus:outline-none"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            {/* Human column */}
                            <div className="rounded-lg p-3" style={{ backgroundColor: `${ACTORS.human.color}06` }}>
                              <div className="flex items-center gap-1.5 mb-2.5">
                                <Brain size={12} style={{ color: ACTORS.human.text }} />
                                <p className="text-[12px] font-semibold text-[#8b6914]">사람이 결정할 것</p>
                              </div>
                              {/* Show judgment only when no pills extracted (otherwise redundant) */}
                              {step.judgment?.trim() && options.length === 0 && (
                                <p className="text-[12px] text-[var(--text-primary)] mb-2 leading-relaxed bg-[var(--bg)] rounded-lg px-3 py-2">
                                  {step.judgment.replace(/[:：]\s*$/, '')}
                                </p>
                              )}
                              {options.length > 0 ? (
                                <div className="space-y-2">
                                  <div className="flex flex-wrap gap-1.5">
                                    {options.map((opt, j) => (
                                      <button
                                        key={j}
                                        onClick={(e) => { e.stopPropagation(); onUpdateField?.(i, { user_decision: opt }); }}
                                        className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border cursor-pointer transition-all ${
                                          step.user_decision === opt
                                            ? 'border-[#8b6914] bg-[#8b6914] text-white'
                                            : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[#8b6914] hover:text-[#8b6914]'
                                        }`}
                                      >
                                        {opt}
                                      </button>
                                    ))}
                                  </div>
                                  <input
                                    type="text"
                                    value={options.includes(step.user_decision || '') ? '' : (step.user_decision || '')}
                                    onChange={(e) => onUpdateField?.(i, { user_decision: e.target.value })}
                                    placeholder="또는 직접 입력..."
                                    className="w-full text-[12px] px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] placeholder:text-[var(--text-tertiary)] focus:border-[#8b6914] focus:outline-none"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              ) : (
                                <textarea
                                  value={step.user_decision || ''}
                                  onChange={(e) => onUpdateField?.(i, { user_decision: e.target.value })}
                                  placeholder="이 단계에서의 판단을 입력하세요..."
                                  rows={2}
                                  className="w-full text-[12px] px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] placeholder:text-[var(--text-tertiary)] focus:border-[#8b6914] focus:outline-none resize-none"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* AI guide input (ai-only steps) */}
                            {editable && step.actor === 'ai' && (
                              <div>
                                <p className="text-[12px] font-semibold text-[#2d4a7c] mb-1.5">AI 실행 방향</p>
                                {step.ai_direction_options && step.ai_direction_options.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mb-2">
                                    {step.ai_direction_options.map((opt, j) => (
                                      <button
                                        key={j}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const current = step.user_ai_guide || '';
                                          const isSelected = current.includes(opt);
                                          const next = isSelected
                                            ? current.split(', ').filter(s => s !== opt).join(', ')
                                            : current ? `${current}, ${opt}` : opt;
                                          onUpdateField?.(i, { user_ai_guide: next });
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border cursor-pointer transition-all ${
                                          (step.user_ai_guide || '').includes(opt)
                                            ? 'border-[#3b6dcc] bg-[#3b6dcc]/10 text-[#2d4a7c]'
                                            : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[#3b6dcc]/50'
                                        }`}
                                      >
                                        {opt}
                                      </button>
                                    ))}
                                  </div>
                                )}
                                <input
                                  type="text"
                                  value={step.user_ai_guide || ''}
                                  onChange={(e) => onUpdateField?.(i, { user_ai_guide: e.target.value })}
                                  placeholder={step.ai_direction_options?.length ? '또는 직접 입력...' : '예: 국내 시장 중심으로, 최근 3년 데이터 기준으로'}
                                  className="w-full text-[12px] px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] placeholder:text-[var(--text-tertiary)] focus:border-[#3b6dcc] focus:outline-none"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            )}

                            {/* Human judgment + decision (human-only steps) */}
                            {editable && step.actor === 'human' && (
                              <div>
                                <p className="text-[12px] font-semibold text-[#8b6914] mb-1.5">여기서 결정할 것</p>
                                {step.judgment?.trim() && options.length === 0 && (
                                  <p className="text-[12px] text-[var(--text-primary)] mb-2 leading-relaxed bg-[var(--bg)] rounded-lg px-3 py-2">
                                    {step.judgment.replace(/[:：]\s*$/, '')}
                                  </p>
                                )}
                                {options.length > 0 ? (
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap gap-1.5">
                                      {options.map((opt, j) => (
                                        <button
                                          key={j}
                                          onClick={(e) => { e.stopPropagation(); onUpdateField?.(i, { user_decision: opt }); }}
                                          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border cursor-pointer transition-all ${
                                            step.user_decision === opt
                                              ? 'border-[#8b6914] bg-[#8b6914] text-white'
                                              : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[#8b6914] hover:text-[#8b6914]'
                                          }`}
                                        >
                                          {opt}
                                        </button>
                                      ))}
                                    </div>
                                    <input
                                      type="text"
                                      value={options.includes(step.user_decision || '') ? '' : (step.user_decision || '')}
                                      onChange={(e) => onUpdateField?.(i, { user_decision: e.target.value })}
                                      placeholder="또는 직접 입력..."
                                      className="w-full text-[12px] px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] placeholder:text-[var(--text-tertiary)] focus:border-[#8b6914] focus:outline-none"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                ) : (
                                  <textarea
                                    value={step.user_decision || ''}
                                    onChange={(e) => onUpdateField?.(i, { user_decision: e.target.value })}
                                    placeholder="이 단계에서의 판단을 입력하세요..."
                                    rows={2}
                                    className="w-full text-[12px] px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] placeholder:text-[var(--text-tertiary)] focus:border-[#8b6914] focus:outline-none resize-none"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                )}
                              </div>
                            )}
                          </>
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
                        {/* Checkpoint reason — inline warning */}
                        {step.checkpoint && step.checkpoint_reason && (
                          <div className="flex items-start gap-2 text-[11px] bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            <Flag size={11} className="text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-amber-700"><span className="font-bold">넘어가기 전 확인:</span> {step.checkpoint_reason}</p>
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
                        <Flag size={10} className="inline mr-1" /> {step.checkpoint ? '확인 필수 해제' : '확인 필수로 설정'}
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

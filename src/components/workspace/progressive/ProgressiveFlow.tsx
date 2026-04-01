'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProgressiveStore } from '@/stores/useProgressiveStore';
import {
  runDeepening,
  runMix,
  runDMFeedback,
  runFinalDeliverable,
} from '@/lib/progressive-engine';
import { track } from '@/lib/analytics';
import type { FlowQuestion, FlowAnswer, AnalysisSnapshot, DMConcern, MixResult } from '@/stores/types';
import { ChevronRight, Loader2, Check, AlertTriangle, Sparkles, Copy, CheckCheck, UserCheck, ArrowRight } from 'lucide-react';

/* ═══ Design tokens ═══ */
const EASE = [0.32, 0.72, 0, 1] as const;
const SPRING = { type: 'spring' as const, stiffness: 400, damping: 30 };

/* Phase-aware ambient glow — the page itself tells you where you are */
function PhaseAmbient({ phase }: { phase: string }) {
  const bg = phase === 'complete'
    ? 'radial-gradient(ellipse 80% 50% at 50% 20%, rgba(184,150,62,0.08) 0%, transparent 70%)'
    : phase === 'dm_feedback' || phase === 'refining' || phase === 'mixing'
      ? 'radial-gradient(ellipse 80% 50% at 50% 20%, rgba(184,150,62,0.04) 0%, transparent 70%)'
      : 'none';
  return <motion.div className="fixed inset-0 pointer-events-none z-0" animate={{ background: bg }} transition={{ duration: 1.5, ease: EASE }} />;
}

function getParticle(name: string): string {
  const c = name.charCodeAt(name.length - 1);
  if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0 ? '은' : '는';
  return '는';
}

/* ═══ Progress line ═══ */
const PHASES = ['문제 파악', '설계', '검증', '완성'] as const;

function phaseIdx(phase: string, round: number, hasMix: boolean): number {
  if (phase === 'complete') return 4;
  if (phase === 'dm_feedback' || phase === 'refining') return 3;
  if (phase === 'mixing' || (phase === 'conversing' && hasMix)) return 2;
  if (round >= 2 || (phase === 'analyzing' && round >= 2)) return 1;
  return 0;
}

function ProgressLine({ phase, round, hasMix }: { phase: string; round: number; hasMix: boolean }) {
  const idx = phaseIdx(phase, round, hasMix);
  const pct = Math.min((idx / 4) * 100, 100);
  return (
    <div className="mb-12">
      <div className="relative h-[2px] rounded-full bg-[var(--border-subtle)] overflow-hidden">
        <motion.div className="absolute inset-y-0 left-0 rounded-full" style={{ background: 'var(--gradient-gold)' }}
          animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: EASE }} />
      </div>
      <div className="flex justify-between mt-2.5 px-1">
        {PHASES.map((label, i) => {
          const done = i < idx; const active = i === idx && phase !== 'complete'; const final_ = phase === 'complete' && i === 3;
          return <span key={label} className={`text-[10px] tracking-wide font-medium transition-all duration-700 ${
            done || final_ ? 'text-[var(--accent)]' : active ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
          }`} style={{ transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}>{done || final_ ? '✓ ' : ''}{label}</span>;
        })}
      </div>
    </div>
  );
}

/* ═══ Diff helpers — compare snapshots ═══ */

function diffItems(prev: string[], curr: string[]): Array<{ text: string; status: 'new' | 'same' | 'removed' }> {
  const prevSet = new Set(prev);
  const currSet = new Set(curr);
  const result: Array<{ text: string; status: 'new' | 'same' | 'removed' }> = [];
  // Removed items first (brief flash)
  for (const item of prev) {
    if (!currSet.has(item)) result.push({ text: item, status: 'removed' });
  }
  // Current items
  for (const item of curr) {
    result.push({ text: item, status: prevSet.has(item) ? 'same' : 'new' });
  }
  return result;
}

/* ═══ THE LIVING ANALYSIS — ONE card that morphs in place, with visible diffs ═══ */

function LiveAnalysis({ snapshot, prevSnapshot, isActive }: {
  snapshot: AnalysisSnapshot;
  prevSnapshot: AnalysisSnapshot | null;
  isActive: boolean;
}) {
  const hasChanges = prevSnapshot && snapshot.version > 0;
  const questionChanged = hasChanges && prevSnapshot.real_question !== snapshot.real_question;

  // Compute diffs
  const skeletonDiff = hasChanges
    ? diffItems(prevSnapshot.skeleton, snapshot.skeleton)
    : snapshot.skeleton.map(s => ({ text: s, status: 'same' as const }));
  const assumptionDiff = hasChanges
    ? diffItems(prevSnapshot.hidden_assumptions, snapshot.hidden_assumptions)
    : snapshot.hidden_assumptions.map(a => ({ text: a, status: 'same' as const }));

  const newCount = skeletonDiff.filter(d => d.status === 'new').length + assumptionDiff.filter(d => d.status === 'new').length;
  const removedCount = skeletonDiff.filter(d => d.status === 'removed').length + assumptionDiff.filter(d => d.status === 'removed').length;

  return (
    <motion.div layout className="rounded-[1.75rem]"
      style={{ transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}>
      <div className={`rounded-[1.75rem] p-[1px] ${isActive ? 'bg-gradient-to-b from-[var(--accent)]/20 to-[var(--accent)]/5' : 'bg-[var(--border-subtle)]'}`}>
        <div className="rounded-[calc(1.75rem-1px)] bg-[var(--surface)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
          {isActive && <div className="h-[2px]" style={{ background: 'var(--gradient-gold)' }} />}
          <div className="p-7 md:p-9 space-y-6">
            {/* Eyebrow + change summary */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-[0.2em] rounded-full bg-[var(--accent)]/8 px-3 py-1">진짜 질문</span>
              {snapshot.version > 0 && <span className="text-[9px] text-[var(--text-tertiary)] bg-[var(--bg)] px-2 py-0.5 rounded-full">v{snapshot.version + 1}</span>}
              {hasChanges && (newCount > 0 || removedCount > 0) && (
                <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                  {newCount > 0 && `+${newCount} 추가`}{newCount > 0 && removedCount > 0 && ' · '}{removedCount > 0 && `−${removedCount} 제거`}
                </span>
              )}
            </div>

            {/* Real question — shows change if updated */}
            <div>
              {questionChanged && (
                <motion.p initial={{ opacity: 0.6 }} animate={{ opacity: 0 }} transition={{ duration: 2, ease: EASE }}
                  className="text-[14px] text-[var(--text-tertiary)] line-through mb-2 leading-relaxed"
                  style={{ fontFamily: 'var(--font-display)' }}>
                  {prevSnapshot.real_question}
                </motion.p>
              )}
              <AnimatePresence mode="wait">
                <motion.h2 key={snapshot.real_question} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="text-[20px] md:text-[26px] font-bold text-[var(--text-primary)] leading-[1.3] tracking-tight"
                  style={{ fontFamily: 'var(--font-display)' }}>
                  {snapshot.real_question}
                </motion.h2>
              </AnimatePresence>
            </div>

            {/* Insight badge */}
            <AnimatePresence>
              {snapshot.insight && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.4, ease: EASE }} className="overflow-hidden">
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-[var(--accent)]/[0.04] border border-[var(--accent)]/8">
                    <Sparkles size={13} className="text-[var(--accent)] mt-0.5 shrink-0" />
                    <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{snapshot.insight}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Two-column: Assumptions | Skeleton — with diff indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {assumptionDiff.filter(d => d.status !== 'removed').length > 0 && (
                <div>
                  <p className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-3">숨겨진 전제</p>
                  <div className="space-y-2.5">
                    <AnimatePresence>
                      {assumptionDiff.filter(d => d.status === 'removed').map((d, i) => (
                        <motion.div key={`removed-a-${i}`} initial={{ opacity: 0.5 }} animate={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.8, ease: EASE }}
                          className="flex items-start gap-2.5 text-[13px] text-red-300 line-through leading-relaxed overflow-hidden">
                          <span className="w-[18px] h-[18px] rounded-full bg-red-50 text-red-300 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">−</span>
                          <span>{d.text}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {assumptionDiff.filter(d => d.status !== 'removed').map((d, i) => (
                      <motion.div key={`${snapshot.version}-a${i}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08, duration: 0.4, ease: EASE }}
                        className={`flex items-start gap-2.5 text-[13px] leading-relaxed rounded-lg px-2 py-1 -mx-2 transition-colors duration-1000 ${
                          d.status === 'new' ? 'bg-emerald-50/60 text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                        }`}>
                        <span className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5 ${
                          d.status === 'new' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-50 text-red-400'
                        }`}>{d.status === 'new' ? '+' : '?'}</span>
                        <span>{d.text}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-3">뼈대</p>
                <div className="space-y-2.5">
                  <AnimatePresence>
                    {skeletonDiff.filter(d => d.status === 'removed').map((d, i) => (
                      <motion.div key={`removed-s-${i}`} initial={{ opacity: 0.5 }} animate={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.8, ease: EASE }}
                        className="flex items-start gap-2.5 text-[13px] text-red-300 line-through leading-relaxed overflow-hidden">
                        <span className="text-red-300 font-mono text-[10px] w-4 text-right shrink-0 mt-1">−</span>
                        <span>{d.text}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {skeletonDiff.filter(d => d.status !== 'removed').map((d, i) => (
                    <motion.div key={`${snapshot.version}-s${i}`} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.4, ease: EASE }}
                      className={`flex items-start gap-2.5 text-[13px] leading-relaxed rounded-lg px-2 py-1 -mx-2 transition-colors duration-1000 ${
                        d.status === 'new' ? 'bg-emerald-50/60 text-[var(--text-primary)] font-medium' : 'text-[var(--text-primary)]'
                      }`}>
                      <span className={`font-mono text-[10px] w-4 text-right shrink-0 mt-1 ${
                        d.status === 'new' ? 'text-emerald-500' : 'text-[var(--accent)]/60'
                      }`}>{d.status === 'new' ? '+' : `${i + 1}`}</span>
                      <span>{d.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Execution plan */}
            <AnimatePresence>
              {snapshot.execution_plan && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.5, ease: EASE }} className="overflow-hidden">
                  <div className="pt-5 border-t border-[var(--border-subtle)]">
                    <p className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-3">실행 계획</p>
                    <div className="space-y-2.5">
                      {snapshot.execution_plan.steps.map((step, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08, duration: 0.4, ease: EASE }} className="flex items-start gap-3 text-[13px]">
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            step.who === 'ai' ? 'bg-blue-50 text-blue-600' : step.who === 'human' ? 'bg-amber-50 text-amber-600' : 'bg-purple-50 text-purple-600'
                          }`}>{step.who === 'ai' ? 'AI' : step.who === 'human' ? '직접' : '협업'}</span>
                          <span className="leading-relaxed"><span className="text-[var(--text-primary)]">{step.task}</span><span className="text-[var(--text-tertiary)]"> → {step.output}</span></span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══ Version pills ═══ */
function VersionPills({ snapshots, current }: { snapshots: AnalysisSnapshot[]; current: number }) {
  if (snapshots.length <= 1) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {snapshots.map((_, i) => (
        <span key={i} className={`text-[10px] px-2.5 py-1 rounded-full ${
          i === current ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-semibold' : 'bg-[var(--bg)] text-[var(--text-tertiary)]'
        }`}>v{i + 1}{i < current ? ' ✓' : ''}</span>
      ))}
    </div>
  );
}

/* ═══ Answered Q&A — horizontal pills ═══ */
function AnsweredPills({ qaPairs }: { qaPairs: Array<{ question: FlowQuestion; answer: FlowAnswer | null }> }) {
  const answered = qaPairs.filter(qa => qa.answer);
  if (!answered.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {answered.map((qa, i) => (
        <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05, ...SPRING }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border-subtle)] text-[11px]">
          <Check size={10} className="text-[var(--accent)]" />
          <span className="text-[var(--text-tertiary)] max-w-[80px] truncate">{qa.question.text.split(' ').slice(0, 3).join(' ')}</span>
          <span className="text-[var(--text-primary)] font-medium max-w-[100px] truncate">{qa.answer!.value}</span>
        </motion.div>
      ))}
    </div>
  );
}

/* ═══ Question Card ═══ */
function QuestionCard({ question, onAnswer, disabled }: { question: FlowQuestion; onAnswer: (v: string) => void; disabled: boolean }) {
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const go = (v: string) => { if (disabled || submitted) return; setSelected(v); setSubmitted(true); onAnswer(v); };
  const goText = () => { if (!input.trim() || disabled || submitted) return; setSubmitted(true); onAnswer(input.trim()); };

  return (
    <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, ease: EASE }}
      className="rounded-[1.5rem] bg-[var(--accent)]/[0.02] border border-[var(--accent)]/10 p-6 md:p-8">
      <div className="flex items-start gap-3.5 mb-6">
        <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
          <ArrowRight size={14} className="text-[var(--accent)]" />
        </div>
        <div className="pt-1">
          <p className="text-[16px] md:text-[18px] font-semibold text-[var(--text-primary)] leading-snug tracking-tight">{question.text}</p>
          {question.subtext && <p className="mt-2 text-[12px] text-[var(--text-tertiary)] leading-relaxed">{question.subtext}</p>}
        </div>
      </div>

      {question.options?.length ? (
        <div className="space-y-2.5">
          {question.options.map((opt, i) => (
            <motion.button key={i} onClick={() => go(opt)} disabled={disabled || submitted} whileTap={{ scale: 0.98 }}
              className={`w-full text-left px-5 py-4 rounded-2xl text-[14px] leading-relaxed border cursor-pointer ${
                selected === opt ? 'border-[var(--accent)] bg-[var(--accent)]/8 text-[var(--text-primary)] font-medium' :
                submitted ? 'border-[var(--border-subtle)] text-[var(--text-tertiary)] opacity-30' :
                'border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40'
              }`} style={{ transitionProperty: 'all', transitionDuration: '400ms', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}>{opt}</motion.button>
          ))}
          <div className="flex gap-2 pt-1">
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="또는 직접 입력..." disabled={disabled || submitted}
              className="flex-1 px-4 py-3 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]/30 disabled:opacity-30"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); goText(); } }} />
            {input.trim() && <motion.button onClick={goText} disabled={disabled || submitted} whileTap={{ scale: 0.95 }}
              className="shrink-0 px-5 py-3 text-white rounded-2xl text-[13px] font-semibold cursor-pointer disabled:opacity-30"
              style={{ background: 'var(--gradient-gold)' }}>확인</motion.button>}
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="입력..." autoFocus disabled={disabled || submitted}
            className="flex-1 px-5 py-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]/30 disabled:opacity-30"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); goText(); } }} />
          <motion.button onClick={goText} disabled={disabled || !input.trim() || submitted} whileTap={{ scale: 0.95 }}
            className="shrink-0 px-6 py-4 text-white rounded-2xl text-[14px] font-semibold shadow-[var(--shadow-sm)] cursor-pointer disabled:opacity-30"
            style={{ background: 'var(--gradient-gold)' }}>확인</motion.button>
        </div>
      )}
    </motion.div>
  );
}

/* ═══ Mix Preview ═══ */
function MixPreview({ mix, dm, onDM, onSkip, busy }: { mix: MixResult; dm: string | null; onDM: () => void; onSkip: () => void; busy: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }}>
      <div className="rounded-2xl md:rounded-[2rem] p-[1px] bg-gradient-to-b from-[var(--accent)]/20 to-transparent">
        <div className="rounded-[calc(1rem-1px)] md:rounded-[calc(2rem-1px)] bg-[var(--surface)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
          <div className="h-[2px]" style={{ background: 'var(--gradient-gold)' }} />
          <div className="p-5 md:p-10 space-y-6">
            <span className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-[0.2em] rounded-full bg-[var(--accent)]/8 px-3 py-1">초안</span>
            <h2 className="text-[22px] md:text-[28px] font-bold text-[var(--text-primary)] leading-tight tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>{mix.title}</h2>
            <blockquote className="border-l-[3px] border-[var(--accent)]/20 pl-5 text-[15px] text-[var(--text-secondary)] italic leading-relaxed">{mix.executive_summary}</blockquote>

            <div className="space-y-5">
              {mix.sections.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08, duration: 0.5, ease: EASE }}>
                  <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-1.5">{s.heading}</h3>
                  <p className="text-[13px] text-[var(--text-secondary)] leading-[1.8]">{renderInline(s.content)}</p>
                </motion.div>
              ))}
            </div>

            {mix.next_steps.length > 0 && (
              <div className="pt-5 border-t border-[var(--border-subtle)]">
                <p className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-3">다음 단계</p>
                {mix.next_steps.map((s, i) => <div key={i} className="flex items-start gap-2.5 text-[13px] text-[var(--text-primary)] mb-2 leading-relaxed"><span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-2 shrink-0" /><span>{s}</span></div>)}
              </div>
            )}

            <div className="pt-6 border-t border-[var(--border-subtle)] space-y-3">
              <motion.button onClick={onDM} disabled={busy} whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2.5 px-6 py-4 text-white rounded-2xl text-[15px] font-semibold shadow-[var(--shadow-md)] cursor-pointer disabled:opacity-50"
                style={{ background: 'var(--gradient-gold)' }}>
                {busy ? <><Loader2 size={16} className="animate-spin" /> 시뮬레이션 중...</> : <><UserCheck size={16} /> {dm || '의사결정권자'}{getParticle(dm || '자')} 뭐라고 할까?</>}
              </motion.button>
              <button onClick={onSkip} disabled={busy} className="w-full text-center text-[12px] text-[var(--text-tertiary)] hover:text-[var(--accent)] py-1 cursor-pointer"
                style={{ transitionProperty: 'color', transitionDuration: '300ms', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}>건너뛰고 이대로 완성</button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══ DM Feedback ═══ */
function DMFeedback({ fb, onToggle, onFinalize, busy }: { fb: import('@/stores/types').DMFeedbackResult; onToggle: (i: number) => void; onFinalize: () => void; busy: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
      <div className="rounded-2xl md:rounded-[2rem] p-[1px] bg-[var(--border-subtle)]">
        <div className="rounded-[calc(1rem-1px)] md:rounded-[calc(2rem-1px)] bg-[var(--surface)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
          <div className="p-5 md:p-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--accent)]/8 flex items-center justify-center"><UserCheck size={18} className="text-[var(--accent)]" /></div>
              <div><p className="text-[15px] font-semibold text-[var(--text-primary)]">{fb.persona_name}</p><p className="text-[11px] text-[var(--text-tertiary)]">{fb.persona_role}</p></div>
            </div>
            <blockquote className="text-[16px] text-[var(--text-primary)] leading-relaxed italic pl-5 border-l-[3px] border-[var(--text-tertiary)]/15">&ldquo;{fb.first_reaction}&rdquo;</blockquote>

            {fb.good_parts.length > 0 && <div>
              <p className="text-[9px] font-bold text-green-600 uppercase tracking-[0.2em] mb-2">좋은 점</p>
              {fb.good_parts.map((g, i) => <p key={i} className="text-[13px] text-[var(--text-secondary)] flex items-start gap-2 mb-1.5 leading-relaxed"><span className="text-green-500 shrink-0 mt-0.5">&#10003;</span>{g}</p>)}
            </div>}

            {fb.concerns.length > 0 && <div>
              <p className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-3">우려 + 수정 제안</p>
              <div className="space-y-3">
                {fb.concerns.map((c: DMConcern, i: number) => (
                  <div key={i} className={`rounded-2xl border p-4 transition-all duration-500 ${c.applied ? 'border-[var(--accent)]/20 bg-[var(--accent)]/[0.02]' : 'border-[var(--border-subtle)] bg-[var(--bg)]'}`}
                    style={{ transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}>
                    <div>
                      <div className="flex items-start gap-2 mb-2">
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${c.severity === 'critical' ? 'bg-red-50 text-red-600' : c.severity === 'important' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                          {c.severity === 'critical' ? '필수' : c.severity === 'important' ? '권장' : '참고'}</span>
                        <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{c.text}</p>
                      </div>
                      <p className="text-[12px] text-[var(--accent)] leading-relaxed mb-3 pl-1">→ {c.fix_suggestion}</p>
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[10px] text-[var(--text-tertiary)]">{c.applied ? '반영' : '스킵'}</span>
                        <button onClick={() => onToggle(i)} className={`relative w-11 h-6 rounded-full cursor-pointer ${c.applied ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`}
                          style={{ transitionProperty: 'background', transitionDuration: '400ms', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}>
                          <motion.div className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm" animate={{ left: c.applied ? 24 : 4 }} transition={SPRING} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>}

            {fb.would_ask.length > 0 && <div>
              <p className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-2">이것도 물어볼 거다</p>
              {fb.would_ask.map((q, i) => <p key={i} className="text-[13px] text-[var(--text-secondary)] flex items-start gap-2 mb-1.5 leading-relaxed"><span className="text-[var(--accent)] shrink-0">?</span>{q}</p>)}
            </div>}

            <div className="pt-4 border-t border-[var(--border-subtle)]">
              <p className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-[0.2em] mb-1.5">통과 조건</p>
              <p className="text-[15px] text-[var(--text-primary)] font-medium leading-relaxed">{fb.approval_condition}</p>
            </div>

            <motion.button onClick={onFinalize} disabled={busy} whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 text-white rounded-2xl text-[14px] font-semibold shadow-[var(--shadow-sm)] cursor-pointer disabled:opacity-50"
              style={{ background: 'var(--gradient-gold)' }}>
              {busy ? <><Loader2 size={16} className="animate-spin" /> 최종본 작성 중...</> : <>반영하고 완성 <ChevronRight size={14} /></>}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══ Final deliverable — triumphant, widest ═══ */
function FinalCard({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard.writeText(content); setCopied(true); track('flow_copy', {}); setTimeout(() => setCopied(false), 2000); };
  return (
    <motion.div initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.9, ease: EASE }}>
      <div className="rounded-2xl md:rounded-[2rem] p-[2px] bg-gradient-to-b from-[var(--accent)]/30 via-[var(--accent)]/10 to-transparent shadow-[var(--shadow-xl)]">
        <div className="rounded-[calc(1rem-2px)] md:rounded-[calc(2rem-2px)] bg-[var(--surface)] shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]">
          <div className="h-[3px]" style={{ background: 'var(--gradient-gold)' }} />
          <div className="px-7 py-5 flex items-center justify-between border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-[var(--accent)]/10 flex items-center justify-center"><Check size={14} className="text-[var(--accent)]" /></div>
              <span className="text-[14px] font-semibold text-[var(--text-primary)]">최종 산출물</span>
            </div>
            <motion.button onClick={copy} whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-medium bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent)]/30 cursor-pointer">
              {copied ? <><CheckCheck size={12} /> 복사됨</> : <><Copy size={12} /> 복사</>}
            </motion.button>
          </div>
          <div className="p-5 md:p-10 space-y-1">{renderMd(content)}</div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══ Markdown ═══ */
function renderInline(text: string): React.ReactNode {
  const p = text.split(/(\*\*[^*]+\*\*)/g);
  if (p.length === 1) return text;
  return p.map((s, i) => s.startsWith('**') && s.endsWith('**') ? <strong key={i} className="font-semibold text-[var(--text-primary)]">{s.slice(2, -2)}</strong> : s);
}
function renderMd(c: string) {
  return c.split('\n').map((l, k) => {
    if (l.startsWith('# ')) return <h1 key={k} className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] mt-1 mb-4 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>{l.slice(2)}</h1>;
    if (l.startsWith('## ')) return <h2 key={k} className="text-[16px] font-bold text-[var(--text-primary)] mt-7 mb-2 tracking-tight">{l.slice(3)}</h2>;
    if (l.startsWith('> ')) return <blockquote key={k} className="border-l-[3px] border-[var(--accent)]/20 pl-5 py-1 text-[14px] text-[var(--text-secondary)] italic my-3 leading-relaxed">{renderInline(l.slice(2))}</blockquote>;
    if (l.startsWith('- ')) return <div key={k} className="flex items-start gap-2.5 text-[14px] text-[var(--text-primary)] ml-1 leading-[1.8]"><span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]/50 mt-2.5 shrink-0" /><span>{renderInline(l.slice(2))}</span></div>;
    if (l.startsWith('---')) return <hr key={k} className="border-[var(--border-subtle)] my-6" />;
    if (l.trim() === '') return <div key={k} className="h-3" />;
    return <p key={k} className="text-[14px] text-[var(--text-primary)] leading-[1.85]">{renderInline(l)}</p>;
  });
}

/* ═══ Loading ═══ */
function LoadingState({ text, steps }: { text: string; steps?: string[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => { if (!steps?.length) return; const t = setInterval(() => setIdx(p => (p + 1) % steps.length), 3000); return () => clearInterval(t); }, [steps]);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4 px-6 py-5 rounded-2xl bg-[var(--accent)]/[0.03] border border-[var(--accent)]/8">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}><Loader2 size={16} className="text-[var(--accent)]" /></motion.div>
      <AnimatePresence mode="wait">
        <motion.span key={idx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3, ease: EASE }}
          className="text-[13px] text-[var(--text-secondary)]">{steps?.length ? steps[idx] : text}</motion.span>
      </AnimatePresence>
    </motion.div>
  );
}

/* ═══ Mix Trigger ═══ */
function MixTrigger({ onMix, onMore, busy }: { onMix: () => void; onMore: () => void; busy: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="space-y-4 py-2">
      <p className="text-[12px] text-[var(--text-tertiary)] text-center tracking-wide">분석이 충분히 쌓였습니다</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <motion.button onClick={onMix} disabled={busy} whileTap={{ scale: 0.98 }}
          className="flex-1 flex items-center justify-center gap-2.5 px-6 py-4 text-white rounded-2xl text-[15px] font-semibold shadow-[var(--shadow-md)] cursor-pointer disabled:opacity-50"
          style={{ background: 'var(--gradient-gold)' }}>
          {busy ? <><Loader2 size={16} className="animate-spin" /> 조합 중...</> : <>초안 완성하기 <ChevronRight size={14} /></>}
        </motion.button>
        {!busy && <motion.button onClick={onMore} whileTap={{ scale: 0.98 }}
          className="px-6 py-4 rounded-2xl text-[14px] font-medium text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--accent)]/30 cursor-pointer"
          style={{ transitionProperty: 'border-color', transitionDuration: '400ms', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}>질문 하나 더</motion.button>}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════ */
/* ═══ MAIN                             ═══ */
/* ═══════════════════════════════════════════ */

export function ProgressiveFlow({ projectId }: { projectId: string }) {
  const store = useProgressiveStore();
  const session = store.currentSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMix, setShowMix] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scroll = useCallback(() => { setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 200); }, []);

  const phase = session?.phase ?? 'input';
  const snapshots = session?.snapshots ?? [];
  const questions = session?.questions ?? [];
  const answers = session?.answers ?? [];
  const mix = session?.mix ?? null;
  const dmFb = session?.dm_feedback ?? null;
  const final_ = session?.final_deliverable ?? null;
  const round = session?.round ?? 0;
  const maxR = session?.max_rounds ?? 3;
  const dm = session?.decision_maker ?? null;

  const qaPairs = useMemo(() => questions.map((q, i) => ({ question: q, answer: answers[i] || null })), [questions, answers]);
  const curQ = questions.length > answers.length ? questions[questions.length - 1] : null;
  const latest = snapshots[snapshots.length - 1] || null;
  const shouldMix = showMix || (phase === 'conversing' && snapshots.length > 0 && !curQ && !mix && !busy);

  if (!session) return null;

  /* Handlers */
  const onAnswer = async (value: string) => {
    if (!curQ || busy || !latest) return;
    const ans: FlowAnswer = { question_id: curQ.id, value };
    store.addAnswer(ans); store.setPhase('analyzing'); track('flow_answer', { round }); setBusy(true); setError(null); scroll();
    try {
      const qa = qaPairs.filter(q => q.answer).map(q => ({ question: q.question, answer: q.answer! }));
      qa.push({ question: curQ, answer: ans });
      if (!dm && round === 0) { const g = value.includes('대표') ? '대표님' : value.includes('팀장') ? '팀장님' : value.includes('투자') ? '투자자' : null; if (g) store.setDecisionMaker(g); }
      abortRef.current = new AbortController();
      setStreamingText('');
      const r = await runDeepening(session.problem_text, latest, qa, round, maxR, (text) => setStreamingText(text), abortRef.current.signal);
      setStreamingText(null);
      store.addSnapshot(r.snapshot); store.advanceRound();
      r.readyForMix || !r.question ? (setShowMix(true), store.setPhase('conversing')) : (store.addQuestion(r.question), store.setPhase('conversing'));
    } catch (e) { setStreamingText(null); setError(e instanceof Error ? e.message : '분석 실패'); store.setPhase('conversing'); }
    finally { setBusy(false); abortRef.current = null; scroll(); }
  };

  const onMix = async () => {
    setBusy(true); setError(null); store.setPhase('mixing'); scroll();
    try {
      const qa = qaPairs.filter(q => q.answer).map(q => ({ question: q.question, answer: q.answer! }));
      const m = await runMix(session!.problem_text, snapshots, qa, dm);
      store.setMix(m); setShowMix(false); track('flow_mix', { rounds: round });
    } catch (e) { setError(e instanceof Error ? e.message : '초안 생성 실패'); store.setPhase('conversing'); }
    finally { setBusy(false); scroll(); }
  };

  const onDM = async () => {
    if (!mix) return; setBusy(true); setError(null); scroll();
    try { const f = await runDMFeedback(mix, dm || '의사결정권자', session!.problem_text); store.setDMFeedback(f); }
    catch (e) { setError(e instanceof Error ? e.message : 'DM 피드백 실패'); }
    finally { setBusy(false); scroll(); }
  };

  const onMore = async () => {
    if (!latest) return; setShowMix(false); setBusy(true); store.setPhase('analyzing');
    try {
      const qa = qaPairs.filter(q => q.answer).map(q => ({ question: q.question, answer: q.answer! }));
      qa.push({ question: { id: 's', text: '더?', type: 'select', engine_phase: 'recast' }, answer: { question_id: 's', value: '한 가지 더 확인' } });
      abortRef.current = new AbortController();
      setStreamingText('');
      const r = await runDeepening(session!.problem_text, latest, qa, round, round + 2, (text) => setStreamingText(text), abortRef.current.signal);
      setStreamingText(null);
      r.question ? (store.addQuestion(r.question), store.setPhase('conversing')) : (setShowMix(true), store.setPhase('conversing'));
    } catch (e) { setStreamingText(null); setError(e instanceof Error ? e.message : '실패'); store.setPhase('conversing'); setShowMix(true); }
    finally { setBusy(false); abortRef.current = null; scroll(); }
  };

  const onSkip = () => {
    if (!mix) return;
    const md = [`# ${mix.title}`, '', `> ${mix.executive_summary}`, '', ...mix.sections.flatMap(s => [`## ${s.heading}`, '', s.content, '']),
      ...(mix.key_assumptions.length ? ['## 전제 조건', '', ...mix.key_assumptions.map(a => `- ${a}`), ''] : []),
      ...(mix.next_steps.length ? ['## 다음 단계', '', ...mix.next_steps.map(s => `- ${s}`), ''] : [])].join('\n');
    store.setFinalDeliverable(md); setError(null);
  };

  const onFinalize = async () => {
    if (!mix || !dmFb) return; setBusy(true); setError(null); scroll();
    try { const t = await runFinalDeliverable(mix, dmFb); store.setFinalDeliverable(t); track('flow_done', { project_id: projectId, rounds: round }); }
    catch (e) { setError(e instanceof Error ? e.message : '최종본 실패'); }
    finally { setBusy(false); scroll(); }
  };

  return (
    <>
      <PhaseAmbient phase={phase} />
      <motion.div className="relative z-10 mx-auto px-4 md:px-0"
        animate={{ maxWidth: phase === 'complete' ? '56rem' : (phase === 'mixing' || phase === 'dm_feedback' || phase === 'refining') ? '48rem' : '42rem' }}
        transition={{ duration: 0.8, ease: EASE }}>

        <ProgressLine phase={phase} round={round} hasMix={!!mix} />

        <div className="space-y-8">
          {/* User input — compact pill */}
          <motion.div layout className="flex items-center gap-3 px-5 py-3 rounded-full bg-[var(--bg)] border border-[var(--border-subtle)] w-fit max-w-full">
            <div className="w-5 h-5 rounded-full bg-[var(--text-primary)] flex items-center justify-center shrink-0">
              <span className="text-[var(--bg)] text-[9px] font-bold">나</span>
            </div>
            <p className="text-[13px] text-[var(--text-secondary)] truncate">{session.problem_text}</p>
          </motion.div>

          {/* Question FIRST — user action at the top, not buried below */}
          {curQ && !busy && phase === 'conversing' && <QuestionCard key={curQ.id} question={curQ} onAnswer={onAnswer} disabled={busy} />}
          {shouldMix && !busy && phase === 'conversing' && !curQ && <MixTrigger onMix={onMix} onMore={onMore} busy={busy} />}

          {/* Loading states */}
          {phase === 'analyzing' && snapshots.length === 0 && !streamingText && <LoadingState text="시작..." steps={['상황을 파악하고 있습니다...', '숨겨진 전제를 찾는 중...', '뼈대를 만들고 있습니다...', '거의 다 됐습니다...']} />}
          {phase === 'analyzing' && snapshots.length > 0 && !streamingText && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-3 py-4">
              <Loader2 size={16} className="animate-spin text-[var(--accent)]" />
              <span className="text-[13px] text-[var(--text-secondary)]">답변을 반영하는 중...</span>
            </motion.div>
          )}
          {streamingText !== null && phase === 'analyzing' && snapshots.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-3 py-4">
              <Loader2 size={16} className="animate-spin text-[var(--accent)]" />
              <span className="text-[13px] text-[var(--text-secondary)]">답변을 반영하는 중...</span>
            </motion.div>
          )}
          {phase === 'mixing' && <LoadingState text="조합 중..." steps={['분석을 종합하고 있습니다...', '문서를 구성하는 중...', '마무리 중...']} />}

          {/* Version indicator — shows what round we're on */}
          {snapshots.length > 1 && !final_ && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent)]/[0.04] border border-[var(--accent)]/10 w-fit">
              <Sparkles size={11} className="text-[var(--accent)]" />
              <span className="text-[11px] text-[var(--accent)] font-medium">{snapshots.length - 1}번째 개선 반영됨</span>
            </motion.div>
          )}

          {/* Living Analysis — the evolving draft with visible diffs */}
          {latest && !final_ && (
            <LiveAnalysis
              key={latest.version}
              snapshot={latest}
              prevSnapshot={snapshots.length > 1 ? snapshots[snapshots.length - 2] : null}
              isActive={!mix}
            />
          )}

          {/* Answered Q&A history — collapsed at bottom */}
          {!final_ && <AnsweredPills qaPairs={qaPairs} />}
          {mix && !dmFb && !final_ && phase !== 'mixing' && <MixPreview mix={mix} dm={dm} onDM={onDM} onSkip={onSkip} busy={busy} />}
          {dmFb && !final_ && <DMFeedback fb={dmFb} onToggle={(i) => store.toggleFix(i)} onFinalize={onFinalize} busy={busy} />}

          {final_ && <>
            <FinalCard content={final_} />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-center pt-8 pb-16">
              <p className="text-[13px] text-[var(--text-tertiary)] mb-4">문서를 복사해서 바로 사용하세요.</p>
              <a href="/workspace" onClick={() => useProgressiveStore.setState({ currentSessionId: null })}
                className="inline-flex items-center gap-2 text-[13px] text-[var(--accent)] hover:underline cursor-pointer">새 프로젝트 시작 <ArrowRight size={12} /></a>
            </motion.div>
          </>}

          <AnimatePresence>
            {error && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {error.startsWith('LOGIN_REQUIRED') ? (
                <div className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-6">
                  <p className="text-[15px] font-bold text-[var(--text-primary)] mb-1">무료 체험을 모두 사용했어요</p>
                  <p className="text-[13px] text-[var(--text-secondary)] mb-4">로그인하면 하루 10회까지 무료로 사용할 수 있습니다.</p>
                  <a href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white text-[14px] font-semibold" style={{ background: 'var(--gradient-gold)' }}>로그인 <ChevronRight size={14} /></a>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 px-5 py-4 rounded-2xl bg-red-50 border border-red-200 text-[13px] text-red-700"><AlertTriangle size={14} className="shrink-0 mt-0.5" /><span>{error}</span></div>
              )}
            </motion.div>}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}

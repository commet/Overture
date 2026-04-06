'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProgressiveStore } from '@/stores/useProgressiveStore';
import {
  runDeepening,
  refineInitialFraming,
  runMix,
  runDMFeedback,
  runBossDMFeedback,
  runFinalDeliverable,
  runConcertmasterReview,
  runDebate,
  type ConcertmasterReview,
  type DebateResult,
} from '@/lib/progressive-engine';
import { assessConvergence, assessConvergenceWithWorkers } from '@/lib/progressive-convergence';
import { exportProgressiveAsReframe, exportProgressiveAsRecast } from '@/lib/progressive-handoff';
import { useAgentStore } from '@/stores/useAgentStore';
import { useReframeStore } from '@/stores/useReframeStore';
import { useRecastStore } from '@/stores/useRecastStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { runAllAIWorkers, runPipeline, type WorkerContext } from '@/lib/worker-engine';
import { getCompletionNote } from '@/lib/worker-personas';
import { track } from '@/lib/analytics';
import type { FlowQuestion, FlowAnswer, AnalysisSnapshot, DMConcern, MixResult, ConvergenceMetrics, WorkerTask } from '@/stores/types';
import { WorkerReportBlock } from './WorkerCard';
import { WorkerAvatar, AvatarRow } from './WorkerAvatar';
import { useWorkerActions } from '@/hooks/useWorkerActions';
import { useWorkerContext } from './WorkerPanel';
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
const PHASES = ['상황 분석', '팀 작업', '피드백', '완성'] as const;

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
    <motion.div layout className="rounded-2xl"
      style={{ transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}>
      <div className={`rounded-2xl p-[1px] ${isActive ? 'bg-gradient-to-b from-[var(--accent)]/20 to-[var(--accent)]/5' : 'bg-[var(--border-subtle)]'}`}>
        <div className="rounded-[calc(1rem-1px)] bg-[var(--surface)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
          {isActive && <div className="h-[2px]" style={{ background: 'var(--gradient-gold)' }} />}
          <div className="p-5 md:p-7">
            {/* Eyebrow + change summary */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-[0.2em] rounded-full bg-[var(--accent)]/8 px-2.5 py-0.5">진짜 질문</span>
              {snapshot.version > 0 && <span className="text-[9px] text-[var(--text-tertiary)] bg-[var(--bg)] px-2 py-0.5 rounded-full">v{snapshot.version + 1}</span>}
              {hasChanges && (newCount > 0 || removedCount > 0) && (
                <span className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                  {newCount > 0 && `+${newCount} 추가`}{newCount > 0 && removedCount > 0 && ' · '}{removedCount > 0 && `−${removedCount} 제거`}
                </span>
              )}
            </div>

            {/* Real question — shows change if updated */}
            <div className="mb-4">
              {questionChanged && (
                <motion.p initial={{ opacity: 0.6 }} animate={{ opacity: 0 }} transition={{ duration: 2, ease: EASE }}
                  className="text-[13px] text-[var(--text-tertiary)] line-through mb-1.5 leading-relaxed"
                  style={{ fontFamily: 'var(--font-display)' }}>
                  {prevSnapshot.real_question}
                </motion.p>
              )}
              <AnimatePresence mode="wait">
                <motion.h2 key={snapshot.real_question} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="text-[18px] md:text-[22px] font-bold text-[var(--text-primary)] leading-[1.35] tracking-tight"
                  style={{ fontFamily: 'var(--font-display)' }}>
                  {snapshot.real_question}
                </motion.h2>
              </AnimatePresence>
            </div>

            {/* Insight badge */}
            <AnimatePresence>
              {snapshot.insight && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.4, ease: EASE }} className="overflow-hidden mb-5">
                  <div className="px-4 py-3 rounded-xl bg-[var(--accent)]/[0.06] border border-[var(--accent)]/12">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Sparkles size={11} className="text-[var(--accent)]" />
                      <span className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-[0.15em]">핵심</span>
                    </div>
                    <p className="text-[13px] text-[var(--text-primary)] leading-relaxed font-medium">{snapshot.insight}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Two-column: Assumptions | Skeleton — with diff indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              {assumptionDiff.filter(d => d.status !== 'removed').length > 0 && (
                <div className="rounded-xl bg-[var(--bg)]/60 p-4">
                  <p className="text-[12px] font-semibold text-[var(--text-primary)] mb-2.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400/60" />놓치기 쉬운 것
                  </p>
                  <div className="space-y-1.5">
                    <AnimatePresence>
                      {assumptionDiff.filter(d => d.status === 'removed').map((d, i) => (
                        <motion.div key={`removed-a-${i}`} initial={{ opacity: 0.5 }} animate={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.8, ease: EASE }}
                          className="flex items-start gap-2 text-[12px] text-red-300 line-through leading-relaxed overflow-hidden">
                          <span className="text-red-300 text-[9px] font-bold shrink-0 mt-0.5">−</span>
                          <span>{d.text}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {assumptionDiff.filter(d => d.status !== 'removed').map((d, i) => (
                      <motion.div key={`${snapshot.version}-a${i}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06, duration: 0.35, ease: EASE }}
                        className={`flex items-start gap-2 text-[12px] leading-[1.7] rounded-lg px-2 py-0.5 -mx-2 transition-colors duration-1000 ${
                          d.status === 'new' ? 'bg-emerald-50/60 text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                        }`}>
                        <span className={`text-[9px] font-bold shrink-0 mt-1 ${
                          d.status === 'new' ? 'text-emerald-500' : 'text-red-400/50'
                        }`}>{d.status === 'new' ? '+' : '?'}</span>
                        <span>{d.text}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-xl bg-[var(--bg)]/60 p-4">
                <p className="text-[12px] font-semibold text-[var(--text-primary)] mb-2.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]/60" />뼈대
                </p>
                <div className="space-y-1">
                  <AnimatePresence>
                    {skeletonDiff.filter(d => d.status === 'removed').map((d, i) => (
                      <motion.div key={`removed-s-${i}`} initial={{ opacity: 0.5 }} animate={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.8, ease: EASE }}
                        className="flex items-start gap-2 text-[12px] text-red-300 line-through leading-relaxed overflow-hidden">
                        <span className="text-red-300 font-mono text-[9px] shrink-0 mt-1">−</span>
                        <span>{d.text}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {skeletonDiff.filter(d => d.status !== 'removed').map((d, i) => (
                    <motion.div key={`${snapshot.version}-s${i}`} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.35, ease: EASE }}
                      className={`flex items-start gap-2.5 text-[12px] leading-[1.7] rounded-lg px-2 py-0.5 -mx-2 transition-colors duration-1000 ${
                        d.status === 'new' ? 'bg-emerald-50/60 text-[var(--text-primary)] font-medium' : 'text-[var(--text-primary)]'
                      }`}>
                      <span className={`font-mono text-[10px] w-3.5 text-right shrink-0 mt-0.5 ${
                        d.status === 'new' ? 'text-emerald-500 font-bold' : 'text-[var(--accent)]/40'
                      }`}>{d.status === 'new' ? '+' : `${i + 1}`}</span>
                      <span>{d.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Execution plan — compact indicator (workers handle the detail) */}
            <AnimatePresence>
              {snapshot.execution_plan && snapshot.execution_plan.steps.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.5, ease: EASE }} className="overflow-hidden">
                  <div className="pt-4 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)]">실행 계획:</span>
                      {snapshot.execution_plan.steps.map((step, i) => (
                        <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          step.who === 'ai' ? 'bg-blue-50 text-blue-600' : step.who === 'human' ? 'bg-amber-50 text-amber-600' : 'bg-purple-50 text-purple-600'
                        }`}>{step.task}</span>
                      ))}
                      <span className="text-[10px] text-[var(--text-tertiary)]">
                        <span className="hidden lg:inline">← 좌측 패널에서 진행 중</span>
                        <span className="lg:hidden">↓ 하단 팀 탭에서 진행 중</span>
                      </span>
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
    <motion.div initial={{ opacity: 0, y: 12, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: EASE }}
      className="rounded-xl bg-[var(--accent)]/[0.02] border border-[var(--accent)]/10 p-4 md:p-5">
      <div className="flex items-start gap-2.5 mb-3.5">
        <div className="w-6 h-6 rounded-full bg-[var(--accent)]/10 flex items-center justify-center shrink-0 mt-0.5">
          <ArrowRight size={11} className="text-[var(--accent)]" />
        </div>
        <div>
          <p className="text-[14px] md:text-[15px] font-semibold text-[var(--text-primary)] leading-snug tracking-tight">{question.text}</p>
          {question.subtext && <p className="mt-1.5 text-[12px] text-[var(--text-secondary)] leading-relaxed italic">{question.subtext}</p>}
        </div>
      </div>

      {question.options?.length ? (
        <div className="space-y-1.5 pl-8.5">
          {question.options.map((opt, i) => (
            <motion.button key={i} onClick={() => go(opt)} disabled={disabled || submitted} whileTap={{ scale: 0.98 }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-[13px] leading-normal border cursor-pointer ${
                selected === opt ? 'border-[var(--accent)] bg-[var(--accent)]/8 text-[var(--text-primary)] font-medium' :
                submitted ? 'border-[var(--border-subtle)] text-[var(--text-tertiary)] opacity-30' :
                'border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40'
              }`} style={{ transitionProperty: 'all', transitionDuration: '400ms', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}>{opt}</motion.button>
          ))}
          <div className="flex gap-2 pt-0.5">
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="또는 직접 입력..." disabled={disabled || submitted}
              className="flex-1 px-3.5 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]/30 disabled:opacity-30"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); goText(); } }} />
            {input.trim() && <motion.button onClick={goText} disabled={disabled || submitted} whileTap={{ scale: 0.95 }}
              className="shrink-0 px-4 py-2 text-white rounded-xl text-[12px] font-semibold cursor-pointer disabled:opacity-30"
              style={{ background: 'var(--gradient-gold)' }}>확인</motion.button>}
          </div>
        </div>
      ) : (
        <div className="flex gap-2 pl-8.5">
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="입력..." autoFocus disabled={disabled || submitted}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]/30 disabled:opacity-30"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); goText(); } }} />
          <motion.button onClick={goText} disabled={disabled || !input.trim() || submitted} whileTap={{ scale: 0.95 }}
            className="shrink-0 px-5 py-2.5 text-white rounded-xl text-[13px] font-semibold shadow-[var(--shadow-sm)] cursor-pointer disabled:opacity-30"
            style={{ background: 'var(--gradient-gold)' }}>확인</motion.button>
        </div>
      )}
    </motion.div>
  );
}

/* ═══ Mix Preview ═══ */
function MixPreview({ mix, dm, onDM, onSkip, busy, cmReview, debateResult }: { mix: MixResult; dm: string | null; onDM: () => void; onSkip: () => void; busy: boolean; cmReview?: ConcertmasterReview | null; debateResult?: DebateResult | null }) {
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
                  <p className="text-[13px] text-[var(--text-primary)] leading-[1.8]">{renderInline(s.content)}</p>
                </motion.div>
              ))}
            </div>

            {mix.next_steps.length > 0 && (
              <div className="pt-5 border-t border-[var(--border-subtle)]">
                <p className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-3">다음 단계</p>
                {mix.next_steps.map((s, i) => <div key={i} className="flex items-start gap-2.5 text-[13px] text-[var(--text-primary)] mb-2 leading-relaxed"><span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-2 shrink-0" /><span>{s}</span></div>)}
              </div>
            )}

            {cmReview && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.6 }}
                className="pt-5 border-t border-dashed border-[var(--accent)]/20">
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ fontSize: 18 }}>🎻</span>
                  <p className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-[0.2em]">악장의 한마디</p>
                </div>
                <p className="text-[13px] text-[var(--text-primary)] leading-relaxed mb-2">{cmReview.overall}</p>
                {cmReview.contradictions.length > 0 && (
                  <div className="mb-2">
                    {cmReview.contradictions.map((c, i) => <p key={i} className="text-[12px] text-[var(--danger)] flex items-start gap-2 mb-1"><span className="shrink-0 mt-0.5">⚡</span>{c}</p>)}
                  </div>
                )}
                {cmReview.blind_spots.length > 0 && (
                  <div className="mb-2">
                    {cmReview.blind_spots.map((b, i) => <p key={i} className="text-[12px] text-[var(--text-secondary)] flex items-start gap-2 mb-1"><span className="shrink-0 mt-0.5">👁</span>{b}</p>)}
                  </div>
                )}
                <p className="text-[12px] text-[var(--text-tertiary)] italic mt-2">{cmReview.verdict}</p>
              </motion.div>
            )}

            {debateResult && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7, duration: 0.6 }}
                className="pt-5 border-t border-dashed border-[var(--danger)]/20">
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ fontSize: 18 }}>⚔️</span>
                  <p className="text-[9px] font-bold text-[var(--danger)] uppercase tracking-[0.2em]">팀 내 반론</p>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${debateResult.severity === 'critical' ? 'bg-[var(--danger)]/10 text-[var(--danger)]' : debateResult.severity === 'important' ? 'bg-[var(--warning)]/10 text-[var(--warning)]' : 'bg-[var(--text-tertiary)]/10 text-[var(--text-tertiary)]'}`}>
                    {debateResult.severity}
                  </span>
                </div>
                <p className="text-[13px] text-[var(--text-primary)] leading-relaxed mb-2">{debateResult.challenge}</p>
                {debateResult.weakestClaim && (
                  <p className="text-[12px] text-[var(--danger)] flex items-start gap-2 mb-1">
                    <span className="shrink-0 mt-0.5">💀</span>
                    <span><strong>{debateResult.targetAgent}</strong>의 약점: {debateResult.weakestClaim}</span>
                  </p>
                )}
                {debateResult.alternativeView && (
                  <p className="text-[12px] text-[var(--text-secondary)] flex items-start gap-2 mt-2">
                    <span className="shrink-0 mt-0.5">💡</span>
                    <span>{debateResult.alternativeView}</span>
                  </p>
                )}
              </motion.div>
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
    <div className="space-y-5">
      {/* Transition divider */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}
        className="flex items-center gap-4 py-1">
        <div className="flex-1 h-px bg-[var(--accent)]/15" />
        <div className="flex items-center gap-1.5 shrink-0">
          <UserCheck size={12} className="text-[var(--accent)]/60" />
          <span className="text-[11px] text-[var(--text-secondary)] font-medium">의사결정권자의 반응</span>
        </div>
        <div className="flex-1 h-px bg-[var(--accent)]/15" />
      </motion.div>

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

            <div className="pt-4 mt-2 border-t border-[var(--border-subtle)]">
              <div className="rounded-xl bg-[var(--accent)]/[0.04] border border-[var(--accent)]/10 px-4 py-3.5">
                <p className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-[0.2em] mb-2">통과 조건</p>
                <p className="text-[15px] text-[var(--text-primary)] font-semibold leading-relaxed">{fb.approval_condition}</p>
              </div>
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
    </div>
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

/* ═══ Team Deploy Banner — 팀 구성 확인 ═══ */
function TeamDeployBanner({ workers, onDeploy }: { workers: WorkerTask[]; onDeploy: () => void }) {
  const names = workers.map(w => w.persona?.name || 'AI').filter(Boolean);
  const nameStr = names.length <= 3
    ? names.join(', ')
    : `${names.slice(0, 2).join(', ')} 외 ${names.length - 2}명`;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
      className="rounded-2xl border border-[var(--accent)]/12 bg-gradient-to-b from-[var(--accent)]/[0.04] to-transparent p-5 md:p-6 space-y-4">

      {/* Avatars row + warm intro */}
      <div className="flex items-center gap-3 flex-wrap">
        <AvatarRow personas={workers.map(w => w.persona)} />
        <p className="text-[14px] font-medium text-[var(--text-primary)] truncate">
          {nameStr}이(가) 함께합니다
        </p>
      </div>

      {/* Member list */}
      <div className="space-y-2">
        {workers.map(w => (
          <div key={w.id} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[var(--surface)]/80">
            <WorkerAvatar persona={w.persona} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium text-[var(--text-primary)]">
                {w.persona?.name || 'AI'}
                <span className="text-[var(--text-secondary)] font-normal ml-1.5 text-[12px]">{w.persona?.role}</span>
              </p>
              <p className="text-[13px] text-[var(--text-secondary)] line-clamp-2 mt-0.5" title={w.task}>{w.task}</p>
            </div>
          </div>
        ))}
      </div>

      <motion.button onClick={onDeploy} whileTap={{ scale: 0.98 }}
        className="w-full flex items-center justify-center gap-2 px-5 py-3.5 text-white rounded-xl text-[14px] font-semibold cursor-pointer shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-lg)] transition-shadow"
        style={{ background: 'var(--gradient-gold)' }}>
        시작 <ChevronRight size={14} />
      </motion.button>
    </motion.div>
  );
}

/* ═══ Mix Trigger ═══ */
function MixTrigger({ onMix, onMore, busy }: { onMix: () => void; onMore: () => void; busy: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="space-y-4 py-2">
      <p className="text-[12px] text-[var(--text-tertiary)] text-center tracking-wide">초안을 만들 준비가 되었습니다</p>
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

/* ═══ Framing Confirmation (Weakness A fix) ═══ */
function FramingConfirmation({ snapshot, onConfirm, onReject, busy }: {
  snapshot: AnalysisSnapshot;
  onConfirm: () => void;
  onReject: (reason: string) => void;
  busy: boolean;
}) {
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState('');
  const confidence = snapshot.framing_confidence ?? 75;
  const isLowConfidence = confidence < 70;

  if (snapshot.framing_locked) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
      className={`rounded-xl border p-4 md:p-5 ${isLowConfidence ? 'bg-amber-50/50 border-amber-200' : 'bg-[var(--accent)]/[0.02] border-[var(--accent)]/10'}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isLowConfidence ? 'bg-amber-100' : 'bg-[var(--accent)]/10'}`}>
          {isLowConfidence ? <AlertTriangle size={11} className="text-amber-600" /> : <Check size={11} className="text-[var(--accent)]" />}
        </div>
        <div>
          <p className="text-[13px] font-semibold text-[var(--text-primary)] leading-snug">이 방향이 맞나요?</p>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
            {isLowConfidence ? '이 문제는 여러 방향으로 해석될 수 있습니다.' : '분석 방향을 확인하고 다음으로 넘어갑니다.'}
            {' '}확신도 {confidence}%
          </p>
        </div>
      </div>

      {!rejectMode ? (
        <div className="flex gap-2 pl-9">
          <motion.button onClick={onConfirm} disabled={busy} whileTap={{ scale: 0.98 }}
            className="px-4 py-2 rounded-xl text-[12px] font-semibold text-white cursor-pointer disabled:opacity-50"
            style={{ background: 'var(--gradient-gold)' }}>맞습니다</motion.button>
          <motion.button onClick={() => setRejectMode(true)} disabled={busy} whileTap={{ scale: 0.98 }}
            className="px-4 py-2 rounded-xl text-[12px] font-medium text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--accent)]/30 cursor-pointer">
            다시 정의</motion.button>
        </div>
      ) : (
        <div className="pl-9 space-y-2">
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="어떤 방향이 더 맞나요? (예: 이건 투자용이 아니라 내부 보고용이야)"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]/30"
            onKeyDown={e => { if (e.key === 'Enter' && reason.trim()) { e.preventDefault(); onReject(reason.trim()); } }} autoFocus />
          <div className="flex gap-2">
            <motion.button onClick={() => reason.trim() && onReject(reason.trim())} disabled={busy || !reason.trim()} whileTap={{ scale: 0.98 }}
              className="px-4 py-2 rounded-xl text-[12px] font-semibold text-white cursor-pointer disabled:opacity-50"
              style={{ background: 'var(--gradient-gold)' }}>재분석</motion.button>
            <button onClick={() => setRejectMode(false)} className="px-3 py-2 text-[11px] text-[var(--text-tertiary)] cursor-pointer">취소</button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ═══ Convergence Status (Weakness C fix) ═══ */
function ConvergenceStatus({ metrics }: { metrics: ConvergenceMetrics }) {
  const colorClass = metrics.score >= 75 ? 'text-emerald-600 bg-emerald-50' :
    metrics.score >= 50 ? 'text-amber-600 bg-amber-50' : 'text-red-500 bg-red-50';
  const barColor = metrics.score >= 75 ? 'bg-emerald-400' :
    metrics.score >= 50 ? 'bg-amber-400' : 'bg-red-400';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: EASE }}
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[var(--bg)]/60 border border-[var(--border-subtle)]">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium text-[var(--text-tertiary)]">명확도</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colorClass}`}>{metrics.score}%</span>
        </div>
        <div className="h-1 rounded-full bg-[var(--border-subtle)] overflow-hidden">
          <motion.div className={`h-full rounded-full ${barColor}`}
            initial={{ width: 0 }} animate={{ width: `${metrics.score}%` }} transition={{ duration: 0.8, ease: EASE }} />
        </div>
      </div>
      <p className="text-[10px] text-[var(--text-tertiary)] max-w-[160px] leading-tight">{metrics.guidance}</p>
    </motion.div>
  );
}

/* ═══ Pipeline Exit Buttons (Weakness D fix) ═══ */
function PipelineExitOptions({ onReframe, onRehearse }: {
  onReframe: () => void;
  onRehearse: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-dashed border-[var(--border-subtle)] pt-4 mt-2">
      <p className="text-[10px] font-medium text-[var(--text-tertiary)] tracking-wide">다른 도구로 전환</p>
      <div className="flex gap-2">
        <button onClick={onReframe}
          className="flex-1 text-left px-3 py-2 rounded-xl bg-[var(--bg)]/60 hover:bg-[var(--accent)]/5 border border-transparent hover:border-[var(--accent)]/10 cursor-pointer transition-colors duration-300">
          <p className="text-[11px] font-medium text-[var(--text-secondary)]">→ 문제 재정의</p>
          <p className="text-[9px] text-[var(--text-tertiary)]">더 깊이 들어가기</p>
        </button>
        <button onClick={onRehearse}
          className="flex-1 text-left px-3 py-2 rounded-xl bg-[var(--bg)]/60 hover:bg-[var(--accent)]/5 border border-transparent hover:border-[var(--accent)]/10 cursor-pointer transition-colors duration-300">
          <p className="text-[11px] font-medium text-[var(--text-secondary)]">→ 피드백 먼저</p>
          <p className="text-[9px] text-[var(--text-tertiary)]">이해관계자 반응 시뮬레이션</p>
        </button>
      </div>
    </div>
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
  const [cmReview, setCmReview] = useState<ConcertmasterReview | null>(null);
  const [debateResult, setDebateResult] = useState<DebateResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const workerAbortRef = useRef<AbortController | null>(null);
  const workersRef = useRef<Promise<void> | null>(null);
  const scroll = useCallback(() => { setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 200); }, []);

  // Cleanup: abort workers on unmount
  useEffect(() => {
    return () => {
      workerAbortRef.current?.abort();
    };
  }, []);

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
  const deployPhase = session?.worker_deploy_phase ?? 'none';
  const workers = session?.workers ?? [];
  const workerContext = useWorkerContext();
  const workerActions = useWorkerActions(workerContext);

  // Workers that have completed (for inline display in flow)
  const completedWorkers = workers.filter(w => w.status === 'done' || w.status === 'waiting_input' || w.status === 'error');

  if (!session) return null;

  /* Deploy workers — user confirmed the team */
  const onDeployWorkers = () => {
    if (deployPhase === 'deployed') return; // Guard: prevent double-click
    const ws = store.currentSession()?.workers ?? [];
    if (ws.length === 0) return;
    store.deployWorkers();
    const qa = qaPairs.filter(q => q.answer).map(q => ({ question: q.question, answer: q.answer! }));
    const ctx: WorkerContext = {
      problemText: session.problem_text,
      realQuestion: latest?.real_question ?? '',
      skeleton: latest?.skeleton ?? [],
      hiddenAssumptions: latest?.hidden_assumptions ?? [],
      qaHistory: qa.map(q => ({ q: q.question.text, a: q.answer.value })),
    };
    // Clean up any previous controller before creating new one
    workerAbortRef.current?.abort();
    workerAbortRef.current = new AbortController();
    const workerCallbacks = {
      onStart: (id: string) => store.updateWorker(id, { status: 'running', started_at: new Date().toISOString() }),
      onStream: (id: string, text: string) => store.setWorkerStreamText(id, text),
      onComplete: (id: string, result: string, validation?: { score: number; passed: boolean; issues: string[] }) => {
        const w = store.currentSession()?.workers.find(ww => ww.id === id);
        const persona = w?.persona;
        const note = persona
          ? getCompletionNote(persona.id)
          : null;
        const validationFields = validation
          ? { validation_score: validation.score, validation_passed: validation.passed, validation_feedback: validation.issues.join('; ') }
          : {};
        if (w?.who === 'both') {
          store.updateWorker(id, { status: 'waiting_input', result, stream_text: '', completion_note: note, ...validationFields });
        } else {
          store.updateWorker(id, { status: 'done', result, stream_text: '', completion_note: note, completed_at: new Date().toISOString(), ...validationFields });
        }
        scroll();
      },
      onError: (id: string, error: string) => store.updateWorker(id, { status: 'error', error, stream_text: '' }),
    };

    // stages가 있으면 스테이지 파이프라인, 없으면 기존 병렬 실행
    const stages = store.currentSession()?.stages;
    const hasMultipleStages = stages && stages.length > 1;

    workersRef.current = (hasMultipleStages
      ? runPipeline(ws, stages, ctx, workerCallbacks, workerAbortRef.current.signal)
      : runAllAIWorkers(ws, ctx, workerCallbacks, workerAbortRef.current.signal)
    ).catch((err) => {
      console.error('[Worker orchestration error]', err);
    });
  };

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
      const r = await runDeepening(session.problem_text, latest, qa, round, maxR, snapshots, (text) => setStreamingText(text), abortRef.current.signal);
      setStreamingText(null);
      store.addSnapshot(r.snapshot); store.advanceRound();
      // Prepare workers when execution_plan first appears (user must confirm to deploy)
      const existingWorkers = store.currentSession()?.workers ?? [];
      if (r.snapshot.execution_plan && r.snapshot.execution_plan.steps.length > 0 && existingWorkers.length === 0) {
        store.initWorkers(r.snapshot.execution_plan.steps);
        // Workers are now in 'ready' phase — TeamDeployBanner will show
        // Actual execution happens when user clicks "팀 시작하기"
        // Quality validation handled via WorkerTaskResult in worker-engine
      }
      r.readyForMix || !r.question ? (setShowMix(true), store.setPhase('conversing')) : (store.addQuestion(r.question), store.setPhase('conversing'));
    } catch (e) { setStreamingText(null); setError(e instanceof Error ? e.message : '분석 실패'); store.setPhase('conversing'); }
    finally { setBusy(false); abortRef.current = null; scroll(); }
  };

  const onMix = async () => {
    setBusy(true); setError(null); store.setPhase('mixing'); scroll();
    try {
      // Wait for any running AI workers to finish before collecting results
      if (workersRef.current) {
        await workersRef.current;
        workersRef.current = null;
      }
      const qa = qaPairs.filter(q => q.answer).map(q => ({ question: q.question, answer: q.answer! }));
      // Collect approved worker results (approved=true or null=unreviewed; excluded=false)
      const workerResults = store.approvedWorkerResults()
        .map(w => ({ task: w.task, result: w.result }));

      // 악장 메타 리뷰 + debate (해금 시만, 비차단)
      if (workerResults.length > 0) {
        const cmWorkers = session!.workers
          .filter(w => w.approved !== false && w.result)
          .map(w => ({ agentName: w.persona?.name || '에이전트', agentRole: w.persona?.role || '', task: w.task, result: w.result || '' }));
        runConcertmasterReview(session!.problem_text, cmWorkers)
          .then(r => { if (r) setCmReview(r); })
          .catch(() => {});

        // Critical stakes: Cross-Agent Debate (비차단)
        const stages = session?.stages;
        if (stages && stages.length > 1) {
          const debateWorkers = cmWorkers.map(w => ({ ...w, framework: session!.workers.find(ww => ww.persona?.name === w.agentName)?.framework || null }));
          runDebate(session!.problem_text, debateWorkers)
            .then(r => { if (r) setDebateResult(r); })
            .catch(() => {});
        }
      }

      const m = await runMix(session!.problem_text, snapshots, qa, dm, workerResults.length > 0 ? workerResults : undefined);
      store.setMix(m); setShowMix(false); track('flow_mix', { rounds: round });

      // Phase 6: Boss reviewer가 있으면 자동 DM 피드백
      if (session?.reviewer_agent_id) {
        const reviewerAgent = useAgentStore.getState().getAgent(session.reviewer_agent_id);
        if (reviewerAgent) {
          const f = await runBossDMFeedback(m, reviewerAgent, session.problem_text);
          store.setDMFeedback(f);
          import('@/lib/observation-engine').then(({ onBossReviewCompleted }) => {
            onBossReviewCompleted(reviewerAgent.id, f);
          }).catch(() => {});
          useAgentStore.getState().recordActivity(reviewerAgent.id, 'review_given', session.problem_text.slice(0, 100));
        }
      }
    } catch (e) { setError(e instanceof Error ? e.message : '초안 생성 실패'); store.setPhase('conversing'); }
    finally { setBusy(false); scroll(); }
  };

  const onDM = async () => {
    if (!mix) return; setBusy(true); setError(null); scroll();
    try {
      // Boss agent가 연결되어 있으면 Boss 성격 DM 피드백
      const reviewerAgent = session?.reviewer_agent_id
        ? useAgentStore.getState().getAgent(session.reviewer_agent_id)
        : undefined;

      const f = reviewerAgent
        ? await runBossDMFeedback(mix, reviewerAgent, session!.problem_text)
        : await runDMFeedback(mix, dm || '의사결정권자', session!.problem_text);

      store.setDMFeedback(f);

      // Boss 리뷰 후 observation 업데이트 + XP
      if (reviewerAgent && f) {
        import('@/lib/observation-engine').then(({ onBossReviewCompleted }) => {
          onBossReviewCompleted(reviewerAgent.id, f);
        }).catch(() => {});
        useAgentStore.getState().recordActivity(reviewerAgent.id, 'review_given', session!.problem_text.slice(0, 100));
      }
    }
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
      const r = await runDeepening(session!.problem_text, latest, qa, round, round + 2, snapshots, (text) => setStreamingText(text), abortRef.current.signal);
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

          {/* Team deploy banner — 사용자 확인 후 worker 실행 */}
          {deployPhase === 'ready' && workers.length > 0 && (
            <TeamDeployBanner workers={workers} onDeploy={onDeployWorkers} />
          )}

          {/* Question FIRST — user action at the top, not buried below */}
          {curQ && !busy && phase === 'conversing' && <QuestionCard key={curQ.id} question={curQ} onAnswer={onAnswer} disabled={busy} />}

          {/* Inline worker reports — appear in main flow as conversations */}
          {deployPhase === 'deployed' && completedWorkers.length > 0 && !final_ && (
            <div className="space-y-4">
              {/* Running workers — subtle indicators */}
              {workers.filter(w => w.status === 'running').map(w => (
                <WorkerReportBlock key={w.id} worker={w} />
              ))}
              {/* Completed/waiting workers — full report blocks */}
              {completedWorkers.map(w => (
                <WorkerReportBlock
                  key={w.id}
                  worker={w}
                  onSubmitInput={w.status === 'waiting_input' ? workerActions.handleSubmit : undefined}
                  onRetry={w.status === 'error' ? workerActions.handleRetry : undefined}
                  onApprove={w.status === 'done' ? workerActions.handleApprove : undefined}
                  onReject={w.status === 'done' ? workerActions.handleReject : undefined}
                />
              ))}
            </div>
          )}

          {/* Worker status summary before mix — with persona names */}
          {shouldMix && !busy && phase === 'conversing' && !curQ && workers.length > 0 && (() => {
            const items = workers.map(w => {
              const name = w.persona?.name || 'AI';
              if (w.approved === true) return `${name} ✓`;
              if (w.approved === false) return `${name} ✗`;
              if (w.status === 'done') return `${name} ⏳`;
              if (w.status === 'running') return `${name} ●`;
              return null;
            }).filter(Boolean);
            return items.length > 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg)]/60 text-[12px] text-[var(--text-secondary)]">
                <AvatarRow personas={workers.map(w => w.persona)} maxShow={5} />
                <span>{items.join(' · ')}</span>
              </motion.div>
            ) : null;
          })()}

          {shouldMix && !busy && phase === 'conversing' && !curQ && <MixTrigger onMix={onMix} onMore={onMore} busy={busy} />}

          {/* Loading states */}
          {phase === 'analyzing' && snapshots.length === 0 && !streamingText && <LoadingState text="시작..." steps={['상황을 읽고 있습니다...', '당신이 놓치고 있는 걸 찾는 중...', '문서 뼈대를 잡고 있습니다...', '거의 다 됐습니다...']} />}
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
          {phase === 'mixing' && <LoadingState text="초안 작성 중..." steps={['팀의 분석을 하나로 엮는 중...', '문서 구조를 잡고 있습니다...', '거의 완성입니다...']} />}

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
              snapshot={latest}
              prevSnapshot={snapshots.length > 1 ? snapshots[snapshots.length - 2] : null}
              isActive={!mix}
            />
          )}

          {/* Framing Confirmation — Round 1 후 사용자 확인 (Weakness A) */}
          {latest && !latest.framing_locked && snapshots.length === 1 && phase === 'conversing' && !mix && !final_ && (
            <FramingConfirmation
              snapshot={latest}
              onConfirm={() => {
                store.updateLatestSnapshot({ framing_locked: true });
                track('framing_confirmed', { confidence: latest.framing_confidence });
              }}
              onReject={async (reason) => {
                setBusy(true); setError(null);
                try {
                  setStreamingText('');
                  const r = await refineInitialFraming(
                    session.problem_text, latest.real_question, reason,
                    (text) => setStreamingText(text),
                  );
                  setStreamingText(null);
                  store.replaceInitialSnapshot(r.snapshot);
                  if (r.detectedDM) store.setDecisionMaker(r.detectedDM);
                  store.replaceLatestQuestion(r.question);
                  track('framing_rejected', { reason });
                } catch (e) { setStreamingText(null); setError(e instanceof Error ? e.message : '재분석 실패'); }
                finally { setBusy(false); scroll(); }
              }}
              busy={busy}
            />
          )}

          {/* Convergence Status — 라운드 2+ (Weakness C) */}
          {snapshots.length >= 2 && !mix && !final_ && phase === 'conversing' && (
            <ConvergenceStatus metrics={
              workers.length > 0
                ? assessConvergenceWithWorkers(snapshots, workers.map(w => ({ validationScore: w.validation_score, approved: w.approved })))
                : assessConvergence(snapshots)
            } />
          )}

          {/* Pipeline Exit — 라운드 1+ 후 4R로 분기 가능 (Weakness D) */}
          {latest && snapshots.length >= 1 && !mix && !final_ && phase === 'conversing' && !busy && (
            <PipelineExitOptions
              onReframe={() => {
                try {
                  const item = exportProgressiveAsReframe(session);
                  // 실제 store에 저장 + 프로젝트 연결
                  useReframeStore.getState().addItem(item);
                  store.linkToReframe(item.id);
                  if (session.project_id) {
                    useProjectStore.getState().addRef(session.project_id, {
                      tool: 'reframe', itemId: item.id, label: session.problem_text.slice(0, 30),
                    });
                  }
                  track('progressive_exit_to_reframe', { round });
                  window.location.href = `/workspace?step=reframe&handoff=progressive&itemId=${item.id}`;
                } catch (e) { setError(e instanceof Error ? e.message : '전환 실패'); }
              }}
              onRehearse={() => {
                try {
                  const item = exportProgressiveAsRecast(session);
                  // 실제 store에 저장 + 프로젝트 연결
                  useRecastStore.getState().addItem(item);
                  store.linkToRecast(item.id);
                  if (session.project_id) {
                    useProjectStore.getState().addRef(session.project_id, {
                      tool: 'recast', itemId: item.id, label: session.problem_text.slice(0, 30),
                    });
                  }
                  track('progressive_exit_to_rehearse', { round });
                  window.location.href = `/workspace?step=rehearse&handoff=progressive&itemId=${item.id}`;
                } catch (e) { setError(e instanceof Error ? e.message : '전환 실패'); }
              }}
            />
          )}

          {/* Answered Q&A history — collapsed at bottom */}
          {!final_ && <AnsweredPills qaPairs={qaPairs} />}
          {mix && !dmFb && !final_ && phase !== 'mixing' && <MixPreview mix={mix} dm={dm} onDM={onDM} onSkip={onSkip} busy={busy} cmReview={cmReview} debateResult={debateResult} />}
          {dmFb && !final_ && <DMFeedback fb={dmFb} onToggle={(i) => store.toggleFix(i)} onFinalize={onFinalize} busy={busy} />}

          {final_ && <>
            {/* Completion moment */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: EASE }}
              className="flex items-center justify-center gap-2 py-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--gradient-gold)' }}>
                <Check size={14} className="text-white" />
              </div>
              <p className="text-[14px] font-medium text-[var(--text-primary)]">
                {dmFb && dmFb.concerns.filter((c: DMConcern) => c.applied).length > 0
                  ? `피드백 ${dmFb.concerns.filter((c: DMConcern) => c.applied).length}건 반영 완료`
                  : '최종 문서 완성'}
              </p>
            </motion.div>
            <FinalCard content={final_} />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="pt-8 pb-16">
              <p className="text-[13px] text-[var(--text-tertiary)] text-center mb-6">복사해서 바로 사용하세요.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a href="/workspace" onClick={() => useProgressiveStore.setState({ currentSessionId: null })}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-white text-[13px] font-semibold cursor-pointer"
                  style={{ background: 'var(--gradient-gold)' }}>새 프로젝트 시작 <ArrowRight size={12} /></a>
                <button onClick={() => { if (mix) { store.setFinalDeliverable(null as unknown as string); store.setDMFeedback(null as unknown as import('@/stores/types').DMFeedbackResult); store.setMix(null as unknown as MixResult); setShowMix(true); } }}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-[13px] font-medium text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--accent)]/30 cursor-pointer transition-colors">
                  이해관계자 검증 다시 하기
                </button>
              </div>
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

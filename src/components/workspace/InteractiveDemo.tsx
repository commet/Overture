'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Sparkles, Check, ArrowRight, UserCheck, Loader2, ChevronDown } from 'lucide-react';
import { WorkerAvatar } from './progressive/WorkerAvatar';
import type { DemoScenario } from '@/lib/demo-data';
import { applyPatch, buildFinal } from '@/lib/demo-data';
import type { AnalysisSnapshot, DMConcern } from '@/stores/types';
import { track } from '@/lib/analytics';

/* ═══ Constants ═══ */
const EASE = [0.32, 0.72, 0, 1] as const;
const SPRING = { type: 'spring' as const, stiffness: 400, damping: 30 };

/* ═══ Phase State Machine ═══ */
type DemoPhase =
  | 'typing'
  | 'team'
  | 'analysis'
  | 'q1'
  | 'update1'
  | 'q2'
  | 'update2'
  | 'workers'
  | 'draft'
  | 'dm'
  | 'final';

const PHASE_ORDER: DemoPhase[] = ['typing', 'team', 'analysis', 'q1', 'update1', 'q2', 'update2', 'workers', 'draft', 'dm', 'final'];
const phaseGte = (current: DemoPhase, target: DemoPhase) => PHASE_ORDER.indexOf(current) >= PHASE_ORDER.indexOf(target);

/* ═══ Diff utility ═══ */
function diffItems(prev: string[], curr: string[]): Array<{ text: string; status: 'new' | 'same' | 'removed' }> {
  const prevSet = new Set(prev);
  const currSet = new Set(curr);
  const result: Array<{ text: string; status: 'new' | 'same' | 'removed' }> = [];
  for (const item of prev) {
    if (!currSet.has(item)) result.push({ text: item, status: 'removed' });
  }
  for (const item of curr) {
    result.push({ text: item, status: prevSet.has(item) ? 'same' : 'new' });
  }
  return result;
}

/* ═══ Markdown renderer (from ProgressiveFlow) ═══ */
function renderInline(text: string): React.ReactNode {
  const p = text.split(/(\*\*[^*]+\*\*)/g);
  if (p.length === 1) return text;
  return p.map((s, i) => s.startsWith('**') && s.endsWith('**') ? <strong key={i} className="font-semibold text-[var(--text-primary)]">{s.slice(2, -2)}</strong> : s);
}

function renderMd(c: string) {
  return c.split('\n').map((l, k) => {
    if (l.startsWith('# ')) return <h1 key={k} className="text-[24px] md:text-[28px] font-bold text-[var(--text-primary)] mt-1 mb-4 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>{l.slice(2)}</h1>;
    if (l.startsWith('### ')) return <h3 key={k} className="text-[14px] font-bold text-[var(--text-primary)] mt-5 mb-1.5">{l.slice(4)}</h3>;
    if (l.startsWith('## ')) return <h2 key={k} className="text-[16px] font-bold text-[var(--text-primary)] mt-7 mb-2 tracking-tight">{l.slice(3)}</h2>;
    if (l.startsWith('> ')) return <blockquote key={k} className="border-l-[3px] border-[var(--accent)]/20 pl-5 py-1 text-[14px] text-[var(--text-secondary)] italic my-3 leading-relaxed">{renderInline(l.slice(2))}</blockquote>;
    if (l.startsWith('- ')) return <div key={k} className="flex items-start gap-2.5 text-[14px] text-[var(--text-primary)] ml-1 leading-[1.8]"><span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]/50 mt-2.5 shrink-0" /><span>{renderInline(l.slice(2))}</span></div>;
    if (l.startsWith('| ')) return <p key={k} className="text-[13px] text-[var(--text-secondary)] font-mono leading-[1.8]">{l}</p>;
    if (l.startsWith('---') || l.startsWith('|--')) return <hr key={k} className="border-[var(--border-subtle)] my-1" />;
    if (l.match(/^\d+\. /)) return <div key={k} className="flex items-start gap-2.5 text-[14px] text-[var(--text-primary)] ml-1 leading-[1.8]"><span className="text-[var(--accent)]/60 font-mono text-[12px] mt-0.5 shrink-0">{l.match(/^\d+/)![0]}.</span><span>{renderInline(l.replace(/^\d+\.\s*/, ''))}</span></div>;
    if (l.startsWith('<!--')) return null;
    if (l.trim() === '') return <div key={k} className="h-3" />;
    return <p key={k} className="text-[14px] text-[var(--text-primary)] leading-[1.85]">{renderInline(l)}</p>;
  });
}

/* ═══════════════════════════════════════════════════════════
   TYPING INPUT — char-by-char animation
   ═══════════════════════════════════════════════════════════ */

function TypingInput({ text, onDone }: { text: string; onDone: () => void }) {
  const [typed, setTyped] = useState(0);
  const doneRef = useRef(false);
  const typedRef = useRef(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let frame: number;
    const charDelay = () => 35 + Math.random() * 40; // 35-75ms
    let nextAt = performance.now() + 300; // initial pause
    typedRef.current = 0;
    doneRef.current = false;

    const tick = (now: number) => {
      if (now >= nextAt && typedRef.current < text.length) {
        typedRef.current += 1;
        setTyped(typedRef.current);
        if (typedRef.current >= text.length && !doneRef.current) {
          doneRef.current = true;
          setTimeout(() => onDoneRef.current(), 600);
        }
        nextAt = now + charDelay();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}
      className="flex items-start gap-3 px-5 py-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] w-full">
      <div className="w-6 h-6 rounded-full bg-[var(--text-primary)] flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-[var(--bg)] text-[10px] font-bold">나</span>
      </div>
      <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">
        {text.slice(0, typed)}
        {typed < text.length && <span className="inline-block w-[2px] h-[16px] bg-[var(--accent)] ml-0.5 align-middle animate-pulse" />}
      </p>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TEAM ENTRANCE — stagger avatars
   ═══════════════════════════════════════════════════════════ */

function TeamEntrance({ scenario, onDone }: { scenario: DemoScenario; onDone: () => void }) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), 2500);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
      className="rounded-xl bg-[var(--accent)]/[0.03] border border-[var(--accent)]/10 p-4 space-y-2.5">
      {scenario.team.map((p, i) => (
        <motion.div key={p.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 + i * 0.3, duration: 0.4, ease: EASE }}
          className="flex items-center gap-3">
          <WorkerAvatar persona={p} size="sm" />
          <span className="text-[13px] font-medium text-[var(--text-primary)]">{p.name}</span>
          <span className="text-[11px] text-[var(--text-tertiary)]">{p.role}</span>
        </motion.div>
      ))}
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.4 }}
        className="text-[11px] text-[var(--text-tertiary)] pt-1">
        팀이 구성되었습니다. 상황을 분석합니다...
      </motion.p>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TEAM ENTRANCE TRIGGER — desktop invisible timing bridge
   ═══════════════════════════════════════════════════════════ */

function TeamEntranceTrigger({ onDone }: { onDone: () => void }) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), 1500);
    return () => clearTimeout(t);
  }, []);
  return null;
}

/* ═══════════════════════════════════════════════════════════
   ANALYSIS CARD — with diff highlights (from LiveAnalysis)
   ═══════════════════════════════════════════════════════════ */

function DemoAnalysisCard({ snapshot, prevSnapshot }: {
  snapshot: AnalysisSnapshot;
  prevSnapshot: AnalysisSnapshot | null;
}) {
  const hasChanges = prevSnapshot && snapshot.version > (prevSnapshot.version ?? 0);
  const questionChanged = hasChanges && prevSnapshot.real_question !== snapshot.real_question;

  const skeletonDiff = hasChanges
    ? diffItems(prevSnapshot.skeleton, snapshot.skeleton)
    : snapshot.skeleton.map(s => ({ text: s, status: 'same' as const }));
  const assumptionDiff = hasChanges
    ? diffItems(prevSnapshot.hidden_assumptions, snapshot.hidden_assumptions)
    : snapshot.hidden_assumptions.map(a => ({ text: a, status: 'same' as const }));

  const newCount = skeletonDiff.filter(d => d.status === 'new').length + assumptionDiff.filter(d => d.status === 'new').length;
  const removedCount = skeletonDiff.filter(d => d.status === 'removed').length + assumptionDiff.filter(d => d.status === 'removed').length;

  return (
    <motion.div
      initial={prevSnapshot ? { opacity: 0.85 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prevSnapshot ? 0.3 : 0.6, ease: EASE }}
      className="rounded-2xl">
      <div className="rounded-2xl p-[1px] bg-gradient-to-b from-[var(--accent)]/20 to-[var(--accent)]/5">
        <div className="rounded-[calc(1rem-1px)] bg-[var(--surface)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
          <div className="h-[2px]" style={{ background: 'var(--gradient-gold)' }} />
          <div className="p-5 md:p-7">
            {/* Version progress — shows accumulation */}
            {snapshot.version > 0 && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: snapshot.version + 1 }, (_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${
                      i <= snapshot.version ? 'bg-[var(--accent)]' : 'bg-[var(--border-subtle)]'
                    } ${i === snapshot.version ? 'w-6' : 'w-1.5'}`} />
                  ))}
                </div>
                <span className="text-[12px] font-medium text-[var(--accent)]">
                  {snapshot.version === 1 ? 'Updated with your answer' : `Refined ${snapshot.version}x`}
                </span>
                {hasChanges && (newCount > 0 || removedCount > 0) && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                    {newCount > 0 && `+${newCount}`}{newCount > 0 && removedCount > 0 && ' '}{removedCount > 0 && `−${removedCount}`}
                  </span>
                )}
              </motion.div>
            )}

            {/* Eyebrow */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-[0.15em] rounded-full bg-[var(--accent)]/8 px-2.5 py-0.5">Real Question</span>
            </div>

            {/* Real question with change */}
            <div className="mb-4">
              {questionChanged && (
                <div className="mb-2 px-3 py-1.5 rounded-lg bg-[var(--bg)]/60 border-l-2 border-[var(--text-tertiary)]/20">
                  <p className="text-[12px] text-[var(--text-tertiary)] line-through leading-relaxed"
                    style={{ fontFamily: 'var(--font-display)' }}>
                    {prevSnapshot.real_question}
                  </p>
                </div>
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

            {/* Insight — the most quotable line */}
            <AnimatePresence>
              {snapshot.insight && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.4, ease: EASE }} className="overflow-hidden mb-5">
                  <div className="px-4 py-3 rounded-xl bg-[var(--accent)]/[0.06] border border-[var(--accent)]/12">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Sparkles size={11} className="text-[var(--accent)]" />
                      <span className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-[0.15em]">Insight</span>
                    </div>
                    <p className="text-[13px] text-[var(--text-primary)] leading-relaxed font-medium">{snapshot.insight}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Framework — the actionable structure */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg)]/40 p-4 md:p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--accent)] mb-3 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[9px]">📐</span>
                Framework
              </p>
              <div className="space-y-1.5">
                <AnimatePresence>
                  {skeletonDiff.filter(d => d.status === 'removed').map((d, i) => (
                    <motion.div key={`removed-s-${i}`} initial={{ opacity: 0.5 }} animate={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.8, ease: EASE }}
                      className="text-[13px] text-red-300 line-through leading-relaxed overflow-hidden pl-3 border-l-2 border-red-200">
                      {d.text}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {skeletonDiff.filter(d => d.status !== 'removed').map((d, i) => (
                  <motion.div key={`${snapshot.version}-s${i}`} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.35, ease: EASE }}
                    className={`flex items-start gap-3 text-[13px] leading-[1.75] py-1 transition-colors duration-1000 ${
                      d.status === 'new' ? 'text-[var(--text-primary)] font-medium bg-emerald-50/40 dark:bg-emerald-900/10 rounded-lg px-2 -mx-2' : 'text-[var(--text-primary)]'
                    }`}>
                    <span className={`font-mono text-[11px] w-4 text-center shrink-0 mt-0.5 rounded ${
                      d.status === 'new' ? 'text-emerald-500 font-bold' : 'text-[var(--accent)]/50 bg-[var(--accent)]/[0.06]'
                    }`}>{d.status === 'new' ? '✦' : `${i + 1}`}</span>
                    <span>{d.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   QUESTION CARD — select only, no free text in demo
   ═══════════════════════════════════════════════════════════ */

function DemoQuestionCard({ text, subtext, options, onSelect }: {
  text: string;
  subtext?: string;
  options: string[];
  onSelect: (v: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const go = (v: string) => { if (selected) return; setSelected(v); setTimeout(() => onSelect(v), 300); };

  // Use 2x2 grid if all options are short (< 20 chars), otherwise 4x1 stack
  const useGrid = options.every(o => o.length < 20);

  return (
    <motion.div initial={{ opacity: 0, y: 12, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: EASE }}
      className="rounded-xl bg-[var(--accent)]/[0.03] border border-[var(--accent)]/15 p-5 md:p-6">
      <div className="mb-4">
        <p className="text-[16px] md:text-[17px] font-bold text-[var(--text-primary)] leading-snug tracking-tight">{text}</p>
        {subtext && <p className="mt-2 text-[13px] text-[var(--text-secondary)] leading-relaxed">{subtext}</p>}
      </div>
      <div className={useGrid ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
        {options.map((opt, i) => (
          <motion.button key={i} onClick={() => go(opt)} disabled={!!selected} whileTap={{ scale: 0.97 }}
            className={`w-full text-left px-4 py-3 rounded-xl text-[13px] leading-snug border cursor-pointer ${
              selected === opt ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-primary)] font-semibold shadow-sm' :
              selected ? 'border-[var(--border-subtle)] text-[var(--text-tertiary)] opacity-20 scale-[0.98]' :
              'border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/[0.03]'
            }`} style={{ transitionProperty: 'all', transitionDuration: '350ms', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}>{opt}</motion.button>
        ))}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   WORKER MINI BAR — inline status indicator
   ═══════════════════════════════════════════════════════════ */

function WorkerMiniBar({ scenario, visibleCount }: { scenario: DemoScenario; visibleCount: number }) {
  const total = scenario.workers.length;
  const pct = total > 0 ? Math.round((visibleCount / total) * 100) : 0;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}
      className="rounded-xl bg-[var(--bg)] border border-[var(--border-subtle)] overflow-hidden">
      {/* Progress bar */}
      <div className="h-[2px] bg-[var(--border-subtle)]">
        <motion.div className="h-full" style={{ background: 'var(--gradient-gold)' }}
          initial={{ width: '0%' }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: EASE }} />
      </div>
      <div className="flex items-center gap-3 px-4 py-2.5">
        {scenario.workers.map((w, i) => (
          <div key={w.persona.id} className="flex items-center gap-1.5">
            <WorkerAvatar persona={w.persona} size="sm" pulse={i >= visibleCount} />
            <span className={`text-[11px] transition-colors duration-300 ${i < visibleCount ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-tertiary)]'}`}>
              {w.persona.name}
            </span>
            {i < visibleCount && <Check size={10} className="text-emerald-500" />}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   WORKER REPORT — inline report block
   ═══════════════════════════════════════════════════════════ */

function DemoWorkerReport({ worker }: { worker: DemoScenario['workers'][number] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
      <div className="flex items-start gap-3">
        <div className="w-[3px] self-stretch rounded-full mt-1 shrink-0" style={{ backgroundColor: worker.persona.color + '40' }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <WorkerAvatar persona={worker.persona} size="sm" />
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">{worker.persona.name}</span>
            <span className="text-[11px] text-[var(--text-tertiary)]">{worker.persona.role}</span>
          </div>
          <p className="text-[11px] text-[var(--accent)] mb-2 pl-0.5">{worker.task}</p>
          {worker.completionNote && (
            <p className="text-[12px] text-[var(--text-secondary)] mb-2 italic pl-0.5">
              &ldquo;{worker.completionNote}&rdquo;
            </p>
          )}
          <div className="text-[13px] leading-[1.75] rounded-xl p-4 bg-[var(--bg)]/60 text-[var(--text-primary)] space-y-0.5">
            {renderMd(worker.result)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   AGENT SIDEBAR — right panel showing agent status + results
   ═══════════════════════════════════════════════════════════ */

type AgentStatus = 'waiting' | 'working' | 'done';

function getAgentStatuses(phase: DemoPhase, visibleWorkers: number, total: number): AgentStatus[] {
  if (!phaseGte(phase, 'analysis')) return Array(total).fill('waiting');
  if (phase === 'analysis') return ['working', 'waiting', 'waiting'].slice(0, total) as AgentStatus[];
  if (phase === 'q1') return ['working', 'working', 'waiting'].slice(0, total) as AgentStatus[];
  if (phase === 'update1') return ['working', 'working', 'waiting'].slice(0, total) as AgentStatus[];
  if (phase === 'q2' || phase === 'update2') return Array(total).fill('working') as AgentStatus[];
  // workers phase onward: done based on visibleWorkers
  return Array.from({ length: total }, (_, i) => i < visibleWorkers ? 'done' : 'working') as AgentStatus[];
}

function AgentRow({ worker, status, expanded, onToggle, index = 0 }: {
  worker: DemoScenario['workers'][number];
  status: AgentStatus;
  expanded: boolean;
  onToggle: () => void;
  index?: number;
}) {
  const isDone = status === 'done';
  const isWorking = status === 'working';

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.15, duration: 0.4, ease: EASE }}
      className={`rounded-xl border transition-colors duration-300 ${
        isDone ? 'border-[var(--border-subtle)] bg-[var(--surface)]' :
        isWorking ? 'border-[var(--accent)]/15 bg-[var(--accent)]/[0.02]' :
        'border-transparent bg-transparent opacity-40'
      }`}
    >
      <button
        onClick={isDone ? onToggle : undefined}
        className={`w-full flex items-center gap-3 p-3 ${isDone ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[13px] ${
            isWorking ? 'animate-pulse' : ''
          }`}
          style={{ backgroundColor: worker.persona.color + '20', color: worker.persona.color }}
        >
          {worker.persona.emoji}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{worker.persona.name}</span>
            <span className="text-[11px] text-[var(--text-tertiary)] truncate">{worker.persona.role}</span>
          </div>
          {isWorking && (
            <p className="text-[11px] text-[var(--accent)] mt-0.5 truncate">{worker.task}</p>
          )}
          {isDone && worker.completionNote && (
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 italic truncate">
              &ldquo;{worker.completionNote}&rdquo;
            </p>
          )}
        </div>
        {status === 'waiting' && <span className="text-[10px] text-[var(--text-tertiary)] shrink-0">standby</span>}
        {isWorking && <Loader2 size={14} className="animate-spin text-[var(--accent)] shrink-0" />}
        {isDone && (
          <ChevronDown size={14} className={`text-[var(--text-tertiary)] shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Expandable result */}
      <AnimatePresence>
        {expanded && isDone && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 border-t border-[var(--border-subtle)] mt-0">
              <div className="pt-3 text-[12px] leading-[1.75] max-h-[300px] overflow-y-auto text-[var(--text-primary)] space-y-0.5">
                {renderMd(worker.result)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DemoAgentSidebar({ scenario, phase, visibleWorkers }: {
  scenario: DemoScenario;
  phase: DemoPhase;
  visibleWorkers: number;
}) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const total = scenario.workers.length;
  const statuses = getAgentStatuses(phase, visibleWorkers, total);
  const doneCount = statuses.filter(s => s === 'done').length;
  const workingCount = statuses.filter(s => s === 'working').length;
  const progressPct = phaseGte(phase, 'draft') ? 100 :
    phaseGte(phase, 'workers') ? Math.round((doneCount / total) * 100) :
    phaseGte(phase, 'q1') ? Math.round((workingCount / total) * 30) : 0;

  return (
    <div className="p-4 space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">Analysis Team</span>
        {phase === 'analysis' && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="text-[11px] text-[var(--text-tertiary)] font-medium">assembling</motion.span>
        )}
        {workingCount > 0 && phaseGte(phase, 'q1') && !phaseGte(phase, 'draft') && (
          <span className="text-[11px] text-[var(--accent)] font-medium">{workingCount} analyzing</span>
        )}
        {phaseGte(phase, 'draft') && (
          <span className="text-[11px] text-emerald-500 font-medium">Done</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-[2px] bg-[var(--border-subtle)] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--gradient-gold)' }}
          initial={{ width: '0%' }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.6, ease: EASE }}
        />
      </div>

      {/* Agent rows */}
      <div className="space-y-2">
        {scenario.workers.map((w, i) => (
          <AgentRow
            key={w.persona.id}
            worker={w}
            status={statuses[i]}
            expanded={expandedIdx === i}
            onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MOBILE AGENT COMPACT BAR — shown below analysis on mobile
   ═══════════════════════════════════════════════════════════ */

function DemoAgentCompactBar({ scenario, phase, visibleWorkers }: {
  scenario: DemoScenario;
  phase: DemoPhase;
  visibleWorkers: number;
}) {
  if (!phaseGte(phase, 'q1')) return null;
  const total = scenario.workers.length;
  const statuses = getAgentStatuses(phase, visibleWorkers, total);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)]"
    >
      <div className="flex -space-x-1.5">
        {scenario.workers.map((w, i) => (
          <div
            key={w.persona.id}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] border-2 border-[var(--surface)] ${
              statuses[i] === 'working' ? 'animate-pulse' : statuses[i] === 'waiting' ? 'opacity-30' : ''
            }`}
            style={{ backgroundColor: w.persona.color + '20' }}
          >
            {w.persona.emoji}
          </div>
        ))}
      </div>
      <span className="text-[10px] text-[var(--text-secondary)] flex-1">
        {statuses.every(s => s === 'done') ? 'Analysis done' :
         `${statuses.filter(s => s === 'working').length} analyzing...`}
      </span>
      {statuses.some(s => s === 'working') && (
        <Loader2 size={11} className="animate-spin text-[var(--accent)]" />
      )}
      {statuses.every(s => s === 'done') && (
        <Check size={11} className="text-emerald-500" />
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DRAFT CARD — mix preview
   ═══════════════════════════════════════════════════════════ */

function DemoDraftCard({ draft }: { draft: DemoScenario['draft'] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
      <div className="rounded-2xl p-[1px] bg-gradient-to-b from-[var(--accent)]/20 to-transparent">
        <div className="rounded-[calc(1rem-1px)] bg-[var(--surface)]">
          <div className="h-[2px]" style={{ background: 'var(--gradient-gold)' }} />
          <div className="p-5 md:p-8 space-y-5">
            <span className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-[0.2em] bg-[var(--accent)]/8 px-3 py-1 rounded-full">Draft</span>
            <h2 className="text-[20px] md:text-[24px] font-bold text-[var(--text-primary)] leading-tight">{draft.title}</h2>
            <blockquote className="border-l-[3px] border-[var(--accent)]/20 pl-5 text-[14px] text-[var(--text-secondary)] italic leading-relaxed">
              {renderInline(draft.executive_summary)}
            </blockquote>
            {draft.sections.slice(0, 3).map((s, i) => (
              <div key={i}>
                <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-1.5">{s.heading}</h3>
                <p className="text-[13px] text-[var(--text-primary)] leading-[1.8]">{renderInline(s.content)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DM FEEDBACK — with interactive toggles
   ═══════════════════════════════════════════════════════════ */

function DemoDMFeedback({ fb, onToggle, onDone, showDoneButton = true }: {
  fb: DemoScenario['dmVariants'][string];
  onToggle: (i: number) => void;
  onDone: () => void;
  showDoneButton?: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
      <div className="rounded-2xl md:rounded-[2rem] p-[1px] bg-gradient-to-b from-[var(--border-subtle)] to-transparent">
        <div className="rounded-[calc(1rem-1px)] md:rounded-[calc(2rem-1px)] bg-[var(--surface)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
          <div className="p-5 md:p-8 space-y-6">
            {/* Persona — bigger, more prominent */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[var(--accent)]/8 flex items-center justify-center">
                <UserCheck size={22} className="text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-[17px] font-bold text-[var(--text-primary)]">{fb.persona_name}</p>
                <p className="text-[13px] text-[var(--text-tertiary)]">{fb.persona_role}</p>
              </div>
            </div>

            {/* Reaction — larger, more impactful */}
            <blockquote className="text-[17px] md:text-[18px] text-[var(--text-primary)] leading-[1.6] italic pl-5 border-l-[3px] border-[var(--accent)]/20">
              &ldquo;{fb.first_reaction}&rdquo;
            </blockquote>

            {/* Good parts */}
            {fb.good_parts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Check size={11} className="text-emerald-600" />
                  </div>
                  <h4 className="text-[13px] font-bold text-emerald-700 dark:text-emerald-400">Good</h4>
                </div>
                {fb.good_parts.map((g, i) => (
                  <p key={i} className="text-[14px] text-[var(--text-secondary)] flex items-start gap-2.5 mb-2 leading-relaxed pl-7">
                    {g}
                  </p>
                ))}
              </div>
            )}

            {/* Concerns with toggles */}
            {fb.concerns.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <span className="text-[11px] text-amber-600">!</span>
                  </div>
                  <h4 className="text-[13px] font-bold text-amber-700 dark:text-amber-400">Concerns</h4>
                  <span className="text-[11px] text-[var(--text-tertiary)]">— toggle to apply</span>
                </div>
                <div className="space-y-3">
                  {fb.concerns.map((c: DMConcern, i: number) => (
                    <div key={i} className={`rounded-2xl border p-4 transition-all duration-500 ${
                      c.applied ? 'border-[var(--accent)]/20 bg-[var(--accent)]/[0.02]' : 'border-[var(--border-subtle)] bg-[var(--bg)]'
                    }`} style={{ transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}>
                      <div className="flex items-start gap-2.5 mb-2">
                        <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 mt-0.5 ${
                          c.severity === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : c.severity === 'important' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>{c.severity === 'critical' ? 'Required' : c.severity === 'important' ? 'Suggested' : 'Note'}</span>
                        <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">{c.text}</p>
                      </div>
                      <p className="text-[13px] text-[var(--accent)] leading-relaxed mb-3 pl-1">&rarr; {c.fix_suggestion}</p>
                      <div className="flex items-center justify-end">
                        <button onClick={() => onToggle(i)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium cursor-pointer transition-all duration-300 ${
                            c.applied
                              ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                              : 'bg-[var(--bg)] text-[var(--text-tertiary)] border border-[var(--border-subtle)] hover:border-[var(--accent)]/30'
                          }`}>
                          {c.applied ? (
                            <><Check size={12} /> Applied</>
                          ) : (
                            <>Apply this fix</>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Would ask */}
            {fb.would_ask.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <span className="text-[11px] text-blue-600">?</span>
                  </div>
                  <h4 className="text-[13px] font-bold text-blue-700 dark:text-blue-400">Would also ask</h4>
                </div>
                {fb.would_ask.map((q, i) => (
                  <p key={i} className="text-[14px] text-[var(--text-secondary)] flex items-start gap-2.5 mb-2 leading-relaxed pl-7">
                    {q}
                  </p>
                ))}
              </div>
            )}

            {/* Approval condition — the punchline */}
            <div className="pt-5 mt-2 border-t border-[var(--border-subtle)]">
              <div className="rounded-xl bg-[var(--accent)]/[0.05] border border-[var(--accent)]/15 px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={13} className="text-[var(--accent)]" />
                  <h4 className="text-[12px] font-bold text-[var(--accent)] uppercase tracking-[0.1em]">Approval Condition</h4>
                </div>
                <p className="text-[16px] text-[var(--text-primary)] font-semibold leading-relaxed">{fb.approval_condition}</p>
              </div>
            </div>

            {/* Done button */}
            {showDoneButton && (
              <motion.button onClick={onDone} whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 text-white rounded-2xl text-[14px] font-semibold shadow-[var(--shadow-sm)] cursor-pointer"
                style={{ background: 'var(--gradient-gold)' }}>
                Apply and see final document <ChevronRight size={14} />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FINAL CARD — with variant swap
   ═══════════════════════════════════════════════════════════ */

function DemoFinalCard({ content, locale = 'ko' }: { content: string; locale?: 'ko' | 'en' }) {
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.9, ease: EASE }}>
      <div className="rounded-2xl md:rounded-[2rem] p-[2px] bg-gradient-to-b from-[var(--accent)]/30 via-[var(--accent)]/10 to-transparent shadow-[var(--shadow-xl)]">
        <div className="rounded-[calc(1rem-2px)] md:rounded-[calc(2rem-2px)] bg-[var(--surface)] shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]">
          <div className="h-[3px]" style={{ background: 'var(--gradient-gold)' }} />

          {/* Header with share actions */}
          <div className="px-5 md:px-7 py-4 flex items-center justify-between border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'var(--gradient-gold)' }}>
                <Check size={13} className="text-white" />
              </div>
              <div>
                <span className="text-[14px] font-semibold text-[var(--text-primary)]">{L('완성된 기획안', 'Final Document')}</span>
                <span className="text-[11px] text-[var(--text-tertiary)] ml-2">{L('바로 보낼 수 있어요', 'Ready to send')}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={handleCopy}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer transition-all duration-200 ${
                  copied ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-[var(--bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
                }`}>
                {copied ? <><Check size={12} /> {L('복사됨', 'Copied')}</> : <>{L('복사', 'Copy')}</>}
              </button>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[var(--bg)] text-[var(--text-secondary)] border border-[var(--border-subtle)] cursor-default opacity-60">
                Slack
              </button>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[var(--bg)] text-[var(--text-secondary)] border border-[var(--border-subtle)] cursor-default opacity-60">
                Email
              </button>
            </div>
          </div>

          {/* Document content — compact, readable */}
          <div className="p-5 md:p-8 space-y-1 text-[14px] leading-[1.8]">{renderMd(content)}</div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

type Locale = 'ko' | 'en';

interface InteractiveDemoProps {
  scenario: DemoScenario;
  locale?: Locale;
  onStartReal: () => void;
  onBack: () => void;
}

export function InteractiveDemo({ scenario, locale = 'ko', onStartReal, onBack }: InteractiveDemoProps) {
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  const [phase, setPhase] = useState<DemoPhase>('typing');
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Snapshot history
  const [snapshots, setSnapshots] = useState<AnalysisSnapshot[]>([]);
  const [q1Answer, setQ1Answer] = useState<string | null>(null);
  const [q2Answer, setQ2Answer] = useState<string | null>(null);
  const [dmKey, setDmKey] = useState<string>('ceo');
  const [concerns, setConcerns] = useState<DMConcern[]>([]);
  const [visibleWorkers, setVisibleWorkers] = useState(0);

  // Track for analytics
  const entryRef = useRef(Date.now());
  useEffect(() => {
    track('demo_enter', { scenario: scenario.id });
  }, [scenario.id]);

  // Auto-scroll on phase change (debounced to prevent flicker from parent re-renders)
  const lastScrollPhase = useRef<string>('');
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 150);
  }, []);

  useEffect(() => {
    const key = `${phase}-${visibleWorkers}`;
    if (key === lastScrollPhase.current) return;
    lastScrollPhase.current = key;
    scrollToBottom();
  }, [phase, visibleWorkers, scrollToBottom]);

  // Auto-advance for non-interactive phases
  const advance = useCallback((nextPhase: DemoPhase, delay: number) => {
    const t = setTimeout(() => setPhase(nextPhase), delay);
    return () => clearTimeout(t);
  }, []);

  // Phase: analysis → show v0 then pause at q1
  useEffect(() => {
    if (phase === 'analysis') {
      setSnapshots([scenario.analysis]);
      return advance('q1', 1200);
    }
  }, [phase, scenario.analysis, advance]);

  // Phase: update1 → apply Q1 patch, show diff, then pause at q2
  useEffect(() => {
    if (phase !== 'update1' || !q1Answer) return;
    const effect = scenario.q1.effects[q1Answer];
    if (effect) {
      setSnapshots(s => {
        const prev = s[s.length - 1];
        return [...s, applyPatch(prev, effect.snapshotPatch)];
      });
      setDmKey(effect.dmKey);
    }
    return advance('q2', 1500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, q1Answer]);

  // Phase: update2 → apply Q2 patch, show diff, then move to workers
  useEffect(() => {
    if (phase !== 'update2' || !q2Answer) return;
    const effect = scenario.q2.effects[q2Answer];
    if (effect) {
      setSnapshots(s => {
        const prev = s[s.length - 1];
        return [...s, applyPatch(prev, effect.snapshotPatch)];
      });
    }
    return advance('workers', 1500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, q2Answer]);

  // Phase: workers → stagger reveal
  useEffect(() => {
    if (phase !== 'workers') return;
    setVisibleWorkers(0);
    const total = scenario.workers.length;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const delays = [800, 1400, 2000]; // stagger
    for (let i = 0; i < total; i++) {
      timers.push(setTimeout(() => setVisibleWorkers(i + 1), delays[i]));
    }
    timers.push(setTimeout(() => setPhase('draft'), delays[total - 1] + 800));
    return () => timers.forEach(clearTimeout);
  }, [phase, scenario.workers.length]);

  // Phase: draft → initialize concerns (DM is triggered by CTA button, not auto-advance)
  useEffect(() => {
    if (phase === 'draft') {
      const dm = scenario.dmVariants[dmKey];
      if (dm) {
        setConcerns(dm.concerns.map(c => ({ ...c, applied: false })));
      }
    }
  }, [phase, scenario.dmVariants, dmKey]);

  // Handlers
  const handleQ1 = (v: string) => {
    setQ1Answer(v);
    track('demo_q1', { scenario: scenario.id, answer: v });
    setTimeout(() => setPhase('update1'), 400);
  };

  const handleQ2 = (v: string) => {
    setQ2Answer(v);
    track('demo_q2', { scenario: scenario.id, answer: v });
    setTimeout(() => setPhase('update2'), 400);
  };

  const handleToggle = (i: number) => {
    setConcerns(prev => prev.map((c, j) => j === i ? { ...c, applied: !c.applied } : c));
  };

  const handleDMDone = () => {
    track('demo_complete', {
      scenario: scenario.id,
      q1: q1Answer,
      q2: q2Answer,
      concerns_applied: concerns.filter(c => c.applied).length,
      time_ms: Date.now() - entryRef.current,
    });
    setPhase('final');
  };

  const currentSnapshot = snapshots[snapshots.length - 1] || null;
  const prevSnapshot = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;
  const dm = scenario.dmVariants[dmKey];
  const isDone = phase === 'final';
  const finalContent = buildFinal(scenario, concerns);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)] shrink-0 bg-[var(--surface)]/80 backdrop-blur-sm z-10">
        <button onClick={onBack} className="text-[12px] text-[var(--text-tertiary)] hover:text-[var(--accent)] cursor-pointer transition-colors">
          &larr; {L('돌아가기', 'Back')}
        </button>
        <span className="text-[11px] text-[var(--text-tertiary)]">
          {scenario.icon} {scenario.title} {L('데모', 'Demo')}
        </span>
        <div className="w-16" />
      </div>

      {/* Content: main (centered) + agent sidebar (floating right) */}
      <div className="relative flex-1 overflow-hidden">
        {/* Main column — stays centered */}
        <div ref={scrollRef} className="h-full overflow-y-auto">
          <div className="max-w-2xl mx-auto px-5 md:px-6 py-6 space-y-5">

            {/* 1. Typing input */}
            {phaseGte(phase, 'typing') && (
              <TypingInput text={scenario.problemText} onDone={() => setPhase('team')} />
            )}

            {/* 2. Team entrance — sidebar replaces this on desktop, keep for mobile timing */}
            <div className="lg:hidden">
              {phaseGte(phase, 'team') && (
                <TeamEntrance scenario={scenario} onDone={() => setPhase('analysis')} />
              )}
            </div>
            {/* Desktop: invisible trigger for team→analysis transition */}
            <div className="hidden lg:block">
              {phase === 'team' && <TeamEntranceTrigger onDone={() => setPhase('analysis')} />}
            </div>

            {/* 3. Analysis card (v0) */}
            {phaseGte(phase, 'analysis') && currentSnapshot && (
              <DemoAnalysisCard snapshot={currentSnapshot} prevSnapshot={prevSnapshot} />
            )}

            {/* Mobile: compact agent bar */}
            <div className="lg:hidden">
              <DemoAgentCompactBar scenario={scenario} phase={phase} visibleWorkers={visibleWorkers} />
            </div>

            {/* 4. Q1 */}
            {phase === 'q1' && (
              <DemoQuestionCard
                text={scenario.q1.question.text}
                subtext={scenario.q1.question.subtext}
                options={scenario.q1.question.options || []}
                onSelect={handleQ1}
              />
            )}

            {/* Q1 answer pill + team flow indicator */}
            {q1Answer && phaseGte(phase, 'update1') && (
              <div className="flex items-center gap-2 flex-wrap">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border-subtle)] text-[11px]">
                  <Check size={10} className="text-[var(--accent)]" />
                  <span className="text-[var(--text-primary)] font-medium">{q1Answer}</span>
                </motion.div>
                <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                  className="text-[10px] text-[var(--accent)]/60 flex items-center gap-1">
                  <ArrowRight size={9} /> {L('팀 분석에 반영', 'sent to team')}
                </motion.span>
              </div>
            )}

            {/* 5. Q2 */}
            {phase === 'q2' && (
              <DemoQuestionCard
                text={scenario.q2.question.text}
                subtext={scenario.q2.question.subtext}
                options={scenario.q2.question.options || []}
                onSelect={handleQ2}
              />
            )}

            {/* Q2 answer pill + team flow indicator */}
            {q2Answer && phaseGte(phase, 'update2') && (
              <div className="flex items-center gap-2 flex-wrap">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={SPRING}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border-subtle)] text-[11px]">
                  <Check size={10} className="text-[var(--accent)]" />
                  <span className="text-[var(--text-primary)] font-medium">{q2Answer}</span>
                </motion.div>
                <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                  className="text-[10px] text-[var(--accent)]/60 flex items-center gap-1">
                  <ArrowRight size={9} /> {L('팀 분석에 반영', 'sent to team')}
                </motion.span>
              </div>
            )}

          {/* 6. Team working — main column bridge between Q&A and draft */}
          {phaseGte(phase, 'workers') && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="rounded-xl border border-[var(--accent)]/15 bg-[var(--accent)]/[0.02] p-4 md:p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                  <Sparkles size={10} className="text-[var(--accent)]" />
                </div>
                <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                  {phaseGte(phase, 'draft')
                    ? L('팀 분석이 반영된 기획안이에요', 'The plan now includes team analysis')
                    : L('당신의 답변을 바탕으로 팀이 분석 중이에요', 'Team is analyzing based on your answers')}
                </span>
              </div>
              <div className="space-y-2">
                {scenario.workers.map((w, i) => {
                  const done = i < visibleWorkers;
                  return (
                    <motion.div
                      key={w.persona.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.2, duration: 0.3, ease: EASE }}
                      className="flex items-center gap-3"
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] shrink-0 ${
                        done ? '' : 'animate-pulse'
                      }`} style={{ backgroundColor: w.persona.color + '15' }}>
                        {w.persona.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] font-medium text-[var(--text-primary)]">{w.persona.name}</span>
                          <span className="text-[11px] text-[var(--text-tertiary)]">{w.persona.role}</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] truncate">{w.task}</p>
                      </div>
                      {done
                        ? <Check size={14} className="text-emerald-500 shrink-0" />
                        : <Loader2 size={14} className="animate-spin text-[var(--accent)] shrink-0" />
                      }
                    </motion.div>
                  );
                })}
              </div>
              {phaseGte(phase, 'draft') && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                  className="mt-3 pt-3 border-t border-[var(--accent)]/10 flex items-center gap-1.5">
                  <div className="flex -space-x-1.5">
                    {scenario.workers.map(w => (
                      <div key={w.persona.id} className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] border-2 border-[var(--surface)]"
                        style={{ backgroundColor: w.persona.color + '20' }}>{w.persona.emoji}</div>
                    ))}
                  </div>
                  <span className="text-[11px] text-[var(--accent)] font-medium">
                    {L('분석 결과가 아래 기획안에 반영되었어요', 'Analysis results are reflected in the plan below')}
                  </span>
                  <ArrowRight size={11} className="text-[var(--accent)]" />
                </motion.div>
              )}
            </motion.div>
          )}

          {/* 7. Draft */}
          {phaseGte(phase, 'draft') && (
            <DemoDraftCard draft={scenario.draft} />
          )}

          {/* CTA to enter DM feedback — replaces auto-transition */}
          {phase === 'draft' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0, duration: 0.5, ease: EASE }}
              className="text-center py-6">
              <p className="text-[13px] text-[var(--text-secondary)] mb-3">
                {L('초안이 완성됐어요. 이걸 받아본 사람은 뭐라고 할까요?', 'The draft is ready. What would the person who reads this say?')}
              </p>
              <motion.button
                onClick={() => setPhase('dm')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl text-[15px] font-semibold text-white cursor-pointer shadow-lg hover:shadow-xl transition-shadow"
                style={{ background: 'var(--gradient-gold)' }}
              >
                <UserCheck size={18} />
                {L('의사결정권자 반응 보기', 'See decision-maker reaction')}
                <ChevronRight size={15} />
              </motion.button>
            </motion.div>
          )}

          {/* 8. DM Feedback — new page feel */}
          {phaseGte(phase, 'dm') && dm && (
            <>
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
                className="text-center pt-4 pb-2">
                <h3 className="text-[18px] md:text-[20px] font-bold text-[var(--text-primary)] tracking-tight">
                  {L('의사결정권자의 반응', 'Decision-maker\'s reaction')}
                </h3>
                <p className="text-[13px] text-[var(--text-secondary)] mt-1">
                  {L('초안을 본 의사결정권자의 피드백이에요', 'Here\'s how the decision-maker reacted to your draft')}
                </p>
              </motion.div>
              <DemoDMFeedback
                fb={{ ...dm, concerns }}
                onToggle={handleToggle}
                onDone={handleDMDone}
                showDoneButton={phase !== 'final'}
              />
            </>
          )}

          {/* 9. Final */}
          {phase === 'final' && (
            <>
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: EASE }}
                className="flex items-center justify-center gap-2 py-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--gradient-gold)' }}>
                  <Check size={14} className="text-white" />
                </div>
                <p className="text-[14px] font-medium text-[var(--text-primary)]">
                  {concerns.filter(c => c.applied).length > 0
                    ? L(`피드백 ${concerns.filter(c => c.applied).length}건 반영 완료`, `${concerns.filter(c => c.applied).length} feedback item(s) applied`)
                    : L('초안 그대로 완성', 'Completed as-is')}
                </p>
              </motion.div>
              <AnimatePresence mode="wait">
                <DemoFinalCard key={concerns.map(c => c.applied ? '1' : '0').join('')} content={finalContent} locale={locale} />
              </AnimatePresence>
            </>
          )}

            <div ref={bottomRef} className="h-4" />
          </div>
        </div>

        {/* Agent sidebar — appears after analysis, floating right */}
        {phaseGte(phase, 'analysis') && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.6, ease: EASE }}
            className="hidden lg:block absolute top-0 right-4 xl:right-8 w-64 xl:w-72 pt-6 h-full"
          >
            <div className="sticky top-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] shadow-sm overflow-hidden">
              <DemoAgentSidebar scenario={scenario} phase={phase} visibleWorkers={visibleWorkers} />
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className={`shrink-0 border-t border-[var(--border-subtle)] bg-[var(--surface)] transition-all duration-500 ${
        isDone ? 'shadow-[var(--glow-gold)]' : ''
      }`}>
        {/* Phase progress dots */}
        <div className="max-w-2xl mx-auto px-5 pt-3 flex items-center justify-center gap-1.5">
          {(locale === 'ko' ? ['상황 파악', '질문', '팀 작업', '피드백', '완성'] : ['Analysis', 'Questions', 'Team Work', 'Feedback', 'Done']).map((label, i) => {
            const milestones: DemoPhase[] = ['analysis', 'q2', 'workers', 'dm', 'final'];
            const reached = phaseGte(phase, milestones[i]);
            const current = i === milestones.findIndex(m => !phaseGte(phase, m)) || (isDone && i === milestones.length - 1);
            return (
              <div key={i} className="flex items-center gap-1.5">
                {i > 0 && <div className={`w-4 h-px transition-colors duration-500 ${reached ? 'bg-[var(--accent)]/40' : 'bg-[var(--border-subtle)]'}`} />}
                <div className={`flex items-center gap-1 transition-all duration-300 ${current ? 'opacity-100' : reached ? 'opacity-60' : 'opacity-25'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${reached ? 'bg-[var(--accent)]' : 'bg-[var(--text-tertiary)]'}`} />
                  <span className={`text-[9px] ${current ? 'text-[var(--accent)] font-semibold' : 'text-[var(--text-tertiary)]'}`}>{label}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="max-w-2xl mx-auto px-5 pb-3 pt-2.5 flex items-center justify-between gap-3">
          <p className="text-[12px] text-[var(--text-secondary)]">
            {isDone ? L('내 상황으로 해보면 어떨까요?', 'Want to try with your own situation?') : ''}
          </p>
          <button onClick={onStartReal}
            className={`inline-flex items-center gap-2 px-6 py-3 text-white rounded-full text-[14px] font-semibold cursor-pointer min-h-[44px] transition-all duration-300 ${
              isDone ? 'shadow-[var(--glow-gold-intense)] hover:-translate-y-[1px]' : 'opacity-60 hover:opacity-90'
            }`}
            style={{ background: 'var(--gradient-gold)' }}>
            {L('내 상황으로 시작하기', 'Start with my situation')} <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

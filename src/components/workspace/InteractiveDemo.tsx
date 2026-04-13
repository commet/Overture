'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Sparkles, Check, ArrowRight, UserCheck, Loader2, ChevronDown } from 'lucide-react';
import { WorkerAvatar } from './progressive/WorkerAvatar';
import type { DemoScenario } from '@/lib/demo-data';
import { applyPatch, buildFinal } from '@/lib/demo-data';
import type { AnalysisSnapshot, DMConcern } from '@/stores/types';
import { track } from '@/lib/analytics';
import { EASE, SPRING } from './progressive/shared/constants';
import { renderInline, renderMd } from './progressive/shared/renderMd';
import { AnalysisCard } from './progressive/shared/AnalysisCard';
import { QuestionCard } from './progressive/shared/QuestionCard';
import { TypingDots, AvatarRipple, ShimmerBar, tickersFor } from './progressive/shared/AgentVisuals';

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
  | 'matching'
  | 'dm'
  | 'final';

const PHASE_ORDER: DemoPhase[] = ['typing', 'team', 'analysis', 'q1', 'update1', 'q2', 'update2', 'workers', 'draft', 'matching', 'dm', 'final'];
const phaseGte = (current: DemoPhase, target: DemoPhase) => PHASE_ORDER.indexOf(current) >= PHASE_ORDER.indexOf(target);

/* diffItems, renderInline, renderMd — imported from shared/ */

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

/* DemoAnalysisCard → replaced by shared AnalysisCard */

/* DemoQuestionCard → replaced by shared QuestionCard */

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

function AgentRow({ worker, status, expanded, onToggle }: {
  worker: DemoScenario['workers'][number];
  status: AgentStatus;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isDone = status === 'done';
  const isWorking = status === 'working';

  // Live activity ticker — rotates while working
  const tickers = tickersFor(worker.persona.id, worker.task);
  const [tickerIdx, setTickerIdx] = useState(0);
  useEffect(() => {
    if (!isWorking) return;
    const id = setInterval(() => {
      setTickerIdx(i => (i + 1) % tickers.length);
    }, 2200);
    return () => clearInterval(id);
  }, [isWorking, tickers.length]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 16, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -8, transition: { duration: 0.2 } }}
      transition={{ duration: 0.45, ease: EASE }}
      className={`rounded-xl border transition-all duration-300 relative overflow-hidden ${
        isDone ? 'border-emerald-300/50 dark:border-emerald-700/30 bg-emerald-50/30 dark:bg-emerald-950/10 shadow-sm' :
        isWorking ? 'border-[var(--accent)]/40 bg-[var(--accent)]/[0.07] shadow-[0_0_18px_-4px_rgba(180,160,100,0.25)]' :
        'border-transparent bg-transparent opacity-25'
      }`}
    >
      {isWorking && <ShimmerBar color={worker.persona.color} />}
      <button
        onClick={isDone ? onToggle : undefined}
        className={`w-full flex items-center gap-3 p-3 ${isDone ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className="relative shrink-0">
          {isWorking && <AvatarRipple color={worker.persona.color} />}
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] relative ${
              isWorking ? 'ring-2 ring-[var(--accent)]/25' : ''
            }`}
            style={{ backgroundColor: worker.persona.color + (isWorking ? '30' : '20'), color: worker.persona.color }}
          >
            {worker.persona.emoji}
          </div>
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{worker.persona.name}</span>
            <span className="text-[11px] text-[var(--text-tertiary)] truncate">{worker.persona.role}</span>
          </div>
          {isWorking && (
            <div className="mt-0.5 h-[15px] relative overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={tickerIdx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="text-[11px] truncate flex items-center gap-1.5 absolute inset-0"
                  style={{ color: worker.persona.color }}
                >
                  <span className="truncate">{tickers[tickerIdx]}</span>
                  <TypingDots color={worker.persona.color} />
                </motion.p>
              </AnimatePresence>
            </div>
          )}
          {isDone && worker.completionNote && (
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 italic truncate">
              &ldquo;{worker.completionNote}&rdquo;
            </p>
          )}
        </div>
        {status === 'waiting' && <span className="text-[9px] text-[var(--text-tertiary)]/50 shrink-0 uppercase tracking-wider">standby</span>}
        {isWorking && (
          <span className="inline-flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full bg-[var(--accent)]/12 text-[var(--accent)]">
            <Loader2 size={10} className="animate-spin" />
            <span className="text-[10px] font-semibold">live</span>
          </span>
        )}
        {isDone && (
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Check size={10} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            {expanded && <ChevronDown size={12} className="text-[var(--text-tertiary)] rotate-180 transition-transform duration-200" />}
          </div>
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
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--bg)] text-[10px] text-[var(--text-tertiary)] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)] animate-pulse" />
            assembling
          </motion.span>
        )}
        {workingCount > 0 && phaseGte(phase, 'q1') && !phaseGte(phase, 'draft') && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[10px] text-[var(--accent)] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            {workingCount} analyzing
          </span>
        )}
        {phaseGte(phase, 'draft') && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100/60 dark:bg-emerald-900/20 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            <Check size={10} />
            Complete
          </span>
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

      {/* Agent rows — sequentially revealed: only render once active (working/done) */}
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {scenario.workers.map((w, i) => {
            if (statuses[i] === 'waiting') return null;
            return (
              <AgentRow
                key={w.persona.id}
                worker={w}
                status={statuses[i]}
                expanded={expandedIdx === i}
                onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
              />
            );
          })}
        </AnimatePresence>

        {/* Pending hint — shows how many more will join */}
        {(() => {
          const pending = statuses.filter(s => s === 'waiting').length;
          if (pending === 0 || phaseGte(phase, 'workers')) return null;
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 px-3 pt-1 text-[10px] text-[var(--text-tertiary)]"
            >
              <span className="w-1 h-1 rounded-full bg-[var(--text-tertiary)]/40" />
              <span>{pending}명 더 합류 예정</span>
            </motion.div>
          );
        })()}
      </div>

      {/* Summary section — appears when all done */}
      <AnimatePresence>
        {phaseGte(phase, 'draft') && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-[var(--accent)]/15 bg-[var(--accent)]/[0.03] p-3.5 space-y-2">
              <div className="flex items-center gap-1.5">
                <Sparkles size={11} className="text-[var(--accent)]" />
                <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider">Summary</span>
              </div>
              {scenario.workers.map((w) => (
                <div key={w.persona.id} className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] shrink-0 mt-0.5"
                    style={{ backgroundColor: w.persona.color + '20' }}>{w.persona.emoji}</div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    {w.completionNote || w.task}
                  </p>
                </div>
              ))}
              <div className="pt-1.5 border-t border-[var(--accent)]/10">
                <p className="text-[10px] text-[var(--accent)]/70 flex items-center gap-1">
                  <ArrowRight size={8} />
                  아래 기획안에 반영됨
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
  if (!phaseGte(phase, 'analysis')) return null;
  const total = scenario.workers.length;
  const statuses = getAgentStatuses(phase, visibleWorkers, total);
  const activeWorkers = scenario.workers.filter((_, i) => statuses[i] !== 'waiting');
  const workingCount = statuses.filter(s => s === 'working').length;
  const allDone = statuses.every(s => s === 'done');

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)]"
    >
      <div className="flex -space-x-1.5">
        <AnimatePresence initial={false}>
          {activeWorkers.map((w) => {
            const idx = scenario.workers.indexOf(w);
            const isWorking = statuses[idx] === 'working';
            return (
              <motion.div
                key={w.persona.id}
                layout
                initial={{ opacity: 0, scale: 0.6, x: -8 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.35, ease: EASE }}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] border-2 border-[var(--surface)] ${
                  isWorking ? 'animate-pulse ring-1 ring-[var(--accent)]/30' : ''
                }`}
                style={{ backgroundColor: w.persona.color + '20' }}
              >
                {w.persona.emoji}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <span className="text-[10px] text-[var(--text-secondary)] flex-1 inline-flex items-center gap-1.5">
        {allDone ? 'Analysis done' : <>{workingCount}명 분석 중 <TypingDots /></>}
      </span>
      {workingCount > 0 && !allDone && (
        <Loader2 size={11} className="animate-spin text-[var(--accent)]" />
      )}
      {allDone && (
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

function DemoDMFeedback({ fb, onToggle, onDone, showDoneButton = true, locale = 'ko' }: {
  fb: DemoScenario['dmVariants'][string];
  onToggle: (i: number) => void;
  onDone: () => void;
  showDoneButton?: boolean;
  locale?: 'ko' | 'en';
}) {
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  const appliedCount = fb.concerns.filter(c => c.applied).length;

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
      <div className="rounded-2xl md:rounded-[2rem] bg-[var(--surface)] border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]">
        <div className="p-6 md:p-10 space-y-7">
          {/* Persona — single line, quiet */}
          <div className="flex items-center gap-2.5 text-[12px] text-[var(--text-tertiary)]">
            <div className="w-7 h-7 rounded-full bg-[var(--accent)]/8 flex items-center justify-center">
              <UserCheck size={13} className="text-[var(--accent)]" />
            </div>
            <span className="font-semibold text-[13px] text-[var(--text-primary)]">{fb.persona_name}</span>
            <span className="text-[var(--text-tertiary)]">·</span>
            <span>{fb.persona_role}</span>
          </div>

          {/* The reaction — main quote, no border decoration */}
          <blockquote className="text-[19px] md:text-[21px] text-[var(--text-primary)] leading-[1.55] font-medium tracking-[-0.005em]">
            &ldquo;{fb.first_reaction}&rdquo;
          </blockquote>

          {/* Concerns — the work area */}
          {fb.concerns.length > 0 && (
            <div className="pt-2">
              <div className="flex items-baseline justify-between mb-4">
                <h4 className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.12em]">
                  {L('수정 요청', 'Revisions')} <span className="text-[var(--text-tertiary)]/60">({fb.concerns.length})</span>
                </h4>
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  {appliedCount > 0
                    ? L(`${appliedCount}건 반영됨`, `${appliedCount} applied`)
                    : L('반영할 항목을 선택하세요', 'Select to apply')}
                </span>
              </div>
              <div className="space-y-2.5">
                {fb.concerns.map((c: DMConcern, i: number) => (
                  <button
                    key={i}
                    onClick={() => onToggle(i)}
                    className={`group w-full text-left rounded-2xl border p-4 md:p-5 cursor-pointer transition-all duration-500 ${
                      c.applied
                        ? 'border-[var(--accent)]/30 bg-[var(--accent)]/[0.04]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg)] hover:border-[var(--accent)]/30 hover:bg-[var(--accent)]/[0.02]'
                    }`}
                    style={{ transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Toggle indicator */}
                      <div className={`mt-0.5 w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-all duration-300 ${
                        c.applied
                          ? 'bg-[var(--accent)] border-[var(--accent)]'
                          : 'border-[var(--border-strong)] group-hover:border-[var(--accent)]/60'
                      }`}>
                        {c.applied && <Check size={11} strokeWidth={3} className="text-white" />}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] md:text-[15px] text-[var(--text-primary)] leading-[1.55] font-medium">
                          {c.text}
                        </p>
                        <p className="text-[12px] md:text-[13px] text-[var(--text-secondary)] leading-[1.55] mt-1.5">
                          {c.fix_suggestion}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Approval condition — quiet closing line */}
          <div className="pt-2">
            <p className="text-[10px] font-bold text-[var(--accent)]/80 uppercase tracking-[0.14em] mb-2">
              {L('결정 조건', 'Decision condition')}
            </p>
            <p className="text-[14px] md:text-[15px] text-[var(--text-primary)] leading-[1.6]">
              {fb.approval_condition}
            </p>
          </div>

          {/* Done button */}
          {showDoneButton && (
            <motion.button onClick={onDone} whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 text-white rounded-2xl text-[14px] font-semibold shadow-[var(--shadow-sm)] cursor-pointer mt-2"
              style={{ background: 'var(--gradient-gold)' }}>
              {L('반영하고 최종 문서 보기', 'Apply and see final document')} <ChevronRight size={14} />
            </motion.button>
          )}
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
   DM MATCHING TRANSITION — bridge between draft and dm
   ═══════════════════════════════════════════════════════════ */

function DMMatchingTransition({ personaName, personaRole, locale, onDone }: {
  personaName: string;
  personaRole: string;
  locale: 'ko' | 'en';
  onDone: () => void;
}) {
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const [step, setStep] = useState(0);

  const steps = [
    L('초안 검토 중', 'Reading the draft'),
    L('결정 맥락 추출', 'Extracting decision context'),
    L('의사결정권자 페르소나 매칭', 'Matching decision-maker persona'),
  ];

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 100);
    const t2 = setTimeout(() => setStep(2), 800);
    const t3 = setTimeout(() => setStep(3), 1500);
    const t4 = setTimeout(() => setStep(4), 2300);
    const t5 = setTimeout(() => onDoneRef.current(), 3300);
    return () => { [t1, t2, t3, t4, t5].forEach(clearTimeout); };
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
      className="rounded-2xl md:rounded-[2rem] p-[1px] bg-gradient-to-b from-[var(--border-subtle)] to-transparent">
      <div className="rounded-[calc(1rem-1px)] md:rounded-[calc(2rem-1px)] bg-[var(--surface)] p-8 md:p-10 min-h-[280px] flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {step < 4 ? (
            <motion.div key="steps"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="w-full max-w-sm space-y-3.5"
            >
              {steps.map((label, i) => {
                const reached = step > i + 1;
                const active = step === i + 1;
                const dim = step < i + 1;
                return (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: dim ? 0.3 : 1, x: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="flex items-center gap-3"
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-500 ${
                      reached ? 'bg-[var(--accent)]' : active ? 'bg-[var(--accent)]/15 border border-[var(--accent)]/40' : 'bg-[var(--border-subtle)]'
                    }`}>
                      {reached ? (
                        <Check size={11} className="text-white" />
                      ) : active ? (
                        <motion.div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"
                          animate={{ scale: [0.6, 1.2, 0.6], opacity: [0.6, 1, 0.6] }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      ) : null}
                    </div>
                    <span className={`text-[13px] transition-colors duration-500 ${
                      reached || active ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-tertiary)]'
                    }`}>
                      {label}{active ? '...' : ''}
                    </span>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div key="reveal"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="flex flex-col items-center text-center gap-4"
            >
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.6, ease: EASE }}
                className="w-16 h-16 rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/25 flex items-center justify-center"
              >
                <UserCheck size={28} className="text-[var(--accent)]" />
              </motion.div>
              <div>
                <p className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-[0.18em] mb-1.5">
                  {L('매칭 완료', 'Matched')}
                </p>
                <p className="text-[18px] font-bold text-[var(--text-primary)]">{personaName}</p>
                <p className="text-[13px] text-[var(--text-tertiary)] mt-0.5">{personaRole}</p>
              </div>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.4 }}
                className="text-[12px] text-[var(--text-secondary)] mt-2 flex items-center gap-2"
              >
                <TypingDots />
                <span>{L('가상 피드백을 생성하는 중', 'Generating simulated feedback')}</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
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
  const dmRef = useRef<HTMLDivElement>(null);
  const matchingRef = useRef<HTMLDivElement>(null);

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
    // DM page transition: scroll to DM section top instead of bottom
    if (phase === 'dm') {
      setTimeout(() => {
        dmRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    } else if (phase === 'matching') {
      setTimeout(() => {
        matchingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    } else {
      scrollToBottom();
    }
  }, [phase, visibleWorkers, scrollToBottom]);

  // Auto-advance for non-interactive phases
  const advance = useCallback((nextPhase: DemoPhase, delay: number) => {
    const t = setTimeout(() => setPhase(nextPhase), delay);
    return () => clearTimeout(t);
  }, []);

  // Phase: analysis → show v0, give 다은 visible solo time, then pause at q1
  useEffect(() => {
    if (phase === 'analysis') {
      setSnapshots([scenario.analysis]);
      return advance('q1', 2200);
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
              <AnalysisCard snapshot={currentSnapshot} prevSnapshot={prevSnapshot} locale={locale} team={scenario.team} />
            )}

            {/* Mobile: compact agent bar — hide after draft since sidebar summary / connector takes over */}
            <div className="lg:hidden">
              {!phaseGte(phase, 'draft') && (
                <DemoAgentCompactBar scenario={scenario} phase={phase} visibleWorkers={visibleWorkers} />
              )}
            </div>

            {/* 4. Q1 */}
            {phase === 'q1' && (
              <QuestionCard
                question={scenario.q1.question}
                onAnswer={handleQ1}
                allowFreeText={false}
                locale={locale}
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
              <QuestionCard
                question={scenario.q2.question}
                onAnswer={handleQ2}
                allowFreeText={false}
                locale={locale}
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

          {/* 6. Team status bar — smooth transition between states */}
          <AnimatePresence mode="wait">
            {phaseGte(phase, 'workers') && !phaseGte(phase, 'draft') && (
              <motion.div key="team-working"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6, transition: { duration: 0.25 } }}
                transition={{ duration: 0.4, ease: EASE }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--accent)]/[0.04] border border-[var(--accent)]/15"
              >
                <Loader2 size={14} className="animate-spin text-[var(--accent)] shrink-0" />
                <span className="text-[13px] text-[var(--text-primary)] font-medium">
                  {L('당신의 답변을 바탕으로 팀이 분석 중이에요', 'Team is analyzing based on your answers')}
                </span>
                <span className="text-[11px] text-[var(--accent)] font-semibold shrink-0">{visibleWorkers}/{scenario.workers.length}</span>
              </motion.div>
            )}
            {phase === 'draft' && (
              <motion.div key="team-done"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                transition={{ duration: 0.4, ease: EASE }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)]"
              >
                <div className="flex -space-x-1.5">
                  {scenario.workers.map(w => (
                    <div key={w.persona.id} className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] border-2 border-[var(--surface)]"
                      style={{ backgroundColor: w.persona.color + '20' }}>{w.persona.emoji}</div>
                  ))}
                </div>
                <span className="text-[12px] text-[var(--text-secondary)] flex-1">
                  {L('팀 분석 완료', 'Team analysis complete')}
                </span>
                <span className="hidden lg:flex text-[10px] text-[var(--accent)] font-medium items-center gap-1">
                  {L('우측 패널에서 확인', 'See right panel')} <ArrowRight size={9} />
                </span>
                <span className="lg:hidden">
                  <Check size={12} className="text-emerald-500" />
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 7-8. Draft → DM page transition (single AnimatePresence for sync) */}
          <AnimatePresence mode="wait">
            {phase === 'draft' && (
              <motion.div key="draft-page"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16, transition: { duration: 0.35, ease: EASE } }}
                transition={{ duration: 0.7, ease: EASE }}
              >
                <DemoDraftCard draft={scenario.draft} />

                {/* CTA to enter DM feedback */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0, duration: 0.5, ease: EASE }}
                  className="text-center py-6">
                  <p className="text-[13px] text-[var(--text-secondary)] mb-3">
                    {L('초안이 완성됐어요. 이걸 받아본 사람은 뭐라고 할까요?', 'The draft is ready. What would the person who reads this say?')}
                  </p>
                  <motion.button
                    onClick={() => setPhase('matching')}
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
              </motion.div>
            )}

            {phase === 'matching' && dm && (
              <motion.div key="matching-page" ref={matchingRef}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16, transition: { duration: 0.3, ease: EASE } }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                <DMMatchingTransition
                  personaName={dm.persona_name}
                  personaRole={dm.persona_role}
                  locale={locale}
                  onDone={() => setPhase('dm')}
                />
              </motion.div>
            )}

            {phaseGte(phase, 'dm') && dm && (
              <motion.div key="dm-page" ref={dmRef}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16, transition: { duration: 0.3, ease: EASE } }}
                transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
              >
                {/* Page divider */}
                <div className="flex items-center gap-4 py-4 mb-2">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/20 to-transparent" />
                  <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest">Next Step</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/20 to-transparent" />
                </div>

                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5, ease: EASE }}
                  className="text-center pb-4">
                  <h3 className="text-[20px] md:text-[22px] font-bold text-[var(--text-primary)] tracking-tight">
                    {L('의사결정권자의 반응', 'Decision-maker\'s reaction')}
                  </h3>
                  <p className="text-[13px] text-[var(--text-secondary)] mt-1.5">
                    {L('초안을 본 의사결정권자의 피드백이에요', 'Here\'s how the decision-maker reacted to your draft')}
                  </p>
                </motion.div>
                <DemoDMFeedback
                  fb={{ ...dm, concerns }}
                  onToggle={handleToggle}
                  onDone={handleDMDone}
                  showDoneButton={phase !== 'final'}
                  locale={locale}
                />
              </motion.div>
            )}
          </AnimatePresence>

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

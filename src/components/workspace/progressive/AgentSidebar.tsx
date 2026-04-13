'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, ChevronDown, Sparkles, ArrowRight } from 'lucide-react';
import { useWorkers } from './WorkerPanel';
import { WorkerAvatar } from './WorkerAvatar';
import type { WorkerTask } from '@/stores/types';
import { useAgentStore } from '@/stores/useAgentStore';
import { useLocale } from '@/hooks/useLocale';
import { EASE } from './shared/constants';
import { renderMd } from './shared/renderMd';
import { TypingDots, AvatarRipple, ShimmerBar, tickersFor } from './shared/AgentVisuals';

// ─── Status helpers ───

const PENDING_STATUSES = new Set<WorkerTask['status']>(['pending', 'ai_preparing']);

function isPending(w: WorkerTask) {
  return PENDING_STATUSES.has(w.status);
}

function isWorkingStatus(s: WorkerTask['status']) {
  return s === 'running' || s === 'sent' || s === 'waiting_response';
}

function StatusBadge({ worker, locale }: { worker: WorkerTask; locale: string }) {
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  if (isWorkingStatus(worker.status)) {
    return (
      <span className="inline-flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full bg-[var(--accent)]/12 text-[var(--accent)]">
        <Loader2 size={10} className="animate-spin" />
        <span className="text-[10px] font-semibold">live</span>
      </span>
    );
  }
  if (worker.status === 'done') {
    return (
      <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
        <Check size={10} className="text-emerald-600 dark:text-emerald-400" />
      </div>
    );
  }
  if (worker.status === 'waiting_input') {
    return (
      <span className="inline-flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
        <span className="text-[10px] font-medium">{L('입력 필요', 'Input')}</span>
      </span>
    );
  }
  if (worker.status === 'error') {
    return <span className="text-[9px] text-red-500 font-medium shrink-0">{L('오류', 'Error')}</span>;
  }
  return <span className="text-[9px] text-[var(--text-tertiary)]/50 shrink-0 uppercase tracking-wider">{L('대기', 'standby')}</span>;
}

// ─── Agent Row — DemoAgentSidebar style with real data ───

function AgentRow({ worker, expanded, onToggle, enterIndex }: {
  worker: WorkerTask;
  expanded: boolean;
  onToggle: () => void;
  enterIndex: number;
}) {
  const locale = useLocale();
  const isDone = worker.status === 'done';
  const isWorking = isWorkingStatus(worker.status);
  const isError = worker.status === 'error';

  const personaColor = worker.persona?.color || 'var(--accent)';
  const lv = worker.agent_id ? useAgentStore.getState().getAgent(worker.agent_id)?.level : undefined;

  // Live activity ticker — rotates while working, used as fallback when no stream_text
  const tickers = tickersFor(worker.persona?.id, worker.task);
  const [tickerIdx, setTickerIdx] = useState(0);
  useEffect(() => {
    if (!isWorking) return;
    const id = setInterval(() => {
      setTickerIdx(i => (i + 1) % tickers.length);
    }, 2200);
    return () => clearInterval(id);
  }, [isWorking, tickers.length]);

  // Use real streaming text when available; otherwise rotating ticker
  const streamSnippet = worker.stream_text?.trim().slice(-80);
  const liveLine = streamSnippet || tickers[tickerIdx];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 16, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -8, transition: { duration: 0.2 } }}
      transition={{ duration: 0.45, ease: EASE, delay: Math.min(enterIndex, 2) * 0.18 }}
      className={`rounded-xl border transition-all duration-300 relative overflow-hidden ${
        isDone ? 'border-emerald-300/50 dark:border-emerald-700/30 bg-emerald-50/30 dark:bg-emerald-950/10 shadow-sm' :
        isWorking ? 'border-[var(--accent)]/40 bg-[var(--accent)]/[0.07] shadow-[0_0_18px_-4px_rgba(180,160,100,0.25)]' :
        isError ? 'border-red-300/40 bg-red-50/20 dark:bg-red-950/10' :
        'border-[var(--border-subtle)] bg-[var(--surface)]'
      }`}
    >
      {isWorking && <ShimmerBar color={personaColor} />}
      <button
        onClick={isDone ? onToggle : undefined}
        className={`w-full flex items-center gap-3 p-3 ${isDone ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className="relative shrink-0">
          {isWorking && <AvatarRipple color={personaColor} />}
          <WorkerAvatar persona={worker.persona} size="sm" pulse={isWorking} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
              {worker.persona?.name || 'AI'}
            </span>
            {lv != null && lv >= 2 && (
              <span className="agent-lv" style={{ fontSize: 9, padding: '0px 5px' }} data-level={lv}>
                Lv.{lv}
              </span>
            )}
          </div>
          {isWorking && (
            <div className="mt-0.5 h-[15px] relative overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={streamSnippet ? 'stream' : `tick-${tickerIdx}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="text-[11px] truncate flex items-center gap-1.5 absolute inset-0"
                  style={{ color: personaColor }}
                >
                  <span className="truncate">{liveLine}</span>
                  <TypingDots color={personaColor} />
                </motion.p>
              </AnimatePresence>
            </div>
          )}
          {isDone && worker.completion_note && (
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 italic truncate">
              &ldquo;{worker.completion_note}&rdquo;
            </p>
          )}
          {!isWorking && !isDone && worker.task && (
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">{worker.task}</p>
          )}
        </div>
        <StatusBadge worker={worker} locale={locale} />
        {isDone && expanded && <ChevronDown size={12} className="text-[var(--text-tertiary)] rotate-180 transition-transform duration-200 shrink-0" />}
      </button>

      {/* Expandable result */}
      <AnimatePresence>
        {expanded && isDone && worker.result && (
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
              {worker.validation_score != null && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className={`text-[10px] font-medium ${worker.validation_passed ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {worker.validation_score}/100
                  </span>
                  {worker.validation_passed && <Check size={10} className="text-emerald-500" />}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main sidebar ───

export function AgentSidebar({ className }: { className?: string }) {
  const locale = useLocale();
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  const workers = useWorkers();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (workers.length === 0) return null;

  const doneCount = workers.filter(w => w.status === 'done').length;
  const runningCount = workers.filter(w => isWorkingStatus(w.status)).length;
  const waitingInputCount = workers.filter(w => w.status === 'waiting_input').length;
  const pendingCount = workers.filter(isPending).length;
  const allDone = doneCount === workers.length;
  const progressPct = workers.length > 0 ? Math.round((doneCount / workers.length) * 100) : 0;
  // Sequential reveal: hide pending workers from the sidebar — they slide in once active
  const visibleWorkers = workers.filter(w => !isPending(w));

  return (
    <div className={`p-4 space-y-3.5 ${className ?? ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
          {L('분석 팀', 'Analysis Team')}
        </span>
        {runningCount > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[10px] text-[var(--accent)] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            {runningCount} {L('분석 중', 'analyzing')}
            <TypingDots />
          </span>
        )}
        {waitingInputCount > 0 && runningCount === 0 && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[10px] text-[var(--accent)] font-medium">
            {L('입력 대기', 'Awaiting input')} {waitingInputCount}
          </span>
        )}
        {allDone && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100/60 dark:bg-emerald-900/20 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            <Check size={10} />
            {L('완료', 'Complete')}
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

      {/* Agent rows — sequential reveal: pending workers stay hidden until activated */}
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {visibleWorkers.map((w, i) => (
            <AgentRow
              key={w.id}
              worker={w}
              expanded={expandedId === w.id}
              onToggle={() => setExpandedId(expandedId === w.id ? null : w.id)}
              enterIndex={i}
            />
          ))}
        </AnimatePresence>

        {pendingCount > 0 && !allDone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 px-3 pt-1 text-[10px] text-[var(--text-tertiary)]"
          >
            <span className="w-1 h-1 rounded-full bg-[var(--text-tertiary)]/40" />
            <span>{L(`${pendingCount}명 더 합류 예정`, `${pendingCount} more joining`)}</span>
          </motion.div>
        )}
      </div>

      {/* Summary section — appears when all done */}
      <AnimatePresence>
        {allDone && (
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
                <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider">
                  {L('요약', 'Summary')}
                </span>
              </div>
              {workers.map(w => (
                <div key={w.id} className="flex items-start gap-2">
                  <WorkerAvatar persona={w.persona} size="sm" />
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    {w.completion_note || w.task}
                  </p>
                </div>
              ))}
              <div className="pt-1.5 border-t border-[var(--accent)]/10">
                <p className="text-[10px] text-[var(--accent)]/70 flex items-center gap-1">
                  <ArrowRight size={8} />
                  {L('아래 기획안에 반영됨', 'Reflected in the document below')}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

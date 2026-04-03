'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ChevronUp, X } from 'lucide-react';
import { useProgressiveStore } from '@/stores/useProgressiveStore';
import { WorkerCard } from './WorkerCard';
import { runWorkerTask, type WorkerContext } from '@/lib/worker-engine';

const EASE = [0.32, 0.72, 0, 1] as const;

// ─── Shared hook for worker data ───

export function useWorkers() {
  const session = useProgressiveStore(s => {
    const { sessions, currentSessionId } = s;
    return sessions.find(ss => ss.id === currentSessionId) || null;
  });
  return session?.workers ?? [];
}

export function useWorkerContext(): WorkerContext | null {
  const session = useProgressiveStore(s => {
    const { sessions, currentSessionId } = s;
    return sessions.find(ss => ss.id === currentSessionId) || null;
  });
  if (!session || session.snapshots.length === 0) return null;
  const latest = session.snapshots[session.snapshots.length - 1];
  return {
    problemText: session.problem_text,
    realQuestion: latest.real_question,
    skeleton: latest.skeleton,
    hiddenAssumptions: latest.hidden_assumptions,
    qaHistory: session.questions.map((q, i) => ({
      q: q.text,
      a: session.answers[i]?.value ?? '',
    })).filter(qa => qa.a),
  };
}

// ─── Desktop Panel ───

export function WorkerPanel({ className }: { className?: string }) {
  const workers = useWorkers();
  const context = useWorkerContext();
  const store = useProgressiveStore();

  const doneCount = workers.filter(w => w.status === 'done').length;
  const runningCount = workers.filter(w => w.status === 'running').length;
  const waitingCount = workers.filter(w => w.status === 'waiting_input').length;

  const handleSubmit = (id: string, input: string) => {
    store.submitHumanInput(id, input);
  };

  const handleRetry = async (id: string) => {
    const worker = workers.find(w => w.id === id);
    if (!worker || !context) return;

    store.updateWorker(id, { status: 'running', error: null, started_at: new Date().toISOString() });

    try {
      const result = await runWorkerTask(
        worker, context,
        (text) => store.setWorkerStreamText(id, text),
      );
      if (worker.who === 'both') {
        store.updateWorker(id, { status: 'waiting_input', result, stream_text: '', completed_at: null });
      } else {
        store.updateWorker(id, { status: 'done', result, stream_text: '', completed_at: new Date().toISOString() });
      }
    } catch (err) {
      store.updateWorker(id, { status: 'error', error: err instanceof Error ? err.message : '실패', stream_text: '' });
    }
  };

  if (workers.length === 0) return null;

  return (
    <div className={`p-4 space-y-3 ${className ?? ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-[var(--accent)]" />
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">작업자들</span>
          <span className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg)] px-2 py-0.5 rounded-full">
            {doneCount}/{workers.length}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-[var(--border-subtle)] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--gradient-gold)' }}
          initial={{ width: 0 }}
          animate={{ width: `${(doneCount / workers.length) * 100}%` }}
          transition={{ duration: 0.6, ease: EASE }}
        />
      </div>

      {/* Status summary */}
      <p className="text-[10px] text-[var(--text-secondary)]">
        {runningCount > 0 && `AI ${runningCount}개 진행 중`}
        {runningCount > 0 && waitingCount > 0 && ' · '}
        {waitingCount > 0 && `입력 대기 ${waitingCount}개`}
        {runningCount === 0 && waitingCount === 0 && doneCount === workers.length && '모든 작업 완료'}
        {runningCount === 0 && waitingCount === 0 && doneCount < workers.length && `대기 중 ${workers.length - doneCount}개`}
      </p>

      {/* Worker cards */}
      <div className="space-y-2">
        {/* Waiting input first (needs attention) */}
        {workers.filter(w => w.status === 'waiting_input').map(w => (
          <WorkerCard key={w.id} worker={w} onSubmitInput={handleSubmit} onRetry={handleRetry} />
        ))}
        {/* Running */}
        {workers.filter(w => w.status === 'running').map(w => (
          <WorkerCard key={w.id} worker={w} onRetry={handleRetry} />
        ))}
        {/* Pending */}
        {workers.filter(w => w.status === 'pending').map(w => (
          <WorkerCard key={w.id} worker={w} />
        ))}
        {/* Done */}
        {workers.filter(w => w.status === 'done').map(w => (
          <WorkerCard key={w.id} worker={w} />
        ))}
        {/* Error */}
        {workers.filter(w => w.status === 'error').map(w => (
          <WorkerCard key={w.id} worker={w} onRetry={handleRetry} />
        ))}
      </div>
    </div>
  );
}

// ─── Mobile Drawer ───

export function WorkerDrawer({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const workers = useWorkers();
  const context = useWorkerContext();
  const store = useProgressiveStore();

  const doneCount = workers.filter(w => w.status === 'done').length;
  const waitingCount = workers.filter(w => w.status === 'waiting_input').length;
  const runningCount = workers.filter(w => w.status === 'running').length;

  const handleSubmit = (id: string, input: string) => {
    store.submitHumanInput(id, input);
  };

  const handleRetry = async (id: string) => {
    const worker = workers.find(w => w.id === id);
    if (!worker || !context) return;
    store.updateWorker(id, { status: 'running', error: null, started_at: new Date().toISOString() });
    try {
      const result = await runWorkerTask(worker, context, (text) => store.setWorkerStreamText(id, text));
      if (worker.who === 'both') {
        store.updateWorker(id, { status: 'waiting_input', result, stream_text: '', completed_at: null });
      } else {
        store.updateWorker(id, { status: 'done', result, stream_text: '', completed_at: new Date().toISOString() });
      }
    } catch (err) {
      store.updateWorker(id, { status: 'error', error: err instanceof Error ? err.message : '실패', stream_text: '' });
    }
  };

  if (workers.length === 0) return null;

  return (
    <div className={className}>
      {/* Sticky bottom bar */}
      <motion.button
        onClick={() => setOpen(true)}
        className={`fixed bottom-0 inset-x-0 z-40 flex items-center justify-between px-4 py-3 bg-[var(--surface)] border-t border-[var(--border-subtle)] cursor-pointer ${
          waitingCount > 0 ? 'border-t-[var(--accent)]/40' : ''
        }`}
        animate={waitingCount > 0 ? { y: [0, -3, 0] } : {}}
        transition={waitingCount > 0 ? { duration: 0.5, delay: 0.5 } : {}}
      >
        <div className="flex items-center gap-2">
          <Users size={14} className="text-[var(--accent)]" />
          <span className="text-[12px] font-semibold text-[var(--text-primary)]">
            작업자 {doneCount}/{workers.length}
          </span>
          {waitingCount > 0 && (
            <span className="text-[10px] font-medium text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-full">
              입력 필요 {waitingCount}개
            </span>
          )}
          {runningCount > 0 && (
            <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              진행 중 {runningCount}
            </span>
          )}
        </div>
        <ChevronUp size={16} className="text-[var(--text-tertiary)]" />
      </motion.button>

      {/* Half-sheet overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/30"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 inset-x-0 z-50 max-h-[70vh] rounded-t-2xl bg-[var(--surface)] shadow-[var(--shadow-xl)] overflow-hidden flex flex-col"
            >
              {/* Sheet header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] shrink-0">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-[var(--accent)]" />
                  <span className="text-[13px] font-semibold text-[var(--text-primary)]">작업자들</span>
                  <span className="text-[11px] text-[var(--text-secondary)] bg-[var(--bg)] px-2 py-0.5 rounded-full">
                    {doneCount}/{workers.length}
                  </span>
                </div>
                <button onClick={() => setOpen(false)} className="p-1 cursor-pointer">
                  <X size={16} className="text-[var(--text-tertiary)]" />
                </button>
              </div>

              {/* Worker list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {workers.filter(w => w.status === 'waiting_input').map(w => (
                  <WorkerCard key={w.id} worker={w} onSubmitInput={handleSubmit} onRetry={handleRetry} />
                ))}
                {workers.filter(w => w.status === 'running').map(w => (
                  <WorkerCard key={w.id} worker={w} onRetry={handleRetry} />
                ))}
                {workers.filter(w => w.status === 'pending').map(w => (
                  <WorkerCard key={w.id} worker={w} />
                ))}
                {workers.filter(w => w.status === 'done').map(w => (
                  <WorkerCard key={w.id} worker={w} />
                ))}
                {workers.filter(w => w.status === 'error').map(w => (
                  <WorkerCard key={w.id} worker={w} onRetry={handleRetry} />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

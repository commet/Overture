'use client';

import { useCallback } from 'react';
import { useProgressiveStore } from '@/stores/useProgressiveStore';
import { useAgentAttentionStore } from '@/stores/useAgentAttentionStore';
import { runWorkerTask, type WorkerContext, type WorkerTaskResult } from '@/lib/worker-engine';

/**
 * Shared hook for worker actions — eliminates duplication between WorkerPanel and WorkerDrawer.
 */
export function useWorkerActions(context: WorkerContext | null) {
  const store = useProgressiveStore();

  const handleSubmit = useCallback((id: string, input: string) => {
    store.submitHumanInput(id, input);
  }, [store]);

  const handleRetry = useCallback(async (id: string) => {
    const session = store.currentSession();
    const worker = session?.workers.find(w => w.id === id);
    if (!worker || !context) return;

    store.updateWorker(id, { status: 'running', error: null, started_at: new Date().toISOString() });
    useAgentAttentionStore.getState().ping('retry');

    try {
      const { text, validation } = await runWorkerTask(
        worker,
        context,
        (t) => store.setWorkerStreamText(id, t),
      );
      if (validation && !validation.passed) {
        store.updateWorker(id, { status: 'validation_failed', result: text, stream_text: '', validation_score: validation.score, validation_feedback: validation.issues.join(', '), validation_passed: false });
      } else if (worker.who === 'both') {
        store.updateWorker(id, { status: 'waiting_input', result: text, stream_text: '', completed_at: null, validation_score: validation?.score });
      } else {
        store.updateWorker(id, { status: 'done', result: text, stream_text: '', completed_at: new Date().toISOString(), validation_score: validation?.score, validation_passed: validation?.passed ?? true });
      }
    } catch (err) {
      store.updateWorker(id, { status: 'error', error: err instanceof Error ? err.message : '실패', stream_text: '' });
    }
  }, [store, context]);

  const handleApprove = useCallback((id: string) => {
    store.approveWorker(id);
  }, [store]);

  const handleReject = useCallback((id: string) => {
    store.rejectWorker(id);
  }, [store]);

  return { handleSubmit, handleRetry, handleApprove, handleReject };
}

/**
 * Worker Engine — 병렬 에이전트 작업 실행
 *
 * execution_plan의 각 step을 실제로 실행하는 엔진.
 * AI 작업은 병렬 스트리밍, human 작업은 사용자 입력 대기.
 */

import { callLLMStream } from '@/lib/llm';
import { buildWorkerTaskPrompt } from '@/lib/progressive-prompts';
import type { WorkerTask } from '@/stores/types';

// ─── Context ───

export interface WorkerContext {
  problemText: string;
  realQuestion: string;
  skeleton: string[];
  hiddenAssumptions: string[];
  qaHistory: Array<{ q: string; a: string }>;
}

// ─── Single task execution ───

export async function runWorkerTask(
  task: WorkerTask,
  context: WorkerContext,
  onStream: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const { system, user } = buildWorkerTaskPrompt(
    task.task,
    task.expected_output,
    task.who,
    context,
  );

  return new Promise<string>((resolve, reject) => {
    callLLMStream(
      [{ role: 'user', content: user }],
      { system, maxTokens: 1000, signal },
      {
        onToken: (fullText) => onStream(fullText),
        onComplete: (fullText) => resolve(fullText),
        onError: (err) => reject(err),
      },
    );
  });
}

// ─── Parallel execution with concurrency limit ───

const MAX_CONCURRENT = 3;

export async function runAllAIWorkers(
  workers: WorkerTask[],
  context: WorkerContext,
  callbacks: {
    onStart: (id: string) => void;
    onStream: (id: string, text: string) => void;
    onComplete: (id: string, result: string) => void;
    onError: (id: string, error: string) => void;
  },
  signal?: AbortSignal,
): Promise<void> {
  const aiWorkers = workers.filter(w => w.who === 'ai' || w.who === 'both');
  if (aiWorkers.length === 0) return;

  // Correct concurrency pattern: each "slot" processes from the shared queue
  const queue = [...aiWorkers];

  const processQueue = async (): Promise<void> => {
    while (queue.length > 0) {
      if (signal?.aborted) return;
      const worker = queue.shift();
      if (!worker) return;

      callbacks.onStart(worker.id);

      try {
        const result = await runWorkerTask(
          worker,
          context,
          (text) => callbacks.onStream(worker.id, text),
          signal,
        );
        callbacks.onComplete(worker.id, result);
      } catch (err) {
        callbacks.onError(worker.id, err instanceof Error ? err.message : String(err));
      }
    }
  };

  // Launch MAX_CONCURRENT "slot" workers — each drains from the same queue
  const slots = Array.from(
    { length: Math.min(MAX_CONCURRENT, aiWorkers.length) },
    () => processQueue(),
  );

  await Promise.allSettled(slots);
}

/**
 * Worker Engine — 병렬 에이전트 작업 실행 + 품질 게이트
 *
 * execution_plan의 각 step을 실제로 실행하는 엔진.
 * AI 작업은 병렬 스트리밍, human 작업은 사용자 입력 대기.
 * 완료 후 품질 검증 → 실패 시 재시도 or 사용자 선택.
 */

import { callLLMStream } from '@/lib/llm';
import { buildWorkerTaskPrompt } from '@/lib/progressive-prompts';
import { validateWorkerOutput, type ValidationResult } from '@/lib/worker-quality';
import type { WorkerTask } from '@/stores/types';

// ─── Context ───

export interface WorkerContext {
  problemText: string;
  realQuestion: string;
  skeleton: string[];
  hiddenAssumptions: string[];
  qaHistory: Array<{ q: string; a: string }>;
}

// ─── Types ───

export interface WorkerTaskResult {
  text: string;
  validation?: ValidationResult;
}

// ─── Single task execution ───

export async function runWorkerTask(
  task: WorkerTask,
  context: WorkerContext,
  onStream: (text: string) => void,
  signal?: AbortSignal,
): Promise<WorkerTaskResult> {
  const { system, user } = buildWorkerTaskPrompt(
    task.task,
    task.expected_output,
    task.who,
    context,
  );

  const text = await new Promise<string>((resolve, reject) => {
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

  // AI 작업만 검증 (human/both는 사용자 책임)
  let validation: ValidationResult | undefined;
  if (task.who === 'ai') {
    try {
      validation = await validateWorkerOutput(task.task, task.expected_output, text);
    } catch {
      // 검증 자체 실패 → 비차단, 결과 그대로 사용
    }
  }

  return { text, validation };
}

// ─── Parallel execution with concurrency limit + quality gate ───

const MAX_CONCURRENT = 3;
const MAX_RETRIES = 1;

export async function runAllAIWorkers(
  workers: WorkerTask[],
  context: WorkerContext,
  callbacks: {
    onStart: (id: string) => void;
    onStream: (id: string, text: string) => void;
    onComplete: (id: string, result: string, validation?: ValidationResult) => void;
    onValidationFailed?: (id: string, validation: ValidationResult) => Promise<'retry' | 'skip' | 'accept'>;
    onError: (id: string, error: string) => void;
  },
  signal?: AbortSignal,
): Promise<void> {
  const aiWorkers = workers.filter(w => w.who === 'ai' || w.who === 'both');
  if (aiWorkers.length === 0) return;

  const queue = [...aiWorkers];

  const processQueue = async (): Promise<void> => {
    while (queue.length > 0) {
      if (signal?.aborted) return;
      const worker = queue.shift();
      if (!worker) return;

      callbacks.onStart(worker.id);

      let attempt = 0;
      let finalResult: WorkerTaskResult | null = null;

      while (attempt <= MAX_RETRIES) {
        try {
          const result = await runWorkerTask(
            worker,
            context,
            (text) => callbacks.onStream(worker.id, text),
            signal,
          );

          // 검증 통과 또는 검증 없음 → 완료
          if (!result.validation || result.validation.passed) {
            finalResult = result;
            break;
          }

          // 검증 실패
          if (attempt < MAX_RETRIES) {
            // 자동 재시도 (첫 실패)
            attempt++;
            continue;
          }

          // 최대 재시도 도달 → 콜백으로 사용자 선택 요청
          if (callbacks.onValidationFailed) {
            const action = await callbacks.onValidationFailed(worker.id, result.validation);
            if (action === 'retry') {
              attempt++;
              continue;
            } else if (action === 'accept') {
              finalResult = result;
              break;
            } else {
              // skip
              break;
            }
          } else {
            // 콜백 없으면 그냥 수용
            finalResult = result;
            break;
          }
        } catch (err) {
          callbacks.onError(worker.id, err instanceof Error ? err.message : String(err));
          break;
        }
      }

      if (finalResult) {
        callbacks.onComplete(worker.id, finalResult.text, finalResult.validation);
      }
    }
  };

  const slots = Array.from(
    { length: Math.min(MAX_CONCURRENT, aiWorkers.length) },
    () => processQueue(),
  );

  await Promise.allSettled(slots);
}

/**
 * Worker Engine — 병렬 에이전트 작업 실행 + 품질 게이트
 *
 * execution_plan의 각 step을 실제로 실행하는 엔진.
 * AI 작업은 병렬 스트리밍, human 작업은 사용자 입력 대기.
 * 각 worker는 페르소나를 가지고 전문화된 프롬프트로 실행된다.
 * 완료 후 품질 검증 → 실패 시 재시도 or 사용자 선택.
 */

import { callLLMStream } from '@/lib/llm';
import { buildWorkerTaskPrompt } from '@/lib/progressive-prompts';
import { validateWorkerOutput, checkSpecificity, type ValidationResult } from '@/lib/worker-quality';
import { validateByFramework } from '@/lib/guard-rails';
import type { WorkerTask, PipelineStage } from '@/stores/types';
import { LEVEL_CONFIGS, numericLevelToAgentLevel } from '@/lib/agent-skills';
import { useAgentStore } from '@/stores/useAgentStore';
import { XP_REWARDS } from '@/stores/agent-types';
import { buildSearchContext, type SearchResult } from '@/lib/agent-prompt-builder';
import { gatherToolContext } from '@/lib/agent-tools';
import { shouldPlan, planTask, executePlan } from '@/lib/agent-planner';
import { getAvailableCapabilities } from '@/lib/agent-delegator';

// ─── Context ───

export interface WorkerContext {
  problemText: string;
  realQuestion: string;
  skeleton: string[];
  hiddenAssumptions: string[];
  qaHistory: Array<{ q: string; a: string }>;
  peerResults?: string;  // 이전 스테이지 완료 결과 (context-strategy의 'focused' 모드에서 사용)
  sessionId?: string;
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
  const baseLevel = task.level || 'junior';

  // Agent 조회 (있으면 agent context가 프롬프트에 주입됨)
  const agent = task.agent_id
    ? useAgentStore.getState().getAgent(task.agent_id)
    : undefined;

  // Agent 레벨을 반영한 effective level
  const level = agent ? numericLevelToAgentLevel(agent.level) : baseLevel;

  // ─── Agent 자율 계획 (Planning Gate) ───
  // Level 3+ 에이전트 + 복합 task → 다단계 계획 후 실행
  // Planning 실패 시 아래 기존 단일 호출로 fallback
  if (shouldPlan(task, agent) && agent) {
    try {
      const capabilities = (task.delegation_depth || 0) === 0
        ? getAvailableCapabilities(task.agent_id)
        : undefined;
      const plan = await planTask(task, context, agent, capabilities);
      const planResult = await executePlan(plan, task, context, onStream, signal);

      if (task.agent_id) {
        useAgentStore.getState().recordActivity(task.agent_id, 'task_completed', task.task, context.sessionId);
      }

      let validation: ValidationResult | undefined;
      if (task.who === 'ai') {
        try {
          validation = await validateWorkerOutput(task.task, task.expected_output, planResult.aggregated_result);
          if (task.framework && validation) {
            const guardResult = validateByFramework(task.framework, planResult.aggregated_result);
            if (!guardResult.passed) {
              validation.score = Math.min(validation.score, guardResult.score);
              validation.issues = [...validation.issues, ...guardResult.issues];
              validation.passed = validation.score >= 70;
            }
          }
          if (validation) {
            const specificity = checkSpecificity(planResult.aggregated_result, context.problemText);
            if (specificity.score < 30) {
              validation.issues = [...validation.issues, ...specificity.issues];
              validation.score = Math.min(validation.score, specificity.score + 20);
              validation.passed = validation.score >= 70;
            }
          }
        } catch {
          // 검증 실패 → 비차단
        }
      }

      return { text: planResult.aggregated_result, validation };
    } catch {
      // Planning 실패 → 기존 단일 호출로 fallback
    }
  }

  const { system, user } = buildWorkerTaskPrompt(
    task.task,
    task.expected_output,
    task.who,
    context,
    task.persona ?? undefined,
    level,
    agent,
    task.framework,
    task.task_type,   // context 전략 결정용
  );

  // 에이전트 도구 컨텍스트 (메모리 회상, 관찰 요약 등)
  let toolContext = '';
  if (task.agent_id) {
    toolContext = gatherToolContext(task.agent_id, task.task);
  }

  // 웹 검색: web_search capability가 있는 에이전트만
  let searchContext = '';
  if (agent?.capabilities.includes('web_search')) {
    try {
      const results = await fetchSearchResults(task.task);
      searchContext = buildSearchContext(results);
    } catch {
      // 검색 실패 시 무시 — 작업 자체는 계속 진행
    }
  }

  const finalUser = [user, toolContext, searchContext].filter(Boolean).join('\n\n');

  const text = await new Promise<string>((resolve, reject) => {
    callLLMStream(
      [{ role: 'user', content: finalUser }],
      { system, maxTokens: LEVEL_CONFIGS[level].maxTokens, signal },
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

      // 프레임워크별 guard-rails 추가 검증
      if (task.framework && validation) {
        const guardResult = validateByFramework(task.framework, text);
        if (!guardResult.passed) {
          validation.score = Math.min(validation.score, guardResult.score);
          validation.issues = [...validation.issues, ...guardResult.issues];
          validation.passed = validation.score >= 70;
        }
      }

      // 구체성 검증
      if (validation) {
        const specificity = checkSpecificity(text, context.problemText);
        if (specificity.score < 30) {
          validation.issues = [...validation.issues, ...specificity.issues];
          validation.score = Math.min(validation.score, specificity.score + 20);
          validation.passed = validation.score >= 70;
        }
      }
    } catch {
      // 검증 자체 실패 → 비차단, 결과 그대로 사용
    }
  }

  // 작업 완료 activity 기록
  if (task.agent_id) {
    useAgentStore.getState().recordActivity(
      task.agent_id,
      'task_completed',
      task.task,
      context.sessionId,
    );
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

          // 최대 재시도 도달 → 콜백으로 사용자 선택 요청 (30초 타임아웃)
          if (callbacks.onValidationFailed) {
            const action = await Promise.race([
              callbacks.onValidationFailed(worker.id, result.validation),
              new Promise<'accept'>(r => setTimeout(() => r('accept'), 30_000)),
            ]);
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
          if (signal?.aborted) return;
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

// ─── Pipeline execution (Phase 3) ───

/**
 * 스테이지 기반 파이프라인 실행.
 * 스테이지 순서대로 실행하며, 이전 스테이지 결과를 다음 스테이지에 전달.
 * 스테이지 내부에서는 기존 runAllAIWorkers의 병렬 실행 재사용.
 */
export async function runPipeline(
  workers: WorkerTask[],
  stages: PipelineStage[],
  context: WorkerContext,
  callbacks: {
    onStart: (id: string) => void;
    onStream: (id: string, text: string) => void;
    onComplete: (id: string, result: string, validation?: ValidationResult) => void;
    onValidationFailed?: (id: string, validation: ValidationResult) => Promise<'retry' | 'skip' | 'accept'>;
    onError: (id: string, error: string) => void;
    onStageComplete?: (stageId: string, results: Map<string, string>) => void;
  },
  signal?: AbortSignal,
): Promise<void> {
  // 스테이지가 없으면 기존 방식으로 폴백
  if (!stages || stages.length === 0) {
    return runAllAIWorkers(workers, context, callbacks, signal);
  }

  // 스테이지 순서대로 실행 (dependsOnStageId 기반 정렬)
  const sortedStages = [...stages].sort((a, b) => {
    if (a.dependsOnStageId && !b.dependsOnStageId) return 1;
    if (!a.dependsOnStageId && b.dependsOnStageId) return -1;
    return 0;
  });

  const stageResults = new Map<string, Map<string, string>>(); // stageId → (workerId → result text)

  for (const stage of sortedStages) {
    if (signal?.aborted) return;

    const stageWorkers = workers.filter(w => w.stage_id === stage.id);
    if (stageWorkers.length === 0) continue;

    // 이전 스테이지 결과를 context에 주입
    let enrichedContext = context;
    if (stage.dependsOnStageId) {
      const priorResults = stageResults.get(stage.dependsOnStageId);
      if (priorResults) {
        const priorText = Array.from(priorResults.entries())
          .map(([wId, text]) => {
            const w = workers.find(w2 => w2.id === wId);
            return `[${w?.persona?.name || '팀원'}의 분석]\n${text}`;
          })
          .join('\n\n---\n\n');

        enrichedContext = {
          ...context,
          peerResults: priorText,  // context-strategy 'focused' 모드에서 사용
          qaHistory: [
            ...context.qaHistory,
            { q: '이전 팀원들의 분석 결과', a: priorText },
          ],
        };
      }
    }

    // 현재 스테이지의 결과 수집용
    const currentStageResults = new Map<string, string>();

    // 기존 runAllAIWorkers 패턴으로 스테이지 내 병렬 실행
    await runAllAIWorkers(stageWorkers, enrichedContext, {
      ...callbacks,
      onComplete: (id, result, validation) => {
        currentStageResults.set(id, result);
        callbacks.onComplete(id, result, validation);
      },
    }, signal);

    stageResults.set(stage.id, currentStageResults);
    callbacks.onStageComplete?.(stage.id, currentStageResults);
  }
}

// ─── Web Search ───

async function fetchSearchResults(query: string): Promise<SearchResult[]> {
  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query.slice(0, 300) }),
    });
    if (!res.ok) return [];
    const { results } = await res.json();
    return results || [];
  } catch {
    return [];
  }
}

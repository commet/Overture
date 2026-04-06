/**
 * orchestrator.ts — 오케스트레이터 진입점
 *
 * classifyInput → selectAgents → assignFramework → buildStages 를 조합.
 * LLM 호출 없음. 결정론적.
 */

import type { InterviewSignals, PipelineStage } from '@/stores/types';
import type { Agent, AgentObservation } from '@/stores/agent-types';
import { classifyInput } from './orchestrator-classify';
import type { InputClassification } from './orchestrator-classify';
import { selectAgents } from './orchestrator-select';
import { assignFramework } from './orchestrator-framework';

/* ─── Types ─── */

export interface PlannedWorker {
  agentId: string;
  framework: string | null;
  focus: string;
  expectedOutput: string;
  who: string;
  stepIndex: number;
  stageId: string;             // 소속 스테이지
}

export interface OrchestratorResult {
  classification: InputClassification;
  workers: PlannedWorker[];
  stages: PipelineStage[];
}

/* ─── Stage Builder ─── */

/**
 * 워커를 스테이지로 배치.
 * - routine/important: 단일 스테이지 (전부 병렬)
 * - critical: 2스테이지 — Stage 1(도메인 전문가 병렬) → Stage 2(Critic이 Stage 1 결과 검토)
 */
function buildStages(
  workers: PlannedWorker[],
  classification: InputClassification,
): { workers: PlannedWorker[]; stages: PipelineStage[] } {
  if (classification.stakes !== 'critical' || workers.length < 2) {
    // 단일 스테이지: 전부 병렬
    const stageId = 'stage_1';
    const updated = workers.map(w => ({ ...w, stageId }));
    const stages: PipelineStage[] = [{
      id: stageId,
      label: '분석',
      workerIds: updated.map((_, i) => `w_${i}`), // 실제 ID는 initWorkers에서 부여
      status: 'pending',
    }];
    return { workers: updated, stages };
  }

  // Critical: Critic을 Stage 2로 분리
  const criticIdx = workers.findIndex(w => {
    // validation group의 리스크 관련 에이전트
    const kws = ['리스크', '위험', '실패', '비판'];
    return kws.some(kw => w.focus.includes(kw)) || w.framework?.includes('Pre-mortem') || w.framework?.includes('Red Team');
  });

  // Critic이 명확하지 않으면 마지막 워커를 Stage 2로
  const stage2Idx = criticIdx >= 0 ? criticIdx : workers.length - 1;

  const stage1Workers = workers.filter((_, i) => i !== stage2Idx).map(w => ({ ...w, stageId: 'stage_1' }));
  const stage2Workers = [{ ...workers[stage2Idx], stageId: 'stage_2' }];

  const stages: PipelineStage[] = [
    {
      id: 'stage_1',
      label: '분석',
      workerIds: stage1Workers.map((_, i) => `w_${i}`),
      status: 'pending',
    },
    {
      id: 'stage_2',
      label: '검증',
      workerIds: [`w_${stage2Idx}`],
      status: 'pending',
      dependsOnStageId: 'stage_1',
    },
  ];

  return { workers: [...stage1Workers, ...stage2Workers], stages };
}

/* ─── Main ─── */

export function planWorkers(
  steps: { task: string; who: string; output: string; agent_hint?: string }[],
  signals: InterviewSignals | undefined,
  unlockedAgents: Agent[],
  observations: AgentObservation[],
): OrchestratorResult {
  // 1. 입력 분류
  const problemText = steps.map(s => s.task).join(' ');
  const classification = classifyInput(problemText, steps, signals);

  // 2. 에이전트 선택 (3-layer: task classification → capability scoring → experience)
  const agentMap = selectAgents(steps, classification, unlockedAgents, observations, problemText);

  // 3. 프레임워크 배정
  const rawWorkers: PlannedWorker[] = steps.map((step, i) => {
    const agent = agentMap.get(i);
    const agentId = agent?.id || '';
    const framework = agent ? assignFramework(agentId, step.task, classification) : null;

    return {
      agentId,
      framework,
      focus: step.task,
      expectedOutput: step.output,
      who: step.who,
      stepIndex: i,
      stageId: 'stage_1', // 기본값, buildStages에서 재배정
    };
  });

  // 4. 스테이지 배치
  const { workers, stages } = buildStages(rawWorkers, classification);

  return { classification, workers, stages };
}

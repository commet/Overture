import { create } from 'zustand';
import { generateId } from '@/lib/uuid';
import { getStorage, setStorage, STORAGE_KEYS } from '@/lib/storage';
import { track } from '@/lib/analytics';
import { useAgentStore } from '@/stores/useAgentStore';
import { agentToWorkerPersona } from '@/lib/agent-adapters';
import { XP_REWARDS } from '@/stores/agent-types';
import { numericLevelToAgentLevel } from '@/lib/agent-skills';
import { onTaskApproved, onTaskRejected } from '@/lib/observation-engine';
import { planWorkers } from '@/lib/orchestrator';
import { computeQualityXP } from '@/lib/agent-quality';
import type {
  ProgressiveSession,
  ProgressivePhase,
  FlowQuestion,
  FlowAnswer,
  AnalysisSnapshot,
  MixResult,
  DMFeedbackResult,
  DMConcern,
  InterviewSignals,
  PipelineStage,
  WorkerTask,
  WorkerDeployPhase,
} from '@/stores/types';

interface ProgressiveState {
  sessions: ProgressiveSession[];
  currentSessionId: string | null;

  // Derived
  currentSession: () => ProgressiveSession | null;

  // Actions
  loadSessions: () => void;
  createSession: (projectId: string, problemText: string, reviewerAgentId?: string) => string;
  setPhase: (phase: ProgressivePhase) => void;
  setDecisionMaker: (name: string) => void;

  // Q&A
  addQuestion: (question: FlowQuestion) => void;
  addAnswer: (answer: FlowAnswer) => void;
  advanceRound: () => void;

  // Analysis
  addSnapshot: (snapshot: AnalysisSnapshot) => void;
  updateLatestSnapshot: (partial: Partial<AnalysisSnapshot>) => void;

  // Mix & DM
  setMix: (mix: MixResult) => void;
  setDMFeedback: (feedback: DMFeedbackResult) => void;
  toggleFix: (concernIndex: number) => void;

  // Final
  setFinalDeliverable: (text: string) => void;

  // Framing (Weakness A)
  replaceInitialSnapshot: (snapshot: AnalysisSnapshot) => void;
  replaceLatestQuestion: (question: FlowQuestion) => void;

  // Pipeline bridge (Weakness D)
  linkToReframe: (reframeItemId: string) => void;
  linkToRecast: (recastItemId: string) => void;

  // Workers
  initWorkers: (steps: { task: string; who: 'ai' | 'human' | 'both'; output: string; agent_hint?: string }[], signals?: InterviewSignals) => WorkerTask[];
  deployWorkers: () => void;
  updateWorker: (workerId: string, partial: Partial<WorkerTask>) => void;
  setWorkerStreamText: (workerId: string, text: string) => void;
  submitHumanInput: (workerId: string, input: string) => void;
  approveWorker: (workerId: string) => void;
  rejectWorker: (workerId: string) => void;
  allWorkersDone: () => boolean;
  approvedWorkerResults: () => Array<{ task: string; result: string; persona: string | null }>;

  // Cleanup
  deleteSession: (id: string) => void;
}

function persist(sessions: ProgressiveSession[]) {
  setStorage(STORAGE_KEYS.PROGRESSIVE_SESSIONS, sessions);
}

function updateSession(
  sessions: ProgressiveSession[],
  id: string,
  updater: (s: ProgressiveSession) => Partial<ProgressiveSession>,
): ProgressiveSession[] {
  return sessions.map(s =>
    s.id === id ? { ...s, ...updater(s), updated_at: new Date().toISOString() } : s,
  );
}

export const useProgressiveStore = create<ProgressiveState>((set, get) => ({
  sessions: [],
  currentSessionId: null,

  currentSession: () => {
    const { sessions, currentSessionId } = get();
    return sessions.find(s => s.id === currentSessionId) || null;
  },

  loadSessions: () => {
    const local = getStorage<ProgressiveSession[]>(STORAGE_KEYS.PROGRESSIVE_SESSIONS, []);
    // Migration: reset running workers to pending (stream_text lost on reload)
    const migrated = local.map(s => ({
      ...s,
      worker_deploy_phase: s.worker_deploy_phase ?? (s.workers?.length ? 'deployed' : 'none'),
      workers: (s.workers || []).map(w => ({
        ...w,
        stream_text: '',
        persona: w.persona ?? null,
        level: w.level ?? 'junior',
        approved: w.approved ?? null,
        completion_note: w.completion_note ?? null,
        status: w.status === 'running' ? 'pending' as const : w.status,
      })),
    }));
    set({ sessions: migrated });
  },

  createSession: (projectId, problemText, reviewerAgentId?) => {
    const id = generateId();
    const now = new Date().toISOString();
    const session: ProgressiveSession = {
      id,
      project_id: projectId,
      problem_text: problemText,
      decision_maker: null,
      reviewer_agent_id: reviewerAgentId,
      phase: 'analyzing',
      round: 0,
      max_rounds: 5,
      questions: [],
      answers: [],
      snapshots: [],
      workers: [],
      worker_deploy_phase: 'none' as WorkerDeployPhase,
      mix: null,
      dm_feedback: null,
      final_deliverable: null,
      created_at: now,
      updated_at: now,
    };
    const sessions = [...get().sessions, session];
    persist(sessions);
    set({ sessions, currentSessionId: id });
    track('progressive_session_created', { project_id: projectId });
    return id;
  },

  setPhase: (phase) => {
    const { currentSessionId } = get();
    if (!currentSessionId) return;
    const sessions = updateSession(get().sessions, currentSessionId, () => ({ phase }));
    persist(sessions);
    set({ sessions });
    track('progressive_phase_change', { phase });
  },

  setDecisionMaker: (name) => {
    const { currentSessionId } = get();
    if (!currentSessionId) return;
    const sessions = updateSession(get().sessions, currentSessionId, () => ({ decision_maker: name }));
    persist(sessions);
    set({ sessions });
  },

  addQuestion: (question) => {
    const { currentSessionId } = get();
    if (!currentSessionId) return;
    const sessions = updateSession(get().sessions, currentSessionId, (s) => ({
      questions: [...s.questions, question],
    }));
    persist(sessions);
    set({ sessions });
  },

  addAnswer: (answer) => {
    const { currentSessionId } = get();
    if (!currentSessionId) return;
    const sessions = updateSession(get().sessions, currentSessionId, (s) => ({
      answers: [...s.answers, answer],
    }));
    persist(sessions);
    set({ sessions });
  },

  advanceRound: () => {
    const { currentSessionId } = get();
    if (!currentSessionId) return;
    const sessions = updateSession(get().sessions, currentSessionId, (s) => ({
      round: s.round + 1,
    }));
    persist(sessions);
    set({ sessions });
  },

  addSnapshot: (snapshot) => {
    const { currentSessionId } = get();
    if (!currentSessionId) return;
    const sessions = updateSession(get().sessions, currentSessionId, (s) => ({
      snapshots: [...s.snapshots, snapshot],
    }));
    persist(sessions);
    set({ sessions });
  },

  updateLatestSnapshot: (partial) => {
    const { currentSessionId } = get();
    if (!currentSessionId) return;
    const sessions = updateSession(get().sessions, currentSessionId, (s) => {
      const snaps = [...s.snapshots];
      if (snaps.length === 0) return {};
      snaps[snaps.length - 1] = { ...snaps[snaps.length - 1], ...partial };
      return { snapshots: snaps };
    });
    persist(sessions);
    set({ sessions });
  },

  replaceInitialSnapshot: (snapshot) => {
    const { currentSessionId } = get();
    if (!currentSessionId) return;
    const sessions = updateSession(get().sessions, currentSessionId, () => ({
      snapshots: [snapshot],
    }));
    persist(sessions);
    set({ sessions });
  },

  replaceLatestQuestion: (question) => {
    const { currentSessionId } = get();
    if (!currentSessionId) return;
    const sessions = updateSession(get().sessions, currentSessionId, (s) => {
      const questions = [...s.questions];
      if (questions.length > 0) {
        questions[questions.length - 1] = question;
      } else {
        questions.push(question);
      }
      return { questions };
    });
    persist(sessions);
    set({ sessions });
  },

  linkToReframe: (reframeItemId) => {
    const { currentSessionId } = get();
    if (!currentSessionId) return;
    const sessions = updateSession(get().sessions, currentSessionId, (s) => ({
      reframe_item_id: reframeItemId,
      exited_at_phase: s.phase,
      exited_at_round: s.round,
    }));
    persist(sessions);
    set({ sessions });
  },

  linkToRecast: (recastItemId) => {
    const { currentSessionId } = get();
    if (!currentSessionId) return;
    const sessions = updateSession(get().sessions, currentSessionId, (s) => ({
      recast_item_id: recastItemId,
      exited_at_phase: s.phase,
      exited_at_round: s.round,
    }));
    persist(sessions);
    set({ sessions });
  },

  setMix: (mix) => {
    const { currentSessionId } = get();
    if (!currentSessionId) return;
    const sessions = updateSession(get().sessions, currentSessionId, () => ({
      mix,
      phase: 'dm_feedback' as ProgressivePhase,
    }));
    persist(sessions);
    set({ sessions });
  },

  setDMFeedback: (feedback) => {
    const { currentSessionId } = get();
    if (!currentSessionId) return;
    const sessions = updateSession(get().sessions, currentSessionId, () => ({
      dm_feedback: feedback,
      phase: 'refining' as ProgressivePhase,
    }));
    persist(sessions);
    set({ sessions });
  },

  toggleFix: (concernIndex) => {
    const { currentSessionId } = get();
    if (!currentSessionId) return;
    const sessions = updateSession(get().sessions, currentSessionId, (s) => {
      if (!s.dm_feedback) return {};
      const concerns = s.dm_feedback.concerns.map((c: DMConcern, i: number) =>
        i === concernIndex ? { ...c, applied: !c.applied } : c,
      );
      return { dm_feedback: { ...s.dm_feedback, concerns } };
    });
    persist(sessions);
    set({ sessions });
  },

  setFinalDeliverable: (text) => {
    const { currentSessionId } = get();
    if (!currentSessionId) return;
    const sessions = updateSession(get().sessions, currentSessionId, () => ({
      final_deliverable: text,
      phase: 'complete' as ProgressivePhase,
    }));
    persist(sessions);
    set({ sessions });
  },

  // ─── Workers ───

  initWorkers: (steps, signals?) => {
    const { currentSessionId } = get();
    if (!currentSessionId) return [];
    const agentStore = useAgentStore.getState();

    // Agent store 미초기화 시 seed (최초 실행 대비)
    if (agentStore.agents.length === 0) {
      agentStore.loadAgents();
    }

    // Orchestrator: 입력 분류 → 에이전트 선택 → 프레임워크 배정
    const unlockedAgents = agentStore.getUnlockedAgents();
    const allObservations = unlockedAgents.flatMap(a => a.observations || []);
    const { workers: planned, stages: plannedStages } = planWorkers(steps, signals, unlockedAgents, allObservations);

    const workers: WorkerTask[] = planned.map((pw, i) => {
      const agent = pw.agentId ? agentStore.getAgent(pw.agentId) : null;
      const fallbackAgent = agent || agentStore.assignAgentToTask(steps[i].task, steps[i].output, new Set());

      return {
        id: generateId(),
        step_index: i,
        task: steps[i].task,
        who: steps[i].who as 'ai' | 'human' | 'both',
        expected_output: steps[i].output,
        status: 'pending' as const,
        persona: agentToWorkerPersona(fallbackAgent),
        agent_id: fallbackAgent.id,
        level: numericLevelToAgentLevel(fallbackAgent.level),
        framework: pw.framework || undefined,
        stage_id: pw.stageId || undefined,
        stream_text: '',
        result: null,
        human_input: null,
        error: null,
        approved: null,
        completion_note: null,
        started_at: null,
        completed_at: null,
      };
    });

    // 스테이지의 workerIds를 실제 생성된 ID로 매핑
    const stages = plannedStages.map(stage => ({
      ...stage,
      workerIds: workers.filter(w => w.stage_id === stage.id).map(w => w.id),
    }));

    // 'ready' = 팀 구성 완료, 사용자 확인 대기
    const sessions = updateSession(get().sessions, currentSessionId, () => ({
      workers,
      stages,
      worker_deploy_phase: 'ready' as WorkerDeployPhase,
    }));
    persist(sessions);
    set({ sessions });
    track('workers_initialized', { count: workers.length });
    return workers;
  },

  deployWorkers: () => {
    const { currentSessionId } = get();
    if (!currentSessionId) return;
    const sessions = updateSession(get().sessions, currentSessionId, (s) => ({
      worker_deploy_phase: 'deployed' as WorkerDeployPhase,
      // Human workers transition to waiting_input now that deploy is confirmed
      workers: s.workers.map(w =>
        w.who === 'human' && w.status === 'pending'
          ? { ...w, status: 'waiting_input' as const }
          : w
      ),
    }));
    persist(sessions);
    set({ sessions });
  },

  updateWorker: (workerId, partial) => {
    const { currentSessionId } = get();
    if (!currentSessionId) return;
    const sessions = updateSession(get().sessions, currentSessionId, (s) => ({
      workers: s.workers.map(w => w.id === workerId ? { ...w, ...partial } : w),
    }));
    persist(sessions);
    set({ sessions });
  },

  setWorkerStreamText: (workerId, text) => {
    const { currentSessionId } = get();
    if (!currentSessionId) return;
    // Bypass updateSession — no updated_at stamp, no persist. Minimizes object churn.
    const sessions = get().sessions.map(s => {
      if (s.id !== currentSessionId) return s;
      return {
        ...s,
        workers: s.workers.map(w =>
          w.id === workerId ? { ...w, stream_text: text } : w
        ),
      };
    });
    set({ sessions });
  },

  submitHumanInput: (workerId, input) => {
    const { currentSessionId } = get();
    if (!currentSessionId) return;
    const now = new Date().toISOString();
    const sessions = updateSession(get().sessions, currentSessionId, (s) => ({
      workers: s.workers.map(w => w.id === workerId ? {
        ...w, human_input: input, result: input, status: 'done' as const, approved: true, completed_at: now,
      } : w),
    }));
    persist(sessions);
    set({ sessions });
  },

  approveWorker: (workerId) => {
    const { currentSessionId } = get();
    if (!currentSessionId) return;
    const session = get().currentSession();
    const worker = session?.workers.find(w => w.id === workerId);

    const sessions = updateSession(get().sessions, currentSessionId, (s) => ({
      workers: s.workers.map(w => w.id === workerId ? { ...w, approved: true } : w),
    }));
    persist(sessions);
    set({ sessions });

    // Agent XP 적립 + Observation (품질 기반 XP)
    if (worker?.agent_id) {
      const qualityXP = computeQualityXP('task_approved', worker.validation_score);
      useAgentStore.getState().recordActivity(
        worker.agent_id, 'task_approved', `${worker.task}|qxp:${qualityXP}`, currentSessionId,
      );
      onTaskApproved(worker.agent_id, worker.task, worker.result || '');
    }
  },

  rejectWorker: (workerId) => {
    const { currentSessionId } = get();
    if (!currentSessionId) return;
    const session = get().currentSession();
    const worker = session?.workers.find(w => w.id === workerId);

    const sessions = updateSession(get().sessions, currentSessionId, (s) => ({
      workers: s.workers.map(w => w.id === workerId ? { ...w, approved: false } : w),
    }));
    persist(sessions);
    set({ sessions });

    // Agent XP 차감 + Observation
    if (worker?.agent_id) {
      const qualityXP = computeQualityXP('task_rejected', worker.validation_score);
      useAgentStore.getState().recordActivity(
        worker.agent_id, 'task_rejected', `${worker.task}|qxp:${qualityXP}`, currentSessionId,
      );
      onTaskRejected(worker.agent_id, worker.task);
    }
  },

  allWorkersDone: () => {
    const session = get().currentSession();
    if (!session || session.workers.length === 0) return true;
    return session.workers.every(w => w.status === 'done');
  },

  approvedWorkerResults: () => {
    const session = get().currentSession();
    if (!session) return [];
    // 정책: approved=true(명시 승인) + approved=null(미확인, 자동 포함) → mix에 포함
    // approved=false(명시 제외) → mix에서 빠짐
    // 미확인 자동 포함은 의도된 동작: Mix 전 요약에서 "⏳ 미확인" 표시로 사용자에게 알림
    return session.workers
      .filter(w => w.status === 'done' && w.result && w.approved !== false)
      .map(w => ({
        task: w.task,
        result: w.result!,
        persona: w.persona?.name ?? null,
      }));
  },

  deleteSession: (id) => {
    const sessions = get().sessions.filter(s => s.id !== id);
    persist(sessions);
    const currentSessionId = get().currentSessionId === id ? null : get().currentSessionId;
    set({ sessions, currentSessionId });
  },
}));

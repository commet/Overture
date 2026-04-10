/**
 * Execution Transcript — 세션 실행의 append-only 이벤트 로그.
 *
 * "이 세션에서 무슨 일이 일어났는가"를 단일 타임라인으로 재구성한다.
 * signal-recorder.ts와 동일한 패턴: localStorage FIFO + Supabase 비동기.
 *
 * onStream은 기록하지 않음 — 기존 스트리밍 최적화 유지.
 */

import { getStorage, setStorage, STORAGE_KEYS } from './storage';
import { generateId } from './uuid';

// ─── Types ───

export type TranscriptEventType =
  | 'classification_complete'
  | 'agents_selected'
  | 'stage_started'
  | 'stage_completed'
  | 'worker_started'
  | 'worker_completed'
  | 'worker_error'
  | 'worker_validation_failed'
  | 'worker_retried'
  | 'worker_rerouted'
  | 'lead_synthesis_started'
  | 'lead_synthesis_completed'
  | 'session_completed';

export interface TranscriptEvent {
  id: string;
  session_id: string;
  type: TranscriptEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface ExecutionTranscript {
  session_id: string;
  events: TranscriptEvent[];
  created_at: string;
}

// ─── Config ───

const MAX_TRANSCRIPTS = 20; // 최대 세션 수 (FIFO)

// ─── Internal ───

function loadAll(): ExecutionTranscript[] {
  return getStorage<ExecutionTranscript[]>(STORAGE_KEYS.EXECUTION_TRANSCRIPTS, []);
}

function saveAll(transcripts: ExecutionTranscript[]): void {
  setStorage(STORAGE_KEYS.EXECUTION_TRANSCRIPTS, transcripts);
}

// ─── Public API ───

/**
 * Append an event to a session's transcript. Creates transcript if first event.
 * Never blocks — fire-and-forget for localStorage.
 */
export function appendToTranscript(
  sessionId: string,
  type: TranscriptEventType,
  data: Record<string, unknown> = {},
): void {
  if (typeof window === 'undefined') return;

  const event: TranscriptEvent = {
    id: generateId(),
    session_id: sessionId,
    type,
    timestamp: new Date().toISOString(),
    data,
  };

  const all = loadAll();
  let transcript = all.find(t => t.session_id === sessionId);

  if (!transcript) {
    transcript = {
      session_id: sessionId,
      events: [],
      created_at: new Date().toISOString(),
    };
    all.push(transcript);

    // FIFO cap: remove oldest transcripts
    while (all.length > MAX_TRANSCRIPTS) {
      all.shift();
    }
  }

  transcript.events.push(event);
  saveAll(all);
}

/**
 * Get transcript for a session. Returns null if not found.
 */
export function getTranscript(sessionId: string): ExecutionTranscript | null {
  return loadAll().find(t => t.session_id === sessionId) ?? null;
}

/**
 * Get events from a transcript, optionally filtered by type.
 */
export function getTranscriptEvents(
  sessionId: string,
  filter?: { type?: TranscriptEventType },
): TranscriptEvent[] {
  const transcript = getTranscript(sessionId);
  if (!transcript) return [];
  if (!filter?.type) return transcript.events;
  return transcript.events.filter(e => e.type === filter.type);
}

// ─── Callback Wrapper ───

import type { ValidationResult } from './worker-quality';

/**
 * Wrap worker callbacks to automatically record transcript events.
 * Drop-in: `withTranscript(sessionId, callbacks)` produces same-shaped callbacks.
 */
export function withTranscript(
  sessionId: string | undefined,
  callbacks: {
    onStart: (id: string) => void;
    onStream: (id: string, text: string) => void;
    onComplete: (id: string, result: string, validation?: ValidationResult) => void;
    onValidationFailed?: (id: string, validation: ValidationResult) => Promise<'retry' | 'skip' | 'accept'>;
    onError: (id: string, error: string) => void;
    onStageComplete?: (stageId: string, results: Map<string, string>) => void;
  },
): typeof callbacks {
  if (!sessionId) return callbacks;

  return {
    onStart: (id) => {
      appendToTranscript(sessionId, 'worker_started', { workerId: id });
      callbacks.onStart(id);
    },
    onStream: callbacks.onStream, // 스트리밍은 기록하지 않음 (성능)
    onComplete: (id, result, validation) => {
      appendToTranscript(sessionId, 'worker_completed', {
        workerId: id,
        score: validation?.score,
        passed: validation?.passed,
      });
      callbacks.onComplete(id, result, validation);
    },
    onValidationFailed: callbacks.onValidationFailed
      ? async (id, validation) => {
          appendToTranscript(sessionId, 'worker_validation_failed', {
            workerId: id,
            score: validation.score,
            issues: validation.issues,
          });
          return callbacks.onValidationFailed!(id, validation);
        }
      : undefined,
    onError: (id, error) => {
      appendToTranscript(sessionId, 'worker_error', { workerId: id, error });
      callbacks.onError(id, error);
    },
    onStageComplete: callbacks.onStageComplete
      ? (stageId, results) => {
          appendToTranscript(sessionId, 'stage_completed', {
            stageId,
            workerCount: results.size,
          });
          callbacks.onStageComplete!(stageId, results);
        }
      : undefined,
  };
}

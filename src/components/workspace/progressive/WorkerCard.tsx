'use client';

import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertTriangle, ChevronDown, RotateCw, Loader2, ExternalLink, X } from 'lucide-react';
import { useProgressiveStore } from '@/stores/useProgressiveStore';
import type { WorkerTask } from '@/stores/types';
import { WorkerAvatar } from './WorkerAvatar';
import { useAgentStore } from '@/stores/useAgentStore';

const EASE = [0.32, 0.72, 0, 1] as const;

/* ═══ Result Detail Modal ═══ */
function ResultModal({ worker, onClose, onApprove, onReject }: {
  worker: WorkerTask;
  onClose: () => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="relative w-full sm:max-w-2xl max-h-[85vh] sm:max-h-[80vh] rounded-t-2xl sm:rounded-2xl bg-[var(--surface)] shadow-[var(--shadow-xl)] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-[var(--border-subtle)] shrink-0">
          <WorkerAvatar persona={worker.persona} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-[var(--text-primary)] truncate">
              {worker.persona?.name || 'AI'}
            </p>
            <p className="text-[13px] text-[var(--text-secondary)] truncate">
              {worker.persona?.role} · {worker.task}
            </p>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-[var(--bg)] rounded-lg cursor-pointer transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="닫기">
            <X size={18} className="text-[var(--text-tertiary)]" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          {worker.completion_note && (
            <p className="text-[13px] text-[var(--text-secondary)] mb-4 leading-relaxed line-clamp-3">
              &ldquo;{worker.completion_note.replace(/^[^:]+:\s*/, '')}&rdquo;
            </p>
          )}
          <div className="text-[14px] text-[var(--text-primary)] leading-[1.85] whitespace-pre-wrap break-words">
            {worker.result}
          </div>
        </div>

        {/* Footer — approve/reject */}
        {(onApprove || onReject) && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-[var(--border-subtle)] shrink-0">
            <span className="text-[13px] text-[var(--text-secondary)]">
              {worker.approved === true ? '초안에 반영됩니다' : worker.approved === false ? '초안에서 제외됩니다' : '반영 여부를 선택하세요'}
            </span>
            <div className="flex gap-2.5">
              {onReject && worker.approved !== false && (
                <button onClick={() => onReject(worker.id)}
                  className="flex-1 sm:flex-none px-5 py-3 sm:py-2.5 text-[13px] text-red-600 dark:text-red-400 hover:bg-[var(--bg)] rounded-xl border border-[var(--border-subtle)] cursor-pointer transition-colors min-h-[44px]">
                  제외
                </button>
              )}
              {onApprove && worker.approved !== true && (
                <button onClick={() => onApprove(worker.id)}
                  className="flex-1 sm:flex-none px-5 py-3 sm:py-2.5 text-[13px] text-white font-semibold rounded-xl cursor-pointer shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow min-h-[44px]"
                  style={{ background: 'var(--gradient-gold)' }}>
                  반영
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ═══ Inline Report Block — 대화 흐름 속 보고 ═══ */

export const WorkerReportBlock = memo(function WorkerReportBlock({
  worker,
  onSubmitInput,
  onRetry,
  onApprove,
  onReject,
}: {
  worker: WorkerTask;
  onSubmitInput?: (id: string, input: string) => void;
  onRetry?: (id: string) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}) {
  const store = useProgressiveStore();
  const [showModal, setShowModal] = useState(false);
  const [inputVal, setInputVal] = useState(worker.who === 'both' && worker.result ? worker.result : '');
  const persona = worker.persona;

  const statusLabel = {
    pending: '대기 중',
    running: '작업 중...',
    done: '완료',
    error: '오류',
    waiting_input: '입력 필요',
    validation_failed: '품질 확인 필요',
  }[worker.status];

  useEffect(() => {
    if (worker.who === 'both' && worker.result && !inputVal) {
      setInputVal(worker.result);
    }
  }, [worker.result]);

  // Running state — subtle inline indicator
  if (worker.status === 'running') {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}
        className="flex items-center gap-3 pl-1">
        <div className="w-px h-8 bg-[var(--border-subtle)]" />
        <WorkerAvatar persona={persona} size="sm" pulse />
        <span className="text-[12px] text-[var(--text-secondary)]">
          {persona?.name || 'AI'}
          <span className="text-[var(--text-tertiary)]"> · {worker.task}</span>
        </span>
        <Loader2 size={12} className="animate-spin text-[var(--text-tertiary)]" />
      </motion.div>
    );
  }

  // Pending state — quiet
  if (worker.status === 'pending') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} className="flex items-center gap-3 pl-1">
        <div className="w-px h-6 bg-[var(--border-subtle)]" />
        <WorkerAvatar persona={persona} size="sm" />
        <span className="text-[12px] text-[var(--text-tertiary)]">
          {persona?.name || 'AI'} · 대기 중
        </span>
      </motion.div>
    );
  }

  // Error state
  if (worker.status === 'error') {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}
        className="flex items-start gap-3 pl-1">
        <div className="w-px self-stretch bg-red-300" />
        <WorkerAvatar persona={persona} size="sm" />
        <div className="flex-1">
          <span className="text-[13px] text-red-600 font-medium">{persona?.name || 'AI'}: 작업 중 문제가 생겼어요</span>
          <p className="text-[12px] text-red-600 mt-0.5">{worker.error}</p>
        </div>
        {onRetry && (
          <button onClick={() => onRetry(worker.id)}
            className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 shrink-0 cursor-pointer">
            <RotateCw size={11} /> 재시도
          </button>
        )}
      </motion.div>
    );
  }

  // Validation failed state
  if (worker.status === 'validation_failed') {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
        <div className="flex items-start gap-3">
          <div className="w-px self-stretch mt-1" style={{ backgroundColor: persona?.color || 'var(--accent)' }} />
          <WorkerAvatar persona={persona} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[var(--text-primary)]">
              {persona?.name || 'AI'}
              <span className="text-[var(--text-tertiary)] font-normal ml-1.5 text-[11px]">{persona?.role}</span>
            </p>
            <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-[11px] font-semibold text-amber-900 mb-1">품질 확인이 필요합니다</p>
              {worker.validation_feedback && <p className="text-[10px] text-amber-700 mb-2">{worker.validation_feedback}</p>}
              <div className="flex gap-2">
                {onRetry && <button onClick={() => onRetry(worker.id)}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-800 cursor-pointer hover:bg-amber-50">다시 생성</button>}
                <button onClick={() => store.updateWorker(worker.id, { status: 'done', completed_at: new Date().toISOString() })}
                  className="text-[10px] px-2.5 py-1 rounded-lg text-amber-600 cursor-pointer hover:text-amber-800">그냥 사용</button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Waiting input (human / both)
  if (worker.status === 'waiting_input' && onSubmitInput) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
        <div className="flex items-start gap-3">
          <div className="w-px self-stretch mt-1" style={{ backgroundColor: persona?.color || 'var(--accent)' }} />
          <WorkerAvatar persona={persona} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-[var(--text-primary)]">
              {persona?.name || 'AI'}
              <span className="text-[var(--text-tertiary)] font-normal ml-1.5 text-[11px]">{persona?.role}</span>
            </p>

            {worker.who === 'both' && worker.result && (
              <div className="mt-2 text-[12px] text-[var(--text-secondary)] bg-[var(--bg)]/60 rounded-xl p-3 leading-[1.7]">
                <p className="text-[10px] font-medium text-[var(--text-tertiary)] mb-1">초안 작성함</p>
                <p className="whitespace-pre-wrap line-clamp-4">{worker.result}</p>
              </div>
            )}

            <div className="mt-2">
              <textarea value={inputVal} onChange={(e) => setInputVal(e.target.value)}
                placeholder={worker.who === 'both' ? '수정하거나 그대로 확인...' : '내용을 입력해주세요...'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]/30 resize-none min-h-[70px] max-h-[150px]"
                rows={3} maxLength={5000}
                aria-label={`${persona?.name || 'AI'} 작업 입력`} />
              <div className="flex justify-end gap-2 mt-2">
                {worker.who === 'both' && worker.result && (
                  <button onClick={() => onSubmitInput(worker.id, worker.result!)}
                    className="px-3.5 py-2.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl border border-[var(--border-subtle)] cursor-pointer min-h-[44px]">
                    초안 그대로
                  </button>
                )}
                <button onClick={() => { if (inputVal.trim()) onSubmitInput(worker.id, inputVal.trim()); }}
                  disabled={!inputVal.trim()}
                  className="px-3.5 py-2 text-[12px] text-white font-semibold rounded-xl disabled:opacity-30 cursor-pointer"
                  style={{ background: 'var(--gradient-gold)' }}>
                  확인
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Done state — the main report block
  const isRejected = worker.approved === false;
  const isApproved = worker.approved === true;
  const previewText = (worker.result || '').slice(0, 150);
  const agentLevel = worker.agent_id
    ? useAgentStore.getState().getAgent(worker.agent_id)?.level
    : undefined;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className={`group transition-opacity duration-500 ${isRejected ? 'opacity-40' : ''}`}
      >
        <div className="flex items-start gap-3">
          {/* Color line */}
          <div className="w-px self-stretch mt-1 transition-colors duration-500"
            style={{ backgroundColor: isRejected ? 'var(--border-subtle)' : (persona?.color || 'var(--accent)') }} />
          <WorkerAvatar persona={persona} size="md" />
          <div className="flex-1 min-w-0">
            {/* Name + role */}
            <p className="text-[14px] font-medium text-[var(--text-primary)]">
              {persona?.name || 'AI'}
              <span className="text-[var(--text-secondary)] font-normal ml-1.5 text-[12px]">{persona?.role}</span>
              {agentLevel != null && agentLevel >= 2 && (
                <span className="agent-lv ml-1.5" data-level={agentLevel} style={{ fontSize: 10, padding: '1px 6px' }}>
                  Lv.{agentLevel}
                </span>
              )}
              {isApproved && <span className="ml-2 text-[11px] text-emerald-600 font-medium">반영</span>}
              {isRejected && <span className="ml-2 text-[11px] text-red-500 font-medium">제외</span>}
            </p>

            {/* Completion note — persona's voice */}
            {worker.completion_note && (
              <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 leading-relaxed line-clamp-2">
                &ldquo;{worker.completion_note.replace(/^[^:]+:\s*/, '')}&rdquo;
              </p>
            )}

            {/* Result preview */}
            <div className={`mt-2.5 text-[13px] leading-[1.75] rounded-xl p-3.5 sm:p-4 break-words ${
              isRejected
                ? 'bg-[var(--bg)]/30 text-[var(--text-tertiary)] line-through'
                : 'bg-[var(--bg)]/60 text-[var(--text-primary)]'
            }`}>
              <p className="whitespace-pre-wrap">{previewText}{(worker.result || '').length > 150 ? '...' : ''}</p>
              {(worker.result || '').length > 150 && (
                <button onClick={() => setShowModal(true)}
                  className="flex items-center gap-1 mt-2 text-[11px] text-[var(--accent)] hover:underline cursor-pointer">
                  <ExternalLink size={10} /> 전문 보기
                </button>
              )}
            </div>

            {/* Approve / Reject actions */}
            {(onApprove || onReject) && (
              <div className="flex items-center gap-2.5 mt-3">
                {onApprove && !isApproved && (
                  <button onClick={() => onApprove(worker.id)}
                    className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-white rounded-xl cursor-pointer shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-shadow"
                    style={{ background: 'var(--gradient-gold)' }}>
                    <Check size={12} /> 반영
                  </button>
                )}
                {onReject && !isRejected && (
                  <button onClick={() => onReject(worker.id)}
                    className="flex items-center gap-1.5 px-4 py-2 text-[12px] text-red-600 hover:bg-red-50 rounded-xl border border-red-200 hover:border-red-400 cursor-pointer transition-colors">
                    제외
                  </button>
                )}
                {(isApproved || isRejected) && (
                  <button onClick={() => isApproved ? onReject?.(worker.id) : onApprove?.(worker.id)}
                    className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--accent)] cursor-pointer transition-colors">
                    변경
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Full result modal */}
      <AnimatePresence>
        {showModal && (
          <ResultModal worker={worker} onClose={() => setShowModal(false)} onApprove={onApprove} onReject={onReject} />
        )}
      </AnimatePresence>
    </>
  );
}, (prev, next) => {
  if (prev.worker.status === 'running' && next.worker.status === 'running') {
    return Math.abs(prev.worker.stream_text.length - next.worker.stream_text.length) < 20
      && prev.worker.id === next.worker.id;
  }
  return prev.worker === next.worker
    && prev.onSubmitInput === next.onSubmitInput
    && prev.onRetry === next.onRetry
    && prev.onApprove === next.onApprove
    && prev.onReject === next.onReject;
});

/* ═══ Legacy export for WorkerPanel sidebar (compact) ═══ */
export { WorkerReportBlock as WorkerCard };

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertTriangle, ChevronDown, RotateCw, Loader2 } from 'lucide-react';
import { useProgressiveStore } from '@/stores/useProgressiveStore';
import type { WorkerTask } from '@/stores/types';

const EASE = [0.32, 0.72, 0, 1] as const;

const WHO_BADGE: Record<string, { label: string; cls: string }> = {
  ai: { label: 'AI', cls: 'bg-blue-50 text-blue-600' },
  human: { label: '직접', cls: 'bg-amber-50 text-amber-600' },
  both: { label: '협업', cls: 'bg-purple-50 text-purple-600' },
};

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-[var(--text-tertiary)]',
  running: 'bg-blue-500 animate-pulse',
  done: 'bg-emerald-500',
  error: 'bg-red-500',
  waiting_input: 'bg-[var(--accent)] animate-pulse',
};

export function WorkerCard({
  worker,
  onSubmitInput,
  onRetry,
}: {
  worker: WorkerTask;
  onSubmitInput?: (id: string, input: string) => void;
  onRetry?: (id: string) => void;
}) {
  const store = useProgressiveStore();
  const [expanded, setExpanded] = useState(worker.status === 'waiting_input' || worker.status === 'validation_failed');
  const [inputVal, setInputVal] = useState(worker.who === 'both' && worker.result ? worker.result : '');
  const badge = WHO_BADGE[worker.who];

  const statusLabel = {
    pending: '대기 중',
    running: '작업 중...',
    done: '완료',
    error: '오류',
    waiting_input: '입력 필요',
    validation_failed: '품질 확인 필요',
  }[worker.status];

  const previewText = worker.status === 'running'
    ? worker.stream_text.slice(0, 120)
    : worker.status === 'done'
      ? (worker.result || '').slice(0, 120)
      : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className={`rounded-xl border overflow-hidden transition-colors duration-300 ${
        worker.status === 'waiting_input'
          ? 'border-[var(--accent)]/30 bg-[var(--accent)]/[0.03]'
          : worker.status === 'error'
            ? 'border-red-200 bg-red-50/30'
            : 'border-[var(--border-subtle)] bg-[var(--surface)]'
      }`}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left cursor-pointer"
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[worker.status]}`} />
        <span className={`text-[9px] font-bold px-1.5 py-px rounded shrink-0 ${badge.cls}`}>
          {badge.label}
        </span>
        <span className="flex-1 text-[12px] text-[var(--text-primary)] font-medium truncate">
          {worker.task}
        </span>
        <span className="text-[10px] text-[var(--text-secondary)] shrink-0">{statusLabel}</span>
        <ChevronDown
          size={12}
          className={`text-[var(--text-tertiary)] shrink-0 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Preview line (when collapsed, for running/done) */}
      {!expanded && previewText && (
        <div className="px-3 pb-2 -mt-1">
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">
            {previewText}{previewText.length >= 120 ? '...' : ''}
          </p>
        </div>
      )}

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 border-t border-[var(--border-subtle)]">
              <p className="text-[10px] text-[var(--text-secondary)] mt-2 mb-1.5">
                산출물: {worker.expected_output}
              </p>

              {/* Streaming text */}
              {worker.status === 'running' && worker.stream_text && (
                <div className="text-[11px] text-[var(--text-primary)] leading-[1.7] max-h-[200px] overflow-y-auto whitespace-pre-wrap bg-[var(--bg)]/50 rounded-lg p-2.5 mt-1">
                  {worker.stream_text}
                  <span className="inline-block w-1.5 h-3 bg-[var(--accent)] ml-0.5 animate-pulse rounded-sm" />
                </div>
              )}

              {/* Running indicator */}
              {worker.status === 'running' && !worker.stream_text && (
                <div className="flex items-center gap-2 mt-2">
                  <Loader2 size={12} className="animate-spin text-blue-500" />
                  <span className="text-[11px] text-[var(--text-secondary)]">조사 중...</span>
                </div>
              )}

              {/* Done — result */}
              {worker.status === 'done' && worker.result && (
                <div className="text-[11px] text-[var(--text-primary)] leading-[1.7] max-h-[200px] overflow-y-auto whitespace-pre-wrap bg-[var(--bg)]/50 rounded-lg p-2.5 mt-1">
                  {worker.result}
                </div>
              )}

              {/* Error */}
              {worker.status === 'error' && (
                <div className="flex items-center gap-2 mt-2">
                  <AlertTriangle size={12} className="text-red-500 shrink-0" />
                  <span className="text-[11px] text-red-600 flex-1">{worker.error || '작업 실패'}</span>
                  {onRetry && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onRetry(worker.id); }}
                      className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      <RotateCw size={10} /> 재시도
                    </button>
                  )}
                </div>
              )}

              {/* Validation failed */}
              {worker.status === 'validation_failed' && (
                <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-[11px] font-semibold text-amber-900 mb-1">품질 확인이 필요합니다</p>
                  {worker.validation_feedback && <p className="text-[10px] text-amber-700 mb-2">{worker.validation_feedback}</p>}
                  <div className="flex gap-2">
                    {onRetry && <button onClick={(e) => { e.stopPropagation(); onRetry(worker.id); }}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-800 cursor-pointer hover:bg-amber-50">다시 생성</button>}
                    <button onClick={(e) => { e.stopPropagation(); store.updateWorker(worker.id, { status: 'done', completed_at: new Date().toISOString() }); }}
                      className="text-[10px] px-2.5 py-1 rounded-lg text-amber-600 cursor-pointer hover:text-amber-800">그냥 사용</button>
                  </div>
                </div>
              )}

              {/* Human / Both — input area */}
              {worker.status === 'waiting_input' && onSubmitInput && (
                <div className="mt-2 space-y-2">
                  {worker.who === 'both' && worker.result && (
                    <div className="text-[10px] text-[var(--text-secondary)] bg-[var(--bg)]/50 rounded-lg p-2 leading-relaxed">
                      <span className="font-semibold text-[var(--text-primary)]">AI가 초안을 잡았습니다.</span>
                      <span className="text-[var(--text-tertiary)]"> 당신의 맥락을 반영해주세요.</span>
                      <p className="mt-1 whitespace-pre-wrap">{worker.result}</p>
                    </div>
                  )}
                  <textarea
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder={worker.who === 'both' ? '수정하거나 그대로 확인...' : '내용을 입력해주세요...'}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border-subtle)] text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]/30 resize-none min-h-[60px]"
                    rows={3}
                  />
                  <div className="flex justify-end gap-2">
                    {worker.who === 'both' && worker.result && (
                      <button
                        onClick={() => onSubmitInput(worker.id, worker.result!)}
                        className="px-3 py-1.5 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg border border-[var(--border-subtle)] cursor-pointer"
                      >
                        AI 초안 그대로
                      </button>
                    )}
                    <button
                      onClick={() => { if (inputVal.trim()) onSubmitInput(worker.id, inputVal.trim()); }}
                      disabled={!inputVal.trim()}
                      className="px-3 py-1.5 text-[11px] text-white font-semibold rounded-lg disabled:opacity-30 cursor-pointer"
                      style={{ background: 'var(--gradient-gold)' }}
                    >
                      <Check size={10} className="inline mr-1" />확인
                    </button>
                  </div>
                </div>
              )}

              {/* Done checkmark for human tasks */}
              {worker.status === 'done' && worker.who !== 'ai' && worker.human_input && (
                <div className="text-[11px] text-[var(--text-primary)] leading-[1.7] whitespace-pre-wrap bg-[var(--bg)]/50 rounded-lg p-2.5 mt-1">
                  {worker.human_input}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

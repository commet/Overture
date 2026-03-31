'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { useProgressiveStore } from '@/stores/useProgressiveStore';
import {
  runDeepening,
  runMix,
  runDMFeedback,
  runFinalDeliverable,
} from '@/lib/progressive-engine';
import { track } from '@/lib/analytics';
import type { FlowQuestion, FlowAnswer, AnalysisSnapshot, DMConcern } from '@/stores/types';
import { ChevronRight, Loader2, Check, AlertTriangle, Sparkles, Copy, CheckCheck, UserCheck } from 'lucide-react';

// ─── Korean particle helper (은/는) ───

function getParticle(name: string): string {
  const last = name.charCodeAt(name.length - 1);
  // Korean syllable range: 0xAC00 ~ 0xD7A3
  if (last >= 0xAC00 && last <= 0xD7A3) {
    return (last - 0xAC00) % 28 !== 0 ? '은' : '는';
  }
  return '는'; // non-Korean default
}

// ─── Progress Bar ───

const PHASE_LABELS = [
  { key: 'analyze', label: '문제 파악' },
  { key: 'design', label: '설계' },
  { key: 'review', label: '검증' },
  { key: 'complete', label: '완성' },
] as const;

function phaseToStep(phase: string, round: number, hasMix: boolean): number {
  if (phase === 'input') return 0;
  if (phase === 'analyzing' && round < 2) return 0;
  if (phase === 'analyzing' && round >= 2) return 1;
  if (phase === 'conversing' && round < 2 && !hasMix) return 0;
  if (phase === 'conversing' && !hasMix) return 1;
  if (phase === 'mixing') return 1;
  if (phase === 'dm_feedback' || phase === 'refining') return 2;
  if (phase === 'complete') return 3;
  return 0;
}

function FlowProgressBar({ phase, round, hasMix }: { phase: string; round: number; hasMix: boolean }) {
  const current = phaseToStep(phase, round, hasMix);

  return (
    <div className="flex items-center gap-1 mb-8">
      {PHASE_LABELS.map((p, i) => {
        const isDone = i < current;
        const isActive = i === current;
        return (
          <div key={p.key} className="flex items-center gap-1">
            {i > 0 && (
              <div className={`w-8 h-px transition-colors duration-500 ${isDone ? 'bg-[var(--accent)]' : 'bg-[var(--border-subtle)]'}`} />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500 ${
                  isDone
                    ? 'bg-[var(--accent)] text-white'
                    : isActive
                      ? 'bg-[var(--accent)]/15 text-[var(--accent)] ring-2 ring-[var(--accent)]/30'
                      : 'bg-[var(--border-subtle)] text-[var(--text-tertiary)]'
                }`}
              >
                {isDone ? <Check size={10} /> : i + 1}
              </div>
              <span
                className={`text-[11px] font-medium transition-colors duration-300 ${
                  isActive ? 'text-[var(--accent)]' : isDone ? 'text-[var(--text-secondary)]' : 'text-[var(--text-tertiary)]'
                }`}
              >
                {p.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Analysis Card ───

function AnalysisCard({
  snapshot,
  isLatest,
  isUpdating,
}: {
  snapshot: AnalysisSnapshot;
  isLatest: boolean;
  isUpdating: boolean;
}) {
  const [collapsed, setCollapsed] = useState(!isLatest);

  // Auto-expand when becoming latest
  if (isLatest && collapsed) setCollapsed(false);

  // Collapsed view for old snapshots — just show the real question one-liner
  if (!isLatest && collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="w-full text-left rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3 opacity-50 hover:opacity-70 transition-opacity cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--text-tertiary)] bg-[var(--accent)]/8 px-1.5 py-0.5 rounded shrink-0">v{snapshot.version + 1}</span>
          <p className="text-[13px] text-[var(--text-secondary)] truncate">{snapshot.real_question}</p>
          <ChevronRight size={12} className="text-[var(--text-tertiary)] shrink-0" />
        </div>
      </button>
    );
  }

  return (
    <div className={`rounded-2xl border bg-[var(--surface)] overflow-hidden transition-all duration-500 ${
      isLatest ? 'border-[var(--accent)]/30 shadow-[var(--shadow-md)]' : 'border-[var(--border-subtle)]'
    }`}>
      <div className="h-[2px] w-full" style={{ background: isLatest ? 'var(--gradient-gold)' : 'transparent' }} />

      <div className="p-5 md:p-6 space-y-4">
        {/* Real question + collapse button for non-latest */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[var(--accent)] uppercase tracking-wider">진짜 질문</span>
              {snapshot.version > 0 && (
                <span className="text-[10px] text-[var(--text-tertiary)] bg-[var(--accent)]/8 px-1.5 py-0.5 rounded">v{snapshot.version + 1}</span>
              )}
              {isUpdating && <Loader2 size={12} className="animate-spin text-[var(--accent)]" />}
            </div>
            {!isLatest && (
              <button onClick={() => setCollapsed(true)} className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--accent)] cursor-pointer">접기</button>
            )}
          </div>
          <p className="text-[17px] md:text-[20px] font-bold text-[var(--text-primary)] leading-snug" style={{ fontFamily: 'var(--font-display)' }}>
            {snapshot.real_question}
          </p>
        </div>

        {/* Insight badge (for v1+) */}
        {snapshot.insight && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[var(--accent)]/6 border border-[var(--accent)]/10">
            <Sparkles size={14} className="text-[var(--accent)] mt-0.5 shrink-0" />
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{snapshot.insight}</p>
          </div>
        )}

        {/* Hidden assumptions */}
        {snapshot.hidden_assumptions.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">숨겨진 전제</p>
            <div className="space-y-1.5">
              {snapshot.hidden_assumptions.map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-[13px] text-[var(--text-secondary)]">
                  <span className="text-red-400 mt-0.5 shrink-0">?</span>
                  <span>{a}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skeleton */}
        <div>
          <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">뼈대</p>
          <div className="space-y-1.5">
            {snapshot.skeleton.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-[13px] text-[var(--text-primary)]">
                <span className="text-[var(--accent)] font-mono text-[11px] mt-0.5 shrink-0">{i + 1}.</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Execution plan (appears after round 2+) */}
        {snapshot.execution_plan && (
          <div className="pt-3 border-t border-[var(--border-subtle)]">
            <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">실행 계획</p>
            <div className="space-y-2">
              {snapshot.execution_plan.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3 text-[13px]">
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    step.who === 'ai' ? 'bg-blue-100 text-blue-700' :
                    step.who === 'human' ? 'bg-amber-100 text-amber-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {step.who === 'ai' ? 'AI' : step.who === 'human' ? '직접' : '협업'}
                  </span>
                  <div>
                    <span className="text-[var(--text-primary)]">{step.task}</span>
                    <span className="text-[var(--text-tertiary)]"> → {step.output}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Question Card ───

function QuestionCard({
  question,
  onAnswer,
  disabled,
}: {
  question: FlowQuestion;
  onAnswer: (value: string) => void;
  disabled: boolean;
}) {
  const [inputValue, setInputValue] = useState('');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const handleSubmit = () => {
    if (question.options && selectedOption !== null) {
      onAnswer(question.options[selectedOption]);
    } else if (inputValue.trim()) {
      onAnswer(inputValue.trim());
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/[0.03] p-5 md:p-6 phrase-entrance">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-6 h-6 rounded-full bg-[var(--accent)]/15 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[var(--accent)] text-[12px] font-bold">Q</span>
        </div>
        <div>
          <p className="text-[15px] md:text-[17px] font-semibold text-[var(--text-primary)] leading-snug">
            {question.text}
          </p>
          {question.subtext && (
            <p className="mt-1 text-[12px] text-[var(--text-tertiary)]">{question.subtext}</p>
          )}
        </div>
      </div>

      {/* Options */}
      {question.options && question.options.length > 0 ? (
        <div className="space-y-2 mb-4">
          {question.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => setSelectedOption(i)}
              disabled={disabled}
              className={`w-full text-left px-4 py-3 rounded-xl text-[14px] transition-all duration-200 border ${
                selectedOption === i
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-primary)] font-medium'
                  : 'border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40'
              } disabled:opacity-40`}
            >
              {opt}
            </button>
          ))}

          {/* "직접 입력" fallback */}
          <div className="pt-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => { setInputValue(e.target.value); setSelectedOption(null); }}
              placeholder="또는 직접 입력..."
              disabled={disabled}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]/40 transition-colors disabled:opacity-40"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="입력..."
            disabled={disabled}
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]/40 transition-colors disabled:opacity-40"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={disabled || (selectedOption === null && !inputValue.trim())}
        className="inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-full text-[13px] font-semibold shadow-[var(--shadow-sm)] hover:shadow-[var(--glow-gold-intense)] hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 disabled:opacity-40 cursor-pointer"
        style={{ background: 'var(--gradient-gold)' }}
      >
        다음
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

// ─── Answered Question (collapsed) ───

function AnsweredQuestion({ question, answer }: { question: FlowQuestion; answer: FlowAnswer }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] opacity-70">
      <div className="w-5 h-5 rounded-full bg-[var(--accent)]/15 flex items-center justify-center shrink-0 mt-0.5">
        <Check size={10} className="text-[var(--accent)]" />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] text-[var(--text-tertiary)] truncate">{question.text}</p>
        <p className="text-[13px] text-[var(--text-primary)] font-medium">{answer.value}</p>
      </div>
    </div>
  );
}

// ─── DM Feedback Reveal ───

function DMFeedbackCard({
  feedback,
  onToggleFix,
  onFinalize,
  isProcessing,
}: {
  feedback: NonNullable<import('@/stores/types').DMFeedbackResult>;
  onToggleFix: (index: number) => void;
  onFinalize: () => void;
  isProcessing: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] overflow-hidden phrase-entrance">
      {/* Trigger */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-[var(--bg)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <UserCheck size={18} className="text-[var(--accent)]" />
          <span className="text-[15px] font-semibold text-[var(--text-primary)]">
            {feedback.persona_name}{getParticle(feedback.persona_name)} 뭐라고 할까?
          </span>
        </div>
        <ChevronRight size={16} className={`text-[var(--text-tertiary)] transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-[var(--border-subtle)]">
          {/* First reaction */}
          <div className="pt-4">
            <p className="text-[15px] text-[var(--text-primary)] leading-relaxed italic">
              &ldquo;{feedback.first_reaction}&rdquo;
            </p>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-1">— {feedback.persona_name} ({feedback.persona_role})</p>
          </div>

          {/* Good parts */}
          {feedback.good_parts.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-green-600 uppercase tracking-wider mb-1.5">좋은 점</p>
              {feedback.good_parts.map((g, i) => (
                <p key={i} className="text-[13px] text-[var(--text-secondary)] flex items-start gap-1.5 mb-1">
                  <span className="text-green-500 shrink-0">✓</span> {g}
                </p>
              ))}
            </div>
          )}

          {/* Concerns with fix toggles */}
          {feedback.concerns.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">우려사항 + 수정 제안</p>
              <div className="space-y-3">
                {feedback.concerns.map((concern: DMConcern, i: number) => (
                  <div
                    key={i}
                    className={`rounded-xl border p-3.5 transition-all duration-200 ${
                      concern.applied
                        ? 'border-[var(--accent)]/30 bg-[var(--accent)]/[0.04]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            concern.severity === 'critical' ? 'bg-red-100 text-red-700' :
                            concern.severity === 'important' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {concern.severity === 'critical' ? '필수' : concern.severity === 'important' ? '권장' : '참고'}
                          </span>
                        </div>
                        <p className="text-[13px] text-[var(--text-primary)] mb-1.5">{concern.text}</p>
                        <p className="text-[12px] text-[var(--accent)]">→ {concern.fix_suggestion}</p>
                      </div>
                      <button
                        onClick={() => onToggleFix(i)}
                        className={`shrink-0 w-10 h-6 rounded-full transition-all duration-200 ${
                          concern.applied ? 'bg-[var(--accent)]' : 'bg-[var(--border-subtle)]'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 mx-1 ${
                          concern.applied ? 'translate-x-4' : ''
                        }`} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Would ask */}
          {feedback.would_ask.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5">이것도 물어볼 거다</p>
              {feedback.would_ask.map((q, i) => (
                <p key={i} className="text-[13px] text-[var(--text-secondary)] flex items-start gap-1.5 mb-1">
                  <span className="text-[var(--accent)] shrink-0">?</span> {q}
                </p>
              ))}
            </div>
          )}

          {/* Approval condition */}
          <div className="pt-3 border-t border-[var(--border-subtle)]">
            <p className="text-[11px] font-semibold text-[var(--accent)] uppercase tracking-wider mb-1">통과 조건</p>
            <p className="text-[14px] text-[var(--text-primary)] font-medium">{feedback.approval_condition}</p>
          </div>

          {/* Finalize button */}
          <button
            onClick={onFinalize}
            disabled={isProcessing}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 px-5 py-3 text-white rounded-xl text-[14px] font-semibold shadow-[var(--shadow-sm)] hover:shadow-[var(--glow-gold-intense)] transition-all duration-200 disabled:opacity-50 cursor-pointer"
            style={{ background: 'var(--gradient-gold)' }}
          >
            {isProcessing ? (
              <><Loader2 size={16} className="animate-spin" /> 최종본 작성 중...</>
            ) : (
              <>선택한 수정사항 반영하고 완성하기 <ChevronRight size={14} /></>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Simple Markdown Renderer (no dangerouslySetInnerHTML) ───

function renderMarkdownLines(content: string) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    key++;
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={key} className="text-[20px] md:text-[22px] font-bold text-[var(--text-primary)] mt-1 mb-3" style={{ fontFamily: 'var(--font-display)' }}>
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={key} className="text-[16px] font-bold text-[var(--text-primary)] mt-5 mb-2">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={key} className="border-l-3 border-[var(--accent)]/30 pl-4 py-1 text-[14px] text-[var(--text-secondary)] italic my-2">
          {line.slice(2)}
        </blockquote>
      );
    } else if (line.startsWith('- ')) {
      elements.push(
        <div key={key} className="flex items-start gap-2 text-[14px] text-[var(--text-primary)] ml-1">
          <span className="text-[var(--accent)] mt-1 shrink-0">•</span>
          <span>{line.slice(2)}</span>
        </div>
      );
    } else if (line.startsWith('---')) {
      elements.push(<hr key={key} className="border-[var(--border-subtle)] my-4" />);
    } else if (line.startsWith('*') && line.endsWith('*')) {
      elements.push(
        <p key={key} className="text-[13px] text-[var(--text-tertiary)] italic my-1">
          {line.replace(/^\*+|\*+$/g, '')}
        </p>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={key} className="h-2" />);
    } else {
      elements.push(
        <p key={key} className="text-[14px] text-[var(--text-primary)] leading-relaxed">
          {line}
        </p>
      );
    }
  }
  return elements;
}

// ─── Final Deliverable ───

function FinalDeliverableCard({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-[var(--accent)]/30 bg-[var(--surface)] overflow-hidden phrase-entrance shadow-[var(--shadow-lg)]">
      <div className="h-[3px] w-full" style={{ background: 'var(--gradient-gold)' }} />
      <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <Check size={16} className="text-[var(--accent)]" />
          <span className="text-[14px] font-semibold text-[var(--text-primary)]">최종 산출물</span>
        </div>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40 transition-all"
        >
          {copied ? <><CheckCheck size={12} /> 복사됨</> : <><Copy size={12} /> 복사</>}
        </button>
      </div>
      <div className="p-5 md:p-6 space-y-0.5">
        {renderMarkdownLines(content)}
      </div>
    </div>
  );
}

// ─── Loading indicator ───

function AnalyzingIndicator({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-[var(--accent)]/[0.04] border border-[var(--accent)]/15 phrase-entrance">
      <Loader2 size={18} className="animate-spin text-[var(--accent)]" />
      <span className="text-[14px] text-[var(--text-secondary)]">{text}</span>
    </div>
  );
}

// ─── Mix Trigger ───

function MixTrigger({ onMix, onMore, isProcessing }: { onMix: () => void; onMore: () => void; isProcessing: boolean }) {
  return (
    <div className="space-y-3 phrase-entrance">
      <p className="text-[13px] text-[var(--text-tertiary)] text-center">분석 준비 완료 — 위 내용을 기반으로 초안을 만듭니다.</p>
    <div className="flex flex-col sm:flex-row gap-3">
      <button
        onClick={onMix}
        disabled={isProcessing}
        className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-white rounded-xl text-[14px] font-semibold shadow-[var(--shadow-sm)] hover:shadow-[var(--glow-gold-intense)] transition-all duration-200 disabled:opacity-50 cursor-pointer"
        style={{ background: 'var(--gradient-gold)' }}
      >
        {isProcessing ? (
          <><Loader2 size={16} className="animate-spin" /> 초안 조합 중...</>
        ) : (
          <>초안 완성하기 <ChevronRight size={14} /></>
        )}
      </button>
      {!isProcessing && (
        <button
          onClick={onMore}
          className="px-5 py-3 rounded-xl text-[14px] font-medium text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--accent)]/40 transition-all"
        >
          질문 하나 더
        </button>
      )}
    </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// ─── Main: ProgressiveFlow ───
// ═══════════════════════════════════════════════

export function ProgressiveFlow({ projectId }: { projectId: string }) {
  const store = useProgressiveStore();
  const session = store.currentSession();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMixTrigger, setShowMixTrigger] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new content
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 100);
  }, []);

  // Derive state from session (safe even when session is null)
  const phase = session?.phase ?? 'input';
  const snapshots = session?.snapshots ?? [];
  const questions = session?.questions ?? [];
  const answers = session?.answers ?? [];
  const mix = session?.mix ?? null;
  const dm_feedback = session?.dm_feedback ?? null;
  const final_deliverable = session?.final_deliverable ?? null;
  const round = session?.round ?? 0;
  const max_rounds = session?.max_rounds ?? 3;
  const decision_maker = session?.decision_maker ?? null;

  // Pair questions with answers
  const qaPairs = useMemo(() => questions.map((q, i) => ({
    question: q,
    answer: answers[i] || null,
  })), [questions, answers]);

  // Current unanswered question
  const currentQuestion = questions.length > answers.length ? questions[questions.length - 1] : null;
  const latestSnapshot = snapshots[snapshots.length - 1] || null;

  // Restore showMixTrigger on reload: if we have snapshots, answered all questions, no mix yet, and phase is conversing
  const shouldShowMixTrigger = showMixTrigger || (
    phase === 'conversing' && snapshots.length > 0 && !currentQuestion && !mix && !isProcessing
  );

  // If no session exists yet, bail (all hooks already called above)
  if (!session) return null;

  // ─── Handlers ───

  const handleAnswer = async (value: string) => {
    if (!currentQuestion || isProcessing) return;

    const answer: FlowAnswer = { question_id: currentQuestion.id, value };
    store.addAnswer(answer);
    store.setPhase('analyzing');
    setIsProcessing(true);
    setError(null);
    scrollToBottom();

    try {
      const allQA = qaPairs
        .filter(qa => qa.answer)
        .map(qa => ({ question: qa.question, answer: qa.answer! }));
      allQA.push({ question: currentQuestion, answer });

      // Detect DM from answer if not set
      if (!decision_maker && round === 0) {
        const dmGuess = value.includes('대표') ? '대표님' :
          value.includes('팀장') ? '팀장님' :
          value.includes('투자') ? '투자자' :
          value.includes('클라이언트') || value.includes('고객') ? '클라이언트' : null;
        if (dmGuess) store.setDecisionMaker(dmGuess);
      }

      const result = await runDeepening(
        session.problem_text,
        latestSnapshot!,
        allQA,
        round,
        max_rounds,
      );

      store.addSnapshot(result.snapshot);
      store.advanceRound();

      if (result.readyForMix || !result.question) {
        setShowMixTrigger(true);
        store.setPhase('conversing');
      } else {
        store.addQuestion(result.question);
        store.setPhase('conversing');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 실패');
      store.setPhase('conversing');
    } finally {
      setIsProcessing(false);
      scrollToBottom();
    }
  };

  const handleMix = async () => {
    setIsProcessing(true);
    setError(null);
    store.setPhase('mixing');
    scrollToBottom();

    try {
      const allQA = qaPairs
        .filter(qa => qa.answer)
        .map(qa => ({ question: qa.question, answer: qa.answer! }));

      const mixResult = await runMix(
        session.problem_text,
        snapshots,
        allQA,
        decision_maker,
      );

      store.setMix(mixResult);
      setShowMixTrigger(false);

      // Auto-generate DM feedback
      const dm = decision_maker || '의사결정권자';
      const feedback = await runDMFeedback(mixResult, dm, session.problem_text);
      store.setDMFeedback(feedback);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mix 실패');
      store.setPhase('conversing');
    } finally {
      setIsProcessing(false);
      scrollToBottom();
    }
  };

  const handleMoreQuestions = async () => {
    // User wants to explore more before mixing.
    // We run deepening with a synthetic "더 알고 싶다" answer to the implicit "준비됐나?" question
    // so the LLM gets a clear signal to produce a NEW dimension question.
    setShowMixTrigger(false);
    setIsProcessing(true);
    store.setPhase('analyzing');

    try {
      const allQA = qaPairs
        .filter(qa => qa.answer)
        .map(qa => ({ question: qa.question, answer: qa.answer! }));

      // Add a synthetic Q&A so the LLM knows user wants more depth
      const syntheticQA = {
        question: { id: 'synthetic', text: '초안을 만들까요, 아니면 더 다듬을까요?', type: 'select' as const, engine_phase: 'recast' as const },
        answer: { question_id: 'synthetic', value: '아직 부족해요. 한 가지 더 확인하고 싶어요.' },
      };
      allQA.push(syntheticQA);

      const result = await runDeepening(
        session!.problem_text,
        latestSnapshot!,
        allQA,
        round,
        round + 2, // extend max so LLM generates another question
      );

      if (result.question) {
        store.addQuestion(result.question);
        store.setPhase('conversing');
      } else {
        setShowMixTrigger(true);
        store.setPhase('conversing');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '추가 질문 생성 실패');
      store.setPhase('conversing');
      setShowMixTrigger(true);
    } finally {
      setIsProcessing(false);
      scrollToBottom();
    }
  };

  const handleRetryDM = async () => {
    if (!mix) return;
    setIsProcessing(true);
    setError(null);
    try {
      const dm = decision_maker || '의사결정권자';
      const feedback = await runDMFeedback(mix, dm, session!.problem_text);
      store.setDMFeedback(feedback);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'DM 피드백 생성 실패');
    } finally {
      setIsProcessing(false);
      scrollToBottom();
    }
  };

  const handleSkipDM = () => {
    if (!mix) return;
    // Skip DM and go straight to final deliverable
    const markdown = [
      `# ${mix.title}`,
      '', `> ${mix.executive_summary}`, '',
      ...mix.sections.flatMap(s => [`## ${s.heading}`, '', s.content, '']),
      ...(mix.key_assumptions.length ? ['## 전제 조건', '', ...mix.key_assumptions.map(a => `- ${a}`), ''] : []),
      ...(mix.next_steps.length ? ['## 다음 단계', '', ...mix.next_steps.map(s => `- ${s}`), ''] : []),
    ].join('\n');
    store.setFinalDeliverable(markdown);
    setError(null);
  };

  const handleToggleFix = (index: number) => {
    store.toggleFix(index);
  };

  const handleFinalize = async () => {
    if (!mix || !dm_feedback) return;
    setIsProcessing(true);
    setError(null);
    scrollToBottom();

    try {
      const finalText = await runFinalDeliverable(mix, dm_feedback);
      store.setFinalDeliverable(finalText);
      track('progressive_complete', { project_id: projectId, rounds: round });
    } catch (err) {
      setError(err instanceof Error ? err.message : '최종본 생성 실패');
    } finally {
      setIsProcessing(false);
      scrollToBottom();
    }
  };

  // ─── Render ───

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-0">
      <FlowProgressBar phase={phase} round={round} hasMix={!!mix} />

      <div ref={scrollRef} className="space-y-4">
        {/* User input echo */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border-subtle)]">
          <div className="w-5 h-5 rounded-full bg-[var(--text-primary)] flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[var(--bg)] text-[10px] font-bold">나</span>
          </div>
          <p className="text-[14px] text-[var(--text-primary)]">{session.problem_text}</p>
        </div>

        {/* Analysis snapshots + Q&A interleaved */}
        {snapshots.map((snapshot, i) => (
          <div key={i} className="space-y-4">
            <AnalysisCard
              snapshot={snapshot}
              isLatest={i === snapshots.length - 1 && !mix}
              isUpdating={phase === 'analyzing' && i === snapshots.length - 1}
            />

            {/* Answered Q&A for this round */}
            {qaPairs[i] && qaPairs[i].answer && (
              <AnsweredQuestion question={qaPairs[i].question} answer={qaPairs[i].answer!} />
            )}
          </div>
        ))}

        {/* Loading state — check phase (not isProcessing) since initial analysis runs in parent */}
        {phase === 'analyzing' && snapshots.length === 0 && (
          <AnalyzingIndicator text="30초 안에 뼈대를 뽑고 있습니다..." />
        )}
        {phase === 'analyzing' && snapshots.length > 0 && (
          <AnalyzingIndicator text="답변을 반영해서 업데이트 중..." />
        )}
        {phase === 'mixing' && (
          <AnalyzingIndicator text="초안을 조합하고 있습니다..." />
        )}

        {/* Current question — key forces remount so input state resets */}
        {currentQuestion && !isProcessing && phase === 'conversing' && (
          <QuestionCard
            key={currentQuestion.id}
            question={currentQuestion}
            onAnswer={handleAnswer}
            disabled={isProcessing}
          />
        )}

        {/* Mix trigger */}
        {shouldShowMixTrigger && !isProcessing && phase === 'conversing' && !currentQuestion && (
          <MixTrigger onMix={handleMix} onMore={handleMoreQuestions} isProcessing={isProcessing} />
        )}

        {/* Mix result (shown before DM feedback) */}
        {mix && !final_deliverable && phase !== 'mixing' && !dm_feedback && !error && (
          <AnalyzingIndicator text={`${decision_maker || '의사결정권자'}의 반응을 시뮬레이션 중...`} />
        )}

        {/* DM generation failed — offer retry or skip */}
        {mix && !dm_feedback && error && !final_deliverable && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 space-y-3 phrase-entrance">
            <p className="text-[14px] text-[var(--text-primary)]">판단자 피드백 생성에 실패했습니다.</p>
            <div className="flex gap-3">
              <button
                onClick={handleRetryDM}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl text-[13px] font-medium text-white cursor-pointer"
                style={{ background: 'var(--gradient-gold)' }}
              >
                다시 시도
              </button>
              <button
                onClick={handleSkipDM}
                className="px-4 py-2 rounded-xl text-[13px] font-medium text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--accent)]/40 cursor-pointer"
              >
                건너뛰고 완성
              </button>
            </div>
          </div>
        )}

        {/* DM Feedback */}
        {dm_feedback && !final_deliverable && (
          <DMFeedbackCard
            feedback={dm_feedback}
            onToggleFix={handleToggleFix}
            onFinalize={handleFinalize}
            isProcessing={isProcessing}
          />
        )}

        {/* Final deliverable */}
        {final_deliverable && (
          <FinalDeliverableCard content={final_deliverable} />
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProgressiveStore } from '@/stores/useProgressiveStore';
import {
  runDeepening,
  runMix,
  runDMFeedback,
  runFinalDeliverable,
} from '@/lib/progressive-engine';
import { track } from '@/lib/analytics';
import type { FlowQuestion, FlowAnswer, AnalysisSnapshot, DMConcern, MixResult } from '@/stores/types';
import { ChevronRight, Loader2, Check, AlertTriangle, Sparkles, Copy, CheckCheck, UserCheck } from 'lucide-react';

/* ═══ Design tokens ═══ */
const EASE_SPRING = [0.32, 0.72, 0, 1] as const;
const CARD_ENTER = { initial: { opacity: 0, y: 24, filter: 'blur(4px)' }, animate: { opacity: 1, y: 0, filter: 'blur(0px)' }, transition: { duration: 0.7, ease: EASE_SPRING } };
const STAGGER_PARENT = { animate: { transition: { staggerChildren: 0.08 } } };
const STAGGER_CHILD = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_SPRING } } };

/* ═══ Korean particle helper ═══ */
function getParticle(name: string): string {
  const last = name.charCodeAt(name.length - 1);
  if (last >= 0xAC00 && last <= 0xD7A3) return (last - 0xAC00) % 28 !== 0 ? '은' : '는';
  return '는';
}

/* ═══ Double-Bezel Card Shell ═══ */
function BezelCard({
  children,
  accent = false,
  className = '',
}: {
  children: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <motion.div {...CARD_ENTER} className={`rounded-[1.5rem] p-[1px] ${accent ? 'bg-gradient-to-b from-[var(--accent)]/25 to-[var(--accent)]/5' : 'bg-[var(--border-subtle)]'} ${className}`}>
      <div className={`rounded-[calc(1.5rem-1px)] bg-[var(--surface)] overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]`}>
        {accent && <div className="h-[2px] w-full" style={{ background: 'var(--gradient-gold)' }} />}
        {children}
      </div>
    </motion.div>
  );
}

/* ═══ Progress Bar — premium pill ═══ */

const PHASE_LABELS = [
  { key: 'analyze', label: '문제 파악' },
  { key: 'design', label: '설계' },
  { key: 'review', label: '검증' },
  { key: 'complete', label: '완성' },
] as const;

function phaseToStep(phase: string, round: number, hasMix: boolean): number {
  if (phase === 'input') return 0;
  if (phase === 'analyzing' && round < 2) return 0;
  if (phase === 'analyzing') return 1;
  if (phase === 'conversing' && round < 2 && !hasMix) return 0;
  if (phase === 'conversing' && !hasMix) return 1;
  if (phase === 'mixing') return 1;
  if (phase === 'dm_feedback' || phase === 'refining') return 2;
  if (phase === 'complete') return 3;
  return 0;
}

function FlowProgressBar({ phase, round, hasMix }: { phase: string; round: number; hasMix: boolean }) {
  const current = phaseToStep(phase, round, hasMix);
  const progress = ((current + 0.5) / PHASE_LABELS.length) * 100;

  return (
    <div className="mb-10">
      {/* Track */}
      <div className="relative h-1 rounded-full bg-[var(--border-subtle)] overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: 'var(--gradient-gold)' }}
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: EASE_SPRING }}
        />
      </div>
      {/* Labels */}
      <div className="flex justify-between mt-3">
        {PHASE_LABELS.map((p, i) => {
          const isDone = i < current;
          const isActive = i === current;
          return (
            <div key={p.key} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full transition-all duration-500 ${
                isDone ? 'bg-[var(--accent)]' : isActive ? 'bg-[var(--accent)] ring-4 ring-[var(--accent)]/10' : 'bg-[var(--border-subtle)]'
              }`} style={{ transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }} />
              <span className={`text-[11px] font-medium transition-colors duration-500 ${
                isActive ? 'text-[var(--accent)]' : isDone ? 'text-[var(--text-secondary)]' : 'text-[var(--text-tertiary)]'
              }`}>{p.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══ Analysis Card ═══ */

function AnalysisCard({ snapshot, isLatest, isUpdating }: { snapshot: AnalysisSnapshot; isLatest: boolean; isUpdating: boolean }) {
  const [collapsed, setCollapsed] = useState(!isLatest);

  useEffect(() => {
    if (isLatest && collapsed) setCollapsed(false);
  }, [isLatest]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isLatest && collapsed) {
    return (
      <motion.button {...CARD_ENTER} onClick={() => setCollapsed(false)}
        className="w-full text-left rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-3.5 opacity-50 hover:opacity-75 cursor-pointer"
        style={{ transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)', transitionDuration: '500ms' }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] text-[var(--accent)] bg-[var(--accent)]/8 px-2 py-0.5 rounded-full font-semibold shrink-0">v{snapshot.version + 1}</span>
          <p className="text-[13px] text-[var(--text-secondary)] truncate flex-1">{snapshot.real_question}</p>
          <ChevronRight size={12} className="text-[var(--text-tertiary)] shrink-0" />
        </div>
      </motion.button>
    );
  }

  return (
    <BezelCard accent={isLatest}>
      <motion.div className="p-6 md:p-8 space-y-5" variants={STAGGER_PARENT} initial="initial" animate="animate">
        {/* Header */}
        <motion.div variants={STAGGER_CHILD}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-[0.15em] rounded-full bg-[var(--accent)]/8 px-3 py-1">진짜 질문</span>
              {snapshot.version > 0 && (
                <span className="text-[10px] text-[var(--text-tertiary)] bg-[var(--bg)] px-2 py-0.5 rounded-full">v{snapshot.version + 1}</span>
              )}
              {isUpdating && <Loader2 size={12} className="animate-spin text-[var(--accent)]" />}
            </div>
            {!isLatest && (
              <button onClick={() => setCollapsed(true)} className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--accent)] cursor-pointer" style={{ transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}>접기</button>
            )}
          </div>
          <p className="text-[18px] md:text-[22px] font-bold text-[var(--text-primary)] leading-snug tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            {snapshot.real_question}
          </p>
        </motion.div>

        {/* Insight */}
        {snapshot.insight && (
          <motion.div variants={STAGGER_CHILD} className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-[var(--accent)]/[0.04] border border-[var(--accent)]/8">
            <Sparkles size={14} className="text-[var(--accent)] mt-0.5 shrink-0" />
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{snapshot.insight}</p>
          </motion.div>
        )}

        {/* Hidden assumptions */}
        {snapshot.hidden_assumptions.length > 0 && (
          <motion.div variants={STAGGER_CHILD}>
            <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.15em] mb-2.5">숨겨진 전제</p>
            <div className="space-y-2">
              {snapshot.hidden_assumptions.map((a, i) => (
                <div key={i} className="flex items-start gap-2.5 text-[13px] text-[var(--text-secondary)]">
                  <span className="w-5 h-5 rounded-full bg-red-50 text-red-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">?</span>
                  <span className="leading-relaxed">{a}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Skeleton */}
        <motion.div variants={STAGGER_CHILD}>
          <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.15em] mb-2.5">뼈대</p>
          <div className="space-y-2">
            {snapshot.skeleton.map((s, i) => (
              <div key={i} className="flex items-start gap-3 text-[13px] text-[var(--text-primary)]">
                <span className="text-[var(--accent)] font-mono text-[11px] w-5 text-right shrink-0 mt-0.5">{i + 1}.</span>
                <span className="leading-relaxed">{s}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Execution plan */}
        {snapshot.execution_plan && (
          <motion.div variants={STAGGER_CHILD} className="pt-4 border-t border-[var(--border-subtle)]">
            <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.15em] mb-3">실행 계획</p>
            <div className="space-y-2.5">
              {snapshot.execution_plan.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3 text-[13px]">
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    step.who === 'ai' ? 'bg-blue-50 text-blue-600' :
                    step.who === 'human' ? 'bg-amber-50 text-amber-600' :
                    'bg-purple-50 text-purple-600'
                  }`}>{step.who === 'ai' ? 'AI' : step.who === 'human' ? '직접' : '협업'}</span>
                  <div className="leading-relaxed">
                    <span className="text-[var(--text-primary)]">{step.task}</span>
                    <span className="text-[var(--text-tertiary)]"> → {step.output}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </BezelCard>
  );
}

/* ═══ Question Card ═══ */

function QuestionCard({ question, onAnswer, disabled }: { question: FlowQuestion; onAnswer: (value: string) => void; disabled: boolean }) {
  const [inputValue, setInputValue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string | null>(null);

  const handleOptionClick = (opt: string) => {
    if (disabled || submitted) return;
    setSelectedValue(opt);
    setSubmitted(true);
    onAnswer(opt);
  };

  const handleTextSubmit = () => {
    if (!inputValue.trim() || disabled || submitted) return;
    setSubmitted(true);
    onAnswer(inputValue.trim());
  };

  return (
    <motion.div {...CARD_ENTER} className="rounded-[1.5rem] bg-[var(--accent)]/[0.03] border border-[var(--accent)]/12 p-6 md:p-8">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-7 h-7 rounded-full bg-[var(--accent)]/10 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[var(--accent)] text-[12px] font-bold">Q</span>
        </div>
        <div>
          <p className="text-[16px] md:text-[18px] font-semibold text-[var(--text-primary)] leading-snug tracking-tight">
            {question.text}
          </p>
          {question.subtext && (
            <p className="mt-2 text-[12px] text-[var(--text-tertiary)] leading-relaxed">{question.subtext}</p>
          )}
        </div>
      </div>

      {question.options && question.options.length > 0 ? (
        <div className="space-y-2.5 mb-4">
          {question.options.map((opt, i) => (
            <motion.button key={i} onClick={() => handleOptionClick(opt)} disabled={disabled || submitted}
              whileTap={{ scale: 0.98 }}
              className={`w-full text-left px-5 py-3.5 rounded-2xl text-[14px] border cursor-pointer ${
                selectedValue === opt
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-primary)] font-medium shadow-[var(--shadow-xs)]'
                  : submitted
                    ? 'border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-tertiary)] opacity-40'
                    : 'border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--accent)]/50 hover:shadow-[var(--shadow-xs)]'
              }`}
              style={{ transitionProperty: 'all', transitionDuration: '400ms', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
            >{opt}</motion.button>
          ))}

          <div className="flex gap-2 pt-2">
            <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)}
              placeholder="또는 직접 입력..." disabled={disabled || submitted}
              className="flex-1 px-4 py-3 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]/40 disabled:opacity-40"
              style={{ transitionProperty: 'border-color', transitionDuration: '400ms', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit(); } }}
            />
            {inputValue.trim() && (
              <motion.button onClick={handleTextSubmit} disabled={disabled || submitted}
                whileTap={{ scale: 0.96 }}
                className="shrink-0 px-5 py-3 text-white rounded-2xl text-[13px] font-semibold disabled:opacity-40 cursor-pointer"
                style={{ background: 'var(--gradient-gold)' }}>확인</motion.button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)}
            placeholder="입력..." disabled={disabled || submitted} autoFocus
            className="flex-1 px-5 py-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]/40 disabled:opacity-40"
            style={{ transitionProperty: 'border-color', transitionDuration: '400ms', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit(); } }}
          />
          <motion.button onClick={handleTextSubmit} disabled={disabled || !inputValue.trim() || submitted}
            whileTap={{ scale: 0.96 }}
            className="shrink-0 px-6 py-3.5 text-white rounded-2xl text-[14px] font-semibold shadow-[var(--shadow-sm)] disabled:opacity-40 cursor-pointer"
            style={{ background: 'var(--gradient-gold)' }}>확인</motion.button>
        </div>
      )}
    </motion.div>
  );
}

/* ═══ Answered Q (collapsed) ═══ */

function AnsweredQuestion({ question, answer }: { question: FlowQuestion; answer: FlowAnswer }) {
  return (
    <motion.div {...CARD_ENTER} className="flex items-start gap-3 px-5 py-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-subtle)] opacity-60">
      <div className="w-5 h-5 rounded-full bg-[var(--accent)]/10 flex items-center justify-center shrink-0 mt-0.5">
        <Check size={10} className="text-[var(--accent)]" />
      </div>
      <div className="min-w-0">
        <p className="text-[12px] text-[var(--text-tertiary)] truncate">{question.text}</p>
        <p className="text-[13px] text-[var(--text-primary)] font-medium mt-0.5">{answer.value}</p>
      </div>
    </motion.div>
  );
}

/* ═══ DM Feedback Card ═══ */

function DMFeedbackCard({ feedback, onToggleFix, onFinalize, isProcessing }: {
  feedback: NonNullable<import('@/stores/types').DMFeedbackResult>;
  onToggleFix: (index: number) => void;
  onFinalize: () => void;
  isProcessing: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <BezelCard>
      <button onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-5 flex items-center justify-between hover:bg-[var(--bg)]/50 cursor-pointer"
        style={{ transitionProperty: 'background', transitionDuration: '400ms', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
      >
        <div className="flex items-center gap-3">
          <UserCheck size={18} className="text-[var(--accent)]" />
          <span className="text-[15px] font-semibold text-[var(--text-primary)]">
            {feedback.persona_name}{getParticle(feedback.persona_name)} 뭐라고 할까?
          </span>
        </div>
        <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.3, ease: EASE_SPRING }}>
          <ChevronRight size={16} className="text-[var(--text-tertiary)]" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE_SPRING }} className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-5 border-t border-[var(--border-subtle)]">
              {/* First reaction */}
              <div className="pt-5">
                <p className="text-[15px] text-[var(--text-primary)] leading-relaxed italic">
                  &ldquo;{feedback.first_reaction}&rdquo;
                </p>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5">— {feedback.persona_name} ({feedback.persona_role})</p>
              </div>

              {/* Good parts */}
              {feedback.good_parts.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-green-600 uppercase tracking-[0.15em] mb-2">좋은 점</p>
                  {feedback.good_parts.map((g, i) => (
                    <p key={i} className="text-[13px] text-[var(--text-secondary)] flex items-start gap-2 mb-1.5 leading-relaxed">
                      <span className="text-green-500 shrink-0 mt-0.5">&#10003;</span> {g}
                    </p>
                  ))}
                </div>
              )}

              {/* Concerns */}
              {feedback.concerns.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.15em] mb-3">우려사항 + 수정 제안</p>
                  <div className="space-y-3">
                    {feedback.concerns.map((concern: DMConcern, i: number) => (
                      <div key={i}
                        className={`rounded-2xl border p-4 ${
                          concern.applied ? 'border-[var(--accent)]/25 bg-[var(--accent)]/[0.03]' : 'border-[var(--border-subtle)] bg-[var(--bg)]'
                        }`}
                        style={{ transitionProperty: 'all', transitionDuration: '400ms', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 ${
                              concern.severity === 'critical' ? 'bg-red-50 text-red-600' :
                              concern.severity === 'important' ? 'bg-amber-50 text-amber-600' :
                              'bg-gray-100 text-gray-500'
                            }`}>{concern.severity === 'critical' ? '필수' : concern.severity === 'important' ? '권장' : '참고'}</span>
                            <p className="text-[13px] text-[var(--text-primary)] leading-relaxed mb-1.5">{concern.text}</p>
                            <p className="text-[12px] text-[var(--accent)] leading-relaxed">→ {concern.fix_suggestion}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 pt-1">
                            <span className="text-[10px] text-[var(--text-tertiary)]">{concern.applied ? '반영' : '스킵'}</span>
                            <button onClick={() => onToggleFix(i)}
                              className={`relative w-11 h-6 rounded-full cursor-pointer ${concern.applied ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`}
                              style={{ transitionProperty: 'background', transitionDuration: '400ms', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
                            >
                              <motion.div className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                                animate={{ left: concern.applied ? 24 : 4 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Would ask */}
              {feedback.would_ask.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.15em] mb-2">이것도 물어볼 거다</p>
                  {feedback.would_ask.map((q, i) => (
                    <p key={i} className="text-[13px] text-[var(--text-secondary)] flex items-start gap-2 mb-1.5 leading-relaxed">
                      <span className="text-[var(--accent)] shrink-0">?</span> {q}
                    </p>
                  ))}
                </div>
              )}

              {/* Approval */}
              <div className="pt-4 border-t border-[var(--border-subtle)]">
                <p className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-[0.15em] mb-1.5">통과 조건</p>
                <p className="text-[14px] text-[var(--text-primary)] font-medium leading-relaxed">{feedback.approval_condition}</p>
              </div>

              <motion.button onClick={onFinalize} disabled={isProcessing} whileTap={{ scale: 0.98 }}
                className="w-full mt-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 text-white rounded-2xl text-[14px] font-semibold shadow-[var(--shadow-sm)] disabled:opacity-50 cursor-pointer"
                style={{ background: 'var(--gradient-gold)', transitionProperty: 'box-shadow', transitionDuration: '400ms', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
              >
                {isProcessing ? <><Loader2 size={16} className="animate-spin" /> 최종본 작성 중...</> : <>반영하고 완성 <ChevronRight size={14} /></>}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </BezelCard>
  );
}

/* ═══ Mix Preview Card ═══ */

function MixPreviewCard({ mix, decisionMaker, onRequestDM, onSkipDM, isProcessing }: {
  mix: MixResult; decisionMaker: string | null; onRequestDM: () => void; onSkipDM: () => void; isProcessing: boolean;
}) {
  return (
    <BezelCard accent>
      <div className="p-6 md:p-8 space-y-5">
        <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-[0.15em] rounded-full bg-[var(--accent)]/8 px-3 py-1">초안 완성</span>

        <h3 className="text-[20px] md:text-[24px] font-bold text-[var(--text-primary)] leading-tight tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          {mix.title}
        </h3>

        <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed italic border-l-[3px] border-[var(--accent)]/25 pl-5 py-1">
          {mix.executive_summary}
        </p>

        {mix.sections.map((s, i) => (
          <div key={i}>
            <p className="text-[13px] font-bold text-[var(--text-primary)] mb-1.5">{s.heading}</p>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">{renderInline(s.content)}</p>
          </div>
        ))}

        {mix.next_steps.length > 0 && (
          <div className="pt-4 border-t border-[var(--border-subtle)]">
            <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.15em] mb-2.5">다음 단계</p>
            {mix.next_steps.map((s, i) => (
              <div key={i} className="flex items-start gap-2.5 text-[13px] text-[var(--text-primary)] mb-1.5 leading-relaxed">
                <span className="text-[var(--accent)] shrink-0">→</span> {s}
              </div>
            ))}
          </div>
        )}

        {/* DM trigger */}
        <div className="pt-5 border-t border-[var(--border-subtle)] space-y-3">
          <motion.button onClick={onRequestDM} disabled={isProcessing} whileTap={{ scale: 0.98 }}
            className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-white rounded-2xl text-[14px] font-semibold shadow-[var(--shadow-sm)] disabled:opacity-50 cursor-pointer"
            style={{ background: 'var(--gradient-gold)' }}
          >
            {isProcessing
              ? <><Loader2 size={16} className="animate-spin" /> {decisionMaker || '의사결정권자'} 반응 시뮬레이션 중...</>
              : <><UserCheck size={16} /> {decisionMaker || '의사결정권자'}{getParticle(decisionMaker || '자')} 뭐라고 할까?</>}
          </motion.button>
          <button onClick={onSkipDM} disabled={isProcessing}
            className="w-full text-center text-[12px] text-[var(--text-tertiary)] hover:text-[var(--accent)] cursor-pointer py-1"
            style={{ transitionProperty: 'color', transitionDuration: '300ms', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
          >건너뛰고 이대로 완성</button>
        </div>
      </div>
    </BezelCard>
  );
}

/* ═══ Markdown Renderer ═══ */

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-semibold text-[var(--text-primary)]">{part.slice(2, -2)}</strong>
      : part
  );
}

function renderMarkdownLines(content: string) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;
  for (const line of lines) {
    key++;
    if (line.startsWith('# ')) {
      elements.push(<h1 key={key} className="text-[22px] md:text-[26px] font-bold text-[var(--text-primary)] mt-1 mb-4 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>{line.slice(2)}</h1>);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={key} className="text-[16px] font-bold text-[var(--text-primary)] mt-6 mb-2 tracking-tight">{line.slice(3)}</h2>);
    } else if (line.startsWith('> ')) {
      elements.push(<blockquote key={key} className="border-l-[3px] border-[var(--accent)]/25 pl-5 py-1 text-[14px] text-[var(--text-secondary)] italic my-2.5">{renderInline(line.slice(2))}</blockquote>);
    } else if (line.startsWith('- ')) {
      elements.push(<div key={key} className="flex items-start gap-2.5 text-[14px] text-[var(--text-primary)] ml-1 leading-relaxed"><span className="text-[var(--accent)] mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--accent)]" /><span>{renderInline(line.slice(2))}</span></div>);
    } else if (line.startsWith('---')) {
      elements.push(<hr key={key} className="border-[var(--border-subtle)] my-5" />);
    } else if (line.startsWith('*') && line.endsWith('*')) {
      elements.push(<p key={key} className="text-[13px] text-[var(--text-tertiary)] italic my-1">{line.replace(/^\*+|\*+$/g, '')}</p>);
    } else if (line.trim() === '') {
      elements.push(<div key={key} className="h-3" />);
    } else {
      elements.push(<p key={key} className="text-[14px] text-[var(--text-primary)] leading-[1.8]">{renderInline(line)}</p>);
    }
  }
  return elements;
}

/* ═══ Final Deliverable ═══ */

function FinalDeliverableCard({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    track('flow_deliverable_copy', { length: content.length });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div {...CARD_ENTER}>
      {/* Double bezel — gold outer */}
      <div className="rounded-[1.75rem] p-[2px] bg-gradient-to-b from-[var(--accent)]/30 via-[var(--accent)]/10 to-transparent">
        <div className="rounded-[calc(1.75rem-2px)] bg-[var(--surface)] overflow-hidden shadow-[inset_0_1px_2px_rgba(255,255,255,0.6),var(--shadow-lg)]">
          <div className="h-[3px] w-full" style={{ background: 'var(--gradient-gold)' }} />
          <div className="px-6 py-4 flex items-center justify-between border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                <Check size={12} className="text-[var(--accent)]" />
              </div>
              <span className="text-[14px] font-semibold text-[var(--text-primary)]">최종 산출물</span>
            </div>
            <motion.button onClick={handleCopy} whileTap={{ scale: 0.96 }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-medium bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40 cursor-pointer"
              style={{ transitionProperty: 'border-color', transitionDuration: '300ms', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
            >
              {copied ? <><CheckCheck size={12} /> 복사됨</> : <><Copy size={12} /> 복사</>}
            </motion.button>
          </div>
          <div className="p-6 md:p-8 space-y-1">{renderMarkdownLines(content)}</div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══ Loading ═══ */

function AnalyzingIndicator({ text, steps }: { text: string; steps?: string[] }) {
  const [stepIndex, setStepIndex] = useState(0);
  useEffect(() => {
    if (!steps || steps.length <= 1) return;
    const interval = setInterval(() => setStepIndex(prev => (prev + 1) % steps.length), 3000);
    return () => clearInterval(interval);
  }, [steps]);

  return (
    <motion.div {...CARD_ENTER} className="flex items-center gap-4 px-6 py-5 rounded-2xl bg-[var(--accent)]/[0.03] border border-[var(--accent)]/10">
      <div className="relative w-5 h-5 shrink-0">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <Loader2 size={18} className="text-[var(--accent)]" />
        </motion.div>
      </div>
      <AnimatePresence mode="wait">
        <motion.span key={stepIndex} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3, ease: EASE_SPRING }}
          className="text-[14px] text-[var(--text-secondary)]"
        >{steps && steps.length > 0 ? steps[stepIndex] : text}</motion.span>
      </AnimatePresence>
    </motion.div>
  );
}

/* ═══ Mix Trigger ═══ */

function MixTrigger({ onMix, onMore, isProcessing }: { onMix: () => void; onMore: () => void; isProcessing: boolean }) {
  return (
    <motion.div {...CARD_ENTER} className="space-y-4">
      <p className="text-[13px] text-[var(--text-tertiary)] text-center">분석이 충분히 쌓였습니다. 초안을 만들어볼까요?</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <motion.button onClick={onMix} disabled={isProcessing} whileTap={{ scale: 0.98 }}
          className="flex-1 inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-white rounded-2xl text-[14px] font-semibold shadow-[var(--shadow-sm)] disabled:opacity-50 cursor-pointer"
          style={{ background: 'var(--gradient-gold)' }}
        >
          {isProcessing ? <><Loader2 size={16} className="animate-spin" /> 초안 조합 중...</> : <>초안 완성하기 <ChevronRight size={14} /></>}
        </motion.button>
        {!isProcessing && (
          <motion.button onClick={onMore} whileTap={{ scale: 0.98 }}
            className="px-6 py-3.5 rounded-2xl text-[14px] font-medium text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--accent)]/40 cursor-pointer"
            style={{ transitionProperty: 'border-color', transitionDuration: '400ms', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
          >질문 하나 더</motion.button>
        )}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════ */
/* ═══ MAIN: ProgressiveFlow ═══════════════════════ */
/* ═══════════════════════════════════════════════════ */

export function ProgressiveFlow({ projectId }: { projectId: string }) {
  const store = useProgressiveStore();
  const session = store.currentSession();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMixTrigger, setShowMixTrigger] = useState(false);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 150);
  }, []);

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

  const qaPairs = useMemo(() => questions.map((q, i) => ({ question: q, answer: answers[i] || null })), [questions, answers]);
  const currentQuestion = questions.length > answers.length ? questions[questions.length - 1] : null;
  const latestSnapshot = snapshots[snapshots.length - 1] || null;
  const shouldShowMixTrigger = showMixTrigger || (phase === 'conversing' && snapshots.length > 0 && !currentQuestion && !mix && !isProcessing);

  if (!session) return null;

  /* ─── Handlers ─── */

  const handleAnswer = async (value: string) => {
    if (!currentQuestion || isProcessing || !latestSnapshot) return;
    const answer: FlowAnswer = { question_id: currentQuestion.id, value };
    store.addAnswer(answer);
    store.setPhase('analyzing');
    track('flow_answer', { round, question_type: currentQuestion.type });
    setIsProcessing(true); setError(null); scrollToBottom();

    try {
      const allQA = qaPairs.filter(qa => qa.answer).map(qa => ({ question: qa.question, answer: qa.answer! }));
      allQA.push({ question: currentQuestion, answer });
      if (!decision_maker && round === 0) {
        const dm = value.includes('대표') ? '대표님' : value.includes('팀장') ? '팀장님' : value.includes('투자') ? '투자자' : value.includes('클라이언트') || value.includes('고객') ? '클라이언트' : null;
        if (dm) store.setDecisionMaker(dm);
      }
      const result = await runDeepening(session.problem_text, latestSnapshot, allQA, round, max_rounds);
      store.addSnapshot(result.snapshot); store.advanceRound();
      if (result.readyForMix || !result.question) { setShowMixTrigger(true); store.setPhase('conversing'); }
      else { store.addQuestion(result.question); store.setPhase('conversing'); }
    } catch (err) { setError(err instanceof Error ? err.message : '분석 실패'); store.setPhase('conversing'); }
    finally { setIsProcessing(false); scrollToBottom(); }
  };

  const handleMix = async () => {
    setIsProcessing(true); setError(null); store.setPhase('mixing'); scrollToBottom();
    try {
      const allQA = qaPairs.filter(qa => qa.answer).map(qa => ({ question: qa.question, answer: qa.answer! }));
      const mixResult = await runMix(session!.problem_text, snapshots, allQA, decision_maker);
      store.setMix(mixResult); setShowMixTrigger(false);
      track('flow_mix_complete', { rounds_used: round, sections: mixResult.sections.length });
    } catch (err) { setError(err instanceof Error ? err.message : '초안 생성 실패'); store.setPhase('conversing'); }
    finally { setIsProcessing(false); scrollToBottom(); }
  };

  const handleRequestDM = async () => {
    if (!mix) return;
    setIsProcessing(true); setError(null); scrollToBottom();
    try {
      const dm = decision_maker || '의사결정권자';
      const feedback = await runDMFeedback(mix, dm, session!.problem_text);
      store.setDMFeedback(feedback);
      track('flow_dm_feedback', { dm_name: dm, concerns_count: feedback.concerns.length });
    } catch (err) { setError(err instanceof Error ? err.message : 'DM 피드백 생성 실패'); }
    finally { setIsProcessing(false); scrollToBottom(); }
  };

  const handleMoreQuestions = async () => {
    if (!latestSnapshot) return;
    setShowMixTrigger(false); setIsProcessing(true); store.setPhase('analyzing');
    try {
      const allQA = qaPairs.filter(qa => qa.answer).map(qa => ({ question: qa.question, answer: qa.answer! }));
      allQA.push({ question: { id: 'syn', text: '더 다듬을까요?', type: 'select', engine_phase: 'recast' }, answer: { question_id: 'syn', value: '한 가지 더 확인하고 싶어요.' } });
      const result = await runDeepening(session!.problem_text, latestSnapshot, allQA, round, round + 2);
      if (result.question) { store.addQuestion(result.question); store.setPhase('conversing'); }
      else { setShowMixTrigger(true); store.setPhase('conversing'); }
    } catch (err) { setError(err instanceof Error ? err.message : '추가 질문 실패'); store.setPhase('conversing'); setShowMixTrigger(true); }
    finally { setIsProcessing(false); scrollToBottom(); }
  };

  const handleSkipDM = () => {
    if (!mix) return;
    track('flow_skip_dm', { rounds: round });
    const md = [`# ${mix.title}`, '', `> ${mix.executive_summary}`, '', ...mix.sections.flatMap(s => [`## ${s.heading}`, '', s.content, '']),
      ...(mix.key_assumptions.length ? ['## 전제 조건', '', ...mix.key_assumptions.map(a => `- ${a}`), ''] : []),
      ...(mix.next_steps.length ? ['## 다음 단계', '', ...mix.next_steps.map(s => `- ${s}`), ''] : [])].join('\n');
    store.setFinalDeliverable(md); setError(null);
  };

  const handleToggleFix = (i: number) => { store.toggleFix(i); };

  const handleFinalize = async () => {
    if (!mix || !dm_feedback) return;
    setIsProcessing(true); setError(null); scrollToBottom();
    try {
      const finalText = await runFinalDeliverable(mix, dm_feedback);
      store.setFinalDeliverable(finalText);
      track('progressive_complete', { project_id: projectId, rounds: round, fixes_applied: dm_feedback.concerns.filter(c => c.applied).length });
    } catch (err) { setError(err instanceof Error ? err.message : '최종본 생성 실패'); }
    finally { setIsProcessing(false); scrollToBottom(); }
  };

  /* ─── Render ─── */
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-0">
      <FlowProgressBar phase={phase} round={round} hasMix={!!mix} />

      <div className="space-y-6">
        {/* User input */}
        <motion.div {...CARD_ENTER} className="flex items-start gap-3.5 px-5 py-4 rounded-2xl bg-[var(--bg)] border border-[var(--border-subtle)]">
          <div className="w-6 h-6 rounded-full bg-[var(--text-primary)] flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[var(--bg)] text-[10px] font-bold">나</span>
          </div>
          <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">{session.problem_text}</p>
        </motion.div>

        {/* Snapshots + Q&A */}
        {snapshots.map((snapshot, i) => (
          <div key={i} className="space-y-5">
            <AnalysisCard snapshot={snapshot} isLatest={i === snapshots.length - 1 && !mix} isUpdating={phase === 'analyzing' && i === snapshots.length - 1} />
            {qaPairs[i]?.answer && <AnsweredQuestion question={qaPairs[i].question} answer={qaPairs[i].answer!} />}
          </div>
        ))}

        {/* Loading */}
        {phase === 'analyzing' && snapshots.length === 0 && (
          <AnalyzingIndicator text="분석 시작..." steps={['상황을 파악하고 있습니다...', '숨겨진 전제를 찾는 중...', '뼈대를 만들고 있습니다...', '거의 다 됐습니다...']} />
        )}
        {phase === 'analyzing' && snapshots.length > 0 && (
          <AnalyzingIndicator text="답변을 반영해서 업데이트 중..." />
        )}
        {phase === 'mixing' && (
          <AnalyzingIndicator text="초안 조합 중..." steps={['분석 결과를 종합하고 있습니다...', '문서 구조를 잡는 중...', '내용을 채우고 있습니다...', '마무리 중...']} />
        )}

        {/* Question */}
        {currentQuestion && !isProcessing && phase === 'conversing' && (
          <QuestionCard key={currentQuestion.id} question={currentQuestion} onAnswer={handleAnswer} disabled={isProcessing} />
        )}

        {/* Mix trigger */}
        {shouldShowMixTrigger && !isProcessing && phase === 'conversing' && !currentQuestion && (
          <MixTrigger onMix={handleMix} onMore={handleMoreQuestions} isProcessing={isProcessing} />
        )}

        {/* Mix preview */}
        {mix && !dm_feedback && !final_deliverable && phase !== 'mixing' && (
          <MixPreviewCard mix={mix} decisionMaker={decision_maker} onRequestDM={handleRequestDM} onSkipDM={handleSkipDM} isProcessing={isProcessing} />
        )}

        {/* DM Feedback */}
        {dm_feedback && !final_deliverable && (
          <DMFeedbackCard feedback={dm_feedback} onToggleFix={handleToggleFix} onFinalize={handleFinalize} isProcessing={isProcessing} />
        )}

        {/* Final */}
        {final_deliverable && (
          <>
            <FinalDeliverableCard content={final_deliverable} />
            <motion.div {...CARD_ENTER} className="text-center pt-6 pb-12">
              <p className="text-[13px] text-[var(--text-tertiary)] mb-3">문서를 복사해서 바로 사용하세요.</p>
              <a href="/workspace" onClick={() => useProgressiveStore.setState({ currentSessionId: null })}
                className="text-[13px] text-[var(--accent)] hover:underline cursor-pointer"
                style={{ transitionProperty: 'color', transitionDuration: '300ms', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
              >새 프로젝트 시작하기</a>
            </motion.div>
          </>
        )}

        {/* Error */}
        {error && (
          error.startsWith('LOGIN_REQUIRED') ? (
            <motion.div {...CARD_ENTER} className="rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent)]/5 p-6">
              <p className="text-[15px] font-bold text-[var(--text-primary)] mb-1">무료 체험을 모두 사용했어요</p>
              <p className="text-[13px] text-[var(--text-secondary)] mb-4 leading-relaxed">로그인하면 하루 10회까지 무료로 계속 사용할 수 있습니다.</p>
              <a href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white text-[14px] font-semibold" style={{ background: 'var(--gradient-gold)' }}>
                로그인 / 회원가입 <ChevronRight size={14} />
              </a>
            </motion.div>
          ) : (
            <motion.div {...CARD_ENTER} className="flex items-start gap-2.5 px-5 py-4 rounded-2xl bg-red-50 border border-red-200 text-[13px] text-red-700">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )
        )}
      </div>
    </div>
  );
}

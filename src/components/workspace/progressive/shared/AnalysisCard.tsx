'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, AlertTriangle } from 'lucide-react';
import type { AnalysisSnapshot } from '@/stores/types';
import { EASE } from './constants';
import { diffItems } from './diffItems';
import type { ReactNode } from 'react';

// ─── Inline formatting helpers ───

/** Parse **bold** syntax in text */
function renderText(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-semibold text-[var(--text-primary)]">{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>,
  );
}

/** Split "prefix — body" for skeleton items */
function splitSkeleton(text: string): { prefix: string | null; body: string } {
  const sep = text.indexOf(' — ');
  if (sep > 0 && sep < 25) {
    return { prefix: text.slice(0, sep), body: text.slice(sep + 3) };
  }
  return { prefix: null, body: text };
}

interface AnalysisCardProps {
  snapshot: AnalysisSnapshot;
  prevSnapshot: AnalysisSnapshot | null;
  isActive?: boolean;
  showExecutionPlan?: boolean;
  locale?: 'ko' | 'en';
  /** Team avatars for attribution — shows "분석 팀 조사 반영" */
  team?: Array<{ emoji: string; color: string; name: string }>;
}

export function AnalysisCard({
  snapshot,
  prevSnapshot,
  isActive = true,
  showExecutionPlan = false,
  locale = 'ko',
  team,
}: AnalysisCardProps) {
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  const hasChanges = prevSnapshot && snapshot.version > (prevSnapshot.version ?? 0);
  const questionChanged = hasChanges && prevSnapshot.real_question !== snapshot.real_question;

  const skeletonDiff = hasChanges
    ? diffItems(prevSnapshot.skeleton, snapshot.skeleton)
    : snapshot.skeleton.map(s => ({ text: s, status: 'same' as const }));
  const assumptionDiff = hasChanges
    ? diffItems(prevSnapshot.hidden_assumptions, snapshot.hidden_assumptions)
    : snapshot.hidden_assumptions.map(a => ({ text: a, status: 'same' as const }));

  const newCount = skeletonDiff.filter(d => d.status === 'new').length + assumptionDiff.filter(d => d.status === 'new').length;
  const removedCount = skeletonDiff.filter(d => d.status === 'removed').length + assumptionDiff.filter(d => d.status === 'removed').length;

  const activeAssumptions = assumptionDiff.filter(d => d.status !== 'removed');
  const removedAssumptions = assumptionDiff.filter(d => d.status === 'removed');
  const activeSkeleton = skeletonDiff.filter(d => d.status !== 'removed');
  const removedSkeleton = skeletonDiff.filter(d => d.status === 'removed');

  return (
    <motion.div
      initial={prevSnapshot ? { opacity: 0.85 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prevSnapshot ? 0.3 : 0.6, ease: EASE }}
      className="rounded-2xl">
      <div className={`rounded-2xl p-[1px] ${isActive ? 'bg-gradient-to-b from-[var(--accent)]/20 to-[var(--accent)]/5' : 'bg-[var(--border-subtle)]'}`}>
        <div className="rounded-[calc(1rem-1px)] bg-[var(--surface)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
          {isActive && <div className="h-[2px]" style={{ background: 'var(--gradient-gold)' }} />}
          <div className="p-5 md:p-7">
            {/* Version progress dots — shows accumulation */}
            {snapshot.version > 0 && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: snapshot.version + 1 }, (_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${
                      i <= snapshot.version ? 'bg-[var(--accent)]' : 'bg-[var(--border-subtle)]'
                    } ${i === snapshot.version ? 'w-6' : 'w-1.5'}`} />
                  ))}
                </div>
                <span className="text-[12px] font-medium text-[var(--accent)]">
                  {snapshot.version === 1 ? L('답변 반영됨', 'Updated with your answer') : L(`${snapshot.version}회 개선됨`, `Refined ${snapshot.version}x`)}
                </span>
                {hasChanges && (newCount > 0 || removedCount > 0) && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                    {newCount > 0 && `+${newCount}`}{newCount > 0 && removedCount > 0 && ' '}{removedCount > 0 && `−${removedCount}`}
                  </span>
                )}
              </motion.div>
            )}

            {/* Eyebrow */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-[0.15em] rounded-full bg-[var(--accent)]/8 px-2.5 py-0.5">
                {L('진짜 질문', 'Real Question')}
              </span>
            </div>

            {/* Real question with change */}
            <div className="mb-4">
              {questionChanged && (
                <div className="mb-2 px-3 py-1.5 rounded-lg bg-[var(--bg)]/60 border-l-2 border-[var(--text-tertiary)]/20">
                  <p className="text-[12px] text-[var(--text-tertiary)] line-through leading-relaxed"
                    style={{ fontFamily: 'var(--font-display)' }}>
                    {prevSnapshot.real_question}
                  </p>
                </div>
              )}
              <AnimatePresence mode="wait">
                <motion.h2 key={snapshot.real_question} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="text-[18px] md:text-[22px] font-bold text-[var(--text-primary)] leading-[1.35] tracking-tight"
                  style={{ fontFamily: 'var(--font-display)' }}>
                  {snapshot.real_question}
                </motion.h2>
              </AnimatePresence>
            </div>

            {/* Insight */}
            <AnimatePresence>
              {snapshot.insight && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.4, ease: EASE }} className="overflow-hidden mb-6">
                  <div className="pl-4 py-3 border-l-[3px] border-[var(--accent)]/40">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Sparkles size={12} className="text-[var(--accent)]" />
                      <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-[0.15em]">{L('핵심', 'Key Insight')}</span>
                    </div>
                    <p className="text-[15px] md:text-[16px] text-[var(--text-primary)] leading-[1.6] font-medium">{renderText(snapshot.insight)}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ═══ Redesigned: Blindspots → Bridge → Skeleton ═══ */}
            <div className="space-y-0">

              {/* ─── Team Attribution Bar ─── */}
              {team && team.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15, duration: 0.4 }}
                  className="flex items-center gap-2.5 mb-5 py-2 px-3.5 rounded-xl bg-[var(--accent)]/[0.04] border border-[var(--accent)]/10">
                  <div className="flex -space-x-1.5">
                    {team.slice(0, 4).map((t, i) => (
                      <div key={i} className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] border-[1.5px] border-[var(--surface)]"
                        style={{ backgroundColor: t.color + '25' }}>{t.emoji}</div>
                    ))}
                  </div>
                  <span className="text-[11px] font-medium text-[var(--accent)]/70">
                    {L('분석 팀 조사 결과 반영', 'Analysis team findings reflected')}
                  </span>
                </motion.div>
              )}

              {/* ─── Blindspots: Warning Cards ─── */}
              <AnimatePresence>
                {removedAssumptions.map((d, i) => (
                  <motion.div key={`removed-a-${i}`} initial={{ opacity: 0.5 }} animate={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.8, ease: EASE }}
                    className="flex items-start gap-2 text-[12px] text-red-300 line-through leading-relaxed overflow-hidden px-4 py-2 mb-1">
                    <span className="text-red-300 text-[9px] font-bold shrink-0 mt-0.5">−</span>
                    <span>{d.text}</span>
                  </motion.div>
                ))}
              </AnimatePresence>

              {activeAssumptions.length > 0 && (
                <div className="mb-2">
                  {/* Section header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-[22px] h-[22px] rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <AlertTriangle size={12} className="text-amber-500/80" />
                    </div>
                    <span className="text-[13px] font-bold text-[var(--text-primary)]">
                      {L('놓치기 쉬운 것', 'Hidden Assumptions')}
                    </span>
                    <span className="text-[11px] text-[var(--text-tertiary)]">
                      {activeAssumptions.length}
                    </span>
                  </div>

                  {/* Warning cards */}
                  <div className="space-y-2.5">
                    {activeAssumptions.map((d, i) => (
                      <motion.div key={`${snapshot.version}-a${i}`}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08, duration: 0.4, ease: EASE }}
                        className={`rounded-xl border-l-[3px] transition-colors duration-1000 ${
                          d.status === 'new'
                            ? 'border-l-amber-400 bg-amber-50/50 dark:bg-amber-950/15'
                            : 'border-l-amber-300/40 bg-amber-50/25 dark:bg-amber-950/8'
                        }`}>
                        <div className="flex items-start gap-3 px-4 py-3.5">
                          <span className={`text-[18px] leading-none shrink-0 mt-0.5 select-none ${
                            d.status === 'new' ? 'text-amber-500' : 'text-amber-400/50'
                          }`}>!</span>
                          <p className="text-[13px] md:text-[14px] text-[var(--text-primary)] leading-[1.7]">
                            {renderText(d.text)}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── Bridge: Visual Connection ─── */}
              {activeAssumptions.length > 0 && activeSkeleton.length > 0 && (
                <div className="flex items-center gap-3 py-4">
                  <div className="h-px flex-1 bg-gradient-to-r from-amber-300/25 via-[var(--border-subtle)] to-[var(--accent)]/25" />
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)]/60 uppercase tracking-[0.12em] whitespace-nowrap select-none">
                    {L('이 함정을 넘어서', 'Navigating these')} ↓
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-l from-amber-300/25 via-[var(--border-subtle)] to-[var(--accent)]/25" />
                </div>
              )}

              {/* ─── Skeleton: Step Timeline ─── */}
              <AnimatePresence>
                {removedSkeleton.map((d, i) => (
                  <motion.div key={`removed-s-${i}`} initial={{ opacity: 0.5 }} animate={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.8, ease: EASE }}
                    className="flex items-start gap-2 text-[12px] text-red-300 line-through leading-relaxed overflow-hidden px-4 py-2 mb-1">
                    <span className="text-red-300 font-mono text-[9px] shrink-0 mt-1">−</span>
                    <span>{d.text}</span>
                  </motion.div>
                ))}
              </AnimatePresence>

              {activeSkeleton.length > 0 && (
                <div>
                  {/* Section header */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-[22px] h-[22px] rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                      <span className="text-[var(--accent)] text-[11px] font-bold">#</span>
                    </div>
                    <span className="text-[13px] font-bold text-[var(--text-primary)]">
                      {L('뼈대', 'Structure')}
                    </span>
                    <span className="text-[11px] text-[var(--text-tertiary)]">
                      {activeSkeleton.length}{L('단계', ' steps')}
                    </span>
                  </div>

                  {/* Timeline */}
                  <div className="relative ml-1">
                    {/* Vertical connecting line */}
                    {activeSkeleton.length > 1 && (
                      <div className="absolute left-[13px] top-[20px] bottom-[20px] w-px bg-[var(--accent)]/12" />
                    )}

                    <div className="space-y-3">
                      {activeSkeleton.map((d, i) => {
                        const { prefix, body } = splitSkeleton(d.text);
                        return (
                          <motion.div key={`${snapshot.version}-s${i}`}
                            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.07, duration: 0.4, ease: EASE }}
                            className="flex gap-3.5 relative">
                            {/* Step number circle */}
                            <div className="shrink-0 relative z-10 pt-0.5">
                              <div className={`w-[28px] h-[28px] rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-500 ${
                                d.status === 'new'
                                  ? 'bg-[var(--accent)] text-white shadow-sm shadow-[var(--accent)]/25'
                                  : 'bg-[var(--surface)] border-2 border-[var(--accent)]/20 text-[var(--accent)]'
                              }`}>
                                {i + 1}
                              </div>
                            </div>
                            {/* Step content card */}
                            <div className={`flex-1 rounded-xl px-4 py-3 border transition-all duration-1000 ${
                              d.status === 'new'
                                ? 'bg-[var(--accent)]/[0.04] border-[var(--accent)]/12 shadow-sm shadow-[var(--accent)]/5'
                                : 'bg-[var(--bg)]/40 border-transparent'
                            }`}>
                              {prefix && (
                                <h4 className="text-[14px] md:text-[15px] font-bold text-[var(--text-primary)] mb-1 tracking-tight">
                                  {prefix}
                                </h4>
                              )}
                              <p className="text-[13px] text-[var(--text-secondary)] leading-[1.7]">
                                {renderText(body)}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Execution plan footer — workspace only */}
            <AnimatePresence>
              {showExecutionPlan && snapshot.execution_plan && snapshot.execution_plan.steps.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.5, ease: EASE }} className="overflow-hidden">
                  <div className="pt-4 mt-4 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)]">{L('실행 계획:', 'Execution Plan:')}</span>
                      {snapshot.execution_plan.steps.map((step, i) => (
                        <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          step.who === 'ai' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : step.who === 'human' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' : 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400'
                        }`}>{step.task}</span>
                      ))}
                      <span className="text-[10px] text-[var(--text-tertiary)]">
                        <span className="hidden lg:inline">{L('우측 패널에서 확인 →', 'See right panel →')}</span>
                        <span className="lg:hidden">{L('↓ 하단 팀 탭에서 진행 중', '↓ In progress in team tab below')}</span>
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

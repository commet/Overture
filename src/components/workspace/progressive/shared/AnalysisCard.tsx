'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import type { AnalysisSnapshot } from '@/stores/types';
import { EASE } from './constants';
import { diffItems } from './diffItems';

interface AnalysisCardProps {
  snapshot: AnalysisSnapshot;
  prevSnapshot: AnalysisSnapshot | null;
  isActive?: boolean;
  showExecutionPlan?: boolean;
  locale?: 'ko' | 'en';
}

export function AnalysisCard({
  snapshot,
  prevSnapshot,
  isActive = true,
  showExecutionPlan = false,
  locale = 'ko',
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
                  transition={{ duration: 0.4, ease: EASE }} className="overflow-hidden mb-5">
                  <div className="px-4 py-3 rounded-xl bg-[var(--accent)]/[0.06] border border-[var(--accent)]/12">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Sparkles size={11} className="text-[var(--accent)]" />
                      <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-[0.15em]">{L('핵심', 'Key Insight')}</span>
                    </div>
                    <p className="text-[13px] text-[var(--text-primary)] leading-relaxed font-medium">{snapshot.insight}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Two-column: Assumptions | Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              {assumptionDiff.filter(d => d.status !== 'removed').length > 0 && (
                <div className="rounded-xl bg-[var(--bg)]/60 p-4">
                  <p className="text-[12px] font-semibold text-[var(--text-primary)] mb-2.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400/60" />{L('놓치기 쉬운 것', 'Hidden Assumptions')}
                  </p>
                  <div className="space-y-1.5">
                    <AnimatePresence>
                      {assumptionDiff.filter(d => d.status === 'removed').map((d, i) => (
                        <motion.div key={`removed-a-${i}`} initial={{ opacity: 0.5 }} animate={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.8, ease: EASE }}
                          className="flex items-start gap-2 text-[12px] text-red-300 line-through leading-relaxed overflow-hidden">
                          <span className="text-red-300 text-[9px] font-bold shrink-0 mt-0.5">−</span>
                          <span>{d.text}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {assumptionDiff.filter(d => d.status !== 'removed').map((d, i) => (
                      <motion.div key={`${snapshot.version}-a${i}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06, duration: 0.35, ease: EASE }}
                        className={`flex items-start gap-2 text-[12px] leading-[1.7] rounded-lg px-2 py-0.5 -mx-2 transition-colors duration-1000 ${
                          d.status === 'new' ? 'bg-emerald-50/60 dark:bg-emerald-900/10 text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                        }`}>
                        <span className={`text-[9px] font-bold shrink-0 mt-1 ${
                          d.status === 'new' ? 'text-emerald-500' : 'text-red-400/50'
                        }`}>{d.status === 'new' ? '+' : '?'}</span>
                        <span>{d.text}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-xl bg-[var(--bg)]/60 p-4">
                <p className="text-[12px] font-semibold text-[var(--text-primary)] mb-2.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]/60" />{L('뼈대', 'Structure')}
                </p>
                <div className="space-y-1">
                  <AnimatePresence>
                    {skeletonDiff.filter(d => d.status === 'removed').map((d, i) => (
                      <motion.div key={`removed-s-${i}`} initial={{ opacity: 0.5 }} animate={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.8, ease: EASE }}
                        className="flex items-start gap-2 text-[12px] text-red-300 line-through leading-relaxed overflow-hidden">
                        <span className="text-red-300 font-mono text-[9px] shrink-0 mt-1">−</span>
                        <span>{d.text}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {skeletonDiff.filter(d => d.status !== 'removed').map((d, i) => (
                    <motion.div key={`${snapshot.version}-s${i}`} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.35, ease: EASE }}
                      className={`flex items-start gap-2.5 text-[12px] leading-[1.7] rounded-lg px-2 py-0.5 -mx-2 transition-colors duration-1000 ${
                        d.status === 'new' ? 'bg-emerald-50/60 dark:bg-emerald-900/10 text-[var(--text-primary)] font-medium' : 'text-[var(--text-primary)]'
                      }`}>
                      <span className={`font-mono text-[10px] w-3.5 text-right shrink-0 mt-0.5 ${
                        d.status === 'new' ? 'text-emerald-500 font-bold' : 'text-[var(--accent)]/40'
                      }`}>{d.status === 'new' ? '+' : `${i + 1}`}</span>
                      <span>{d.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Execution plan footer — workspace only */}
            <AnimatePresence>
              {showExecutionPlan && snapshot.execution_plan && snapshot.execution_plan.steps.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.5, ease: EASE }} className="overflow-hidden">
                  <div className="pt-4 border-t border-[var(--border-subtle)]">
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

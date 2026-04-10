'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProgressiveStore } from '@/stores/useProgressiveStore';
import {
  runDeepening,
  refineInitialFraming,
  runMix,
  runDMFeedback,
  runBossDMFeedback,
  runFinalDeliverable,
  runConcertmasterReview,
  runDebate,
  runLeadSynthesis,
  type ConcertmasterReview,
  type DebateResult,
} from '@/lib/progressive-engine';
import { buildLeadDecompositionContext, type LeadAgentConfig } from '@/lib/lead-agent';
import { assessConvergence, assessConvergenceWithWorkers } from '@/lib/progressive-convergence';
import { exportProgressiveAsReframe, exportProgressiveAsRecast } from '@/lib/progressive-handoff';
import { useAgentStore } from '@/stores/useAgentStore';
import { usePersonaStore } from '@/stores/usePersonaStore';
import { useReframeStore } from '@/stores/useReframeStore';
import { useRecastStore } from '@/stores/useRecastStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { runAllAIWorkers, runPipeline, type WorkerContext } from '@/lib/worker-engine';
import { withTranscript } from '@/lib/execution-transcript';
import { getCompletionNote } from '@/lib/worker-personas';
import { track } from '@/lib/analytics';
import type { FlowQuestion, FlowAnswer, AnalysisSnapshot, DMConcern, MixResult, ConvergenceMetrics, WorkerTask, LeadSynthesisResult } from '@/stores/types';
import { WorkerReportBlock } from './WorkerCard';
import { WorkerAvatar, AvatarRow } from './WorkerAvatar';
import { useWorkerActions } from '@/hooks/useWorkerActions';
import { useWorkerContext } from './WorkerPanel';
import { useStaggeredReveal } from '@/hooks/useStaggeredReveal';
import { ChevronRight, Loader2, Check, AlertTriangle, Sparkles, UserCheck, ArrowRight } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { EASE, SPRING } from './shared/constants';
import { diffItems } from './shared/diffItems';
import { renderInline, renderMd } from './shared/renderMd';
import { AnalysisCard } from './shared/AnalysisCard';
import { QuestionCard } from './shared/QuestionCard';

/* Phase-aware ambient glow — the page itself tells you where you are */
function PhaseAmbient({ phase }: { phase: string }) {
  const bg = phase === 'complete'
    ? 'radial-gradient(ellipse 80% 50% at 50% 20%, rgba(184,150,62,0.08) 0%, transparent 70%)'
    : phase === 'dm_feedback' || phase === 'refining' || phase === 'mixing' || phase === 'lead_synthesizing'
      ? 'radial-gradient(ellipse 80% 50% at 50% 20%, rgba(184,150,62,0.04) 0%, transparent 70%)'
      : 'none';
  return <motion.div className="fixed inset-0 pointer-events-none z-0" animate={{ background: bg }} transition={{ duration: 1.5, ease: EASE }} />;
}

function getParticle(name: string): string {
  const c = name.charCodeAt(name.length - 1);
  if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28 !== 0 ? '은' : '는';
  return '는';
}

/* ═══ Progress line ═══ */
const PHASES_KO = ['상황 분석', '팀 작업', '피드백', '완성'] as const;
const PHASES_EN = ['Analysis', 'Teamwork', 'Feedback', 'Complete'] as const;

function phaseIdx(phase: string, round: number, hasMix: boolean): number {
  if (phase === 'complete') return 4;
  if (phase === 'dm_feedback' || phase === 'refining') return 3;
  if (phase === 'mixing' || phase === 'lead_synthesizing' || (phase === 'conversing' && hasMix)) return 2;
  if (round >= 2 || (phase === 'analyzing' && round >= 2)) return 1;
  return 0;
}

function ProgressLine({ phase, round, hasMix }: { phase: string; round: number; hasMix: boolean }) {
  const locale = useLocale();
  const PHASES = locale === 'ko' ? PHASES_KO : PHASES_EN;
  const idx = phaseIdx(phase, round, hasMix);
  const pct = Math.min((idx / 4) * 100, 100);
  return (
    <div className="mb-12">
      <div className="relative h-[2px] rounded-full bg-[var(--border-subtle)] overflow-hidden">
        <motion.div className="absolute inset-y-0 left-0 rounded-full" style={{ background: 'var(--gradient-gold)' }}
          animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: EASE }} />
      </div>
      <div className="flex justify-between mt-2.5 px-1">
        {PHASES.map((label, i) => {
          const done = i < idx; const active = i === idx && phase !== 'complete'; const final_ = phase === 'complete' && i === 3;
          return <span key={label} className={`text-[10px] tracking-wide font-medium transition-all duration-700 ${
            done || final_ ? 'text-[var(--accent)]' : active ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
          }`} style={{ transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}>{done || final_ ? '✓ ' : ''}{label}</span>;
        })}
      </div>
    </div>
  );
}

/* LiveAnalysis + VersionPills → replaced by shared AnalysisCard */

/* ═══ Answered Q&A — horizontal pills with "sent to team" indicator ═══ */
function AnsweredPills({ qaPairs }: { qaPairs: Array<{ question: FlowQuestion; answer: FlowAnswer | null }> }) {
  const locale = useLocale();
  const answered = qaPairs.filter(qa => qa.answer);
  if (!answered.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {answered.map((qa, i) => (
        <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05, ...SPRING }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border-subtle)] text-[11px]">
          <Check size={10} className="text-[var(--accent)]" />
          <span className="text-[var(--text-tertiary)] max-w-[80px] truncate">{qa.question.text.split(' ').slice(0, 3).join(' ')}</span>
          <span className="text-[var(--text-primary)] font-medium max-w-[100px] truncate">{qa.answer!.value}</span>
        </motion.div>
      ))}
      <motion.span initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
        className="text-[10px] text-[var(--accent)]/60 flex items-center gap-1">
        <ArrowRight size={9} /> {locale === 'ko' ? '팀 분석에 반영' : 'sent to team'}
      </motion.span>
    </div>
  );
}

/* QuestionCard → imported from shared/ */

/* ═══ Mix Preview ═══ */
function MixPreview({ mix, dm, onDM, onSkip, busy, cmReview, debateResult }: { mix: MixResult; dm: string | null; onDM: () => void; onSkip: () => void; busy: boolean; cmReview?: ConcertmasterReview | null; debateResult?: DebateResult | null }) {
  const locale = useLocale();
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }}>
      <div className="rounded-2xl md:rounded-[2rem] p-[1px] bg-gradient-to-b from-[var(--accent)]/20 to-transparent">
        <div className="rounded-[calc(1rem-1px)] md:rounded-[calc(2rem-1px)] bg-[var(--surface)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
          <div className="h-[2px]" style={{ background: 'var(--gradient-gold)' }} />
          <div className="p-5 md:p-10 space-y-6">
            <span className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-[0.2em] rounded-full bg-[var(--accent)]/8 px-3 py-1">{L('초안', 'Draft')}</span>
            <h2 className="text-[22px] md:text-[28px] font-bold text-[var(--text-primary)] leading-tight tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>{mix.title}</h2>
            <blockquote className="border-l-[3px] border-[var(--accent)]/20 pl-5 text-[15px] text-[var(--text-secondary)] italic leading-relaxed">{renderInline(mix.executive_summary)}</blockquote>

            <div className="space-y-5">
              {mix.sections.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08, duration: 0.5, ease: EASE }}>
                  <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-1.5">{s.heading}</h3>
                  <p className="text-[13px] text-[var(--text-primary)] leading-[1.8]">{renderInline(s.content)}</p>
                </motion.div>
              ))}
            </div>

            {mix.next_steps.length > 0 && (
              <div className="pt-5 border-t border-[var(--border-subtle)]">
                <p className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-3">{L('다음 단계', 'Next Steps')}</p>
                {mix.next_steps.map((s, i) => <div key={i} className="flex items-start gap-2.5 text-[13px] text-[var(--text-primary)] mb-2 leading-relaxed"><span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-2 shrink-0" /><span>{s}</span></div>)}
              </div>
            )}

            {cmReview && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.6 }}
                className="pt-5 border-t border-dashed border-[var(--accent)]/20">
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ fontSize: 18 }}>🎻</span>
                  <p className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-[0.2em]">{L('악장의 한마디', 'Concertmaster Note')}</p>
                </div>
                <p className="text-[13px] text-[var(--text-primary)] leading-relaxed mb-2">{cmReview.overall}</p>
                {cmReview.contradictions.length > 0 && (
                  <div className="mb-2">
                    {cmReview.contradictions.map((c, i) => <p key={i} className="text-[12px] text-[var(--danger)] flex items-start gap-2 mb-1"><span className="shrink-0 mt-0.5">⚡</span>{c}</p>)}
                  </div>
                )}
                {cmReview.blind_spots.length > 0 && (
                  <div className="mb-2">
                    {cmReview.blind_spots.map((b, i) => <p key={i} className="text-[12px] text-[var(--text-secondary)] flex items-start gap-2 mb-1"><span className="shrink-0 mt-0.5">👁</span>{b}</p>)}
                  </div>
                )}
                <p className="text-[12px] text-[var(--text-tertiary)] italic mt-2">{cmReview.verdict}</p>
              </motion.div>
            )}

            {debateResult && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7, duration: 0.6 }}
                className="pt-5 border-t border-dashed border-[var(--danger)]/20">
                <div className="flex items-center gap-2 mb-3">
                  <span style={{ fontSize: 18 }}>⚔️</span>
                  <p className="text-[9px] font-bold text-[var(--danger)] uppercase tracking-[0.2em]">{L('팀 내 반론', 'Team Dissent')}</p>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${debateResult.severity === 'critical' ? 'bg-[var(--danger)]/10 text-[var(--danger)]' : debateResult.severity === 'important' ? 'bg-[var(--warning)]/10 text-[var(--warning)]' : 'bg-[var(--text-tertiary)]/10 text-[var(--text-tertiary)]'}`}>
                    {debateResult.severity}
                  </span>
                </div>
                <p className="text-[13px] text-[var(--text-primary)] leading-relaxed mb-2">{debateResult.challenge}</p>
                {debateResult.weakestClaim && (
                  <p className="text-[12px] text-[var(--danger)] flex items-start gap-2 mb-1">
                    <span className="shrink-0 mt-0.5">💀</span>
                    <span><strong>{debateResult.targetAgent}</strong>{L('의 약점: ', "'s weakness: ")}{debateResult.weakestClaim}</span>
                  </p>
                )}
                {debateResult.alternativeView && (
                  <p className="text-[12px] text-[var(--text-secondary)] flex items-start gap-2 mt-2">
                    <span className="shrink-0 mt-0.5">💡</span>
                    <span>{debateResult.alternativeView}</span>
                  </p>
                )}
              </motion.div>
            )}

            <div className="pt-6 border-t border-[var(--border-subtle)] space-y-3">
              {/* Reviewer suggestion card */}
              <div className="rounded-xl border border-[var(--accent)]/10 bg-[var(--accent)]/[0.03] p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[14px] font-bold text-[var(--accent)]">
                    {(dm || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[var(--text-primary)]">{dm || L('의사결정권자', 'Decision-Maker')}</p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">{L('올리기 전에 한번 검토 받아보세요', 'Get a review before you submit')}</p>
                  </div>
                </div>
                <motion.button onClick={onDM} disabled={busy} whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 text-white rounded-xl text-[14px] font-semibold shadow-[var(--shadow-sm)] cursor-pointer disabled:opacity-50"
                  style={{ background: 'var(--gradient-gold)' }}>
                  {busy ? <><Loader2 size={16} className="animate-spin" /> {L(`${dm || '리뷰어'}이(가) 읽고 있습니다...`, `${dm || 'Reviewer'} is reading...`)}</> : <><UserCheck size={16} /> {L('검토 받기', 'Get Review')}</>}
                </motion.button>
              </div>
              <button onClick={onSkip} disabled={busy} className="w-full text-center text-[12px] text-[var(--text-tertiary)] hover:text-[var(--accent)] py-1 cursor-pointer"
                style={{ transitionProperty: 'color', transitionDuration: '300ms', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}>{L('건너뛰고 이대로 완성', 'Skip and finalize as is')}</button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ═══ DM Feedback ═══ */
function DMFeedback({ fb, onToggle, onFinalize, onDeepen, busy }: { fb: import('@/stores/types').DMFeedbackResult; onToggle: (i: number) => void; onFinalize: () => void; onDeepen?: () => void; busy: boolean }) {
  const locale = useLocale();
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  const initial = (fb.persona_name || '?').charAt(0).toUpperCase();
  return (
    <div className="space-y-5">
      {/* Transition divider — personalized */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}
        className="flex items-center gap-4 py-1">
        <div className="flex-1 h-px bg-[var(--accent)]/15" />
        <span className="text-[11px] text-[var(--text-secondary)] font-medium shrink-0">{fb.persona_name}{L('의 검토', "'s Review")}</span>
        <div className="flex-1 h-px bg-[var(--accent)]/15" />
      </motion.div>

    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
      <div className="rounded-2xl md:rounded-[2rem] p-[1px] bg-[var(--border-subtle)]">
        <div className="rounded-[calc(1rem-1px)] md:rounded-[calc(2rem-1px)] bg-[var(--surface)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
          <div className="p-5 md:p-10 space-y-6">
            {/* Reviewer — larger avatar like demo */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[var(--accent)]/8 flex items-center justify-center text-[18px] font-bold text-[var(--accent)]">{initial}</div>
              <div>
                <p className="text-[17px] font-bold text-[var(--text-primary)]">{fb.persona_name}</p>
                <p className="text-[13px] text-[var(--text-tertiary)]">{fb.persona_role}</p>
              </div>
            </div>

            {/* First reaction — impactful blockquote */}
            <blockquote className="text-[17px] md:text-[18px] text-[var(--text-primary)] leading-[1.6] italic pl-5 border-l-[3px] border-[var(--accent)]/20">
              &ldquo;{fb.first_reaction}&rdquo;
            </blockquote>

            {/* Good parts — prominent, not secondary */}
            {fb.good_parts.length > 0 && (
              <div className="rounded-xl bg-green-50/60 dark:bg-green-950/20 border border-green-200/30 dark:border-green-800/20 px-4 py-3.5">
                <p className="text-[9px] font-bold text-green-600 dark:text-green-400 uppercase tracking-[0.2em] mb-2.5">{L('잘한 점', 'Strengths')}</p>
                {fb.good_parts.map((g, i) => <p key={i} className="text-[13px] text-[var(--text-primary)] flex items-start gap-2.5 mb-2 last:mb-0 leading-relaxed"><span className="text-green-500 shrink-0 mt-0.5 text-[14px]">&#10003;</span>{g}</p>)}
              </div>
            )}

            {/* Concerns — "이것만 고치면" */}
            {fb.concerns.length > 0 && <div>
              <p className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-3">{L('이것만 고치면', 'Fix These')}</p>
              <div className="space-y-3">
                {fb.concerns.map((c: DMConcern, i: number) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08, duration: 0.4, ease: EASE }}
                    className={`rounded-2xl border p-4 transition-all duration-500 ${c.applied ? 'border-[var(--accent)]/20 bg-[var(--accent)]/[0.02]' : 'border-[var(--border-subtle)] bg-[var(--bg)]'}`}
                    style={{ transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}>
                    <div className="flex items-start gap-2 mb-2">
                      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${c.severity === 'critical' ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400' : c.severity === 'important' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {c.severity === 'critical' ? L('필수', 'Required') : c.severity === 'important' ? L('권장', 'Recommended') : L('참고', 'Note')}</span>
                      <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{c.text}</p>
                    </div>
                    <p className="text-[12px] text-[var(--accent)] leading-relaxed mb-3 pl-1">→ {c.fix_suggestion}</p>
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-[10px] text-[var(--text-tertiary)]">{c.applied ? L('반영', 'Applied') : L('스킵', 'Skip')}</span>
                      <button onClick={() => onToggle(i)} className={`relative w-11 h-6 rounded-full cursor-pointer ${c.applied ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`}
                        style={{ transitionProperty: 'background', transitionDuration: '400ms', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}>
                        <motion.div className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm" animate={{ left: c.applied ? 24 : 4 }} transition={SPRING} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>}

            {/* Approval condition */}
            <div className="pt-4 mt-2 border-t border-[var(--border-subtle)]">
              <div className="rounded-xl bg-[var(--accent)]/[0.04] border border-[var(--accent)]/10 px-4 py-3.5">
                <p className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-[0.2em] mb-2">{L('통과 조건', 'Approval Condition')}</p>
                <p className="text-[15px] text-[var(--text-primary)] font-semibold leading-relaxed">{fb.approval_condition}</p>
              </div>
            </div>

            {/* Deep mode extras — would_ask (shown after deep review) */}
            {fb.would_ask.length > 0 && (
              <div className="pt-2">
                <p className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-2.5">{L('이것도 물어볼 거다', 'They Would Also Ask')}</p>
                {fb.would_ask.map((q, i) => <p key={i} className="text-[13px] text-[var(--text-secondary)] flex items-start gap-2 mb-1.5 leading-relaxed"><span className="text-[var(--accent)] shrink-0">?</span>{q}</p>)}
              </div>
            )}

            {/* Actions — primary + secondary path */}
            <div className="space-y-3">
              <motion.button onClick={onFinalize} disabled={busy} whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 text-white rounded-2xl text-[14px] font-semibold shadow-[var(--shadow-sm)] cursor-pointer disabled:opacity-50"
                style={{ background: 'var(--gradient-gold)' }}>
                {busy ? <><Loader2 size={16} className="animate-spin" /> {L('최종본 작성 중...', 'Finalizing...')}</> : <>{L('반영하고 완성', 'Apply and Finalize')} <ChevronRight size={14} /></>}
              </motion.button>
              {fb.would_ask.length === 0 && onDeepen && (
                <p className="text-center text-[12px] text-[var(--text-tertiary)]">
                  {L('다른 관점이 필요하면 ', 'Need another perspective? ')}
                  <button onClick={onDeepen} disabled={busy}
                    className="text-[var(--accent)] hover:underline cursor-pointer font-medium disabled:opacity-50"
                    style={{ transitionProperty: 'color', transitionDuration: '200ms' }}>
                    {busy ? L('검토 중...', 'Reviewing...') : L('더 깊이 검토 →', 'Go deeper →')}
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
    </div>
  );
}

/* ═══ Final deliverable — triumphant, widest ═══ */
function FinalCard({ content }: { content: string }) {
  const locale = useLocale();
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard.writeText(content); setCopied(true); track('flow_copy', {}); setTimeout(() => setCopied(false), 2000); };
  return (
    <motion.div initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.9, ease: EASE }}>
      <div className="rounded-2xl md:rounded-[2rem] p-[2px] bg-gradient-to-b from-[var(--accent)]/30 via-[var(--accent)]/10 to-transparent shadow-[var(--shadow-xl)]">
        <div className="rounded-[calc(1rem-2px)] md:rounded-[calc(2rem-2px)] bg-[var(--surface)] shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]">
          <div className="h-[3px]" style={{ background: 'var(--gradient-gold)' }} />
          <div className="px-5 md:px-7 py-4 flex items-center justify-between border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'var(--gradient-gold)' }}>
                <Check size={13} className="text-white" />
              </div>
              <div>
                <span className="text-[14px] font-semibold text-[var(--text-primary)]">{L('완성된 기획안', 'Final Document')}</span>
                <span className="text-[11px] text-[var(--text-tertiary)] ml-2">{L('바로 보낼 수 있어요', 'Ready to send')}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={copy}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer transition-all duration-200 ${
                  copied ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-[var(--bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
                }`}>
                {copied ? <><Check size={12} /> {L('복사됨', 'Copied')}</> : <>{L('복사', 'Copy')}</>}
              </button>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[var(--bg)] text-[var(--text-secondary)] border border-[var(--border-subtle)] cursor-default opacity-60">
                Slack
              </button>
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-[var(--bg)] text-[var(--text-secondary)] border border-[var(--border-subtle)] cursor-default opacity-60">
                Email
              </button>
            </div>
          </div>
          <div className="p-5 md:p-8 space-y-1">{renderMd(content)}</div>
        </div>
      </div>
    </motion.div>
  );
}

/* renderInline, renderMd — imported from shared/ */

/* ═══ Loading ═══ */
function LoadingState({ text, steps }: { text: string; steps?: string[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => { if (!steps?.length) return; const t = setInterval(() => setIdx(p => (p + 1) % steps.length), 3000); return () => clearInterval(t); }, [steps]);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4 px-6 py-5 rounded-2xl bg-[var(--accent)]/[0.03] border border-[var(--accent)]/8">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}><Loader2 size={16} className="text-[var(--accent)]" /></motion.div>
      <AnimatePresence mode="wait">
        <motion.span key={idx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3, ease: EASE }}
          className="text-[13px] text-[var(--text-secondary)]">{steps?.length ? steps[idx] : text}</motion.span>
      </AnimatePresence>
    </motion.div>
  );
}

/* ═══ Team Deploy Banner — 팀 구성 확인 ═══ */
function TeamDeployBanner({ workers, onDeploy, onUpdateWorker }: {
  workers: WorkerTask[];
  onDeploy: () => void;
  onUpdateWorker?: (id: string, partial: Partial<WorkerTask>) => void;
}) {
  const locale = useLocale();
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;

  const aiWorkers = workers.filter(w => (w.agent_type || 'ai') === 'ai');
  const selfWorkers = workers.filter(w => w.agent_type === 'self');
  const humanWorkers = workers.filter(w => w.agent_type === 'human');
  const total = workers.length;
  const staggerDelay = 0.25;

  const renderRow = (w: WorkerTask, i: number, offset: number) => (
    <motion.div key={w.id}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.15 + (offset + i) * staggerDelay, duration: 0.35, ease: EASE }}
      className="flex items-start gap-3 px-3.5 py-2.5 rounded-xl bg-[var(--surface)]/80">
      {w.agent_type === 'human'
        ? <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[14px] shrink-0 mt-0.5">👤</div>
        : w.agent_type === 'self'
        ? <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-[14px] shrink-0 mt-0.5">🧠</div>
        : <WorkerAvatar persona={w.persona} size="md" />
      }
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[14px] font-medium text-[var(--text-primary)]">
            {w.agent_type === 'human' ? (w.contact?.name || w.question_to_human?.slice(0, 15) || L('외부 확인', 'External'))
              : w.agent_type === 'self' ? L('내 판단', 'My decision')
              : (w.persona?.name || 'AI')}
          </span>
          {w.persona?.role && w.agent_type !== 'self' && w.agent_type !== 'human' && (
            <span className="text-[11px] text-[var(--text-tertiary)]">{w.persona.role}</span>
          )}
        </div>
        <p className="text-[12px] text-[var(--text-secondary)] line-clamp-1 mt-0.5">{w.task}</p>
        {/* Scope preview */}
        {(w.ai_scope || w.self_scope) && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {w.ai_scope && <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-600">AI: {w.ai_scope.slice(0, 40)}{w.ai_scope.length > 40 ? '…' : ''}</span>}
            {w.self_scope && <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-600">{L('나', 'Me')}: {w.self_scope.slice(0, 40)}{w.self_scope.length > 40 ? '…' : ''}</span>}
          </div>
        )}
        {/* Human worker: contact input */}
        {w.agent_type === 'human' && onUpdateWorker && (
          <div className="flex items-center gap-2 mt-2">
            <select
              value={w.contact?.channel || 'email'}
              onChange={(e) => onUpdateWorker(w.id, { contact: { channel: e.target.value as 'email' | 'slack', name: w.contact?.name || '', address: w.contact?.address || '' } })}
              className="text-[11px] px-2 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] cursor-pointer"
              onClick={(e) => e.stopPropagation()}>
              <option value="email">📧 Email</option>
              <option value="slack">💬 Slack</option>
            </select>
            <input
              type="text"
              value={w.contact?.address || ''}
              onChange={(e) => onUpdateWorker(w.id, { contact: { channel: w.contact?.channel || 'email', name: w.contact?.name || '', address: e.target.value } })}
              placeholder={w.contact?.channel === 'slack' ? 'Slack User ID' : 'email@example.com'}
              className="flex-1 text-[11px] px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]/30"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </motion.div>
  );

  const teamDoneDelay = 0.15 + total * staggerDelay;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
      className="rounded-2xl border border-[var(--accent)]/12 bg-gradient-to-b from-[var(--accent)]/[0.04] to-transparent p-5 md:p-6 space-y-4">

      {aiWorkers.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-blue-600 mb-1.5 flex items-center gap-1">🤖 {L('AI 에이전트', 'AI Agents')} <span className="text-[var(--text-tertiary)] font-normal">({L('자동 실행', 'auto')})</span></p>
          <div className="space-y-1.5">{aiWorkers.map((w, i) => renderRow(w, i, 0))}</div>
        </div>
      )}

      {selfWorkers.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-amber-600 mb-1.5 flex items-center gap-1">🧠 {L('내가 판단', 'My Decisions')} <span className="text-[var(--text-tertiary)] font-normal">({L('세션 중', 'in-session')})</span></p>
          <div className="space-y-1.5">{selfWorkers.map((w, i) => renderRow(w, i, aiWorkers.length))}</div>
        </div>
      )}

      {humanWorkers.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-gray-600 mb-1.5 flex items-center gap-1">👤 {L('확인 요청', 'External')} <span className="text-[var(--text-tertiary)] font-normal">({L('이메일/슬랙', 'email/slack')})</span></p>
          <div className="space-y-1.5">{humanWorkers.map((w, i) => renderRow(w, i, aiWorkers.length + selfWorkers.length))}</div>
        </div>
      )}

      <motion.button onClick={onDeploy} whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: teamDoneDelay + 0.2, duration: 0.5, ease: EASE }}
        className="w-full flex items-center justify-center gap-2 px-5 py-3.5 text-white rounded-xl text-[14px] font-semibold cursor-pointer shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-lg)] transition-shadow"
        style={{ background: 'var(--gradient-gold)' }}>
        {L('시작', 'Start')} <ChevronRight size={14} />
      </motion.button>
    </motion.div>
  );
}

/* ═══ Mix Trigger ═══ */
function MixTrigger({ onMix, onMore, busy }: { onMix: () => void; onMore: () => void; busy: boolean }) {
  const locale = useLocale();
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="space-y-4 py-2">
      <p className="text-[12px] text-[var(--text-tertiary)] text-center tracking-wide">{L('초안을 만들 준비가 되었습니다', 'Ready to create a draft')}</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <motion.button onClick={onMix} disabled={busy} whileTap={{ scale: 0.98 }}
          className="flex-1 flex items-center justify-center gap-2.5 px-6 py-4 text-white rounded-2xl text-[15px] font-semibold shadow-[var(--shadow-md)] cursor-pointer disabled:opacity-50"
          style={{ background: 'var(--gradient-gold)' }}>
          {busy ? <><Loader2 size={16} className="animate-spin" /> {L('조합 중...', 'Combining...')}</> : <>{L('초안 완성하기', 'Create Draft')} <ChevronRight size={14} /></>}
        </motion.button>
        {!busy && <motion.button onClick={onMore} whileTap={{ scale: 0.98 }}
          className="px-6 py-4 rounded-2xl text-[14px] font-medium text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--accent)]/30 cursor-pointer"
          style={{ transitionProperty: 'border-color', transitionDuration: '400ms', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}>{L('질문 하나 더', 'One more question')}</motion.button>}
      </div>
    </motion.div>
  );
}

/* ═══ Framing Confirmation (Weakness A fix) ═══ */
function FramingConfirmation({ snapshot, onConfirm, onReject, busy }: {
  snapshot: AnalysisSnapshot;
  onConfirm: () => void;
  onReject: (reason: string) => void;
  busy: boolean;
}) {
  const locale = useLocale();
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState('');
  const confidence = snapshot.framing_confidence ?? 75;
  const isLowConfidence = confidence < 70;

  if (snapshot.framing_locked) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}
      className={`rounded-xl border p-4 md:p-5 ${isLowConfidence ? 'bg-amber-50/50 border-amber-200' : 'bg-[var(--accent)]/[0.02] border-[var(--accent)]/10'}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isLowConfidence ? 'bg-amber-100' : 'bg-[var(--accent)]/10'}`}>
          {isLowConfidence ? <AlertTriangle size={11} className="text-amber-600" /> : <Check size={11} className="text-[var(--accent)]" />}
        </div>
        <div>
          <p className="text-[13px] font-semibold text-[var(--text-primary)] leading-snug">{L('이 방향이 맞나요?', 'Is this the right direction?')}</p>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
            {isLowConfidence ? L('이 문제는 여러 방향으로 해석될 수 있습니다.', 'This problem can be interpreted in multiple ways.') : L('분석 방향을 확인하고 다음으로 넘어갑니다.', 'Confirm the analysis direction to proceed.')}
            {' '}{L('확신도', 'Confidence')} {confidence}%
          </p>
        </div>
      </div>

      {!rejectMode ? (
        <div className="flex gap-2 pl-9">
          <motion.button onClick={onConfirm} disabled={busy} whileTap={{ scale: 0.98 }}
            className="px-4 py-2 rounded-xl text-[12px] font-semibold text-white cursor-pointer disabled:opacity-50"
            style={{ background: 'var(--gradient-gold)' }}>{L('맞습니다', 'Correct')}</motion.button>
          <motion.button onClick={() => setRejectMode(true)} disabled={busy} whileTap={{ scale: 0.98 }}
            className="px-4 py-2 rounded-xl text-[12px] font-medium text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--accent)]/30 cursor-pointer">
            {L('다시 정의', 'Redefine')}</motion.button>
        </div>
      ) : (
        <div className="pl-9 space-y-2">
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder={L('어떤 방향이 더 맞나요? (예: 이건 투자용이 아니라 내부 보고용이야)', 'What direction fits better? (e.g., This is for internal reporting, not investors)')}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]/30"
            onKeyDown={e => { if (e.key === 'Enter' && reason.trim()) { e.preventDefault(); onReject(reason.trim()); } }} autoFocus />
          <div className="flex gap-2">
            <motion.button onClick={() => reason.trim() && onReject(reason.trim())} disabled={busy || !reason.trim()} whileTap={{ scale: 0.98 }}
              className="px-4 py-2 rounded-xl text-[12px] font-semibold text-white cursor-pointer disabled:opacity-50"
              style={{ background: 'var(--gradient-gold)' }}>{L('재분석', 'Re-analyze')}</motion.button>
            <button onClick={() => setRejectMode(false)} className="px-3 py-2 text-[11px] text-[var(--text-tertiary)] cursor-pointer">{L('취소', 'Cancel')}</button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ═══ Convergence Status (Weakness C fix) ═══ */
function ConvergenceStatus({ metrics }: { metrics: ConvergenceMetrics }) {
  const locale = useLocale();
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  const colorClass = metrics.score >= 75 ? 'text-emerald-600 bg-emerald-50' :
    metrics.score >= 50 ? 'text-amber-600 bg-amber-50' : 'text-red-500 bg-red-50';
  const barColor = metrics.score >= 75 ? 'bg-emerald-400' :
    metrics.score >= 50 ? 'bg-amber-400' : 'bg-red-400';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: EASE }}
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[var(--bg)]/60 border border-[var(--border-subtle)]">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium text-[var(--text-tertiary)]">{L('명확도', 'Clarity')}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colorClass}`}>{metrics.score}%</span>
        </div>
        <div className="h-1 rounded-full bg-[var(--border-subtle)] overflow-hidden">
          <motion.div className={`h-full rounded-full ${barColor}`}
            initial={{ width: 0 }} animate={{ width: `${metrics.score}%` }} transition={{ duration: 0.8, ease: EASE }} />
        </div>
      </div>
      <p className="text-[10px] text-[var(--text-tertiary)] max-w-[160px] leading-tight">{metrics.guidance}</p>
    </motion.div>
  );
}

/* ═══ Pipeline Exit Buttons (Weakness D fix) ═══ */
function PipelineExitOptions({ onReframe, onRehearse }: {
  onReframe: () => void;
  onRehearse: () => void;
}) {
  const locale = useLocale();
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  return (
    <div className="flex flex-col gap-2 border-t border-dashed border-[var(--border-subtle)] pt-4 mt-2">
      <p className="text-[10px] font-medium text-[var(--text-tertiary)] tracking-wide">{L('다른 도구로 전환', 'Switch to another tool')}</p>
      <div className="flex gap-2">
        <button onClick={onReframe}
          className="flex-1 text-left px-3 py-2 rounded-xl bg-[var(--bg)]/60 hover:bg-[var(--accent)]/5 border border-transparent hover:border-[var(--accent)]/10 cursor-pointer transition-colors duration-300">
          <p className="text-[11px] font-medium text-[var(--text-secondary)]">{L('→ 문제 재정의', '→ Reframe Problem')}</p>
          <p className="text-[9px] text-[var(--text-tertiary)]">{L('더 깊이 들어가기', 'Dig deeper')}</p>
        </button>
        <button onClick={onRehearse}
          className="flex-1 text-left px-3 py-2 rounded-xl bg-[var(--bg)]/60 hover:bg-[var(--accent)]/5 border border-transparent hover:border-[var(--accent)]/10 cursor-pointer transition-colors duration-300">
          <p className="text-[11px] font-medium text-[var(--text-secondary)]">{L('→ 피드백 먼저', '→ Feedback First')}</p>
          <p className="text-[9px] text-[var(--text-tertiary)]">{L('이해관계자 반응 시뮬레이션', 'Simulate stakeholder reactions')}</p>
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/* ═══ MAIN                             ═══ */
/* ═══════════════════════════════════════════ */

export function ProgressiveFlow({ projectId }: { projectId: string }) {
  const locale = useLocale();
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  const store = useProgressiveStore();
  const session = store.currentSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMix, setShowMix] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [cmReview, setCmReview] = useState<ConcertmasterReview | null>(null);
  const [debateResult, setDebateResult] = useState<DebateResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const workerAbortRef = useRef<AbortController | null>(null);
  const workersRef = useRef<Promise<void> | null>(null);
  const scroll = useCallback((mode: 'bottom' | 'top' = 'bottom') => {
    setTimeout(() => window.scrollTo({ top: mode === 'top' ? 0 : document.body.scrollHeight, behavior: 'smooth' }), 200);
  }, []);

  // Cleanup: abort all in-flight requests on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      workerAbortRef.current?.abort();
      abortRef.current?.abort();
    };
  }, []);

  // Supabase Realtime: subscribe to session updates (human agent responses)
  useEffect(() => {
    if (!session?.id) return;
    const hasPendingHumans = (session.workers || []).some(
      w => w.agent_type === 'human' && (w.status === 'sent' || w.status === 'waiting_response')
    );
    if (!hasPendingHumans) return;

    let channel: ReturnType<typeof import('@supabase/supabase-js').SupabaseClient.prototype.channel> | null = null;
    import('@/lib/supabase').then(({ supabase }) => {
      channel = supabase.channel(`session:${session.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'progressive_sessions',
          filter: `id=eq.${session.id}`,
        }, (payload) => {
          // Remote update detected — reload sessions to get fresh data
          if (payload.new && mountedRef.current) {
            store.loadSessions();
          }
        })
        .subscribe();
    });

    return () => {
      if (channel) {
        import('@/lib/supabase').then(({ supabase }) => {
          supabase.removeChannel(channel!);
        });
      }
    };
  }, [session?.id, session?.workers?.filter(w => w.agent_type === 'human' && (w.status === 'sent' || w.status === 'waiting_response')).length]);

  const phase = session?.phase ?? 'input';
  const snapshots = session?.snapshots ?? [];
  const questions = session?.questions ?? [];
  const answers = session?.answers ?? [];
  const mix = session?.mix ?? null;
  const dmFb = session?.dm_feedback ?? null;
  const final_ = session?.final_deliverable ?? null;
  const round = session?.round ?? 0;
  const maxR = session?.max_rounds ?? 3;
  const dm = session?.decision_maker ?? null;

  const qaPairs = useMemo(() => questions.map((q, i) => ({ question: q, answer: answers[i] || null })), [questions, answers]);
  const curQ = questions.length > answers.length ? questions[questions.length - 1] : null;
  const latest = snapshots[snapshots.length - 1] || null;
  const shouldMix = showMix || (phase === 'conversing' && snapshots.length > 0 && !curQ && !mix && !busy);
  const deployPhase = session?.worker_deploy_phase ?? 'none';
  const workers = session?.workers ?? [];
  const workerContext = useWorkerContext();
  const workerActions = useWorkerActions(workerContext);

  // Workers that have completed (for inline display in flow)
  const completedWorkers = workers.filter(w => w.status === 'done' || w.status === 'waiting_input' || w.status === 'error');
  // Staggered reveal — completed workers appear with cascade delay
  const revealedIds = useStaggeredReveal(workers, session?.id ?? null);
  const revealedWorkers = completedWorkers.filter(w => revealedIds.has(w.id));

  if (!session) return null;

  /* Shared worker execution — used by both deploy and resume */
  const startWorkerExecution = (ws: WorkerTask[]) => {
    const qa = qaPairs.filter(q => q.answer).map(q => ({ question: q.question, answer: q.answer! }));
    const ctx: WorkerContext = {
      problemText: session.problem_text,
      realQuestion: latest?.real_question ?? '',
      skeleton: latest?.skeleton ?? [],
      hiddenAssumptions: latest?.hidden_assumptions ?? [],
      qaHistory: qa.map(q => ({ q: q.question.text, a: q.answer.value })),
      sessionId: session.id,
    };
    workerAbortRef.current?.abort();
    workerAbortRef.current = new AbortController();
    const workerCallbacks = {
      onStart: (id: string) => store.updateWorker(id, { status: 'running', started_at: new Date().toISOString() }),
      onStream: (id: string, text: string) => store.setWorkerStreamText(id, text),
      onComplete: (id: string, result: string, validation?: { score: number; passed: boolean; issues: string[] }) => {
        const w = store.currentSession()?.workers.find(ww => ww.id === id);
        const persona = w?.persona;
        const note = persona
          ? getCompletionNote(persona.id)
          : null;
        const validationFields = validation
          ? { validation_score: validation.score, validation_passed: validation.passed, validation_feedback: validation.issues.join('; ') }
          : {};
        // v2: Use agent_type + ai_scope to determine completion behavior (not status, which gets overwritten by onStart)
        const aType = w?.agent_type;
        const isAiPreparing = (aType === 'self' || aType === 'human') && w?.ai_scope;
        if (isAiPreparing) {
          store.updateWorker(id, { status: 'waiting_input', ai_preliminary: result, stream_text: '', ...validationFields });
        } else if (w?.who === 'both' || (aType === 'ai' && w?.self_scope)) {
          store.updateWorker(id, { status: 'waiting_input', result, stream_text: '', completion_note: note, ...validationFields });
        } else {
          store.updateWorker(id, { status: 'done', result, stream_text: '', completion_note: note, completed_at: new Date().toISOString(), ...validationFields });
        }
        scroll();
      },
      onError: (id: string, error: string) => store.updateWorker(id, { status: 'error', error, stream_text: '' }),
    };

    // Transcript wrapping — 한 번만, 최외곽에서
    const trackedCallbacks = withTranscript(session.id, workerCallbacks);

    const stages = store.currentSession()?.stages;
    const hasMultipleStages = stages && stages.length > 1;

    workersRef.current = (hasMultipleStages
      ? runPipeline(ws, stages, ctx, trackedCallbacks, workerAbortRef.current.signal)
      : runAllAIWorkers(ws, ctx, trackedCallbacks, workerAbortRef.current.signal)
    ).catch((err) => {
      console.error('[Worker orchestration error]', err);
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : L('에이전트 작업 중 오류가 발생했습니다.', 'Agent task error occurred.'));
      }
    });
  };

  /* Deploy workers — user confirmed the team */
  const onDeployWorkers = () => {
    if (deployPhase === 'deployed') return;
    const preDeployWorkers = store.currentSession()?.workers ?? [];
    if (preDeployWorkers.length === 0) return;
    store.deployWorkers();
    const ws = store.currentSession()?.workers ?? [];

    // Auto-send human agent questions (fire-and-forget)
    const humanWorkers = ws.filter(w => w.agent_type === 'human' && w.contact?.address && !w.sent_at);
    if (humanWorkers.length > 0) {
      import('@/lib/supabase').then(({ supabase }) => {
        supabase.auth.getSession().then(({ data: { session: authSession } }) => {
          if (!authSession?.access_token) return;
          const headers = { 'Authorization': `Bearer ${authSession.access_token}`, 'Content-Type': 'application/json' };
          for (const hw of humanWorkers) {
            const endpoint = hw.contact?.channel === 'slack' ? '/api/slack/send' : '/api/email/send-question';
            const body = hw.contact?.channel === 'slack'
              ? { userId: hw.contact.address, title: `질문: ${hw.task}`, content: `${hw.question_to_human || hw.task}\n\n${hw.ai_preliminary ? `참고:\n${hw.ai_preliminary}` : ''}`, sessionId: session.id, workerId: hw.id }
              : { to: hw.contact!.address, subject: `질문: ${hw.task}`, question: hw.question_to_human || hw.task, context: hw.ai_preliminary || '', senderName: session.decision_maker || 'Overture', sessionId: session.id, workerId: hw.id };
            fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) })
              .then(r => r.json())
              .then(r => {
                if (r.ok) store.updateWorker(hw.id, { status: 'sent', sent_at: new Date().toISOString() });
              })
              .catch(() => { /* fail silently */ });
          }
        });
      });
    }
    startWorkerExecution(ws);
  };

  /* Resume workers — after crash/reload, continue from where we left off */
  const isResumable = deployPhase === 'deployed' && !final_
    && workers.some(w => w.status === 'pending')
    && workers.some(w => w.status === 'done' && w.result);
  const onResumeWorkers = () => {
    const ws = store.currentSession()?.workers ?? [];
    startWorkerExecution(ws);
  };

  /* Handlers */
  const onAnswer = async (value: string) => {
    if (!curQ || busy || !latest) return;
    const ans: FlowAnswer = { question_id: curQ.id, value };
    store.addAnswer(ans); store.setPhase('analyzing'); track('flow_answer', { round }); setBusy(true); setError(null); scroll();
    try {
      const qa = qaPairs.filter(q => q.answer).map(q => ({ question: q.question, answer: q.answer! }));
      qa.push({ question: curQ, answer: ans });
      if (!dm && round === 0) { const g = value.includes('대표') ? '대표님' : value.includes('팀장') ? '팀장님' : value.includes('투자') ? '투자자' : null; if (g) store.setDecisionMaker(g); }
      abortRef.current = new AbortController();
      setStreamingText('');
      // Lead context: inject lead agent persona into deepening prompt
      let leadCtx: string | undefined;
      if (session.lead_agent) {
        const leadAgent = useAgentStore.getState().getAgent(session.lead_agent.agent_id);
        if (leadAgent) {
          const cfg: LeadAgentConfig = {
            agentId: leadAgent.id, agentName: leadAgent.name, agentNameEn: leadAgent.nameEn || leadAgent.name,
            agentRole: leadAgent.role, agentRoleEn: leadAgent.roleEn || leadAgent.role,
            expertise: leadAgent.expertise || '', tone: leadAgent.tone || '',
            domain: (session.lead_agent?.domain || 'strategy') as import('@/lib/orchestrator-classify').Domain,
          };
          leadCtx = buildLeadDecompositionContext(cfg, locale as 'ko' | 'en');
        }
      }
      const personas = usePersonaStore.getState().personas.filter(p => !p.is_example && !p.deleted_at).map(p => ({ name: p.name, role: p.role, hasContact: !!(p.contact?.email || p.contact?.slack_id) }));
      const r = await runDeepening(session.problem_text, latest, qa, round, maxR, snapshots, (text) => setStreamingText(text), abortRef.current.signal, leadCtx, personas.length > 0 ? personas : undefined);
      setStreamingText(null);
      store.addSnapshot(r.snapshot); store.advanceRound();
      // Prepare workers when execution_plan appears
      const existingWorkers = store.currentSession()?.workers ?? [];
      const currentDeployPhase = store.currentSession()?.worker_deploy_phase ?? 'none';
      if (r.snapshot.execution_plan && r.snapshot.execution_plan.steps.length > 0) {
        if (existingWorkers.length === 0) {
          // First time — init workers
          store.initWorkers(r.snapshot.execution_plan.steps);
        } else if (currentDeployPhase === 'ready') {
          // Plan changed before deploy — check if tasks differ
          const oldTasks = existingWorkers.map(w => w.task).sort().join('|');
          const newTasks = r.snapshot.execution_plan.steps.map(s => s.task).sort().join('|');
          if (oldTasks !== newTasks) {
            // Re-init with updated plan (workers haven't been deployed yet, safe to replace)
            store.initWorkers(r.snapshot.execution_plan.steps);
          }
        }
        // After deployed — don't touch running workers
      }
      r.readyForMix || !r.question ? (setShowMix(true), store.setPhase('conversing')) : (store.addQuestion(r.question), store.setPhase('conversing'));
    } catch (e) { setStreamingText(null); setError(e instanceof Error ? e.message : L('분석 실패', 'Analysis failed')); store.setPhase('conversing'); }
    finally { setBusy(false); abortRef.current = null; scroll(); }
  };

  const onMix = async () => {
    setBusy(true); setError(null); store.setPhase('mixing'); scroll();
    try {
      // Wait for any running AI workers to finish before collecting results
      if (workersRef.current) {
        await workersRef.current;
        workersRef.current = null;
      }
      const qa = qaPairs.filter(q => q.answer).map(q => ({ question: q.question, answer: q.answer! }));
      // Collect mixable worker results — final + preliminary + pending_human
      const enrichedResults = store.mixableWorkerResults();
      const workerResults = enrichedResults.map(w => ({
        task: w.type === 'preliminary' ? `[${L('참고', 'Ref')}] ${w.task}` : w.type === 'pending_human' ? `[${L('대기', 'Pending')}] ${w.task}` : w.task,
        result: w.result,
      }));

      // 악장 메타 리뷰 + debate (해금 시만, 비차단)
      if (workerResults.length > 0) {
        const cmWorkers = session!.workers
          .filter(w => w.approved !== false && w.result)
          .map(w => ({ agentName: w.persona?.name || L('에이전트', 'Agent'), agentRole: w.persona?.role || '', task: w.task, result: w.result || '' }));
        runConcertmasterReview(session!.problem_text, cmWorkers)
          .then(r => { if (r && mountedRef.current) setCmReview(r); })
          .catch(() => {});

        // Critical stakes: Cross-Agent Debate (mix 전에 실행하여 결과를 반영)
        const stages = session?.stages;
        if (stages && stages.length > 1) {
          const debateWorkers = cmWorkers.map(w => ({ ...w, framework: session!.workers.find(ww => ww.persona?.name === w.agentName)?.framework || null }));
          try {
            const debateRes = await runDebate(session!.problem_text, debateWorkers);
            if (debateRes) {
              setDebateResult(debateRes);
              // debate 결과를 workerResults에 추가하여 mix에 반영
              workerResults.push({
                task: locale === 'ko' ? `[팀 내 반론] ${debateRes.targetAgent}의 분석에 대한 비판` : `[Team Dissent] Critique of ${debateRes.targetAgent}'s analysis`,
                result: locale === 'ko' ? `${debateRes.challenge}\n\n약점: ${debateRes.weakestClaim}\n\n대안: ${debateRes.alternativeView}` : `${debateRes.challenge}\n\nWeakness: ${debateRes.weakestClaim}\n\nAlternative: ${debateRes.alternativeView}`,
              });
            }
          } catch { /* debate 실패해도 mix는 진행 */ }
        }
      }

      // Lead Agent Synthesis + Mix: 병렬 실행
      // Lead synthesis는 Mix의 품질을 높이지만 필수가 아님 (null 허용).
      // Lead를 먼저 시작하고 Mix와 병렬로 진행 — Lead가 먼저 끝나면 Mix에 반영, 아니면 Mix는 Lead 없이 실행.
      let leadSynthesis: LeadSynthesisResult | null = null;
      const sessionLead = session?.lead_agent;
      let leadPromise: Promise<LeadSynthesisResult | null> = Promise.resolve(null);

      if (sessionLead && workerResults.length > 0) {
        const leadAgent = useAgentStore.getState().getAgent(sessionLead.agent_id);
        if (leadAgent) {
          store.setPhase('lead_synthesizing');
          const leadConfig: LeadAgentConfig = {
            agentId: leadAgent.id, agentName: leadAgent.name, agentNameEn: leadAgent.nameEn || leadAgent.name,
            agentRole: leadAgent.role, agentRoleEn: leadAgent.roleEn || leadAgent.role,
            expertise: leadAgent.expertise || '', tone: leadAgent.tone || '',
            domain: (session?.lead_agent?.domain || 'strategy') as import('@/lib/orchestrator-classify').Domain,
          };
          const attributedResults = enrichedResults.map(w => ({
            agentName: w.agentName || L('에이전트', 'Agent'),
            agentRole: w.agentRole || '',
            task: w.task,
            result: w.result,
          }));
          const realQ = latest?.real_question || session!.problem_text;
          // Lead synthesis를 비동기로 시작 (await 하지 않음)
          leadPromise = runLeadSynthesis(session!.problem_text, realQ, attributedResults, leadConfig, abortRef.current?.signal)
            .then(result => {
              const currentSession = store.currentSession();
              if (currentSession?.id !== session?.id) return null;
              store.setLeadSynthesis(result);
              return result;
            })
            .catch(() => null);
        }
      }

      // Lead synthesis 완료 대기 (짧은 타임아웃) — 끝났으면 Mix에 포함, 아니면 null로 진행
      store.setPhase('mixing');
      leadSynthesis = await Promise.race([
        leadPromise,
        new Promise<null>(resolve => setTimeout(() => resolve(null), 4000)),
      ]);

      const m = await runMix(session!.problem_text, snapshots, qa, dm, workerResults.length > 0 ? workerResults : undefined, undefined, leadSynthesis);
      // Lead가 Mix보다 늦게 끝났으면 비동기로 저장 (Mix에는 미포함이지만 UI에는 표시)
      if (!leadSynthesis) leadPromise.then(late => { if (late) store.setLeadSynthesis(late); });
      store.setMix(m); setShowMix(false); track('flow_mix', { rounds: round, has_lead: !!leadSynthesis });

      // Phase 6: Boss reviewer가 있으면 자동 DM 피드백
      if (session?.reviewer_agent_id) {
        const reviewerAgent = useAgentStore.getState().getAgent(session.reviewer_agent_id);
        if (reviewerAgent) {
          const f = await runBossDMFeedback(m, reviewerAgent, session.problem_text);
          store.setDMFeedback(f);
          import('@/lib/observation-engine').then(({ onBossReviewCompleted }) => {
            onBossReviewCompleted(reviewerAgent.id, f);
          }).catch(() => {});
          useAgentStore.getState().recordActivity(reviewerAgent.id, 'review_given', session.problem_text.slice(0, 100));
        }
      }
    } catch (e) { setError(e instanceof Error ? e.message : L('초안 생성 실패', 'Draft creation failed')); store.setPhase('conversing'); }
    finally { setBusy(false); scroll(); }
  };

  const onDM = async () => {
    if (!mix) return; setBusy(true); setError(null); scroll();
    try {
      // Boss agent가 연결되어 있으면 Boss 성격 DM 피드백
      const reviewerAgent = session?.reviewer_agent_id
        ? useAgentStore.getState().getAgent(session.reviewer_agent_id)
        : undefined;

      const f = reviewerAgent
        ? await runBossDMFeedback(mix, reviewerAgent, session!.problem_text)
        : await runDMFeedback(mix, dm || L('의사결정권자', 'Decision-Maker'), session!.problem_text);

      store.setDMFeedback(f);

      // Boss 리뷰 후 observation 업데이트 + XP
      if (reviewerAgent && f) {
        import('@/lib/observation-engine').then(({ onBossReviewCompleted }) => {
          onBossReviewCompleted(reviewerAgent.id, f);
        }).catch(() => {});
        useAgentStore.getState().recordActivity(reviewerAgent.id, 'review_given', session!.problem_text.slice(0, 100));
      }
    }
    catch (e) { setError(e instanceof Error ? e.message : L('DM 피드백 실패', 'DM feedback failed')); }
    finally { setBusy(false); scroll('top'); }
  };

  const onDeepen = async () => {
    if (!mix) return; setBusy(true); setError(null); scroll();
    try {
      const reviewerAgent = session?.reviewer_agent_id
        ? useAgentStore.getState().getAgent(session.reviewer_agent_id)
        : undefined;

      const f = reviewerAgent
        ? await runBossDMFeedback(mix, reviewerAgent, session!.problem_text, undefined, 'deep')
        : await runDMFeedback(mix, dm || L('의사결정권자', 'Decision-Maker'), session!.problem_text, undefined, 'deep');

      store.setDMFeedback(f);
      track('flow_deepen', { has_boss: !!reviewerAgent });
    }
    catch (e) { setError(e instanceof Error ? e.message : L('심화 검토 실패', 'Deep review failed')); }
    finally { setBusy(false); scroll('top'); }
  };

  const onMore = async () => {
    if (!latest) return; setShowMix(false); setBusy(true); store.setPhase('analyzing');
    try {
      const qa = qaPairs.filter(q => q.answer).map(q => ({ question: q.question, answer: q.answer! }));
      qa.push({ question: { id: 's', text: '더?', type: 'select', engine_phase: 'recast' }, answer: { question_id: 's', value: '한 가지 더 확인' } });
      abortRef.current = new AbortController();
      setStreamingText('');
      // Lead context for onMore deepening
      let moreLeadCtx: string | undefined;
      if (session?.lead_agent) {
        const la = useAgentStore.getState().getAgent(session.lead_agent.agent_id);
        if (la) {
          const cfg: LeadAgentConfig = {
            agentId: la.id, agentName: la.name, agentNameEn: la.nameEn || la.name,
            agentRole: la.role, agentRoleEn: la.roleEn || la.role,
            expertise: la.expertise || '', tone: la.tone || '',
            domain: (session.lead_agent?.domain || 'strategy') as import('@/lib/orchestrator-classify').Domain,
          };
          moreLeadCtx = buildLeadDecompositionContext(cfg, locale as 'ko' | 'en');
        }
      }
      const personas2 = usePersonaStore.getState().personas.filter(p => !p.is_example && !p.deleted_at).map(p => ({ name: p.name, role: p.role, hasContact: !!(p.contact?.email || p.contact?.slack_id) }));
      const r = await runDeepening(session!.problem_text, latest, qa, round, round + 2, snapshots, (text) => setStreamingText(text), abortRef.current.signal, moreLeadCtx, personas2.length > 0 ? personas2 : undefined);
      setStreamingText(null);
      r.question ? (store.addQuestion(r.question), store.setPhase('conversing')) : (setShowMix(true), store.setPhase('conversing'));
    } catch (e) { setStreamingText(null); setError(e instanceof Error ? e.message : L('실패', 'Failed')); store.setPhase('conversing'); setShowMix(true); }
    finally { setBusy(false); abortRef.current = null; scroll(); }
  };

  const onSkip = () => {
    if (!mix) return;
    const md = [`# ${mix.title}`, '', `> ${mix.executive_summary}`, '', ...mix.sections.flatMap(s => [`## ${s.heading}`, '', s.content, '']),
      ...(mix.key_assumptions.length ? [`## ${L('전제 조건', 'Assumptions')}`, '', ...mix.key_assumptions.map(a => `- ${a}`), ''] : []),
      ...(mix.next_steps.length ? [`## ${L('다음 단계', 'Next Steps')}`, '', ...mix.next_steps.map(s => `- ${s}`), ''] : [])].join('\n');
    store.setFinalDeliverable(md); setError(null);
  };

  const onFinalize = async () => {
    if (!mix || !dmFb) return; setBusy(true); setError(null); scroll();
    try { const t = await runFinalDeliverable(mix, dmFb); store.setFinalDeliverable(t); track('flow_done', { project_id: projectId, rounds: round }); }
    catch (e) { setError(e instanceof Error ? e.message : L('최종본 실패', 'Finalization failed')); }
    finally { setBusy(false); scroll(); }
  };

  return (
    <>
      <PhaseAmbient phase={phase} />
      <motion.div className="relative z-10 mx-auto px-4 md:px-0"
        animate={{ maxWidth: phase === 'complete' ? '56rem' : (phase === 'mixing' || phase === 'lead_synthesizing' || phase === 'dm_feedback' || phase === 'refining') ? '48rem' : '42rem' }}
        transition={{ duration: 0.8, ease: EASE }}>

        <ProgressLine phase={phase} round={round} hasMix={!!mix} />

        <div className="space-y-8">
          {/* User input — compact pill */}
          <motion.div layout className="flex items-center gap-3 px-5 py-3 rounded-full bg-[var(--bg)] border border-[var(--border-subtle)] w-fit max-w-full">
            <div className="w-5 h-5 rounded-full bg-[var(--text-primary)] flex items-center justify-center shrink-0">
              <span className="text-[var(--bg)] text-[9px] font-bold">{L('나', 'Me')}</span>
            </div>
            <p className="text-[13px] text-[var(--text-secondary)] truncate">{session.problem_text}</p>
          </motion.div>

          {/* Team deploy banner — 사용자 확인 후 worker 실행 */}
          {deployPhase === 'ready' && workers.length > 0 && (
            <TeamDeployBanner workers={workers} onDeploy={onDeployWorkers} onUpdateWorker={(id, partial) => store.updateWorker(id, partial)} />
          )}

          {/* Resume banner — 크래시/새로고침 후 미완료 작업 재개 */}
          {isResumable && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mx-4 mt-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[13px] text-amber-600 dark:text-amber-400">
                  <span>⟳</span>
                  <span>{L('중단된 작업이 있습니다', 'Interrupted tasks found')}</span>
                  <span className="text-[var(--text-tertiary)]">
                    ({workers.filter(w => w.status === 'done').length}/{workers.length} {L('완료', 'done')})
                  </span>
                </div>
                <button onClick={onResumeWorkers}
                  className="px-3 py-1.5 text-[13px] font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors">
                  {L('이어서 실행', 'Resume')}
                </button>
              </div>
            </motion.div>
          )}

          {/* Question FIRST — user action at the top, not buried below */}
          {curQ && !busy && phase === 'conversing' && <QuestionCard key={curQ.id} question={curQ} onAnswer={onAnswer} disabled={busy} locale={locale} />}

          {/* Inline worker reports — staggered reveal for polished feel */}
          {deployPhase === 'deployed' && !final_ && (
            <div className="space-y-4">
              {/* Running workers — minimal: avatar + task + spinner (no streaming text) */}
              {workers.filter(w => w.status === 'running').map(w => (
                <motion.div key={w.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--bg)]/40">
                  <WorkerAvatar persona={w.persona} size="sm" pulse />
                  <span className="text-[13px] text-[var(--text-secondary)] flex-1 truncate">{w.persona?.name || 'AI'} — {w.task}</span>
                  <Loader2 size={14} className="animate-spin text-[var(--accent)] shrink-0" />
                </motion.div>
              ))}
              {/* Revealed workers — polished report blocks with fade+slide entrance */}
              {revealedWorkers.map(w => (
                <motion.div key={w.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
                  <WorkerReportBlock
                    worker={w}
                    onSubmitInput={w.status === 'waiting_input' ? workerActions.handleSubmit : undefined}
                    onRetry={w.status === 'error' ? workerActions.handleRetry : undefined}
                    onApprove={w.status === 'done' ? workerActions.handleApprove : undefined}
                    onReject={w.status === 'done' ? workerActions.handleReject : undefined}
                  />
                </motion.div>
              ))}
            </div>
          )}

          {/* Worker status summary before mix — with persona names */}
          {shouldMix && !busy && phase === 'conversing' && !curQ && workers.length > 0 && (() => {
            const items = workers.map(w => {
              const name = w.persona?.name || 'AI';
              if (w.approved === true) return `${name} ✓`;
              if (w.approved === false) return `${name} ✗`;
              if (w.status === 'done') return `${name} ⏳`;
              if (w.status === 'running') return `${name} ●`;
              return null;
            }).filter(Boolean);
            return items.length > 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg)]/60 text-[12px] text-[var(--text-secondary)]">
                <AvatarRow personas={workers.map(w => w.persona)} maxShow={5} />
                <span>{items.join(' · ')}</span>
              </motion.div>
            ) : null;
          })()}

          {shouldMix && !busy && phase === 'conversing' && !curQ && <MixTrigger onMix={onMix} onMore={onMore} busy={busy} />}

          {/* Loading states */}
          {phase === 'analyzing' && snapshots.length === 0 && !streamingText && <LoadingState text={L('시작...', 'Starting...')} steps={locale === 'ko' ? ['상황을 읽고 있습니다...', '당신이 놓치고 있는 걸 찾는 중...', '문서 뼈대를 잡고 있습니다...', '거의 다 됐습니다...'] : ['Reading the situation...', 'Finding what you might be missing...', 'Building the document structure...', 'Almost done...']} />}
          {phase === 'analyzing' && snapshots.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-3 py-4">
              <Loader2 size={16} className="animate-spin text-[var(--accent)]" />
              <span className="text-[13px] text-[var(--text-secondary)]">{L('답변을 반영하는 중...', 'Incorporating your answer...')}</span>
            </motion.div>
          )}
          {phase === 'lead_synthesizing' && <LoadingState text={L(`${session?.lead_agent?.agent_name || '리드 에이전트'}${getParticle(session?.lead_agent?.agent_name || '리드')} 팀 결과를 통합하고 있습니다...`, `${session?.lead_agent?.agent_name || 'Lead agent'} is synthesizing the team's findings...`)} steps={locale === 'ko' ? ['각 팀원의 분석을 교차 검증 중...', '핵심 인사이트를 추출하고 있습니다...', '통합 분석을 작성 중...'] : ['Cross-validating each team member\'s analysis...', 'Extracting key insights...', 'Writing the integrated analysis...']} />}
          {phase === 'mixing' && <LoadingState text={L('초안 작성 중...', 'Drafting...')} steps={locale === 'ko' ? ['팀의 분석을 하나로 엮는 중...', '문서 구조를 잡고 있습니다...', '거의 완성입니다...'] : ['Weaving the team analysis together...', 'Building document structure...', 'Almost complete...']} />}

          {/* Version indicator — shows what round we're on */}
          {snapshots.length > 1 && !final_ && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent)]/[0.04] border border-[var(--accent)]/10 w-fit">
              <Sparkles size={11} className="text-[var(--accent)]" />
              <span className="text-[11px] text-[var(--accent)] font-medium">{locale === 'ko' ? `${snapshots.length - 1}번째 개선 반영됨` : `${snapshots.length - 1} improvement(s) applied`}</span>
            </motion.div>
          )}

          {/* Living Analysis — the evolving draft with visible diffs */}
          {latest && !final_ && (
            <AnalysisCard
              snapshot={latest}
              prevSnapshot={snapshots.length > 1 ? snapshots[snapshots.length - 2] : null}
              isActive={!mix}
              showExecutionPlan
              locale={locale}
            />
          )}

          {/* Framing Confirmation — Round 1 후 사용자 확인 (Weakness A) */}
          {latest && !latest.framing_locked && snapshots.length === 1 && phase === 'conversing' && !mix && !final_ && (
            <FramingConfirmation
              snapshot={latest}
              onConfirm={() => {
                store.updateLatestSnapshot({ framing_locked: true });
                track('framing_confirmed', { confidence: latest.framing_confidence });
              }}
              onReject={async (reason) => {
                setBusy(true); setError(null);
                try {
                  setStreamingText('');
                  const r = await refineInitialFraming(
                    session.problem_text, latest.real_question, reason,
                    (text) => setStreamingText(text),
                  );
                  setStreamingText(null);
                  store.replaceInitialSnapshot(r.snapshot);
                  if (r.detectedDM) store.setDecisionMaker(r.detectedDM);
                  store.replaceLatestQuestion(r.question);
                  track('framing_rejected', { reason });
                } catch (e) { setStreamingText(null); setError(e instanceof Error ? e.message : L('재분석 실패', 'Re-analysis failed')); }
                finally { setBusy(false); scroll(); }
              }}
              busy={busy}
            />
          )}

          {/* Convergence Status — 라운드 2+ (Weakness C) */}
          {snapshots.length >= 2 && !mix && !final_ && phase === 'conversing' && (
            <ConvergenceStatus metrics={
              workers.length > 0
                ? assessConvergenceWithWorkers(snapshots, workers.map(w => ({ validationScore: w.validation_score, approved: w.approved })))
                : assessConvergence(snapshots)
            } />
          )}

          {/* Pipeline Exit — 라운드 1+ 후 4R로 분기 가능 (Weakness D) */}
          {latest && snapshots.length >= 1 && !mix && !final_ && phase === 'conversing' && !busy && (
            <PipelineExitOptions
              onReframe={() => {
                try {
                  const item = exportProgressiveAsReframe(session);
                  // 실제 store에 저장 + 프로젝트 연결
                  useReframeStore.getState().addItem(item);
                  store.linkToReframe(item.id);
                  if (session.project_id) {
                    useProjectStore.getState().addRef(session.project_id, {
                      tool: 'reframe', itemId: item.id, label: session.problem_text.slice(0, 30),
                    });
                  }
                  track('progressive_exit_to_reframe', { round });
                  window.location.href = `/workspace?step=reframe&handoff=progressive&itemId=${item.id}`;
                } catch (e) { setError(e instanceof Error ? e.message : L('전환 실패', 'Switch failed')); }
              }}
              onRehearse={() => {
                try {
                  const item = exportProgressiveAsRecast(session);
                  // 실제 store에 저장 + 프로젝트 연결
                  useRecastStore.getState().addItem(item);
                  store.linkToRecast(item.id);
                  if (session.project_id) {
                    useProjectStore.getState().addRef(session.project_id, {
                      tool: 'recast', itemId: item.id, label: session.problem_text.slice(0, 30),
                    });
                  }
                  track('progressive_exit_to_rehearse', { round });
                  window.location.href = `/workspace?step=rehearse&handoff=progressive&itemId=${item.id}`;
                } catch (e) { setError(e instanceof Error ? e.message : L('전환 실패', 'Switch failed')); }
              }}
            />
          )}

          {/* Answered Q&A history — collapsed at bottom */}
          {!final_ && <AnsweredPills qaPairs={qaPairs} />}
          {mix && !dmFb && !final_ && phase !== 'mixing' && <MixPreview mix={mix} dm={dm} onDM={onDM} onSkip={onSkip} busy={busy} cmReview={cmReview} debateResult={debateResult} />}
          {dmFb && !final_ && <DMFeedback fb={dmFb} onToggle={(i) => store.toggleFix(i)} onFinalize={onFinalize} onDeepen={onDeepen} busy={busy} />}

          {final_ && <>
            {/* Completion moment */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: EASE }}
              className="flex items-center justify-center gap-2 py-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--gradient-gold)' }}>
                <Check size={14} className="text-white" />
              </div>
              <p className="text-[14px] font-medium text-[var(--text-primary)]">
                {dmFb && dmFb.concerns.filter((c: DMConcern) => c.applied).length > 0
                  ? locale === 'ko' ? `피드백 ${dmFb.concerns.filter((c: DMConcern) => c.applied).length}건 반영 완료` : `${dmFb.concerns.filter((c: DMConcern) => c.applied).length} feedback item(s) applied`
                  : L('최종 문서 완성', 'Final document complete')}
              </p>
            </motion.div>
            <FinalCard content={final_} />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="pt-8 pb-16">
              <p className="text-[13px] text-[var(--text-tertiary)] text-center mb-6">{L('복사해서 바로 사용하세요.', 'Copy and use it right away.')}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={() => { useProgressiveStore.setState({ currentSessionId: null }); window.location.reload(); }}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-white text-[13px] font-semibold cursor-pointer"
                  style={{ background: 'var(--gradient-gold)' }}>{L('새 프로젝트 시작', 'Start New Project')} <ArrowRight size={12} /></button>
                <button onClick={() => { if (mix) { store.setFinalDeliverable(null as unknown as string); store.setDMFeedback(null as unknown as import('@/stores/types').DMFeedbackResult); store.setMix(null as unknown as MixResult); setShowMix(true); } }}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-[13px] font-medium text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:border-[var(--accent)]/30 cursor-pointer transition-colors">
                  {L('이해관계자 검증 다시 하기', 'Re-run stakeholder review')}
                </button>
              </div>
            </motion.div>
          </>}

          <AnimatePresence>
            {error && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {error.startsWith('LOGIN_REQUIRED') ? (
                <div className="rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-6">
                  <p className="text-[15px] font-bold text-[var(--text-primary)] mb-1">{L('무료 체험을 모두 사용했어요', 'Free trial limit reached')}</p>
                  <p className="text-[13px] text-[var(--text-secondary)] mb-4">{L('로그인하면 하루 10회까지 무료로 사용할 수 있습니다.', 'Sign in to get up to 10 free uses per day.')}</p>
                  <a href="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white text-[14px] font-semibold" style={{ background: 'var(--gradient-gold)' }}>{L('로그인', 'Sign In')} <ChevronRight size={14} /></a>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 px-5 py-4 rounded-2xl bg-red-50 border border-red-200 text-[13px] text-red-700">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <div>
                    <span>{error?.includes('한도') || error?.includes('rate') ? L('무료 체험 한도에 도달했습니다. Settings에서 본인의 API 키를 등록하면 무제한 사용이 가능합니다.', 'Free trial limit reached. Register your own API key in Settings for unlimited use.') : error}</span>
                    {(error?.includes('한도') || error?.includes('rate')) && (
                      <a href="/settings" className="block mt-1.5 text-[12px] text-red-600 font-medium hover:underline">{L('Settings에서 API 키 등록하기 →', 'Register API key in Settings →')}</a>
                    )}
                  </div>
                </div>
              )}
            </motion.div>}
          </AnimatePresence>

          {/* Phase progress dots — bottom milestone indicator */}
          <div className="pt-8 pb-4">
            <div className="flex items-center justify-center gap-1.5">
              {(locale === 'ko'
                ? ['상황 파악', '질문', '팀 작업', '피드백', '완성']
                : ['Analysis', 'Questions', 'Team Work', 'Feedback', 'Done']
              ).map((label, i) => {
                const milestonePhases = ['analyzing', 'conversing', 'mixing', 'dm_feedback', 'complete'];
                const milestoneIdx = milestonePhases.indexOf(phase);
                const reached = i <= milestoneIdx;
                const current = i === milestoneIdx;
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    {i > 0 && <div className={`w-4 h-px transition-colors duration-500 ${reached ? 'bg-[var(--accent)]/40' : 'bg-[var(--border-subtle)]'}`} />}
                    <div className={`flex items-center gap-1 transition-all duration-300 ${current ? 'opacity-100' : reached ? 'opacity-60' : 'opacity-25'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${reached ? 'bg-[var(--accent)]' : 'bg-[var(--text-tertiary)]'}`} />
                      <span className={`text-[9px] ${current ? 'text-[var(--accent)] font-semibold' : 'text-[var(--text-tertiary)]'}`}>{label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

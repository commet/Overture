'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWorkspaceStore, type StepId } from '@/stores/useWorkspaceStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { useProgressiveStore } from '@/stores/useProgressiveStore';
import { useAgentStore } from '@/stores/useAgentStore';
import { ReframeStep } from '@/components/workspace/ReframeStep';
import { RecastStep } from '@/components/workspace/RecastStep';
import { RehearseStep } from '@/components/workspace/RehearseStep';
import { SynthesizeStep } from '@/components/workspace/SynthesizeStep';
import { ProgressiveFlow } from '@/components/workspace/progressive/ProgressiveFlow';
import { WorkerDrawer, useWorkers } from '@/components/workspace/progressive/WorkerPanel';
import { AgentSidebar } from '@/components/workspace/progressive/AgentSidebar';
import { VoyageChart } from '@/components/workspace/progressive/VoyageChart';
import { QuickChatBar } from '@/components/workspace/QuickChatBar';
import { ConcertmasterStrip } from '@/components/workspace/ConcertmasterStrip';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useLocale } from '@/hooks/useLocale';
import { playTransitionTone, resumeAudioContext } from '@/lib/audio';
import { runInitialAnalysis } from '@/lib/progressive-engine';
import { Sparkles, ChevronRight, MessageSquare, Sliders, UserCheck, RefreshCw, FolderOpen, ChevronDown, AlertTriangle, Layers } from 'lucide-react';
import { track } from '@/lib/analytics';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { StaffLines } from '@/components/ui/MusicalElements';
import { EASE } from '@/components/workspace/progressive/shared/constants';
import { getPersonaPool } from '@/lib/worker-personas';
import { WorkerAvatar, AvatarRow } from '@/components/workspace/progressive/WorkerAvatar';
import { InteractiveDemo } from '@/components/workspace/InteractiveDemo';
import { getDemoScenarios } from '@/lib/demo-data';
import type { DemoScenario } from '@/lib/demo-data';
import { motion, AnimatePresence } from 'framer-motion';
import type { WorkerPersona } from '@/stores/types';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { parsePartialAnalysis } from '@/lib/partial-analysis';
import { DAILY_LIMIT, ANON_LIMIT } from '@/lib/quota-config';

/* ─── Step-level error fallback ─── */
function StepErrorFallback() {
  const locale = useLocale();
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertTriangle size={28} className="text-[var(--text-tertiary)] mb-3" />
      <p className="text-[14px] font-semibold text-[var(--text-primary)] mb-1">{L('이 단계에서 오류가 발생했습니다', 'An error occurred in this step')}</p>
      <p className="text-[12px] text-[var(--text-secondary)] mb-4">{L('다른 단계는 정상적으로 사용할 수 있습니다.', 'Other steps are still available.')}</p>
      <button onClick={() => window.location.reload()} className="px-4 py-2 text-[13px] font-medium rounded-lg bg-[var(--accent)] text-white hover:shadow-sm transition-all cursor-pointer">
        {L('새로고침', 'Refresh')}
      </button>
    </div>
  );
}

/* ─── Progressive Layout: flow + worker panel ─── */
function ProgressiveLayout({ projectId, projectName, onReset }: { projectId: string; projectName?: string; onReset: () => void }) {
  const locale = useLocale();
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  const workers = useWorkers();
  const hasWorkers = workers.length > 0;

  return (
    <div className="relative min-h-[calc(100vh-56px)] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--gradient-concert-hall)' }} />
      <StaffLines opacity={0.02} spacing={18} />

      <div className="relative pt-8 md:pt-12 pb-16">
        {/* Project header */}
        <div className="max-w-2xl mx-auto mb-6 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <FolderOpen size={14} className="text-[var(--accent)]" />
            <span className="text-[13px] font-semibold text-[var(--text-secondary)] truncate max-w-[200px]">
              {projectName}
            </span>
          </div>
          <button onClick={onReset} className="text-[12px] text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors cursor-pointer min-h-[44px] px-2 -mr-2 flex items-center">
            {L('새 프로젝트', 'New Project')}
          </button>
        </div>

        {/* Desktop: flex layout with agent sidebar on right */}
        <div className="flex">
          <div className={`flex-1 px-4 md:px-6 ${hasWorkers ? 'pb-[60px] lg:pb-0' : ''}`}>
            <ErrorBoundary fallback={<StepErrorFallback />}>
              <ProgressiveFlow projectId={projectId} />
            </ErrorBoundary>
          </div>
          {hasWorkers && (
            <div className="hidden lg:block w-72 xl:w-80 shrink-0 sticky top-14 h-[calc(100vh-120px)] overflow-y-auto border-l border-[var(--border-subtle)]/50">
              <AgentSidebar />
              {/* Voyage chart — sits beneath the agent sidebar so it's
                  always within reach but doesn't displace the live worker
                  view. Hidden on mobile in v1; will get a drawer tab in
                  a follow-up. */}
              <div className="px-4 pb-6 mt-4">
                <VoyageChart />
              </div>
            </div>
          )}
        </div>

        {/* Mobile: bottom drawer */}
        {hasWorkers && <WorkerDrawer className="lg:hidden" />}
      </div>
    </div>
  );
}


/* EASE — imported from shared/constants */

/* ─── HeroFlow: idle → assembling → analyzing → ready ─── */
type HeroPhase = 'idle' | 'assembling' | 'analyzing' | 'ready';

function HeroFlow({ onReady, projects, user, reviewerAgentId, initialProblem }: {
  onReady: (projectId: string) => void;
  projects: Array<{ id: string; name: string; updated_at?: string; created_at?: string }>;
  user: unknown;
  reviewerAgentId?: string;
  initialProblem?: string;
}) {
  const locale = useLocale();
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  const [phase, setPhase] = useState<HeroPhase>('idle');
  const demoScenarios = getDemoScenarios(locale);
  const [demoScenario, setDemoScenario] = useState<DemoScenario | null>(null);
  const [problemInput, setProblemInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [previewPersonas, setPreviewPersonas] = useState<WorkerPersona[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [justFromDemo, setJustFromDemo] = useState(false);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const { createProject } = useProjectStore();
  const progressiveStore = useProgressiveStore();
  const phaseRef = React.useRef<HeroPhase>('idle');
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStartedRef = React.useRef(false);
  const searchParams = useSearchParams();

  // Keep ref in sync for use inside async callback
  phaseRef.current = phase;

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // Auto-select demo scenario from ?demo= query param
  React.useEffect(() => {
    const demoId = searchParams.get('demo');
    if (demoId && !demoScenario) {
      const matched = demoScenarios.find(s => s.id === demoId);
      if (matched) setDemoScenario(matched);
    }
  }, [searchParams, demoScenarios, demoScenario]);

  // Auto-submit from ?q= param (landing Hero inline input) — routes through full streaming flow.
  // Demo param takes priority if both are set.
  React.useEffect(() => {
    if (!initialProblem || autoStartedRef.current) return;
    if (searchParams.get('demo')) return;
    const text = initialProblem.trim();
    if (!text) return;
    autoStartedRef.current = true;
    setProblemInput(text);
    handleSubmit(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProblem]);

  const handleSubmit = async (directText?: string) => {
    const text = (directText || problemInput).trim();
    if (!text || phase !== 'idle') return;
    if (directText) setProblemInput(text);

    // 1. idle → assembling: 팀 등장 (store 미동기 — HeroFlow가 언마운트되면 안 됨)
    setPhase('assembling');
    setError(null);
    const pool = getPersonaPool(locale);
    setPreviewPersonas(pool.slice(0, 4));
    track('workspace_problem_submit', { text_length: text.length, source: 'hero_flow' });

    // 2. assembling → analyzing (타이머 또는 첫 토큰)
    timerRef.current = setTimeout(() => {
      if (phaseRef.current === 'assembling') setPhase('analyzing');
    }, 2000);

    try {
      // 3. 스트리밍 분석 — 프로젝트/세션은 분석 성공 후에 생성한다.
      //    createProject가 동기로 currentProjectId를 set하면 부모가 ProgressiveLayout으로 전환하면서
      //    HeroFlow가 즉시 언마운트돼 assembling/analyzing 애니메이션이 한 번도 렌더되지 않음.
      const result = await runInitialAnalysis(text, (token) => {
        setStreamingText(token);
        if (phaseRef.current === 'assembling') {
          if (timerRef.current) clearTimeout(timerRef.current);
          setPhase('analyzing');
          track('first_analysis_start', { text_length: text.length, anonymous: !user });
        }
      });

      // 4. 분석 성공 — 이제 프로젝트 + 세션 생성 후 결과 주입
      const pid = createProject(text.slice(0, 40));
      progressiveStore.createSession(pid, text, reviewerAgentId);
      progressiveStore.addSnapshot(result.snapshot);
      if (result.detectedDM) progressiveStore.setDecisionMaker(result.detectedDM);
      progressiveStore.addQuestion(result.question);
      progressiveStore.setPhase('conversing');

      // 5. ready → ProgressiveFlow로 전환 (onReady → 부모가 setCurrentProjectId)
      setPhase('ready');
      onReady(pid);
    } catch (err) {
      if (timerRef.current) clearTimeout(timerRef.current);
      const errMsg = err instanceof Error ? err.message : String(err);
      // LLM layer가 던지는 분류 신호:
      //   - "LOGIN_REQUIRED:..." prefix → 익명 무료 체험 소진 (categorizeError at 429+needsLogin)
      //   - "한도" / "rate" → 로그인 사용자의 일반 rate limit
      const needsLogin = errMsg.startsWith('LOGIN_REQUIRED');
      const isRateLimit = !needsLogin && (errMsg.includes('한도') || errMsg.includes('rate') || errMsg.includes('limit') || errMsg.includes('429'));

      // errMsg 그대로 setError — 렌더 쪽에서 prefix로 분기해 login CTA vs generic 배너 결정.
      // 세션은 아직 생성 안 했으므로 정리 로직 불필요.
      setError(errMsg || L('분석에 실패했습니다. 다시 시도해주세요.', 'Analysis failed. Please try again.'));
      setPhase('idle');
      setStreamingText('');
      track('workspace_start_error', { error: errMsg, is_rate_limit: isRateLimit, needs_login: needsLogin });
      if (needsLogin || isRateLimit) {
        track('quota_blocked', { reason: needsLogin ? 'anon_quota' : 'auth_quota', anonymous: !user });
      }
    }
  };

  // Demo mode — show showcase
  if (demoScenario) {
    return (
      <div className="relative min-h-[calc(100vh-56px)] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--gradient-concert-hall)' }} />
        <StaffLines opacity={0.02} spacing={18} />
        <div className="relative h-[calc(100vh-56px)]">
          <InteractiveDemo
            scenario={demoScenario}
            locale={locale}
            onStartReal={() => {
              setProblemInput(demoScenario.problemText);
              setJustFromDemo(true);
              setDemoScenario(null);
              // Next paint: scroll input into view + focus + place caret at end
              requestAnimationFrame(() => {
                const el = inputRef.current;
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  el.focus();
                  const len = el.value.length;
                  el.setSelectionRange(len, len);
                }
              });
            }}
            onBack={() => setDemoScenario(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-56px)] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--gradient-concert-hall)' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--gradient-warm-vignette)' }} />
      <StaffLines opacity={0.03} spacing={14} />

      <div className="relative max-w-2xl mx-auto px-5 md:px-6 pt-8 md:pt-16 pb-16">
        <AnimatePresence mode="wait">
          {/* ═══ IDLE: 시나리오 선택 + 입력 ═══ */}
          {phase === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: EASE }}>

              {/* Returning user: previous projects — compact rows.
                  Show 3 most recently updated projects (fall back to created_at when missing). */}
              {projects.length > 0 && (
                <div className="mb-6">
                  <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-[0.12em] font-semibold mb-2">
                    {L('이어서 작업', 'Continue')}
                  </p>
                  <div className="space-y-1">
                    {[...projects]
                      .sort((a, b) => {
                        const aT = a.updated_at || a.created_at || '';
                        const bT = b.updated_at || b.created_at || '';
                        return bT.localeCompare(aT);
                      })
                      .slice(0, 3)
                      .map((p) => (
                      <button key={p.id} onClick={() => onReady(p.id)}
                        className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 md:py-2 min-h-[44px] md:min-h-0 rounded-lg hover:bg-[var(--surface)] hover:shadow-[var(--shadow-sm)] cursor-pointer transition-all group">
                        <FolderOpen size={12} className="text-[var(--accent)] shrink-0" />
                        <span className="text-[13px] text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">{p.name}</span>
                        <ChevronRight size={12} className="text-[var(--text-tertiary)] shrink-0 ml-auto opacity-0 md:opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Anonymous trial banner — compact, only critical info */}
              {!user && (
                <div className="mb-5 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[var(--accent)]/8 border border-[var(--accent)]/15">
                  <div className="flex items-center gap-2 text-[12px]">
                    <Sparkles size={12} className="text-[var(--accent)] shrink-0" />
                    <span className="text-[var(--text-primary)]">{locale === 'ko' ? <>로그인 없이 <strong>하루 {ANON_LIMIT}회 무료</strong> · 로그인하면 하루 {DAILY_LIMIT}회</> : <><strong>{ANON_LIMIT} free per day</strong> without login · {DAILY_LIMIT} per day with login</>}</span>
                  </div>
                  <Link href="/login" className="shrink-0 px-3 py-1 rounded-lg bg-[var(--accent)] text-[var(--bg)] text-[12px] font-semibold hover:shadow-[var(--shadow-sm)] transition-all">{L('로그인', 'Log in')}</Link>
                </div>
              )}

              {/* PRIMARY: Direct input — the workspace's hero. Big, prominent,
                  immediately actionable. Marketing copy lives below or
                  is reserved for first-time users (no projects yet). */}
              <div className="mb-3">
                <label className="block text-[13px] font-semibold text-[var(--text-primary)] mb-2.5">
                  {L('어떤 상황인가요?', "What's the situation?")}
                </label>
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] overflow-hidden focus-within:border-[var(--accent)]/40 transition-colors">
                  {justFromDemo && (
                    <div className="px-4 md:px-5 py-2.5 bg-[var(--accent)]/8 border-b border-[var(--accent)]/15 text-[12px] text-[var(--accent)] flex items-center gap-2">
                      <Sparkles size={12} className="shrink-0" />
                      <span>{L('데모 내용을 가져왔어요. 그대로 쓰거나 내 상황으로 바꿔도 돼요.', 'Loaded from the demo. Run as-is, or rewrite for your own situation.')}</span>
                    </div>
                  )}
                  <div className="p-3 md:p-4">
                    {/* text-base (16px) on mobile prevents iOS Safari auto-zoom on focus.
                        text-[15px] on md+ keeps the desktop refined size. */}
                    <textarea ref={inputRef} value={problemInput}
                      onChange={(e) => { setProblemInput(e.target.value); if (justFromDemo) setJustFromDemo(false); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                      placeholder={L('예: 다음 주까지 보고서를 써야 하는데 어디서 시작해야 할지 모르겠어', "e.g., I need to write a report by next week but don't know where to start")}
                      rows={3} maxLength={5000}
                      className="w-full px-3 py-2.5 bg-transparent text-base md:text-[15px] text-[var(--text-primary)] leading-[1.65] resize-none focus:outline-none placeholder:text-[var(--text-tertiary)]" />
                    <div className="flex items-center justify-between gap-3 mt-2 px-1">
                      {/* Desktop-only keyboard hint — irrelevant on mobile */}
                      <span className="hidden md:inline text-[11px] text-[var(--text-tertiary)]">
                        {L('Enter로 시작 · Shift+Enter로 줄바꿈', 'Enter to start · Shift+Enter for newline')}
                      </span>
                      <span className="md:hidden" />
                      <button onClick={() => { setJustFromDemo(false); handleSubmit(); }} disabled={!problemInput.trim()}
                        className={`shrink-0 inline-flex items-center gap-1.5 px-5 py-3 md:py-2.5 text-white rounded-xl text-[13px] font-semibold disabled:opacity-30 cursor-pointer min-h-[44px] md:min-h-[40px] transition-shadow hover:shadow-[var(--shadow-md)] ${justFromDemo ? 'animate-pulse' : ''}`}
                        style={{ background: 'var(--gradient-gold)' }}>
                        {L('시작', 'Start')} <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                {error && error.startsWith('LOGIN_REQUIRED') && (
                  <div className="mt-3 p-4 rounded-xl bg-[var(--accent)]/8 border border-[var(--accent)]/20">
                    <p className="text-[14px] font-bold text-[var(--text-primary)] mb-1">{L('무료 체험을 모두 사용했어요', 'Free trial limit reached')}</p>
                    <p className="text-[12px] text-[var(--text-secondary)] mb-3 leading-relaxed">{L(`로그인하면 하루 ${DAILY_LIMIT}회까지 무료로 사용할 수 있습니다.`, `Sign in to get up to ${DAILY_LIMIT} free uses per day.`)}</p>
                    <Link href="/login" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-[12px] font-semibold" style={{ background: 'var(--gradient-gold)' }}>
                      {L('로그인', 'Sign In')} <ChevronRight size={12} />
                    </Link>
                  </div>
                )}
                {error && !error.startsWith('LOGIN_REQUIRED') && (
                  <div className="mt-3 px-3 py-2.5 rounded-xl bg-[var(--accent)]/5 border border-[var(--accent)]/15 text-[13px] text-[var(--text-primary)] flex items-start gap-2">
                    <AlertTriangle size={14} className="text-[var(--accent)] shrink-0 mt-0.5" />
                    <div>
                      <span>
                        {error.includes('한도') || error.includes('rate') || error.includes('limit')
                          ? L('무료 체험 한도에 도달했습니다. Settings에서 본인의 API 키를 등록하면 무제한 사용이 가능합니다.', 'Free trial limit reached. Register your own API key in Settings for unlimited use.')
                          : error}
                      </span>
                      {(error.includes('API 키') || error.includes('API key') || error.includes('한도') || error.includes('rate')) && (
                        <a href="/settings" className="block mt-1.5 text-[12px] text-[var(--accent)] font-medium hover:underline">
                          {L('Settings에서 API 키 등록하기 →', 'Register your API key in Settings →')}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SECONDARY: Demo scenarios — compact, framed as "둘러보기".
                  Returning users glance past; first-timers explore. */}
              <div className="mt-10">
                <p className="text-[11px] text-[var(--text-tertiary)] mb-3 uppercase tracking-[0.12em] font-semibold">
                  {L('처음이라면 — 시나리오로 둘러보기', "New here? — Try a sample scenario")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {demoScenarios.map(s => (
                    <button key={s.id} onClick={() => setDemoScenario(s)}
                      className="text-left p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--accent)]/30 hover:shadow-[var(--shadow-sm)] cursor-pointer transition-all duration-200 group">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[16px]">{s.icon}</span>
                        <span className="text-[13px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">{s.title}</span>
                      </div>
                      <p className="text-[12px] text-[var(--text-tertiary)] leading-relaxed line-clamp-2">&ldquo;{s.problemText}&rdquo;</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* TERTIARY: Marketing copy — only for absolute first-time users
                  (no recent projects). Returning users skip this entirely. */}
              {projects.length === 0 && (
                <div className="mt-12 pt-8 border-t border-[var(--border-subtle)]/60 text-center">
                  <p className="text-[14px] md:text-[15px] text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto">
                    {locale === 'ko' ? <>상황을 알려주시면 AI 팀이 분석하고, 초안을 만들고,<br className="hidden md:block" /> 의사결정권자 반응까지 시뮬레이션합니다.</> : <>Tell us the situation — an AI team will analyze, draft,<br className="hidden md:block" /> and simulate decision-maker reactions.</>}
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ ASSEMBLING: 팀 등장 ═══ */}
          {phase === 'assembling' && (
            <motion.div key="assembling" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE }} className="pt-8 md:pt-16">

              {/* 축소된 입력 */}
              <motion.div layout className="flex items-center gap-3 px-5 py-3 rounded-full bg-[var(--bg)] border border-[var(--border-subtle)] w-fit max-w-full mb-8">
                <div className="w-5 h-5 rounded-full bg-[var(--text-primary)] flex items-center justify-center shrink-0">
                  <span className="text-[var(--bg)] text-[9px] font-bold">{L('나', 'Me')}</span>
                </div>
                <p className="text-[13px] text-[var(--text-secondary)] truncate">{problemInput}</p>
              </motion.div>

              {/* 팀 등장 */}
              <div className="rounded-xl bg-[var(--accent)]/[0.03] border border-[var(--accent)]/10 p-4 space-y-2.5">
                {previewPersonas.map((p, i) => (
                  <motion.div key={p.id}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.3, duration: 0.4, ease: EASE }}
                    className="flex items-center gap-3">
                    <WorkerAvatar persona={p} size="sm" />
                    <span className="text-[13px] font-medium text-[var(--text-primary)]">{p.name}</span>
                    <span className="text-[11px] text-[var(--text-tertiary)]">{p.role}</span>
                  </motion.div>
                ))}
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.4 }}
                  className="text-[11px] text-[var(--text-tertiary)] pt-1">
                  {L('팀이 구성되었습니다. 상황을 분석합니다...', 'Team assembled. Analyzing the situation...')}
                </motion.p>
              </div>
            </motion.div>
          )}

          {/* ═══ ANALYZING: 스트리밍 분석 — 구조화된 필드별 렌더링 ═══ */}
          {phase === 'analyzing' && (() => {
            const partial = parsePartialAnalysis(streamingText);
            const stageLabel = (() => {
              switch (partial.stage) {
                case 'reading': return L('상황을 읽는 중', 'Reading the situation');
                case 'question': return L('진짜 질문을 찾는 중', 'Finding the real question');
                case 'assumptions': return L('숨은 가정을 분석하는 중', 'Analyzing hidden assumptions');
                case 'skeleton': return L('뼈대를 작성하는 중', 'Drafting the skeleton');
              }
            })();
            const hasQuestion = !!partial.real_question;
            const hasAssumptions = partial.hidden_assumptions.length > 0;
            const hasSkeleton = partial.skeleton.length > 0;
            return (
              <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: EASE }} className="pt-6 md:pt-10">

                {/* 상단: 팀 아바타 + 문제 echo */}
                <div className="flex items-center gap-3 mb-5">
                  <AvatarRow personas={previewPersonas} />
                  <p className="text-[13px] text-[var(--text-secondary)] truncate flex-1">{problemInput}</p>
                </div>

                {/* 현재 단계 표시 */}
                <div className="flex items-center gap-2 mb-4 px-1">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                    <Sparkles size={14} className="text-[var(--accent)]" />
                  </motion.div>
                  <span className="text-[12px] font-medium text-[var(--accent)]">{stageLabel}</span>
                </div>

                {/* ─── Field 1: 진짜 질문 ─── */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: hasQuestion ? 1 : 0.4, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="rounded-2xl border border-[var(--accent)]/12 bg-[var(--surface)] p-4 md:p-5 mb-3"
                >
                  <div className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-[0.15em] mb-2">
                    {L('진짜 질문', 'Real question')}
                  </div>
                  <div className="text-[15px] md:text-[16px] leading-[1.6] text-[var(--text-primary)] whitespace-pre-wrap break-words min-h-[24px]">
                    {hasQuestion ? partial.real_question : <span className="text-[var(--text-tertiary)] text-[13px]">{L('찾는 중...', 'Searching...')}</span>}
                    {hasQuestion && !partial.real_question_complete && (
                      <span className="inline-block w-[2px] h-[16px] bg-[var(--accent)] ml-0.5 animate-pulse align-middle" />
                    )}
                  </div>
                </motion.div>

                {/* ─── Field 2: 숨은 가정 ─── */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: partial.stage === 'assumptions' || hasAssumptions ? 1 : 0.35, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 md:p-5 mb-3"
                >
                  <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.15em] mb-2">
                    {L('숨은 가정', 'Hidden assumptions')}
                  </div>
                  {hasAssumptions ? (
                    <ul className="space-y-1.5">
                      {partial.hidden_assumptions.map((a, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, ease: EASE }}
                          className="text-[13px] md:text-[14px] leading-[1.55] text-[var(--text-secondary)] flex gap-2"
                        >
                          <span className="text-[var(--accent)] shrink-0">·</span>
                          <span className="flex-1">{a}</span>
                        </motion.li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-[var(--text-tertiary)] text-[13px]">
                      {partial.stage === 'assumptions' ? L('찾는 중...', 'Searching...') : L('대기 중', 'Waiting')}
                    </span>
                  )}
                </motion.div>

                {/* ─── Field 3: 뼈대 ─── */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: partial.stage === 'skeleton' || hasSkeleton ? 1 : 0.35, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 md:p-5"
                >
                  <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.15em] mb-2">
                    {L('뼈대', 'Skeleton')}
                  </div>
                  {hasSkeleton ? (
                    <ol className="space-y-1.5">
                      {partial.skeleton.map((s, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, ease: EASE }}
                          className="text-[13px] md:text-[14px] leading-[1.55] text-[var(--text-secondary)] flex gap-2"
                        >
                          <span className="text-[var(--accent)] shrink-0 tabular-nums">{i + 1}.</span>
                          <span className="flex-1">{s}</span>
                        </motion.li>
                      ))}
                    </ol>
                  ) : (
                    <span className="text-[var(--text-tertiary)] text-[13px]">
                      {partial.stage === 'skeleton' ? L('작성 중...', 'Drafting...') : L('대기 중', 'Waiting')}
                    </span>
                  )}
                </motion.div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Step metadata ─── */
const STEPS: { id: StepId; number: string; label: string; labelEn: string; desc: string; descEn: string; icon: React.ReactNode; color: string }[] = [
  { id: 'reframe',    number: '01', label: '문제 재정의', labelEn: 'Reframe',    desc: '숨겨진 전제 발견', descEn: 'Uncover hidden assumptions', icon: <MessageSquare size={16} />, color: '#2d4a7c' },
  { id: 'recast',     number: '02', label: '실행 설계',   labelEn: 'Recast',     desc: '구조와 역할 배분', descEn: 'Structure & assign roles',    icon: <Sliders size={16} />,        color: '#8b6914' },
  { id: 'rehearse',   number: '03', label: '사전 검증',   labelEn: 'Rehearse',   desc: '판단자 시뮬레이션', descEn: 'Simulate decision-makers',   icon: <UserCheck size={16} />,      color: '#6b4c9a' },
  { id: 'refine',     number: '04', label: '수정 반영',   labelEn: 'Refine',     desc: '피드백 수렴',       descEn: 'Converge feedback',          icon: <RefreshCw size={16} />,      color: '#2d6b2d' },
  { id: 'synthesize', number: '05', label: '종합',       labelEn: 'Synthesize', desc: '다중 관점 통합',     descEn: 'Integrate perspectives',     icon: <Layers size={16} />,         color: '#9b5de5' },
];

function WorkspaceContent() {
  const locale = useLocale();
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  const searchParams = useSearchParams();
  const { activeStep, setActiveStep } = useWorkspaceStore();
  const { projects, currentProjectId, setCurrentProjectId, loadProjects } = useProjectStore();
  const { settings, loadSettings } = useSettingsStore();
  const { user } = useAuth();
  const progressiveStore = useProgressiveStore();
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);

  // Use legacy mode if ?step= is explicitly set
  const explicitStep = searchParams.get('step') as StepId | null;
  const useLegacyMode = explicitStep && ['reframe', 'recast', 'rehearse', 'refine', 'synthesize'].includes(explicitStep);

  // Boss에서 넘어온 경우 reviewer agent ID
  const reviewerParam = searchParams.get('reviewer');

  useEffect(() => {
    loadProjects();
    loadSettings();
    progressiveStore.loadSessions();
    // Required so ReviewerBadge can resolve ?reviewer=<agentId> when the user
    // arrives from Boss's "기획안 만들기" link. Without this, agents stays
    // empty and the badge silently returns null even though the reviewer
    // is correctly attached to the session.
    useAgentStore.getState().loadAgents();
    track('workspace_enter', { has_user: !!user, has_projects: projects.length > 0 });
  }, [loadProjects, loadSettings]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (useLegacyMode && explicitStep) {
      setActiveStep(explicitStep);
    }
  }, [explicitStep, useLegacyMode, setActiveStep]);

  // Pick up ?q= param (from landing Hero inline input) — HeroFlow handles the streaming flow
  const queryProblem = searchParams.get('q');

  const handleNavigate = (step: string) => {
    const stepId = step.replace('/tools/', '') as StepId;
    setActiveStep(stepId);
    window.history.pushState(null, '', `/workspace?step=${stepId}`);
    if (settings.audio_enabled) {
      resumeAudioContext();
      playTransitionTone(settings.audio_volume);
    }
  };

  const currentProject = currentProjectId ? projects.find(p => p.id === currentProjectId) : null;

  // Check if current project has a progressive session
  const progressiveSession = currentProjectId
    ? progressiveStore.sessions.find(s => s.project_id === currentProjectId)
    : null;

  /* ─── Empty state: HeroFlow with morphing transition ─── */
  if (!currentProjectId) {
    return (
      <HeroFlow
        onReady={(pid) => setCurrentProjectId(pid)}
        projects={projects}
        user={user}
        reviewerAgentId={reviewerParam || undefined}
        initialProblem={queryProblem || undefined}
      />
    );
  }

  /* ─── Progressive Flow: default for new sessions ─── */
  if (progressiveSession && !useLegacyMode) {
    // Sync active session ID (safe: Zustand setState is synchronous)
    if (progressiveStore.currentSessionId !== progressiveSession.id) {
      useProgressiveStore.setState({ currentSessionId: progressiveSession.id });
    }

    return (
      <ProgressiveLayout projectId={progressiveSession.project_id} projectName={currentProject?.name} onReset={() => {
        setCurrentProjectId(null);
        useProgressiveStore.setState({ currentSessionId: null });
      }} />
    );
  }

  /* ─── Active workspace: step content (legacy 4-tab mode) ─── */
  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)]">
      {/* Top bar: project + step indicator */}
      <div className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 flex items-center gap-3">
          {/* Project name + switcher */}
          {currentProject && (
            <div className="relative shrink-0">
              <button
                onClick={() => setProjectMenuOpen(!projectMenuOpen)}
                className="flex items-center gap-1.5 py-2.5 text-[12px] font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)] cursor-pointer transition-colors"
              >
                <FolderOpen size={13} className="text-[var(--accent)]" />
                <span className="max-w-[120px] truncate">{currentProject.name}</span>
                <ChevronDown size={11} />
              </button>
              {projectMenuOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-lg)] z-50 py-1">
                  {projects.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setCurrentProjectId(p.id); setProjectMenuOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-[12px] cursor-pointer transition-colors ${
                        p.id === currentProjectId
                          ? 'text-[var(--accent)] font-semibold bg-[var(--accent)]/5'
                          : 'text-[var(--text-primary)] hover:bg-[var(--bg)]'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                  <div className="border-t border-[var(--border)] mt-1 pt-1">
                    <button
                      onClick={() => { setCurrentProjectId(null); setProjectMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 text-[12px] text-[var(--accent)] font-medium cursor-pointer hover:bg-[var(--bg)]"
                    >
                      {L('+ 새 프로젝트', '+ New Project')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          {currentProject && <div className="w-px h-5 bg-[var(--border)] shrink-0" />}

          {/* Step indicator */}
          <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-hide flex-1">
            {STEPS.map((step, i) => {
              const isActive = activeStep === step.id;
              return (
                <div key={step.id} className="flex items-center shrink-0">
                  {i > 0 && (
                    <ChevronRight size={12} className="text-[var(--text-tertiary)] mx-1" />
                  )}
                  <button
                    ref={(el) => {
                      if (el && isActive) {
                        el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                      }
                    }}
                    onClick={(e) => {
                      handleNavigate(step.id);
                      (e.currentTarget as HTMLButtonElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[var(--bg)] shadow-[var(--shadow-xs)] text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg)]/50'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: isActive ? `${step.color}15` : 'transparent',
                        color: isActive ? step.color : 'var(--text-tertiary)',
                      }}
                    >
                      {step.icon}
                    </div>
                    <span className="hidden sm:inline">{locale === 'ko' ? step.label : step.labelEn}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step content area */}
      <div className="flex-1 overflow-y-auto relative">
        {/* Concert hall ambient */}
        <div className="absolute inset-x-0 top-0 h-64 pointer-events-none" style={{ background: 'var(--gradient-stage-light)' }} />
        <StaffLines opacity={0.02} spacing={18} />

        {/* Anonymous trial banner */}
        {!user && (
          <div className="relative max-w-4xl mx-auto px-4 md:px-6 lg:px-8 mt-4">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[var(--accent)]/8 border border-[var(--accent)]/15">
              <div className="flex items-center gap-2 text-[12px]">
                <Sparkles size={13} className="text-[var(--accent)] shrink-0" />
                <span className="text-[var(--text-primary)]">
                  {locale === 'ko' ? <>로그인 없이 <strong>하루 {ANON_LIMIT}회 무료</strong> · <Link href="/login" className="text-[var(--accent)] font-semibold underline">로그인</Link>하면 하루 {DAILY_LIMIT}회</> : <><strong>{ANON_LIMIT} free per day</strong> without login · <Link href="/login" className="text-[var(--accent)] font-semibold underline">Log in</Link> for {DAILY_LIMIT} per day</>}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step component */}
        <div className="relative p-4 md:p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in" key={activeStep}>
          <ErrorBoundary fallback={<StepErrorFallback />}>
            {activeStep === 'reframe' && <ReframeStep onNavigate={handleNavigate} />}
            {activeStep === 'recast' && <RecastStep onNavigate={handleNavigate} />}
            {activeStep === 'rehearse' && <RehearseStep onNavigate={handleNavigate} />}
            {activeStep === 'synthesize' && <SynthesizeStep onNavigate={handleNavigate} />}
          </ErrorBoundary>
        </div>
      </div>

      {/* Quick chat bar */}
      <QuickChatBar activeStep={activeStep} onNavigate={handleNavigate} />

      {/* Concertmaster strip */}
      <ConcertmasterStrip />

      {/* Mobile bottom nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--surface)] border-t border-[var(--border)] z-40">
        <div className="flex items-center justify-around px-1 py-1.5">
          {STEPS.map((step) => (
            <button
              key={step.id}
              onClick={() => handleNavigate(step.id)}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[52px] min-h-[44px] px-2 py-1 rounded-xl cursor-pointer transition-colors ${
                activeStep === step.id
                  ? 'text-[var(--accent)] bg-[var(--accent)]/8'
                  : 'text-[var(--text-tertiary)]'
              }`}
            >
              <div style={{ color: activeStep === step.id ? step.color : undefined }}>
                {step.icon}
              </div>
              <span className="text-[10px] font-semibold">{locale === 'ko' ? step.label.slice(0, 2) : step.labelEn.slice(0, 3)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SuspenseFallback() {
  const locale = useLocale();
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin mx-auto" />
        <p className="text-[13px] text-[var(--text-secondary)]">{L('워크스페이스 준비 중...', 'Preparing workspace...')}</p>
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <WorkspaceContent />
    </Suspense>
  );
}

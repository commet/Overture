'use client';

import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWorkspaceStore, type StepId } from '@/stores/useWorkspaceStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { useProgressiveStore } from '@/stores/useProgressiveStore';
import { ReframeStep } from '@/components/workspace/ReframeStep';
import { RecastStep } from '@/components/workspace/RecastStep';
import { RehearseStep } from '@/components/workspace/RehearseStep';
import { RefineStep } from '@/components/workspace/RefineStep';
import { SynthesizeStep } from '@/components/workspace/SynthesizeStep';
import { ProgressiveFlow } from '@/components/workspace/progressive/ProgressiveFlow';
import { WorkerDrawer, useWorkers } from '@/components/workspace/progressive/WorkerPanel';
import { AgentSidebar } from '@/components/workspace/progressive/AgentSidebar';
import { QuickChatBar } from '@/components/workspace/QuickChatBar';
import { ConcertmasterStrip } from '@/components/workspace/ConcertmasterStrip';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useLocale } from '@/hooks/useLocale';
import { playTransitionTone, resumeAudioContext } from '@/lib/audio';
import { runInitialAnalysis } from '@/lib/progressive-engine';
import { Sparkles, Clock, X, ChevronRight, MessageSquare, Sliders, UserCheck, RefreshCw, FolderOpen, ChevronDown, AlertTriangle, Layers } from 'lucide-react';
import { getStorage, STORAGE_KEYS } from '@/lib/storage';
import type { RefineLoop, OutcomeRecord } from '@/stores/types';
import { track } from '@/lib/analytics';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { StaffLines, CrescendoHairpin, TrebleClef } from '@/components/ui/MusicalElements';
import { EASE } from '@/components/workspace/progressive/shared/constants';
import { useHandoffStore } from '@/stores/useHandoffStore';
import { getPersonaPool } from '@/lib/worker-personas';
import { WorkerAvatar, AvatarRow } from '@/components/workspace/progressive/WorkerAvatar';
import { InteractiveDemo } from '@/components/workspace/InteractiveDemo';
import { getDemoScenarios } from '@/lib/demo-data';
import type { DemoScenario } from '@/lib/demo-data';
import { motion, AnimatePresence } from 'framer-motion';
import type { WorkerPersona } from '@/stores/types';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

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
          <button onClick={onReset} className="text-[12px] text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors cursor-pointer">
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

function HeroFlow({ onReady, projects, user, reviewerAgentId }: {
  onReady: (projectId: string) => void;
  projects: Array<{ id: string; name: string }>;
  user: unknown;
  reviewerAgentId?: string;
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
  const { createProject, setCurrentProjectId } = useProjectStore();
  const progressiveStore = useProgressiveStore();
  const phaseRef = React.useRef<HeroPhase>('idle');
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const handleSubmit = async (directText?: string) => {
    const text = (directText || problemInput).trim();
    if (!text || phase !== 'idle') return;
    if (directText) setProblemInput(text);

    // 1. idle → assembling: 팀 등장
    setPhase('assembling');
    setError(null);
    const pool = getPersonaPool();
    setPreviewPersonas(pool.slice(0, 4));

    // 2. 프로젝트 + 세션 생성
    const pid = createProject(text.slice(0, 40));
    setCurrentProjectId(pid);
    progressiveStore.createSession(pid, text, reviewerAgentId);
    track('workspace_problem_submit', { text_length: text.length, source: 'hero_flow' });

    // 3. assembling → analyzing (타이머 또는 첫 토큰)
    timerRef.current = setTimeout(() => {
      if (phaseRef.current === 'assembling') setPhase('analyzing');
    }, 2000);

    try {
      // 4. 스트리밍 분석
      const result = await runInitialAnalysis(text, (token) => {
        setStreamingText(token);
        if (phaseRef.current === 'assembling') {
          if (timerRef.current) clearTimeout(timerRef.current);
          setPhase('analyzing');
        }
      });

      // 5. 결과 저장
      progressiveStore.addSnapshot(result.snapshot);
      if (result.detectedDM) progressiveStore.setDecisionMaker(result.detectedDM);
      progressiveStore.addQuestion(result.question);
      progressiveStore.setPhase('conversing');

      // 6. ready → ProgressiveFlow로 전환
      setPhase('ready');
      onReady(pid);
    } catch (err) {
      if (timerRef.current) clearTimeout(timerRef.current);
      const errMsg = err instanceof Error ? err.message : String(err);
      const isRateLimit = errMsg.includes('한도') || errMsg.includes('rate') || errMsg.includes('limit');

      if (isRateLimit) {
        // Rate limit: 세션 보존 (사용자 입력 날리지 않음), 안내 제공
        setError(L('무료 체험 한도에 도달했습니다. Settings에서 본인의 API 키를 등록하면 무제한 사용이 가능합니다.', 'Free trial limit reached. Register your own API key in Settings for unlimited use.'));
      } else {
        // 다른 에러: 세션 정리
        const sid = progressiveStore.currentSessionId;
        if (sid) progressiveStore.deleteSession(sid);
        setCurrentProjectId(null);
        setError(errMsg || L('분석에 실패했습니다. 다시 시도해주세요.', 'Analysis failed. Please try again.'));
      }
      setPhase('idle');
      setStreamingText('');
      track('workspace_start_error', { error: errMsg, is_rate_limit: isRateLimit });
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
              setDemoScenario(null);
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

              {/* Returning user: previous projects */}
              {projects.length > 0 && (
                <div className="mb-8">
                  <div className="space-y-2">
                    {projects.slice(0, 3).map((p) => (
                      <button key={p.id} onClick={() => onReady(p.id)}
                        className="w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--accent)]/30 hover:shadow-[var(--shadow-sm)] cursor-pointer transition-all">
                        <FolderOpen size={14} className="text-[var(--accent)] shrink-0" />
                        <span className="text-[14px] font-medium text-[var(--text-primary)] truncate">{p.name}</span>
                        <ChevronRight size={14} className="text-[var(--text-tertiary)] shrink-0 ml-auto" />
                      </button>
                    ))}
                  </div>
                  <div className="mt-6 mb-8 flex items-center gap-4">
                    <div className="flex-1 h-px bg-[var(--border-subtle)]" />
                    <span className="text-[11px] text-[var(--text-tertiary)]">{L('새로 시작하기', 'Start new')}</span>
                    <div className="flex-1 h-px bg-[var(--border-subtle)]" />
                  </div>
                </div>
              )}

              {/* Anonymous trial banner */}
              {!user && (
                <div className="mb-6 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[var(--accent)]/8 border border-[var(--accent)]/15">
                  <div className="flex items-center gap-2 text-[13px]">
                    <Sparkles size={14} className="text-[var(--accent)] shrink-0" />
                    <span className="text-[var(--text-primary)]">{locale === 'ko' ? <>로그인 없이 <strong>1회 무료 체험</strong> · 로그인하면 하루 2회</> : <>Try <strong>1 free session</strong> without login · 2 per day with login</>}</span>
                  </div>
                  <Link href="/login" className="shrink-0 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--bg)] text-[12px] font-semibold hover:shadow-[var(--shadow-sm)] transition-all">{L('로그인', 'Log in')}</Link>
                </div>
              )}

              {/* Heading */}
              <div className="mb-8 text-center">
                <h1 className="text-display-lg text-[var(--text-primary)]">
                  {locale === 'ko' ? <>막막한 업무,<br /><span className="text-gold-gradient">같이 풀어드립니다</span></> : <>Stuck on a task?<br /><span className="text-gold-gradient">We'll figure it out together</span></>}
                </h1>
                <p className="mt-3 text-[14px] md:text-[15px] text-[var(--text-secondary)] leading-relaxed max-w-md mx-auto">
                  {locale === 'ko' ? <>상황을 알려주세요. AI 팀이 분석하고, 초안을 만들고,<br className="hidden md:block" />의사결정권자 반응까지 시뮬레이션합니다.</> : <>Tell us the situation. An AI team will analyze, draft,<br className="hidden md:block" />and simulate decision-maker reactions.</>}
                </p>
              </div>

              {/* Scenario cards — click = demo showcase */}
              <div className="mb-6">
                <p className="text-[12px] text-[var(--text-tertiary)] mb-3">{L('이런 상황이라면, 체험해보세요', 'Try these scenarios')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {demoScenarios.map(s => (
                    <button key={s.id} onClick={() => setDemoScenario(s)}
                      className="text-left p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--accent)]/30 hover:shadow-[var(--shadow-md)] hover:-translate-y-[1px] cursor-pointer transition-all duration-200 group">
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="text-[18px]">{s.icon}</span>
                        <span className="text-[13px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">{s.title}</span>
                      </div>
                      <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">&ldquo;{s.problemText}&rdquo;</p>
                      <div className="flex items-center gap-1 mt-3 text-[11px] text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity">
                        {L('체험해보기', 'Try it')} <ChevronRight size={11} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Direct input */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] overflow-hidden">
                <div className="p-4 md:p-5">
                  <p className="text-[12px] text-[var(--text-tertiary)] mb-2.5">
                    {problemInput.trim() ? L('수정하거나 그대로 시작하세요', 'Edit or start as-is') : L('내 상황을 직접 입력할 수도 있어요', 'Or describe your own situation')}
                  </p>
                  <div className="flex items-start gap-3">
                    <textarea value={problemInput} onChange={(e) => setProblemInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                      placeholder={L('예: 다음 주까지 보고서를 써야 하는데 어디서 시작해야 할지 모르겠어', "e.g., I need to write a report by next week but don't know where to start")}
                      rows={problemInput.trim() ? 3 : 1} maxLength={5000}
                      onFocus={(e) => { e.target.rows = 3; }}
                      onBlur={(e) => { if (!e.target.value) e.target.rows = 1; }}
                      className="flex-1 px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border-subtle)] text-[14px] text-[var(--text-primary)] leading-relaxed resize-none focus:outline-none focus:border-[var(--accent)]/40 transition-all placeholder:text-[var(--text-tertiary)]" />
                    <button onClick={() => handleSubmit()} disabled={!problemInput.trim()}
                      className="shrink-0 px-5 py-3 text-white rounded-xl text-[13px] font-semibold disabled:opacity-30 cursor-pointer min-h-[44px] transition-shadow hover:shadow-[var(--shadow-md)]"
                      style={{ background: 'var(--gradient-gold)' }}>
                      {L('시작', 'Start')} <ChevronRight size={12} className="inline ml-1" />
                    </button>
                  </div>

                  {error && (
                    <div className="mt-3 px-3 py-2.5 rounded-xl bg-[var(--accent)]/5 border border-[var(--accent)]/15 text-[13px] text-[var(--text-primary)] flex items-start gap-2">
                      <AlertTriangle size={14} className="text-[var(--accent)] shrink-0 mt-0.5" />
                      <div>
                        <span>{error}</span>
                        {(error.includes('API 키') || error.includes('API key')) && (
                          <a href="/settings" className="block mt-1.5 text-[12px] text-[var(--accent)] font-medium hover:underline">
                            {L('Settings에서 API 키 등록하기 →', 'Register your API key in Settings →')}
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
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

          {/* ═══ ANALYZING: 스트리밍 분석 ═══ */}
          {phase === 'analyzing' && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE }} className="pt-8 md:pt-12">

              {/* 상단: 팀 아바타 + 문제 */}
              <div className="flex items-center gap-3 mb-6">
                <AvatarRow personas={previewPersonas} />
                <p className="text-[13px] text-[var(--text-secondary)] truncate flex-1">{problemInput}</p>
              </div>

              {/* 스트리밍 분석 */}
              <div className="rounded-2xl border border-[var(--accent)]/12 bg-[var(--surface)] p-5 md:p-7">
                <div className="flex items-center gap-2 mb-4">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                    <Sparkles size={14} className="text-[var(--accent)]" />
                  </motion.div>
                  <span className="text-[12px] font-medium text-[var(--accent)]">{L('분석 중', 'Analyzing')}</span>
                </div>
                <div className="text-[14px] md:text-[15px] leading-[1.85] text-[var(--text-primary)] whitespace-pre-wrap break-words min-h-[80px]">
                  {streamingText || L('상황을 읽고 있습니다...', 'Reading the situation...')}
                  <span className="inline-block w-[2px] h-[18px] bg-[var(--accent)] ml-0.5 animate-pulse align-middle" />
                </div>
              </div>
            </motion.div>
          )}
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
  const { projects, currentProjectId, setCurrentProjectId, createProject, loadProjects } = useProjectStore();
  const { settings, loadSettings } = useSettingsStore();
  const { user } = useAuth();
  const { setHandoff } = useHandoffStore();
  const progressiveStore = useProgressiveStore();
  const [problemInput, setProblemInput] = useState('');
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Use legacy mode if ?step= is explicitly set
  const explicitStep = searchParams.get('step') as StepId | null;
  const useLegacyMode = explicitStep && ['reframe', 'recast', 'rehearse', 'refine', 'synthesize'].includes(explicitStep);

  // Boss에서 넘어온 경우 reviewer agent ID
  const reviewerParam = searchParams.get('reviewer');

  useEffect(() => {
    loadProjects();
    loadSettings();
    progressiveStore.loadSessions();
    track('workspace_enter', { has_user: !!user, has_projects: projects.length > 0 });
  }, [loadProjects, loadSettings]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (useLegacyMode && explicitStep) {
      setActiveStep(explicitStep);
    }
  }, [explicitStep, useLegacyMode, setActiveStep]);

  // Auto-start from ?q= param (Hero inline input)
  const queryProblem = searchParams.get('q');
  const [autoStarted, setAutoStarted] = useState(false);

  useEffect(() => {
    if (queryProblem && !autoStarted && !currentProjectId && !isStarting) {
      setAutoStarted(true);
      setProblemInput(queryProblem);
      // Auto-trigger after a tick to let stores load (no cleanup — one-shot timer)
      setTimeout(() => {
        const text = queryProblem.trim();
        if (!text) return;
        setIsStarting(true);
        setStartError(null);
        const pid = createProject(text.slice(0, 40));
        setCurrentProjectId(pid);
        track('project_created', { source: 'hero_inline' });
        progressiveStore.createSession(pid, text, reviewerParam || undefined);
        const capturedSid = progressiveStore.currentSessionId;
        runInitialAnalysis(text).then(result => {
          progressiveStore.addSnapshot(result.snapshot);
          if (result.detectedDM) progressiveStore.setDecisionMaker(result.detectedDM);
          progressiveStore.addQuestion(result.question);
          progressiveStore.setPhase('conversing');
        }).catch(err => {
          if (capturedSid) progressiveStore.deleteSession(capturedSid);
          setCurrentProjectId(null);
          setStartError(err instanceof Error ? err.message : L('분석에 실패했습니다.', 'Analysis failed.'));
        }).finally(() => setIsStarting(false));
      }, 100);
    }
  }, [queryProblem, autoStarted, currentProjectId, isStarting]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNavigate = (step: string) => {
    const stepId = step.replace('/tools/', '') as StepId;
    setActiveStep(stepId);
    window.history.pushState(null, '', `/workspace?step=${stepId}`);
    if (settings.audio_enabled) {
      resumeAudioContext();
      playTransitionTone(settings.audio_volume);
    }
  };

  const handleStartWithProblem = async () => {
    if (!problemInput.trim() || isStarting) return;
    const text = problemInput.trim();
    setIsStarting(true);
    setStartError(null);

    // Create project
    const pid = createProject(text.slice(0, 40));
    setCurrentProjectId(pid);
    track('workspace_problem_submit', { text_length: text.length, source: 'workspace_progressive' });

    // Create progressive session & kick off initial analysis
    progressiveStore.createSession(pid, text, reviewerParam || undefined);
    const capturedSid = progressiveStore.currentSessionId;

    try {
      const result = await runInitialAnalysis(text);

      // Store initial snapshot
      progressiveStore.addSnapshot(result.snapshot);

      // Store detected DM
      if (result.detectedDM) {
        progressiveStore.setDecisionMaker(result.detectedDM);
      }

      // Add first question
      progressiveStore.addQuestion(result.question);
      progressiveStore.setPhase('conversing');
    } catch (err) {
      // On error: delete the session and project so user can retry
      if (capturedSid) progressiveStore.deleteSession(capturedSid);
      setCurrentProjectId(null);
      const raw = err instanceof Error ? err.message : '';
      const errMsg = raw.includes('fetch') || raw.includes('network') || raw.includes('Failed to fetch')
        ? L('인터넷 연결을 확인해주세요.', 'Please check your internet connection.')
        : raw.includes('rate') || raw.includes('limit') || raw.includes('429')
        ? L('오늘의 분석 횟수를 모두 사용했습니다. 내일 다시 시도해주세요.', 'Daily analysis limit reached. Please try again tomorrow.')
        : raw.includes('too long') || raw.includes('token')
        ? L('입력이 너무 깁니다. 핵심만 간결하게 입력해주세요.', 'Input is too long. Please keep it concise.')
        : raw || L('분석에 실패했습니다. 다시 시도해주세요.', 'Analysis failed. Please try again.');
      setStartError(errMsg);
      track('workspace_start_error', { error: errMsg });
    } finally {
      setIsStarting(false);
    }
  };

  const currentProject = currentProjectId ? projects.find(p => p.id === currentProjectId) : null;

  // Check if current project has a progressive session
  const progressiveSession = currentProjectId
    ? progressiveStore.sessions.find(s => s.project_id === currentProjectId)
    : null;

  const currentStepMeta = STEPS.find(s => s.id === activeStep)!;

  /* ─── Empty state: HeroFlow with morphing transition ─── */
  if (!currentProjectId) {
    return (
      <>
        {startError && (
          <div className="max-w-2xl mx-auto px-4 pt-4">
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700 flex items-center justify-between" role="alert">
              <span>{startError}</span>
              <button onClick={() => setStartError(null)} className="text-red-400 hover:text-red-600 cursor-pointer ml-2">✕</button>
            </div>
          </div>
        )}
        <HeroFlow
          onReady={(pid) => setCurrentProjectId(pid)}
          projects={projects}
          user={user}
          reviewerAgentId={reviewerParam || undefined}
        />
      </>
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
                    onClick={() => handleNavigate(step.id)}
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
                  {locale === 'ko' ? <>로그인 없이 <strong>3회 무료</strong> · <Link href="/login" className="text-[var(--accent)] font-semibold underline">로그인</Link>하면 하루 5회</> : <><strong>3 free</strong> without login · <Link href="/login" className="text-[var(--accent)] font-semibold underline">Log in</Link> for 5 per day</>}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Outcome nudge */}
        <OutcomeNudge onNavigate={handleNavigate} />

        {/* Step component */}
        <div className="relative p-4 md:p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in" key={activeStep}>
          <ErrorBoundary fallback={<StepErrorFallback />}>
            {activeStep === 'reframe' && <ReframeStep onNavigate={handleNavigate} />}
            {activeStep === 'recast' && <RecastStep onNavigate={handleNavigate} />}
            {activeStep === 'rehearse' && <RehearseStep onNavigate={handleNavigate} />}
            {activeStep === 'refine' && <RefineStep onNavigate={handleNavigate} />}
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

function OutcomeNudge({ onNavigate }: { onNavigate: (step: string) => void }) {
  const locale = useLocale();
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  const [staleCount, setStaleCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const loops = getStorage<RefineLoop[]>(STORAGE_KEYS.REFINE_LOOPS, []);
    const outcomes = getStorage<OutcomeRecord[]>(STORAGE_KEYS.OUTCOME_RECORDS, []);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const stale = loops.filter(l =>
      l.status !== 'active' &&
      new Date(l.updated_at) < twoWeeksAgo &&
      !outcomes.some(o => o.project_id === l.project_id)
    );
    setStaleCount(stale.length);
  }, []);

  if (staleCount === 0 || dismissed) return null;

  return (
    <div className="relative max-w-4xl mx-auto px-4 md:px-6 lg:px-8 mt-3">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[var(--checkpoint)] border border-[var(--risk-manageable)]/20">
        <div className="flex items-center gap-2 text-[12px]">
          <Clock size={13} className="text-[var(--risk-manageable)] shrink-0" />
          <span className="text-[var(--text-primary)]">
            {locale === 'ko' ? <>{staleCount}개 프로젝트 결과 기록 가능 ·{' '}<button onClick={() => onNavigate('refine')} className="text-[var(--accent)] font-semibold underline cursor-pointer">기록하기</button></> : <>{staleCount} project(s) ready for outcome recording ·{' '}<button onClick={() => onNavigate('refine')} className="text-[var(--accent)] font-semibold underline cursor-pointer">Record</button></>}
          </span>
        </div>
        <button onClick={() => setDismissed(true)} className="shrink-0 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] cursor-pointer">
          <X size={13} />
        </button>
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

'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWorkspaceStore, type StepId } from '@/stores/useWorkspaceStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { useProgressiveStore } from '@/stores/useProgressiveStore';
import { ReframeStep } from '@/components/workspace/ReframeStep';
import { RecastStep } from '@/components/workspace/RecastStep';
import { RehearseStep } from '@/components/workspace/RehearseStep';
import { RefineStep } from '@/components/workspace/RefineStep';
import { ProgressiveFlow } from '@/components/workspace/progressive/ProgressiveFlow';
import { WorkerPanel, WorkerDrawer, useWorkers } from '@/components/workspace/progressive/WorkerPanel';
import { QuickChatBar } from '@/components/workspace/QuickChatBar';
import { ConcertmasterStrip } from '@/components/workspace/ConcertmasterStrip';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { playTransitionTone, resumeAudioContext } from '@/lib/audio';
import { runInitialAnalysis } from '@/lib/progressive-engine';
import { Sparkles, Clock, X, ChevronRight, MessageSquare, Sliders, UserCheck, RefreshCw, FolderOpen, ChevronDown } from 'lucide-react';
import { getStorage, STORAGE_KEYS } from '@/lib/storage';
import type { RefineLoop, OutcomeRecord } from '@/stores/types';
import { track } from '@/lib/analytics';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { StaffLines, CrescendoHairpin, TrebleClef } from '@/components/ui/MusicalElements';
import { useHandoffStore } from '@/stores/useHandoffStore';

/* ─── Progressive Layout: flow + worker panel ─── */
function ProgressiveLayout({ projectId, projectName, onReset }: { projectId: string; projectName?: string; onReset: () => void }) {
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
            새 프로젝트
          </button>
        </div>

        {/* Desktop: flex layout with worker panel */}
        <div className="flex">
          {hasWorkers && (
            <div className="hidden lg:block w-[320px] shrink-0 sticky top-14 h-[calc(100vh-120px)] overflow-y-auto border-r border-[var(--border-subtle)]/50">
              <WorkerPanel />
            </div>
          )}
          <div className="flex-1 px-4 md:px-6">
            <ProgressiveFlow projectId={projectId} />
          </div>
        </div>

        {/* Mobile: bottom drawer */}
        {hasWorkers && <WorkerDrawer className="lg:hidden" />}
      </div>
    </div>
  );
}

/* ─── Step metadata ─── */
const STEPS: { id: StepId; number: string; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  { id: 'reframe', number: '01', label: '문제 재정의', desc: '숨겨진 전제 발견', icon: <MessageSquare size={16} />, color: '#2d4a7c' },
  { id: 'recast',  number: '02', label: '실행 설계',   desc: '구조와 역할 배분', icon: <Sliders size={16} />,        color: '#8b6914' },
  { id: 'rehearse',number: '03', label: '사전 검증',   desc: '판단자 시뮬레이션', icon: <UserCheck size={16} />,      color: '#6b4c9a' },
  { id: 'refine',  number: '04', label: '수정 반영',   desc: '피드백 수렴',       icon: <RefreshCw size={16} />,      color: '#2d6b2d' },
];

function WorkspaceContent() {
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
  const useLegacyMode = explicitStep && ['reframe', 'recast', 'rehearse', 'refine'].includes(explicitStep);

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
      // Auto-trigger after a tick to let stores load
      setTimeout(() => {
        const text = queryProblem.trim();
        if (!text) return;
        setIsStarting(true);
        setStartError(null);
        const pid = createProject(text.slice(0, 40));
        setCurrentProjectId(pid);
        track('project_created', { source: 'hero_inline' });
        progressiveStore.createSession(pid, text);
        runInitialAnalysis(text).then(result => {
          progressiveStore.addSnapshot(result.snapshot);
          if (result.detectedDM) progressiveStore.setDecisionMaker(result.detectedDM);
          progressiveStore.addQuestion(result.question);
          progressiveStore.setPhase('conversing');
        }).catch(err => {
          const sid = progressiveStore.currentSessionId;
          if (sid) progressiveStore.deleteSession(sid);
          setCurrentProjectId(null);
          setStartError(err instanceof Error ? err.message : '분석에 실패했습니다.');
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
    progressiveStore.createSession(pid, text);

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
      const sid = progressiveStore.currentSessionId;
      if (sid) progressiveStore.deleteSession(sid);
      setCurrentProjectId(null);
      const raw = err instanceof Error ? err.message : '';
      const errMsg = raw.includes('fetch') || raw.includes('network') || raw.includes('Failed to fetch')
        ? '인터넷 연결을 확인해주세요.'
        : raw.includes('rate') || raw.includes('limit') || raw.includes('429')
        ? '오늘의 분석 횟수를 모두 사용했습니다. 내일 다시 시도해주세요.'
        : raw.includes('too long') || raw.includes('token')
        ? '입력이 너무 깁니다. 핵심만 간결하게 입력해주세요.'
        : raw || '분석에 실패했습니다. 다시 시도해주세요.';
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

  /* ─── Empty state: Hero-matching welcome ─── */
  if (!currentProjectId) {
    return (
      <div className="relative min-h-[calc(100vh-56px)] overflow-hidden">
        {/* Concert hall atmosphere */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--gradient-concert-hall)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--gradient-warm-vignette)' }} />
        <StaffLines opacity={0.03} spacing={14} />

        <div className="relative max-w-2xl mx-auto px-5 md:px-6 pt-12 md:pt-24 pb-16">
          {/* Anonymous trial banner */}
          {!user && (
            <div className="mb-8 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[var(--accent)]/8 border border-[var(--accent)]/15">
              <div className="flex items-center gap-2 text-[13px]">
                <Sparkles size={14} className="text-[var(--accent)] shrink-0" />
                <span className="text-[var(--text-primary)]">
                  로그인 없이 <strong>1회 무료 체험</strong> · 로그인하면 하루 2회
                </span>
              </div>
              <Link
                href="/login"
                className="shrink-0 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--bg)] text-[12px] font-semibold hover:shadow-[var(--shadow-sm)] transition-all"
              >
                로그인
              </Link>
            </div>
          )}

          {/* Heading */}
          <div className="phrase-entrance text-center mb-10">
            <h1 className="text-display-lg text-[var(--text-primary)]">
              무엇을 <span className="text-gold-gradient">고민</span>하고 있나요?
            </h1>
            <p className="mt-3 text-[14px] md:text-[15px] text-[var(--text-secondary)] leading-relaxed">
              질문 하나 던지면, 30초 안에 뼈대가 나옵니다.
            </p>
          </div>

          {/* Input card — hero-matching */}
          <div className="phrase-entrance" style={{ animationDelay: '150ms' }}>
            <div className="relative rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[var(--shadow-lg)] overflow-hidden">
              <div className="h-[2px] w-full" style={{ background: 'var(--gradient-gold)' }} />

              <div className="p-5 md:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-section-label text-[var(--text-tertiary)]">고민 입력</span>
                </div>

                <textarea
                  value={problemInput}
                  onChange={(e) => setProblemInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleStartWithProblem();
                    }
                  }}
                  placeholder="예: 나는 개발자인데 갑자기 대표님이 2주일 안에 기획안을 짜오라고 했어"
                  rows={3}
                  className="w-full px-4 py-3.5 rounded-xl bg-[var(--bg)] border border-[var(--border-subtle)] text-[15px] md:text-[17px] text-[var(--text-primary)] leading-relaxed resize-none focus:outline-none focus:border-[var(--accent)]/40 transition-colors placeholder:text-[var(--text-tertiary)]"
                  autoFocus
                />

                <details className="mb-2 group">
                  <summary className="text-[11px] text-[var(--text-tertiary)] cursor-pointer hover:text-[var(--accent)] transition-colors select-none">
                    이렇게 쓰면 더 정확합니다 ↓
                  </summary>
                  <div className="mt-2 px-3 py-2.5 rounded-lg bg-[var(--bg)] text-[11px] text-[var(--text-secondary)] leading-relaxed space-y-1">
                    <p><strong className="text-[var(--text-primary)]">좋은 예:</strong> &quot;나는 마케팅 팀장인데, CEO가 3개월 신제품 론칭 전략을 요청했다. 시장 조사도 안 했고 팀도 작다.&quot;</p>
                    <p><strong className="text-[var(--text-primary)]">포인트:</strong> 역할 + 상황 + 제약조건이 있으면 분석이 정확해집니다.</p>
                  </div>
                </details>

                {startError && (
                  <div className="mb-3 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700 flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">⚠</span>
                    <span>{startError}</span>
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-subtle)]">
                  <p className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="opacity-40 shrink-0"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 6.3-4 4a.7.7 0 0 1-1 0l-2-2a.7.7 0 1 1 1-1L7 8.8l3.5-3.5a.7.7 0 1 1 1 1z"/></svg>
                    인지과학 + 전략기획 실무 기반
                  </p>
                  <button
                    onClick={handleStartWithProblem}
                    disabled={!problemInput.trim() || isStarting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-full text-[14px] font-semibold shadow-[var(--shadow-sm)] hover:shadow-[var(--glow-gold-intense)] hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 disabled:opacity-40 cursor-pointer"
                    style={{ background: 'var(--gradient-gold)' }}
                  >
                    {isStarting ? '분석 중... (약 30초)' : '시작하기'}
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* How it works — mini version of ProcessFlow */}
          <div className="mt-12 phrase-entrance" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center justify-center gap-6 md:gap-8 text-center">
              {STEPS.slice(0, 3).map((step, i) => (
                <div key={step.id} className="flex items-center gap-4 md:gap-6">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-bold"
                      style={{ backgroundColor: `${step.color}12`, color: step.color }}
                    >
                      {step.number}
                    </div>
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)]">{step.label}</span>
                  </div>
                  {i < 2 && (
                    <CrescendoHairpin width={20} height={8} color="var(--accent)" className="opacity-30 mt-[-12px]" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Existing projects */}
          {projects.length > 0 && (
            <div className="mt-12 phrase-entrance" style={{ animationDelay: '400ms' }}>
              <p className="text-section-label text-[var(--text-tertiary)] text-center mb-3">이전 프로젝트</p>
              <div className="space-y-2 max-w-sm mx-auto">
                {projects.slice(0, 5).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setCurrentProjectId(p.id)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--accent)]/30 hover:shadow-[var(--shadow-sm)] text-[13px] font-medium text-[var(--text-primary)] cursor-pointer transition-all"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Treble clef watermark */}
        <div className="absolute bottom-8 right-8 pointer-events-none hidden md:block">
          <TrebleClef size={100} color="var(--accent)" opacity={0.03} />
        </div>
      </div>
    );
  }

  /* ─── Progressive Flow: default for new sessions ─── */
  if (progressiveSession && !useLegacyMode) {
    // Ensure store knows which session is active (idempotent)
    if (progressiveStore.currentSessionId !== progressiveSession.id) {
      // Safe: Zustand setState outside render is synchronous and doesn't cause re-render loops
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
                      + 새 프로젝트
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
                    <span className="hidden sm:inline">{step.label}</span>
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
                  로그인 없이 <strong>3회 무료</strong> · <Link href="/login" className="text-[var(--accent)] font-semibold underline">로그인</Link>하면 하루 5회
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Outcome nudge */}
        <OutcomeNudge onNavigate={handleNavigate} />

        {/* Step component */}
        <div className="relative p-4 md:p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in" key={activeStep}>
          {activeStep === 'reframe' && <ReframeStep onNavigate={handleNavigate} />}
          {activeStep === 'recast' && <RecastStep onNavigate={handleNavigate} />}
          {activeStep === 'rehearse' && <RehearseStep onNavigate={handleNavigate} />}
          {activeStep === 'refine' && <RefineStep onNavigate={handleNavigate} />}
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
              <span className="text-[10px] font-semibold">{step.label.slice(0, 2)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function OutcomeNudge({ onNavigate }: { onNavigate: (step: string) => void }) {
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
            {staleCount}개 프로젝트 결과 기록 가능 ·{' '}
            <button onClick={() => onNavigate('refine')} className="text-[var(--accent)] font-semibold underline cursor-pointer">기록하기</button>
          </span>
        </div>
        <button onClick={() => setDismissed(true)} className="shrink-0 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] cursor-pointer">
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense>
      <WorkspaceContent />
    </Suspense>
  );
}

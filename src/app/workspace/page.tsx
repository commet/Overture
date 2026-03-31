'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWorkspaceStore, type StepId } from '@/stores/useWorkspaceStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { ReframeStep } from '@/components/workspace/ReframeStep';
import { RecastStep } from '@/components/workspace/RecastStep';
import { RehearseStep } from '@/components/workspace/RehearseStep';
import { RefineStep } from '@/components/workspace/RefineStep';
import { QuickChatBar } from '@/components/workspace/QuickChatBar';
import { ConcertmasterStrip } from '@/components/workspace/ConcertmasterStrip';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { playTransitionTone, resumeAudioContext } from '@/lib/audio';
import { Sparkles, Clock, X, ChevronRight, MessageSquare, Sliders, UserCheck, RefreshCw, FolderOpen, ChevronDown } from 'lucide-react';
import { getStorage, STORAGE_KEYS } from '@/lib/storage';
import type { RefineLoop, OutcomeRecord } from '@/stores/types';
import { track } from '@/lib/analytics';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { StaffLines, CrescendoHairpin, TrebleClef } from '@/components/ui/MusicalElements';
import { useHandoffStore } from '@/stores/useHandoffStore';

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
  const [problemInput, setProblemInput] = useState('');
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);

  useEffect(() => {
    loadProjects();
    loadSettings();
  }, [loadProjects, loadSettings]);

  useEffect(() => {
    const step = searchParams.get('step') as StepId | null;
    if (step && ['reframe', 'recast', 'rehearse', 'refine'].includes(step)) {
      setActiveStep(step);
    }
  }, [searchParams, setActiveStep]);

  const handleNavigate = (step: string) => {
    const stepId = step.replace('/tools/', '') as StepId;
    setActiveStep(stepId);
    window.history.pushState(null, '', `/workspace?step=${stepId}`);
    if (settings.audio_enabled) {
      resumeAudioContext();
      playTransitionTone(settings.audio_volume);
    }
  };

  const handleStartWithProblem = () => {
    if (!problemInput.trim()) return;
    const text = problemInput.trim();
    const pid = createProject(text.slice(0, 40));
    setCurrentProjectId(pid);
    // Pass the problem text to ReframeStep via handoff
    setHandoff({ from: 'workspace', data: { initialText: text } });
    setActiveStep('reframe');
    track('project_created', { source: 'workspace_hero' });
  };

  const currentProject = currentProjectId ? projects.find(p => p.id === currentProjectId) : null;

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
                  로그인 없이 <strong>3회 무료</strong> · 로그인하면 하루 5회
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

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border-subtle)]">
                  <p className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="opacity-40 shrink-0"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 6.3-4 4a.7.7 0 0 1-1 0l-2-2a.7.7 0 1 1 1-1L7 8.8l3.5-3.5a.7.7 0 1 1 1 1z"/></svg>
                    인지과학 + 전략기획 실무 기반
                  </p>
                  <button
                    onClick={handleStartWithProblem}
                    disabled={!problemInput.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-full text-[14px] font-semibold shadow-[var(--shadow-sm)] hover:shadow-[var(--glow-gold-intense)] hover:-translate-y-[1px] active:translate-y-0 transition-all duration-200 disabled:opacity-40 cursor-pointer"
                    style={{ background: 'var(--gradient-gold)' }}
                  >
                    시작하기
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

  /* ─── Active workspace: step content ─── */
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

'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWorkspaceStore, type StepId } from '@/stores/useWorkspaceStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { WorkspaceSidebar } from '@/components/workspace/WorkspaceSidebar';
import { DecomposeStep } from '@/components/workspace/DecomposeStep';
import { OrchestrateStep } from '@/components/workspace/OrchestrateStep';
import { PersonaFeedbackStep } from '@/components/workspace/PersonaFeedbackStep';
import { RefinementLoopStep } from '@/components/workspace/RefinementLoopStep';
import { QuickChatBar } from '@/components/workspace/QuickChatBar';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { playTransitionTone, resumeAudioContext } from '@/lib/audio';
import { Menu } from 'lucide-react';

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const { activeStep, setActiveStep, sidebarOpen, toggleSidebar } = useWorkspaceStore();
  const { projects, currentProjectId, setCurrentProjectId, createProject, loadProjects } = useProjectStore();
  const { settings, loadSettings } = useSettingsStore();

  useEffect(() => {
    loadProjects();
    loadSettings();
  }, [loadProjects, loadSettings]);

  // Sync URL params with store
  useEffect(() => {
    const step = searchParams.get('step') as StepId | null;
    if (step && ['decompose', 'orchestrate', 'persona-feedback', 'refinement-loop'].includes(step)) {
      setActiveStep(step);
    }
  }, [searchParams, setActiveStep]);

  const handleNavigate = (step: string) => {
    const stepId = step.replace('/tools/', '') as StepId;
    setActiveStep(stepId);
    window.history.pushState(null, '', `/workspace?step=${stepId}`);
    // Audio feedback on step transition
    if (settings.audio_enabled) {
      resumeAudioContext();
      playTransitionTone(settings.audio_volume);
    }
  };

  const stepLabels: Record<StepId, string> = {
    'decompose': '악보 해석 | 문제 재정의',
    'orchestrate': '편곡 | 실행 설계',
    'persona-feedback': '리허설 | 사전 검증',
    'refinement-loop': '합주 연습 | 피드백 반영',
  };

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Sidebar - desktop */}
      {sidebarOpen && (
        <div className="hidden lg:block shrink-0">
          <WorkspaceSidebar
            activeStep={activeStep}
            onStepClick={(step) => handleNavigate(step)}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-2 px-4 py-2 border-b border-[var(--border)] bg-[var(--surface)]">
          <button onClick={toggleSidebar} className="p-1 cursor-pointer">
            <Menu size={18} />
          </button>
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">
            {stepLabels[activeStep]}
          </span>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto">
          {/* No project — show creation */}
          {!currentProjectId && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <h2 className="text-[20px] font-bold text-[var(--text-primary)] mb-2">새 프로젝트 시작</h2>
                <p className="text-[13px] text-[var(--text-secondary)] mb-6">
                  프로젝트를 만들면 악보 해석부터 리허설까지 하나의 흐름으로 진행합니다.
                </p>
                <div className="space-y-3 max-w-sm mx-auto">
                  <input
                    type="text"
                    placeholder="프로젝트 이름 (예: 동남아 진출 전략)"
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-3 text-[14px] focus:outline-none focus:border-[var(--accent)]"
                    id="new-project-name"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('new-project-name') as HTMLInputElement;
                      if (input?.value.trim()) {
                        const pid = createProject(input.value.trim());
                        setCurrentProjectId(pid);
                      }
                    }}
                    className="w-full px-4 py-3 rounded-lg bg-[var(--accent)] text-white font-medium text-[14px] hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    프로젝트 시작
                  </button>
                </div>
                {projects.length > 0 && (
                  <div className="mt-8">
                    <p className="text-[11px] text-[var(--text-secondary)] mb-3">또는 기존 프로젝트 선택</p>
                    <div className="space-y-2">
                      {projects.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setCurrentProjectId(p.id)}
                          className="w-full text-left px-4 py-2.5 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] text-[13px] font-medium text-[var(--text-primary)] cursor-pointer transition-colors"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentProjectId && (
            <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in" key={activeStep}>
              {activeStep === 'decompose' && <DecomposeStep onNavigate={handleNavigate} />}
              {activeStep === 'orchestrate' && <OrchestrateStep onNavigate={handleNavigate} />}
              {activeStep === 'persona-feedback' && <PersonaFeedbackStep onNavigate={handleNavigate} />}
              {activeStep === 'refinement-loop' && <RefinementLoopStep onNavigate={handleNavigate} />}
            </div>
          )}
        </div>

        {/* Quick chat bar */}
        <QuickChatBar activeStep={activeStep} onNavigate={handleNavigate} />
      </div>

      {/* Mobile bottom tab bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--surface)] border-t border-[var(--border)] flex items-center justify-around px-1 py-2 z-40">
        {(['decompose', 'orchestrate', 'persona-feedback', 'refinement-loop'] as StepId[]).map((step) => {
          const icons: Record<string, React.ReactNode> = {
            'decompose': <span className="text-[18px]">🎼</span>,
            'orchestrate': <span className="text-[18px]">🎹</span>,
            'persona-feedback': <span className="text-[18px]">🎭</span>,
            'refinement-loop': <span className="text-[18px]">🔄</span>,
          };
          const labels: Record<string, string> = {
            'decompose': '해석',
            'orchestrate': '편곡',
            'persona-feedback': '리허설',
            'refinement-loop': '합주',
          };
          return (
            <button
              key={step}
              onClick={() => handleNavigate(step)}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[52px] min-h-[44px] px-2 py-1.5 rounded-xl cursor-pointer transition-colors ${
                activeStep === step
                  ? 'text-[var(--accent)] bg-[var(--ai)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              {icons[step]}
              <span className="text-[10px] font-semibold">{labels[step]}</span>
            </button>
          );
        })}
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

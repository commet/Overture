'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { WorkspaceSidebar } from '@/components/workspace/WorkspaceSidebar';
import { DecomposeStep } from '@/components/workspace/DecomposeStep';
import { OrchestrateStep } from '@/components/workspace/OrchestrateStep';
import { SynthesizeStep } from '@/components/workspace/SynthesizeStep';
import { PersonaFeedbackStep } from '@/components/workspace/PersonaFeedbackStep';
import { RefinementLoopStep } from '@/components/workspace/RefinementLoopStep';
import { Menu } from 'lucide-react';

type StepId = 'decompose' | 'orchestrate' | 'synthesize' | 'persona-feedback' | 'refinement-loop';

function WorkspaceContent() {
  const searchParams = useSearchParams();
  const { activeStep, setActiveStep, sidebarOpen, toggleSidebar } = useWorkspaceStore();

  // Sync URL params with store
  useEffect(() => {
    const step = searchParams.get('step') as StepId | null;
    if (step && ['decompose', 'orchestrate', 'synthesize', 'persona-feedback', 'refinement-loop'].includes(step)) {
      setActiveStep(step);
    }
  }, [searchParams, setActiveStep]);

  const handleNavigate = (step: string) => {
    const stepId = step.replace('/tools/', '') as StepId;
    setActiveStep(stepId);
    // Update URL without full navigation
    window.history.pushState(null, '', `/workspace?step=${stepId}`);
  };

  const stepLabels: Record<StepId, string> = {
    'decompose': '주제 파악',
    'orchestrate': '역할 편성',
    'synthesize': '조율',
    'persona-feedback': '리허설',
    'refinement-loop': '정제 루프',
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
      <div className="flex-1 overflow-y-auto">
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
        <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in" key={activeStep}>
          {activeStep === 'decompose' && <DecomposeStep onNavigate={handleNavigate} />}
          {activeStep === 'orchestrate' && <OrchestrateStep onNavigate={handleNavigate} />}
          {activeStep === 'synthesize' && <SynthesizeStep onNavigate={handleNavigate} />}
          {activeStep === 'persona-feedback' && <PersonaFeedbackStep onNavigate={handleNavigate} />}
          {activeStep === 'refinement-loop' && <RefinementLoopStep onNavigate={handleNavigate} />}
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--surface)] border-t border-[var(--border)] flex items-center justify-around px-2 py-1.5 z-40">
        {(['decompose', 'orchestrate', 'synthesize', 'persona-feedback'] as StepId[]).map((step) => {
          const icons: Record<string, React.ReactNode> = {
            'decompose': <span className="text-[16px]">🔍</span>,
            'orchestrate': <span className="text-[16px]">🗺</span>,
            'synthesize': <span className="text-[16px]">⚖️</span>,
            'persona-feedback': <span className="text-[16px]">👥</span>,
          };
          const labels: Record<string, string> = {
            'decompose': '주제',
            'orchestrate': '역할',
            'synthesize': '조율',
            'persona-feedback': '리허설',
          };
          return (
            <button
              key={step}
              onClick={() => handleNavigate(step)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg cursor-pointer transition-colors ${
                activeStep === step ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
              }`}
            >
              {icons[step]}
              <span className="text-[9px] font-semibold">{labels[step]}</span>
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

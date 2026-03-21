'use client';

import { useDecomposeStore } from '@/stores/useDecomposeStore';
import { useOrchestrateStore } from '@/stores/useOrchestrateStore';
import { usePersonaStore } from '@/stores/usePersonaStore';
import { useRefinementStore } from '@/stores/useRefinementStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { Layers, Map, Users, RefreshCw, Check } from 'lucide-react';
import { useEffect } from 'react';
import type { StepId } from '@/stores/useWorkspaceStore';

interface ProcessStepsProps {
  activeStep: StepId;
  onStepClick: (step: StepId) => void;
}

interface StepInfo {
  id: StepId;
  number: number;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const steps: StepInfo[] = [
  { id: 'decompose', number: 1, label: '악보 해석', icon: <Layers size={16} />, color: 'text-[#2d4a7c]', bgColor: 'bg-[var(--ai)]' },
  { id: 'orchestrate', number: 2, label: '편곡', icon: <Map size={16} />, color: 'text-[#8b6914]', bgColor: 'bg-[var(--human)]' },
  { id: 'persona-feedback', number: 3, label: '리허설', icon: <Users size={16} />, color: 'text-purple-700', bgColor: 'bg-purple-50' },
  { id: 'refinement-loop', number: 4, label: '합주 연습', icon: <RefreshCw size={16} />, color: 'text-[#2d6b2d]', bgColor: 'bg-[var(--collab)]' },
];

export function ProcessSteps({ activeStep, onStepClick }: ProcessStepsProps) {
  const { items: decomposeItems, loadItems: loadDecompose } = useDecomposeStore();
  const { items: orchestrateItems, loadItems: loadOrchestrate } = useOrchestrateStore();
  const { feedbackHistory, loadData: loadPersona } = usePersonaStore();
  const { loops, loadLoops } = useRefinementStore();
  const { currentProjectId } = useProjectStore();

  useEffect(() => {
    loadDecompose();
    loadOrchestrate();
    loadPersona();
    loadLoops();
  }, [loadDecompose, loadOrchestrate, loadPersona, loadLoops]);

  const getStatus = (stepId: StepId): 'done' | 'in-progress' | 'not-started' => {
    const pid = currentProjectId;
    switch (stepId) {
      case 'decompose': {
        const items = pid ? decomposeItems.filter(d => d.project_id === pid) : decomposeItems;
        const latest = items[items.length - 1];
        return latest?.status === 'done' ? 'done' : latest ? 'in-progress' : 'not-started';
      }
      case 'orchestrate': {
        const items = pid ? orchestrateItems.filter(o => o.project_id === pid) : orchestrateItems;
        const latest = items[items.length - 1];
        return latest?.status === 'done' ? 'done' : latest ? 'in-progress' : 'not-started';
      }
      case 'persona-feedback': {
        const items = pid ? feedbackHistory.filter(f => f.project_id === pid) : feedbackHistory;
        return items.length > 0 ? 'done' : 'not-started';
      }
      case 'refinement-loop': {
        const projectLoops = pid ? loops.filter(l => l.project_id === pid) : loops;
        const convergedLoop = projectLoops.find(l => l.status === 'converged');
        const activeLoop = projectLoops.find(l => l.status === 'active');
        return convergedLoop ? 'done' : activeLoop ? 'in-progress' : 'not-started';
      }
      default:
        return 'not-started';
    }
  };

  const activeLoops = loops.filter(l => l.status === 'active');

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider px-2 mb-2">
        Process
      </p>
      {steps.map((step, i) => {
        const status = getStatus(step.id);
        const isActive = activeStep === step.id;

        return (
          <div key={step.id}>
            {/* Connector line */}
            {i > 0 && (
              <div className="flex justify-center">
                <div className={`w-0.5 h-2 ${status !== 'not-started' || getStatus(steps[i-1].id) !== 'not-started' ? 'bg-[var(--accent)]/30' : 'bg-[var(--border)]'}`} />
              </div>
            )}
            <button
              onClick={() => onStepClick(step.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer ${
                isActive
                  ? 'bg-[var(--surface)] shadow-sm border border-[var(--accent)]/30'
                  : 'hover:bg-[var(--surface)]/60'
              }`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                status === 'done'
                  ? 'bg-[var(--collab)] text-[var(--success)]'
                  : isActive
                  ? `${step.bgColor} ${step.color}`
                  : 'bg-[var(--bg)] text-[var(--text-secondary)]'
              }`}>
                {status === 'done' ? <Check size={14} /> : step.icon}
              </div>
              <div className="min-w-0">
                <p className={`text-[12px] font-semibold truncate ${
                  isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                }`}>
                  {step.label}
                </p>
              </div>
            </button>
          </div>
        );
      })}

      {/* Active loop info */}
      {activeLoops.length > 0 && activeStep === 'refinement-loop' && (
        <div className="px-3 pt-1 text-[10px] text-[var(--text-secondary)]">
          {activeLoops[0].iterations.length}회 반복 · 위협 {activeLoops[0].iterations[activeLoops[0].iterations.length - 1]?.convergence?.critical_risks ?? '?'}건
        </div>
      )}
    </div>
  );
}

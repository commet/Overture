'use client';

import { useReframeStore } from '@/stores/useReframeStore';
import { useRecastStore } from '@/stores/useRecastStore';
import { usePersonaStore } from '@/stores/usePersonaStore';
import { useRefineStore } from '@/stores/useRefineStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { MessageSquare, Sliders, UserCheck, RefreshCw, Check } from 'lucide-react';
import { CrescendoHairpin } from '@/components/ui/MusicalElements';
import { useEffect } from 'react';
import type { StepId } from '@/stores/useWorkspaceStore';

interface ProcessStepsProps {
  activeStep: StepId;
  onStepClick: (step: StepId) => void;
}

interface StepInfo {
  id: StepId;
  number: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const steps: StepInfo[] = [
  { id: 'reframe',  number: '01', label: '문제 재정의', icon: <MessageSquare size={14} />, color: '#2d4a7c' },
  { id: 'recast',   number: '02', label: '실행 설계',   icon: <Sliders size={14} />,        color: '#8b6914' },
  { id: 'rehearse',  number: '03', label: '사전 검증',   icon: <UserCheck size={14} />,      color: '#6b4c9a' },
  { id: 'refine',   number: '04', label: '수정 반영',   icon: <RefreshCw size={14} />,      color: '#2d6b2d' },
];

export function ProcessSteps({ activeStep, onStepClick }: ProcessStepsProps) {
  const { items: reframeItems, loadItems: loadReframe } = useReframeStore();
  const { items: recastItems, loadItems: loadRecast } = useRecastStore();
  const { feedbackHistory, loadData: loadPersona } = usePersonaStore();
  const { loops, loadLoops } = useRefineStore();
  const { currentProjectId } = useProjectStore();

  useEffect(() => {
    loadReframe();
    loadRecast();
    loadPersona();
    loadLoops();
  }, [loadReframe, loadRecast, loadPersona, loadLoops]);

  const getStatus = (stepId: StepId): 'done' | 'in-progress' | 'not-started' => {
    const pid = currentProjectId;
    switch (stepId) {
      case 'reframe': {
        const items = pid ? reframeItems.filter(d => d.project_id === pid) : reframeItems;
        const latest = items[items.length - 1];
        return latest?.status === 'done' ? 'done' : latest ? 'in-progress' : 'not-started';
      }
      case 'recast': {
        const items = pid ? recastItems.filter(o => o.project_id === pid) : recastItems;
        const latest = items[items.length - 1];
        return latest?.status === 'done' ? 'done' : latest ? 'in-progress' : 'not-started';
      }
      case 'rehearse': {
        const items = pid ? feedbackHistory.filter(f => f.project_id === pid) : feedbackHistory;
        return items.length > 0 ? 'done' : 'not-started';
      }
      case 'refine': {
        const projectLoops = pid ? loops.filter(l => l.project_id === pid) : loops;
        const convergedLoop = projectLoops.find(l => l.status === 'converged');
        const activeLoop = projectLoops.find(l => l.status === 'active');
        return convergedLoop ? 'done' : activeLoop ? 'in-progress' : 'not-started';
      }
      default:
        return 'not-started';
    }
  };

  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider px-2 mb-2">
        Process
      </p>
      {steps.map((step, i) => {
        const status = getStatus(step.id);
        const isActive = activeStep === step.id;

        return (
          <div key={step.id}>
            {/* Connector */}
            {i > 0 && (
              <div className="flex justify-center py-0.5">
                <CrescendoHairpin width={12} height={6} color={`${step.color}30`} className="rotate-90" />
              </div>
            )}
            <button
              onClick={() => onStepClick(step.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer ${
                isActive
                  ? 'bg-[var(--surface)] shadow-[var(--shadow-xs)] border border-[var(--accent)]/20'
                  : 'hover:bg-[var(--surface)]/60'
              }`}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200"
                style={{
                  backgroundColor: status === 'done'
                    ? 'var(--collab)'
                    : isActive
                    ? `${step.color}12`
                    : 'var(--bg)',
                  color: status === 'done'
                    ? 'var(--success)'
                    : isActive
                    ? step.color
                    : 'var(--text-tertiary)',
                }}
              >
                {status === 'done' ? <Check size={13} /> : step.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-[12px] font-semibold truncate ${
                  isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                }`}>
                  {step.label}
                </p>
              </div>
              {status === 'in-progress' && (
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

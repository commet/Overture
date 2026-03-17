'use client';

import { useEffect } from 'react';
import { ProcessSteps } from './ProcessSteps';
import { usePersonaStore } from '@/stores/usePersonaStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { User, FolderOpen } from 'lucide-react';

type StepId = 'decompose' | 'orchestrate' | 'synthesize' | 'persona-feedback' | 'refinement-loop';

interface WorkspaceSidebarProps {
  activeStep: StepId;
  onStepClick: (step: StepId) => void;
}

export function WorkspaceSidebar({ activeStep, onStepClick }: WorkspaceSidebarProps) {
  const { personas, loadData } = usePersonaStore();
  const { projects, currentProjectId, loadProjects } = useProjectStore();

  useEffect(() => {
    loadData();
    loadProjects();
  }, [loadData, loadProjects]);

  const currentProject = currentProjectId ? projects.find(p => p.id === currentProjectId) : null;

  return (
    <aside className="w-60 bg-[var(--bg)] border-r border-[var(--border)] flex flex-col h-full overflow-y-auto">
      {/* Project name */}
      {currentProject && (
        <div className="px-3 pt-4 pb-2">
          <div className="flex items-center gap-2 text-[var(--accent)]">
            <FolderOpen size={12} />
            <span className="text-[10px] font-bold uppercase tracking-wider">프로젝트</span>
          </div>
          <p className="text-[13px] font-semibold text-[var(--text-primary)] mt-1 truncate">
            {currentProject.name}
          </p>
        </div>
      )}

      {/* Process steps */}
      <div className="px-2 py-3">
        <ProcessSteps activeStep={activeStep} onStepClick={onStepClick} />
      </div>

      {/* Personas */}
      <div className="px-3 py-2 border-t border-[var(--border)]">
        <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
          페르소나
        </p>
        {personas.length === 0 ? (
          <button
            onClick={() => onStepClick('persona-feedback')}
            className="w-full text-left text-[11px] text-[var(--text-secondary)] hover:text-[var(--accent)] cursor-pointer py-1"
          >
            + 페르소나 추가...
          </button>
        ) : (
          <div className="space-y-1">
            {personas.slice(0, 5).map((p) => (
              <button
                key={p.id}
                onClick={() => onStepClick('persona-feedback')}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-[var(--surface)] transition-colors cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shrink-0">
                  <User size={10} className="text-[var(--text-secondary)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-[var(--text-primary)] truncate">{p.name}</p>
                  <p className="text-[9px] text-[var(--text-secondary)] truncate">{p.role}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Output formats */}
      {currentProject && (
        <div className="px-3 py-2 border-t border-[var(--border)] mt-auto">
          <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            Output
          </p>
          <div className="grid grid-cols-2 gap-1">
            {['📄 브리프', '💬 체인', '⚙️ Spec', '📋 리스트'].map((label, i) => (
              <button
                key={i}
                className="px-2 py-1.5 rounded-md text-[10px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)] transition-colors cursor-pointer border border-[var(--border)]"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

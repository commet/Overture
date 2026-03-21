'use client';

import { useEffect, useState } from 'react';
import { ProcessSteps } from './ProcessSteps';
import { usePersonaStore } from '@/stores/usePersonaStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { generateProjectBrief } from '@/lib/project-brief';
import { generatePromptChain } from '@/lib/prompt-chain';
import { generateAgentSpec } from '@/lib/agent-spec';
import { generateChecklist } from '@/lib/checklist';
import { generateDecisionRationale } from '@/lib/decision-rationale';
import { hasContent } from '@/lib/output-helpers';
import type { Project } from '@/stores/types';
import type { StepId } from '@/stores/useWorkspaceStore';
import { User, FolderOpen, FileText, MessageSquare, Code, CheckSquare, Scale } from 'lucide-react';

interface WorkspaceSidebarProps {
  activeStep: StepId;
  onStepClick: (step: StepId) => void;
}

const outputFormats = [
  { key: 'brief', icon: <FileText size={12} />, label: '브리프', gen: generateProjectBrief },
  { key: 'chain', icon: <MessageSquare size={12} />, label: '체인', gen: generatePromptChain },
  { key: 'spec', icon: <Code size={12} />, label: 'Spec', gen: generateAgentSpec },
  { key: 'checklist', icon: <CheckSquare size={12} />, label: '리스트', gen: generateChecklist },
  { key: 'rationale', icon: <Scale size={12} />, label: '근거서', gen: generateDecisionRationale },
];

export function WorkspaceSidebar({ activeStep, onStepClick }: WorkspaceSidebarProps) {
  const { personas, loadData } = usePersonaStore();
  const { projects, currentProjectId, loadProjects } = useProjectStore();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [emptyKey, setEmptyKey] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    loadProjects();
  }, [loadData, loadProjects]);

  const currentProject = currentProjectId ? (projects.find(p => p.id === currentProjectId) ?? null) : null;

  const handleOutputCopy = async (key: string, gen: (p: Project | null) => string) => {
    try {
      const text = gen(currentProject ?? null);
      if (!hasContent(text)) {
        setEmptyKey(key);
        setTimeout(() => setEmptyKey(null), 2000);
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setEmptyKey(key);
      setTimeout(() => setEmptyKey(null), 2000);
    }
  };

  return (
    <aside className="w-60 bg-[var(--bg)] border-r border-[var(--border)] flex flex-col h-full overflow-y-auto">
      {/* Project name */}
      {currentProject && (
        <div className="px-3 pt-4 pb-2">
          <div className="flex items-center gap-2 text-[var(--accent)]">
            <FolderOpen size={12} />
            <span className="text-[11px] font-bold uppercase tracking-wider">프로젝트</span>
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
        <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
          페르소나
        </p>
        {personas.length === 0 ? (
          <button
            onClick={() => onStepClick('persona-feedback')}
            className="w-full text-left text-[12px] text-[var(--text-secondary)] hover:text-[var(--accent)] cursor-pointer py-1"
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
                  <p className="text-[12px] font-medium text-[var(--text-primary)] truncate">{p.name}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] truncate">{p.role}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Output formats — always visible */}
      <div className="px-3 py-2 border-t border-[var(--border)] mt-auto">
        <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
          Output
        </p>
        {!currentProject && (
          <p className="text-[10px] text-[var(--text-tertiary)] mb-2 leading-relaxed">
            프로젝트를 만들면 맥락이 연결된 Output을 생성합니다
          </p>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          {outputFormats.map((fmt) => (
            <button
              key={fmt.key}
              onClick={() => handleOutputCopy(fmt.key, fmt.gen)}
              className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-[12px] font-medium transition-colors cursor-pointer border min-h-[36px] ${
                copiedKey === fmt.key
                  ? 'border-[var(--success)] bg-[var(--collab)] text-[var(--success)]'
                  : emptyKey === fmt.key
                  ? 'border-amber-400 bg-amber-50 text-amber-700'
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]'
              }`}
            >
              {fmt.icon}
              {copiedKey === fmt.key ? '복사됨!' : emptyKey === fmt.key ? '데이터 없음' : fmt.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

'use client';

import { useState } from 'react';
import { Button } from './Button';
import { CopyButton } from './CopyButton';
import { FileText, MessageSquare, Code, CheckSquare, Download } from 'lucide-react';
import type { Project } from '@/stores/types';
import { generateProjectBrief } from '@/lib/project-brief';
import { generatePromptChain } from '@/lib/prompt-chain';
import { generateAgentSpec } from '@/lib/agent-spec';
import { generateChecklist } from '@/lib/checklist';

interface OutputSelectorProps {
  project: Project;
}

interface OutputFormat {
  key: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  generator: (project: Project) => string;
  fileExt: string;
}

const formats: OutputFormat[] = [
  {
    key: 'brief',
    icon: <FileText size={18} />,
    label: '프로그램 노트 · Project Brief',
    description: '경영진이나 팀에 공유하는 의사결정 기록.',
    generator: generateProjectBrief,
    fileExt: 'md',
  },
  {
    key: 'prompt-chain',
    icon: <MessageSquare size={18} />,
    label: '파트보 · Prompt Chain',
    description: 'Claude/ChatGPT에 순서대로 입력할 프롬프트 세트.',
    generator: generatePromptChain,
    fileExt: 'md',
  },
  {
    key: 'agent-spec',
    icon: <Code size={18} />,
    label: '총보 · Agent Spec',
    description: 'LangGraph/CrewAI 구현의 출발점이 되는 설계서.',
    generator: generateAgentSpec,
    fileExt: 'yaml',
  },
  {
    key: 'checklist',
    icon: <CheckSquare size={18} />,
    label: '셋리스트 · Execution Checklist',
    description: '각 단계를 하나씩 확인하며 실행하는 체크리스트.',
    generator: generateChecklist,
    fileExt: 'md',
  },
];

export function OutputSelector({ project }: OutputSelectorProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<string>('');

  const handleSelect = (format: OutputFormat) => {
    if (selectedKey === format.key) {
      setSelectedKey(null);
      setPreview('');
    } else {
      setSelectedKey(format.key);
      setPreview(format.generator(project));
    }
  };

  const selectedFormat = formats.find((f) => f.key === selectedKey);

  const handleDownload = () => {
    if (!selectedFormat || !preview) return;
    const blob = new Blob([preview], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}-${selectedFormat.key}.${selectedFormat.fileExt}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-[14px] font-bold text-[var(--text-primary)]">공연 — 산출물 선택</h3>
      <p className="text-[12px] text-[var(--text-secondary)]">같은 서곡에서 무대 위 목적에 맞는 형식으로 내보냅니다.</p>

      <div className="grid grid-cols-2 gap-2">
        {formats.map((format) => (
          <button
            key={format.key}
            onClick={() => handleSelect(format)}
            className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
              selectedKey === format.key
                ? 'border-[var(--accent)] bg-[var(--ai)] shadow-sm'
                : 'border-[var(--border)] hover:border-[var(--accent)]'
            }`}
          >
            <div className={`mt-0.5 shrink-0 ${selectedKey === format.key ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}>
              {format.icon}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">{format.label}</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{format.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Preview */}
      {selectedKey && preview && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold text-[var(--text-secondary)]">미리보기</span>
            <div className="flex gap-2">
              <CopyButton getText={() => preview} label="복사" />
              <Button variant="secondary" size="sm" onClick={handleDownload}>
                <Download size={12} /> 다운로드
              </Button>
            </div>
          </div>
          <pre className="bg-[#1a1a2e] text-[#e2e4ea] rounded-xl p-4 text-[12px] leading-relaxed overflow-x-auto max-h-[400px] overflow-y-auto font-mono">
            {preview}
          </pre>
        </div>
      )}
    </div>
  );
}

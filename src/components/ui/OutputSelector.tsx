'use client';

import { useState } from 'react';
import { Button } from './Button';
import { CopyButton } from './CopyButton';
import { FileText, MessageSquare, Code, CheckSquare, Download, ChevronDown, ChevronUp } from 'lucide-react';
import type { Project, MetaReflection } from '@/stores/types';
import { useProjectStore } from '@/stores/useProjectStore';
import { Field } from './Field';
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
  const [codaOpen, setCodaOpen] = useState(false);
  const [codaForm, setCodaForm] = useState<MetaReflection>({
    understanding_change: project.meta_reflection?.understanding_change || '',
    surprising_discovery: project.meta_reflection?.surprising_discovery || '',
    next_time_differently: project.meta_reflection?.next_time_differently || '',
    created_at: project.meta_reflection?.created_at || '',
  });
  const [codaSaved, setCodaSaved] = useState(!!project.meta_reflection);
  const { updateProject } = useProjectStore();

  const handleSaveCoda = () => {
    updateProject(project.id, {
      meta_reflection: {
        ...codaForm,
        created_at: new Date().toISOString(),
      },
    });
    setCodaSaved(true);
  };

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

      {/* Coda: 공연 후 성찰 */}
      <div className="border-t border-[var(--border-subtle)] pt-4 mt-4">
        <button
          onClick={() => setCodaOpen(!codaOpen)}
          className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors w-full"
        >
          {codaOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          코다 · 되돌아보기
          {codaSaved && <span className="text-[10px] text-[var(--success)] font-medium ml-1">저장됨</span>}
        </button>
        {codaOpen && (
          <div className="mt-4 space-y-4 animate-fade-in">
            <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
              공연이 끝났습니다. 이 과정을 되돌아보는 것은 다음 무대를 위한 가장 좋은 준비입니다.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-semibold text-[var(--text-primary)] block mb-1">
                  1. 처음 악보를 받았을 때의 이해와 지금의 이해가 어떻게 달라졌습니까?
                </label>
                <Field
                  value={codaForm.understanding_change || ''}
                  onChange={(e) => setCodaForm(prev => ({ ...prev, understanding_change: e.target.value }))}
                  rows={2}
                  placeholder="처음에는 단순한 과제라고 생각했지만..."
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[var(--text-primary)] block mb-1">
                  2. 이 과정에서 가장 놀라운 발견은 무엇이었습니까?
                </label>
                <Field
                  value={codaForm.surprising_discovery || ''}
                  onChange={(e) => setCodaForm(prev => ({ ...prev, surprising_discovery: e.target.value }))}
                  rows={2}
                  placeholder="예상하지 못했던 리스크나 새로운 관점..."
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[var(--text-primary)] block mb-1">
                  3. 다음에 비슷한 과제를 만나면 무엇을 다르게 하겠습니까?
                </label>
                <Field
                  value={codaForm.next_time_differently || ''}
                  onChange={(e) => setCodaForm(prev => ({ ...prev, next_time_differently: e.target.value }))}
                  rows={2}
                  placeholder="이해관계자를 더 일찍 참여시키거나..."
                />
              </div>
              <Button size="sm" onClick={handleSaveCoda}>
                {codaSaved ? '업데이트' : '성찰 저장'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

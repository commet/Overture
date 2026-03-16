'use client';

import { useState } from 'react';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { PersonaCard } from './PersonaCard';
import type { Persona } from '@/stores/types';
import { Send, Loader2, Upload } from 'lucide-react';

interface FeedbackRequestProps {
  personas: Persona[];
  onSubmit: (data: {
    documentTitle: string;
    documentText: string;
    personaIds: string[];
    perspective: string;
    intensity: string;
  }) => void;
  loading?: boolean;
}

const perspectives = ['전반적 인상', '논리 구조', '실행 가능성', '리스크', '숫자/데이터'];
const intensities = ['부드럽게', '솔직하게', '까다롭게'];

export function FeedbackRequest({ personas, onSubmit, loading }: FeedbackRequestProps) {
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentText, setDocumentText] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [perspective, setPerspective] = useState('전반적 인상');
  const [intensity, setIntensity] = useState('솔직하게');

  const togglePersona = (id: string, selected: boolean) => {
    if (selected && selectedIds.length < 3) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((pid) => pid !== id));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setDocumentText(text);
      if (!documentTitle) setDocumentTitle(file.name.replace(/\.(txt|md)$/, ''));
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-1">피드백 받을 자료를 입력하세요</h3>
        <p className="text-[12px] text-[var(--text-secondary)]">보고서, 기획서, 제안서 등의 내용을 붙여넣거나 파일을 업로드하세요.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <input type="text" value={documentTitle} onChange={(e) => setDocumentTitle(e.target.value)}
          placeholder="자료 제목 (선택사항)"
          className="bg-[#fafbfc] border-[1.5px] border-[var(--border)] rounded-[10px] px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[var(--accent)]" />
      </div>
      <Field placeholder="자료 내용을 붙여넣으세요..." value={documentText}
        onChange={(e) => setDocumentText(e.target.value)} rows={8} />
      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[var(--border)] text-[13px] text-[var(--text-secondary)] hover:border-[var(--accent)] cursor-pointer">
        <Upload size={14} /> .txt / .md 파일 업로드
        <input type="file" accept=".txt,.md" onChange={handleFileUpload} className="hidden" />
      </label>

      <div>
        <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-1">누구의 시점에서 피드백을 받을까요?</h3>
        <p className="text-[12px] text-[var(--text-secondary)] mb-3">최대 3명까지 선택 ({selectedIds.length}/3)</p>
        {personas.length === 0 ? (
          <p className="text-[14px] text-[var(--text-secondary)] py-4 text-center">먼저 페르소나를 등록해주세요.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {personas.map((p) => (
              <PersonaCard key={p.id} persona={p} onClick={() => {}} selectable
                selected={selectedIds.includes(p.id)} onSelect={(sel) => togglePersona(p.id, sel)} />
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-[13px] font-semibold mb-2">피드백 관점</h4>
          <div className="flex flex-wrap gap-2">
            {perspectives.map((p) => (
              <button key={p} onClick={() => setPerspective(p)}
                className={`px-3 py-1.5 rounded-lg text-[13px] border transition-colors cursor-pointer ${
                  perspective === p ? 'border-[var(--accent)] bg-[var(--ai)]' : 'border-[var(--border)] text-[var(--text-secondary)]'
                }`}>{p}</button>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-[13px] font-semibold mb-2">피드백 강도</h4>
          <div className="flex flex-wrap gap-2">
            {intensities.map((item) => (
              <button key={item} onClick={() => setIntensity(item)}
                className={`px-3 py-1.5 rounded-lg text-[13px] border transition-colors cursor-pointer ${
                  intensity === item ? 'border-[var(--accent)] bg-[var(--ai)]' : 'border-[var(--border)] text-[var(--text-secondary)]'
                }`}>{item}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => onSubmit({ documentTitle, documentText, personaIds: selectedIds, perspective, intensity })}
          disabled={!documentText.trim() || selectedIds.length === 0 || loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {loading ? '피드백 생성 중...' : '피드백 받기'}
        </Button>
      </div>
    </div>
  );
}

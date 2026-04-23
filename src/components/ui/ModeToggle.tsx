'use client';

import { Pencil, MessageCircle } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';

export type InputMode = 'direct' | 'interview';

interface ModeToggleProps {
  mode: InputMode;
  onChange: (mode: InputMode) => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  const locale = useLocale();
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  return (
    <div className="flex items-center gap-1 p-1 bg-[var(--bg)] rounded-lg border border-[var(--border)] w-fit">
      <button
        onClick={() => onChange('direct')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all cursor-pointer ${
          mode === 'direct'
            ? 'bg-[var(--primary)] text-[var(--bg)] shadow-sm'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
      >
        <Pencil size={12} />
        {L('직접', 'Direct')}
      </button>
      <button
        onClick={() => onChange('interview')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all cursor-pointer ${
          mode === 'interview'
            ? 'bg-[var(--primary)] text-[var(--bg)] shadow-sm'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
      >
        <MessageCircle size={12} />
        {L('대화형', 'Interview')}
      </button>
    </div>
  );
}

'use client';

import { Pencil, MessageCircle } from 'lucide-react';

export type InputMode = 'direct' | 'interview';

interface ModeToggleProps {
  mode: InputMode;
  onChange: (mode: InputMode) => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-[var(--bg)] rounded-lg border border-[var(--border)] w-fit">
      <button
        onClick={() => onChange('direct')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all cursor-pointer ${
          mode === 'direct'
            ? 'bg-[var(--primary)] text-white shadow-sm'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
      >
        <Pencil size={12} />
        직접
      </button>
      <button
        onClick={() => onChange('interview')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all cursor-pointer ${
          mode === 'interview'
            ? 'bg-[var(--primary)] text-white shadow-sm'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
      >
        <MessageCircle size={12} />
        대화형
      </button>
    </div>
  );
}

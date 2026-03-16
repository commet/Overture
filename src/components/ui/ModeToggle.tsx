'use client';

import { Zap, SlidersHorizontal } from 'lucide-react';

interface ModeToggleProps {
  mode: 'auto' | 'guided';
  onChange: (mode: 'auto' | 'guided') => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-[var(--bg)] rounded-lg border border-[var(--border)] w-fit">
      <button
        onClick={() => onChange('auto')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all cursor-pointer ${
          mode === 'auto'
            ? 'bg-[var(--primary)] text-white shadow-sm'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
      >
        <Zap size={12} />
        Auto
      </button>
      <button
        onClick={() => onChange('guided')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all cursor-pointer ${
          mode === 'guided'
            ? 'bg-[var(--primary)] text-white shadow-sm'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
      >
        <SlidersHorizontal size={12} />
        Guided
      </button>
    </div>
  );
}

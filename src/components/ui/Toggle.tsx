'use client';

import { useState, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface ToggleProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function Toggle({ title, defaultOpen = false, children }: ToggleProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-[14px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg)] transition-colors cursor-pointer"
      >
        {title}
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

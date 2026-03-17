'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-[var(--primary)]/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--surface)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-lg mx-4 max-h-[85vh] overflow-auto animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <h2 className="text-[16px] font-bold text-[var(--text-primary)]">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--bg)] rounded-[var(--radius-sm)] transition-colors cursor-pointer">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

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
      const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
      document.addEventListener('keydown', handleEsc);
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEsc);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div
        className="absolute inset-0 backdrop-blur-md"
        style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.50) 100%)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-[var(--surface)] rounded-[20px] shadow-[var(--shadow-xl)] border border-[var(--border-subtle)] w-full max-w-lg mx-4 max-h-[85vh] overflow-hidden animate-fade-in">
        <div className="h-[2px] w-full" style={{ background: 'var(--gradient-gold)' }} />
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <h2 id="modal-title" className="text-[16px] font-bold text-[var(--text-primary)]">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--bg)] rounded-lg transition-colors cursor-pointer">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-60px)]">{children}</div>
      </div>
    </div>
  );
}

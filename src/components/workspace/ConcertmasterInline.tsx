'use client';

import { useMemo } from 'react';
import { Music2 } from 'lucide-react';
import { getStepCoaching, buildConcertmasterProfile } from '@/lib/concertmaster';
import type { CoachingStep } from '@/lib/concertmaster';

interface ConcertmasterInlineProps {
  step: CoachingStep;
}

export function ConcertmasterInline({ step }: ConcertmasterInlineProps) {
  const coaching = useMemo(() => {
    const profile = buildConcertmasterProfile();
    return getStepCoaching(step, profile);
  }, [step]);

  if (!coaching) return null;

  // Short tip → pill style, long coaching → card style
  const isLong = !!coaching.detail;

  if (!isLong) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--gold-muted)] text-[12px] text-[var(--gold)]">
        <Music2 size={11} />
        <span>{coaching.message}</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--gold)]/20 bg-[var(--gold-muted)] p-3">
      <div className="flex items-start gap-2">
        <Music2 size={13} className="text-[var(--gold)] mt-0.5 shrink-0" />
        <div>
          <p className="text-[12px] font-medium text-[var(--text-primary)]">{coaching.message}</p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{coaching.detail}</p>
        </div>
      </div>
    </div>
  );
}

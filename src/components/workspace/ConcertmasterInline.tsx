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

  // Tone-based styling
  const tone = coaching.tone || 'neutral';
  const toneStyles = {
    neutral: { bg: 'bg-[var(--gold-muted)]', border: 'border-[var(--gold)]/20', icon: 'text-[var(--gold)]', pill: 'bg-[var(--gold-muted)] text-[var(--gold)]' },
    positive: { bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', icon: 'text-emerald-500', pill: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    counterfactual: { bg: 'bg-blue-500/5', border: 'border-blue-500/20', icon: 'text-blue-500', pill: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  };
  const s = toneStyles[tone];

  // Short tip → pill style, long coaching → card style
  const isLong = !!coaching.detail;

  if (!isLong) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] ${s.pill}`}>
        <Music2 size={11} />
        <span>{coaching.message}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border ${s.border} ${s.bg} p-3`}>
      <div className="flex items-start gap-2">
        <Music2 size={13} className={`${s.icon} mt-0.5 shrink-0`} />
        <div>
          <p className="text-[12px] font-medium text-[var(--text-primary)]">{coaching.message}</p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{coaching.detail}</p>
        </div>
      </div>
    </div>
  );
}

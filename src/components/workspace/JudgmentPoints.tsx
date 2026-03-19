'use client';

import { Card } from '@/components/ui/Card';
import { Flag, Scale } from 'lucide-react';
import type { OrchestrateStep } from '@/stores/types';

interface JudgmentPointsProps {
  steps: OrchestrateStep[];
}

export function JudgmentPoints({ steps }: JudgmentPointsProps) {
  const hasJudgmentSteps = steps.some(s => s.checkpoint || (s.judgment && s.judgment.trim()));
  if (!hasJudgmentSteps) return null;

  return (
    <Card className="!bg-[var(--human)]">
      <h4 className="text-[13px] font-bold text-[#8b6914] mb-3">지휘자의 판단 포인트</h4>
      <div className="space-y-2">
        {steps.map((step, i) => {
          if (step.checkpoint) {
            return (
              <div key={i} className="flex items-start gap-2 text-[12px] !border-l-4 !border-l-[var(--human)] pl-3 py-1">
                <Flag size={12} className="text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">Step {i + 1}: {step.task}</p>
                  <p className="text-amber-700 mt-0.5">{step.checkpoint_reason}</p>
                </div>
              </div>
            );
          }
          if (step.judgment && step.judgment.trim()) {
            return (
              <div key={i} className="flex items-start gap-2 text-[12px] !border-l-4 !border-l-[var(--human)] pl-3 py-1">
                <Scale size={12} className="text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">Step {i + 1}: {step.task}</p>
                  <p className="text-amber-700 mt-0.5">{step.judgment}</p>
                </div>
              </div>
            );
          }
          return null;
        })}
      </div>
    </Card>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Loader2, Check } from 'lucide-react';

interface LoadingStepsProps {
  steps: string[];
  intervalMs?: number;
}

export function LoadingSteps({ steps, intervalMs = 2500 }: LoadingStepsProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }, intervalMs);
    return () => clearInterval(interval);
  }, [steps.length, intervalMs]);

  return (
    <div className="py-8 max-w-sm mx-auto">
      <div className="space-y-3">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 transition-all duration-300 ${
              i < currentStep ? 'opacity-50' : i === currentStep ? 'opacity-100' : 'opacity-30'
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
              i < currentStep
                ? 'bg-[var(--success)] text-white'
                : i === currentStep
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--border)] text-[var(--text-secondary)]'
            }`}>
              {i < currentStep ? (
                <Check size={12} />
              ) : i === currentStep ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <span className="text-[10px] font-bold">{i + 1}</span>
              )}
            </div>
            <span className={`text-[13px] ${
              i === currentStep ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
            }`}>
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

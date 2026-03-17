'use client';

import { useState } from 'react';
import { Button } from './Button';
import { Sparkles, ChevronLeft } from 'lucide-react';

interface EntryOption {
  value: string;
  label: string;
  emoji: string;
  description?: string;
}

interface EntryStep {
  key: string;
  question: string;
  options: EntryOption[];
}

interface StepEntryProps {
  steps: EntryStep[];
  textLabel: string;
  textPlaceholder: string;
  textHint?: string;
  submitLabel?: string;
  onSubmit: (selections: Record<string, string>, text: string) => void;
  disabled?: boolean;
}

export function StepEntry({
  steps,
  textLabel,
  textPlaceholder,
  textHint,
  submitLabel = 'AI 분석 시작',
  onSubmit,
  disabled,
}: StepEntryProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [text, setText] = useState('');

  const isLastStep = currentStep >= steps.length;
  const currentEntryStep = steps[currentStep];

  const handleSelect = (stepKey: string, value: string) => {
    setSelections((prev) => ({ ...prev, [stepKey]: value }));
    // Auto-advance to next step
    setTimeout(() => setCurrentStep((prev) => prev + 1), 200);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(selections, text);
  };

  // Build dynamic placeholder based on selections
  const dynamicPlaceholder = () => {
    const parts: string[] = [];
    for (const step of steps) {
      const selected = selections[step.key];
      if (selected) {
        const option = step.options.find((o) => o.value === selected);
        if (option) parts.push(option.label);
      }
    }
    if (parts.length > 0) {
      return `${parts.join(' · ')} 관련: ${textPlaceholder}`;
    }
    return textPlaceholder;
  };

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="flex items-center gap-1.5">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all ${
              i < currentStep ? 'w-6 bg-[var(--accent)]' : i === currentStep ? 'w-6 bg-[var(--accent)]/50' : 'w-3 bg-[var(--border)]'
            }`}
          />
        ))}
        <div className={`h-1 rounded-full transition-all ${isLastStep ? 'w-6 bg-[var(--accent)]/50' : 'w-3 bg-[var(--border)]'}`} />
      </div>

      {/* Card selection steps */}
      {!isLastStep && currentEntryStep && (
        <div className="animate-fade-in" key={currentStep}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-bold text-[var(--text-primary)]">
              {currentEntryStep.question}
            </h3>
            {currentStep > 0 && (
              <button onClick={handleBack} className="flex items-center gap-1 text-[12px] text-[var(--accent)] cursor-pointer hover:underline">
                <ChevronLeft size={12} /> 이전
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {currentEntryStep.options.map((option) => {
              const isSelected = selections[currentEntryStep.key] === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleSelect(currentEntryStep.key, option.value)}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[var(--accent)] bg-[var(--ai)] shadow-sm'
                      : 'border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--ai)]/30'
                  }`}
                >
                  <span className="text-[20px] mt-0.5">{option.emoji}</span>
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--text-primary)]">{option.label}</p>
                    {option.description && (
                      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{option.description}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected chips summary */}
          {Object.keys(selections).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {steps.map((step) => {
                const val = selections[step.key];
                if (!val) return null;
                const opt = step.options.find((o) => o.value === val);
                return (
                  <span
                    key={step.key}
                    className="px-2 py-0.5 rounded-full bg-[var(--ai)] text-[#2d4a7c] text-[10px] font-semibold"
                  >
                    {opt?.emoji} {opt?.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Text input (final step) */}
      {isLastStep && (
        <div className="animate-fade-in space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-[var(--text-primary)]">{textLabel}</h3>
            <button onClick={handleBack} className="flex items-center gap-1 text-[12px] text-[var(--accent)] cursor-pointer hover:underline">
              <ChevronLeft size={12} /> 이전
            </button>
          </div>

          {/* Selected context summary */}
          {Object.keys(selections).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {steps.map((step) => {
                const val = selections[step.key];
                if (!val) return null;
                const opt = step.options.find((o) => o.value === val);
                return (
                  <span key={step.key} className="px-2 py-0.5 rounded-full bg-[var(--ai)] text-[#2d4a7c] text-[10px] font-semibold">
                    {opt?.emoji} {opt?.label}
                  </span>
                );
              })}
            </div>
          )}

          {textHint && <p className="text-[11px] text-[var(--text-secondary)]">{textHint}</p>}

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={dynamicPlaceholder()}
            className="w-full bg-[#fafbfc] border-[1.5px] border-[var(--border)] rounded-[10px] px-4 py-3 text-[15px] leading-[1.7] placeholder:text-[var(--text-secondary)] placeholder:text-[14px] focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,109,204,0.08)] resize-none"
            rows={3}
          />

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={!text.trim() || disabled}>
              <Sparkles size={14} /> {submitLabel}
            </Button>
          </div>
        </div>
      )}

      {/* Skip to text option */}
      {!isLastStep && (
        <button
          onClick={() => setCurrentStep(steps.length)}
          className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--accent)] cursor-pointer transition-colors"
        >
          바로 입력하기 →
        </button>
      )}
    </div>
  );
}

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
  locked?: boolean;
  unlockMessage?: string;
}

interface StepEntryProps {
  steps: EntryStep[];
  textLabel: string;
  textPlaceholder: string;
  textHint?: string;
  submitLabel?: string;
  onSubmit: (selections: Record<string, string>, text: string) => void;
  disabled?: boolean;
  initialText?: string;
  contextPanel?: React.ReactNode;
}

export function StepEntry({
  steps,
  textLabel,
  textPlaceholder,
  textHint,
  submitLabel = 'AI 분석 시작',
  onSubmit,
  disabled,
  initialText,
  contextPanel,
}: StepEntryProps) {
  const [currentStep, setCurrentStep] = useState(initialText ? steps.length : 0);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [text, setText] = useState(initialText || '');

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
    // Text is optional if card selections provide enough context
    if (!text.trim() && Object.keys(selections).length === 0) return;
    onSubmit(selections, text);
  };

  // Build dynamic placeholder with concrete examples
  const dynamicPlaceholder = () => {
    const examples = [
      textPlaceholder,
      '예: 2주 안에 경영진에게 보고해야 하는 시장 분석',
      '예: 고객사가 요청한 AI 도입 제안서 준비',
      '예: 팀 내 반복되는 프로세스 비효율을 해결하고 싶음',
    ];
    // Pick a relevant example based on selection
    const origin = selections['origin'];
    if (origin === 'top-down') return '예: 동남아 시장 진출 전략을 2주 안에 수립하여 보고 / AI 기반 고객 서비스 자동화 방안 검토 지시 / 내년도 사업계획서 초안 작성';
    if (origin === 'external') return '예: 고객사 AI 챗봇 도입 제안서 요청 / 파트너사 공동 마케팅 캠페인 기획 / 외부 투자자 대상 사업 설명 자료 준비';
    if (origin === 'self') return '예: 팀 내 온보딩 프로세스 개선 / 반복 업무 자동화 도입 검토 / 신규 서비스 MVP 방향성 정리';
    if (origin === 'fire') return '예: 주요 고객 이탈 조짐에 대한 긴급 대응 / 경쟁사 신제품 출시에 따른 전략 재검토 / 서비스 장애 후 재발 방지 대책 수립';
    return examples[0];
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

          {/* Locked step */}
          {currentEntryStep.locked ? (
            <div className="text-center py-10 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg)]">
              <span className="text-[32px]">🔒</span>
              <p className="text-[15px] text-[var(--text-secondary)] mt-3 font-medium">
                {currentEntryStep.unlockMessage || '아직 열리지 않은 질문입니다'}
              </p>
              <button
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="mt-4 text-[14px] font-semibold text-[var(--accent)] hover:underline cursor-pointer"
              >
                건너뛰기 →
              </button>
            </div>
          ) : (
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
          )}

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
          {contextPanel}
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-[var(--text-primary)]">{textLabel}</h3>
            <button onClick={handleBack} className="flex items-center gap-1 text-[12px] text-[var(--accent)] cursor-pointer hover:underline">
              <ChevronLeft size={12} /> 이전
            </button>
          </div>

          {/* Selected context — compact inline pills + note */}
          {Object.keys(selections).length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-[var(--text-tertiary)] font-medium mr-0.5">자동 반영:</span>
              {steps.map((step) => {
                const val = selections[step.key];
                if (!val || step.locked) return null;
                const opt = step.options.find((o) => o.value === val);
                if (!opt) return null;
                return (
                  <span key={step.key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--ai)] text-[11px] text-[#2d4a7c] font-medium">
                    {opt.emoji} {opt.label}
                  </span>
                );
              })}
            </div>
          )}

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={dynamicPlaceholder()}
            className="w-full bg-[var(--bg)] border-[1.5px] border-[var(--border)] rounded-[10px] px-4 py-3 text-[15px] leading-[1.7] placeholder:text-[var(--text-secondary)] placeholder:text-[14px] focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,109,204,0.08)] resize-none"
            rows={3}
          />

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={(!text.trim() && Object.keys(selections).length === 0) || disabled}>
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

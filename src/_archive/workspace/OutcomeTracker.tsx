'use client';

/**
 * Outcome Tracker — Validation Chain의 사용자 접점.
 *
 * 프로젝트 완료 후 결과를 기록하는 UI.
 * 3-button quick entry → 구조화된 폼 → 리스크 체크리스트.
 *
 * 체인: outcome-tracker.ts (저장) → decision-quality.ts (상관 분석) → concertmaster (인사이트)
 */

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Check, ThumbsUp, ThumbsDown, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { saveOutcomeRecord, buildRiskChecklist } from '@/lib/outcome-tracker';
import { usePersonaStore } from '@/stores/usePersonaStore';
import type { MaterializedRisk, OutcomeRecord } from '@/stores/types';

interface OutcomeTrackerProps {
  projectId: string;
  projectName: string;
  onSaved?: (record: OutcomeRecord) => void;
}

type SuccessLevel = 'exceeded' | 'met' | 'partial' | 'failed';
type HypothesisResult = 'confirmed' | 'partially_confirmed' | 'refuted' | 'not_testable';

const SUCCESS_OPTIONS: { value: SuccessLevel; label: string; icon: typeof ThumbsUp; color: string }[] = [
  { value: 'exceeded', label: '기대 이상', icon: ThumbsUp, color: 'text-emerald-500' },
  { value: 'met', label: '기대 충족', icon: Check, color: 'text-blue-500' },
  { value: 'partial', label: '부분 성공', icon: HelpCircle, color: 'text-amber-500' },
  { value: 'failed', label: '실패', icon: ThumbsDown, color: 'text-red-500' },
];

const HYPOTHESIS_OPTIONS: { value: HypothesisResult; label: string }[] = [
  { value: 'confirmed', label: '가설 확인됨' },
  { value: 'partially_confirmed', label: '부분 확인' },
  { value: 'refuted', label: '가설 반박됨' },
  { value: 'not_testable', label: '검증 불가' },
];

export function OutcomeTracker({ projectId, projectName, onSaved }: OutcomeTrackerProps) {
  const { feedbackHistory, personas } = usePersonaStore();
  const [phase, setPhase] = useState<'quick' | 'detail' | 'done'>('quick');
  const [success, setSuccess] = useState<SuccessLevel | null>(null);
  const [hypothesis, setHypothesis] = useState<HypothesisResult>('not_testable');
  const [risks, setRisks] = useState<MaterializedRisk[]>(() => {
    const records = feedbackHistory.filter(f => f.project_id === projectId);
    return buildRiskChecklist(records);
  });
  const [showRisks, setShowRisks] = useState(false);
  const [keyLearnings, setKeyLearnings] = useState('');
  const [saved, setSaved] = useState(false);

  const toggleRisk = (index: number) => {
    setRisks(prev => prev.map((r, i) =>
      i === index ? { ...r, actually_happened: !r.actually_happened } : r
    ));
  };

  const handleQuickSave = (level: SuccessLevel) => {
    setSuccess(level);
    setPhase('detail');
  };

  const handleSave = () => {
    if (!success) return;

    const record = saveOutcomeRecord({
      project_id: projectId,
      hypothesis_result: hypothesis,
      hypothesis_notes: '',
      overall_success: success,
      materialized_risks: risks,
      approval_outcomes: [],
      key_learnings: keyLearnings,
      what_would_change: '',
    });

    setSaved(true);
    setPhase('done');
    onSaved?.(record);
  };

  if (phase === 'done' || saved) {
    return (
      <Card className="!p-4 border-emerald-500/20 bg-emerald-500/5">
        <div className="flex items-center gap-2">
          <Check size={16} className="text-emerald-500" />
          <span className="text-[13px] font-medium text-emerald-600 dark:text-emerald-400">
            결과가 기록되었습니다
          </span>
        </div>
        <p className="text-[11px] text-[var(--text-secondary)] mt-1">
          이 데이터는 DQ 점수와 비교되어 의사결정 프로세스의 효과를 검증합니다.
        </p>
      </Card>
    );
  }

  return (
    <Card className="!p-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface)]">
        <h4 className="text-[13px] font-bold text-[var(--text-primary)]">
          {projectName} — 결과 기록
        </h4>
        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
          실제 결과를 기록하면 판단 프로세스의 효과를 검증할 수 있습니다.
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Quick entry: 4 buttons */}
        {phase === 'quick' && (
          <div>
            <p className="text-[12px] font-medium text-[var(--text-primary)] mb-2">이 의사결정의 결과는?</p>
            <div className="grid grid-cols-2 gap-2">
              {SUCCESS_OPTIONS.map(opt => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleQuickSave(opt.value)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--border-subtle)] hover:border-[var(--border)] bg-[var(--bg)] cursor-pointer transition-colors"
                  >
                    <Icon size={14} className={opt.color} />
                    <span className="text-[12px] font-medium text-[var(--text-primary)]">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Detail phase */}
        {phase === 'detail' && (
          <>
            {/* Selected success level */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--ai)]">
              <Check size={12} className="text-[var(--accent)]" />
              <span className="text-[12px] font-medium text-[var(--text-primary)]">
                결과: {SUCCESS_OPTIONS.find(o => o.value === success)?.label}
              </span>
              <button
                onClick={() => setPhase('quick')}
                className="ml-auto text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                변경
              </button>
            </div>

            {/* Hypothesis result */}
            <div>
              <p className="text-[12px] font-medium text-[var(--text-primary)] mb-1.5">재정의한 가설은?</p>
              <div className="flex flex-wrap gap-1.5">
                {HYPOTHESIS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setHypothesis(opt.value)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-colors ${
                      hypothesis === opt.value
                        ? 'bg-[var(--accent)] text-[var(--bg)]'
                        : 'bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Risk checklist */}
            {risks.length > 0 && (
              <div>
                <button
                  onClick={() => setShowRisks(!showRisks)}
                  className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-primary)] cursor-pointer"
                >
                  {showRisks ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  리스크 체크리스트 ({risks.filter(r => r.actually_happened).length}/{risks.length})
                </button>
                {showRisks && (
                  <div className="mt-2 space-y-1.5">
                    {risks.map((risk, i) => {
                      const persona = personas.find(p => p.id === risk.persona_id);
                      return (
                        <label
                          key={i}
                          className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--surface)] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={risk.actually_happened}
                            onChange={() => toggleRisk(i)}
                            className="mt-0.5 accent-[var(--accent)]"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] text-[var(--text-primary)]">{risk.risk_text}</span>
                            <span className="text-[10px] text-[var(--text-tertiary)] ml-1">
                              — {persona?.name || '페르소나'} ({risk.category})
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Key learnings */}
            <div>
              <p className="text-[12px] font-medium text-[var(--text-primary)] mb-1">핵심 교훈 (선택)</p>
              <textarea
                value={keyLearnings}
                onChange={e => setKeyLearnings(e.target.value)}
                placeholder="이번 의사결정에서 배운 것..."
                className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg)] text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none focus:border-[var(--accent)]"
                rows={2}
              />
            </div>

            {/* Save */}
            <Button onClick={handleSave} className="w-full">
              결과 저장
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

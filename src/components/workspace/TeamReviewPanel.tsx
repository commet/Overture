'use client';

import { useEffect, useState } from 'react';
import { useTeamStore } from '@/stores/useTeamStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getCurrentUserId } from '@/lib/supabase';
import type { TeamReviewInput, HiddenAssumption, OrchestrateStep, KeyAssumption } from '@/stores/types';
import { Check, Eye, EyeOff, MessageCircle, Users, Send, AlertTriangle } from 'lucide-react';

/* ────────────────────────────────────
   Rating Dots — 1 to 5 scale
   ──────────────────────────────────── */

function RatingDots({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => !disabled && onChange(n)}
          disabled={disabled}
          className={`
            w-6 h-6 rounded-full border-2 text-[10px] font-bold
            transition-all duration-200
            ${disabled ? 'cursor-default' : 'cursor-pointer'}
            ${value && value >= n
              ? n <= 2 ? 'border-red-400 bg-red-400 text-white'
                : n <= 3 ? 'border-amber-400 bg-amber-400 text-white'
                : 'border-emerald-400 bg-emerald-400 text-white'
              : 'border-[var(--border)] text-[var(--text-tertiary)] hover:border-[var(--accent)]'
            }
          `}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

/* ────────────────────────────────────
   Review Item Card
   ──────────────────────────────────── */

function ReviewItemCard({
  label,
  sublabel,
  targetType,
  targetId,
  existingInput,
  onSubmit,
  disabled,
}: {
  label: string;
  sublabel?: string;
  targetType: string;
  targetId: string;
  existingInput?: TeamReviewInput;
  onSubmit: (data: { rating: number; comment: string; targetType: string; targetId: string }) => void;
  disabled?: boolean;
}) {
  const [rating, setRating] = useState<number | null>(existingInput?.rating || null);
  const [comment, setComment] = useState(existingInput?.comment || '');
  const [submitted, setSubmitted] = useState(!!existingInput);

  if (submitted && existingInput) {
    return (
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border-subtle)]">
        <Check size={14} className="text-[var(--success)] mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-[var(--text-primary)] font-medium">{label}</p>
          <div className="flex items-center gap-2 mt-1">
            <RatingDots value={existingInput.rating} onChange={() => {}} disabled />
            {existingInput.comment && (
              <p className="text-[12px] text-[var(--text-secondary)] truncate">{existingInput.comment}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-[var(--text-primary)] font-medium leading-snug">{label}</p>
          {sublabel && (
            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{sublabel}</p>
          )}
        </div>
        <RatingDots value={rating} onChange={setRating} disabled={disabled} />
      </div>
      {rating && (
        <div className="mt-2.5 flex gap-2 animate-fade-in">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="이유나 우려를 간단히... (선택)"
            className="flex-1 px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg)] text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && rating) {
                onSubmit({ rating, comment, targetType, targetId });
                setSubmitted(true);
              }
            }}
          />
          <button
            onClick={() => {
              if (rating) {
                onSubmit({ rating, comment, targetType, targetId });
                setSubmitted(true);
              }
            }}
            className="px-2.5 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--bg)] text-[11px] font-medium hover:shadow-[var(--shadow-sm)] hover:-translate-y-[1px] active:translate-y-0 transition-all cursor-pointer"
          >
            <Check size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────
   Revealed Results View
   ──────────────────────────────────── */

function RevealedResults({
  inputs,
  phase,
}: {
  inputs: TeamReviewInput[];
  phase: string;
}) {
  const phaseInputs = inputs.filter(i => i.phase === phase && i.visible);

  if (phaseInputs.length === 0) return null;

  // Group by target
  const grouped: Record<string, TeamReviewInput[]> = {};
  for (const input of phaseInputs) {
    const key = `${input.target_type}:${input.target_id || 'general'}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(input);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Eye size={14} className="text-[var(--accent)]" />
        <p className="text-[13px] font-semibold text-[var(--text-primary)]">팀 리뷰 결과</p>
        <Badge variant="ai">{phaseInputs.length}건</Badge>
      </div>

      {Object.entries(grouped).map(([key, items]) => {
        const avgRating = items.filter(i => i.rating).reduce((s, i) => s + (i.rating || 0), 0) / items.filter(i => i.rating).length;
        const hasDisagreement = items.some(i => i.rating && Math.abs((i.rating || 0) - avgRating) >= 2);

        return (
          <div key={key} className={`rounded-xl border p-3 ${hasDisagreement ? 'border-amber-300 bg-amber-50/30' : 'border-[var(--border-subtle)]'}`}>
            {hasDisagreement && (
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle size={12} className="text-amber-600" />
                <span className="text-[11px] font-semibold text-amber-700">의견 불일치</span>
              </div>
            )}
            <div className="space-y-1.5">
              {items.map((input) => (
                <div key={input.id} className="flex items-center gap-2 text-[12px]">
                  <div className="w-5 h-5 rounded-full bg-[var(--bg)] flex items-center justify-center text-[10px] font-bold text-[var(--text-tertiary)]">
                    {(input.user_name || input.user_id.slice(0, 1)).toUpperCase()}
                  </div>
                  <RatingDots value={input.rating} onChange={() => {}} disabled />
                  {input.comment && (
                    <span className="text-[var(--text-secondary)] truncate">{input.comment}</span>
                  )}
                </div>
              ))}
            </div>
            {items.length >= 2 && (
              <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)]">
                평균 {avgRating.toFixed(1)}/5
                {hasDisagreement && ' — 토론이 필요합니다'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────
   Main Panel
   ──────────────────────────────────── */

type ReviewableAssumption = { assumption: string; risk_if_false?: string; if_wrong?: string };

interface TeamReviewPanelProps {
  projectId: string;
  phase: 'decompose' | 'orchestrate' | 'rehearsal';
  // Items to review
  assumptions?: ReviewableAssumption[];
  steps?: OrchestrateStep[];
  risks?: { text: string; category: string }[];
}

export function TeamReviewPanel({
  projectId,
  phase,
  assumptions = [],
  steps = [],
  risks = [],
}: TeamReviewPanelProps) {
  const { reviewInputs, loadReviewInputs, submitReviewInput, revealInputs } = useTeamStore();
  const [userId, setUserId] = useState<string | null>(null);
  const [generalConcern, setGeneralConcern] = useState('');

  useEffect(() => {
    loadReviewInputs(projectId);
    getCurrentUserId().then(setUserId);
  }, [projectId, loadReviewInputs]);

  const phaseInputs = reviewInputs.filter(i => i.phase === phase);
  const myInputs = phaseInputs.filter(i => i.user_id === userId);
  const revealedInputs = phaseInputs.filter(i => i.visible);
  const isRevealed = revealedInputs.length > 0;

  const handleSubmitItem = async (data: { rating: number; comment: string; targetType: string; targetId: string }) => {
    if (!userId) return;
    await submitReviewInput({
      project_id: projectId,
      user_id: userId,
      phase,
      target_type: data.targetType as TeamReviewInput['target_type'],
      target_id: data.targetId,
      input_type: 'rating',
      rating: data.rating,
      comment: data.comment || null,
    });
  };

  const handleSubmitConcern = async () => {
    if (!userId || !generalConcern.trim()) return;
    await submitReviewInput({
      project_id: projectId,
      user_id: userId,
      phase,
      target_type: 'general',
      target_id: null,
      input_type: 'concern',
      rating: null,
      comment: generalConcern.trim(),
    });
    setGeneralConcern('');
  };

  const handleReveal = async () => {
    await revealInputs(projectId, phase);
  };

  // If revealed, show aggregated results
  if (isRevealed) {
    return (
      <Card>
        <RevealedResults inputs={reviewInputs} phase={phase} />
      </Card>
    );
  }

  const hasItems = assumptions.length > 0 || steps.length > 0 || risks.length > 0;
  if (!hasItems) return null;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-[var(--accent)]" />
          <h3 className="text-[14px] font-bold text-[var(--text-primary)]">팀 리뷰</h3>
        </div>
        <div className="flex items-center gap-2">
          {myInputs.length > 0 && (
            <span className="text-[11px] text-[var(--success)] font-medium">{myInputs.length}건 제출됨</span>
          )}
          <div className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)]">
            <EyeOff size={11} />
            <span>전원 제출 전 비공개</span>
          </div>
        </div>
      </div>

      <p className="text-[12px] text-[var(--text-secondary)] mb-4">
        각 항목에 대해 동의 정도를 평가하세요. 다른 팀원의 입력은 전원 제출 후 공개됩니다.
      </p>

      <div className="space-y-4">
        {/* 전제 평가 */}
        {assumptions.length > 0 && (
          <div>
            <p className="text-[12px] font-semibold text-amber-700 mb-2">
              {phase === 'decompose' ? '전제 평가' : '핵심 가정 평가'}
            </p>
            <p className="text-[11px] text-[var(--text-tertiary)] mb-2.5">
              1 = 거짓일 가능성 높음 / 5 = 확실히 맞음
            </p>
            <div className="space-y-2">
              {assumptions.map((a, i) => {
                const targetId = `assumption_${i}`;
                const existing = myInputs.find(inp => inp.target_id === targetId);
                const sublabel = a.risk_if_false ? `만약 아니라면: ${a.risk_if_false}` : a.if_wrong ? `틀리면: ${a.if_wrong}` : undefined;
                return (
                  <ReviewItemCard
                    key={i}
                    label={a.assumption}
                    sublabel={sublabel}
                    targetType="assumption"
                    targetId={targetId}
                    existingInput={existing}
                    onSubmit={handleSubmitItem}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* 워크플로우 step 평가 */}
        {steps.length > 0 && (
          <div>
            <p className="text-[12px] font-semibold text-[var(--accent)] mb-2">워크플로우 평가</p>
            <p className="text-[11px] text-[var(--text-tertiary)] mb-2.5">
              1 = 비현실적/불필요 / 5 = 적절함
            </p>
            <div className="space-y-2">
              {steps.map((step, i) => {
                const targetId = `step_${i}`;
                const existing = myInputs.find(inp => inp.target_id === targetId);
                return (
                  <ReviewItemCard
                    key={i}
                    label={`${i + 1}. ${step.task}`}
                    sublabel={step.expected_output ? `산출물: ${step.expected_output}` : undefined}
                    targetType="step"
                    targetId={targetId}
                    existingInput={existing}
                    onSubmit={handleSubmitItem}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* 추가 우려사항 */}
        <div className="pt-3 border-t border-[var(--border-subtle)]">
          <p className="text-[12px] font-semibold text-[var(--text-primary)] mb-2">추가 우려사항</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={generalConcern}
              onChange={(e) => setGeneralConcern(e.target.value)}
              placeholder="AI가 놓친 리스크나 관점이 있다면..."
              className="flex-1 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)]"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitConcern()}
            />
            <Button variant="secondary" size="sm" onClick={handleSubmitConcern} disabled={!generalConcern.trim()}>
              <MessageCircle size={12} /> 추가
            </Button>
          </div>
          {myInputs.filter(i => i.input_type === 'concern').map((concern) => (
            <div key={concern.id} className="flex items-center gap-2 mt-2 text-[12px] text-[var(--text-secondary)]">
              <Check size={12} className="text-[var(--success)]" />
              {concern.comment}
            </div>
          ))}
        </div>

        {/* 공개 버튼 (Driver만) */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <p className="text-[11px] text-[var(--text-tertiary)]">
            모든 팀원이 제출한 후 결과를 공개하세요.
          </p>
          <Button variant="secondary" size="sm" onClick={handleReveal}>
            <Eye size={12} /> 결과 공개
          </Button>
        </div>
      </div>
    </Card>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { Music2, X, Lightbulb, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/useWorkspaceStore';
import { buildConcertmasterProfile, buildConcertmasterInsights } from '@/lib/concertmaster';
import type { ConcertmasterInsight } from '@/lib/concertmaster';

const STRATEGY_DISPLAY: Record<string, string> = {
  challenge_existence: '존재 의심',
  narrow_scope: '범위 집중',
  diagnose_root: '원인 진단',
  redirect_angle: '관점 전환',
};

const CATEGORY_ICON: Record<ConcertmasterInsight['category'], typeof Lightbulb> = {
  pattern: BarChart3,
  coaching: Lightbulb,
  growth: TrendingUp,
  warning: AlertTriangle,
};

export function ConcertmasterStrip() {
  const { concertmasterOpen, toggleConcertmaster } = useWorkspaceStore();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const profile = useMemo(() => buildConcertmasterProfile(), []);
  const allInsights = useMemo(() => buildConcertmasterInsights(profile), [profile]);
  const insights = useMemo(
    () => allInsights.filter((i) => !dismissed.has(i.id)),
    [allInsights, dismissed]
  );

  const hasNewInsights = insights.length > 0;

  // Collapsed state (48px)
  if (!concertmasterOpen) {
    return (
      <button
        onClick={toggleConcertmaster}
        className={`hidden lg:flex shrink-0 w-12 flex-col items-center justify-start pt-4 gap-2 border-l border-[var(--border)] bg-[var(--surface)] cursor-pointer hover:bg-[var(--ai)] transition-colors relative ${
          hasNewInsights ? 'animate-subtle-pulse' : ''
        }`}
        title="악장 열기"
      >
        <div className="absolute inset-y-0 left-0 w-[2px]" style={{ background: 'var(--gradient-gold)' }} />
        <Music2 size={18} className="text-[var(--gold)]" />
        {hasNewInsights && (
          <span className="w-2 h-2 rounded-full bg-[var(--gold)] shadow-[var(--glow-gold)]" />
        )}
      </button>
    );
  }

  // Expanded state (300px)
  return (
    <div className="hidden lg:flex shrink-0 w-[300px] flex-col border-l border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      {/* Gold gradient top accent */}
      <div className="h-[2px] w-full shrink-0" style={{ background: 'var(--gradient-gold)' }} />
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Music2 size={16} className="text-[var(--gold)]" />
          <span className="text-[14px] font-bold text-[var(--text-primary)]">악장</span>
        </div>
        <button
          onClick={toggleConcertmaster}
          className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Profile summary */}
      <div className="px-4 py-3 border-b border-[var(--border-subtle)] space-y-1">
        <p className="text-[13px] text-[var(--text-primary)]">
          {profile.sessionCount}회 분석
          {profile.projectCount > 0 && ` · ${profile.projectCount}개 프로젝트`}
        </p>
        {profile.dominantStrategy && (
          <p className="text-[12px] text-[var(--text-secondary)]">
            선호 전략: {STRATEGY_DISPLAY[profile.dominantStrategy] || profile.dominantStrategy}
          </p>
        )}
        {profile.totalJudgments >= 3 && (
          <p className="text-[12px] text-[var(--text-secondary)]">
            AI 수정률: {Math.round(profile.overrideRate * 100)}%
          </p>
        )}
        {profile.sessionCount >= 3 && (
          <p className="text-[12px] text-[var(--text-secondary)]">
            평균 활용률: {Math.round(profile.avgPassRate * 100)}%
          </p>
        )}
      </div>

      {/* Insights */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {insights.length === 0 && (
          <p className="text-[12px] text-[var(--text-secondary)] text-center py-4">
            {profile.sessionCount === 0
              ? '첫 분석을 시작하면 인사이트가 쌓입니다.'
              : '새로운 인사이트가 없습니다.'}
          </p>
        )}
        {insights.map((insight) => {
          const Icon = CATEGORY_ICON[insight.category];
          return (
            <div
              key={insight.id}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg)] p-3 group"
            >
              <div className="flex items-start gap-2">
                <Icon size={13} className="text-[var(--gold)] mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-[var(--text-primary)] leading-relaxed">
                    {insight.message}
                  </p>
                  {insight.detail && (
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                      {insight.detail}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setDismissed((prev) => new Set(prev).add(insight.id))}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-opacity"
                  title="닫기"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

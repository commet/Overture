'use client';

/**
 * Validation Dashboard — Validation Chain의 시각화.
 *
 * DQ score → Confidence calibration → Outcome tracking → Meta-validation
 * 4건 이상의 outcome 데이터가 있을 때 제품이 자기 가치를 사용자 데이터로 증명하는 순간.
 */

import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { TrendingUp, Target, AlertTriangle, Check, BarChart3 } from 'lucide-react';
import { getDQScores, correlateDQWithOutcomes, analyzeConfidenceCalibration, validateEvalCriteria } from '@/lib/decision-quality';
import { getOutcomeRecords, analyzePersonaPredictionAccuracy, getOverallOutcomeSummary } from '@/lib/outcome-tracker';
import { getStorage, STORAGE_KEYS } from '@/lib/storage';
import type { Project, Persona } from '@/stores/types';

export function ValidationDashboard() {
  const data = useMemo(() => {
    const scores = getDQScores();
    const outcomes = getOutcomeRecords();
    const projects = getStorage<Project[]>(STORAGE_KEYS.PROJECTS, []);
    const personas = getStorage<Persona[]>(STORAGE_KEYS.PERSONAS, []);

    const correlation = correlateDQWithOutcomes(scores, outcomes);
    const calibration = analyzeConfidenceCalibration(projects, outcomes);
    const personaAccuracy = analyzePersonaPredictionAccuracy(outcomes, personas);
    const outcomeSummary = getOverallOutcomeSummary(outcomes);
    const evalValidation = validateEvalCriteria(scores, outcomes);

    return { scores, outcomes, correlation, calibration, personaAccuracy, outcomeSummary, evalValidation };
  }, []);

  const { outcomes, correlation, calibration, outcomeSummary, evalValidation, personaAccuracy } = data;

  if (outcomes.length === 0) {
    return (
      <Card className="!p-4">
        <div className="text-center py-6">
          <BarChart3 size={24} className="text-[var(--text-tertiary)] mx-auto mb-2" />
          <p className="text-[13px] text-[var(--text-secondary)]">아직 기록된 결과가 없습니다.</p>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
            프로젝트 완료 후 결과를 기록하면 판단 프로세스의 효과를 검증할 수 있습니다.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Overall Success ── */}
      <Card className="!p-4">
        <h4 className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Target size={12} /> 전체 성과
        </h4>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: '기대 이상', count: outcomeSummary.exceeded, color: 'text-emerald-500' },
            { label: '충족', count: outcomeSummary.met, color: 'text-blue-500' },
            { label: '부분', count: outcomeSummary.partial, color: 'text-amber-500' },
            { label: '실패', count: outcomeSummary.failed, color: 'text-red-500' },
          ].map(item => (
            <div key={item.label} className="text-center">
              <p className={`text-[18px] font-bold ${item.color}`}>{item.count}</p>
              <p className="text-[10px] text-[var(--text-tertiary)]">{item.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <span className="text-[11px] text-[var(--text-secondary)]">성공률</span>
          <span className="text-[13px] font-bold text-[var(--text-primary)]">
            {Math.round(outcomeSummary.success_rate * 100)}%
          </span>
        </div>
      </Card>

      {/* ── DQ-Outcome Correlation ── */}
      <Card className="!p-4">
        <h4 className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <TrendingUp size={12} /> DQ ↔ 성과 상관관계
        </h4>
        {correlation.correlation_significant ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[var(--text-secondary)]">고-DQ (≥70) 성공률</span>
              <span className="text-[14px] font-bold text-emerald-500">{correlation.high_dq_success_rate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[var(--text-secondary)]">저-DQ (&lt;50) 성공률</span>
              <span className="text-[14px] font-bold text-red-400">{correlation.low_dq_success_rate}%</span>
            </div>
          </div>
        ) : null}
        <p className="text-[11px] text-[var(--text-secondary)] mt-2 leading-relaxed">
          {correlation.insight}
        </p>
      </Card>

      {/* ── Confidence Calibration ── */}
      {calibration.data_points.length > 0 && (
        <Card className="!p-4">
          <h4 className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            {calibration.well_calibrated ? <Check size={12} className="text-emerald-500" /> :
             calibration.overconfident ? <AlertTriangle size={12} className="text-amber-500" /> :
             <AlertTriangle size={12} className="text-blue-500" />}
            확신도 보정
          </h4>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
            {calibration.insight}
          </p>
          {calibration.data_points.length >= 3 && (
            <div className="mt-2 flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                calibration.well_calibrated ? 'bg-emerald-500/10 text-emerald-500' :
                calibration.overconfident ? 'bg-amber-500/10 text-amber-500' :
                'bg-blue-500/10 text-blue-500'
              }`}>
                {calibration.well_calibrated ? '정확한 자기 평가' :
                 calibration.overconfident ? '과신 경향' : '과소 평가 경향'}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)]">
                갭 {calibration.calibration_gap > 0 ? '+' : ''}{calibration.calibration_gap}%p
              </span>
            </div>
          )}
        </Card>
      )}

      {/* ── Persona Prediction Accuracy ── */}
      {personaAccuracy.length > 0 && (
        <Card className="!p-4">
          <h4 className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
            페르소나 예측 정확도
          </h4>
          <div className="space-y-2">
            {personaAccuracy.slice(0, 5).map(pa => (
              <div key={pa.persona_id} className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--text-primary)]">{pa.persona_name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text-tertiary)]">
                    {pa.risks_materialized}/{pa.total_risks_predicted}
                  </span>
                  <span className={`text-[11px] font-medium ${
                    pa.accuracy_rate > 0.5 ? 'text-emerald-500' : 'text-amber-500'
                  }`}>
                    {Math.round(pa.accuracy_rate * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Eval Criteria Meta-Validation ── */}
      {evalValidation.significant && (
        <Card className="!p-4">
          <h4 className="text-[12px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <BarChart3 size={12} /> DQ 기준 검증
          </h4>
          {evalValidation.predictive_elements.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] text-[var(--text-tertiary)] mb-1">성공 예측력 높은 요소</p>
              <div className="flex flex-wrap gap-1">
                {evalValidation.predictive_elements.map(e => (
                  <span key={e.element} className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-medium">
                    {e.element} +{e.correlation}
                  </span>
                ))}
              </div>
            </div>
          )}
          {evalValidation.non_predictive_elements.length > 0 && (
            <div>
              <p className="text-[10px] text-[var(--text-tertiary)] mb-1">예측력 낮은 요소</p>
              <div className="flex flex-wrap gap-1">
                {evalValidation.non_predictive_elements.map(e => (
                  <span key={e.element} className="px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] text-[10px]">
                    {e.element}
                  </span>
                ))}
              </div>
            </div>
          )}
          <p className="text-[11px] text-[var(--text-secondary)] mt-2 leading-relaxed">
            {evalValidation.insight}
          </p>
        </Card>
      )}
    </div>
  );
}

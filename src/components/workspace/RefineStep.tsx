'use client';

import { useEffect, useState } from 'react';
import { useRefineStore } from '@/stores/useRefineStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { usePersonaStore } from '@/stores/usePersonaStore';
import { ConvergenceChart } from './ConvergenceChart';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FeedbackResult } from '@/components/tools/FeedbackResult';
import { LoadingSteps } from '@/components/ui/LoadingSteps';
import { CopyButton } from '@/components/ui/CopyButton';
import { ShareBar } from '@/components/ui/ShareBar';
import { callLLMJson } from '@/lib/llm';
import { toDisplayError, isAuthError } from '@/lib/error-display';
import { extractIssuesFromFeedback, extractApprovalConditions, matchApprovalConditions } from '@/lib/convergence';
import type { FeedbackRecord, RehearsalResult, RevisionChange, ApprovalCondition, StructuredSynthesis, RefineLoop } from '@/stores/types';
import { RefreshCw, Check, AlertTriangle, ArrowRight, Square, ChevronDown, ChevronUp, Loader2, FileText, ShieldAlert, Target } from 'lucide-react';
import { track, trackError } from '@/lib/analytics';
import { buildFeedbackSystemPrompt, buildFeedbackSystemPromptFromAgent } from '@/lib/persona-prompt';
import { useAgentStore } from '@/stores/useAgentStore';
import { ConcertmasterInline } from '@/components/workspace/ConcertmasterInline';
import { buildRecastContext, buildReframeContext, buildRefineContext } from '@/lib/context-chain';
import { useRecastStore } from '@/stores/useRecastStore';
import { useReframeStore } from '@/stores/useReframeStore';
import { recordSignal } from '@/lib/signal-recorder';
import { generateRetrospectiveQuestions, saveRetrospectiveAnswer } from '@/lib/retrospective';
import { useHandoffStore } from '@/stores/useHandoffStore';
// Heavy module: eval-engine loaded on-demand (only at step completion)
const lazyEvalEngine = () => import('@/lib/eval-engine');
// decision-quality used in render, must be static
import { computeDecisionQuality, getDQScores, correlateDQWithOutcomes } from '@/lib/decision-quality';
import type { DecisionQualityScore } from '@/stores/types';
import { useJudgmentStore } from '@/stores/useJudgmentStore';
import { saveOutcomeRecord, buildRiskChecklist, getOutcomeRecords, analyzePersonaPredictionAccuracy } from '@/lib/outcome-tracker';
import { useCountUp } from '@/lib/use-count-up';
import type { MaterializedRisk } from '@/stores/types';
import { Lightbulb } from 'lucide-react';

// ── Revision prompt ──
const REVISION_SYSTEM = `당신은 전략기획 문서 개선 전문가입니다.
이해관계자 피드백을 반영하여 기획안을 수정합니다.

규칙:
- 원본 구조를 유지하면서 문제가 된 부분만 정확히 수정
- 각 수정에 대해 왜 수정했는지 근거를 명시
- 수정하지 않은 부분도 포함한 완전한 문서를 출력
- 과도한 수정보다 핵심 이슈에 집중

응답 형식 (JSON만 출력):
{
  "revised_plan": "수정된 전체 기획안 (마크다운)",
  "changes": [
    {"what": "무엇을 수정", "why": "왜 수정", "addressing": "어떤 이슈 대응"}
  ],
  "not_addressed": ["이번에 반영 안 한 이슈와 이유"]
}

반드시 JSON만 응답하세요.`;

interface RefineStepProps {
  onNavigate: (step: string) => void;
}

export function RefineStep({ onNavigate }: RefineStepProps) {
  const { loops, activeLoopId, loadLoops, setActiveLoopId, updateLoop, addIteration, checkConvergence } = useRefineStore();
  const { projects, loadProjects, updateProject } = useProjectStore();
  const { personas, feedbackHistory, loadData: loadPersonaData, getPersona, addFeedbackRecord } = usePersonaStore();

  const [expandedIteration, setExpandedIteration] = useState<number | null>(null);
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState('');
  const [userDirective, setUserDirective] = useState('');

  useEffect(() => {
    loadLoops();
    loadProjects();
    loadPersonaData();
  }, [loadLoops, loadProjects, loadPersonaData]);

  const activeLoop = loops.find((l) => l.id === activeLoopId);
  const convergence = activeLoop ? checkConvergence(activeLoop.id) : null;
  const latestIteration = activeLoop?.iterations[activeLoop.iterations.length - 1];

  // Get the current plan text (latest revised or original)
  const currentPlan = latestIteration?.revised_plan || activeLoop?.original_plan || '';

  // Get the latest feedback record (from latest iteration or initial)
  const latestFeedbackRecordId = latestIteration?.feedback_record_id || activeLoop?.initial_feedback_record_id;
  const latestFeedbackRecord = latestFeedbackRecordId
    ? feedbackHistory.find(f => f.id === latestFeedbackRecordId)
    : null;

  // Extract issues from latest feedback
  const currentIssues = latestFeedbackRecord
    ? extractIssuesFromFeedback(latestFeedbackRecord, personas)
    : [];

  const criticalIssues = currentIssues.filter(i => i.severity === 'critical');
  const concernIssues = currentIssues.filter(i => i.severity === 'concern');
  const questionIssues = currentIssues.filter(i => i.severity === 'question');
  const wantsMoreIssues = currentIssues.filter(i => i.severity === 'wants_more');

  const toggleIssue = (text: string) => {
    setSelectedIssues(prev => {
      const next = new Set(prev);
      if (next.has(text)) next.delete(text);
      else next.add(text);
      return next;
    });
  };

  // ── The Real Loop: Revise → Re-review → Converge ──
  const handleRunIteration = async () => {
    if (!activeLoop || selectedIssues.size === 0) return;
    setIsRefining(true);
    setError('');

    try {
      const selectedIssueList = currentIssues.filter(i => selectedIssues.has(i.text));
      const issueText = selectedIssueList
        .map(i => `- [${i.persona_name}] ${i.text}`)
        .join('\n');

      const directivePart = userDirective.trim()
        ? `\n\n[사용자 추가 지시]\n${userDirective.trim()}`
        : '';

      const revisionPrompt = `[기획안]\n${currentPlan}\n\n[반영할 이해관계자 피드백 (${selectedIssueList.length}건)]\n${issueText}${directivePart}`;

      // Build revision system prompt with original design context
      let revisionSystem = REVISION_SYSTEM;
      const { items: recastItems } = useRecastStore.getState();
      const { items: reframeItems } = useReframeStore.getState();
      const relRecast = recastItems
        .filter(o => o.project_id === activeLoop.project_id && o.status === 'done' && o.analysis)
        .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))[0];
      const relDec = reframeItems
        .filter(d => d.project_id === activeLoop.project_id && d.status === 'done' && d.analysis)
        .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))[0];
      if (relRecast) {
        const orchCtx = buildRecastContext(relRecast);
        const decCtx = relDec ? buildReframeContext(relDec) : undefined;
        revisionSystem = `${REVISION_SYSTEM}\n\n${buildRefineContext(orchCtx, decCtx)}`;
      }

      // ── Phase A: Plan Revision ──
      const revision = await callLLMJson<{
        revised_plan: string;
        changes: RevisionChange[];
        not_addressed: string[];
      }>(
        [{ role: 'user', content: revisionPrompt }],
        { system: revisionSystem, maxTokens: 3500, shape: { revised_plan: 'string', changes: 'array' } }
      );

      // ── Phase B: Re-review with same personas ──
      // ── Parallel re-review (병렬 실행으로 N배 속도 향상) ──
      const personaIds = activeLoop.persona_ids;
      const perspective = latestFeedbackRecord?.feedback_perspective || '전반적 인상';
      const intensity = latestFeedbackRecord?.feedback_intensity || '솔직하게';
      const changesContext = (revision.changes || [])
        .map(c => `- ${c.what}: ${c.why} (대응: ${c.addressing})`)
        .join('\n');
      const reReviewContent = changesContext
        ? `${revision.revised_plan}\n\n---\n[이번 수정 사항]\n${changesContext}`
        : revision.revised_plan;

      const settled = await Promise.allSettled(
        personaIds.map(async (personaId) => {
          const persona = getPersona(personaId);
          if (!persona) throw new Error(`Persona ${personaId} not found`);
          const agent = useAgentStore.getState().getAgent(personaId);
          const systemPrompt = agent
            ? buildFeedbackSystemPromptFromAgent(agent, perspective, intensity, { isReReview: true })
            : buildFeedbackSystemPrompt(persona, perspective, intensity, { isReReview: true });
          const result = await callLLMJson<Omit<RehearsalResult, 'persona_id'>>(
            [{ role: 'user', content: reReviewContent }],
            { system: systemPrompt, maxTokens: 2000, shape: { overall_reaction: 'string', classified_risks: 'array', praise: 'array', concerns: 'array', approval_conditions: 'array' } }
          );
          return { ...result, persona_id: personaId } as RehearsalResult;
        })
      );

      const reReviewResults: RehearsalResult[] = [];
      for (const outcome of settled) {
        if (outcome.status === 'fulfilled') {
          reReviewResults.push(outcome.value);
        } else if (process.env.NODE_ENV === 'development') {
          console.warn('[refine] 재리뷰 실패:', outcome.reason);
        }
      }

      // Synthesis for re-review
      let synthesis = '';
      let structured_synthesis: StructuredSynthesis | undefined;
      if (reReviewResults.length > 1) {
        const feedbackSummary = reReviewResults.map(r => {
          const p = getPersona(r.persona_id);
          return `### ${p?.name} (ID: ${r.persona_id}, 영향력: ${p?.influence || 'medium'})\n우려: ${r.concerns.join('; ')}\n리스크: ${(r.classified_risks || []).map(cr => `[${cr.category}] ${cr.text}`).join('; ')}`;
        }).join('\n\n');

        try {
          structured_synthesis = await callLLMJson<StructuredSynthesis>(
            [{ role: 'user', content: feedbackSummary }],
            { system: `이해관계자 재리뷰 피드백을 종합하세요. JSON: {"common_agreements":["합의점"],"key_conflicts":[{"topic":"","positions":[{"persona_id":"","stance":""}]}],"priority_actions":[{"action":"","requested_by":"","priority":"high|medium"}]}. 한국어. JSON만.`, maxTokens: 1500, shape: { common_agreements: 'array', key_conflicts: 'array', priority_actions: 'array' } }
          );
          synthesis = `합의: ${structured_synthesis.common_agreements.join(', ')}`;
        } catch {
          synthesis = '종합 분석 생성 실패';
        }
      }

      // Validate re-review results
      if (reReviewResults.length === 0) {
        throw new Error('재리뷰를 수행할 수 있는 페르소나가 없습니다. 페르소나를 확인해주세요.');
      }

      // Save re-review as FeedbackRecord
      const reReviewRecordId = addFeedbackRecord({
        document_title: `${activeLoop.goal} (v${activeLoop.iterations.length + 2})`,
        document_text: revision.revised_plan,
        persona_ids: personaIds,
        feedback_perspective: '전반적 인상',
        feedback_intensity: '솔직하게',
        results: reReviewResults,
        synthesis,
        structured_synthesis,
        project_id: activeLoop.project_id,
        loop_id: activeLoop.id,
        iteration_number: activeLoop.iterations.length + 1,
      });

      // ── Phase C: Convergence check ──
      const reReviewRecord = usePersonaStore.getState().feedbackHistory.find(f => f.id === reReviewRecordId);
      if (!reReviewRecord) throw new Error('재리뷰 기록을 찾을 수 없습니다.');

      // Match approval conditions
      const prevConditions = latestIteration?.convergence.approval_conditions
        || activeLoop.initial_approval_conditions;
      const updatedConditions = matchApprovalConditions(
        prevConditions,
        reReviewRecord,
        activeLoop.iterations.length + 1
      );

      // Count issues from re-review
      const newIssues = extractIssuesFromFeedback(reReviewRecord, personas);
      const newCriticalCount = newIssues.filter(i => i.severity === 'critical').length;

      // Add iteration
      addIteration(activeLoop.id, {
        iteration_number: activeLoop.iterations.length + 1,
        issues_to_address: selectedIssueList.map(i => i.text),
        user_directive: userDirective.trim() || undefined,
        revised_plan: revision.revised_plan,
        changes: revision.changes,
        not_addressed: revision.not_addressed,
        feedback_record_id: reReviewRecordId,
        convergence: {
          critical_risks: newCriticalCount,
          total_issues: newIssues.length,
          approval_conditions: updatedConditions,
        },
      });

      setSelectedIssues(new Set());
      setUserDirective('');
      setExpandedIteration(activeLoop.iterations.length);
      track('real_iteration_complete', {
        iteration: activeLoop.iterations.length + 1,
        critical_remaining: newCriticalCount,
        issues_total: newIssues.length,
        issues_selected: selectedIssueList.length,
        changes_made: revision.changes?.length || 0,
        not_addressed: revision.not_addressed?.length || 0,
        has_user_directive: !!userDirective.trim(),
        personas_count: personaIds.length,
      });
    } catch (err) {
      trackError('refine_iterate', err);
      const de = toDisplayError(err);
      if (isAuthError(err)) {
        setError('LOGIN_REQUIRED');
      } else {
        setError(de.message || '개선안을 생성할 수 없었습니다.');
      }
    } finally {
      setIsRefining(false);
    }
  };

  // ── Initial issue count (from initial feedback) ──
  const initialFeedbackRecord = activeLoop?.initial_feedback_record_id
    ? feedbackHistory.find(f => f.id === activeLoop.initial_feedback_record_id)
    : null;
  const initialIssueCount = initialFeedbackRecord
    ? extractIssuesFromFeedback(initialFeedbackRecord, personas).length
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>합주 연습 <span className="text-[16px] font-normal text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-display)' }}>| 피드백 반영</span></h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">
          핵심 위협이 해소될 때까지 기획안을 수정하고 재리뷰를 받습니다.
        </p>
        <div className="mt-2">
          <ConcertmasterInline step="refine" />
        </div>
      </div>

      {/* ═══ Loop list ═══ */}
      {!activeLoop && (
        <div className="space-y-3">
          {loops.length === 0 ? (
            <Card className="text-center py-12">
              <RefreshCw size={24} className="mx-auto text-[var(--text-secondary)] mb-3" />
              <p className="text-[var(--text-secondary)] text-[14px] font-medium">아직 합주가 시작되지 않았습니다.</p>
              <p className="text-[var(--text-secondary)] text-[12px] mt-1 max-w-xs mx-auto">
                리허설에서 피드백을 받은 뒤, &ldquo;합주 연습 시작&rdquo;을 눌러 반복 개선을 시작하세요.
              </p>
              <button onClick={() => onNavigate('rehearse')} className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-[var(--bg)] text-[13px] font-semibold shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-[1px] active:translate-y-0 transition-all cursor-pointer">
                리허설 먼저 진행하기 <ArrowRight size={14} />
              </button>
            </Card>
          ) : (
            loops.map(loop => {
              const project = projects.find(p => p.id === loop.project_id);
              const conv = checkConvergence(loop.id);
              return (
                <Card key={loop.id} hoverable onClick={() => setActiveLoopId(loop.id)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[15px] font-bold text-[var(--text-primary)]">{loop.name}</h3>
                        <Badge variant={loop.status === 'active' ? 'ai' : loop.status === 'converged' ? 'both' : 'default'}>
                          {loop.status === 'active' ? '진행 중' : loop.status === 'converged' ? '수렴 완료' : '중단됨'}
                        </Badge>
                      </div>
                      {project && <p className="text-[12px] text-[var(--text-secondary)]">{project.name}</p>}
                      <p className="text-[12px] text-[var(--text-secondary)] mt-1">
                        반복 {loop.iterations.length}/{loop.max_iterations}
                        {conv.critical_remaining >= 0 && ` · 핵심 위협 ${conv.critical_remaining}건`}
                        {` · 승인 ${conv.approval_met}/${conv.approval_total}`}
                      </p>
                    </div>
                    <ArrowRight size={16} className="text-[var(--text-secondary)] mt-1" />
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ═══ Active loop detail ═══ */}
      {activeLoop && convergence && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <button onClick={() => setActiveLoopId(null)} className="text-[12px] text-[var(--accent)] hover:underline cursor-pointer">&larr; 목록으로</button>
            <Badge variant={activeLoop.status === 'active' ? 'ai' : 'both'}>
              {activeLoop.status === 'active' ? '진행 중' : activeLoop.status === 'converged' ? '수렴 완료' : '중단됨'}
            </Badge>
          </div>

          {/* ═══ Convergence Dashboard ═══ */}
          <Card className={`!p-4 ${convergence.converged ? '!bg-[var(--collab)] !border-green-200' : ''}`}>
            <h3 className="text-[13px] font-bold text-[var(--text-primary)] mb-3">수렴 상태</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              {/* Critical risks */}
              <div className={`rounded-lg p-3 text-center border ${convergence.critical_remaining === 0 ? 'bg-[var(--collab)] border-[var(--success)]/20' : 'bg-[var(--danger)]/10 border-[var(--danger)]/20'}`}>
                <p className={`text-[18px] font-bold transition-all duration-500 ${convergence.critical_remaining === 0 ? 'text-[var(--success)]' : 'text-[#E24B4A]'}`}>
                  {convergence.critical_remaining < 0 ? '-' : convergence.critical_remaining}
                </p>
                <p className={`text-[10px] font-semibold ${convergence.critical_remaining === 0 ? 'text-[var(--success)]' : 'text-[#E24B4A]'}`}>
                  핵심 위협
                </p>
              </div>

              {/* Approval conditions */}
              <div className={`rounded-lg p-3 text-center border ${convergence.approval_met >= convergence.approval_total * 0.8 ? 'bg-[var(--collab)] border-[var(--success)]/20' : 'bg-[var(--checkpoint)] border-[var(--risk-manageable)]/20'}`}>
                <p className={`text-[18px] font-bold transition-all duration-500 ${convergence.approval_met >= convergence.approval_total * 0.8 ? 'text-[var(--success)]' : 'text-amber-700'}`}>
                  {convergence.approval_met}/{convergence.approval_total}
                </p>
                <p className="text-[10px] font-semibold text-amber-700">승인 조건</p>
              </div>

              {/* Total issues */}
              <div className="rounded-lg p-3 text-center border bg-[var(--ai)] border-blue-200">
                <p className="text-[18px] font-bold text-[var(--accent)] transition-all duration-500">{convergence.total_issues}</p>
                <p className="text-[10px] font-semibold text-[var(--accent)]">총 이슈</p>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-[var(--surface)] rounded-lg px-3 py-2">
              {convergence.converged ? <Check size={14} className="text-[var(--success)] mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />}
              <p className="text-[12px] text-[var(--text-primary)] leading-relaxed">{convergence.guidance}</p>
            </div>
          </Card>

          {/* Approval conditions checklist */}
          {(() => {
            const conditions = latestIteration?.convergence.approval_conditions || activeLoop.initial_approval_conditions;
            const highConditions = conditions.filter(ac => ac.influence === 'high');
            if (highConditions.length === 0) return null;
            return (
              <Card className="!p-4">
                <h4 className="text-[12px] font-bold text-[var(--text-secondary)] mb-2">꼭 지켜야 할 승인 조건</h4>
                <div className="space-y-1.5">
                  {highConditions.map((ac, i) => (
                    <div key={i} className="flex items-start gap-2 text-[12px]">
                      <span className={`mt-0.5 shrink-0 ${ac.met ? 'text-[var(--success)]' : 'text-[var(--text-tertiary)]'}`}>
                        {ac.met ? '✓' : '○'}
                      </span>
                      <div>
                        <span className={ac.met ? 'text-[var(--text-secondary)] line-through' : 'text-[var(--text-primary)]'}>{ac.condition}</span>
                        <span className="text-[var(--text-tertiary)] ml-1.5">— {ac.persona_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })()}

          {/* Issue trend chart */}
          <ConvergenceChart iterations={activeLoop.iterations} initialIssueCount={initialIssueCount} />

          {/* ═══ Convergence Banner ═══ */}
          {convergence.converged && activeLoop.status === 'active' && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--collab)] border border-green-200">
              <Check size={18} className="text-[var(--success)]" />
              <div>
                <p className="text-[14px] font-bold text-[var(--success)]">수렴 완료</p>
                <p className="text-[12px] text-[var(--text-secondary)]">모든 핵심 위협이 해결되었습니다. 산출물을 생성할 수 있습니다.</p>
              </div>
            </div>
          )}

          {/* ═══ Iteration Timeline ═══ */}
          {activeLoop.iterations.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[14px] font-bold text-[var(--text-primary)]">반복 이력</h3>
              {activeLoop.iterations.map((iter, i) => {
                const iterFeedback = feedbackHistory.find(f => f.id === iter.feedback_record_id);
                return (
                  <Card key={i} className={`!p-4 ${expandedIteration === i ? '!border-[var(--accent)]' : ''}`}>
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedIteration(expandedIteration === i ? null : i)}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold ${
                          iter.convergence.critical_risks === 0 ? 'bg-[var(--collab)] text-[var(--success)]' : 'bg-[var(--ai)] text-[#2d4a7c]'
                        }`}>
                          v{i + 2}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                            수정 {iter.changes.length}건 반영
                          </p>
                          <div className="flex items-center gap-2 text-[11px] mt-0.5">
                            <span className={iter.convergence.critical_risks > 0 ? 'text-red-600' : 'text-[var(--success)]'}>
                              위협 {iter.convergence.critical_risks}
                            </span>
                            <span className="text-[var(--text-secondary)]">이슈 {iter.convergence.total_issues}</span>
                          </div>
                        </div>
                      </div>
                      {expandedIteration === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>

                    {expandedIteration === i && (
                      <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-3 animate-fade-in">
                        {/* Changes made */}
                        <div>
                          <p className="text-[11px] font-bold text-[var(--text-secondary)] mb-1.5">수정 사항</p>
                          <div className="space-y-1.5">
                            {iter.changes.map((change, ci) => (
                              <div key={ci} className="text-[12px] bg-[var(--collab)] rounded-lg px-3 py-2">
                                <span className="font-semibold text-[var(--success)]">{change.what}</span>
                                <span className="text-[var(--text-secondary)]"> — {change.why}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Not addressed */}
                        {iter.not_addressed && iter.not_addressed.length > 0 && (
                          <div>
                            <p className="text-[11px] font-bold text-[var(--text-tertiary)] mb-1">미반영</p>
                            {iter.not_addressed.map((na, ni) => (
                              <p key={ni} className="text-[11px] text-[var(--text-tertiary)]">- {na}</p>
                            ))}
                          </div>
                        )}

                        {/* Revised plan (collapsible) */}
                        <details className="group">
                          <summary className="flex items-center gap-1.5 text-[11px] text-[var(--accent)] cursor-pointer hover:underline">
                            <FileText size={11} /> 수정된 문서 전체 보기
                          </summary>
                          <div className="mt-2 relative">
                            <CopyButton getText={() => iter.revised_plan} label="복사" />
                            <pre className="text-[11px] text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto bg-[var(--bg)] rounded-lg p-3 pr-16">
                              {iter.revised_plan}
                            </pre>
                          </div>
                        </details>

                        {/* Re-review feedback (embedded FeedbackResult) */}
                        {iterFeedback && (
                          <div className="border-t border-[var(--border)] pt-3">
                            <p className="text-[11px] font-bold text-[var(--text-secondary)] mb-2">재리뷰 결과</p>
                            <FeedbackResult record={iterFeedback} personas={personas} />
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* ═══ Next Iteration Controls ═══ */}
          {activeLoop.status === 'active' && activeLoop.iterations.length < activeLoop.max_iterations && (
            <Card className="!border-amber-200 !bg-[var(--checkpoint)]">
              <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-3">
                다음 반복 {convergence.converged && '(수렴 달성 — 선택적)'}
              </h3>

              {isRefining ? (
                <LoadingSteps steps={[
                  '피드백을 반영하여 기획안을 수정하고 있습니다...',
                  '이해관계자에게 수정된 기획안의 재리뷰를 요청하고 있습니다...',
                  '수렴 분석 중...',
                ]} />
              ) : currentIssues.length > 0 ? (
                <>
                  <p className="text-[12px] text-[var(--text-secondary)] mb-3">
                    해결할 이슈를 선택하세요. {criticalIssues.length > 0 && <span className="text-red-600 font-semibold">핵심 위협 {criticalIssues.length}건을 우선 해결하세요.</span>}
                  </p>

                  <div className="space-y-1.5 mb-4 max-h-80 overflow-y-auto">
                    {/* Critical first */}
                    {criticalIssues.length > 0 && (
                      <p className="text-[10px] font-bold text-[#E24B4A] uppercase tracking-wider mt-1">핵심 위협</p>
                    )}
                    {criticalIssues.map((issue, i) => (
                      <IssueCheckbox key={`c-${i}`} issue={issue} selected={selectedIssues.has(issue.text)} onToggle={() => toggleIssue(issue.text)} variant="critical" />
                    ))}

                    {/* Concerns */}
                    {concernIssues.length > 0 && (
                      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mt-2">우려/지적</p>
                    )}
                    {concernIssues.map((issue, i) => (
                      <IssueCheckbox key={`co-${i}`} issue={issue} selected={selectedIssues.has(issue.text)} onToggle={() => toggleIssue(issue.text)} variant="concern" />
                    ))}

                    {/* Questions */}
                    {questionIssues.length > 0 && (
                      <p className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider mt-2">질문</p>
                    )}
                    {questionIssues.map((issue, i) => (
                      <IssueCheckbox key={`q-${i}`} issue={issue} selected={selectedIssues.has(issue.text)} onToggle={() => toggleIssue(issue.text)} variant="question" />
                    ))}
                    {wantsMoreIssues.length > 0 && (
                      <p className="text-[11px] font-semibold text-[var(--text-secondary)] mt-3 mb-1">추가 요청</p>
                    )}
                    {wantsMoreIssues.map((issue, i) => (
                      <IssueCheckbox key={`w-${i}`} issue={issue} selected={selectedIssues.has(issue.text)} onToggle={() => toggleIssue(issue.text)} variant="question" />
                    ))}
                  </div>

                  {/* User directive */}
                  {selectedIssues.size > 0 && (
                    <div className="mb-4 pt-3 border-t border-[var(--border-subtle)]">
                      <p className="text-[12px] font-semibold text-[var(--text-primary)] mb-1.5">추가 지시 <span className="font-normal text-[var(--text-tertiary)]">(선택)</span></p>
                      <textarea
                        value={userDirective}
                        onChange={e => setUserDirective(e.target.value)}
                        placeholder="이슈 해결 방향이나 추가 맥락을 입력하세요"
                        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] resize-none leading-relaxed"
                        rows={2}
                        maxLength={2000}
                      />
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[13px] text-[var(--text-secondary)] mb-3">최신 피드백에서 추출된 이슈가 없습니다.</p>
              )}

              {error && (
                <div className="flex items-center justify-between gap-2 text-[var(--danger)] text-[13px] bg-[var(--danger)]/10 rounded-lg px-3 py-2 mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} /> <span>{error}</span>
                  </div>
                  <button onClick={() => { setError(''); handleRunIteration(); }} className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-red-200 text-[var(--danger)] hover:bg-red-100 cursor-pointer transition-colors">
                    다시 시도
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button variant="danger" size="sm" onClick={() => updateLoop(activeLoop.id, { status: 'stopped_by_user' })}>
                    <Square size={12} /> 중단
                  </Button>
                  {convergence.converged && (
                    <Button variant="secondary" size="sm" onClick={() => { updateLoop(activeLoop.id, { status: 'converged' }); track('loop_converged', { iterations: activeLoop.iterations.length }); recordSignal({ project_id: activeLoop?.project_id, tool: 'refine', signal_type: 'convergence_result', signal_data: { iterations: activeLoop.iterations.length, final_score: convergence?.total_issues || 0, converged: true, critical_remaining: convergence?.critical_remaining || 0 } }); lazyEvalEngine().then(m => m.recordRefineEval({ ...activeLoop, status: 'converged' })); }}>
                      <Check size={12} /> 수렴 완료
                    </Button>
                  )}
                </div>
                {selectedIssues.size > 0 && !isRefining && (
                  <Button size="sm" onClick={handleRunIteration}>
                    <RefreshCw size={12} /> {selectedIssues.size}건 반영하고 재리뷰
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Max iterations reached */}
          {activeLoop.status === 'active' && activeLoop.iterations.length >= activeLoop.max_iterations && (
            <Card className="!bg-[var(--checkpoint)] !border-[var(--risk-manageable)]/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-bold text-amber-800">최대 반복 횟수({activeLoop.max_iterations}회)에 도달했습니다.</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">{convergence.converged ? '수렴이 달성되었습니다.' : '수렴하지 못했지만 현재 상태에서 마무리할 수 있습니다.'}</p>
                </div>
                <Button size="sm" onClick={() => { const fs = convergence.converged ? 'converged' as const : 'stopped_by_user' as const; updateLoop(activeLoop.id, { status: fs }); recordSignal({ project_id: activeLoop?.project_id, tool: 'refine', signal_type: 'convergence_result', signal_data: { iterations: activeLoop.iterations.length, final_score: convergence?.total_issues || 0, converged: convergence.converged, critical_remaining: convergence?.critical_remaining || 0 } }); lazyEvalEngine().then(m => m.recordRefineEval({ ...activeLoop, status: fs })); }}>
                  마무리
                </Button>
              </div>
            </Card>
          )}

          {/* Completed state */}
          {activeLoop.status !== 'active' && (
            <>
              <Card className={activeLoop.status === 'converged' ? '!bg-[var(--collab)] !border-green-200' : ''}>
                <div className="flex items-center gap-2 mb-2">
                  {activeLoop.status === 'converged' ? <Check size={16} className="text-[var(--success)]" /> : <Square size={16} className="text-[var(--text-secondary)]" />}
                  <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                    {activeLoop.status === 'converged'
                      ? `수렴 완료 — ${activeLoop.iterations.length}회 반복`
                      : `중단 — ${activeLoop.iterations.length}회 반복`}
                  </p>
                </div>
                {latestIteration && (
                  <div className="mt-2">
                    <p className="text-[12px] font-semibold text-[var(--text-secondary)] mb-1">최종 문서</p>
                    <ShareBar getText={() => latestIteration.revised_plan} getTitle={() => '합주 최종 결과'} />
                  </div>
                )}
              </Card>

              {/* DQ Score Card */}
              <DQScoreCard loop={activeLoop} feedbackHistory={feedbackHistory} />

              {/* Cross-project: persona accuracy (only if outcome data exists) */}
              <PersonaAccuracyCard />

              {/* Retrospective questions */}
              <RetrospectiveCard loop={activeLoop} feedbackHistory={feedbackHistory} />

              {/* Outcome recording (Phase 1) */}
              <OutcomeRecordingCard loop={activeLoop} feedbackHistory={feedbackHistory} />

              {/* Next step: Synthesize */}
              {latestIteration && (
                <Card className="!border-[#9b5de5]/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-bold text-[var(--text-primary)]">다음 단계: 종합</p>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">여러 관점의 결과를 비교·통합하여 최종 판단을 내립니다.</p>
                    </div>
                    <button
                      onClick={() => {
                        useHandoffStore.getState().setHandoff({
                          from: 'refine',
                          content: latestIteration.revised_plan,
                        });
                        onNavigate('synthesize');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#9b5de5] text-white text-[13px] font-semibold shadow-sm hover:shadow-md hover:-translate-y-[1px] active:translate-y-0 transition-all cursor-pointer"
                    >
                      종합 <ArrowRight size={14} />
                    </button>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Retrospective Card ──
function RetrospectiveCard({ loop, feedbackHistory }: { loop: RefineLoop; feedbackHistory: FeedbackRecord[] }) {
  const { updateProject } = useProjectStore();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const questions = generateRetrospectiveQuestions(loop, feedbackHistory);

  if (questions.length === 0) return null;

  const handleSave = () => {
    // Record answers as quality signals
    const processAnswers: Record<string, string> = {};
    const judgmentAnswers: Record<string, string> = {};
    const learningAnswers: Record<string, string> = {};
    for (const q of questions) {
      if (answers[q.id]?.trim()) {
        recordSignal({
          project_id: loop.project_id,
          tool: 'refine',
          signal_type: 'retrospective_answer',
          signal_data: { question: q.question, answer: answers[q.id], category: q.category },
        });
        saveRetrospectiveAnswer({ project_id: loop.project_id, question_id: q.id, question_text: q.question, category: q.category, answer: answers[q.id], data_basis: q.data_basis });
        if (q.category === 'process') processAnswers[q.question] = answers[q.id];
        else if (q.category === 'judgment') judgmentAnswers[q.question] = answers[q.id];
        else learningAnswers[q.question] = answers[q.id];
      }
    }

    // Save to project meta_reflection
    if (loop.project_id) {
      const allAnswers = Object.values(answers).filter(a => a.trim());
      if (allAnswers.length > 0) {
        updateProject(loop.project_id, {
          meta_reflection: {
            understanding_change: Object.values(processAnswers)[0] || undefined,
            surprising_discovery: Object.values(learningAnswers)[0] || undefined,
            next_time_differently: Object.values(judgmentAnswers)[0] || undefined,
            created_at: new Date().toISOString(),
          },
        });
      }
    }
    setSaved(true);
  };

  if (saved) {
    return (
      <div className="flex items-center gap-2 text-[var(--success)] text-[12px] font-medium py-2">
        <Check size={14} /> 회고가 저장되었습니다
      </div>
    );
  }

  return (
    <Card className="!bg-[var(--bg)] !border-dashed">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb size={14} className="text-[var(--accent)]" />
        <p className="text-[13px] font-bold text-[var(--text-primary)]">이 프로젝트에서 배울 점</p>
      </div>
      <p className="text-[12px] text-[var(--text-secondary)] mb-4">데이터 기반으로 생성된 질문입니다. 답변하면 다음 프로젝트에 반영됩니다.</p>
      <div className="space-y-4">
        {questions.map((q) => (
          <div key={q.id}>
            <p className="text-[13px] font-semibold text-[var(--text-primary)] mb-1">{q.question}</p>
            <p className="text-[11px] text-[var(--text-secondary)] mb-1.5">{q.data_basis}</p>
            <textarea
              value={answers[q.id] || ''}
              onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
              placeholder="선택 사항 — 건너뛰어도 됩니다"
              className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:outline-none resize-none"
              rows={2}
              maxLength={1000}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-3">
        <Button size="sm" onClick={handleSave} disabled={Object.values(answers).every(a => !a.trim())}>
          회고 저장
        </Button>
      </div>
    </Card>
  );
}

// ── Issue checkbox component ──
function IssueCheckbox({ issue, selected, onToggle, variant }: {
  issue: { text: string; persona_name: string };
  selected: boolean;
  onToggle: () => void;
  variant: 'critical' | 'concern' | 'question';
}) {
  const styles = {
    critical: { bg: 'bg-[var(--danger)]/10', border: 'border-[var(--danger)]/20', text: 'text-[var(--danger)]' },
    concern: { bg: 'bg-[var(--checkpoint)]', border: 'border-[var(--risk-manageable)]/20', text: 'text-[var(--risk-manageable)]' },
    question: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
  };
  const s = styles[variant];
  return (
    <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
      selected ? 'border-[var(--accent)] bg-[var(--ai)]' : `${s.border} hover:border-[var(--accent)]`
    }`}>
      <input type="checkbox" checked={selected} onChange={onToggle} className="mt-0.5 accent-[var(--accent)]" />
      <div className="flex-1">
        <span className="text-[12px] font-semibold text-[var(--accent)]">[{issue.persona_name}]</span>
        <p className="text-[12px] text-[var(--text-primary)] mt-0.5">{issue.text}</p>
      </div>
    </label>
  );
}

// ── DQ Score Card ──
function DQScoreCard({ loop, feedbackHistory }: { loop: RefineLoop; feedbackHistory: FeedbackRecord[] }) {
  const [score, setScore] = useState<DecisionQualityScore | null>(null);
  const animatedDq = useCountUp(score?.overall_dq ?? 0);

  useEffect(() => {
    if (!loop.project_id || loop.status === 'active') return;
    const reframe = useReframeStore.getState().items.find(d => d.project_id === loop.project_id && d.status === 'done') || null;
    const recast = useRecastStore.getState().items.find(o => o.project_id === loop.project_id && o.status === 'done') || null;
    const judgments = useJudgmentStore.getState().judgments.filter(j => j.project_id === loop.project_id);
    const personas = usePersonaStore.getState().personas;
    const result = computeDecisionQuality({ reframe, recast, feedbackRecords: feedbackHistory.filter(fr => fr.project_id === loop.project_id), refineLoop: loop, judgments, personas, projectId: loop.project_id, force: true });
    setScore(result);
  }, [loop.project_id, loop.status, loop.iterations.length, feedbackHistory]);

  if (!score) return null;

  const elements = [
    { key: '프레이밍', value: score.appropriate_frame, max: 5, desc: '문제를 재정의했는가' },
    { key: '대안 탐색', value: score.creative_alternatives, max: 5, desc: '여러 가능성을 검토했는가' },
    { key: '정보 수집', value: score.relevant_information, max: 5, desc: '핵심 가정을 검증했는가' },
    { key: '이해관계자', value: score.clear_values, max: 5, desc: '다양한 관점을 반영했는가' },
    { key: '추론 건전성', value: score.sound_reasoning, max: 5, desc: '논리적으로 수렴했는가' },
    { key: '실행 구체성', value: score.commitment_to_action, max: 5, desc: '구체적 계획이 있는가' },
  ];

  const dqColor = score.overall_dq >= 70 ? 'var(--success)' : score.overall_dq >= 40 ? 'var(--accent)' : 'var(--danger)';

  return (
    <Card className="!bg-[var(--bg)] reward-entrance">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert size={14} className="text-[var(--accent)]" />
          <p className="text-[13px] font-bold text-[var(--text-primary)]">판단 품질 스코어</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[24px] font-extrabold animate-score-pop" style={{ color: dqColor }}>{animatedDq}</span>
          <span className="text-[11px] text-[var(--text-tertiary)]">/ 100</span>
        </div>
      </div>

      {/* Bar chart */}
      <div className="space-y-2 mb-4">
        {elements.map(el => (
          <div key={el.key} className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--text-secondary)] w-[72px] shrink-0 text-right">{el.key}</span>
            <div className="flex-1 h-[6px] bg-[var(--surface)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full animate-bar-grow"
                style={{ width: `${(el.value / el.max) * 100}%`, backgroundColor: el.value >= 4 ? 'var(--success)' : el.value >= 2 ? 'var(--accent)' : 'var(--danger)' }}
              />
            </div>
            <span className="text-[10px] text-[var(--text-tertiary)] w-[20px] shrink-0">{el.value}/{el.max}</span>
          </div>
        ))}
      </div>

      {/* Anti-sycophancy insights */}
      <div className="pt-3 border-t border-[var(--border-subtle)] space-y-1.5">
        <p className="text-[11px] font-semibold text-[var(--text-secondary)] mb-1">반론 효과</p>
        <div className="flex flex-wrap gap-2">
          {score.initial_framing_challenged && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--ai)] text-[var(--accent)] font-medium">초기 프레이밍 도전됨</span>
          )}
          {score.blind_spots_surfaced > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">사각지대 {score.blind_spots_surfaced}건 발견</span>
          )}
          {score.user_changed_mind && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">리허설 후 판단 수정</span>
          )}
          {!score.initial_framing_challenged && score.blind_spots_surfaced === 0 && !score.user_changed_mind && (
            <span className="text-[10px] text-[var(--text-tertiary)]">반론 효과 없음 — 다음엔 더 까다로운 페르소나를 시도하세요</span>
          )}
        </div>
      </div>

      {/* Inline trend + qualitative interpretation */}
      {(() => {
        const allScores = getDQScores();
        const dqElements = [
          { key: 'appropriate_frame' as const, label: '프레이밍' },
          { key: 'creative_alternatives' as const, label: '대안 탐색' },
          { key: 'relevant_information' as const, label: '정보 수집' },
          { key: 'clear_values' as const, label: '이해관계자' },
          { key: 'sound_reasoning' as const, label: '추론 건전성' },
          { key: 'commitment_to_action' as const, label: '실행 구체성' },
        ];

        // First use — counterfactual insight
        if (allScores.length < 2) {
          const strongest = dqElements.reduce((best, el) =>
            (score[el.key] || 0) > (score[best.key] || 0) ? el : best
          , dqElements[0]);
          const weakest = dqElements.reduce((worst, el) =>
            (score[el.key] || 0) < (score[worst.key] || 0) ? el : worst
          , dqElements[0]);
          return (strongest.key !== weakest.key) ? (
            <p className="mt-3 text-[11px] text-blue-600 dark:text-blue-400">
              ▸ 강점: {strongest.label} ({score[strongest.key]}/5). 만약 {weakest.label}을 더 보강했다면 전체 점수가 올라갔을 것.
            </p>
          ) : null;
        }

        // Returning user — trend + attribution
        const sorted = [...allScores].sort((a, b) => a.created_at.localeCompare(b.created_at));
        const prev = sorted[sorted.length - 2];
        const diff = score.overall_dq - prev.overall_dq;
        if (diff === 0) return null;

        let biggestChangeLabel = '';
        let biggestDelta = 0;
        for (const { key, label } of dqElements) {
          const delta = Math.abs((score[key] || 0) - (prev[key] || 0));
          if (delta > biggestDelta) { biggestDelta = delta; biggestChangeLabel = label; }
        }

        const arrow = diff > 0 ? '↑' : '↓';
        const color = diff > 0 ? 'var(--success)' : 'var(--danger)';
        return (
          <div className="mt-3 space-y-0.5">
            <p className="text-[11px] font-medium" style={{ color }}>
              {arrow} 이전 프로젝트 대비 {diff > 0 ? '+' : ''}{diff}p
            </p>
            {biggestChangeLabel && (
              <p className="text-[11px]" style={{ color: diff > 0 ? 'var(--success)' : 'var(--danger)', opacity: 0.8 }}>
                ▸ {diff > 0 ? '가장 큰 개선' : '하락 원인'}: {biggestChangeLabel}
              </p>
            )}
          </div>
        );
      })()}

      <p className="mt-2 text-[10px] text-[var(--text-tertiary)]">
        DQ 스코어는 결과와 독립적으로 의사결정 프로세스의 품질을 측정합니다. — Spetzler (2016)
      </p>
    </Card>
  );
}

// ── Persona Accuracy Card (cross-project) ──
function PersonaAccuracyCard() {
  const outcomes = getOutcomeRecords();
  const personas = usePersonaStore.getState().personas;
  if (outcomes.length === 0) return null;

  const accuracy = analyzePersonaPredictionAccuracy(outcomes, personas);
  if (accuracy.length === 0) return null;

  return (
    <Card className="!bg-[var(--surface)]">
      <div className="flex items-center gap-2 mb-3">
        <Target size={14} className="text-[var(--accent)]" />
        <p className="text-[13px] font-bold text-[var(--text-primary)]">페르소나 예측 정확도</p>
        <span className="text-[11px] text-[var(--text-tertiary)] ml-auto">{outcomes.length}개 프로젝트</span>
      </div>

      <div className="space-y-2">
        {accuracy.slice(0, 5).map(pa => {
          const pct = Math.round(pa.accuracy_rate * 100);
          const color = pct >= 60 ? 'var(--success)' : pct >= 30 ? 'var(--accent)' : 'var(--text-tertiary)';
          return (
            <div key={pa.persona_id} className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--text-secondary)] w-[80px] shrink-0 truncate text-right">{pa.persona_name}</span>
              <div className="flex-1 h-[6px] bg-[var(--surface)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
                <div
                  className="h-full rounded-full animate-bar-grow"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
              <span className="text-[10px] text-[var(--text-tertiary)] w-[36px] shrink-0">{pa.risks_materialized}/{pa.total_risks_predicted}</span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[10px] text-[var(--text-tertiary)]">
        예측한 리스크 중 실제 발생 비율. 높을수록 페르소나가 현실을 잘 반영합니다.
      </p>
    </Card>
  );
}

// ── Outcome Recording Card (Phase 1) ──
function OutcomeRecordingCard({ loop, feedbackHistory }: { loop: RefineLoop; feedbackHistory: FeedbackRecord[] }) {
  const existing = getOutcomeRecords(loop.project_id);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const initialRisks = buildRiskChecklist(feedbackHistory.filter(fr => fr.project_id === loop.project_id));
  const [risks, setRisks] = useState<MaterializedRisk[]>(initialRisks);
  const [hypothesisResult, setHypothesisResult] = useState<'confirmed' | 'partially_confirmed' | 'refuted' | 'not_testable'>('not_testable');
  const [hypothesisNotes, setHypothesisNotes] = useState('');
  const [overallSuccess, setOverallSuccess] = useState<'exceeded' | 'met' | 'partial' | 'failed'>('met');
  const [keyLearnings, setKeyLearnings] = useState('');

  if (existing.length > 0 || saved) {
    const allOutcomes = getOutcomeRecords();
    const allDq = getDQScores();
    const correlation = allOutcomes.length >= 2 && allDq.length >= 2
      ? correlateDQWithOutcomes(allDq, allOutcomes)
      : null;

    return (
      <div className="py-2 space-y-1.5">
        <div className="flex items-center gap-2 text-[var(--success)] text-[12px] font-medium">
          <Check size={14} /> 실행 결과가 기록되었습니다
        </div>
        {correlation && correlation.sample_size >= 4 && (
          <p className="text-[11px] text-[var(--text-secondary)] pl-6">{correlation.insight}</p>
        )}
      </div>
    );
  }

  const handleSave = () => {
    saveOutcomeRecord({
      project_id: loop.project_id,
      hypothesis_result: hypothesisResult,
      hypothesis_notes: hypothesisNotes,
      materialized_risks: risks,
      approval_outcomes: [],
      overall_success: overallSuccess,
      key_learnings: keyLearnings,
      what_would_change: '',
    });
    setSaved(true);
  };

  const toggleRisk = (idx: number) => {
    setRisks(prev => prev.map((r, i) => i === idx ? { ...r, actually_happened: !r.actually_happened } : r));
  };

  if (!expanded) {
    return (
      <Card className="!bg-[var(--bg)] !border-dashed">
        <button onClick={() => setExpanded(true)} className="w-full flex items-center justify-between text-left">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-[var(--accent)]" />
            <p className="text-[13px] font-bold text-[var(--text-primary)]">실행 결과 기록</p>
          </div>
          <ChevronDown size={14} className="text-[var(--text-secondary)]" />
        </button>
        <p className="text-[11px] text-[var(--text-secondary)] mt-1">실행 후 결과를 기록하면 페르소나 예측 정확도와 의사결정 품질을 추적할 수 있습니다.</p>
      </Card>
    );
  }

  return (
    <Card className="!bg-[var(--bg)] !border-dashed">
      <div className="flex items-center gap-2 mb-3">
        <FileText size={14} className="text-[var(--accent)]" />
        <p className="text-[13px] font-bold text-[var(--text-primary)]">실행 결과 기록</p>
      </div>

      {/* Overall success */}
      <div className="mb-4">
        <p className="text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5">전반적 결과</p>
        <div className="flex gap-2 flex-wrap">
          {([['exceeded', '기대 이상'], ['met', '목표 달성'], ['partial', '부분 달성'], ['failed', '실패']] as const).map(([val, label]) => (
            <button key={val} onClick={() => setOverallSuccess(val)}
              className={`px-3 py-1.5 rounded-lg text-[12px] border transition-colors ${overallSuccess === val ? 'bg-[var(--ai)] border-[var(--accent)] text-[var(--accent)] font-semibold' : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)]'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Hypothesis result */}
      <div className="mb-4">
        <p className="text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5">가설 검증</p>
        <div className="flex gap-2 flex-wrap mb-2">
          {([['confirmed', '확인됨'], ['partially_confirmed', '부분 확인'], ['refuted', '반증됨'], ['not_testable', '검증 불가']] as const).map(([val, label]) => (
            <button key={val} onClick={() => setHypothesisResult(val)}
              className={`px-3 py-1.5 rounded-lg text-[12px] border transition-colors ${hypothesisResult === val ? 'bg-[var(--ai)] border-[var(--accent)] text-[var(--accent)] font-semibold' : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)]'}`}>
              {label}
            </button>
          ))}
        </div>
        <textarea value={hypothesisNotes} onChange={e => setHypothesisNotes(e.target.value)} placeholder="가설에 대한 메모 (선택)" className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12px] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:outline-none resize-none" rows={2} maxLength={1000} />
      </div>

      {/* Risk materialization checklist */}
      {risks.length > 0 && (
        <div className="mb-4">
          <p className="text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5">예측된 리스크 — 실제로 일어났나요?</p>
          <div className="space-y-1.5">
            {risks.map((risk, idx) => (
              <label key={idx} className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${risk.actually_happened ? 'border-[var(--danger)]/40 bg-[var(--danger)]/5' : 'border-[var(--border)] hover:border-[var(--accent)]'}`}>
                <input type="checkbox" checked={risk.actually_happened} onChange={() => toggleRisk(idx)} className="mt-0.5 accent-[var(--danger)]" />
                <div className="flex-1">
                  <span className={`text-[10px] font-bold uppercase ${risk.category === 'critical' ? 'text-[var(--danger)]' : risk.category === 'unspoken' ? 'text-purple-600' : 'text-amber-600'}`}>{risk.category}</span>
                  <p className="text-[12px] text-[var(--text-primary)]">{risk.risk_text}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Key learnings */}
      <div className="mb-4">
        <p className="text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5">핵심 배운 점</p>
        <textarea value={keyLearnings} onChange={e => setKeyLearnings(e.target.value)} placeholder="이 프로젝트에서 가장 중요하게 배운 것 (선택)" className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12px] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:outline-none resize-none" rows={2} maxLength={1000} />
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave}>
          <Check size={12} /> 결과 기록
        </Button>
      </div>
    </Card>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRefinementStore } from '@/stores/useRefinementStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { usePersonaStore } from '@/stores/usePersonaStore';
import { useOrchestrateStore } from '@/stores/useOrchestrateStore';
import { ContextChainBlock } from './ContextChainBlock';
import { ConvergenceChart } from './ConvergenceChart';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { callLLMJson } from '@/lib/llm';
import { matchIssuesAcrossIterations } from '@/lib/convergence';
import { generateId } from '@/lib/uuid';
import type { RefinementIssue } from '@/stores/types';
import { RefreshCw, Check, AlertTriangle, TrendingUp, ArrowRight, Play, Square, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

const REFINEMENT_PROMPT = `당신은 전략기획 리뷰 전문가입니다. 이전 계획에 대한 이해관계자의 피드백을 반영하여 개선안을 만들어야 합니다.

아래 JSON 구조로 응답하세요.

1. delta_summary: 이번 반복에서 무엇을 어떻게 변경했는지 2-3문장 요약
2. adjustments: 구체적 변경사항 배열. 각 항목: { area: 변경 영역, change: 무엇을 어떻게 변경했는지 }
3. predicted_concerns: 변경 후에도 이해관계자가 여전히 우려할 수 있는 사항들 (문자열 배열). 해결된 것은 제외하고 남아있거나 새로 발생할 우려만.

반드시 JSON만 응답하세요.`;

interface RefinementResult {
  delta_summary: string;
  adjustments: Array<{ area: string; change: string }>;
  predicted_concerns: string[];
}

interface RefinementLoopStepProps {
  onNavigate: (step: string) => void;
}

export function RefinementLoopStep({ onNavigate }: RefinementLoopStepProps) {
  const { loops, activeLoopId, loadLoops, setActiveLoopId, updateLoop, addIteration, checkConvergence, deleteLoop } = useRefinementStore();
  const { projects, loadProjects } = useProjectStore();
  const { personas, feedbackHistory, loadData: loadPersonaData } = usePersonaStore();
  const { items: orchestrateItems, loadItems: loadOrchestrate } = useOrchestrateStore();

  const [expandedIteration, setExpandedIteration] = useState<number | null>(null);
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLoops();
    loadProjects();
    loadPersonaData();
    loadOrchestrate();
  }, [loadLoops, loadProjects, loadPersonaData, loadOrchestrate]);

  const activeLoop = loops.find((l) => l.id === activeLoopId);
  const convergence = activeLoop ? checkConvergence(activeLoop.id) : null;
  const latestIteration = activeLoop?.iterations[activeLoop.iterations.length - 1];

  const unresolvedIssues = latestIteration
    ? latestIteration.issues_from_feedback
        .filter((i) => !i.resolved)
        .sort((a, b) => {
          const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
          const pA = personas.find(p => p.id === a.source_persona_id);
          const pB = personas.find(p => p.id === b.source_persona_id);
          return (order[pA?.influence || 'medium'] || 1) - (order[pB?.influence || 'medium'] || 1);
        })
    : [];

  const toggleIssue = (id: string) => {
    setSelectedIssues((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /**
   * Cost-optimized iteration: 1 LLM call that produces refinement + predicted concerns.
   * Then uses matchIssuesAcrossIterations to compute convergence.
   */
  const handleRunIteration = async () => {
    if (!activeLoop || !latestIteration || selectedIssues.size === 0) return;

    setIsRefining(true);
    setError('');

    const issues = unresolvedIssues.filter((i) => selectedIssues.has(i.id));
    const constraintText = issues.map((i) => `- [${i.source_persona_name}] ${i.text}`).join('\n');

    // Build context from previous iterations
    const prevAdjustments = activeLoop.iterations
      .filter(iter => iter.delta_summary)
      .map(iter => `반복 ${iter.iteration_number}: ${iter.delta_summary}`)
      .join('\n');

    const prompt = `[목표]\n${activeLoop.goal}\n\n${prevAdjustments ? `[이전 반복의 변경사항]\n${prevAdjustments}\n\n` : ''}[이번에 반영해야 할 이해관계자 피드백]\n${constraintText}\n\n위 피드백을 반영한 개선안을 만들어주세요.`;

    try {
      const result = await callLLMJson<RefinementResult>(
        [{ role: 'user', content: prompt }],
        { system: REFINEMENT_PROMPT, maxTokens: 1500 }
      );

      // Use matchIssuesAcrossIterations to compute convergence
      const previousIssues = latestIteration.issues_from_feedback;
      const { resolved, persisting, newIssues } = matchIssuesAcrossIterations(
        previousIssues,
        result.predicted_concerns
      );

      // Build new issues list
      const newIterationIssues: RefinementIssue[] = [];

      // Mark resolved issues
      for (const prev of previousIssues) {
        if (resolved.includes(prev.text)) {
          newIterationIssues.push({ ...prev, resolved: true, resolved_at_iteration: activeLoop.iterations.length + 1 });
        } else if (persisting.includes(prev.text)) {
          newIterationIssues.push({ ...prev });
        } else {
          // Issues not selected for this round — carry forward
          newIterationIssues.push({ ...prev });
        }
      }

      // Add genuinely new issues
      for (const concern of newIssues) {
        newIterationIssues.push({
          id: generateId(),
          source_persona_id: '',
          source_persona_name: 'AI 예측',
          category: 'concern',
          text: concern,
          resolved: false,
        });
      }

      const unresolvedCount = newIterationIssues.filter(i => !i.resolved).length;
      const totalCount = newIterationIssues.length;
      const convergenceScore = totalCount > 0 ? 1 - (unresolvedCount / totalCount) : 1;

      addIteration(activeLoop.id, {
        iteration_number: activeLoop.iterations.length + 1,
        trigger_reason: `${issues.length}건의 이슈 반영`,
        issues_from_feedback: newIterationIssues,
        constraints_added: issues.map(i => i.text),
        delta_summary: result.delta_summary,
        unresolved_count: unresolvedCount,
        total_issue_count: totalCount,
        convergence_score: convergenceScore,
      });

      setSelectedIssues(new Set());
      setExpandedIteration(activeLoop.iterations.length); // Expand the new iteration
    } catch (err) {
      setError(err instanceof Error ? err.message : '개선안을 생성할 수 없었습니다. 다시 시도해주세요.');
    } finally {
      setIsRefining(false);
    }
  };

  const handleStopLoop = () => {
    if (!activeLoop) return;
    updateLoop(activeLoop.id, { status: 'stopped_by_user' });
  };

  const handleMarkConverged = () => {
    if (!activeLoop) return;
    updateLoop(activeLoop.id, { status: 'converged' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-bold text-[var(--text-primary)]">합주 연습 <span className="text-[16px] font-normal text-[var(--text-secondary)]">| 피드백 반영</span></h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">
          이해관계자 피드백을 반영하여 반복적으로 개선합니다. 수렴할 때까지.
        </p>
      </div>

      {/* Loop list */}
      {!activeLoop && (
        <div className="space-y-3">
          {loops.length === 0 ? (
            <Card className="text-center py-12">
              <RefreshCw size={24} className="mx-auto text-[var(--text-secondary)] mb-3" />
              <p className="text-[var(--text-secondary)] text-[14px] font-medium">아직 합주가 시작되지 않았습니다.</p>
              <p className="text-[var(--text-secondary)] text-[12px] mt-1 max-w-xs mx-auto">
                리허설에서 이해관계자 피드백을 받은 뒤, 그 피드백을 반영하여 반복 개선하는 단계입니다.
              </p>
              <button
                onClick={() => onNavigate('persona-feedback')}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity cursor-pointer"
              >
                리허설 먼저 진행하기 <ArrowRight size={14} />
              </button>
            </Card>
          ) : (
            loops.map((loop) => {
              const project = projects.find((p) => p.id === loop.project_id);
              const conv = checkConvergence(loop.id);
              return (
                <Card key={loop.id} hoverable onClick={() => setActiveLoopId(loop.id)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[15px] font-bold text-[var(--text-primary)]">{loop.name}</h3>
                        <Badge variant={loop.status === 'active' ? 'ai' : loop.status === 'converged' ? 'both' : 'default'}>
                          {loop.status === 'active' ? '진행 중' : loop.status === 'converged' ? '하모니 완성' : '중단됨'}
                        </Badge>
                      </div>
                      {project && <p className="text-[12px] text-[var(--text-secondary)]">{project.name}</p>}
                      <p className="text-[12px] text-[var(--text-secondary)] mt-1">
                        반복 {loop.iterations.length}/{loop.max_iterations} · 수렴률 {Math.round(conv.score * 100)}%
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

      {/* Active loop detail */}
      {activeLoop && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <button onClick={() => setActiveLoopId(null)} className="text-[12px] text-[var(--accent)] hover:underline cursor-pointer">
              ← 목록으로
            </button>
            <Badge variant={activeLoop.status === 'active' ? 'ai' : 'both'}>
              {activeLoop.status === 'active' ? '진행 중' : activeLoop.status === 'converged' ? '수렴 완료' : '중단됨'}
            </Badge>
          </div>

          {/* Loop header */}
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw size={16} className="text-[var(--accent)]" />
              <h2 className="text-[17px] font-bold text-[var(--text-primary)]">{activeLoop.name}</h2>
            </div>
            <p className="text-[13px] text-[var(--text-secondary)]">{activeLoop.goal}</p>
          </Card>

          {/* Context chain */}
          {(() => {
            const projectOrch = orchestrateItems.find(o => o.project_id === activeLoop.project_id && o.analysis);
            const latestFb = feedbackHistory.find(f => f.project_id === activeLoop.project_id);
            if (!projectOrch?.analysis && !latestFb) return null;
            const items = [];
            if (projectOrch?.analysis?.key_assumptions && projectOrch.analysis.key_assumptions.length > 0) {
              items.push({
                label: '편곡의 핵심 가정',
                count: projectOrch.analysis.key_assumptions.length,
                details: projectOrch.analysis.key_assumptions.map((ka: { assumption: string }) => ka.assumption),
              });
            }
            const criticalRisks = latestFb?.results.flatMap(r =>
              (r.classified_risks || []).filter(cr => cr.category === 'critical')
            ) || [];
            if (criticalRisks.length > 0) {
              items.push({ label: '핵심 위협', count: criticalRisks.length, details: criticalRisks.map(r => r.text), color: 'text-[var(--risk-critical)]' });
            }
            return items.length > 0 ? <ContextChainBlock summary="리허설에서 발견된 이슈들을 이 합주에서 해결합니다." items={items} /> : null;
          })()}

          {/* Convergence bar */}
          {convergence && (
            <Card className={`!p-4 ${convergence.shouldStop ? '!bg-[var(--collab)]' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-bold text-[var(--text-primary)]">수렴 분석</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-semibold text-[var(--accent)]">
                    {Math.round(convergence.score * 100)}% / {Math.round(activeLoop.convergence_threshold * 100)}%
                  </span>
                  {activeLoop.iterations.length >= 2 && (() => {
                    const prev = activeLoop.iterations[activeLoop.iterations.length - 2].convergence_score;
                    const curr = activeLoop.iterations[activeLoop.iterations.length - 1].convergence_score;
                    const delta = curr - prev;
                    if (delta === 0) return null;
                    return delta > 0 ? <TrendingUp size={12} className="text-[var(--success)]" /> : <span className="text-red-500"><TrendingUp size={12} className="rotate-180" /></span>;
                  })()}
                </div>
              </div>
              <div className="h-2.5 bg-[var(--border)] rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all ${convergence.score >= activeLoop.convergence_threshold ? 'bg-[var(--success)]' : 'bg-[var(--accent)]'}`}
                  style={{ width: `${Math.min(convergence.score * 100, 100)}%` }}
                />
              </div>
              <div className="flex items-center gap-2">
                {convergence.recommendation === 'stop' ? <TrendingUp size={13} className="text-[var(--success)]" /> : convergence.recommendation === 'one_more' ? <AlertTriangle size={13} className="text-amber-600" /> : null}
                <p className="text-[12px] text-[var(--text-secondary)]">{convergence.reason}</p>
              </div>
            </Card>
          )}

          <ConvergenceChart iterations={activeLoop.iterations} threshold={activeLoop.convergence_threshold} />

          {/* Iterations timeline */}
          <div className="space-y-3">
            <h3 className="text-[14px] font-bold text-[var(--text-primary)]">반복 이력</h3>
            {activeLoop.iterations.map((iter, i) => {
              const prevIter = i > 0 ? activeLoop.iterations[i - 1] : null;
              const convergenceDelta = prevIter ? iter.convergence_score - prevIter.convergence_score : iter.convergence_score;
              const resolvedCount = iter.total_issue_count - iter.unresolved_count;
              const newIssues = iter.issues_from_feedback.filter(issue => !issue.resolved && (!prevIter || !prevIter.issues_from_feedback.some(pi => pi.text === issue.text)));

              return (
                <Card key={i} className={`!p-4 ${expandedIteration === i ? '!border-[var(--accent)]' : ''}`}>
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedIteration(expandedIteration === i ? null : i)}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold ${
                        iter.convergence_score > 0.7 ? 'bg-[var(--collab)] text-[var(--success)]' : 'bg-[var(--ai)] text-[#2d4a7c]'
                      }`}>{iter.iteration_number}</div>
                      <div>
                        <p className="text-[13px] font-semibold text-[var(--text-primary)]">반복 {iter.iteration_number}</p>
                        <div className="flex items-center gap-2 text-[11px] mt-0.5">
                          <span className="text-[var(--success)]">{resolvedCount}건 해결</span>
                          <span className="text-amber-600">{iter.unresolved_count}건 미해결</span>
                          {newIssues.length > 0 && <span className="text-blue-600">{newIssues.length}건 새 이슈</span>}
                          <span className={`font-bold ${convergenceDelta > 0 ? 'text-[var(--success)]' : convergenceDelta < 0 ? 'text-red-500' : 'text-[var(--text-secondary)]'}`}>
                            {convergenceDelta > 0 ? '+' : ''}{Math.round(convergenceDelta * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${iter.convergence_score * 100}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-[var(--text-secondary)]">{Math.round(iter.convergence_score * 100)}%</span>
                      {expandedIteration === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </div>

                  {expandedIteration === i && (
                    <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-3 animate-fade-in">
                      {iter.delta_summary && (
                        <p className="text-[12px] text-[var(--text-primary)] bg-[var(--bg)] rounded-lg px-3 py-2">
                          <span className="font-semibold">변경사항:</span> {iter.delta_summary}
                        </p>
                      )}
                      <div className="space-y-1">
                        {iter.issues_from_feedback.map((issue) => (
                          <div key={issue.id} className="flex items-start gap-2 text-[12px]">
                            {issue.resolved ? <Check size={12} className="text-[var(--success)] mt-0.5 shrink-0" /> : <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />}
                            <span className={issue.resolved ? 'text-[var(--text-secondary)] line-through' : 'text-[var(--text-primary)]'}>
                              <span className="font-medium text-[var(--accent)]">[{issue.source_persona_name}]</span> {issue.text}
                            </span>
                          </div>
                        ))}
                      </div>
                      {prevIter && (
                        <div className="border-t border-[var(--border)] pt-2 mt-2">
                          <div className="grid grid-cols-3 gap-2 text-[11px]">
                            <div className="bg-[var(--collab)] rounded-lg p-2 text-center">
                              <p className="font-bold text-[var(--success)]">{resolvedCount - (prevIter.total_issue_count - prevIter.unresolved_count)}건</p>
                              <p className="text-[var(--success)] text-[9px]">새로 해결</p>
                            </div>
                            <div className="bg-[var(--checkpoint)] rounded-lg p-2 text-center">
                              <p className="font-bold text-amber-700">{iter.unresolved_count}건</p>
                              <p className="text-amber-600 text-[9px]">미해결</p>
                            </div>
                            <div className="bg-[var(--ai)] rounded-lg p-2 text-center">
                              <p className="font-bold text-[#2d4a7c]">{newIssues.length}건</p>
                              <p className="text-[#2d4a7c] text-[9px]">새 이슈</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Next iteration controls */}
          {activeLoop.status === 'active' && (
            <Card className="!border-amber-200 !bg-[var(--checkpoint)]">
              <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-3">다음 반복</h3>

              {isRefining ? (
                <div className="flex items-center gap-3 py-4">
                  <Loader2 size={16} className="animate-spin text-[var(--accent)]" />
                  <p className="text-[13px] text-[var(--text-secondary)]">피드백을 반영하여 개선안을 생성하고 있습니다...</p>
                </div>
              ) : unresolvedIssues.length > 0 ? (
                <>
                  <p className="text-[12px] text-[var(--text-secondary)] mb-3">
                    해결할 이슈를 선택하세요. AI가 개선안을 생성하고 수렴률을 계산합니다.
                  </p>
                  <div className="space-y-1.5 mb-4">
                    {unresolvedIssues.map((issue) => (
                      <label
                        key={issue.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          selectedIssues.has(issue.id) ? 'border-[var(--accent)] bg-[var(--ai)]' : 'border-[var(--border)] hover:border-[var(--accent)]'
                        }`}
                      >
                        <input type="checkbox" checked={selectedIssues.has(issue.id)} onChange={() => toggleIssue(issue.id)} className="mt-0.5 accent-[var(--accent)]" />
                        <div>
                          <span className="text-[12px] font-semibold text-[var(--accent)]">[{issue.source_persona_name}]</span>
                          {(() => {
                            const p = personas.find(persona => persona.id === issue.source_persona_id);
                            if (p?.influence === 'high') return <span className="text-[10px] text-red-600 font-bold ml-0.5">높음</span>;
                            return null;
                          })()}
                          <span className="text-[12px] text-[var(--text-primary)] ml-1">{issue.text}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-[13px] text-[var(--text-secondary)] mb-3">
                  미해결 이슈가 없습니다. 루프를 완료하세요.
                </p>
              )}

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-[13px] bg-red-50 rounded-lg px-3 py-2 mb-3">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button variant="danger" size="sm" onClick={handleStopLoop}>
                    <Square size={12} /> 연습 중단
                  </Button>
                  {convergence && convergence.score > 0.5 && (
                    <Button variant="secondary" size="sm" onClick={handleMarkConverged}>
                      <Check size={12} /> 하모니 완성
                    </Button>
                  )}
                </div>
                {selectedIssues.size > 0 && !isRefining && (
                  <Button size="sm" onClick={handleRunIteration}>
                    <Play size={12} /> {selectedIssues.size}건 반영하여 개선
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Stopped/converged state */}
          {activeLoop.status !== 'active' && (
            <Card className={activeLoop.status === 'converged' ? '!bg-[var(--collab)] !border-green-200' : ''}>
              <div className="flex items-center gap-2">
                {activeLoop.status === 'converged' ? <Check size={16} className="text-[var(--success)]" /> : <Square size={16} className="text-[var(--text-secondary)]" />}
                <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                  {activeLoop.status === 'converged'
                    ? `하모니 완성 — ${activeLoop.iterations.length}회 합주, 수렴률 ${Math.round((convergence?.score || 0) * 100)}%`
                    : `연습 중단 — ${activeLoop.iterations.length}회 합주`}
                </p>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

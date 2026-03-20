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
import { matchIssuesAcrossIterations, calculateWeightedScore } from '@/lib/convergence';
import { generateId } from '@/lib/uuid';
import type { RefinementIssue } from '@/stores/types';
import { RefreshCw, Check, AlertTriangle, ArrowRight, Play, Square, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { track } from '@/lib/analytics';

const SEVERITY_LABELS = { blocker: '차단', improvement: '개선', nice_to_have: '참고' } as const;
const SEVERITY_COLORS = {
  blocker: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', border: 'border-red-200' },
  improvement: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', border: 'border-amber-200' },
  nice_to_have: { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-400', border: 'border-blue-200' },
} as const;

const QUICK_PROMPT = `당신은 전략기획 리뷰 전문가입니다. 이전 계획에 대한 이해관계자 피드백을 반영하여 개선안을 만드세요.

아래 JSON 구조로 응답하세요.
1. delta_summary: 무엇을 어떻게 변경했는지 2-3문장 (구체적으로)
2. predicted_concerns: 변경 후에도 남아있거나 새로 발생할 우려사항 (문자열 배열). 해결된 것은 절대 포함하지 마세요.

반드시 JSON만 응답하세요.`;

const DEEP_PROMPT = `당신은 전략기획 심층 분석 전문가입니다. 이해관계자 피드백을 반영하여 구체적이고 검증 가능한 개선안을 만드세요.

[분석 원칙]
- 각 이슈에 대해 근본 원인을 파악하고, 단순 대응이 아닌 구조적 해결을 제시하세요.
- 변경의 근거를 데이터나 논리로 뒷받침하세요.
- 대안적 접근도 검토한 후 최선안을 선택하세요.
- 이 개선안이 유효하려면 어떤 데이터가 추가로 필요한지 밝히세요.

아래 JSON 구조로 응답하세요.
1. delta_summary: 핵심 변경사항 2-3문장
2. deep_analysis: 각 이슈별 분석 과정과 해결 근거를 서술 (왜 이 접근인지, 어떤 대안을 검토했는지, 어떤 데이터로 뒷받침하는지). 3-5문단.
3. data_gaps: 이 개선안을 더 강화하려면 확인해야 할 데이터나 검증 포인트 (문자열 배열, 2-4개)
4. predicted_concerns: 변경 후에도 남아있거나 새로 발생할 우려사항 (문자열 배열). 해결된 것은 절대 포함하지 마세요.

반드시 JSON만 응답하세요.`;

interface RefinementResult {
  delta_summary: string;
  deep_analysis?: string;
  data_gaps?: string[];
  predicted_concerns: string[];
}

interface RefinementLoopStepProps {
  onNavigate: (step: string) => void;
}

export function RefinementLoopStep({ onNavigate }: RefinementLoopStepProps) {
  const { loops, activeLoopId, loadLoops, setActiveLoopId, updateLoop, addIteration, checkConvergence } = useRefinementStore();
  const { projects, loadProjects } = useProjectStore();
  const { personas, feedbackHistory, loadData: loadPersonaData } = usePersonaStore();
  const { items: orchestrateItems, loadItems: loadOrchestrate } = useOrchestrateStore();

  const [expandedIteration, setExpandedIteration] = useState<number | null>(null);
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState('');
  const [userDirective, setUserDirective] = useState('');
  const [depth, setDepth] = useState<'quick' | 'deep'>('quick');

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
          const severityOrder: Record<string, number> = { blocker: 0, improvement: 1, nice_to_have: 2 };
          return (severityOrder[a.severity] || 1) - (severityOrder[b.severity] || 1);
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

  const handleRunIteration = async () => {
    if (!activeLoop || !latestIteration || selectedIssues.size === 0) return;

    setIsRefining(true);
    setError('');

    const issues = unresolvedIssues.filter((i) => selectedIssues.has(i.id));
    const constraintText = issues
      .map((i) => `- [${SEVERITY_LABELS[i.severity]}][${i.source_persona_name}] ${i.text}`)
      .join('\n');

    const prevAdjustments = activeLoop.iterations
      .filter(iter => iter.delta_summary && iter.iteration_number > 1)
      .map(iter => `반복 ${iter.iteration_number}: ${iter.delta_summary}`)
      .join('\n');

    const directivePart = userDirective.trim()
      ? `\n\n[사용자 지시]\n${userDirective.trim()}`
      : '';

    const prompt = `[목표]\n${activeLoop.goal}\n\n${prevAdjustments ? `[이전 변경사항]\n${prevAdjustments}\n\n` : ''}[이번에 반영할 피드백 (${issues.length}건)]\n${constraintText}${directivePart}\n\n위 피드백을 반영한 개선안을 만들어주세요.`;

    try {
      const isDeep = depth === 'deep';
      const result = await callLLMJson<RefinementResult>(
        [{ role: 'user', content: prompt }],
        { system: isDeep ? DEEP_PROMPT : QUICK_PROMPT, maxTokens: isDeep ? 3500 : 1500 }
      );

      const previousIssues = latestIteration.issues_from_feedback;
      const { resolved, persisting, newIssues } = matchIssuesAcrossIterations(previousIssues, result.predicted_concerns);

      const newIterationIssues: RefinementIssue[] = [];
      for (const prev of previousIssues) {
        if (resolved.includes(prev.text)) {
          newIterationIssues.push({ ...prev, resolved: true, resolved_at_iteration: activeLoop.iterations.length + 1 });
        } else {
          newIterationIssues.push({ ...prev });
        }
      }
      for (const concern of newIssues) {
        newIterationIssues.push({
          id: generateId(),
          source_persona_id: '',
          source_persona_name: 'AI 예측',
          category: 'concern',
          severity: 'improvement',
          text: concern,
          resolved: false,
        });
      }

      const { score } = calculateWeightedScore(newIterationIssues);
      const unresolvedCount = newIterationIssues.filter(i => !i.resolved).length;

      addIteration(activeLoop.id, {
        iteration_number: activeLoop.iterations.length + 1,
        trigger_reason: `${issues.length}건 반영 (차단 ${issues.filter(i => i.severity === 'blocker').length}건)`,
        issues_from_feedback: newIterationIssues,
        constraints_added: issues.map(i => i.text),
        user_directive: userDirective.trim() || undefined,
        depth,
        delta_summary: result.delta_summary,
        deep_analysis: result.deep_analysis,
        data_gaps: result.data_gaps,
        unresolved_count: unresolvedCount,
        total_issue_count: newIterationIssues.length,
        convergence_score: score,
      });

      setSelectedIssues(new Set());
      setUserDirective('');
      setExpandedIteration(activeLoop.iterations.length);
      track('iteration_complete', { iteration: activeLoop.iterations.length + 1, convergence: Math.round(score * 100), issues_addressed: issues.length });
    } catch (err) {
      setError(err instanceof Error ? err.message : '개선안을 생성할 수 없었습니다.');
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-bold text-[var(--text-primary)]">합주 연습 <span className="text-[16px] font-normal text-[var(--text-secondary)]">| 피드백 반영</span></h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">
          이해관계자 피드백을 반복적으로 반영하여 수렴할 때까지 개선합니다.
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
                리허설에서 이해관계자 피드백을 받은 뒤, 피드백을 반영하여 반복 개선하는 단계입니다.
              </p>
              <button onClick={() => onNavigate('persona-feedback')} className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity cursor-pointer">
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
                      <p className="text-[12px] text-[var(--text-secondary)] mt-1">반복 {loop.iterations.length}/{loop.max_iterations} · 수렴률 {Math.round(conv.score * 100)}%</p>
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
      {activeLoop && convergence && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <button onClick={() => setActiveLoopId(null)} className="text-[12px] text-[var(--accent)] hover:underline cursor-pointer">← 목록으로</button>
            <Badge variant={activeLoop.status === 'active' ? 'ai' : 'both'}>
              {activeLoop.status === 'active' ? '진행 중' : activeLoop.status === 'converged' ? '수렴 완료' : '중단됨'}
            </Badge>
          </div>

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
            if (projectOrch?.analysis?.key_assumptions?.length) {
              items.push({ label: '편곡의 핵심 가정', count: projectOrch.analysis.key_assumptions.length, details: projectOrch.analysis.key_assumptions.map((ka: { assumption: string }) => ka.assumption) });
            }
            const criticalRisks = latestFb?.results.flatMap(r => (r.classified_risks || []).filter(cr => cr.category === 'critical')) || [];
            if (criticalRisks.length > 0) items.push({ label: '핵심 위협', count: criticalRisks.length, details: criticalRisks.map(r => r.text), color: 'text-[var(--risk-critical)]' });
            return items.length > 0 ? <ContextChainBlock summary="리허설에서 발견된 이슈들을 해결합니다." items={items} /> : null;
          })()}

          {/* ═══ Convergence Dashboard ═══ */}
          <Card className={`!p-4 ${convergence.shouldStop ? '!bg-[var(--collab)]' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-bold text-[var(--text-primary)]">수렴 분석</span>
              <span className="text-[14px] font-bold text-[var(--accent)]">{Math.round(convergence.score * 100)}%</span>
            </div>
            <div className="h-2.5 bg-[var(--border)] rounded-full overflow-hidden mb-3">
              <div className={`h-full rounded-full transition-all ${convergence.score >= activeLoop.convergence_threshold ? 'bg-[var(--success)]' : 'bg-[var(--accent)]'}`} style={{ width: `${Math.min(convergence.score * 100, 100)}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {(['blocker', 'improvement', 'nice_to_have'] as const).map((sev) => {
                const d = convergence.breakdown[sev];
                const c = SEVERITY_COLORS[sev];
                return (
                  <div key={sev} className={`${c.bg} rounded-lg p-2.5 text-center border ${c.border}`}>
                    <p className={`text-[15px] font-bold ${c.text}`}>{d.resolved}/{d.total}</p>
                    <p className={`text-[10px] font-semibold ${c.text}`}>{SEVERITY_LABELS[sev]}</p>
                  </div>
                );
              })}
            </div>
            <div className="flex items-start gap-2 bg-[var(--surface)] rounded-lg px-3 py-2">
              {convergence.recommendation === 'stop' ? <Check size={14} className="text-[var(--success)] mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />}
              <p className="text-[12px] text-[var(--text-primary)] leading-relaxed">{convergence.guidance}</p>
            </div>
          </Card>

          <ConvergenceChart iterations={activeLoop.iterations} threshold={activeLoop.convergence_threshold} />

          {/* ═══ Iteration Timeline ═══ */}
          <div className="space-y-3">
            <h3 className="text-[14px] font-bold text-[var(--text-primary)]">반복 이력</h3>
            {activeLoop.iterations.map((iter, i) => {
              const prevIter = i > 0 ? activeLoop.iterations[i - 1] : null;
              const prevScore = prevIter ? calculateWeightedScore(prevIter.issues_from_feedback).score : 0;
              const currResult = calculateWeightedScore(iter.issues_from_feedback);
              const scoreDelta = currResult.score - prevScore;

              return (
                <Card key={i} className={`!p-4 ${expandedIteration === i ? '!border-[var(--accent)]' : ''}`}>
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedIteration(expandedIteration === i ? null : i)}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold ${currResult.score > 0.7 ? 'bg-[var(--collab)] text-[var(--success)]' : 'bg-[var(--ai)] text-[#2d4a7c]'}`}>{iter.iteration_number}</div>
                      <div>
                        <p className="text-[13px] font-semibold text-[var(--text-primary)]">반복 {iter.iteration_number}</p>
                        <div className="flex items-center gap-2 text-[11px] mt-0.5">
                          <span className="text-red-600">차단 {currResult.breakdown.blocker.resolved}/{currResult.breakdown.blocker.total}</span>
                          <span className="text-amber-600">개선 {currResult.breakdown.improvement.resolved}/{currResult.breakdown.improvement.total}</span>
                          {i > 0 && <span className={`font-bold ${scoreDelta > 0 ? 'text-[var(--success)]' : scoreDelta < 0 ? 'text-red-500' : 'text-[var(--text-secondary)]'}`}>{scoreDelta > 0 ? '+' : ''}{Math.round(scoreDelta * 100)}%</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${currResult.score * 100}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-[var(--text-secondary)]">{Math.round(currResult.score * 100)}%</span>
                      {expandedIteration === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </div>

                  {expandedIteration === i && (
                    <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-3 animate-fade-in">
                      {/* User directive that was given */}
                      {iter.user_directive && (
                        <p className="text-[12px] text-[var(--text-secondary)] bg-[var(--surface)] rounded-lg px-3 py-2 border border-dashed border-[var(--border)]">
                          <span className="font-semibold text-[var(--text-primary)]">사용자 지시:</span> {iter.user_directive}
                        </p>
                      )}

                      {iter.delta_summary && (
                        <p className="text-[12px] text-[var(--text-primary)] bg-[var(--bg)] rounded-lg px-3 py-2">
                          <span className="font-semibold">개선 내용:</span> {iter.delta_summary}
                        </p>
                      )}

                      {/* Deep analysis (only in deep mode) */}
                      {iter.deep_analysis && (
                        <div className="bg-[var(--ai)] rounded-lg px-3 py-2.5">
                          <p className="text-[11px] font-bold text-[#2d4a7c] mb-1">심층 분석</p>
                          <p className="text-[12px] text-[var(--text-primary)] leading-relaxed whitespace-pre-line">{iter.deep_analysis}</p>
                        </div>
                      )}

                      {/* Data gaps */}
                      {iter.data_gaps && iter.data_gaps.length > 0 && (
                        <div className="bg-[var(--checkpoint)] rounded-lg px-3 py-2.5">
                          <p className="text-[11px] font-bold text-amber-700 mb-1">추가 검증 필요</p>
                          <ul className="space-y-0.5">
                            {iter.data_gaps.map((gap, gi) => (
                              <li key={gi} className="text-[12px] text-amber-800">• {gap}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {(['blocker', 'improvement', 'nice_to_have'] as const).map((sev) => {
                        const sevIssues = iter.issues_from_feedback.filter(issue => (issue.severity || 'improvement') === sev);
                        if (sevIssues.length === 0) return null;
                        const c = SEVERITY_COLORS[sev];
                        return (
                          <div key={sev}>
                            <p className={`text-[11px] font-bold ${c.text} mb-1`}>{SEVERITY_LABELS[sev]} ({sevIssues.filter(i => i.resolved).length}/{sevIssues.length})</p>
                            <div className="space-y-0.5">
                              {sevIssues.map((issue) => (
                                <div key={issue.id} className="flex items-start gap-2 text-[12px]">
                                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${issue.resolved ? 'bg-[var(--success)]' : c.dot}`} />
                                  <span className={issue.resolved ? 'text-[var(--text-secondary)] line-through' : 'text-[var(--text-primary)]'}>
                                    <span className="font-medium text-[var(--accent)]">[{issue.source_persona_name}]</span> {issue.text}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {prevIter && (
                        <div className="border-t border-[var(--border)] pt-2">
                          <div className="grid grid-cols-3 gap-2 text-[11px]">
                            <div className="bg-[var(--collab)] rounded-lg p-2 text-center">
                              <p className="font-bold text-[var(--success)]">{iter.issues_from_feedback.filter(i => i.resolved && i.resolved_at_iteration === iter.iteration_number).length}건</p>
                              <p className="text-[var(--success)] text-[9px]">이번에 해결</p>
                            </div>
                            <div className="bg-[var(--checkpoint)] rounded-lg p-2 text-center">
                              <p className="font-bold text-amber-700">{iter.issues_from_feedback.filter(i => !i.resolved).length}건</p>
                              <p className="text-amber-600 text-[9px]">미해결</p>
                            </div>
                            <div className="bg-[var(--ai)] rounded-lg p-2 text-center">
                              <p className="font-bold text-[#2d4a7c]">{iter.issues_from_feedback.filter(i => !i.resolved && !prevIter.issues_from_feedback.some(pi => pi.id === i.id)).length}건</p>
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

          {/* ═══ Next Iteration Controls ═══ */}
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
                  <p className="text-[12px] text-[var(--text-secondary)] mb-3">해결할 이슈를 선택하세요. 차단 이슈를 우선 해결하면 수렴률이 크게 올라갑니다.</p>
                  <div className="space-y-1.5 mb-4">
                    {unresolvedIssues.map((issue) => {
                      const c = SEVERITY_COLORS[issue.severity || 'improvement'];
                      return (
                        <label key={issue.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${selectedIssues.has(issue.id) ? 'border-[var(--accent)] bg-[var(--ai)]' : 'border-[var(--border)] hover:border-[var(--accent)]'}`}>
                          <input type="checkbox" checked={selectedIssues.has(issue.id)} onChange={() => toggleIssue(issue.id)} className="mt-0.5 accent-[var(--accent)]" />
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${c.bg} ${c.text}`}>{SEVERITY_LABELS[issue.severity || 'improvement']}</span>
                              <span className="text-[12px] font-semibold text-[var(--accent)]">[{issue.source_persona_name}]</span>
                            </div>
                            <p className="text-[12px] text-[var(--text-primary)] mt-0.5">{issue.text}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {/* User directive */}
                  {selectedIssues.size > 0 && (
                    <div className="space-y-3 mb-4 pt-3 border-t border-[var(--border-subtle)]">
                      <div>
                        <p className="text-[12px] font-semibold text-[var(--text-primary)] mb-1.5">추가 지시 <span className="font-normal text-[var(--text-tertiary)]">(선택)</span></p>
                        <textarea
                          value={userDirective}
                          onChange={(e) => setUserDirective(e.target.value)}
                          placeholder="특정 이슈에 대한 접근 방향, 강조점, 추가 맥락 등을 자유롭게 입력하세요. 예: 'ROI 분석은 3개년 시나리오로, CEO가 시장 점유율 속도를 중시하니까 그 부분 강조해줘'"
                          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] resize-none leading-relaxed"
                          rows={3}
                        />
                      </div>

                      {/* Depth selector */}
                      <div className="flex items-center gap-2">
                        <p className="text-[12px] font-semibold text-[var(--text-primary)]">분석 깊이:</p>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setDepth('quick')}
                            className={`px-3 py-1 rounded-lg text-[11px] font-medium border cursor-pointer transition-colors ${
                              depth === 'quick' ? 'border-[var(--accent)] bg-[var(--ai)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-secondary)]'
                            }`}
                          >
                            빠른 개선
                          </button>
                          <button
                            onClick={() => setDepth('deep')}
                            className={`px-3 py-1 rounded-lg text-[11px] font-medium border cursor-pointer transition-colors ${
                              depth === 'deep' ? 'border-[var(--accent)] bg-[var(--ai)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-secondary)]'
                            }`}
                          >
                            심층 분석
                          </button>
                        </div>
                        <span className="text-[10px] text-[var(--text-tertiary)]">
                          {depth === 'deep' ? '근거·대안·데이터 검증 포함 (토큰 2배)' : '핵심 변경만 빠르게'}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[13px] text-[var(--text-secondary)] mb-3">미해결 이슈가 없습니다. 합주를 마무리하세요.</p>
              )}
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-[13px] bg-red-50 rounded-lg px-3 py-2 mb-3">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button variant="danger" size="sm" onClick={() => { if (activeLoop) updateLoop(activeLoop.id, { status: 'stopped_by_user' }); }}>
                    <Square size={12} /> 연습 중단
                  </Button>
                  {convergence.score > 0.5 && (
                    <Button variant="secondary" size="sm" onClick={() => { if (activeLoop) { updateLoop(activeLoop.id, { status: 'converged' }); track('loop_converged', { iterations: activeLoop.iterations.length, score: Math.round((convergence?.score || 0) * 100) }); } }}>
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

          {activeLoop.status !== 'active' && (
            <Card className={activeLoop.status === 'converged' ? '!bg-[var(--collab)] !border-green-200' : ''}>
              <div className="flex items-center gap-2">
                {activeLoop.status === 'converged' ? <Check size={16} className="text-[var(--success)]" /> : <Square size={16} className="text-[var(--text-secondary)]" />}
                <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                  {activeLoop.status === 'converged' ? `하모니 완성 — ${activeLoop.iterations.length}회 합주, 수렴률 ${Math.round(convergence.score * 100)}%` : `연습 중단 — ${activeLoop.iterations.length}회 합주`}
                </p>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

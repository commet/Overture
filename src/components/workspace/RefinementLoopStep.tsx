'use client';

import { useEffect, useState } from 'react';
import { useRefinementStore } from '@/stores/useRefinementStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { usePersonaStore } from '@/stores/usePersonaStore';
import { useDecomposeStore } from '@/stores/useDecomposeStore';
import { useHandoffStore } from '@/stores/useHandoffStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { RefinementLoop, RefinementIssue, RefinementIteration } from '@/stores/types';
import { RefreshCw, Check, AlertTriangle, TrendingUp, ArrowRight, Play, Square, ChevronDown, ChevronUp } from 'lucide-react';

interface RefinementLoopStepProps {
  onNavigate: (step: string) => void;
}

export function RefinementLoopStep({ onNavigate }: RefinementLoopStepProps) {
  const { loops, activeLoopId, loadLoops, setActiveLoopId, updateLoop, addIteration, checkConvergence, deleteLoop } = useRefinementStore();
  const { projects, loadProjects } = useProjectStore();
  const { feedbackHistory, loadData: loadPersonaData } = usePersonaStore();
  const { items: decomposeItems, loadItems: loadDecompose, createItem: createDecomposeItem, updateItem: updateDecomposeItem } = useDecomposeStore();
  const { setHandoff } = useHandoffStore();

  const [expandedIteration, setExpandedIteration] = useState<number | null>(null);
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadLoops();
    loadProjects();
    loadPersonaData();
    loadDecompose();
  }, [loadLoops, loadProjects, loadPersonaData, loadDecompose]);

  const activeLoop = loops.find((l) => l.id === activeLoopId);
  const convergence = activeLoop ? checkConvergence(activeLoop.id) : null;
  const latestIteration = activeLoop?.iterations[activeLoop.iterations.length - 1];

  // Get all unresolved issues from the latest iteration
  const unresolvedIssues = latestIteration
    ? latestIteration.issues_from_feedback.filter((i) => !i.resolved)
    : [];

  const toggleIssue = (id: string) => {
    setSelectedIssues((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStartNextIteration = () => {
    if (!activeLoop || selectedIssues.size === 0) return;

    const issues = unresolvedIssues.filter((i) => selectedIssues.has(i.id));
    const constraints = issues.map(
      (i) => `[${i.source_persona_name}] ${i.text}`
    );

    // Build enriched prompt for re-decomposition
    const constraintText = constraints
      .map((c) => `- ${c}`)
      .join('\n');

    const prompt = `${activeLoop.goal}\n\n=== 이전 반복에서의 이해관계자 피드백 (반드시 반영) ===\n${constraintText}\n\n위 피드백을 반영하여 과제를 다시 분해하세요.`;

    // Create new decompose item
    const id = createDecomposeItem(prompt);
    updateDecomposeItem(id, {
      project_id: activeLoop.project_id,
      loop_id: activeLoop.id,
      iteration_number: (activeLoop.iterations.length || 0) + 1,
    });

    // Navigate to decompose
    setHandoff({
      from: 'persona-feedback',
      fromItemId: '',
      content: prompt,
      projectId: activeLoop.project_id,
    });

    onNavigate('decompose');
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
        <h1 className="text-[22px] font-bold text-[var(--text-primary)]">정제 루프</h1>
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
              <p className="text-[var(--text-secondary)] text-[14px]">아직 정제 루프가 없습니다.</p>
              <p className="text-[var(--text-secondary)] text-[12px] mt-1">리허설 결과에서 &ldquo;정제 루프 시작&rdquo; 버튼을 눌러 시작하세요.</p>
            </Card>
          ) : (
            loops.map((loop) => {
              const project = projects.find((p) => p.id === loop.project_id);
              const conv = checkConvergence(loop.id);
              return (
                <Card
                  key={loop.id}
                  hoverable
                  onClick={() => setActiveLoopId(loop.id)}
                >
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

          {/* Convergence bar */}
          {convergence && (
            <Card className={`!p-4 ${convergence.shouldStop ? '!bg-[var(--collab)]' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-bold text-[var(--text-primary)]">수렴 분석</span>
                <span className="text-[12px] font-semibold text-[var(--accent)]">
                  {Math.round(convergence.score * 100)}% / {Math.round(activeLoop.convergence_threshold * 100)}%
                </span>
              </div>
              <div className="h-2.5 bg-[var(--border)] rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all ${
                    convergence.score >= activeLoop.convergence_threshold ? 'bg-[var(--success)]' : 'bg-[var(--accent)]'
                  }`}
                  style={{ width: `${Math.min(convergence.score * 100, 100)}%` }}
                />
              </div>
              <div className="flex items-center gap-2">
                {convergence.recommendation === 'stop' ? (
                  <TrendingUp size={13} className="text-[var(--success)]" />
                ) : convergence.recommendation === 'one_more' ? (
                  <AlertTriangle size={13} className="text-amber-600" />
                ) : null}
                <p className="text-[12px] text-[var(--text-secondary)]">{convergence.reason}</p>
              </div>
            </Card>
          )}

          {/* Iterations timeline */}
          <div className="space-y-3">
            <h3 className="text-[14px] font-bold text-[var(--text-primary)]">반복 이력</h3>
            {activeLoop.iterations.map((iter, i) => (
              <Card
                key={i}
                className={`!p-4 cursor-pointer ${expandedIteration === i ? '!border-[var(--accent)]' : ''}`}
                onClick={() => setExpandedIteration(expandedIteration === i ? null : i)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      iter.convergence_score > 0.7 ? 'bg-[var(--collab)] text-[var(--success)]'
                      : 'bg-[var(--ai)] text-[#2d4a7c]'
                    }`}>
                      {iter.iteration_number}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                        반복 {iter.iteration_number}
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        해결 {iter.total_issue_count - iter.unresolved_count}건 · 미해결 {iter.unresolved_count}건 · 수렴률 {Math.round(iter.convergence_score * 100)}%
                      </p>
                    </div>
                  </div>
                  {expandedIteration === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>

                {expandedIteration === i && (
                  <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2 animate-fade-in">
                    {iter.delta_summary && (
                      <p className="text-[12px] text-[var(--text-primary)]">
                        <span className="font-semibold">변경사항:</span> {iter.delta_summary}
                      </p>
                    )}
                    <div className="space-y-1">
                      {iter.issues_from_feedback.map((issue) => (
                        <div key={issue.id} className="flex items-start gap-2 text-[12px]">
                          {issue.resolved ? (
                            <Check size={12} className="text-[var(--success)] mt-0.5 shrink-0" />
                          ) : (
                            <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
                          )}
                          <span className={issue.resolved ? 'text-[var(--text-secondary)] line-through' : 'text-[var(--text-primary)]'}>
                            [{issue.source_persona_name}] {issue.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Next iteration / controls */}
          {activeLoop.status === 'active' && (
            <Card className="!border-amber-200 !bg-[var(--checkpoint)]">
              <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-3">다음 반복</h3>

              {unresolvedIssues.length > 0 ? (
                <>
                  <p className="text-[12px] text-[var(--text-secondary)] mb-3">
                    해결할 이슈를 선택하세요. 선택한 이슈가 다음 분석의 제약조건이 됩니다.
                  </p>
                  <div className="space-y-1.5 mb-4">
                    {unresolvedIssues.map((issue) => (
                      <label
                        key={issue.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          selectedIssues.has(issue.id)
                            ? 'border-[var(--accent)] bg-[var(--ai)]'
                            : 'border-[var(--border)] hover:border-[var(--accent)]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIssues.has(issue.id)}
                          onChange={() => toggleIssue(issue.id)}
                          className="mt-0.5 accent-[var(--accent)]"
                        />
                        <div>
                          <span className="text-[12px] font-semibold text-[var(--accent)]">[{issue.source_persona_name}]</span>
                          <span className="text-[12px] text-[var(--text-primary)] ml-1">{issue.text}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-[13px] text-[var(--text-secondary)] mb-3">
                  미해결 이슈가 없습니다. 새로운 리허설을 추가하거나 루프를 종료하세요.
                </p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button variant="danger" size="sm" onClick={handleStopLoop}>
                    <Square size={12} /> 루프 중단
                  </Button>
                  {convergence && convergence.score > 0.5 && (
                    <Button variant="secondary" size="sm" onClick={handleMarkConverged}>
                      <Check size={12} /> 수렴 완료
                    </Button>
                  )}
                </div>
                {selectedIssues.size > 0 && (
                  <Button size="sm" onClick={handleStartNextIteration}>
                    <Play size={12} /> {selectedIssues.size}건 반영하여 다음 반복
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Stopped/converged state */}
          {activeLoop.status !== 'active' && (
            <Card className={activeLoop.status === 'converged' ? '!bg-[var(--collab)] !border-green-200' : ''}>
              <div className="flex items-center gap-2">
                {activeLoop.status === 'converged' ? (
                  <Check size={16} className="text-[var(--success)]" />
                ) : (
                  <Square size={16} className="text-[var(--text-secondary)]" />
                )}
                <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                  {activeLoop.status === 'converged'
                    ? `수렴 완료 — ${activeLoop.iterations.length}회 반복, 최종 수렴률 ${Math.round((convergence?.score || 0) * 100)}%`
                    : `사용자에 의해 중단 — ${activeLoop.iterations.length}회 반복`}
                </p>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { CopyButton } from '@/components/ui/CopyButton';
import { Button } from '@/components/ui/Button';
import { FeedbackMessage, PersonaAvatar, getPersonaColor } from './FeedbackMessage';
import { DiscussionThread } from './DiscussionThread';
import type { Persona, FeedbackRecord } from '@/stores/types';
import {
  MessageCircleQuestion, ThumbsUp, AlertTriangle, Search, Star, Check, RefreshCw,
  ShieldAlert, Shield, EyeOff, ArrowLeft, MessageSquare, Loader2,
} from 'lucide-react';
import { useAccuracyStore } from '@/stores/useAccuracyStore';
import { useJudgmentStore } from '@/stores/useJudgmentStore';
import { useRefinementStore } from '@/stores/useRefinementStore';
import { useRouter } from 'next/navigation';
import { extractApprovalConditions } from '@/lib/convergence';

interface FeedbackResultProps {
  record: FeedbackRecord;
  personas: Persona[];
  onNavigate?: (step: string) => void;
  onStartDiscussion?: () => void;
  discussionLoading?: boolean;
}

type ViewMode = 'overview' | 'persona-detail' | 'discussion' | 'synthesis';

export function FeedbackResult({ record, personas, onNavigate, onStartDiscussion, discussionLoading }: FeedbackResultProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);

  const { addRating } = useAccuracyStore();
  const { addJudgment } = useJudgmentStore();
  const router = useRouter();
  const { createLoop, setActiveLoopId } = useRefinementStore();
  const [ratingState, setRatingState] = useState<Record<string, {
    score: number;
    accurateAspects: string[];
    inaccurateAspects: string[];
    saved: boolean;
  }>>({});

  // ── Rating helpers ──
  const toggleAspect = (personaId: string, aspect: string, type: 'accurate' | 'inaccurate') => {
    setRatingState(prev => {
      const current = prev[personaId] || { score: 0, accurateAspects: [], inaccurateAspects: [], saved: false };
      const key = type === 'accurate' ? 'accurateAspects' : 'inaccurateAspects';
      const otherKey = type === 'accurate' ? 'inaccurateAspects' : 'accurateAspects';
      const list = current[key].includes(aspect) ? current[key].filter(a => a !== aspect) : [...current[key], aspect];
      const otherList = current[otherKey].filter(a => a !== aspect);
      return { ...prev, [personaId]: { ...current, [key]: list, [otherKey]: otherList } };
    });
  };

  const setRatingScore = (personaId: string, score: number) => {
    setRatingState(prev => ({
      ...prev,
      [personaId]: { ...(prev[personaId] || { score: 0, accurateAspects: [], inaccurateAspects: [], saved: false }), score }
    }));
  };

  const saveRating = (personaId: string) => {
    const rating = ratingState[personaId];
    if (!rating || rating.score === 0) return;
    addRating({
      feedback_record_id: record.id,
      persona_id: personaId,
      accuracy_score: rating.score,
      which_aspects_accurate: rating.accurateAspects,
      which_aspects_inaccurate: rating.inaccurateAspects,
    });
    addJudgment({
      type: 'feedback_accuracy',
      context: `${record.document_title} - persona feedback`,
      decision: `${rating.score}/5`,
      original_ai_suggestion: '',
      user_changed: rating.score < 4,
      project_id: record.project_id,
      tool: 'persona-feedback',
    });
    setRatingState(prev => ({ ...prev, [personaId]: { ...prev[personaId], saved: true } }));
  };

  // ── Copy helper ──
  const getFullText = () => {
    let text = `## 리허설 결과\n\n**자료**: ${record.document_title}\n**관점**: ${record.feedback_perspective} | **강도**: ${record.feedback_intensity}\n\n`;
    for (const result of record.results) {
      const p = personas.find((persona) => persona.id === result.persona_id);
      text += `### ${p?.name || '페르소나'} (${p?.role || ''})\n\n`;
      text += `**전반적 반응**: ${result.overall_reaction}\n\n`;
      if (result.failure_scenario) text += `**프리모템**\n${result.failure_scenario}\n\n`;
      if (result.classified_risks?.length > 0) {
        for (const r of result.classified_risks) text += `**[${r.category}]** ${r.text}\n`;
        text += '\n';
      }
      text += `**질문**\n${result.first_questions.map(q => `- ${q}`).join('\n')}\n\n`;
      text += `**칭찬**\n${result.praise.map(p => `- ${p}`).join('\n')}\n\n`;
      text += `**우려**\n${result.concerns.map(c => `- ${c}`).join('\n')}\n\n`;
      if (result.approval_conditions?.length > 0) text += `**승인 조건**\n${result.approval_conditions.map(c => `- ${c}`).join('\n')}\n\n`;
    }
    if (record.synthesis) text += `### 종합 분석\n${record.synthesis}\n`;
    return text;
  };

  // ── Start refinement loop ──
  const handleStartLoop = () => {
    if (!record.project_id) return;

    const approvalConditions = extractApprovalConditions(record, personas);

    const loopId = createLoop({
      projectId: record.project_id,
      goal: record.document_title || '합주 연습',
      originalPlan: record.document_text,
      initialFeedbackRecordId: record.id,
      initialApprovalConditions: approvalConditions,
      personaIds: record.persona_ids,
    });

    setActiveLoopId(loopId);
    if (onNavigate) onNavigate('refinement-loop');
    else router.push('/tools/refinement-loop');
  };

  // ── Risk counts ──
  const allRisks = record.results.flatMap(r => r.classified_risks || []);
  const riskCounts = {
    critical: allRisks.filter(r => r.category === 'critical').length,
    manageable: allRisks.filter(r => r.category === 'manageable').length,
    unspoken: allRisks.filter(r => r.category === 'unspoken').length,
  };

  const selectedResult = selectedPersonaId ? record.results.find(r => r.persona_id === selectedPersonaId) : null;
  const selectedPersona = selectedPersonaId ? personas.find(p => p.id === selectedPersonaId) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-bold text-[var(--text-primary)]">피드백 결과</h3>
        <CopyButton getText={getFullText} label="전체 복사" />
      </div>

      {/* ══════════════ OVERVIEW ══════════════ */}
      {viewMode === 'overview' && (
        <div className="space-y-4 animate-fade-in">
          {/* Persona reaction cards */}
          <div className={`grid gap-3 ${record.results.length === 1 ? 'grid-cols-1' : record.results.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
            {record.results.map((result) => {
              const persona = personas.find(p => p.id === result.persona_id);
              if (!persona) return null;
              const color = getPersonaColor(persona.id);
              const criticalCount = (result.classified_risks || []).filter(r => r.category === 'critical').length;

              return (
                <button
                  key={result.persona_id}
                  onClick={() => { setSelectedPersonaId(result.persona_id); setViewMode('persona-detail'); }}
                  className="text-left p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--border)] hover:shadow-sm transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <PersonaAvatar name={persona.name} personaId={persona.id} size={44} influence={persona.influence} />
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-[var(--text-primary)] truncate">{persona.name}</p>
                      <p className="text-[11px] text-[var(--text-secondary)] truncate">{persona.role}</p>
                    </div>
                    {persona.influence && (
                      <span className={`ml-auto shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        persona.influence === 'high' ? 'bg-[var(--danger)]/10 text-[var(--danger)]'
                        : persona.influence === 'medium' ? 'bg-[var(--checkpoint)] text-[var(--risk-manageable)]'
                        : 'bg-[var(--bg)] text-[var(--text-secondary)]'
                      }`}>
                        {persona.influence === 'high' ? '높음' : persona.influence === 'medium' ? '중간' : '낮음'}
                      </span>
                    )}
                  </div>

                  {/* Speech bubble */}
                  <div className="relative rounded-xl rounded-tl-sm px-3 py-2.5 bg-[var(--bg)] text-[13px] text-[var(--text-primary)] leading-relaxed">
                    &ldquo;{result.overall_reaction}&rdquo;
                  </div>

                  {/* Risk indicators */}
                  {criticalCount > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-[#E24B4A]">
                      <ShieldAlert size={10} /> 핵심 위협 {criticalCount}건
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Risk summary bar */}
          {(riskCounts.critical + riskCounts.manageable + riskCounts.unspoken) > 0 && (
            <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl bg-[var(--bg)] text-[12px] font-semibold">
              {riskCounts.critical > 0 && (
                <span className="flex items-center gap-1 text-[#E24B4A]"><ShieldAlert size={12} /> 핵심 위협 {riskCounts.critical}</span>
              )}
              {riskCounts.manageable > 0 && (
                <span className="flex items-center gap-1 text-[#EF9F27]"><Shield size={12} /> 관리 가능 {riskCounts.manageable}</span>
              )}
              {riskCounts.unspoken > 0 && (
                <span className="flex items-center gap-1 text-[#7F77DD]"><EyeOff size={12} /> 침묵 {riskCounts.unspoken}</span>
              )}
            </div>
          )}

          {/* Approval conditions preview */}
          {(() => {
            const allConditions = record.results.flatMap(r => {
              const p = personas.find(pp => pp.id === r.persona_id);
              return (r.approval_conditions || []).map(c => ({ condition: c, name: p?.name || '', influence: p?.influence || 'medium' }));
            }).filter(c => c.influence === 'high');
            if (allConditions.length === 0) return null;
            return (
              <div className="px-4 py-3 rounded-xl border border-[var(--accent-light)]/20 bg-[var(--checkpoint)]">
                <p className="text-[11px] font-bold text-[var(--accent)] mb-2">승인 조건 (고영향력)</p>
                <div className="space-y-1">
                  {allConditions.map((ac, i) => (
                    <div key={i} className="flex items-start gap-2 text-[12px]">
                      <span className="text-[var(--text-tertiary)] mt-0.5">○</span>
                      <span className="text-[var(--text-primary)]">{ac.condition}</span>
                      <span className="text-[var(--text-tertiary)] shrink-0">— {ac.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {record.results.length > 1 && (record.structured_synthesis || record.synthesis) && (
              <Button size="sm" variant="secondary" onClick={() => setViewMode('synthesis')}>
                종합 분석 보기
              </Button>
            )}
            {record.results.length > 1 && onStartDiscussion && (
              <Button size="sm" onClick={() => record.discussion ? setViewMode('discussion') : onStartDiscussion()} disabled={discussionLoading}>
                {discussionLoading ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
                {record.discussion ? '토론 보기' : discussionLoading ? '토론 생성 중...' : '토론 시작'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ PERSONA DETAIL ══════════════ */}
      {viewMode === 'persona-detail' && selectedResult && selectedPersona && (
        <div className="space-y-3 animate-fade-in">
          <button onClick={() => { setViewMode('overview'); setSelectedPersonaId(null); }}
            className="flex items-center gap-1 text-[13px] text-[var(--accent)] hover:underline cursor-pointer">
            <ArrowLeft size={14} /> 전체 결과로
          </button>

          {/* Persona header */}
          <div className="flex items-center gap-3 mb-2">
            <PersonaAvatar name={selectedPersona.name} personaId={selectedPersona.id} size={40} influence={selectedPersona.influence} />
            <div>
              <span className="text-[15px] font-bold" style={{ fontFamily: 'var(--font-display)' }}>{selectedPersona.name}</span>
              <span className="text-[13px] text-[var(--text-secondary)] ml-2">{selectedPersona.role}</span>
            </div>
          </div>

          {/* Messages as conversation */}
          <div className="space-y-3">
            {/* Overall reaction */}
            <FeedbackMessage personaName={selectedPersona.name} personaId={selectedPersona.id}
              category="전반적 반응" variant="default" delay={0}>
              {selectedResult.overall_reaction}
            </FeedbackMessage>

            {/* Pre-mortem */}
            {selectedResult.failure_scenario && (
              <FeedbackMessage personaName={selectedPersona.name} personaId={selectedPersona.id}
                category="프리모템" categoryIcon={<AlertTriangle size={10} />} variant="risk-critical" delay={80}>
                <p className="text-[11px] font-semibold text-red-600 mb-1">이 계획이 실패한다면?</p>
                {selectedResult.failure_scenario}
              </FeedbackMessage>
            )}

            {/* Untested assumptions */}
            {selectedResult.untested_assumptions?.length > 0 && (
              <FeedbackMessage personaName={selectedPersona.name} personaId={selectedPersona.id}
                category="검증 안 된 전제" categoryIcon={<AlertTriangle size={10} />} variant="concern" delay={160}>
                <ul className="space-y-1">
                  {selectedResult.untested_assumptions.map((a, i) => (
                    <li key={i}>&#x2022; {a}</li>
                  ))}
                </ul>
              </FeedbackMessage>
            )}

            {/* Classified risks */}
            {selectedResult.classified_risks?.length > 0 && (
              <>
                {selectedResult.classified_risks.filter(r => r.category === 'critical').map((risk, i) => (
                  <FeedbackMessage key={`c-${i}`} personaName={selectedPersona.name} personaId={selectedPersona.id}
                    category="핵심 위협" categoryIcon={<ShieldAlert size={10} />} variant="risk-critical" delay={240 + i * 60}>
                    {risk.text}
                  </FeedbackMessage>
                ))}
                {selectedResult.classified_risks.filter(r => r.category === 'manageable').map((risk, i) => (
                  <FeedbackMessage key={`m-${i}`} personaName={selectedPersona.name} personaId={selectedPersona.id}
                    category="관리 가능" categoryIcon={<Shield size={10} />} variant="risk-manageable" delay={320 + i * 60}>
                    {risk.text}
                  </FeedbackMessage>
                ))}
                {selectedResult.classified_risks.filter(r => r.category === 'unspoken').map((risk, i) => (
                  <FeedbackMessage key={`u-${i}`} personaName={selectedPersona.name} personaId={selectedPersona.id}
                    category="침묵의 리스크" categoryIcon={<EyeOff size={10} />} variant="risk-unspoken" delay={400 + i * 60}>
                    {risk.text}
                  </FeedbackMessage>
                ))}
              </>
            )}

            {/* First questions */}
            <FeedbackMessage personaName={selectedPersona.name} personaId={selectedPersona.id}
              category="질문" categoryIcon={<MessageCircleQuestion size={10} />} variant="default" delay={480}>
              <ul className="space-y-1.5">
                {selectedResult.first_questions.map((q, i) => (
                  <li key={i} className="px-2.5 py-1.5 rounded-lg bg-[var(--surface)]/60">{q}</li>
                ))}
              </ul>
            </FeedbackMessage>

            {/* Praise */}
            <FeedbackMessage personaName={selectedPersona.name} personaId={selectedPersona.id}
              category="칭찬" categoryIcon={<ThumbsUp size={10} />} variant="praise" delay={560}>
              <ul className="space-y-1">
                {selectedResult.praise.map((p, i) => <li key={i}>+ {p}</li>)}
              </ul>
            </FeedbackMessage>

            {/* Concerns */}
            <FeedbackMessage personaName={selectedPersona.name} personaId={selectedPersona.id}
              category="우려/지적" categoryIcon={<AlertTriangle size={10} />} variant="concern" delay={640}>
              <ul className="space-y-1">
                {selectedResult.concerns.map((c, i) => <li key={i}>- {c}</li>)}
              </ul>
            </FeedbackMessage>

            {/* Wants more */}
            {selectedResult.wants_more?.length > 0 && (
              <FeedbackMessage personaName={selectedPersona.name} personaId={selectedPersona.id}
                category="추가 요청" categoryIcon={<Search size={10} />} variant="default" delay={720}>
                <ul className="space-y-1">
                  {selectedResult.wants_more.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </FeedbackMessage>
            )}

            {/* Approval conditions */}
            {selectedResult.approval_conditions?.length > 0 && (
              <FeedbackMessage personaName={selectedPersona.name} personaId={selectedPersona.id}
                category="승인 조건" categoryIcon={<Check size={10} />} variant="approval" delay={800}>
                <p className="text-[10px] text-[var(--text-secondary)] mb-1">이것을 보여주면 OK하겠다</p>
                <ul className="space-y-1">
                  {selectedResult.approval_conditions.map((c, i) => <li key={i}>&#x2713; {c}</li>)}
                </ul>
              </FeedbackMessage>
            )}
          </div>

          {/* Accuracy Rating */}
          {!ratingState[selectedPersona.id]?.saved ? (
            <Card className="!bg-[var(--bg)] !border-dashed mt-4">
              <p className="text-[13px] font-bold text-[var(--text-primary)] mb-3">이 피드백의 정확도를 평가해주세요</p>
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button key={score} onClick={() => setRatingScore(selectedPersona.id, score)} className="cursor-pointer p-0.5">
                    <Star size={20} className={`transition-colors ${score <= (ratingState[selectedPersona.id]?.score || 0) ? 'fill-amber-400 text-amber-400' : 'text-[var(--border)]'}`} />
                  </button>
                ))}
                {(ratingState[selectedPersona.id]?.score ?? 0) > 0 && (
                  <span className="text-[12px] text-[var(--text-secondary)] ml-2">{ratingState[selectedPersona.id].score}/5</span>
                )}
              </div>
              <div className="space-y-2 mb-3">
                <p className="text-[11px] font-semibold text-[var(--text-secondary)]">어떤 부분이 정확했나요?</p>
                <div className="flex flex-wrap gap-1.5">
                  {['질문 예측', '칭찬 포인트', '우려/지적', '추가 요구'].map((aspect) => {
                    const isAccurate = ratingState[selectedPersona.id]?.accurateAspects?.includes(aspect);
                    const isInaccurate = ratingState[selectedPersona.id]?.inaccurateAspects?.includes(aspect);
                    return (
                      <div key={aspect} className="flex items-center gap-1">
                        <button onClick={() => toggleAspect(selectedPersona.id, aspect, 'accurate')}
                          className={`px-2 py-1 rounded text-[11px] font-medium border cursor-pointer ${isAccurate ? 'border-[var(--success)] bg-[var(--collab)] text-[var(--success)]' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>
                          &#x2713; {aspect}
                        </button>
                        <button onClick={() => toggleAspect(selectedPersona.id, aspect, 'inaccurate')}
                          className={`px-2 py-1 rounded text-[11px] font-medium border cursor-pointer ${isInaccurate ? 'border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>
                          &#x2717;
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <Button size="sm" onClick={() => saveRating(selectedPersona.id)} disabled={!ratingState[selectedPersona.id]?.score}>
                평가 저장
              </Button>
            </Card>
          ) : (
            <div className="flex items-center gap-2 text-[var(--success)] text-[12px] font-medium py-2">
              <Check size={14} /> 정확도 평가가 저장되었습니다
            </div>
          )}
        </div>
      )}

      {/* ══════════════ DISCUSSION ══════════════ */}
      {viewMode === 'discussion' && (
        <div className="space-y-4 animate-fade-in">
          <button onClick={() => setViewMode('overview')}
            className="flex items-center gap-1 text-[13px] text-[var(--accent)] hover:underline cursor-pointer">
            <ArrowLeft size={14} /> 전체 결과로
          </button>
          {record.discussion ? (
            <Card>
              <DiscussionThread
                messages={record.discussion}
                personas={personas}
                keyTakeaway={record.discussion_takeaway}
              />
            </Card>
          ) : (
            <Card className="text-center py-8">
              <p className="text-[var(--text-secondary)]">토론이 아직 생성되지 않았습니다.</p>
            </Card>
          )}
        </div>
      )}

      {/* ══════════════ SYNTHESIS ══════════════ */}
      {viewMode === 'synthesis' && (
        <div className="space-y-4 animate-fade-in">
          <button onClick={() => setViewMode('overview')}
            className="flex items-center gap-1 text-[13px] text-[var(--accent)] hover:underline cursor-pointer">
            <ArrowLeft size={14} /> 전체 결과로
          </button>

          {record.structured_synthesis ? (
            <div className="space-y-4">
              {/* Common agreements */}
              {record.structured_synthesis.common_agreements.length > 0 && (
                <Card className="!border-l-4 !border-l-[var(--success)]">
                  <p className="text-[13px] font-bold text-[var(--success)] mb-2">&#x2705; 공통 합의</p>
                  <ul className="space-y-1.5">
                    {record.structured_synthesis.common_agreements.map((a, i) => (
                      <li key={i} className="text-[13px] text-[var(--text-primary)]">&#x2022; {a}</li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Key conflicts */}
              {record.structured_synthesis.key_conflicts.length > 0 && (
                <Card className="!border-l-4 !border-l-amber-400">
                  <p className="text-[13px] font-bold text-amber-700 mb-3">&#x26A1; 핵심 갈등</p>
                  <div className="space-y-3">
                    {record.structured_synthesis.key_conflicts.map((conflict, i) => (
                      <div key={i} className="rounded-lg bg-[var(--bg)] p-3">
                        <p className="text-[12px] font-bold text-[var(--text-primary)] mb-2">{conflict.topic}</p>
                        <div className="space-y-1.5">
                          {conflict.positions.map((pos, j) => {
                            const p = personas.find(pp => pp.id === pos.persona_id);
                            return (
                              <div key={j} className="flex items-start gap-2">
                                {p && <PersonaAvatar name={p.name} personaId={p.id} size={20} />}
                                <span className="text-[12px] text-[var(--text-primary)]">
                                  <strong>{p?.name || ''}:</strong> {pos.stance}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Priority actions */}
              {record.structured_synthesis.priority_actions.length > 0 && (
                <Card className="!border-l-4 !border-l-[var(--accent)]">
                  <p className="text-[13px] font-bold text-[var(--accent)] mb-2">&#x1F3AF; 우선 수정 권고</p>
                  <div className="space-y-2">
                    {record.structured_synthesis.priority_actions.map((action, i) => (
                      <div key={i} className="flex items-start gap-2 text-[13px]">
                        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          action.priority === 'high' ? 'bg-[var(--danger)]/10 text-[var(--danger)]' : 'bg-[var(--checkpoint)] text-[var(--risk-manageable)]'
                        }`}>
                          {action.priority === 'high' ? '긴급' : '권고'}
                        </span>
                        <div>
                          <span className="text-[var(--text-primary)]">{action.action}</span>
                          <span className="text-[var(--text-tertiary)] text-[11px] ml-1">({action.requested_by})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          ) : record.synthesis ? (
            <Card>
              <div className="text-[14px] leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">
                {record.synthesis}
              </div>
            </Card>
          ) : null}
        </div>
      )}

      {/* ── Refinement loop CTA ── */}
      {record.project_id && record.results.length > 0 && viewMode === 'overview' && (
        <Card className="!bg-[var(--checkpoint)] !border-amber-200 mt-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-bold text-[var(--text-primary)]">피드백을 반영하여 반복 개선하시겠어요?</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">우려사항을 제약조건으로 변환하여 다시 분석합니다.</p>
            </div>
            <Button size="sm" onClick={handleStartLoop}>
              <RefreshCw size={14} /> 합주 연습
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

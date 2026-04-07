'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { ShareBar } from '@/components/ui/ShareBar';
import { Button } from '@/components/ui/Button';
import { FeedbackMessage, PersonaAvatar, getPersonaColor } from './FeedbackMessage';
import { DiscussionThread } from './DiscussionThread';
import type { Persona, FeedbackRecord } from '@/stores/types';
import {
  ThumbsUp, Search, Star, Check, RefreshCw,
  ShieldAlert, Shield, EyeOff, ArrowLeft, MessageSquare, Loader2, ArrowRight,
} from 'lucide-react';
import { useAccuracyStore } from '@/stores/useAccuracyStore';
import { useJudgmentStore } from '@/stores/useJudgmentStore';
import { useRefineStore } from '@/stores/useRefineStore';
import { useRouter } from 'next/navigation';
import { extractApprovalConditions } from '@/lib/convergence';

interface FeedbackResultProps {
  record: FeedbackRecord;
  personas: Persona[];
  onNavigate?: (step: string) => void;
  onStartDiscussion?: () => void;
  discussionLoading?: boolean;
  onStartDebate?: () => void;
}

type ViewMode = 'overview' | 'persona-detail' | 'discussion' | 'synthesis';

export function FeedbackResult({ record, personas, onNavigate, onStartDiscussion, discussionLoading, onStartDebate }: FeedbackResultProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);

  const { addRating } = useAccuracyStore();
  const { addJudgment } = useJudgmentStore();
  const router = useRouter();
  const { createLoop, setActiveLoopId } = useRefineStore();
  const [showDeepDetails, setShowDeepDetails] = useState(false);
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
      tool: 'rehearse',
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
      if (result.failure_scenario) text += `**이 계획이 실패한다면?**\n${result.failure_scenario}\n\n`;
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

  // ── Start refine loop ──
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
    if (onNavigate) onNavigate('refine');
    else router.push('/tools/refine');
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
        <ShareBar getText={getFullText} getTitle={() => '리허설 결과'} />
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
                      <span className={`ml-auto shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        persona.influence === 'high' ? 'bg-red-100 text-red-700'
                        : persona.influence === 'medium' ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-600'
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
                <span className="flex items-center gap-1 text-[#7F77DD]" title="모두 알지만 아무도 꺼내지 않는 리스크 (조직 정치, 역량 부족 등)"><EyeOff size={12} /> 침묵 {riskCounts.unspoken}</span>
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

          {/* Action area */}
          <div className="space-y-3">
            {record.results.length > 1 && (record.structured_synthesis || record.synthesis) && (
              <Button size="sm" variant="secondary" onClick={() => setViewMode('synthesis')}>
                종합 분석 보기
              </Button>
            )}

            {/* Discussion card — explains what 토론 does */}
            {record.results.length > 1 && onStartDiscussion && (
              <div className={`p-3.5 rounded-xl border transition-colors ${record.discussion ? 'border-[var(--accent)]/20 bg-[var(--accent)]/5' : 'border-dashed border-[var(--border)]'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${record.discussion ? 'bg-[var(--accent)]/10' : 'bg-[var(--bg)]'}`}>
                    <MessageSquare size={16} className={record.discussion ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[var(--text-primary)]">
                      {record.discussion ? '이해관계자 토론' : '이해관계자 토론 시뮬레이션'}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                      {record.discussion
                        ? `${record.discussion.length}건의 발언${record.discussion_takeaway ? ` — "${record.discussion_takeaway}"` : ''}`
                        : `${record.results.length}명의 이해관계자가 서로의 피드백에 반응하는 가상 토론을 생성합니다. 갈등 포인트와 합의점을 발견할 수 있습니다.`
                      }
                    </p>
                    <Button size="sm" className="mt-2.5"
                      onClick={() => record.discussion ? setViewMode('discussion') : onStartDiscussion()}
                      disabled={discussionLoading}>
                      {discussionLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                      {record.discussion ? '토론 보기' : discussionLoading ? '토론 생성 중...' : '토론 시작'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ PERSONA DETAIL ══════════════ */}
      {viewMode === 'persona-detail' && selectedResult && selectedPersona && (
        <div className="space-y-3 animate-fade-in">
          <button onClick={() => { setViewMode('overview'); setSelectedPersonaId(null); setShowDeepDetails(false); }}
            className="flex items-center gap-1 text-[13px] text-[var(--accent)] hover:underline cursor-pointer">
            <ArrowLeft size={14} /> 전체 결과로
          </button>

          {/* ── Persona header (1회만) ── */}
          <div className="flex items-center gap-3">
            <PersonaAvatar name={selectedPersona.name} personaId={selectedPersona.id} size={44} influence={selectedPersona.influence} />
            <div>
              <span className="text-[16px] font-bold" style={{ fontFamily: 'var(--font-display)' }}>{selectedPersona.name}</span>
              <span className="text-[13px] text-[var(--text-secondary)] ml-2">{selectedPersona.role}</span>
            </div>
          </div>

          {/* ── 전반적 반응 (한 줄 요약) ── */}
          <div className="rounded-xl bg-[var(--ai)] px-4 py-3">
            <p className="text-[14px] font-medium text-[var(--text-primary)] leading-relaxed">
              &ldquo;{selectedResult.overall_reaction}&rdquo;
            </p>
          </div>

          {/* ── 잘한 부분 ── */}
          {(selectedResult.praise || []).length > 0 && (
            <Card className="!border-l-4 !border-l-[var(--success)]">
              <div className="flex items-center gap-2 mb-2">
                <ThumbsUp size={14} className="text-[var(--success)]" />
                <span className="text-[13px] font-bold text-[var(--success)]">잘한 부분</span>
              </div>
              <ul className="space-y-1">
                {selectedResult.praise.map((p, i) => (
                  <li key={i} className="text-[13px] text-[var(--text-primary)]">+ {p}</li>
                ))}
              </ul>
            </Card>
          )}

          {/* ── 이것만 고치면 (concerns — pulled out, prominent) ── */}
          {(selectedResult.concerns || []).length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">이것만 고치면</p>
              <div className="space-y-2">
                {selectedResult.concerns.map((c, i) => (
                  <div key={i} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg)] px-3.5 py-2.5">
                    <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{c}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── OK 조건 (highlighted, like web app) ── */}
          {(selectedResult.approval_conditions?.length ?? 0) > 0 && (
            <div className="rounded-xl bg-[var(--accent)]/[0.04] border border-[var(--accent)]/10 px-4 py-3.5">
              <p className="text-[11px] font-bold text-[var(--accent)] uppercase tracking-wider mb-2">통과 조건</p>
              <ul className="space-y-1">
                {selectedResult.approval_conditions!.map((c, i) => (
                  <li key={i} className="text-[14px] text-[var(--text-primary)] font-medium leading-relaxed flex items-start gap-2">
                    <Check size={14} className="text-[var(--accent)] shrink-0 mt-0.5" /> {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── 더 자세히 (deep details — collapsible) ── */}
          {(() => {
            const hasDeep = selectedResult.failure_scenario
              || (selectedResult.untested_assumptions?.length ?? 0) > 0
              || (selectedResult.classified_risks?.length ?? 0) > 0
              || (selectedResult.first_questions || []).length > 0
              || (selectedResult.wants_more?.length ?? 0) > 0;
            if (!hasDeep) return null;
            return (
              <div>
                <button
                  onClick={() => setShowDeepDetails(!showDeepDetails)}
                  className="flex items-center gap-1.5 text-[12px] text-[var(--text-tertiary)] hover:text-[var(--accent)] cursor-pointer transition-colors"
                >
                  <Search size={11} />
                  {showDeepDetails ? '간략히 보기' : '더 자세히 보기'}
                </button>
                {showDeepDetails && (
                  <div className="mt-3 space-y-3 animate-fade-in">
                    {/* 질문 */}
                    {(selectedResult.first_questions || []).length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-[var(--text-secondary)] mb-1.5">물어볼 질문</p>
                        <ul className="space-y-1.5">
                          {selectedResult.first_questions.map((q, i) => (
                            <li key={i} className="text-[13px] text-[var(--text-primary)] px-3 py-2 rounded-lg bg-[var(--bg)]">{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 실패 시나리오 */}
                    {selectedResult.failure_scenario && (
                      <div>
                        <p className="text-[11px] font-bold text-amber-600 mb-1">실패 시나리오</p>
                        <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{selectedResult.failure_scenario}</p>
                      </div>
                    )}

                    {/* 검증 안 된 가정 */}
                    {(selectedResult.untested_assumptions?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-amber-600 mb-1">검증되지 않은 가정</p>
                        <ul className="space-y-1">
                          {selectedResult.untested_assumptions!.map((a, i) => (
                            <li key={i} className="text-[13px] text-[var(--text-primary)] flex items-start gap-1.5">
                              <span className="text-amber-500 mt-0.5 shrink-0">&#x25CF;</span> {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 리스크 분류 */}
                    {(selectedResult.classified_risks?.length ?? 0) > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold text-[var(--text-secondary)]">리스크 분류</p>
                        {selectedResult.classified_risks!.map((risk, i) => (
                          <div key={i} className="flex items-start gap-2.5 text-[13px]">
                            <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold ${risk.category === 'critical' ? 'bg-red-100 text-red-700' : risk.category === 'manageable' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'}`}>
                              {risk.category === 'critical' ? '위협' : risk.category === 'manageable' ? '관리' : '침묵'}
                            </span>
                            <span className="text-[var(--text-primary)] leading-relaxed">{risk.text}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 추가 요청 */}
                    {(selectedResult.wants_more?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-[var(--text-secondary)] mb-1">추가로 보고 싶은 것</p>
                        <ul className="space-y-1">
                          {selectedResult.wants_more!.map((w, i) => (
                            <li key={i} className="text-[13px] text-[var(--text-primary)]">{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

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

          {/* CTA after discussion */}
          {record.project_id && record.discussion && (
            <Card className="!bg-[var(--checkpoint)] !border-amber-200">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] font-bold text-[var(--text-primary)]">토론을 마쳤습니다</p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">발견한 갈등과 우려를 제약조건으로 변환하여 반복 개선합니다.</p>
                </div>
                <Button size="sm" onClick={handleStartLoop}>
                  <RefreshCw size={14} /> 합주 연습 시작
                </Button>
              </div>
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

      {/* ── Next Steps CTA ── */}
      {record.project_id && record.results.length > 0 && viewMode === 'overview' && (
        <div className="space-y-3 mt-2">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-[var(--border)]" />
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider shrink-0">다음 단계</span>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>

          {/* Issue summary */}
          <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 rounded-xl bg-[var(--bg)] text-[12px]">
            <span className="text-[var(--text-secondary)] font-medium">추출된 이슈</span>
            {riskCounts.critical > 0 && <span className="px-2 py-0.5 rounded-lg bg-red-50 text-red-700 font-bold border border-red-200">차단 {riskCounts.critical}</span>}
            {(() => { const c = record.results.reduce((s, r) => s + (r.concerns || []).length, 0); return c > 0 ? <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 font-bold border border-amber-200">우려 {c}</span> : null; })()}
            {(() => { const w = record.results.reduce((s, r) => s + (r.wants_more || []).length, 0); return w > 0 ? <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 font-bold border border-blue-200">추가 요청 {w}</span> : null; })()}
          </div>

          {/* Two paths: debate (filter issues) or direct start */}
          <div className={`grid gap-3 ${onStartDebate ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            {onStartDebate && (
              <button onClick={onStartDebate}
                className="flex items-center gap-3 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--border)] hover:shadow-sm transition-all cursor-pointer text-left group">
                <div className="w-9 h-9 rounded-lg bg-[var(--ai)] flex items-center justify-center shrink-0">
                  <MessageSquare size={16} className="text-[var(--accent)]" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-[var(--text-primary)]">이슈 정리</p>
                  <p className="text-[11px] text-[var(--text-secondary)]">반영할 이슈를 선별하고 추가합니다</p>
                </div>
                <ArrowRight size={14} className="text-[var(--text-tertiary)] group-hover:text-[var(--accent)] transition-colors shrink-0" />
              </button>
            )}
            <button onClick={handleStartLoop}
              className="flex items-center gap-3 p-4 rounded-xl border border-[var(--accent)]/30 bg-[var(--checkpoint)] hover:border-[var(--accent)]/50 hover:shadow-sm transition-all cursor-pointer text-left group">
              <div className="w-9 h-9 rounded-lg bg-[var(--accent)] flex items-center justify-center shrink-0">
                <RefreshCw size={16} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-bold text-[var(--text-primary)]">합주 연습 시작</p>
                <p className="text-[11px] text-[var(--text-secondary)]">전체 이슈를 반영하여 반복 개선</p>
              </div>
              <ArrowRight size={14} className="text-[var(--text-tertiary)] group-hover:text-[var(--accent)] transition-colors shrink-0" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

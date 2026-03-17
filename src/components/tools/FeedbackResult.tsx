'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Tab } from '@/components/ui/Tab';
import { CopyButton } from '@/components/ui/CopyButton';
import { Badge } from '@/components/ui/Badge';
import type { Persona, FeedbackRecord, RefinementIssue } from '@/stores/types';
import { User, MessageCircleQuestion, ThumbsUp, AlertTriangle, Search, Star, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAccuracyStore } from '@/stores/useAccuracyStore';
import { useJudgmentStore } from '@/stores/useJudgmentStore';
import { useRefinementStore } from '@/stores/useRefinementStore';
import { useRouter } from 'next/navigation';
import { generateId } from '@/lib/uuid';

interface FeedbackResultProps {
  record: FeedbackRecord;
  personas: Persona[];
  onNavigate?: (step: string) => void;
}

export function FeedbackResult({ record, personas, onNavigate }: FeedbackResultProps) {
  const tabs = [
    ...record.results.map((r) => {
      const persona = personas.find((p) => p.id === r.persona_id);
      return { key: r.persona_id, label: persona?.name || '페르소나' };
    }),
    ...(record.synthesis ? [{ key: 'synthesis', label: '종합' }] : []),
  ];

  const [activeTab, setActiveTab] = useState(tabs[0]?.key || '');
  const activeResult = record.results.find((r) => r.persona_id === activeTab);
  const activePersona = personas.find((p) => p.id === activeTab);

  const { addRating } = useAccuracyStore();
  const { addJudgment } = useJudgmentStore();
  const router = useRouter();
  const { createLoop, addIteration, setActiveLoopId } = useRefinementStore();
  const [ratingState, setRatingState] = useState<Record<string, {
    score: number;
    accurateAspects: string[];
    inaccurateAspects: string[];
    saved: boolean;
  }>>({});

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

  const getFullText = () => {
    let text = `## 리허설 결과\n\n**자료**: ${record.document_title}\n**관점**: ${record.feedback_perspective} | **강도**: ${record.feedback_intensity}\n\n`;
    for (const result of record.results) {
      const p = personas.find((persona) => persona.id === result.persona_id);
      text += `### ${p?.name || '페르소나'} (${p?.role || ''})\n\n`;
      text += `**전반적 반응**: ${result.overall_reaction}\n\n`;
      if ((result as any).failure_scenario) {
        text += `**프리모템 (이 계획이 실패한다면?)**\n${(result as any).failure_scenario}\n\n`;
      }
      if ((result as any).untested_assumptions && (result as any).untested_assumptions.length > 0) {
        text += `**검증 안 된 전제**\n${(result as any).untested_assumptions.map((a: string) => `- ${a}`).join('\n')}\n\n`;
      }
      text += `**먼저 물어볼 질문**\n${result.first_questions.map((q) => `- ${q}`).join('\n')}\n\n`;
      text += `**칭찬할 부분**\n${result.praise.map((p) => `- ${p}`).join('\n')}\n\n`;
      text += `**우려/지적**\n${result.concerns.map((c) => `- ${c}`).join('\n')}\n\n`;
      text += `**추가로 보고 싶은 것**\n${result.wants_more.map((w) => `- ${w}`).join('\n')}\n\n`;
      if ((result as any).approval_conditions && (result as any).approval_conditions.length > 0) {
        text += `**승인 조건**\n${(result as any).approval_conditions.map((c: string) => `- ${c}`).join('\n')}\n\n`;
      }
    }
    if (record.synthesis) {
      text += `### 종합 분석\n${record.synthesis}\n`;
    }
    return text;
  };

  const handleStartLoop = () => {
    if (!record.project_id) return;

    // Extract issues from feedback results
    const issues: RefinementIssue[] = [];
    for (const result of record.results) {
      const persona = personas.find(p => p.id === result.persona_id);
      const pName = persona?.name || 'Unknown';

      for (const concern of result.concerns) {
        issues.push({
          id: generateId(),
          source_persona_id: result.persona_id,
          source_persona_name: pName,
          category: 'concern',
          text: concern,
          resolved: false,
        });
      }
      for (const q of result.first_questions) {
        issues.push({
          id: generateId(),
          source_persona_id: result.persona_id,
          source_persona_name: pName,
          category: 'question',
          text: q,
          resolved: false,
        });
      }
      for (const w of result.wants_more) {
        issues.push({
          id: generateId(),
          source_persona_id: result.persona_id,
          source_persona_name: pName,
          category: 'wants_more',
          text: w,
          resolved: false,
        });
      }
    }

    const loopId = createLoop(
      record.project_id,
      record.document_title || '합주 연습',
    );

    addIteration(loopId, {
      iteration_number: 1,
      trigger_reason: '초기 피드백',
      issues_from_feedback: issues,
      constraints_added: [],
      feedback_record_id: record.id,
      delta_summary: '초기 분석 결과에 대한 이해관계자 피드백',
      unresolved_count: issues.length,
      total_issue_count: issues.length,
      convergence_score: 0,
    });

    setActiveLoopId(loopId);
    if (onNavigate) {
      onNavigate('refinement-loop');
    } else {
      router.push('/tools/refinement-loop');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-bold text-[var(--text-primary)]">피드백 결과</h3>
        <CopyButton getText={getFullText} label="전체 복사" />
      </div>

      {tabs.length > 1 && <Tab tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />}

      {activeTab === 'synthesis' ? (
        <Card>
          <div className="text-[14px] leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">
            {record.synthesis}
          </div>
        </Card>
      ) : activeResult ? (
        <div className="space-y-4 animate-fade-in">
          {activePersona && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--bg)] flex items-center justify-center">
                <User size={18} className="text-[var(--text-secondary)]" />
              </div>
              <div>
                <span className="text-[15px] font-bold">{activePersona.name}</span>
                <span className="text-[13px] text-[var(--text-secondary)] ml-2">{activePersona.role}</span>
              </div>
            </div>
          )}

          {/* Overall reaction */}
          <Card className="!bg-[var(--ai)]">
            <p className="text-[12px] font-bold text-[#2d4a7c] mb-1">전반적 반응</p>
            <p className="text-[14px] text-[var(--text-primary)] font-medium">{activeResult.overall_reaction}</p>
          </Card>

          {/* Failure Scenario (Premortem) */}
          {activeResult.failure_scenario && (
            <Card className="!border-l-4 !border-l-red-400">
              <div className="flex items-center gap-2 text-[13px] font-bold text-red-600 mb-2">
                <AlertTriangle size={14} /> 프리모템: 이 계획이 실패한다면?
              </div>
              <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">{activeResult.failure_scenario}</p>
            </Card>
          )}

          {/* Untested Assumptions */}
          {activeResult.untested_assumptions && activeResult.untested_assumptions.length > 0 && (
            <Card className="!border-l-4 !border-l-amber-400">
              <div className="flex items-center gap-2 text-[13px] font-bold text-amber-700 mb-2">
                <AlertTriangle size={14} /> 검증 안 된 전제
              </div>
              <ul className="space-y-1">
                {activeResult.untested_assumptions.map((a: string, i: number) => (
                  <li key={i} className="text-[13px] text-[var(--text-primary)]">• {a}</li>
                ))}
              </ul>
            </Card>
          )}

          {/* First questions */}
          <Card>
            <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--text-primary)] mb-3">
              <MessageCircleQuestion size={14} className="text-[var(--accent)]" />
              이 사람이라면 먼저 물어볼 질문
            </div>
            <ul className="space-y-2">
              {activeResult.first_questions.map((q, i) => (
                <li key={i} className="text-[14px] text-[var(--text-primary)] bg-[var(--bg)] rounded-lg px-3 py-2">
                  {q}
                </li>
              ))}
            </ul>
          </Card>

          {/* Praise */}
          <Card className="!border-l-4 !border-l-[var(--success)]">
            <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--success)] mb-2">
              <ThumbsUp size={14} /> 칭찬할 부분
            </div>
            <ul className="space-y-1">
              {activeResult.praise.map((p, i) => (
                <li key={i} className="text-[13px] text-[var(--text-primary)]">+ {p}</li>
              ))}
            </ul>
          </Card>

          {/* Concerns */}
          <Card className="!border-l-4 !border-l-amber-400">
            <div className="flex items-center gap-2 text-[13px] font-bold text-amber-700 mb-2">
              <AlertTriangle size={14} /> 우려/지적할 부분
            </div>
            <ul className="space-y-1">
              {activeResult.concerns.map((c, i) => (
                <li key={i} className="text-[13px] text-[var(--text-primary)]">- {c}</li>
              ))}
            </ul>
          </Card>

          {/* Wants more */}
          <Card className="!border-l-4 !border-l-[var(--accent)]">
            <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--accent)] mb-2">
              <Search size={14} /> 추가로 보고 싶어할 것
            </div>
            <ul className="space-y-1">
              {activeResult.wants_more.map((w, i) => (
                <li key={i} className="text-[13px] text-[var(--text-primary)]">{w}</li>
              ))}
            </ul>
          </Card>

          {/* Approval Conditions */}
          {activeResult.approval_conditions && activeResult.approval_conditions.length > 0 && (
            <Card className="!border-l-4 !border-l-[var(--success)]">
              <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--success)] mb-2">
                <Check size={14} /> 승인 조건
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mb-2">이것을 보여주면 이 사람이 OK할 것</p>
              <ul className="space-y-1">
                {activeResult.approval_conditions.map((c: string, i: number) => (
                  <li key={i} className="text-[13px] text-[var(--text-primary)]">✓ {c}</li>
                ))}
              </ul>
            </Card>
          )}

          {/* Accuracy Rating */}
          {!ratingState[activeTab]?.saved ? (
            <Card className="!bg-[var(--bg)] !border-dashed">
              <p className="text-[13px] font-bold text-[var(--text-primary)] mb-3">이 피드백의 정확도를 평가해주세요</p>

              {/* Star rating */}
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    onClick={() => setRatingScore(activeTab, score)}
                    className="cursor-pointer p-0.5"
                  >
                    <Star
                      size={20}
                      className={`transition-colors ${
                        score <= (ratingState[activeTab]?.score || 0)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-[var(--border)]'
                      }`}
                    />
                  </button>
                ))}
                {ratingState[activeTab]?.score > 0 && (
                  <span className="text-[12px] text-[var(--text-secondary)] ml-2">{ratingState[activeTab].score}/5</span>
                )}
              </div>

              {/* Aspect checkboxes */}
              <div className="space-y-2 mb-3">
                <p className="text-[11px] font-semibold text-[var(--text-secondary)]">어떤 부분이 정확했나요?</p>
                <div className="flex flex-wrap gap-1.5">
                  {['질문 예측', '칭찬 포인트', '우려/지적', '추가 요구'].map((aspect) => {
                    const isAccurate = ratingState[activeTab]?.accurateAspects?.includes(aspect);
                    const isInaccurate = ratingState[activeTab]?.inaccurateAspects?.includes(aspect);
                    return (
                      <div key={aspect} className="flex items-center gap-1">
                        <button
                          onClick={() => toggleAspect(activeTab, aspect, 'accurate')}
                          className={`px-2 py-1 rounded text-[11px] font-medium border cursor-pointer ${
                            isAccurate ? 'border-[var(--success)] bg-[var(--collab)] text-[var(--success)]' : 'border-[var(--border)] text-[var(--text-secondary)]'
                          }`}
                        >
                          ✓ {aspect}
                        </button>
                        <button
                          onClick={() => toggleAspect(activeTab, aspect, 'inaccurate')}
                          className={`px-2 py-1 rounded text-[11px] font-medium border cursor-pointer ${
                            isInaccurate ? 'border-red-300 bg-red-50 text-red-500' : 'border-[var(--border)] text-[var(--text-secondary)]'
                          }`}
                        >
                          ✗
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button size="sm" onClick={() => saveRating(activeTab)} disabled={!ratingState[activeTab]?.score}>
                평가 저장
              </Button>
            </Card>
          ) : (
            <div className="flex items-center gap-2 text-[var(--success)] text-[12px] font-medium py-2">
              <Check size={14} /> 정확도 평가가 저장되었습니다
            </div>
          )}
        </div>
      ) : null}

      {record.project_id && record.results.length > 0 && (
        <Card className="!bg-[var(--checkpoint)] !border-amber-200 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-bold text-[var(--text-primary)]">이 피드백을 반영하여 반복 개선하시겠어요?</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">피드백의 우려사항을 제약조건으로 변환하여 다시 분석합니다.</p>
            </div>
            <Button size="sm" onClick={handleStartLoop}>
              <RefreshCw size={14} /> 합주 연습 시작
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

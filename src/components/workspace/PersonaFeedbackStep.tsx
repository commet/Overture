'use client';

import { useEffect, useState } from 'react';
import { track, trackError } from '@/lib/analytics';
import { usePersonaStore } from '@/stores/usePersonaStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PersonaCard } from '@/components/tools/PersonaCard';
import { PersonaForm } from '@/components/tools/PersonaForm';
import { FeedbackRequest } from '@/components/tools/FeedbackRequest';
import { FeedbackResult } from '@/components/tools/FeedbackResult';
import { callLLMJson, callLLM } from '@/lib/llm';
import { buildPersonaAccuracyContext } from '@/lib/context-builder';
import type { Persona, FeedbackRecord, PersonaFeedbackResult, HiddenAssumption, StructuredSynthesis, DiscussionMessage } from '@/stores/types';
import { useHandoffStore } from '@/stores/useHandoffStore';
import { useAccuracyStore } from '@/stores/useAccuracyStore';
import { NextStepGuide } from '@/components/ui/NextStepGuide';
import { Plus, Pencil, Trash2, Loader2, Users, RotateCcw } from 'lucide-react';
import { useDecomposeStore } from '@/stores/useDecomposeStore';
import { useOrchestrateStore } from '@/stores/useOrchestrateStore';
import { LoadingSteps } from '@/components/ui/LoadingSteps';
import { playSuccessTone, resumeAudioContext } from '@/lib/audio';
import { ContextChainBlock } from './ContextChainBlock';
import { ConcertmasterInline } from '@/components/workspace/ConcertmasterInline';
import { buildDecomposeContext, buildOrchestrateContext, injectOrchestrateContext } from '@/lib/context-chain';

const FEEDBACK_SYSTEM = (persona: Persona, perspective: string, intensity: string) => {
  const recentLogs = persona.feedback_logs
    .slice(-5)
    .map((log) => `- [${log.date}] ${log.context}: ${log.feedback}`)
    .join('\n');

  return `당신은 아래 프로필의 이해관계자입니다. 이 사람의 관점을 완전히 체화하여 제출된 자료를 검증하세요.

[사고 방식]
- 실패 시나리오: "이 계획이 이미 실패했다고 가정하세요. 가장 가능성 높은 실패 원인은?"
- 리스크 분류: 우려사항을 세 가지로 분류하세요:
  * "critical" — 핵심 위협. 확률 높고 임팩트 큼. 이걸 해결 안 하면 진행 불가.
  * "manageable" — 과장된 우려. 무서워 보이지만 대응책이 있거나 임팩트 제한적.
  * "unspoken" — 침묵의 리스크. 모두 알지만 아무도 꺼내지 않는 문제. 조직 정치, 역량 부족 등.
- 가정 공격: 자료에 깔린 전제 중 검증되지 않은 것을 찾아 지적하세요.
- 승인 조건: "이것을 보여주면 OK하겠다"는 구체적 조건을 제시하세요.
- 이 사람의 말투와 관심사로 답하세요. 형식적인 동의가 아니라 진짜 지적을 하세요.

## 페르소나
- 이름: ${persona.name}
- 역할: ${persona.role}
- 소속: ${persona.organization}
- 우선순위: ${persona.priorities}
- 커뮤니케이션 스타일: ${persona.communication_style}
- 최근 관심사/우려: ${persona.known_concerns}
- 의사결정 영향력: ${persona.influence || 'medium'}
- 핵심 성향: ${persona.extracted_traits.join(', ')}

## 과거 이 사람이 실제로 했던 피드백 (참고)
${recentLogs || '(없음)'}

## 피드백 지침
- 관점: ${perspective}
  ${{
    '전반적 인상': '전체적인 완성도, 논리 구조, 실행 가능성을 균형있게 평가하세요.',
    '논리 구조': '주장의 논리적 연결, 인과관계의 비약, 근거 없는 결론에 집중하세요. "왜?"를 반복하세요.',
    '실행 가능성': '자원, 일정, 역량, 의존성 관점에서 실행할 수 있는지만 집중하세요.',
    '리스크': '실패 확률과 임팩트를 중심으로. failure_scenario와 classified_risks에 특히 집중하세요.',
    '숫자/데이터': '수치의 근거, 추정의 합리성, 빠진 데이터를 중점 검토하세요.',
  }[perspective] || '이 관점에서 자료를 검토하세요.'}
- 강도: ${intensity}
  ${{
    '부드럽게': '건설적 톤. praise를 3개 이상 구체적으로. concerns는 "~하면 더 좋을 것 같습니다" 형태로. classified_risks에서 critical은 정말 치명적인 것만.',
    '솔직하게': '좋은 점과 문제점을 균형있게. 빈말 없이 핵심만.',
    '까다롭게': '비판적 관점 강화. "왜 이것이 안 되는지"를 기본 태도로. classified_risks에서 critical과 unspoken을 적극 사용. praise는 정말 뛰어난 부분만 0-1개. approval_conditions를 높은 기준으로.',
  }[intensity] || ''}
${persona.influence === 'high' ? '- ⚠️ 이 사람의 영향력이 높습니다. 당신의 의견은 이 프로젝트의 성패에 결정적입니다. 구체적인 승인 조건을 제시하세요.' : persona.influence === 'low' ? '- 이 사람의 영향력은 제한적이지만 현장의 시각을 반영합니다.' : ''}

## 응답 형식 (JSON만 출력)
{
  "overall_reaction": "한 문장으로 이 사람의 전반적 반응",
  "failure_scenario": "이 계획이 실패한다면, 가장 가능성 높은 이유는... (구체적으로)",
  "untested_assumptions": ["자료에서 검증 없이 전제하고 있는 가정 1~3개"],
  "classified_risks": [
    {"text": "리스크 설명. 이 사람의 말투로.", "category": "critical 또는 manageable 또는 unspoken"}
  ],
  "first_questions": ["이 사람이라면 자료를 보자마자 물어볼 질문 3개"],
  "praise": ["구체적으로 칭찬할 부분 1~3개"],
  "concerns": ["우려하거나 지적할 부분 1~3개. 이 사람의 말투로"],
  "wants_more": ["추가로 보고 싶어할 정보/분석 1~2개"],
  "approval_conditions": ["이것을 보여주면 승인하겠다는 구체적 조건 1~2개"]
}

${buildPersonaAccuracyContext(persona.id)}

반드시 JSON만 응답하세요.`;
};

/* ────────────────────────────────────────────
   Phase-based flow (matches Decompose/Orchestrate pattern)
   setup → running → results
   ──────────────────────────────────────────── */

type RehearsalPhase = 'setup' | 'running' | 'results';

interface PersonaFeedbackStepProps {
  onNavigate: (step: string) => void;
}

export function PersonaFeedbackStep({ onNavigate }: PersonaFeedbackStepProps) {
  const { personas, feedbackHistory, loadData, createPersona, updatePersona, deletePersona, addFeedbackRecord, getPersona, seedDefaultPersonas } = usePersonaStore();
  const { loadSettings } = useSettingsStore();
  const { loadRatings } = useAccuracyStore();
  const { handoff, clearHandoff } = useHandoffStore();
  const { items: decomposeItems, loadItems: loadDecompose } = useDecomposeStore();
  const { items: orchestrateItems, loadItems: loadOrchestrate } = useOrchestrateStore();

  const [phase, setPhase] = useState<RehearsalPhase>('setup');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [discussionLoading, setDiscussionLoading] = useState(false);
  const [latestFeedback, setLatestFeedback] = useState<FeedbackRecord | null>(null);
  const [handoffContent, setHandoffContent] = useState<string>('');
  const [handoffTitle, setHandoffTitle] = useState<string>('');
  const [pendingProjectId, setPendingProjectId] = useState<string | undefined>();
  const [showPersonaForm, setShowPersonaForm] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [managingPersonas, setManagingPersonas] = useState(false);

  useEffect(() => {
    loadData();
    loadSettings();
    loadRatings();
    loadDecompose();
    loadOrchestrate();
  }, [loadData, loadSettings, loadRatings, loadDecompose, loadOrchestrate]);

  // Seed default example personas on first use
  useEffect(() => {
    seedDefaultPersonas();
  }, [seedDefaultPersonas]);

  // Handle handoff from previous step
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (handoff) {
      setHandoffContent(handoff.content);
      setHandoffTitle(`${handoff.from === 'decompose' ? '악보 해석' : handoff.from === 'orchestrate' ? '편곡' : '리허설'} 결과물`);
      setPendingProjectId(handoff.projectId);
      setPhase('setup');
      clearHandoff();
    }
  }, []);

  // ── Persona management ──
  const handleSavePersona = (data: Partial<Persona>) => {
    if (editingPersona) {
      updatePersona(editingPersona.id, data);
    } else {
      createPersona(data);
    }
    setShowPersonaForm(false);
    setEditingPersona(null);
  };

  // ── Feedback submit (setup → running → results) ──
  const handleFeedbackSubmit = async (data: {
    documentTitle: string;
    documentText: string;
    personaIds: string[];
    perspective: string;
    intensity: string;
  }) => {
    setPhase('running');
    setFeedbackLoading(true);
    try {
      const results: PersonaFeedbackResult[] = [];
      for (const personaId of data.personaIds) {
        const persona = getPersona(personaId);
        if (!persona) continue;
        let systemPrompt = FEEDBACK_SYSTEM(persona, data.perspective, data.intensity);

        const accuracyCtx = buildPersonaAccuracyContext(personaId);
        if (accuracyCtx) {
          systemPrompt = `${systemPrompt}\n\n${accuracyCtx}`;
        }

        const projectId = pendingProjectId;
        if (projectId) {
          const relDecompose = decomposeItems
            .filter(d => d.project_id === projectId && d.status === 'done' && d.analysis)
            .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))[0];
          const relOrchestrate = orchestrateItems
            .filter(o => o.project_id === projectId && o.analysis && o.status === 'done')
            .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))[0];
          if (relOrchestrate) {
            const orchCtx = buildOrchestrateContext(relOrchestrate);
            const decCtx = relDecompose ? buildDecomposeContext(relDecompose) : undefined;
            systemPrompt = injectOrchestrateContext(systemPrompt, orchCtx, decCtx);
          }
        }

        const result = await callLLMJson<Omit<PersonaFeedbackResult, 'persona_id'>>(
          [{ role: 'user', content: data.documentText }],
          { system: systemPrompt, maxTokens: 2000 }
        );
        results.push({ ...result, persona_id: personaId });
      }

      let synthesis = '';
      let structured_synthesis: StructuredSynthesis | undefined;
      if (results.length > 1) {
        const feedbackSummary = results.map((r) => {
          const p = getPersona(r.persona_id);
          const influence = p?.influence || 'medium';
          return `### ${p?.name} (ID: ${r.persona_id}, 영향력: ${influence})\n질문: ${r.first_questions.join('; ')}\n칭찬: ${r.praise.join('; ')}\n우려: ${r.concerns.join('; ')}${r.classified_risks ? `\n리스크: ${r.classified_risks.map(cr => `[${cr.category}] ${cr.text}`).join('; ')}` : ''}`;
        }).join('\n\n');

        try {
          const synthResult = await callLLMJson<StructuredSynthesis>(
            [{ role: 'user', content: feedbackSummary }],
            { system: `여러 이해관계자의 피드백을 종합 분석하세요.

응답 형식 (JSON만 출력):
{
  "common_agreements": ["모든 이해관계자가 동의하는 포인트 1~3개"],
  "key_conflicts": [
    {
      "topic": "갈등 주제",
      "positions": [
        {"persona_id": "해당 페르소나 ID", "stance": "이 사람의 입장 요약"}
      ]
    }
  ],
  "priority_actions": [
    {
      "action": "우선 수정해야 할 사항",
      "requested_by": "요청한 이해관계자 이름",
      "priority": "high 또는 medium"
    }
  ]
}

규칙:
- 영향력 높은 이해관계자의 우려를 priority "high"로
- 핵심 위협(critical)과 침묵의 리스크(unspoken)를 우선 반영
- 한국어로 작성
- 반드시 JSON만 응답`, maxTokens: 1500 }
          );
          structured_synthesis = synthResult;
          synthesis = `공통 합의: ${synthResult.common_agreements.join(', ')}. 핵심 갈등: ${synthResult.key_conflicts.map(c => c.topic).join(', ')}.`;
        } catch {
          synthesis = await callLLM(
            [{ role: 'user', content: feedbackSummary }],
            { system: '여러 이해관계자의 피드백을 종합하세요. 1) 공통 지적 사항 2) 페르소나별로 다른 반응 3) 우선 수정 권고. 한국어로 답변하세요.', maxTokens: 1500 }
          );
        }
      }

      const recordId = addFeedbackRecord({
        document_title: data.documentTitle || '제목 없음',
        document_text: data.documentText,
        persona_ids: data.personaIds,
        feedback_perspective: data.perspective,
        feedback_intensity: data.intensity,
        results,
        synthesis,
        structured_synthesis,
        project_id: pendingProjectId,
      });

      const record = usePersonaStore.getState().feedbackHistory.find((r) => r.id === recordId);
      if (record) setLatestFeedback(record);
      setPhase('results');
      const criticalCount = results.flatMap(r => (r.classified_risks || []).filter(cr => cr.category === 'critical')).length;
      const unspokenCount = results.flatMap(r => (r.classified_risks || []).filter(cr => cr.category === 'unspoken')).length;
      track('feedback_complete', {
        personas_count: results.length,
        has_synthesis: !!synthesis,
        perspective: data.perspective,
        intensity: data.intensity,
        critical_risks: criticalCount,
        unspoken_risks: unspokenCount,
        total_concerns: results.flatMap(r => r.concerns || []).length,
        total_approval_conditions: results.flatMap(r => r.approval_conditions || []).length,
      });
      const { settings } = useSettingsStore.getState();
      if (settings.audio_enabled) {
        resumeAudioContext();
        playSuccessTone(settings.audio_volume);
      }
    } catch (err) {
      trackError('feedback_generate', err);
      alert('리허설을 진행할 수 없었습니다. 다시 시도하거나, 자료를 더 구체적으로 작성해보세요. ' + (err instanceof Error ? err.message : ''));
      setPhase('setup');
    } finally {
      setFeedbackLoading(false);
    }
  };

  // ── Discussion simulation ──
  const handleStartDiscussion = async () => {
    if (!latestFeedback || latestFeedback.results.length < 2) return;
    setDiscussionLoading(true);
    try {
      const personaProfiles = latestFeedback.results.map(r => {
        const p = getPersona(r.persona_id);
        return `## ${p?.name} (ID: ${r.persona_id}, ${p?.role}, 영향력: ${p?.influence || 'medium'})
성향: ${p?.extracted_traits.join(', ')}
전반적 반응: ${r.overall_reaction}
주요 우려: ${r.concerns.join('; ')}
질문: ${r.first_questions.join('; ')}
리스크: ${(r.classified_risks || []).map(cr => `[${cr.category}] ${cr.text}`).join('; ')}`;
      }).join('\n\n');

      const discussionResult = await callLLMJson<{ messages: DiscussionMessage[]; key_takeaway: string }>(
        [{ role: 'user', content: personaProfiles }],
        {
          system: `이해관계자들이 자료를 검토한 후 회의실에서 토론합니다.
각 이해관계자의 개별 피드백을 보고, 서로의 의견에 반응하는 대화를 시뮬레이션하세요.

규칙:
- 첫 발화는 영향력이 가장 높은 이해관계자가 시작
- 각 발화는 다른 이해관계자의 구체적 발언에 반응해야 함
- 단순 동의("맞습니다")보다 이유나 관점 차이를 드러내기
- 영향력이 높은 이해관계자의 발언이 대화를 주도
- 6~10개 메시지로 핵심 쟁점만 다루기
- 각 이해관계자의 말투와 관심사를 유지
- 모든 이해관계자가 최소 2번씩 발언

응답 형식 (JSON만 출력):
{
  "messages": [
    {
      "persona_id": "해당 페르소나 ID",
      "message": "이 사람의 말투로 된 발언. 구체적이고 자연스럽게.",
      "reacting_to": "반응 대상 persona_id 또는 null (첫 발언)",
      "type": "agreement 또는 disagreement 또는 elaboration 또는 question"
    }
  ],
  "key_takeaway": "토론의 핵심 결론 1문장"
}

한국어로 작성하세요. 반드시 JSON만 응답하세요.`,
          maxTokens: 2500,
        }
      );

      const updatedRecord: FeedbackRecord = {
        ...latestFeedback,
        discussion: discussionResult.messages,
      };
      updatedRecord.discussion_takeaway = discussionResult.key_takeaway;
      setLatestFeedback(updatedRecord);
      track('discussion_complete', { message_count: discussionResult.messages.length });
    } catch (err) {
      alert('토론을 생성할 수 없었습니다. ' + (err instanceof Error ? err.message : ''));
    } finally {
      setDiscussionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>리허설 <span className="text-[16px] font-normal text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-display)' }}>| 사전 검증</span></h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">
          보고서를 보낼 사람의 시점에서 미리 피드백을 받습니다. 보내기 전에.
        </p>
        <div className="mt-2">
          <ConcertmasterInline step="persona-feedback" />
        </div>
      </div>

      {/* ── History pills (visible in all phases) ── */}
      {feedbackHistory.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {phase !== 'setup' && (
            <button
              onClick={() => { setPhase('setup'); setLatestFeedback(null); }}
              className="shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium border border-dashed border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <RotateCcw size={11} /> 새 리허설
            </button>
          )}
          {[...feedbackHistory].reverse().slice(0, 5).map((record) => (
            <button
              key={record.id}
              onClick={() => { setLatestFeedback(record); setPhase('results'); }}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium border cursor-pointer transition-colors ${
                latestFeedback?.id === record.id && phase === 'results'
                  ? 'border-[var(--accent)] bg-[var(--ai)] text-[var(--accent)]'
                  : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border)]'
              }`}
            >
              {record.document_title || '제목 없음'}
              <span className="text-[var(--text-tertiary)] ml-1.5">{record.results.length}명</span>
            </button>
          ))}
        </div>
      )}

      {/* ══════════════ SETUP PHASE ══════════════ */}
      {phase === 'setup' && (
        <div className="space-y-6 animate-fade-in">
          {/* Persona management bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-[var(--text-secondary)]" />
              <span className="text-[13px] font-semibold text-[var(--text-primary)]">{personas.length}명의 이해관계자</span>
              {personas.some(p => p.is_example) && (
                <span className="text-[10px] text-[var(--text-tertiary)]">예시 포함</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setManagingPersonas(!managingPersonas)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border)] cursor-pointer transition-colors"
              >
                <Pencil size={10} className="inline mr-1" />
                {managingPersonas ? '접기' : '편집'}
              </button>
              <button
                onClick={() => { setEditingPersona(null); setShowPersonaForm(true); setManagingPersonas(true); }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-[var(--accent)]/30 text-[var(--accent)] hover:bg-[var(--ai)] cursor-pointer transition-colors"
              >
                <Plus size={10} className="inline mr-1" /> 새 페르소나
              </button>
            </div>
          </div>

          {/* Inline persona form */}
          {showPersonaForm && managingPersonas && (
            <Card>
              <PersonaForm
                persona={editingPersona || undefined}
                onSave={handleSavePersona}
                onCancel={() => { setShowPersonaForm(false); setEditingPersona(null); }}
              />
            </Card>
          )}

          {/* Persona management grid (edit/delete) */}
          {managingPersonas && !showPersonaForm && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {personas.map((p) => (
                <div key={p.id} className="relative group">
                  <PersonaCard persona={p} onClick={() => { setEditingPersona(p); setShowPersonaForm(true); }} />
                  {p.is_example && (
                    <span className="absolute top-2 left-3 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--ai)] text-[var(--accent)]">예시</span>
                  )}
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button onClick={() => { setEditingPersona(p); setShowPersonaForm(true); }}
                      className="p-1.5 bg-[var(--surface)]/90 backdrop-blur-sm rounded-lg shadow-sm border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--accent)] cursor-pointer transition-colors">
                      <Pencil size={11} />
                    </button>
                    <button onClick={() => { if (confirm('삭제하시겠습니까?')) deletePersona(p.id); }}
                      className="p-1.5 bg-[var(--surface)]/90 backdrop-blur-sm rounded-lg shadow-sm border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-red-500 cursor-pointer transition-colors">
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* FeedbackRequest: document + persona selection + settings + submit */}
          <FeedbackRequest
            personas={personas}
            onSubmit={handleFeedbackSubmit}
            loading={feedbackLoading}
            initialContent={handoffContent}
            initialTitle={handoffTitle}
          />
        </div>
      )}

      {/* ══════════════ RUNNING PHASE ══════════════ */}
      {phase === 'running' && (
        <Card>
          <LoadingSteps steps={[
            '이해관계자를 무대 앞으로 초대하고 있습니다...',
            '각자의 관점에서 자료를 검토하고 있습니다...',
            '침묵의 리스크를 찾고 있습니다...',
          ]} />
        </Card>
      )}

      {/* ══════════════ RESULTS PHASE ══════════════ */}
      {phase === 'results' && latestFeedback && (
        <div className="space-y-4 animate-fade-in">
          {/* Context chain */}
          {(() => {
            const projectId = latestFeedback.project_id;
            if (!projectId) return null;
            const decompose = decomposeItems.find(d => d.project_id === projectId && d.analysis);
            const orchestrate = orchestrateItems.find(o => o.project_id === projectId && o.analysis);
            if (!decompose?.analysis && !orchestrate?.analysis) return null;
            const items = [];
            if (decompose?.analysis?.hidden_assumptions && decompose.analysis.hidden_assumptions.length > 0) {
              items.push({
                label: '검증되지 않은 전제',
                count: decompose.analysis.hidden_assumptions.length,
                details: decompose.analysis.hidden_assumptions.map((a: HiddenAssumption | string) =>
                  typeof a === 'string' ? a : a.assumption + (a.risk_if_false ? ` → ${a.risk_if_false}` : '')
                ),
                color: 'text-amber-700',
              });
            }
            if (orchestrate?.analysis?.key_assumptions && orchestrate.analysis.key_assumptions.length > 0) {
              items.push({
                label: '편곡의 핵심 가정',
                count: orchestrate.analysis.key_assumptions.length,
                details: orchestrate.analysis.key_assumptions.map(ka => ka.assumption),
              });
            }
            const summary = decompose?.analysis
              ? `악보 해석에서 발견한 핵심 질문: ${decompose.selected_question || decompose.analysis.surface_task}`
              : `편곡의 핵심 가정 ${orchestrate?.analysis?.key_assumptions?.length || 0}건을 이 리허설에서 검증합니다.`;
            return <ContextChainBlock summary={summary} items={items} />;
          })()}

          <FeedbackResult
            record={latestFeedback}
            personas={personas}
            onNavigate={onNavigate}
            onStartDiscussion={handleStartDiscussion}
            discussionLoading={discussionLoading}
          />

          {latestFeedback?.project_id && (
            <NextStepGuide
              currentTool="persona-feedback"
              projectId={latestFeedback.project_id}
              onSendTo={(href) => onNavigate(href.replace('/tools/', ''))}
            />
          )}
        </div>
      )}
    </div>
  );
}

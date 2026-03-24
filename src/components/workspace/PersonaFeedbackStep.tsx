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
import { buildFeedbackSystemPrompt } from '@/lib/persona-prompt';
import type { Persona, FeedbackRecord, PersonaFeedbackResult, HiddenAssumption, StructuredSynthesis, DiscussionMessage } from '@/stores/types';
import { useHandoffStore } from '@/stores/useHandoffStore';
import { useAccuracyStore } from '@/stores/useAccuracyStore';
import { NextStepGuide } from '@/components/ui/NextStepGuide';
import { Plus, Pencil, Trash2, Loader2, Users, RotateCcw, Check, AlertTriangle } from 'lucide-react';
import { useDecomposeStore } from '@/stores/useDecomposeStore';
import { useOrchestrateStore } from '@/stores/useOrchestrateStore';
import { LoadingSteps } from '@/components/ui/LoadingSteps';
import { playSuccessTone, resumeAudioContext } from '@/lib/audio';
import { ContextChainBlock } from './ContextChainBlock';
import { ConcertmasterInline } from '@/components/workspace/ConcertmasterInline';
import { buildDecomposeContext, buildOrchestrateContext, injectOrchestrateContext } from '@/lib/context-chain';
import { recordRehearsalEval } from '@/lib/eval-engine';

// Single source of truth: persona-prompt.ts
const FEEDBACK_SYSTEM = (persona: Persona, perspective: string, intensity: string) =>
  buildFeedbackSystemPrompt(persona, perspective, intensity);

/* ────────────────────────────────────────────
   Phase-based flow (matches Decompose/Orchestrate pattern)
   setup → running → results
   ──────────────────────────────────────────── */

type RehearsalPhase = 'setup' | 'running' | 'results';

interface PersonaFeedbackStepProps {
  onNavigate: (step: string) => void;
}

export function PersonaFeedbackStep({ onNavigate }: PersonaFeedbackStepProps) {
  const { personas, feedbackHistory, loadData, createPersona, updatePersona, deletePersona, addFeedbackRecord, updateFeedbackRecord, getPersona, seedDefaultPersonas } = usePersonaStore();
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
  const [autoPersonaIds, setAutoPersonaIds] = useState<string[]>([]);
  const [showPersonaForm, setShowPersonaForm] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [managingPersonas, setManagingPersonas] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [lastFeedbackData, setLastFeedbackData] = useState<{ documentTitle: string; documentText: string; personaIds: string[]; perspective: string; intensity: string } | null>(null);

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
      if (handoff.autoPersonaIds && handoff.autoPersonaIds.length > 0) {
        setAutoPersonaIds(handoff.autoPersonaIds);
      }
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
    setFeedbackError('');
    setLastFeedbackData(data);
    try {
      const results: PersonaFeedbackResult[] = [];
      for (const personaId of data.personaIds) {
        const persona = getPersona(personaId);
        if (!persona) continue;
        let systemPrompt = FEEDBACK_SYSTEM(persona, data.perspective, data.intensity);
        // Note: buildPersonaAccuracyContext is already called inside FEEDBACK_SYSTEM

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
          return `### ${p?.name} (ID: ${r.persona_id}, 영향력: ${influence})\n질문: ${(r.first_questions || []).join('; ')}\n칭찬: ${(r.praise || []).join('; ')}\n우려: ${(r.concerns || []).join('; ')}${r.classified_risks ? `\n리스크: ${r.classified_risks.map(cr => `[${cr.category}] ${cr.text}`).join('; ')}` : ''}`;
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
      // Phase 0: Record rehearsal eval
      if (record) { recordRehearsalEval(record, usePersonaStore.getState().personas, useAccuracyStore.getState().ratings); }
      const { settings } = useSettingsStore.getState();
      if (settings.audio_enabled) {
        resumeAudioContext();
        playSuccessTone(settings.audio_volume);
      }
    } catch (err) {
      trackError('feedback_generate', err);
      setFeedbackError('리허설을 진행할 수 없었습니다. ' + (err instanceof Error ? err.message : ''));
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
성향: ${p?.extracted_traits?.join(', ') || ''}
전반적 반응: ${r.overall_reaction}
주요 우려: ${(r.concerns || []).join('; ')}
질문: ${(r.first_questions || []).join('; ')}
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
        discussion_takeaway: discussionResult.key_takeaway,
      };
      setLatestFeedback(updatedRecord);
      updateFeedbackRecord(latestFeedback.id, {
        discussion: discussionResult.messages,
        discussion_takeaway: discussionResult.key_takeaway,
      });
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
          {/* Handoff context confirmation */}
          {handoffContent && (
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--accent)]">
              <Check size={12} /> {handoffTitle || '이전 단계'} 맥락이 연결되어 있습니다
            </div>
          )}

          {/* Persona management bar — hide when auto-personas are pre-selected */}
          {autoPersonaIds.length === 0 && (
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
          )}
          {autoPersonaIds.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--ai)]">
              <Check size={14} className="text-[var(--accent)]" />
              <span className="text-[12px] font-medium text-[#2d4a7c]">편곡에서 식별된 이해관계자 {autoPersonaIds.length}명이 선택되었습니다</span>
            </div>
          )}

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

          {/* ─── Error ─── */}
          {feedbackError && (
            <div className="flex items-center justify-between gap-2 text-red-600 text-[13px] bg-red-50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} /> <span>{feedbackError}</span>
              </div>
              <button onClick={() => { if (feedbackLoading) return; setFeedbackError(''); if (lastFeedbackData) handleFeedbackSubmit(lastFeedbackData); }} className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-red-200 text-red-600 hover:bg-red-100 cursor-pointer transition-colors">
                다시 시도
              </button>
            </div>
          )}

          {/* FeedbackRequest: document + persona selection + settings + submit */}
          <FeedbackRequest
            personas={personas}
            onSubmit={handleFeedbackSubmit}
            loading={feedbackLoading}
            initialContent={handoffContent}
            initialTitle={handoffTitle}
            initialPersonaIds={autoPersonaIds}
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

          {/* ── Reward: 리허설 발견 요약 ── */}
          {(() => {
            const results = latestFeedback.results || [];
            const allRisks = results.flatMap(r => r.classified_risks || []);
            const critical = allRisks.filter(r => r.category === 'critical').length;
            const manageable = allRisks.filter(r => r.category === 'manageable').length;
            const unspoken = allRisks.filter(r => r.category === 'unspoken').length;
            const approvalCount = results.reduce((s, r) => s + (r.approval_conditions?.length || 0), 0);
            const personaCount = results.length;
            if (personaCount === 0) return null;

            // 가장 날카로운 지적: 첫 번째 failure_scenario 또는 critical risk
            const sharpestPersona = results.find(r => r.failure_scenario);
            const sharpestQuote = sharpestPersona?.failure_scenario;
            const sharpestName = sharpestPersona ? personas.find(p => p.id === sharpestPersona.persona_id)?.name : null;

            return (
              <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--ai)] p-4">
                <p className="text-[12px] font-bold text-[var(--text-primary)] mb-3">{personaCount}명의 이해관계자가 검토했습니다</p>

                {/* 가장 날카로운 한마디 */}
                {sharpestQuote && (
                  <div className="mb-3 pl-3 border-l-2 border-[var(--accent)]/40">
                    <p className="text-[12px] text-[var(--text-primary)] leading-relaxed italic">&ldquo;{sharpestQuote}&rdquo;</p>
                    {sharpestName && <p className="text-[11px] text-[var(--accent)] font-medium mt-1">— {sharpestName}</p>}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mb-2">
                  {critical > 0 && <span className="text-[11px] px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 font-semibold">핵심 리스크 {critical}건</span>}
                  {manageable > 0 && <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-600 font-medium">관리 가능 {manageable}건</span>}
                  {unspoken > 0 && <span className="text-[11px] px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-600 font-semibold">침묵의 리스크 {unspoken}건</span>}
                  {approvalCount > 0 && <span className="text-[11px] px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-600 font-medium">승인 조건 {approvalCount}건</span>}
                </div>
                {(critical > 0 || unspoken > 0) && (
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                    AI에게 직접 물었다면 동의만 했을 겁니다. 이 반론들이 실행 전에 방향을 바로잡습니다.
                  </p>
                )}
                {critical === 0 && unspoken === 0 && (
                  <p className="text-[11px] text-[var(--success)] font-medium">큰 위협 없이 통과했습니다. 실행 준비가 되었습니다.</p>
                )}
              </div>
            );
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

'use client';

import { useEffect, useState } from 'react';
import { track } from '@/lib/analytics';
import { usePersonaStore } from '@/stores/usePersonaStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tab } from '@/components/ui/Tab';
import { Field } from '@/components/ui/Field';
import { PersonaCard } from '@/components/tools/PersonaCard';
import { PersonaForm } from '@/components/tools/PersonaForm';
import { FeedbackRequest } from '@/components/tools/FeedbackRequest';
import { FeedbackResult } from '@/components/tools/FeedbackResult';
import { callLLMJson, callLLM } from '@/lib/llm';
import { buildPersonaAccuracyContext } from '@/lib/context-builder';
import type { Persona, FeedbackRecord, PersonaFeedbackResult } from '@/stores/types';
import { useHandoffStore } from '@/stores/useHandoffStore';
import { useAccuracyStore } from '@/stores/useAccuracyStore';
import { NextStepGuide } from '@/components/ui/NextStepGuide';
import { Plus, Trash2, ArrowLeft, Pencil, Loader2, Users } from 'lucide-react';
import { useDecomposeStore } from '@/stores/useDecomposeStore';
import { useOrchestrateStore } from '@/stores/useOrchestrateStore';
import { LoadingSteps } from '@/components/ui/LoadingSteps';
import { playSuccessTone, resumeAudioContext } from '@/lib/audio';
import { ContextChainBlock } from './ContextChainBlock';
import { buildDecomposeContext, buildOrchestrateContext, injectOrchestrateContext } from '@/lib/context-chain';

const FEEDBACK_SYSTEM = (persona: Persona, perspective: string, intensity: string) => {
  const recentLogs = persona.feedback_logs
    .slice(-5)
    .map((log) => `- [${log.date}] ${log.context}: ${log.feedback}`)
    .join('\n');

  return `당신은 아래 프로필의 이해관계자입니다. 이 사람의 관점을 완전히 체화하여 제출된 자료를 검증하세요.

[사고 방식]
- 프리모템: "이 계획이 이미 실패했다고 가정하세요. 가장 가능성 높은 실패 원인은?"
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
- 강도: ${intensity}
${persona.influence === 'high' ? '- ⚠️ 이 사람의 영향력이 높습니다. 당신의 의견은 이 프로젝트의 성패에 결정적입니다. 구체적인 승인 조건을 제시하세요.' : persona.influence === 'low' ? '- 이 사람의 영향력은 제한적이지만 현장의 시각을 반영합니다.' : ''}

## 응답 형식 (JSON만 출력)
{
  "overall_reaction": "한 문장으로 이 사람의 전반적 반응",
  "failure_scenario": "이 계획이 실패한다면, 가장 가능성 높은 이유는... (프리모템. 구체적으로)",
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

interface PersonaFeedbackStepProps {
  onNavigate: (step: string) => void;
}

export function PersonaFeedbackStep({ onNavigate }: PersonaFeedbackStepProps) {
  const { personas, feedbackHistory, loadData, createPersona, updatePersona, deletePersona, addFeedbackLog, deleteFeedbackLog, addFeedbackRecord, getPersona } = usePersonaStore();
  const { loadSettings } = useSettingsStore();
  const { loadRatings } = useAccuracyStore();
  const [activeTab, setActiveTab] = useState('personas');
  const [showForm, setShowForm] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [viewingPersona, setViewingPersona] = useState<Persona | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [latestFeedback, setLatestFeedback] = useState<FeedbackRecord | null>(null);
  const [logDate, setLogDate] = useState('');
  const [logContext, setLogContext] = useState('');
  const [logFeedback, setLogFeedback] = useState('');
  const { handoff, clearHandoff } = useHandoffStore();
  const { items: decomposeItems, loadItems: loadDecompose } = useDecomposeStore();
  const { items: orchestrateItems, loadItems: loadOrchestrate } = useOrchestrateStore();
  const [handoffContent, setHandoffContent] = useState<string>('');
  const [handoffTitle, setHandoffTitle] = useState<string>('');

  useEffect(() => {
    loadData();
    loadSettings();
    loadRatings();
    loadDecompose();
    loadOrchestrate();
  }, [loadData, loadSettings, loadRatings, loadDecompose, loadOrchestrate]);

  const [pendingProjectId, setPendingProjectId] = useState<string | undefined>();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (handoff) {
      setHandoffContent(handoff.content);
      setHandoffTitle(`${handoff.from === 'decompose' ? '악보 해석' : handoff.from === 'orchestrate' ? '편곡' : '리허설'} 결과물`);
      setPendingProjectId(handoff.projectId);
      setActiveTab('feedback');
      clearHandoff();
    }
  }, []);  // Run once on mount

  const handleSavePersona = (data: Partial<Persona>) => {
    if (editingPersona) {
      updatePersona(editingPersona.id, data);
    } else {
      createPersona(data);
    }
    setShowForm(false);
    setEditingPersona(null);
  };

  const handleFeedbackSubmit = async (data: {
    documentTitle: string;
    documentText: string;
    personaIds: string[];
    perspective: string;
    intensity: string;
  }) => {
    setFeedbackLoading(true);
    try {
      const results: PersonaFeedbackResult[] = [];
      for (const personaId of data.personaIds) {
        const persona = getPersona(personaId);
        if (!persona) continue;
        // Phase 3: Build system prompt with structured context injection
        let systemPrompt = FEEDBACK_SYSTEM(persona, data.perspective, data.intensity);

        // Inject persona accuracy model (behavioral calibration)
        const accuracyCtx = buildPersonaAccuracyContext(personaId);
        if (accuracyCtx) {
          systemPrompt = `${systemPrompt}\n\n${accuracyCtx}`;
        }

        // Inject orchestrate + decompose context for assumption attack
        const projectId = pendingProjectId;
        if (projectId) {
          const relDecompose = decomposeItems
            .filter(d => d.project_id === projectId && d.status === 'done' && d.analysis)
            .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))[0];
          const relOrchestrate = orchestrateItems
            .filter(o => o.project_id === projectId && o.analysis)
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
      if (results.length > 1) {
        const feedbackSummary = results.map((r) => {
          const p = getPersona(r.persona_id);
          const influence = p?.influence || 'medium';
          return `### ${p?.name} (영향력: ${influence})\n질문: ${r.first_questions.join('; ')}\n칭찬: ${r.praise.join('; ')}\n우려: ${r.concerns.join('; ')}${r.classified_risks ? `\n리스크: ${r.classified_risks.map(cr => `[${cr.category}] ${cr.text}`).join('; ')}` : ''}`;
        }).join('\n\n');
        synthesis = await callLLM(
          [{ role: 'user', content: feedbackSummary }],
          { system: '여러 이해관계자의 피드백을 종합하세요. 1) 공통 지적 사항 2) 페르소나별로 다른 반응 3) 우선 수정 권고 — 영향력(influence)이 높은 이해관계자의 우려를 우선하세요. 충돌이 있을 때는 "영향력이 높은 [이름]의 우려가 우선합니다"라고 명시하세요. 4) 핵심 위협(critical)과 침묵의 리스크(unspoken)를 강조하세요. 한국어로 답변하세요.', maxTokens: 1500 }
        );
      }

      const recordId = addFeedbackRecord({
        document_title: data.documentTitle || '제목 없음',
        document_text: data.documentText,
        persona_ids: data.personaIds,
        feedback_perspective: data.perspective,
        feedback_intensity: data.intensity,
        results,
        synthesis,
        project_id: pendingProjectId,
      });

      const record = usePersonaStore.getState().feedbackHistory.find((r) => r.id === recordId);
      if (record) setLatestFeedback(record);
      setActiveTab('result');
      track('feedback_complete', { personas_count: results.length, has_synthesis: !!synthesis });
      // Audio feedback on completion
      const { settings } = useSettingsStore.getState();
      if (settings.audio_enabled) {
        resumeAudioContext();
        playSuccessTone(settings.audio_volume);
      }
    } catch (err) {
      alert('리허설을 진행할 수 없었습니다. 다시 시도하거나, 자료를 더 구체적으로 작성해보세요. ' + (err instanceof Error ? err.message : ''));
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleAddLog = () => {
    if (!viewingPersona || !logFeedback.trim()) return;
    addFeedbackLog(viewingPersona.id, {
      date: logDate || new Date().toISOString().split('T')[0],
      context: logContext,
      feedback: logFeedback,
    });
    setLogDate(''); setLogContext(''); setLogFeedback('');
    const updated = usePersonaStore.getState().personas.find((p) => p.id === viewingPersona.id);
    if (updated) setViewingPersona(updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-bold text-[var(--text-primary)]">리허설 <span className="text-[16px] font-normal text-[var(--text-secondary)]">| 사전 검증</span></h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">
          보고서를 보낼 사람의 시점에서 미리 피드백을 받습니다. 보내기 전에.
        </p>
      </div>

      <Tab
        tabs={[
          { key: 'personas', label: '페르소나 관리', count: personas.length },
          { key: 'feedback', label: '피드백 받기' },
          ...(latestFeedback ? [{ key: 'result', label: '결과' }] : []),
          { key: 'history', label: '이력', count: feedbackHistory.length },
        ]}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'personas' && !viewingPersona && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingPersona(null); setShowForm(true); }}>
              <Plus size={14} /> 페르소나 추가
            </Button>
          </div>
          {showForm && (
            <Card><PersonaForm persona={editingPersona || undefined} onSave={handleSavePersona} onCancel={() => { setShowForm(false); setEditingPersona(null); }} /></Card>
          )}
          {personas.length === 0 && !showForm ? (
            <Card className="text-center py-12">
              <Users size={24} className="mx-auto text-[var(--text-secondary)] mb-3" />
              <p className="text-[var(--text-secondary)] font-medium">아직 등록된 이해관계자가 없습니다</p>
              <p className="text-[13px] text-[var(--text-secondary)] mt-1 max-w-xs mx-auto">
                보고서를 보낼 사람(CEO, CFO 등)을 등록하면, 그 사람의 시점에서 미리 피드백을 받을 수 있습니다.
              </p>
              <button
                onClick={() => { setEditingPersona(null); setShowForm(true); }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-[13px] font-semibold hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Plus size={14} /> 첫 이해관계자 추가
              </button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {personas.map((p) => (
                <div key={p.id} className="relative group">
                  <PersonaCard persona={p} onClick={() => setViewingPersona(p)} />
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); setEditingPersona(p); setShowForm(true); }}
                      className="p-1.5 bg-white rounded-lg shadow-sm border text-[var(--text-secondary)] hover:text-[var(--accent)] cursor-pointer">
                      <Pencil size={12} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); if (confirm('삭제하시겠습니까?')) deletePersona(p.id); }}
                      className="p-1.5 bg-white rounded-lg shadow-sm border text-[var(--text-secondary)] hover:text-red-500 cursor-pointer">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'personas' && viewingPersona && (
        <div className="space-y-4">
          <button onClick={() => setViewingPersona(null)} className="flex items-center gap-1 text-[13px] text-[var(--accent)] hover:underline cursor-pointer">
            <ArrowLeft size={14} /> 목록으로
          </button>
          <Card>
            <h3 className="text-[18px] font-bold">{viewingPersona.name}</h3>
            <p className="text-[14px] text-[var(--text-secondary)]">{viewingPersona.role} {viewingPersona.organization && `· ${viewingPersona.organization}`}</p>
            {viewingPersona.extracted_traits.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {viewingPersona.extracted_traits.map((t, i) => (
                  <span key={i} className="px-2 py-0.5 bg-[var(--ai)] text-[#2d4a7c] rounded-full text-[11px] font-semibold">{t}</span>
                ))}
              </div>
            )}
            <div className="mt-4 space-y-2 text-[14px]">
              {viewingPersona.priorities && <div><span className="font-semibold">우선순위:</span> {viewingPersona.priorities}</div>}
              {viewingPersona.communication_style && <div><span className="font-semibold">스타일:</span> {viewingPersona.communication_style}</div>}
              {viewingPersona.known_concerns && <div><span className="font-semibold">관심사/우려:</span> {viewingPersona.known_concerns}</div>}
              {viewingPersona.relationship_notes && <div><span className="font-semibold">관계:</span> {viewingPersona.relationship_notes}</div>}
            </div>
          </Card>
          <Card>
            <h4 className="text-[15px] font-bold mb-3">피드백 로그</h4>
            <p className="text-[12px] text-[var(--text-secondary)] mb-3">실제 피드백을 기록하면 AI가 더 정확한 시뮬레이션을 합니다.</p>
            {viewingPersona.feedback_logs.length > 0 && (
              <div className="space-y-2 mb-4">
                {viewingPersona.feedback_logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 p-2 bg-[var(--bg)] rounded-lg text-[13px]">
                    <div className="flex-1">
                      <span className="text-[var(--text-secondary)]">[{log.date}]</span>{' '}
                      {log.context && <span className="font-medium">{log.context}:</span>}{' '}{log.feedback}
                    </div>
                    <button onClick={() => { deleteFeedbackLog(viewingPersona.id, log.id); const u = usePersonaStore.getState().personas.find((p) => p.id === viewingPersona.id); if (u) setViewingPersona(u); }}
                      className="text-[var(--text-secondary)] hover:text-red-500 cursor-pointer shrink-0"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2 border-t border-[var(--border)] pt-3">
              <p className="text-[13px] font-semibold">실제 피드백 기록 추가</p>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)}
                  className="bg-[#fafbfc] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px]" />
                <input type="text" placeholder="상황 (예: Q1 보고)" value={logContext} onChange={(e) => setLogContext(e.target.value)}
                  className="bg-[#fafbfc] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px]" />
              </div>
              <Field placeholder="이 사람이 실제로 했던 피드백을 기록하세요" value={logFeedback} onChange={(e) => setLogFeedback(e.target.value)} rows={2} />
              <Button size="sm" onClick={handleAddLog} disabled={!logFeedback.trim()}>추가</Button>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'feedback' && (
        <>
          {feedbackLoading && (
            <Card>
              <LoadingSteps steps={[
                '이해관계자를 무대 앞으로 초대하고 있습니다...',
                '각자의 관점에서 자료를 검토하고 있습니다...',
                '침묵의 리스크를 찾고 있습니다...',
              ]} />
            </Card>
          )}
          {!feedbackLoading && (
            <FeedbackRequest
              personas={personas}
              onSubmit={handleFeedbackSubmit}
              loading={feedbackLoading}
              initialContent={handoffContent}
              initialTitle={handoffTitle}
            />
          )}
        </>
      )}

      {activeTab === 'result' && latestFeedback && (
        <>
          {/* Context chain: from decompose + orchestrate */}
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
                details: decompose.analysis.hidden_assumptions.map((a: any) =>
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
          <FeedbackResult record={latestFeedback} personas={personas} onNavigate={onNavigate} />
          {latestFeedback?.project_id && (
            <NextStepGuide
              currentTool="persona-feedback"
              projectId={latestFeedback.project_id}
            />
          )}
        </>
      )}

      {activeTab === 'history' && (
        <div className="space-y-3">
          {feedbackHistory.length === 0 ? (
            <Card className="text-center py-8"><p className="text-[var(--text-secondary)]">아직 리허설 기록이 없습니다.</p></Card>
          ) : (
            [...feedbackHistory].reverse().map((record) => (
              <Card key={record.id} hoverable onClick={() => { setLatestFeedback(record); setActiveTab('result'); }}>
                <h4 className="text-[14px] font-bold">{record.document_title}</h4>
                <p className="text-[12px] text-[var(--text-secondary)] mt-1">
                  {record.feedback_perspective} · {record.feedback_intensity} · {record.results.length}명 · {new Date(record.created_at).toLocaleDateString('ko-KR')}
                </p>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

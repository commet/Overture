'use client';

import { useEffect, useState } from 'react';
import { useOrchestrateStore } from '@/stores/useOrchestrateStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CopyButton } from '@/components/ui/CopyButton';
import { orchestrateToMarkdown } from '@/lib/export';
import { callLLMJson } from '@/lib/llm';
import type { OrchestrateAnalysis, OrchestrateStep as OrchestrateStepType } from '@/stores/types';
import { StepEntry } from '@/components/ui/StepEntry';
import { LoadingSteps } from '@/components/ui/LoadingSteps';
import { useHandoffStore } from '@/stores/useHandoffStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { useJudgmentStore } from '@/stores/useJudgmentStore';
import { buildEnhancedSystemPrompt } from '@/lib/context-builder';
import { NextStepGuide } from '@/components/ui/NextStepGuide';
import { FileText, Trash2, Check, Plus, Bot, Brain, AlertTriangle, ArrowRight, RotateCcw, Send } from 'lucide-react';
import { WorkflowGraph } from './WorkflowGraph';
import { useDecomposeStore } from '@/stores/useDecomposeStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { playSuccessTone, resumeAudioContext } from '@/lib/audio';
import { ContextChainBlock } from './ContextChainBlock';
import { JudgmentPoints } from './JudgmentPoints';

const LOADING_MESSAGES = [
  '각 파트에 역할을 배정하고 있습니다...',
  '스토리라인을 구성하고 있습니다...',
  '크리티컬 패스를 짚고 있습니다...',
];

const SYSTEM_PROMPT = `당신은 전략기획 전문가입니다. 단순 작업 목록이 아니라, 의사결정자를 설득할 수 있는 실행 설계를 만드세요.

[사고 방식]
- 결론 먼저: "그래서 뭘 하자는 건데?"에 한 문장으로 답할 수 있어야 합니다.
- 스토리라인: 왜 이 접근인지를 상황→문제→해결 구조로 설명하세요.
- 기대 산출물: 각 단계가 "뭘 만드는지" 구체적으로 명시하세요. ("시장 조사"가 아니라 "TAM/SAM 분석 1장 + 경쟁사 맵")
- 판단 포인트: 사람이 결정해야 하는 단계에서는 무엇을 결정하는지, 어떤 선택지가 있는지 보여주세요.
- 가정 명시: 이 계획이 성립하려면 참이어야 하는 핵심 가정을 밝히세요.
- 병목 식별: 지연되면 전체가 밀리는 크리티컬 패스를 파악하세요.

아래 JSON 구조로 응답하세요.

1. governing_idea: 의사결정자에게 "그래서?" 하고 물었을 때의 답. 전체 실행의 핵심 방향을 담은 한 문장.
2. storyline: 접근 방향의 논리를 설명하는 서사 구조.
   - situation: 현재 상황 (합의된 사실)
   - complication: 문제 또는 기회 (긴장감을 만드는 것)
   - resolution: 우리의 접근 방향 (governing_idea를 뒷받침하는 논리)
3. goal_summary: 최종 목표를 명확한 한 문장으로 정리
4. steps: 3~8개의 단계. 각 단계에 대해:
   - task: 할 일 (구체적으로)
   - actor: "ai" | "human" | "both"
   - actor_reasoning: 왜 이 담당이 적절한지 한 문장
   - expected_output: 이 단계의 구체적 기대 산출물 (예: "3개년 매출 시나리오 3개 + 민감도 분석")
   - judgment: actor가 "human" 또는 "both"일 때, 사람이 무엇을 결정해야 하는지와 고려할 선택지 (actor가 "ai"면 빈 문자열)
   - checkpoint: true/false (사람이 반드시 확인해야 하는 단계인지)
   - checkpoint_reason: checkpoint가 true일 때 이유
   - estimated_time: 예상 소요시간 (예: "30분", "2시간", "1일")
5. key_assumptions: 이 계획이 성립하려면 참이어야 하는 핵심 가정 2~4개. 각 가정에 대해:
   - assumption: 가정 내용
   - importance: "high" | "medium" | "low"
   - certainty: "high" | "medium" | "low" (현재 확신도)
   - if_wrong: 이 가정이 틀리면 계획에 미치는 영향
6. critical_path: 지연 시 전체 일정에 영향을 주는 단계 번호 배열 (예: [1, 3, 5])
7. total_estimated_time: 전체 예상 소요시간
8. ai_ratio: AI 담당 비율 (0~100 정수)
9. human_ratio: 사람 담당 비율 (0~100 정수)
10. design_rationale: 이 워크플로우 순서와 역할 배정의 근거를 2-3문장으로 설명. 왜 이 순서인지, 왜 이 역할 배정인지.

반드시 JSON만 응답하세요.`;

const actorOptions: { value: 'ai' | 'human' | 'both'; label: string; icon: string }[] = [
  { value: 'ai', label: 'AI', icon: '🤖' },
  { value: 'human', label: '사람', icon: '🧠' },
  { value: 'both', label: '협업', icon: '🤝' },
];

const ORCHESTRATE_ENTRY_STEPS = [
  {
    key: 'outputType',
    question: '어떤 결과물을 만드나요?',
    options: [
      { value: 'report', emoji: '📝', label: '보고서/기획서', description: '의사결정용 문서' },
      { value: 'product', emoji: '💻', label: '제품/기능 개발', description: '소프트웨어 빌드' },
      { value: 'research', emoji: '🔬', label: '리서치/분석', description: '조사와 인사이트 도출' },
      { value: 'campaign', emoji: '📢', label: '마케팅/캠페인', description: '고객 대상 활동' },
    ],
  },
  {
    key: 'teamSize',
    question: '팀 규모는?',
    options: [
      { value: 'solo', emoji: '🧑', label: '혼자' },
      { value: 'small', emoji: '👥', label: '2-3명' },
      { value: 'medium', emoji: '🏢', label: '4명+' },
    ],
  },
  {
    key: 'timeline',
    question: '기간은?',
    options: [
      { value: 'week', emoji: '🔥', label: '1주 이내' },
      { value: 'month', emoji: '📅', label: '2-4주' },
      { value: 'quarter', emoji: '🌿', label: '1개월+' },
    ],
  },
];

interface OrchestrateStepProps {
  onNavigate: (step: string) => void;
}

export function OrchestrateStep({ onNavigate }: OrchestrateStepProps) {
  const store = useOrchestrateStore();
  const { items, currentId, loadItems, createItem, updateItem, deleteItem, setCurrentId, getCurrentItem, updateStep, removeStep, addStep, reorderSteps } = store;
  const { judgments, addJudgment, loadJudgments } = useJudgmentStore();
  const { handoff, clearHandoff, setHandoff } = useHandoffStore();
  const { addRef } = useProjectStore();
  const { items: decomposeItems, loadItems: loadDecompose } = useDecomposeStore();
  const { settings } = useSettingsStore();
  const [inputText, setInputText] = useState('');
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [error, setError] = useState('');
  const [pendingProjectId, setPendingProjectId] = useState<string | undefined>();

  useEffect(() => {
    loadItems();
    loadJudgments();
    loadDecompose();
  }, [loadItems, loadJudgments, loadDecompose]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (handoff && handoff.from === 'decompose') {
      setInputText(handoff.content);
      setPendingProjectId(handoff.projectId);
      clearHandoff();
    }
  }, []);  // Run once on mount

  const current = getCurrentItem();

  // Find related decompose item for context chain
  const relatedDecompose = current?.project_id
    ? decomposeItems.find(d => d.project_id === current.project_id && d.status === 'done' && d.analysis)
    : null;

  useEffect(() => {
    if (current?.status !== 'analyzing') return;
    const interval = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [current?.status]);

  const handleAnalyze = async (prompt?: string) => {
    const finalPrompt = prompt || inputText;
    if (!finalPrompt.trim()) return;
    setError('');
    const id = createItem();
    updateItem(id, {
      input_text: finalPrompt,
      status: 'analyzing',
      ...(pendingProjectId ? { project_id: pendingProjectId } : {}),
    });
    if (pendingProjectId) {
      addRef(pendingProjectId, { tool: 'orchestrate', itemId: id, label: '워크플로우 설계' });
      setPendingProjectId(undefined);
    }

    try {
      const analysis = await callLLMJson<OrchestrateAnalysis>(
        [{ role: 'user', content: finalPrompt }],
        { system: buildEnhancedSystemPrompt(SYSTEM_PROMPT), maxTokens: 3500 }
      );
      updateItem(id, { analysis, steps: analysis.steps, status: 'review' });
    } catch (err) {
      setError(err instanceof Error ? err.message : '악보를 편곡할 수 없었습니다. 다시 시도하거나 더 구체적으로 입력해보세요.');
      updateItem(id, { status: 'input' });
    }
  };

  const handleConfirm = () => {
    if (!currentId) return;
    updateItem(currentId, { status: 'done' });
    if (settings.audio_enabled) {
      resumeAudioContext();
      playSuccessTone(settings.audio_volume);
    }
  };

  const steps = current?.steps || [];

  const handleStepActorChange = (stepIndex: number, newActor: 'ai' | 'human' | 'both') => {
    if (!currentId) return;
    const step = steps[stepIndex];
    if (step && step.actor !== newActor) {
      addJudgment({
        type: 'actor_override',
        context: step.task,
        decision: newActor,
        original_ai_suggestion: step.actor,
        user_changed: true,
        project_id: current?.project_id,
        tool: 'orchestrate',
      });
    }
    updateStep(currentId, stepIndex, { actor: newActor });
  };
  const stats = steps.length > 0 ? {
    ai: steps.filter((s) => s.actor === 'ai').length,
    human: steps.filter((s) => s.actor === 'human').length,
    both: steps.filter((s) => s.actor === 'both').length,
    checkpoints: steps.filter((s) => s.checkpoint).length,
    humanPercent: Math.round(((steps.filter((s) => s.actor === 'human' || s.actor === 'both').length) / steps.length) * 100),
  } : null;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (currentId && fromIndex !== toIndex) reorderSteps(currentId, fromIndex, toIndex);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--text-primary)]">편곡 <span className="text-[16px] font-normal text-[var(--text-secondary)]">| 실행 설계</span></h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
            맥락을 선택하고 목표를 입력하면 AI가 전체 워크플로우를 설계합니다.
          </p>
          {judgments.length >= 3 && (
            <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)] mt-2">
              <Brain size={12} />
              <span>이전 {judgments.length}건의 판단이 반영되고 있습니다</span>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      {items.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => { setCurrentId(item.id); setInputText(''); }}
              className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] border transition-colors cursor-pointer ${
                currentId === item.id
                  ? 'border-[var(--accent)] bg-[var(--ai)] text-[var(--text-primary)]'
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]'
              }`}
            >
              <FileText size={14} />
              {(item.analysis?.goal_summary || item.input_text || '맵').slice(0, 25)}
              <span onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} className="ml-1 p-0.5 hover:text-red-500 cursor-pointer">
                <Trash2 size={12} />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ─── STEP 1: Input ─── */}
      {(!current || current.status === 'input') && !currentId && (
        <Card>
          <StepEntry
            steps={ORCHESTRATE_ENTRY_STEPS}
            textLabel="최종 결과물과 현재 상황을 한두 문장으로"
            textPlaceholder="투자 유치용 사업계획서를 2주 안에 완성해야 함"
            textHint="맥락을 선택하면 더 현실적인 워크플로우를 설계합니다."
            submitLabel="워크플로우 설계"
            initialText={inputText}
            onSubmit={(selections, text) => {
              const context = Object.entries(selections)
                .map(([k, v]) => {
                  const step = ORCHESTRATE_ENTRY_STEPS.find(s => s.key === k);
                  const opt = step?.options.find(o => o.value === v);
                  return opt ? `${step?.question.replace('?', '')}: ${opt.label}` : '';
                })
                .filter(Boolean)
                .join('\n');
              const fullPrompt = context ? `[맥락]\n${context}\n\n[목표]\n${text}` : text;
              handleAnalyze(fullPrompt);
            }}
          />
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-[13px] bg-red-50 rounded-lg px-3 py-2 mt-3">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </Card>
      )}

      {/* ─── Loading ─── */}
      {current?.status === 'analyzing' && (
        <Card>
          <LoadingSteps steps={['워크플로우를 설계하고 있습니다', '단계별 담당을 배정하고 있습니다', '체크포인트를 배치하고 있습니다']} />
        </Card>
      )}

      {/* ─── STEP 2: Review & Edit ─── */}
      {(current?.status === 'review' || current?.status === 'done') && (
        <div className="space-y-6 animate-fade-in">
          {/* Context chain: from decompose */}
          {relatedDecompose?.analysis && (
            <ContextChainBlock
              summary={`악보 해석에서 발견한 핵심 질문: ${relatedDecompose.selected_question || relatedDecompose.analysis.surface_task}`}
              items={relatedDecompose.analysis.hidden_assumptions.length > 0 ? [{
                label: '검증되지 않은 전제',
                count: relatedDecompose.analysis.hidden_assumptions.length,
                details: relatedDecompose.analysis.hidden_assumptions.map((a: any) =>
                  typeof a === 'string' ? a : a.assumption + (a.risk_if_false ? ` → ${a.risk_if_false}` : '')
                ),
                color: 'text-amber-700',
              }] : []}
            />
          )}

          {/* Goal */}
          {current.analysis && (
            <Card className="!bg-[var(--ai)]">
              <div className="flex items-center gap-2 text-[12px] text-[#2d4a7c] font-semibold mb-2">
                <Bot size={14} /> 핵심 방향
              </div>
              <p className="text-[15px] font-bold text-[var(--text-primary)] mb-3">{current.analysis.governing_idea}</p>
              {/* 1-B: Hypothesis connection */}
              {(relatedDecompose?.analysis?.reframed_question || relatedDecompose?.analysis?.hypothesis) && (
                <p className="text-[12px] text-[var(--text-secondary)] mt-1 border-t border-[#2d4a7c]/10 pt-2">
                  이 방향은 악보 해석에서 발견한 질문 — &apos;{relatedDecompose.selected_question || relatedDecompose.analysis.hidden_questions[0]?.question}&apos; — 에서 도출되었습니다.
                </p>
              )}

              {current.analysis.storyline && (
                <div className="space-y-2 text-[13px] border-t border-[#2d4a7c]/10 pt-3">
                  <div><span className="font-semibold text-[#2d4a7c]">상황:</span> <span className="text-[var(--text-primary)]">{current.analysis.storyline.situation}</span></div>
                  <div><span className="font-semibold text-[#2d4a7c]">문제:</span> <span className="text-[var(--text-primary)]">{current.analysis.storyline.complication}</span></div>
                  <div><span className="font-semibold text-[#2d4a7c]">접근:</span> <span className="text-[var(--text-primary)]">{current.analysis.storyline.resolution}</span></div>
                </div>
              )}
            </Card>
          )}

          {/* Timeline — parallel track visualization */}
          <WorkflowGraph
            steps={steps}
            analysis={current.analysis}
            editable={current.status === 'review'}
            onUpdateActor={(idx, actor) => handleStepActorChange(idx, actor)}
            onToggleCheckpoint={(idx) => { if (currentId) updateStep(currentId, idx, { checkpoint: !steps[idx].checkpoint }); }}
            onRemoveStep={(idx) => { if (currentId) removeStep(currentId, idx); }}
          />

          {current.status === 'review' && (
            <Button variant="ghost" onClick={() => { if (currentId) addStep(currentId); }}>
              <Plus size={14} /> 단계 추가
            </Button>
          )}

          {/* Stats */}
          {stats && (
            <Card className="!bg-[var(--bg)]">
              <h4 className="text-[13px] font-bold text-[var(--text-primary)] mb-3">요약 대시보드</h4>
              <div className="flex flex-wrap gap-3 text-[13px] mb-3">
                <Badge variant="ai">AI {stats.ai}단계</Badge>
                <Badge variant="human">사람 {stats.human}단계</Badge>
                <Badge variant="both">협업 {stats.both}단계</Badge>
                <Badge variant="checkpoint">체크포인트 {stats.checkpoints}개</Badge>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden mb-2">
                {stats.ai > 0 && <div className="bg-[#b8cce8]" style={{ width: `${(stats.ai / steps.length) * 100}%` }} />}
                {stats.human > 0 && <div className="bg-[#f5d89a]" style={{ width: `${(stats.human / steps.length) * 100}%` }} />}
                {stats.both > 0 && <div className="bg-[#a8d5a8]" style={{ width: `${(stats.both / steps.length) * 100}%` }} />}
              </div>
              <div className="flex justify-between text-[12px] text-[var(--text-secondary)]">
                <span>사람 개입 비율: <span className="font-bold text-[var(--text-primary)]">{stats.humanPercent}%</span></span>
                {current.analysis?.total_estimated_time && (
                  <span>예상 총 소요시간: <span className="font-bold text-[var(--text-primary)]">{current.analysis.total_estimated_time}</span></span>
                )}
              </div>
            </Card>
          )}

          {/* Key Assumptions */}
          {current.analysis && current.analysis.key_assumptions && current.analysis.key_assumptions.length > 0 && (
            <Card className="!bg-[var(--checkpoint)]">
              <h4 className="text-[13px] font-bold text-amber-800 mb-3">핵심 가정</h4>
              <div className="space-y-2">
                {current.analysis.key_assumptions.map((ka: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-[12px]">
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      ka.importance === 'high' ? 'bg-red-100 text-red-700' : ka.importance === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {ka.importance === 'high' ? '높음' : ka.importance === 'medium' ? '중간' : '낮음'}
                    </span>
                    <div>
                      <p className="text-[var(--text-primary)]">{ka.assumption}</p>
                      <p className="text-[var(--text-secondary)] mt-0.5">
                        확신도: {ka.certainty === 'high' ? '높음' : ka.certainty === 'medium' ? '중간' : '낮음'}
                        {ka.if_wrong && ` · 틀리면: ${ka.if_wrong}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 2-C: 지휘자의 판단 포인트 */}
          {current.analysis && <JudgmentPoints steps={steps} />}

          {/* Design rationale */}
          {current.analysis?.design_rationale && (
            <p className="text-[12px] text-[var(--text-secondary)] italic">{current.analysis.design_rationale}</p>
          )}

          {/* Critical Path */}
          {current.analysis && current.analysis.critical_path && current.analysis.critical_path.length > 0 && (
            <div className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
              <span className="font-semibold">크리티컬 패스:</span>
              {current.analysis.critical_path.map((idx: number) => (
                <span key={idx} className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[10px] font-bold">
                  Step {idx}
                </span>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-[13px] bg-red-50 rounded-lg px-3 py-2">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {current.status === 'review' ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => { setCurrentId(null); setInputText(''); }}>
                  <RotateCcw size={14} /> 새로 시작
                </Button>
                <div className="flex gap-2">
                  <CopyButton getText={() => orchestrateToMarkdown(current)} />
                  <Button onClick={handleConfirm}>
                    <Check size={14} /> 확정
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button variant="secondary" size="sm" onClick={() => { setCurrentId(null); setInputText(''); }}>
                  <ArrowRight size={14} /> 새 맵
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const content = orchestrateToMarkdown(current!);
                      setHandoff({
                        from: 'orchestrate',
                        fromItemId: current!.id,
                        content,
                        projectId: current!.project_id,
                      });
                      onNavigate('persona-feedback');
                    }}
                  >
                    <Send size={14} /> 리허설 받기
                  </Button>
                  <CopyButton getText={() => orchestrateToMarkdown(current)} label="마크다운 복사" />
                </div>
              </>
            )}
          </div>
          {current.status === 'done' && (
            <NextStepGuide
              currentTool="orchestrate"
              projectId={current?.project_id}
              onSendTo={(href) => {
                if (!current) return;
                const content = orchestrateToMarkdown(current);
                setHandoff({ from: 'orchestrate', fromItemId: current.id, content, projectId: current.project_id });
                onNavigate(href.replace('/tools/', ''));
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

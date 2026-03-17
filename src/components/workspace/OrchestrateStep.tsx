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
import { InterviewInput, buildInterviewPrompt } from '@/components/ui/InterviewInput';
import type { InterviewStep } from '@/components/ui/InterviewInput';
import { ModeToggle } from '@/components/ui/ModeToggle';
import type { InputMode } from '@/components/ui/ModeToggle';
import { LoadingSteps } from '@/components/ui/LoadingSteps';
import { useHandoffStore } from '@/stores/useHandoffStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { useJudgmentStore } from '@/stores/useJudgmentStore';
import { buildEnhancedSystemPrompt } from '@/lib/context-builder';
import { NextStepGuide } from '@/components/ui/NextStepGuide';
import { Sparkles, Loader2, FileText, Trash2, Check, Plus, GripVertical, Flag, Bot, Brain, Handshake, AlertTriangle, ArrowRight, RotateCcw, Clock, Send } from 'lucide-react';

const LOADING_MESSAGES = [
  '워크플로우를 설계하고 있습니다...',
  '단계별 담당을 배정하고 있습니다...',
  '체크포인트를 배치하고 있습니다...',
];

const SYSTEM_PROMPT = `당신은 전략기획 전문가입니다. 사용자가 설명한 목표와 상황을 분석하여 AI와 사람이 협업하는 최적의 워크플로우를 설계하세요. 아래 JSON 구조로 응답하세요.

1. goal_summary: 최종 목표를 명확한 한 문장으로 정리
2. steps: 3~8개의 단계. 각 단계에 대해:
   - task: 할 일 (구체적으로)
   - actor: "ai" | "human" | "both"
   - actor_reasoning: 왜 이 담당이 적절한지 한 문장
   - checkpoint: true/false (사람이 반드시 확인해야 하는 단계인지)
   - checkpoint_reason: checkpoint가 true일 때 이유
   - estimated_time: 예상 소요시간 (예: "30분", "2시간", "1일")
3. total_estimated_time: 전체 예상 소요시간
4. ai_ratio: AI 담당 비율 (0~100 정수)
5. human_ratio: 사람 담당 비율 (0~100 정수)

반드시 JSON만 응답하세요.`;

const actorOptions: { value: 'ai' | 'human' | 'both'; label: string; icon: string }[] = [
  { value: 'ai', label: 'AI', icon: '🤖' },
  { value: 'human', label: '사람', icon: '🧠' },
  { value: 'both', label: '협업', icon: '🤝' },
];

const ORCHESTRATE_INTERVIEW: InterviewStep[] = [
  {
    key: 'goal',
    question: '어떤 결과물을 만들어야 하나요?',
    label: '최종 목표',
    hint: '최종 목표를 구체적으로 적어주세요.',
    type: 'textarea',
    placeholder: '투자 유치용 사업계획서를 2주 안에 완성해야 함',
    required: true,
    rows: 3,
  },
  {
    key: 'projectType',
    question: '어떤 유형의 프로젝트인가요?',
    label: '프로젝트 유형',
    type: 'chips',
    options: [
      { value: 'report', label: '보고서/기획서', emoji: '📝' },
      { value: 'product', label: '제품/기능 개발', emoji: '💻' },
      { value: 'research', label: '리서치/분석', emoji: '🔬' },
      { value: 'campaign', label: '마케팅/캠페인', emoji: '📢' },
      { value: 'operations', label: '운영/프로세스', emoji: '⚙️' },
      { value: 'event', label: '행사/프레젠테이션', emoji: '🎤' },
    ],
  },
  {
    key: 'teamSize',
    question: '함께 작업하는 사람은 몇 명인가요?',
    label: '팀 규모',
    type: 'chips',
    options: [
      { value: 'solo', label: '혼자' },
      { value: 'small', label: '2-3명' },
      { value: 'medium', label: '4-7명' },
      { value: 'large', label: '8명+' },
    ],
  },
  {
    key: 'timeline',
    question: '기간이 어떻게 되나요?',
    label: '기간',
    type: 'chips',
    options: [
      { value: 'days', label: '며칠', emoji: '🔥' },
      { value: 'week', label: '1주' },
      { value: 'month', label: '2-4주' },
      { value: 'quarter', label: '1개월+' },
    ],
  },
  {
    key: 'aiPreference',
    question: 'AI에게 어느 정도 맡기고 싶으세요?',
    label: 'AI 활용 선호',
    hint: '워크플로우 설계 시 AI 비중을 참고합니다.',
    type: 'chips',
    options: [
      { value: 'maximum', label: 'AI 최대 활용', emoji: '🤖' },
      { value: 'balanced', label: '균형 있게' },
      { value: 'minimum', label: '사람 중심', emoji: '🧠' },
    ],
  },
  {
    key: 'context',
    question: '추가로 공유할 맥락이 있나요?',
    label: '추가 맥락',
    hint: '현재 진행 상황, 제약 조건 등',
    type: 'textarea',
    placeholder: '예: 시장 분석 자료는 이미 있고, 재무 모델이 핵심',
    required: false,
    rows: 2,
  },
];

interface OrchestrateStepProps {
  onNavigate: (step: string) => void;
}

export function OrchestrateStep({ onNavigate }: OrchestrateStepProps) {
  const store = useOrchestrateStore();
  const { items, currentId, loadItems, createItem, updateItem, deleteItem, setCurrentId, getCurrentItem, updateStep, removeStep, addStep, reorderSteps } = store;
  const { addJudgment, loadJudgments } = useJudgmentStore();
  const { handoff, clearHandoff, setHandoff } = useHandoffStore();
  const { addRef } = useProjectStore();
  const [inputText, setInputText] = useState('');
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<InputMode>('interview');

  useEffect(() => {
    loadItems();
    loadJudgments();
  }, [loadItems, loadJudgments]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (handoff && handoff.from === 'decompose') {
      const id = createItem();
      updateItem(id, {
        input_text: handoff.content,
        project_id: handoff.projectId,
      });
      if (handoff.projectId) {
        addRef(handoff.projectId, { tool: 'orchestrate', itemId: id, label: '워크플로우 설계' });
      }
      setInputText(handoff.content);
      clearHandoff();
    }
  }, []);  // Run once on mount

  const current = getCurrentItem();

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
    updateItem(id, { input_text: finalPrompt, status: 'analyzing' });

    try {
      const analysis = await callLLMJson<OrchestrateAnalysis>(
        [{ role: 'user', content: finalPrompt }],
        { system: buildEnhancedSystemPrompt(SYSTEM_PROMPT), maxTokens: 2500 }
      );
      updateItem(id, { analysis, steps: analysis.steps, status: 'review' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 분석에 실패했습니다.');
      updateItem(id, { status: 'input' });
    }
  };

  const handleConfirm = () => {
    if (!currentId) return;
    updateItem(currentId, { status: 'done' });
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
          <h1 className="text-[22px] font-bold text-[var(--text-primary)]">역할 편성</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
            {mode === 'direct'
              ? '목표를 입력하면 AI가 전체 워크플로우를 설계합니다.'
              : '질문에 답하면 상황에 맞는 워크플로우를 설계합니다.'}
          </p>
        </div>
        <ModeToggle mode={mode} onChange={setMode} />
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
          {mode === 'direct' ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-[16px] font-bold text-[var(--text-primary)] mb-1">최종 결과물을 설명해주세요</h2>
                <p className="text-[12px] text-[var(--text-secondary)]">한두 문장이면 충분합니다. AI가 전체 워크플로우를 자동으로 설계합니다.</p>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="투자 유치용 사업계획서를 2주 안에 완성해야 함"
                className="w-full bg-[#fafbfc] border-[1.5px] border-[var(--border)] rounded-[10px] px-4 py-3 text-[15px] leading-[1.7] placeholder:text-[var(--text-secondary)] placeholder:text-[14px] focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(74,111,165,0.08)] resize-none"
                rows={3}
              />
              <div className="flex justify-end">
                <Button onClick={() => handleAnalyze()} disabled={!inputText.trim()}>
                  <Sparkles size={14} /> 워크플로우 설계
                </Button>
              </div>
            </div>
          ) : (
            <InterviewInput
              steps={ORCHESTRATE_INTERVIEW}
              submitLabel="워크플로우 설계"
              onSubmit={(answers) => handleAnalyze(buildInterviewPrompt(ORCHESTRATE_INTERVIEW, answers))}
            />
          )}
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
          {/* Goal */}
          {current.analysis && (
            <Card className="!bg-[var(--ai)]">
              <div className="flex items-center gap-2 text-[12px] text-[#2d4a7c] font-semibold mb-1">
                <Bot size={14} /> 목표 요약
              </div>
              <p className="text-[15px] font-bold text-[var(--text-primary)]">{current.analysis.goal_summary}</p>
            </Card>
          )}

          {/* Timeline */}
          <div className="space-y-0">
            {steps.map((step, i) => (
              <div
                key={i}
                draggable={current.status === 'review'}
                onDragStart={(e) => handleDragStart(e, i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, i)}
                className="flex gap-3 animate-slide-down"
              >
                <div className="flex flex-col items-center w-8 shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${
                    step.actor === 'ai' ? 'bg-[var(--ai)] text-[#2d4a7c]'
                    : step.actor === 'human' ? 'bg-[var(--human)] text-[#8b6914]'
                    : 'bg-[var(--collab)] text-[#2d6b2d]'
                  }`}>
                    {i + 1}
                  </div>
                  {i < steps.length - 1 && <div className="w-0.5 flex-1 bg-[var(--border)] my-1" />}
                </div>
                <Card className={`flex-1 mb-3 ${step.checkpoint ? '!bg-[var(--checkpoint)] !border-amber-300' : ''}`}>
                  <div className="flex items-start gap-2">
                    {current.status === 'review' && (
                      <GripVertical size={16} className="text-[var(--text-secondary)] mt-0.5 cursor-grab shrink-0" />
                    )}
                    <div className="flex-1 space-y-2">
                      {current.status === 'review' ? (
                        <input
                          type="text"
                          value={step.task}
                          onChange={(e) => { if (currentId) updateStep(currentId, i, { task: e.target.value }); }}
                          className="w-full bg-transparent text-[14px] font-medium text-[var(--text-primary)] focus:outline-none"
                        />
                      ) : (
                        <p className="text-[14px] font-medium text-[var(--text-primary)]">{step.task}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        {current.status === 'review' ? (
                          <>
                            {actorOptions.map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => handleStepActorChange(i, opt.value)}
                                className={`px-2 py-1 rounded-lg text-[12px] font-medium border transition-colors cursor-pointer ${
                                  step.actor === opt.value
                                    ? 'border-[var(--accent)] bg-white shadow-sm'
                                    : 'border-transparent hover:bg-white/50'
                                }`}
                              >
                                {opt.icon} {opt.label}
                              </button>
                            ))}
                            <div className="border-l border-[var(--border)] pl-2 ml-1">
                              <button
                                onClick={() => { if (currentId) updateStep(currentId, i, { checkpoint: !step.checkpoint }); }}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
                                  step.checkpoint ? 'text-amber-700 bg-amber-100' : 'text-[var(--text-secondary)] hover:text-amber-700'
                                }`}
                              >
                                <Flag size={12} /> 체크포인트
                              </button>
                            </div>
                          </>
                        ) : (
                          <Badge variant={step.actor === 'ai' ? 'ai' : step.actor === 'human' ? 'human' : 'both'}>
                            {actorOptions.find((o) => o.value === step.actor)?.icon} {actorOptions.find((o) => o.value === step.actor)?.label}
                          </Badge>
                        )}
                        {step.estimated_time && (
                          <span className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
                            <Clock size={10} /> {step.estimated_time}
                          </span>
                        )}
                      </div>
                      {step.checkpoint && step.checkpoint_reason && (
                        <p className="text-[12px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1">
                          ⚑ {step.checkpoint_reason}
                        </p>
                      )}
                      {step.actor_reasoning && (
                        <p className="text-[11px] text-[var(--text-secondary)]">{step.actor_reasoning}</p>
                      )}
                    </div>
                    {current.status === 'review' && (
                      <button
                        onClick={() => { if (currentId) removeStep(currentId, i); }}
                        className="p-1 hover:text-red-500 text-[var(--text-secondary)] cursor-pointer shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </Card>
              </div>
            ))}
          </div>

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

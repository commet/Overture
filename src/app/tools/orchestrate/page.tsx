'use client';

import { useEffect, useState } from 'react';
import { useOrchestrateStore } from '@/stores/useOrchestrateStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CopyButton } from '@/components/ui/CopyButton';
import { orchestrateToMarkdown } from '@/lib/export';
import { callLLMJson } from '@/lib/llm';
import type { OrchestrateAnalysis, OrchestrateStep } from '@/stores/types';
import { ModeToggle } from '@/components/ui/ModeToggle';
import { LoadingSteps } from '@/components/ui/LoadingSteps';
import { Sparkles, Loader2, FileText, Trash2, Check, Plus, GripVertical, Flag, Bot, Brain, Handshake, AlertTriangle, ArrowRight, RotateCcw, Clock } from 'lucide-react';

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

export default function OrchestratePage() {
  const store = useOrchestrateStore();
  const { items, currentId, loadItems, createItem, updateItem, deleteItem, setCurrentId, getCurrentItem, updateStep, removeStep, addStep, reorderSteps } = store;
  const [inputText, setInputText] = useState('');
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'auto' | 'guided'>('auto');

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const current = getCurrentItem();

  useEffect(() => {
    if (current?.status !== 'analyzing') return;
    const interval = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [current?.status]);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setError('');
    const id = createItem();
    updateItem(id, { input_text: inputText, status: 'analyzing' });

    try {
      const analysis = await callLLMJson<OrchestrateAnalysis>(
        [{ role: 'user', content: inputText }],
        { system: SYSTEM_PROMPT, maxTokens: 2500 }
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
          <h1 className="text-[22px] font-bold text-[var(--text-primary)]">오케스트레이션 맵</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
            {mode === 'auto'
              ? '목표를 설명하면 AI가 전체 워크플로우를 설계합니다.'
              : '단계별로 직접 워크플로우를 구성합니다.'}
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
        <Card className="space-y-4">
          <div>
            <h2 className="text-[16px] font-bold text-[var(--text-primary)] mb-1">최종적으로 만들고 싶은 결과물과 현재 상황을 설명해주세요</h2>
            <p className="text-[12px] text-[var(--text-secondary)]">AI가 전체 워크플로우를 자동으로 설계하고, 각 단계의 담당과 체크포인트를 배치합니다.</p>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="시리즈 A 투자 유치용 사업계획서. 시장 분석, 재무 모델, 팀 소개, 기술 설명이 필요. 기한 2주. 팀원 3명."
            className="w-full bg-[#fafbfc] border-[1.5px] border-[var(--border)] rounded-[10px] px-4 py-3 text-[15px] leading-[1.7] placeholder:text-[var(--text-secondary)] placeholder:text-[14px] focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(74,111,165,0.08)] resize-none"
            rows={4}
          />
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-[13px] bg-red-50 rounded-lg px-3 py-2">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={handleAnalyze} disabled={!inputText.trim()}>
              <Sparkles size={14} /> 워크플로우 설계
            </Button>
          </div>
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
                                onClick={() => { if (currentId) updateStep(currentId, i, { actor: opt.value }); }}
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
                <CopyButton getText={() => orchestrateToMarkdown(current)} label="마크다운 복사" />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

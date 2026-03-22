'use client';

import { useEffect, useState } from 'react';
import { track, trackError } from '@/lib/analytics';
import Link from 'next/link';
import { useOrchestrateStore } from '@/stores/useOrchestrateStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CopyButton } from '@/components/ui/CopyButton';
import { orchestrateToMarkdown } from '@/lib/export';
import { callLLMJson, callLLMStream, parseJSON } from '@/lib/llm';
import type { OrchestrateAnalysis, OrchestrateStep as OrchestrateStepType } from '@/stores/types';
import { StepEntry } from '@/components/ui/StepEntry';
import { useHandoffStore } from '@/stores/useHandoffStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { useJudgmentStore } from '@/stores/useJudgmentStore';
import { buildEnhancedSystemPrompt } from '@/lib/context-builder';
import { NextStepGuide } from '@/components/ui/NextStepGuide';
import { FileText, Trash2, Check, Plus, Bot, AlertTriangle, ArrowRight, RotateCcw, Send } from 'lucide-react';
import { WorkflowGraph } from './WorkflowGraph';
import { useDecomposeStore } from '@/stores/useDecomposeStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { playSuccessTone, resumeAudioContext } from '@/lib/audio';
import { ContextChainBlock } from './ContextChainBlock';
import { buildDecomposeContext, injectDecomposeContext, mergeAssumptionsIntoKeyAssumptions } from '@/lib/context-chain';
import type { DecomposeContext, WorkflowReview } from '@/stores/types';
import { runWorkflowReview, countBySeverity } from '@/lib/workflow-review';
import { TeamReviewPanel } from './TeamReviewPanel';
import { Shield, Zap, Globe, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { ConcertmasterInline } from '@/components/workspace/ConcertmasterInline';
import { t } from '@/lib/i18n';
import { recordSignal } from '@/lib/signal-recorder';

const SYSTEM_PROMPT = `당신은 전략기획 전문가입니다. 단순 작업 목록이 아니라, 의사결정자를 설득할 수 있는 실행 설계를 만드세요.

[사고 방식]
- 결론 먼저: "그래서 뭘 하자는 건데?"에 한 문장으로 답할 수 있어야 합니다.
- 스토리라인: 왜 이 접근인지를 상황→문제→해결 구조로 설명하세요.
- 기대 산출물: 각 단계가 "뭘 만드는지" 구체적으로 명시하세요. ("시장 조사"가 아니라 "TAM/SAM 분석 1장 + 경쟁사 맵")
- 판단 포인트: 사람이 결정해야 하는 단계에서는 무엇을 결정하는지, 어떤 선택지가 있는지 보여주세요.
- 가정 명시: 이 계획이 성립하려면 참이어야 하는 핵심 가정을 밝히세요.
- 병목 식별: 지연되면 전체가 밀리는 크리티컬 패스를 파악하세요.

[actor 배정 기준]
- [맥락]에 AI 위임 수준이 포함된 경우:
  * "초안 생성만" → 대부분 "human" 또는 "both", AI는 자료 수집·초안에만
  * "분석과 초안" → 분석·초안은 "ai", 판단·방향 설정은 "human"
  * "판단 지원까지" → AI가 선택지 제시, 최종 결정만 "human"
  * "실행까지 위임" → 대부분 "ai", 핵심 체크포인트만 "human"
- [맥락]에 중요도가 포함된 경우:
  * "경영진 보고" 또는 "외부 고객/투자자" → 핵심 판단 단계는 반드시 "human"

아래 JSON 구조로 응답하세요.

1. governing_idea: 의사결정자에게 "그래서?" 하고 물었을 때의 답. 전체 실행의 핵심 방향을 담은 한 문장.
2. storyline: 접근 방향의 논리를 설명하는 서사 구조.
   - situation: 현재 상황 (합의된 사실)
   - complication: 문제 또는 기회 (긴장감을 만드는 것)
   - resolution: 우리의 접근 방향 (governing_idea를 뒷받침하는 논리)
3. goal_summary: 최종 목표를 명확한 한 문장으로 정리
4. steps: 3~5개의 단계 (최대 5개. 더 많으면 합치세요). 각 단계에 대해:
   - task: 할 일 (구체적으로)
   - actor: "ai" | "human" | "both"
   - actor_reasoning: 왜 이 담당이 적절한지 한 문장
   - expected_output: 이 단계의 구체적 기대 산출물 (예: "3개년 매출 시나리오 3개 + 민감도 분석")
   - judgment: actor가 "human" 또는 "both"일 때, 사람이 결정할 사항을 "질문: 선택지A vs 선택지B vs 선택지C" 형태로 작성. 예: "시장 진입 전략: 국내 우선 vs 글로벌 동시 vs 단계적 확장". actor가 "ai"면 빈 문자열
   - checkpoint: true/false (사람이 반드시 확인해야 하는 단계인지)
   - checkpoint_reason: checkpoint가 true일 때 이유
   - estimated_time: 예상 소요시간 (예: "30분", "2시간", "1일")
   - ai_direction_options: actor가 "ai" 또는 "both"일 때, 사용자가 AI에게 줄 수 있는 방향 옵션 2-4개 (사용자가 클릭으로 선택). 예: ["국내 시장 중심", "글로벌 시장 포함", "최근 3년 데이터 기준"]. actor가 "human"이면 빈 배열
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
    key: 'timeline',
    question: '기한이 어떻게 되나요?',
    options: [
      { value: 'urgent', emoji: '🔥', label: '1주 이내', description: '급한 요청, 속도 우선' },
      { value: 'normal', emoji: '📅', label: '2~3주', description: '일반적인 프로젝트 기한' },
      { value: 'relaxed', emoji: '🗓️', label: '한 달 이상', description: '충분한 검토 시간' },
      { value: 'undefined', emoji: '❓', label: '아직 미정', description: '기한 없이 진행' },
    ],
  },
  {
    key: 'teamSize',
    question: '누구와 함께 하나요?',
    options: [
      { value: 'solo', emoji: '🧑', label: '혼자', description: '1인 작업' },
      { value: 'small', emoji: '👥', label: '2~3명', description: '소규모 협업' },
      { value: 'team', emoji: '👨‍👩‍👧‍👦', label: '5명 이상 팀', description: '역할 분담 필요' },
      { value: 'cross', emoji: '🏢', label: '외부 협력 포함', description: '타 부서·외주·파트너' },
    ],
  },
  {
    key: 'aiComfort',
    question: 'AI에게 어디까지 맡기시겠어요?',
    options: [
      { value: 'draft', emoji: '✏️', label: '초안 생성만', description: '사람이 대부분 판단' },
      { value: 'analysis', emoji: '📊', label: '분석과 초안', description: 'AI가 자료 수집·분석' },
      { value: 'decision-support', emoji: '🧭', label: '판단 지원까지', description: 'AI가 선택지와 근거 제시' },
      { value: 'full', emoji: '🚀', label: '실행까지 위임', description: '사람은 최종 확인만' },
    ],
  },
  {
    key: 'stakes',
    question: '이 결과물의 중요도는?',
    options: [
      { value: 'low', emoji: '📋', label: '내부 참고용', description: '부담 없는 내부 문서' },
      { value: 'medium', emoji: '👔', label: '팀/부서 발표', description: '동료·팀장이 볼 자료' },
      { value: 'high', emoji: '🏛️', label: '경영진 보고', description: '의사결정권자에게 전달' },
      { value: 'critical', emoji: '⚡', label: '외부 고객/투자자', description: '실패 시 비용이 큰 상황' },
    ],
  },
];

/* ── Orchestration Loader ── */
function OrchestrationLoader() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setPhase((p) => (p + 1) % 3), 2800);
    return () => clearInterval(timer);
  }, []);

  const messages = [
    '역할을 배분하고 있습니다',
    '실행 순서를 조율합니다',
    '검증 포인트를 설계합니다',
  ];

  const bars = [
    { w: '72%', c: '#3b6dcc' },
    { w: '45%', c: '#2d6b2d' },
    { w: '58%', c: '#b8860b' },
    { w: '84%', c: '#3b6dcc' },
    { w: '36%', c: '#2d6b2d' },
  ];

  return (
    <div className="py-10">
      <div className="max-w-xs mx-auto mb-8 space-y-1.5">
        {bars.map((bar, i) => (
          <div
            key={i}
            className="h-3 rounded-sm"
            style={{
              width: bar.w,
              backgroundColor: bar.c,
              animation: `assemble-bar 2.4s ease-in-out ${i * 0.4}s infinite`,
            }}
          />
        ))}
      </div>
      <p className="text-center text-[14px] text-[var(--text-primary)] font-medium">
        {messages[phase]}
      </p>
      <div className="flex justify-center gap-1.5 mt-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-500 ${
              i === phase ? 'w-5 bg-[var(--accent)]' : 'w-1.5 bg-[var(--border)]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

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
  const [error, setError] = useState('');
  const [pendingProjectId, setPendingProjectId] = useState<string | undefined>();
  const [decomposeCtx, setDecomposeCtx] = useState<DecomposeContext | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewExpanded, setReviewExpanded] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

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
      // Capture typed context from decompose (Phase 0)
      if (handoff.contextData && 'reframed_question' in handoff.contextData) {
        setDecomposeCtx(handoff.contextData as DecomposeContext);
      }
      clearHandoff();
    }
  }, []);  // Run once on mount

  // Recover items stuck in 'analyzing'
  useEffect(() => {
    items.forEach((item) => {
      if (item.status === 'analyzing') {
        updateItem(item.id, { status: 'input' });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = getCurrentItem();

  // Find latest related decompose item for context chain (not first/oldest)
  const relatedDecompose = current?.project_id
    ? decomposeItems
        .filter(d => d.project_id === current.project_id && d.status === 'done' && d.analysis)
        .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
        [0] || null
    : null;

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

    // Build system prompt: base + user patterns + typed decompose context
    let systemPrompt = buildEnhancedSystemPrompt(SYSTEM_PROMPT, current?.project_id || pendingProjectId);

    // Inject typed context from decompose (Phase 0 pipeline)
    const ctx = decomposeCtx || (relatedDecompose ? buildDecomposeContext(relatedDecompose) : null);
    if (ctx) {
      systemPrompt = injectDecomposeContext(systemPrompt, ctx);
    }

    // Re-inject previous review findings when re-analyzing (so AI addresses criticism)
    if (current?.analysis?.reviews && current.analysis.reviews.length > 0) {
      const highFindings = current.analysis.reviews
        .flatMap(r => r.findings.filter(f => f.severity === 'high'))
        .slice(0, 5);
      if (highFindings.length > 0) {
        const reviewSection = [
          '\n\n### 이전 검증에서 발견된 주요 문제 (이번 설계에서 반영하세요)',
          ...highFindings.map(f => `- [${f.type}] ${f.text}`),
        ].join('\n');
        systemPrompt += reviewSection;
      }
    }

    // Start streaming for preview
    setIsStreaming(true);
    setStreamingText('');

    try {
      const fullText = await new Promise<string>((resolve, reject) => {
        callLLMStream(
          [{ role: 'user', content: finalPrompt }],
          { system: systemPrompt, maxTokens: 3500 },
          {
            onToken: (text) => setStreamingText(text),
            onComplete: (text) => resolve(text),
            onError: (err) => reject(err),
          }
        );
      });

      setIsStreaming(false);
      setStreamingText('');

      // Try to parse JSON from the streamed text
      let analysis: OrchestrateAnalysis;
      try {
        analysis = parseJSON<OrchestrateAnalysis>(fullText);
      } catch {
        // JSON parse failed — fall back to non-streaming call
        analysis = await callLLMJson<OrchestrateAnalysis>(
          [{ role: 'user', content: finalPrompt }],
          { system: systemPrompt, maxTokens: 3500 }
        );
      }

      // Code-level guarantee: cap steps at 5
      if (analysis.steps && analysis.steps.length > 5) {
        analysis.steps = analysis.steps.slice(0, 5);
      }

      // Code-level guarantee: merge decompose assumptions into key_assumptions
      const decomposeAssumptions = (ctx as DecomposeContext | null)?.unverified_assumptions || [];
      if (decomposeAssumptions.length > 0 && analysis.key_assumptions) {
        analysis.key_assumptions = mergeAssumptionsIntoKeyAssumptions(
          decomposeAssumptions,
          analysis.key_assumptions
        );
      }

      // Code-level validation: flag AI limitation conflicts
      const aiLimitations = (ctx as DecomposeContext | null)?.ai_limitations || [];
      if (aiLimitations.length > 0 && analysis.steps) {
        const aiSteps = analysis.steps.filter(s => s.actor === 'ai');
        const warnings: string[] = [];
        for (const limitation of aiLimitations) {
          const limitWords = limitation.toLowerCase().split(/\s+/).filter(w => w.length > 2);
          for (const step of aiSteps) {
            const stepText = `${step.task} ${step.expected_output || ''}`.toLowerCase();
            const overlap = limitWords.filter(w => stepText.includes(w));
            if (overlap.length >= 2) {
              warnings.push(`"${step.task}" → AI 한계와 충돌 가능: "${limitation}"`);
            }
          }
        }
        if (warnings.length > 0) {
          analysis.ai_limitation_warnings = warnings;
        }
      }

      // Phase 2B: Preserve existing reviews when re-analyzing
      const existingReviews = current?.analysis?.reviews;
      if (existingReviews && existingReviews.length > 0) {
        analysis.previous_reviews = existingReviews;
      }
      updateItem(id, { analysis, steps: analysis.steps, status: 'review' });
    } catch (err) {
      setIsStreaming(false);
      setStreamingText('');
      trackError('orchestrate_analyze', err);
      const msg = err instanceof Error ? err.message : '';
      setError(msg.startsWith('LOGIN_REQUIRED:') ? 'LOGIN_REQUIRED' : (msg || '악보를 편곡할 수 없었습니다. 다시 시도하거나 더 구체적으로 입력해보세요.'));
      updateItem(id, { status: 'input' });
    }
  };

  const handleConfirm = () => {
    if (!currentId) return;
    updateItem(currentId, { status: 'done' });
    track('orchestrate_complete', {
      steps: steps.length,
      checkpoints: steps.filter(s => s.checkpoint).length,
      ai_steps: steps.filter(s => s.actor === 'ai').length,
      human_steps: steps.filter(s => s.actor === 'human').length,
      both_steps: steps.filter(s => s.actor === 'both').length,
      has_reviews: !!(current?.analysis?.reviews?.length),
      ai_limitation_warnings: current?.analysis?.ai_limitation_warnings?.length || 0,
    });
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
      track('actor_changed', { from: step.actor, to: newActor, step_task: step.task.slice(0, 50) });
      addJudgment({
        type: 'actor_override',
        context: step.task,
        decision: newActor,
        original_ai_suggestion: step.actor,
        user_changed: true,
        project_id: current?.project_id,
        tool: 'orchestrate',
      });
      recordSignal({
        project_id: current?.project_id,
        tool: 'orchestrate',
        signal_type: 'actor_override_direction',
        signal_data: { from_actor: step.actor, to_actor: newActor, step_task: step.task?.slice(0, 100) },
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
          <h1 className="text-[22px] font-bold text-[var(--text-primary)]">{t('tool.orchestrate')} <span className="text-[16px] font-normal text-[var(--text-secondary)]">| {t('tool.orchestrate.subtitle')}</span></h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
            AI와 사람의 역할을 나누고, 실행 단계를 설계합니다.
          </p>
          <div className="mt-2">
            <ConcertmasterInline step="orchestrate" />
          </div>
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
            textLabel="추가로 알려줄 맥락이 있나요?"
            textPlaceholder="예: 지난 분기 실적 데이터를 반드시 포함해야 함 / 마케팅팀과 병렬 진행 중 / 대표가 '고객 관점'을 강조했음"
            textHint="위에서 선택한 내용만으로도 충분합니다. 특수한 조건이나 배경이 있다면 자유롭게 적어주세요."
            submitLabel="워크플로우 설계"
            initialText={inputText}
            contextPanel={decomposeCtx ? (
              <div className="rounded-xl bg-[var(--bg)] border border-[var(--border-subtle)] px-4 py-3">
                <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">악보 해석에서 도출된 맥락</p>
                <p className="text-[14px] font-semibold text-[var(--text-primary)] leading-snug">
                  {decomposeCtx.reframed_question || decomposeCtx.surface_task}
                </p>
                {decomposeCtx.unverified_assumptions && decomposeCtx.unverified_assumptions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {decomposeCtx.unverified_assumptions.slice(0, 3).map((a, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-medium border border-amber-200">
                        미확인: {typeof a === 'string' ? a : a.assumption}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : undefined}
            onSubmit={(selections, text) => {
              const context = Object.entries(selections)
                .map(([k, v]) => {
                  const step = ORCHESTRATE_ENTRY_STEPS.find(s => s.key === k);
                  const opt = step?.options.find(o => o.value === v);
                  return opt ? `${step?.question.replace('?', '')}: ${opt.label}` : '';
                })
                .filter(Boolean)
                .join('\n');
              const fullPrompt = context
                ? (text.trim() ? `[맥락]\n${context}\n\n[추가 맥락]\n${text}` : `[맥락]\n${context}`)
                : text;
              handleAnalyze(fullPrompt);
            }}
          />
          {error && (
            error === 'LOGIN_REQUIRED' ? (
              <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-4 py-4 mt-3">
                <p className="text-[14px] font-bold text-[var(--text-primary)] mb-1">무료 체험 3회를 모두 사용했어요</p>
                <p className="text-[13px] text-[var(--text-secondary)] mb-3">로그인하면 하루 5회까지 무료로 계속 사용할 수 있습니다.</p>
                <Link href="/login" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg)] text-[13px] font-semibold hover:opacity-90 transition-opacity">
                  로그인 / 회원가입
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600 text-[13px] bg-red-50 rounded-lg px-3 py-2 mt-3">
                <AlertTriangle size={14} /> {error}
              </div>
            )
          )}
        </Card>
      )}

      {/* ─── Loading / Streaming Preview ─── */}
      {current?.status === 'analyzing' && (
        <Card>
          <OrchestrationLoader />
        </Card>
      )}

      {/* ─── STEP 2: Review & Edit ─── */}
      {(current?.status === 'review' || current?.status === 'done') && (
        <div className="space-y-6 animate-fade-in">
          {/* ── Strategic Context: question → direction (integrated flow) ── */}
          {/* Strategic context — clean, compact */}
          {current.analysis && (
            <div className="space-y-3">
              {/* 재정의된 질문 (from 악보 해석) — compact reference */}
              {relatedDecompose?.analysis && (
                <div className="rounded-xl bg-[var(--bg)] px-4 py-3">
                  <p className="text-[11px] font-medium text-[var(--text-secondary)] mb-1">악보 해석에서 재정의된 질문</p>
                  <p className="text-[14px] font-bold text-[var(--text-primary)] leading-snug">
                    {relatedDecompose.selected_question || relatedDecompose.analysis.reframed_question || relatedDecompose.analysis.surface_task}
                  </p>
                </div>
              )}

              {/* 핵심 방향 */}
              <div className="rounded-xl bg-[var(--primary)] text-[var(--bg)] px-5 py-4">
                <p className="text-[11px] font-medium text-white/50 mb-1">{t('orchestrate.governingIdea')}</p>
                <p className="text-[16px] font-bold leading-snug">
                  {current.analysis.governing_idea}
                </p>
              </div>

              {/* Storyline removed — governing_idea already captures the direction */}
            </div>
          )}

          {/* Timeline — parallel track visualization */}
          <WorkflowGraph
            steps={steps}
            analysis={current.analysis}
            editable={current.status === 'review'}
            onUpdateActor={(idx, actor) => handleStepActorChange(idx, actor)}
            onToggleCheckpoint={(idx) => { if (currentId) updateStep(currentId, idx, { checkpoint: !steps[idx].checkpoint }); }}
            onRemoveStep={(idx) => { if (currentId) { const removedStep = steps[idx]; removeStep(currentId, idx); recordSignal({ project_id: current?.project_id, tool: 'orchestrate', signal_type: 'step_structural_change', signal_data: { action: 'delete', step_actor: removedStep?.actor, step_task: removedStep?.task?.slice(0, 100) } }); } }}
            onUpdateField={(idx, updates) => { if (currentId) updateStep(currentId, idx, updates); }}
          />

          {current.status === 'review' && (
            <Button variant="ghost" onClick={() => { if (currentId) { addStep(currentId); recordSignal({ project_id: current?.project_id, tool: 'orchestrate', signal_type: 'step_structural_change', signal_data: { action: 'add' } }); } }}>
              <Plus size={14} /> 단계 추가
            </Button>
          )}

          {/* Design rationale — if exists */}
          {current.analysis?.design_rationale && (
            <p className="text-[13px] text-[var(--text-secondary)] italic leading-relaxed">
              {current.analysis.design_rationale}
            </p>
          )}

          {/* AI limitation warnings — code-level validation */}
          {current.analysis?.ai_limitation_warnings && current.analysis.ai_limitation_warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-[12px] font-semibold text-amber-800 mb-1.5">
                <AlertTriangle size={12} className="inline mr-1 -mt-0.5" />
                AI 한계 충돌 가능성
              </p>
              {current.analysis.ai_limitation_warnings.map((w, i) => (
                <p key={i} className="text-[12px] text-amber-700 leading-relaxed">- {w}</p>
              ))}
            </div>
          )}

          {/* ── Multi-Lens Review (Phase 2) ── */}
          {current.status === 'review' && current.analysis && (
            <div>
              {!current.analysis.reviews ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    if (!current.analysis || !currentId) return;
                    setIsReviewing(true);
                    try {
                      const reviews = await runWorkflowReview(
                        steps,
                        current.analysis.governing_idea,
                        current.analysis.goal_summary,
                        current.analysis.key_assumptions || [],
                        current.input_text,
                      );
                      updateItem(currentId, { analysis: { ...current.analysis, reviews } });
                      setReviewExpanded(true);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : '검증에 실패했습니다.');
                    } finally {
                      setIsReviewing(false);
                    }
                  }}
                  disabled={isReviewing}
                >
                  {isReviewing ? (
                    <><Loader2 size={14} className="animate-spin" /> {t('orchestrate.reviewing')}</>
                  ) : (
                    <><Shield size={14} /> {t('orchestrate.review')}</>
                  )}
                </Button>
              ) : (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] overflow-hidden">
                  <button
                    onClick={() => setReviewExpanded(!reviewExpanded)}
                    className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[var(--bg)] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Shield size={14} className="text-[var(--accent)]" />
                      <span className="text-[13px] font-semibold text-[var(--text-primary)]">다관점 검증 완료</span>
                      {(() => {
                        const counts = countBySeverity(current.analysis.reviews!);
                        return (
                          <div className="flex items-center gap-2 text-[11px]">
                            {counts.high > 0 && <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-bold">{counts.high}</span>}
                            {counts.medium > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-bold">{counts.medium}</span>}
                            {counts.low > 0 && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-bold">{counts.low}</span>}
                          </div>
                        );
                      })()}
                    </div>
                    {reviewExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {reviewExpanded && (
                    <div className="border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
                      {current.analysis.reviews!.map((review, ri) => {
                        const lensIcon = review.lens.startsWith('domain') ? <Globe size={13} />
                          : review.lens === 'skeptic' ? <Shield size={13} />
                          : <Zap size={13} />;
                        return (
                          <div key={ri} className="px-4 py-3">
                            <div className="flex items-center gap-2 mb-2.5">
                              <span className="text-[var(--accent)]">{lensIcon}</span>
                              <span className="text-[12px] font-semibold text-[var(--text-primary)]">{review.lens_label}</span>
                              <span className="text-[11px] text-[var(--text-tertiary)]">{review.findings.length}건</span>
                            </div>
                            <div className="space-y-2">
                              {review.findings.map((f, fi) => (
                                <div key={fi} className="flex items-start gap-2.5 text-[12px]">
                                  <span className={`shrink-0 mt-1 w-1.5 h-1.5 rounded-full ${
                                    f.severity === 'high' ? 'bg-red-500' : f.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-400'
                                  }`} />
                                  <div className="flex-1">
                                    <p className="text-[var(--text-primary)] leading-relaxed">{f.text}</p>
                                    {f.affected_steps && f.affected_steps.length > 0 && (
                                      <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                                        Step {f.affected_steps.join(', ')}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
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
                <Button variant="secondary" size="sm" onClick={() => { setCurrentId(null); setInputText(''); setPendingProjectId(undefined); }}>
                  <RotateCcw size={14} /> {t('common.newStart')}
                </Button>
                <div className="flex gap-2">
                  <CopyButton getText={() => orchestrateToMarkdown(current)} />
                  <Button onClick={handleConfirm}>
                    <Check size={14} /> {t('common.confirm')}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button variant="secondary" size="sm" onClick={() => { setCurrentId(null); setInputText(''); setPendingProjectId(undefined); }}>
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

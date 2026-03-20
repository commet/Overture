'use client';

import React, { useEffect, useState } from 'react';
import { track } from '@/lib/analytics';
import { useDecomposeStore } from '@/stores/useDecomposeStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CopyButton } from '@/components/ui/CopyButton';
import { decomposeToMarkdown } from '@/lib/export';
import { callLLMJson } from '@/lib/llm';
import type { DecomposeAnalysis, DecomposeItem, HiddenAssumption } from '@/stores/types';
import { StepEntry } from '@/components/ui/StepEntry';
import { LoadingSteps } from '@/components/ui/LoadingSteps';
import { useHandoffStore } from '@/stores/useHandoffStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { useJudgmentStore } from '@/stores/useJudgmentStore';
import { buildEnhancedSystemPrompt } from '@/lib/context-builder';
import { findSimilarItems } from '@/lib/similarity';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { playSuccessTone, resumeAudioContext } from '@/lib/audio';
import { NextStepGuide } from '@/components/ui/NextStepGuide';
import { FileText, Trash2, Check, Pencil, Brain, AlertTriangle, ArrowRight, RotateCcw, Send, Lightbulb } from 'lucide-react';
import { StaffLines, BarLine, Fermata } from '@/components/ui/MusicalElements';
import { buildDecomposeContext, extractInterviewSignals } from '@/lib/context-chain';
import { selectReframingStrategy, applyReframingStrategy, STRATEGY_LABELS, type ReframingStrategy, type InterviewSignals } from '@/lib/reframing-strategy';
import { recordDecomposeEval, getBestStrategy, getSessionInsights } from '@/lib/eval-engine';

/* ───────────────────────────────────────────
   System Prompt
   ─────────────────────────────────────────── */

/* ── Stage 1: 전제 도출 프롬프트 (가설 기반 사고) ── */
const ASSUMPTION_PROMPT = `당신은 전략기획 전문가입니다. 주어진 과제의 숨겨진 전제를 찾으세요.

[사고 방식: 가설 기반 사고 + 4축 전제 점검]
- 이 과제가 나온 진짜 이유는 무엇인가? 가설을 세우세요.
- 이 과제가 의미 있으려면 참이어야 하는 전제를 찾으세요.
- 네 가지 축으로 점검: (1) 고객 가치 (2) 실행 가능성 (3) 사업성 (4) 조직 역량

아래 JSON 구조로 응답하세요.
1. surface_task: 사용자가 말한 과제를 한 문장으로 정리
2. hidden_assumptions: 이 과제가 성립하려면 맞아야 하는 전제 3-4개. 각 전제에 대해:
   - assumption: 전제 내용 (한 문장, 명확하게)
   - risk_if_false: 이 전제가 틀리면 구체적으로 어떤 위험이 생기는지
3. reasoning_narrative: 왜 이 전제들이 중요한지 2-3문장으로 설명

반드시 JSON만 응답하세요.`;

/* ── Stage 2: 리프레이밍 프롬프트 (사용자 평가 기반) ── */
const REFRAMING_PROMPT = `당신은 전략기획 전문가입니다. 사용자의 전제 평가를 바탕으로 진짜 질문을 재정의하세요.

[사고 방식: 리프레이밍 + 관점 전환]
- 사용자가 "의심됨"으로 표시한 전제에서 핵심 리프레이밍을 도출하세요.
- 사용자가 "불확실"로 표시한 전제에서 검증이 필요한 방향을 제안하세요.
- 각 방향은 의심된 전제와 직접 연결되어야 합니다.

아래 JSON 구조로 응답하세요.
1. reframed_question: 전제 평가를 바탕으로 재정의한 진짜 질문
2. why_reframing_matters: 이 관점 전환을 받아들이면 의사결정이 어떻게 달라지는지 1-2문장
3. hidden_questions: 추구할 수 있는 방향 2-3개. 각각:
   - question: 질문 텍스트
   - reasoning: 이 방향을 택하면 무엇이 달라지는지
   - source_assumption: 어떤 전제의 의심/불확실에서 이 질문이 나왔는지 (전제 내용 요약)
4. ai_limitations: AI가 이 과제에서 잘 못할 부분 1-2개

반드시 JSON만 응답하세요.`;

/* ───────────────────────────────────────────
   Interview entry steps
   ─────────────────────────────────────────── */

const DECOMPOSE_ENTRY_STEPS = [
  {
    key: 'origin',
    question: '이 과제는 어디서 시작되었나요?',
    options: [
      { value: 'top-down', emoji: '👔', label: '위에서 내려온 지시', description: '배경 설명 없이 과제가 할당되었다' },
      { value: 'external', emoji: '🤝', label: '고객/외부 요청', description: '외부에서 온 구체적 요구사항이다' },
      { value: 'self', emoji: '💡', label: '스스로 발견한 기회', description: '내가 필요성을 느끼고 시작하는 일이다' },
      { value: 'fire', emoji: '🔥', label: '갑자기 터진 문제', description: '예상치 못한 상황에 대응해야 한다' },
    ],
  },
  {
    key: 'uncertainty',
    question: '지금 가장 불확실한 것은?',
    options: [
      { value: 'why', emoji: '🎯', label: '이걸 왜 해야 하는지', description: '과제의 목적이나 가치가 불분명하다' },
      { value: 'what', emoji: '🧭', label: '무엇을 해야 하는지', description: '방향은 잡히는데 범위가 불분명하다' },
      { value: 'how', emoji: '⚙️', label: '어떻게 해야 하는지', description: '뭘 해야 하는지는 알지만 방법을 모르겠다' },
      { value: 'none', emoji: '✅', label: '불확실한 것 없음', description: '정리만 하면 되는 상태다' },
    ],
  },
  {
    key: 'success',
    question: '이게 성공하면 뭐가 달라지나요?',
    options: [
      { value: 'measurable', emoji: '📈', label: '숫자로 보이는 성과', description: '매출, 비용, 전환율 등 측정 가능한 개선' },
      { value: 'risk', emoji: '🛡️', label: '리스크 감소', description: '안 하면 더 큰 문제가 될 것을 방지' },
      { value: 'opportunity', emoji: '🚀', label: '새로운 가능성', description: '이전에 없던 기회나 역량이 생긴다' },
      { value: 'unclear', emoji: '❓', label: '아직 모르겠음', description: '성공의 기준이 아직 불명확하다' },
    ],
  },
  {
    key: 'stakeholder',
    question: '이 결과를 누구에게 보여줘야 하나요?',
    options: [
      { value: 'executive', emoji: '👔', label: '경영진/의사결정자', description: '최종 결정권자에게 보고한다' },
      { value: 'team', emoji: '👥', label: '팀원/동료', description: '함께 실행할 사람들과 공유한다' },
      { value: 'client', emoji: '🤝', label: '고객/외부', description: '외부 이해관계자에게 제안한다' },
      { value: 'self', emoji: '💡', label: '나 자신', description: '내 판단을 정리하는 것이 목적이다' },
    ],
  },
];

// Locked step — unlocks after 3+ sessions
const LOCKED_STEP = {
  key: 'history',
  question: '이전에 비슷한 시도가 있었나요?',
  options: [
    { value: 'failed', emoji: '❌', label: '시도했지만 실패', description: '비슷한 접근이 있었지만 성과가 없었다' },
    { value: 'partial', emoji: '🔶', label: '부분적 성공', description: '일부 성과가 있었지만 완전하지 않았다' },
    { value: 'first', emoji: '🆕', label: '처음 시도', description: '이런 종류의 과제는 처음이다' },
    { value: 'unknown', emoji: '❓', label: '잘 모르겠음', description: '조직 내 이력을 모른다' },
  ],
  locked: true,
  unlockMessage: '3회 이상 분석 후 열리는 질문입니다. 연주를 반복하면 더 깊은 맥락을 수집합니다.',
};

/* ───────────────────────────────────────────
   Normalize legacy data
   ─────────────────────────────────────────── */

function normalizeAnalysis(raw: DecomposeAnalysis): DecomposeAnalysis {
  return {
    surface_task: raw.surface_task || '',
    reframed_question: raw.reframed_question || raw.hypothesis || '',
    why_reframing_matters: raw.why_reframing_matters || '',
    reasoning_narrative: raw.reasoning_narrative || '',
    hidden_assumptions: Array.isArray(raw.hidden_assumptions)
      ? raw.hidden_assumptions.map((a: HiddenAssumption | string) =>
          typeof a === 'string' ? { assumption: a, risk_if_false: '' } : a
        )
      : [],
    hidden_questions: raw.hidden_questions || [],
    ai_limitations: raw.ai_limitations || [],
  };
}

/* ───────────────────────────────────────────
   Component
   ─────────────────────────────────────────── */

interface DecomposeStepProps {
  onNavigate: (step: string) => void;
}

export function DecomposeStep({ onNavigate }: DecomposeStepProps) {
  const { items, currentId, loadItems, createItem, updateItem, deleteItem, setCurrentId, getCurrentItem } = useDecomposeStore();
  const { judgments, addJudgment, loadJudgments } = useJudgmentStore();
  const { setHandoff } = useHandoffStore();
  const { projects, loadProjects, getOrCreateProject, addRef } = useProjectStore();
  const { settings } = useSettingsStore();
  const [inputText, setInputText] = useState('');
  const [editingQuestion, setEditingQuestion] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');
  const [error, setError] = useState('');
  const [similarItems, setSimilarItems] = useState<Array<DecomposeItem & { similarity: number }>>([]);
  const [currentStrategy, setCurrentStrategy] = useState<ReframingStrategy | null>(null);
  const [reviewStage, setReviewStage] = useState<'evaluate' | 'reframe'>('evaluate');
  const [reframing, setReframing] = useState(false);

  useEffect(() => {
    loadItems();
    loadJudgments();
    loadProjects();
  }, [loadItems, loadJudgments, loadProjects]);

  // Recover items stuck in 'analyzing' (e.g., page reload during LLM call)
  useEffect(() => {
    items.forEach((item) => {
      if (item.status === 'analyzing') {
        updateItem(item.id, { status: 'input' });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const current = getCurrentItem();
  const hasLearning = judgments.length >= 3;

  const codaInsights = projects.filter(
    (p) => p.meta_reflection?.surprising_discovery || p.meta_reflection?.next_time_differently
  );

  useEffect(() => {
    if (!inputText || inputText.length < 8) {
      setSimilarItems([]);
      return;
    }
    const timer = setTimeout(() => {
      const doneItems = items.filter((i) => i.status === 'done' && i.analysis);
      const matches = findSimilarItems(inputText, doneItems.map(i => ({ ...i, input_text: i.input_text || '' })));
      setSimilarItems(matches as Array<DecomposeItem & { similarity: number }>);
    }, 500);
    return () => clearTimeout(timer);
  }, [inputText, items]);

  /* ─── Handlers ─── */

  const handleAnalyze = async (prompt?: string) => {
    const finalPrompt = prompt || inputText;
    if (!finalPrompt.trim()) return;
    setError('');
    const id = createItem(finalPrompt);
    updateItem(id, { status: 'analyzing' });

    // Phase 1: Select reframing strategy — data-driven first, rule-based fallback
    const signals = extractInterviewSignals(finalPrompt) as InterviewSignals | undefined;
    let strategy: ReframingStrategy | null = null;
    if (signals) {
      // Try data-driven selection (needs 5+ samples)
      strategy = getBestStrategy(signals) || selectReframingStrategy(signals);
    }
    setCurrentStrategy(strategy);

    try {
      // Stage 1: Generate assumptions only (user evaluates before reframing)
      const systemPrompt = buildEnhancedSystemPrompt(ASSUMPTION_PROMPT);

      const analysis = await callLLMJson<DecomposeAnalysis>(
        [{ role: 'user', content: finalPrompt }],
        { system: systemPrompt, maxTokens: 1200 }
      );
      // Initialize evaluations as 'uncertain' (default)
      if (analysis.hidden_assumptions) {
        analysis.hidden_assumptions = analysis.hidden_assumptions.map((a: any) =>
          typeof a === 'string'
            ? { assumption: a, risk_if_false: '', evaluation: 'uncertain' }
            : { ...a, evaluation: a.evaluation || 'uncertain' }
        );
      }
      updateItem(id, { analysis, status: 'review' });
      setReviewStage('evaluate');
    } catch (err) {
      setError(err instanceof Error ? err.message : '악보를 읽을 수 없었습니다. 다시 시도하거나 더 구체적으로 입력해보세요.');
      updateItem(id, { status: 'input' });
    }
  };

  // Debounced judgment recording ref
  const judgmentTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSelectQuestion = (question: string) => {
    if (!current || !currentId || !current.analysis) return;
    updateItem(currentId, { selected_question: question });

    // Debounce judgment recording (prevents spam from custom question typing)
    if (judgmentTimerRef.current) clearTimeout(judgmentTimerRef.current);
    judgmentTimerRef.current = setTimeout(() => {
      const analysis = normalizeAnalysis(current.analysis!);
      const isCustom = !analysis.hidden_questions.some(hq => hq.question === question);
      addJudgment({
        type: 'hidden_question_selection',
        context: analysis.surface_task,
        decision: question,
        original_ai_suggestion: analysis.hidden_questions[0]?.question || '',
        user_changed: isCustom,
        project_id: current.project_id,
        tool: 'decompose',
      });
    }, 1000);
  };

  const handleReframe = async () => {
    if (!current || !currentId || !current.analysis) return;
    setReframing(true);
    setError('');

    try {
      // Build evaluation summary for Stage 2 prompt
      const assumptions = current.analysis.hidden_assumptions || [];
      const evalSummary = assumptions
        .map((a: any, i: number) => {
          const label = a.evaluation === 'doubtful' ? '의심됨' : a.evaluation === 'likely_true' ? '맞을 가능성 높음' : '불확실';
          return `${i + 1}. [${label}] "${a.assumption}" → ${a.risk_if_false || ''}`;
        })
        .join('\n');

      const doubtful = assumptions.filter((a: any) => a.evaluation === 'doubtful');
      const uncertain = assumptions.filter((a: any) => a.evaluation === 'uncertain');

      let reframingPrompt = buildEnhancedSystemPrompt(REFRAMING_PROMPT);
      if (currentStrategy) {
        reframingPrompt = applyReframingStrategy(reframingPrompt, currentStrategy);
      }

      const userMessage = `[원래 과제]\n${current.analysis.surface_task}\n\n[사용자의 전제 평가]\n${evalSummary}\n\n${doubtful.length > 0 ? `의심된 전제 ${doubtful.length}건, ` : ''}${uncertain.length > 0 ? `불확실한 전제 ${uncertain.length}건` : ''}\n\n이 평가를 바탕으로 진짜 질문을 재정의해주세요.`;

      const reframingResult = await callLLMJson<Partial<DecomposeAnalysis>>(
        [{ role: 'user', content: userMessage }],
        { system: reframingPrompt, maxTokens: 1500 }
      );

      // Merge Stage 2 results into existing analysis
      updateItem(currentId, {
        analysis: {
          ...current.analysis,
          reframed_question: reframingResult.reframed_question || '',
          why_reframing_matters: reframingResult.why_reframing_matters || '',
          hidden_questions: reframingResult.hidden_questions || [],
          ai_limitations: reframingResult.ai_limitations || current.analysis.ai_limitations || [],
        },
      });
      setReviewStage('reframe');
    } catch (err) {
      setError(err instanceof Error ? err.message : '질문을 재정의할 수 없었습니다.');
    } finally {
      setReframing(false);
    }
  };

  const handleConfirm = () => {
    if (!current || !currentId || !current.analysis) return;
    updateItem(currentId, { status: 'done' });
    track('decompose_complete', { assumptions: current.analysis.hidden_assumptions?.length || 0 });

    // Phase 1: Record binary evals for strategy learning
    recordDecomposeEval(current, currentStrategy);

    if (settings.audio_enabled) {
      resumeAudioContext();
      playSuccessTone(settings.audio_volume);
    }
  };

  const handleReanalyze = async () => {
    if (!current || !currentId) return;
    setError('');
    updateItem(currentId, { status: 'analyzing', analysis: null });
    try {
      const prompt = current.selected_question
        ? `원래 과제: ${current.input_text}\n\n재정의된 질문으로 다시 분석해주세요: ${current.selected_question}`
        : current.input_text;
      const analysis = await callLLMJson<DecomposeAnalysis>(
        [{ role: 'user', content: prompt }],
        { system: buildEnhancedSystemPrompt(SYSTEM_PROMPT, current?.project_id), maxTokens: 2000 }
      );
      updateItem(currentId, { analysis, status: 'review' });
    } catch (err) {
      setError(err instanceof Error ? err.message : '악보를 다시 읽을 수 없었습니다. 다시 시도해보세요.');
      updateItem(currentId, { status: 'review' });
    }
  };

  const handleEvaluateAssumption = (index: number, evaluation: 'likely_true' | 'uncertain' | 'doubtful') => {
    if (!current || !currentId || !current.analysis) return;
    const assumptions = [...current.analysis.hidden_assumptions] as any[];
    assumptions[index] = { ...assumptions[index], evaluation };
    updateItem(currentId, { analysis: { ...current.analysis, hidden_assumptions: assumptions } });
  };

  const handleToggleAssumption = (index: number) => {
    if (!current || !currentId || !current.analysis) return;
    const assumptions = [...current.analysis.hidden_assumptions] as any[];
    const a = assumptions[index];
    if (typeof a === 'string') {
      assumptions[index] = { assumption: a, risk_if_false: '', verified: true };
    } else {
      assumptions[index] = { ...a, verified: !a.verified };
    }
    updateItem(currentId, { analysis: { ...current.analysis, hidden_assumptions: assumptions } });
  };

  const getAnalysis = () => current?.analysis ? normalizeAnalysis(current.analysis) : null;

  /* ─── Render ─── */

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--text-primary)]">악보 해석</h1>
          <span className="text-[13px] text-[var(--text-tertiary)]">|</span>
          <span className="text-[14px] text-[var(--text-secondary)]">문제 재정의</span>
        </div>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">
          주어진 과제 뒤에 숨은 진짜 질문을 찾아냅니다.
        </p>
        {hasLearning && (
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-tertiary)] mt-2">
            <Brain size={12} />
            <span>이전 {judgments.length}건의 판단이 반영되고 있습니다</span>
          </div>
        )}
      </div>

      {/* ─── History tabs ─── */}
      {items.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => { setCurrentId(item.id); setInputText(''); }}
              className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] border transition-all duration-300 cursor-pointer ${
                currentId === item.id
                  ? 'border-[var(--accent)] bg-[var(--ai)] text-[var(--text-primary)]'
                  : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border)]'
              }`}
            >
              <FileText size={14} />
              {(item.analysis?.surface_task || item.input_text || '').slice(0, 25) || '분석 중...'}
              <span
                onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                className="ml-1 p-0.5 hover:text-red-500 cursor-pointer"
              >
                <Trash2 size={12} />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ─── Session insights (micro loop feedback) ─── */}
      {(!current || current.status === 'input') && !currentId && (() => {
        const insights = getSessionInsights();
        if (insights.length === 0) return null;
        return (
          <div className="flex flex-wrap gap-2">
            {insights.map((insight, i) => (
              <div key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--ai)] text-[12px] text-[#2d4a7c]">
                <Brain size={11} />
                <span>{insight.message}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ─── Coda insights ─── */}
      {(!current || current.status === 'input') && !currentId && codaInsights.length > 0 && (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--gold-muted)] p-4">
          <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[var(--gold)]">이전 무대에서의 깨달음</p>
          <div className="space-y-1 mt-2">
            {codaInsights.slice(0, 2).map((p) => (
              <p key={p.id} className="text-[12px] text-[var(--text-primary)] leading-relaxed">
                <span className="font-semibold">{p.name}</span>:{' '}
                {p.meta_reflection?.surprising_discovery || p.meta_reflection?.next_time_differently}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          STEP 1: Input
         ═══════════════════════════════════════ */}
      {(!current || current.status === 'input') && !currentId && (
        <Card>
          <StepEntry
            steps={[
              ...DECOMPOSE_ENTRY_STEPS,
              // Unlock 5th question after 3+ done sessions
              items.filter(i => i.status === 'done').length >= 3
                ? { ...LOCKED_STEP, locked: false }
                : LOCKED_STEP,
            ]}
            textLabel="과제를 구체적으로 설명해주세요"
            textPlaceholder="동남아 시장 진출 전략을 2주 안에 보고해야 함"
            textHint="위에서 선택한 맥락이 반영됩니다. 구체적일수록 정확합니다."
            onSubmit={(selections, text) => {
              const allSteps = [...DECOMPOSE_ENTRY_STEPS, LOCKED_STEP];
              const context = Object.entries(selections)
                .map(([k, v]) => {
                  const step = allSteps.find(s => s.key === k);
                  const opt = step?.options.find(o => o.value === v);
                  if (!opt) return '';
                  return `${step?.question.replace('?', '')}: ${opt.label}${opt.description ? ` (${opt.description})` : ''}`;
                })
                .filter(Boolean)
                .join('\n');
              const fullPrompt = context ? `[맥락]\n${context}\n\n[과제]\n${text}` : text;
              handleAnalyze(fullPrompt);
            }}
          />
          {similarItems.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
              <p className="text-[12px] font-semibold text-[var(--text-secondary)] mb-2">유사한 이전 분석</p>
              <div className="space-y-1.5">
                {similarItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => { setCurrentId(item.id); setInputText(''); }}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border)] cursor-pointer transition-all duration-300"
                  >
                    <div>
                      <p className="text-[13px] font-medium text-[var(--text-primary)]">
                        {item.analysis?.surface_task || item.input_text.slice(0, 40)}
                      </p>
                      <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                        유사도 {Math.round(item.similarity * 100)}%
                      </p>
                    </div>
                    <ArrowRight size={12} className="text-[var(--text-tertiary)] shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-[13px] bg-red-50 rounded-xl px-3 py-2 mt-3">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </Card>
      )}

      {/* ═══════════════════════════════════════
          STEP 2: Analyzing (Loading)
         ═══════════════════════════════════════ */}
      {current?.status === 'analyzing' && (
        <Card>
          <LoadingSteps steps={[
            '과제의 전제를 점검하고 있습니다',
            '숨겨진 질문을 찾고 있습니다',
            '진짜 주제를 읽어내고 있습니다',
          ]} />
        </Card>
      )}

      {/* ═══════════════════════════════════════
          STEP 3: Review — The Score Reading
         ═══════════════════════════════════════ */}
      {current?.status === 'review' && current.analysis && (() => {
        const analysis = normalizeAnalysis(current.analysis!);
        return (
          <div className="phrase-entrance space-y-5">

            {/* ── 1. 받은 악보 ── */}
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--text-tertiary)]">받은 악보</p>
                {currentStrategy && (
                  <span className="text-[11px] text-[var(--text-tertiary)] bg-[var(--bg)] px-2 py-0.5 rounded-full">
                    {STRATEGY_LABELS[currentStrategy].label}
                  </span>
                )}
              </div>
              <p className="text-[15px] font-semibold text-[var(--text-primary)] leading-snug">
                {analysis.surface_task}
              </p>
            </div>

            {/* ── 2. 점검이 필요한 전제 ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-[14px] font-bold text-[var(--text-primary)]">점검이 필요한 전제</p>
                  <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">이미 확인한 전제는 체크하세요</p>
                </div>
                {analysis.hidden_assumptions.some(a => a.verified) && (
                  <span className="text-[12px] text-[var(--success)] font-semibold">
                    {analysis.hidden_assumptions.filter(a => a.verified).length}건 확인됨
                  </span>
                )}
              </div>
              <div className="space-y-2.5">
                {analysis.hidden_assumptions.map((a, i) => (
                  <div
                    key={i}
                    className="rounded-lg overflow-hidden transition-all duration-300"
                    style={{ borderLeft: `3px solid ${a.verified ? '#34d399' : '#d97706'}` }}
                  >
                    <div className={`px-4 py-3 ${a.verified ? 'bg-emerald-50/30' : 'bg-amber-50/40'}`}>
                      <div className="flex items-start gap-3">
                        <span className="text-[16px] font-bold leading-none shrink-0 pt-0.5 tabular-nums select-none" style={{ color: a.verified ? '#34d39940' : '#d9770630' }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[14px] font-semibold leading-snug transition-colors duration-300 ${
                            a.verified ? 'text-[var(--text-secondary)] line-through decoration-1' : 'text-[var(--text-primary)]'
                          }`}>
                            {a.assumption}
                          </p>
                          {a.risk_if_false && !a.verified && (
                            <p className="text-[13px] text-amber-700/70 mt-1.5 leading-relaxed">
                              <span className="font-semibold">거짓이면</span> &rarr; {a.risk_if_false}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleToggleAssumption(i)}
                          className={`
                            shrink-0 mt-0.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium
                            transition-all duration-300 cursor-pointer
                            ${a.verified
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-white/70 text-[var(--text-tertiary)] hover:bg-white hover:text-amber-700 border border-[var(--border-subtle)]'
                            }
                          `}
                        >
                          {a.verified ? (
                            <><Check size={11} /> 확인됨</>
                          ) : (
                            <>확인됨?</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 3. 재정의된 질문 ── */}
            <div className="rounded-xl bg-[var(--primary)] text-white p-5 md:p-6">
              <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-white/50 mb-3">재정의된 질문</p>
              <p className="text-[18px] md:text-[20px] font-bold leading-snug">
                {analysis.reframed_question}
              </p>
              {analysis.why_reframing_matters && (
                <div className="mt-4 pt-3 border-t border-white/15">
                  <p className="text-[14px] text-white/70 leading-relaxed">
                    {analysis.why_reframing_matters}
                  </p>
                </div>
              )}
            </div>

            {/* 사고 과정 — 의미있는 인사이트로 표현 */}
            {analysis.reasoning_narrative && (
              <div className="flex items-start gap-3 bg-[var(--ai)] rounded-lg px-4 py-3">
                <Lightbulb size={14} className="text-[var(--accent)] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-bold text-[#2d4a7c] uppercase tracking-wider mb-1">왜 이렇게 재정의했는가</p>
                  <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">
                    {analysis.reasoning_narrative}
                  </p>
                </div>
              </div>
            )}

            {/* ── Section divider ── */}
            <div className="flex items-center gap-3 pt-2">
              <div className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">방향 선택</span>
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>

            {/* ─── Card 2: 방향 선택 ─── */}
            <div className="rounded-[20px] bg-[var(--surface)] border border-[var(--border-subtle)] shadow-sm p-6">
              <div className="flex items-center gap-2.5 mb-1">
                <Fermata size={18} color="var(--gold)" />
                <h3 className="text-[15px] font-bold text-[var(--text-primary)]">어떤 해석을 선택하시겠습니까?</h3>
              </div>
              <p className="text-[13px] text-[var(--text-secondary)] mb-5 ml-[30px]">
                선택한 방향이 편곡 단계의 출발점이 됩니다.
              </p>

              <div className="space-y-2.5">
                {analysis.hidden_questions.map((hq, i) => (
                  <div
                    key={i}
                    onClick={() => handleSelectQuestion(hq.question)}
                    className={`
                      relative rounded-2xl border p-4 cursor-pointer
                      transition-all duration-300
                      ${current.selected_question === hq.question
                        ? 'border-[var(--accent)] bg-[var(--ai)] shadow-sm'
                        : 'border-[var(--border-subtle)] hover:border-[var(--border)]'
                      }
                    `}
                    style={{
                      transform: current.selected_question === hq.question ? 'translateY(-1px)' : 'none',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`
                        w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5
                        transition-all duration-300
                        ${current.selected_question === hq.question
                          ? 'border-[var(--accent)] bg-[var(--accent)]'
                          : 'border-[var(--border)]'
                        }
                      `}>
                        {current.selected_question === hq.question && <Check size={10} className="text-white" />}
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-[var(--text-primary)] leading-snug">{hq.question}</p>
                        <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                          <span className="text-[var(--text-tertiary)]">택하면</span> &rarr; {hq.reasoning}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Custom question */}
                <div
                  onClick={() => setEditingQuestion(true)}
                  className={`
                    rounded-2xl border p-4 cursor-pointer
                    transition-all duration-300
                    ${editingQuestion ? 'border-[var(--accent)] shadow-sm' : 'border-dashed border-[var(--border)] hover:border-[var(--border)]'}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className={`
                      w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5
                      transition-all duration-300
                      ${editingQuestion && customQuestion ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-dashed border-[var(--border)]'}
                    `}>
                      {editingQuestion && customQuestion
                        ? <Check size={10} className="text-white" />
                        : <Pencil size={8} className="text-[var(--text-tertiary)]" />
                      }
                    </div>
                    <div className="flex-1">
                      {editingQuestion ? (
                        <input
                          type="text"
                          autoFocus
                          value={customQuestion}
                          onChange={(e) => {
                            setCustomQuestion(e.target.value);
                            handleSelectQuestion(e.target.value);
                          }}
                          placeholder="직접 질문을 작성하세요..."
                          className="w-full bg-transparent text-[14px] font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
                        />
                      ) : (
                        <p className="text-[14px] text-[var(--text-tertiary)]">직접 질문 작성하기...</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* AI limitations */}
              {analysis.ai_limitations.length > 0 && (
                <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] text-[12px] text-[var(--text-tertiary)]">
                  <AlertTriangle size={12} className="inline mr-1.5 -mt-0.5" />
                  <span className="font-medium">AI 한계</span>
                  <span className="mx-1.5">|</span>
                  {analysis.ai_limitations.join(' · ')}
                </div>
              )}
            </div>

            {/* ─── Error ─── */}
            {error && (
              <div className="flex items-center gap-2 text-red-600 text-[13px] bg-red-50 rounded-xl px-3 py-2">
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            {/* ─── Actions ─── */}
            <div className="flex items-center justify-between pt-1">
              <Button variant="secondary" onClick={handleReanalyze} size="sm">
                <RotateCcw size={14} /> 재분석
              </Button>
              <div className="flex gap-2">
                <CopyButton getText={() => decomposeToMarkdown(current)} />
                <Button onClick={handleConfirm} disabled={!current.selected_question}>
                  <Check size={14} /> 확정
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════
          STEP 4: Done — Score Reading Complete
         ═══════════════════════════════════════ */}
      {current?.status === 'done' && current.analysis && (() => {
        const analysis = normalizeAnalysis(current.analysis!);
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="relative rounded-[20px] bg-[var(--surface)] border-2 border-[var(--success)] shadow-sm overflow-hidden">
              <StaffLines opacity={0.04} spacing={11} />
              <div className="relative z-10 p-6">
                <div className="flex items-center gap-2 text-[var(--success)] text-[13px] font-bold mb-5">
                  <Check size={14} />
                  <span>악보 해석 완료</span>
                  <BarLine type="final" height={16} className="ml-2" />
                  <span className="text-[var(--text-tertiary)] font-normal ml-1">주제가 잡혔습니다</span>
                </div>

                <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[var(--text-tertiary)] mb-1.5">
                  재정의된 질문
                </p>
                <p className="text-[17px] font-bold text-[var(--text-primary)] leading-snug tracking-tight">
                  {current.selected_question || analysis.reframed_question}
                </p>
                {analysis.why_reframing_matters && (
                  <p className="text-[13px] text-[var(--text-secondary)] mt-3 leading-relaxed">
                    {analysis.why_reframing_matters}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="secondary" size="sm" onClick={() => { setCurrentId(null); setInputText(''); }}>
                <ArrowRight size={14} /> 새 악보 해석
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (!current || !current.analysis) return;
                    const projectId = current.project_id || getOrCreateProject(analysis.surface_task.slice(0, 30));
                    updateItem(currentId!, { project_id: projectId });
                    addRef(projectId, { tool: 'decompose', itemId: current.id, label: analysis.surface_task });
                    const content = decomposeToMarkdown(current);
                    const contextData = buildDecomposeContext(current);
                    setHandoff({ from: 'decompose', fromItemId: current.id, content, projectId, contextData });
                    onNavigate('orchestrate');
                  }}
                >
                  <Send size={14} /> 편곡으로 보내기
                </Button>
                <CopyButton getText={() => decomposeToMarkdown(current)} label="마크다운 복사" />
              </div>
            </div>

            <NextStepGuide
              currentTool="decompose"
              projectId={current.project_id}
              onSendTo={(href) => {
                if (!current.analysis) return;
                const projectId = current.project_id || getOrCreateProject(analysis.surface_task.slice(0, 30));
                if (!current.project_id) updateItem(currentId!, { project_id: projectId });
                addRef(projectId, { tool: 'decompose', itemId: current.id, label: analysis.surface_task });
                setHandoff({ from: 'decompose', fromItemId: current.id, content: decomposeToMarkdown(current), projectId, contextData: buildDecomposeContext(current) });
                onNavigate(href.replace('/tools/', ''));
              }}
            />
          </div>
        );
      })()}
    </div>
  );
}

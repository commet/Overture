'use client';

import { useEffect, useState } from 'react';
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
import { FileText, Trash2, Check, Pencil, Brain, AlertTriangle, ArrowRight, RotateCcw, Send } from 'lucide-react';
import { StaffLines, BarLine, Fermata } from '@/components/ui/MusicalElements';
import { buildDecomposeContext } from '@/lib/context-chain';

/* ───────────────────────────────────────────
   System Prompt
   ─────────────────────────────────────────── */

const SYSTEM_PROMPT = `당신은 전략기획 전문가입니다. 주어진 과제를 그대로 풀지 마세요.
이 과제가 정말 풀어야 할 문제인지 따져보세요.

[사고 방식]
1. 표면 과제를 받아들이지 말고, 이 과제가 나온 진짜 이유를 파악하세요.
2. 이 과제가 의미 있으려면 참이어야 하는 전제를 찾으세요. 그 전제가 거짓이면 어떤 위험이 있는지 구체적으로 밝히세요.
3. 전제 점검을 바탕으로, 진짜 물어야 할 질문을 재정의하세요.
4. 이 재정의를 받아들이면 뭐가 달라지는지 설명하세요.

아래 JSON 구조로 응답하세요.

1. surface_task: 사용자가 말한 과제를 한 문장으로 정리
2. hidden_assumptions: 이 과제가 의미 있으려면 참이어야 하는 전제 2-3개. 각 전제에 대해:
   - assumption: 전제 내용
   - risk_if_false: 이 전제가 거짓이면 구체적으로 어떤 위험이 생기는지
3. reframed_question: 전제 점검을 바탕으로 재정의한 진짜 질문. "~인가?", "~할 수 있는가?" 형태의 의문문으로.
4. why_reframing_matters: 이 관점 전환을 받아들이면 의사결정이 어떻게 달라지는지 1-2문장
5. reasoning_narrative: "처음에는 X라고 생각했지만, Y를 고려하면 Z가 본질적이다" 형태의 사고 과정 2-3문장
6. hidden_questions: 이 상황에서 추구할 수 있는 방향 2-3개. 각각 다른 관점에서 문제를 바라봄.
   - question: 질문 텍스트
   - reasoning: 이 방향을 택하면 무엇이 달라지는지 한 문장
7. ai_limitations: AI가 이 과제에서 잘 못할 부분 1-2개 (문자열 배열)

반드시 JSON만 응답하세요. 마크다운 코드블록이나 설명을 추가하지 마세요.`;

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
];

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

    try {
      const analysis = await callLLMJson<DecomposeAnalysis>(
        [{ role: 'user', content: finalPrompt }],
        { system: buildEnhancedSystemPrompt(SYSTEM_PROMPT), maxTokens: 2000 }
      );
      updateItem(id, { analysis, status: 'review' });
    } catch (err) {
      setError(err instanceof Error ? err.message : '악보를 읽을 수 없었습니다. 다시 시도하거나 더 구체적으로 입력해보세요.');
      updateItem(id, { status: 'input' });
    }
  };

  const handleSelectQuestion = (question: string) => {
    if (!current || !currentId || !current.analysis) return;
    updateItem(currentId, { selected_question: question });

    const analysis = normalizeAnalysis(current.analysis);
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
  };

  const handleConfirm = () => {
    if (!current || !currentId || !current.analysis) return;
    updateItem(currentId, { status: 'done' });
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
            steps={DECOMPOSE_ENTRY_STEPS}
            textLabel="핵심 내용을 한두 문장으로"
            textPlaceholder="동남아 시장 진출 전략을 2주 안에 보고해야 함"
            textHint="선택한 맥락을 바탕으로 AI가 더 정확하게 분석합니다."
            onSubmit={(selections, text) => {
              const context = Object.entries(selections)
                .map(([k, v]) => {
                  const step = DECOMPOSE_ENTRY_STEPS.find(s => s.key === k);
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

            {/* ─────────────────────────────────
                Card 1: 진단 — The Score Card
                Three clearly separated sections:
                surface → premises → real question
               ───────────────────────────────── */}
            <div className="rounded-[20px] bg-[var(--surface)] border border-[var(--border-subtle)] shadow-sm overflow-hidden">

              {/* ── 1. 받은 악보 (Situation) ── */}
              <div className="px-6 pt-6 pb-5">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-tertiary)]" />
                  <p className="text-[12px] font-medium text-[var(--text-tertiary)]">받은 악보</p>
                </div>
                <p className="text-[15px] text-[var(--text-primary)] leading-relaxed">
                  {analysis.surface_task}
                </p>
              </div>

              {/* ── 2. 점검이 필요한 전제 (Complication) ── */}
              <div className="px-6 py-5 bg-amber-50/80 border-y border-amber-200/40">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <p className="text-[12px] font-medium text-amber-700">점검이 필요한 전제</p>
                    </div>
                    <p className="text-[12px] text-amber-600/70 ml-[14px]">
                      이미 확인한 전제는 체크하세요
                    </p>
                  </div>
                  {analysis.hidden_assumptions.some(a => a.verified) && (
                    <span className="text-[11px] text-[var(--success)] font-medium">
                      {analysis.hidden_assumptions.filter(a => a.verified).length}건 확인됨
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {analysis.hidden_assumptions.map((a, i) => (
                    <div
                      key={i}
                      className={`
                        flex items-start gap-3 pl-4 border-l-2 rounded-r-lg py-2.5 pr-3
                        transition-all duration-300
                        ${a.verified
                          ? 'border-l-emerald-400/50 bg-emerald-50/30'
                          : 'border-l-amber-400/50'
                        }
                      `}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-medium leading-relaxed transition-colors duration-300 ${
                          a.verified ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'
                        }`}>
                          {a.assumption}
                        </p>
                        {a.risk_if_false && !a.verified && (
                          <p className="text-[12px] text-amber-700/60 mt-1 leading-relaxed">
                            만약 아니라면 &rarr; {a.risk_if_false}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleToggleAssumption(i)}
                        className={`
                          shrink-0 mt-0.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium
                          transition-all duration-300 cursor-pointer
                          ${a.verified
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-white/60 text-[var(--text-tertiary)] hover:bg-white hover:text-amber-700'
                          }
                        `}
                      >
                        {a.verified ? (
                          <><Check size={10} /> 확인됨</>
                        ) : (
                          <>확인됨?</>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── 3. 이 곡의 진짜 주제 (Resolution) ── */}
              <div className="px-6 pt-5 pb-6">
                <div className="pl-4 border-l-[3px] border-[var(--accent)]">
                  <p className="text-[12px] font-medium text-[var(--accent)] mb-3">
                    이 곡의 진짜 주제
                  </p>
                  <p className="text-[18px] font-bold text-[var(--text-primary)] leading-snug tracking-tight">
                    {analysis.reframed_question}
                  </p>
                  {analysis.why_reframing_matters && (
                    <p className="text-[13px] text-[var(--text-secondary)] mt-3 leading-relaxed">
                      {analysis.why_reframing_matters}
                    </p>
                  )}
                </div>

                {/* 사고 과정 */}
                {analysis.reasoning_narrative && (
                  <div className="mt-5 pt-4 border-t border-dashed border-[var(--border-subtle)]">
                    <p className="text-[12px] text-[var(--text-tertiary)] italic leading-relaxed">
                      {analysis.reasoning_narrative}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ─────────────────────────────────
                Card 2: 방향 선택 — The Fermata
                Where the user pauses to decide.
               ───────────────────────────────── */}
            <div className="rounded-[20px] bg-[var(--surface)] border border-[var(--border-subtle)] shadow-sm p-6">
              <div className="flex items-center gap-2.5 mb-1">
                <Fermata size={18} color="var(--gold)" />
                <h3 className="text-[15px] font-bold text-[var(--text-primary)]">어떤 해석을 선택하시겠습니까?</h3>
              </div>
              <p className="text-[12px] text-[var(--text-tertiary)] mb-5 ml-[30px]">
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
                        <p className="text-[12px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
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

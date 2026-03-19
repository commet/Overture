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

/* ───────────────────────────────────────────
   System Prompt — 문제 재정의에 집중
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
    key: 'situation',
    question: '어떤 상황인가요?',
    options: [
      { value: 'executive', emoji: '👔', label: '경영진 지시', description: '상사나 경영진이 과제를 줬다' },
      { value: 'client', emoji: '🤝', label: '고객 요청', description: '고객이나 클라이언트의 요청' },
      { value: 'self', emoji: '💡', label: '자체 기획', description: '내가 시작하려는 프로젝트' },
      { value: 'team', emoji: '👥', label: '팀 이슈', description: '팀에서 해결해야 할 문제' },
    ],
  },
  {
    key: 'type',
    question: '어떤 종류의 과제인가요?',
    options: [
      { value: 'strategy', emoji: '🎯', label: '전략 수립' },
      { value: 'analysis', emoji: '🔍', label: '분석/리서치' },
      { value: 'planning', emoji: '📋', label: '기획서 작성' },
      { value: 'response', emoji: '⚡', label: '대응/해결' },
      { value: 'proposal', emoji: '📝', label: '제안서' },
      { value: 'other', emoji: '📦', label: '기타' },
    ],
  },
  {
    key: 'urgency',
    question: '기한은?',
    options: [
      { value: 'urgent', emoji: '🔥', label: '급함 (1주 이내)' },
      { value: 'normal', emoji: '📅', label: '보통 (2-4주)' },
      { value: 'relaxed', emoji: '🌿', label: '여유 (1개월+)' },
    ],
  },
];

/* ───────────────────────────────────────────
   Normalize legacy data (old format → new)
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

  const current = getCurrentItem();

  // Learning indicator: past judgments being applied
  const hasLearning = judgments.length >= 3;

  // Coda insights from past projects
  const codaInsights = projects.filter(
    (p) => p.meta_reflection?.surprising_discovery || p.meta_reflection?.next_time_differently
  );

  // Find similar past analyses
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

  /* ─── Render helper: normalize analysis for display ─── */

  const getAnalysis = () => current?.analysis ? normalizeAnalysis(current.analysis) : null;

  /* ─── Render ─── */

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-bold text-[var(--text-primary)]">악보 해석 <span className="text-[16px] font-normal text-[var(--text-secondary)]">| 문제 재정의</span></h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">
          주어진 과제 뒤에 숨은 진짜 질문을 찾아냅니다.
        </p>
        {hasLearning && (
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)] mt-2">
            <Brain size={12} />
            <span>이전 {judgments.length}건의 판단이 반영되고 있습니다</span>
          </div>
        )}
      </div>

      {/* History items */}
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

      {/* ─── Coda insights from past projects ─── */}
      {(!current || current.status === 'input') && !currentId && codaInsights.length > 0 && (
        <Card className="!bg-[var(--ai)] !p-3">
          <p className="text-[11px] font-bold text-[#2d4a7c] mb-1.5">이전 무대에서의 깨달음</p>
          <div className="space-y-1">
            {codaInsights.slice(0, 2).map((p) => (
              <p key={p.id} className="text-[12px] text-[var(--text-primary)] leading-relaxed">
                <span className="font-semibold">{p.name}</span>:{' '}
                {p.meta_reflection?.surprising_discovery || p.meta_reflection?.next_time_differently}
              </p>
            ))}
          </div>
        </Card>
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
                  return opt ? `${step?.question.replace('?', '')}: ${opt.label}` : '';
                })
                .filter(Boolean)
                .join('\n');
              const fullPrompt = context ? `[맥락]\n${context}\n\n[과제]\n${text}` : text;
              handleAnalyze(fullPrompt);
            }}
          />
          {/* Similar past analyses */}
          {similarItems.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
              <p className="text-[12px] font-semibold text-[var(--text-secondary)] mb-2">유사한 이전 분석</p>
              <div className="space-y-1.5">
                {similarItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => { setCurrentId(item.id); setInputText(''); }}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border)] hover:border-[var(--accent)] cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-[13px] font-medium text-[var(--text-primary)]">
                        {item.analysis?.surface_task || item.input_text.slice(0, 40)}
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                        유사도 {Math.round(item.similarity * 100)}%
                      </p>
                    </div>
                    <ArrowRight size={12} className="text-[var(--text-secondary)] shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-[13px] bg-red-50 rounded-lg px-3 py-2 mt-3">
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
          STEP 3: Review — 진단 + 방향 선택
         ═══════════════════════════════════════ */}
      {current?.status === 'review' && current.analysis && (() => {
        const analysis = normalizeAnalysis(current.analysis!);
        return (
          <div className="space-y-5 animate-fade-in">

            {/* ─── Card 1: 진단 (The Story Card) ─── */}
            <Card className="!p-0 overflow-hidden">

              {/* 받은 악보 */}
              <div className="px-5 pt-5 pb-4">
                <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[var(--text-secondary)] mb-1.5">
                  받은 악보
                </p>
                <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">
                  {analysis.surface_task}
                </p>
              </div>

              {/* 숨겨진 불협화음 */}
              <div className="px-5 py-4 bg-amber-50/60 border-y border-amber-200/50">
                <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-amber-700 mb-1">
                  숨겨진 불협화음
                </p>
                <p className="text-[12px] text-amber-600/80 mb-3">
                  이 과제는 검증되지 않은 전제 위에 서 있습니다
                </p>
                <div className="space-y-2.5">
                  {analysis.hidden_assumptions.map((a, i) => (
                    <div key={i} className="pl-3 border-l-2 border-amber-400">
                      <p className="text-[13px] text-[var(--text-primary)] font-medium leading-relaxed">
                        &ldquo;{a.assumption}&rdquo;
                      </p>
                      {a.risk_if_false && (
                        <p className="text-[12px] text-amber-700 mt-0.5 leading-relaxed">
                          거짓이면 &rarr; {a.risk_if_false}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 이 곡의 진짜 주제 */}
              <div className="px-5 pt-4 pb-5">
                <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[var(--accent)] mb-2">
                  이 곡의 진짜 주제
                </p>
                <p className="text-[17px] font-bold text-[var(--text-primary)] leading-snug">
                  {analysis.reframed_question}
                </p>
                {analysis.why_reframing_matters && (
                  <p className="text-[13px] text-[var(--text-secondary)] mt-2.5 leading-relaxed">
                    {analysis.why_reframing_matters}
                  </p>
                )}

                {/* 사고 과정 — subtle, always visible */}
                {analysis.reasoning_narrative && (
                  <div className="mt-4 pt-3 border-t border-dashed border-[var(--border-subtle)]">
                    <p className="text-[12px] text-[var(--text-secondary)] italic leading-relaxed">
                      {analysis.reasoning_narrative}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* ─── Card 2: 방향 선택 (The Decision Card) ─── */}
            <Card>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="checkpoint">⚡ 판단 필요</Badge>
                <h3 className="text-[15px] font-bold text-[var(--text-primary)]">어떤 해석을 선택하시겠습니까?</h3>
              </div>
              <p className="text-[12px] text-[var(--text-secondary)] mb-4">
                선택한 방향이 편곡 단계의 출발점이 됩니다.
              </p>
              <div className="space-y-2">
                {analysis.hidden_questions.map((hq, i) => (
                  <Card
                    key={i}
                    hoverable
                    className={`cursor-pointer transition-all ${
                      current.selected_question === hq.question
                        ? '!border-[var(--accent)] !border-2 !bg-[var(--ai)]'
                        : ''
                    }`}
                    onClick={() => handleSelectQuestion(hq.question)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        current.selected_question === hq.question
                          ? 'border-[var(--accent)] bg-[var(--accent)]'
                          : 'border-[var(--border)]'
                      }`}>
                        {current.selected_question === hq.question && <Check size={12} className="text-white" />}
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-[var(--text-primary)]">{hq.question}</p>
                        <p className="text-[12px] text-[var(--text-secondary)] mt-1">
                          택하면 &rarr; {hq.reasoning}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
                {/* Custom question */}
                <Card
                  hoverable
                  className={`cursor-pointer ${editingQuestion ? '!border-[var(--accent)] !border-2' : ''}`}
                  onClick={() => setEditingQuestion(true)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                      editingQuestion && customQuestion ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-dashed border-[var(--border)]'
                    }`}>
                      {editingQuestion && customQuestion && <Check size={12} className="text-white" />}
                      {!(editingQuestion && customQuestion) && <Pencil size={10} className="text-[var(--text-secondary)]" />}
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
                          className="w-full bg-transparent text-[14px] font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none"
                        />
                      ) : (
                        <p className="text-[14px] text-[var(--text-secondary)]">직접 질문 작성하기...</p>
                      )}
                    </div>
                  </div>
                </Card>
              </div>

              {/* AI 한계 — inline footer */}
              {analysis.ai_limitations.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] text-[12px] text-[var(--text-secondary)]">
                  <span className="font-semibold">⚠ AI 한계:</span> {analysis.ai_limitations.join(' · ')}
                </div>
              )}
            </Card>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-[13px] bg-red-50 rounded-lg px-3 py-2">
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            {/* Actions */}
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
          STEP 4: Done
         ═══════════════════════════════════════ */}
      {current?.status === 'done' && current.analysis && (() => {
        const analysis = normalizeAnalysis(current.analysis!);
        return (
          <div className="space-y-4 animate-fade-in">
            <Card className="!border-[var(--success)] !border-2">
              <div className="flex items-center gap-2 text-[var(--success)] text-[13px] font-bold mb-4">
                <Check size={14} /> 악보 해석 완료 — 주제가 잡혔습니다
              </div>
              <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[var(--text-secondary)] mb-1">
                재정의된 질문
              </p>
              <p className="text-[16px] font-bold text-[var(--text-primary)] leading-snug">
                {current.selected_question || analysis.reframed_question}
              </p>
              {analysis.why_reframing_matters && (
                <p className="text-[13px] text-[var(--text-secondary)] mt-2 leading-relaxed">
                  {analysis.why_reframing_matters}
                </p>
              )}
            </Card>
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
                    setHandoff({
                      from: 'decompose',
                      fromItemId: current.id,
                      content,
                      projectId,
                    });
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
                setHandoff({ from: 'decompose', fromItemId: current.id, content: decomposeToMarkdown(current), projectId });
                onNavigate(href.replace('/tools/', ''));
              }}
            />
          </div>
        );
      })()}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useDecomposeStore } from '@/stores/useDecomposeStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CopyButton } from '@/components/ui/CopyButton';
import { decomposeToMarkdown } from '@/lib/export';
import { callLLMJson } from '@/lib/llm';
import type { DecomposeAnalysis, DecomposeSubtask, DecomposeItem } from '@/stores/types';
import { StepEntry } from '@/components/ui/StepEntry';
import { LoadingSteps } from '@/components/ui/LoadingSteps';
import { useHandoffStore } from '@/stores/useHandoffStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { useJudgmentStore } from '@/stores/useJudgmentStore';
import { buildEnhancedSystemPrompt } from '@/lib/context-builder';
import { findSimilarItems } from '@/lib/similarity';
import { NextStepGuide } from '@/components/ui/NextStepGuide';
import { FileText, Trash2, Check, Pencil, Bot, Brain, Handshake, AlertTriangle, ArrowRight, RotateCcw, Send, Lightbulb } from 'lucide-react';

const LOADING_MESSAGES = [
  '과제를 분석하고 있습니다...',
  '숨겨진 질문을 찾고 있습니다...',
  '역할을 분배하고 있습니다...',
];

const SYSTEM_PROMPT = `당신은 전략기획 전문가입니다. 주어진 과제를 그대로 풀지 마세요. 먼저 이 과제가 정말 풀어야 할 문제인지 따져보세요.

[사고 방식]
- 가설 기반: "이 과제가 나온 진짜 이유는 무엇인가?" 가설을 먼저 세우세요.
- 리프레이밍: 같은 상황을 완전히 다르게 정의할 수 있는지 탐색하세요.
- 전제 점검: 이 과제가 의미 있으려면 어떤 가정이 참이어야 하는지, 네 가지 축으로 밝히세요: (1) 고객 가치 — 이걸 원하는 사람이 있는가? (2) 실행 가능성 — 만들 수 있는가? (3) 사업성 — 수익이 되는가? (4) 조직 역량 — 우리 팀이 할 수 있는가?
- 이슈 분해: 하위 과제를 겹치지 않고 빠짐없이 나누세요.

아래 JSON 구조로 응답하세요.

1. surface_task: 사용자가 말한 과제를 한 문장으로 정리
2. hypothesis: "이 과제가 존재하는 진짜 이유는 X이고, 그렇다면 풀어야 할 질문은 Y이다" 형태의 가설
3. alternative_framings: 같은 상황을 다르게 정의한 대안적 프레이밍 2~3개 (문자열 배열)
4. hidden_assumptions: 이 과제가 의미 있으려면 참이어야 하는 숨겨진 전제 2~3개 (문자열 배열)
5. hidden_questions: 이 과제 이면의 진짜 질문 2~3개. 각 질문에 대해:
   - question: 질문 텍스트
   - reasoning: 왜 이 질문이 중요한지 한 문장
6. decomposition: 과제를 3~7개 서브태스크로 분해. 각 서브태스크에 대해:
   - task: 할 일
   - actor: "ai" | "human" | "both"
   - actor_reasoning: 왜 이 담당이 적절한지 한 문장
7. ai_limitations: 이 과제에서 AI가 잘 못할 부분 1~2개

반드시 JSON만 응답하세요. 마크다운 코드블록이나 설명을 추가하지 마세요.`;

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

interface DecomposeStepProps {
  onNavigate: (step: string) => void;
}

export function DecomposeStep({ onNavigate }: DecomposeStepProps) {
  const { items, currentId, loadItems, createItem, updateItem, deleteItem, setCurrentId, getCurrentItem } = useDecomposeStore();
  const { addJudgment, loadJudgments } = useJudgmentStore();
  const { setHandoff } = useHandoffStore();
  const { getOrCreateProject, addRef } = useProjectStore();
  const [inputText, setInputText] = useState('');
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [editingQuestion, setEditingQuestion] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');
  const [error, setError] = useState('');
  const [similarItems, setSimilarItems] = useState<Array<DecomposeItem & { similarity: number }>>([]);

  useEffect(() => {
    loadItems();
    loadJudgments();
  }, [loadItems, loadJudgments]);

  const current = getCurrentItem();

  // Cycle loading messages
  useEffect(() => {
    if (current?.status !== 'analyzing') return;
    const interval = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [current?.status]);

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
      setError(err instanceof Error ? err.message : 'AI 분석에 실패했습니다.');
      updateItem(id, { status: 'input' });
    }
  };

  const handleSelectQuestion = (question: string) => {
    if (!current || !currentId || !current.analysis) return;
    updateItem(currentId, { selected_question: question });

    // Record judgment
    const isCustom = !current.analysis.hidden_questions.some(hq => hq.question === question);
    addJudgment({
      type: 'hidden_question_selection',
      context: current.analysis.surface_task,
      decision: question,
      original_ai_suggestion: current.analysis.hidden_questions[0]?.question || '',
      user_changed: isCustom,
      project_id: current.project_id,
      tool: 'decompose',
    });
  };

  const handleConfirm = () => {
    if (!current || !currentId || !current.analysis) return;
    updateItem(currentId, {
      status: 'done',
      final_decomposition: current.analysis.decomposition,
    });
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
      setError(err instanceof Error ? err.message : 'AI 분석에 실패했습니다.');
      updateItem(currentId, { status: 'review' });
    }
  };

  const handleUpdateSubtaskActor = (index: number, actor: 'ai' | 'human' | 'both') => {
    if (!current || !currentId || !current.analysis) return;
    const original = current.analysis.decomposition[index];
    const decomposition = [...current.analysis.decomposition];
    decomposition[index] = { ...decomposition[index], actor };
    updateItem(currentId, { analysis: { ...current.analysis, decomposition } });

    if (original.actor !== actor) {
      addJudgment({
        type: 'actor_override',
        context: original.task,
        decision: actor,
        original_ai_suggestion: original.actor,
        user_changed: true,
        project_id: current.project_id,
        tool: 'decompose',
      });
    }
  };

  const actorIcon = (actor: string) => {
    if (actor === 'ai') return <Bot size={14} />;
    if (actor === 'human') return <Brain size={14} />;
    return <Handshake size={14} />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-bold text-[var(--text-primary)]">악보 해석 <span className="text-[16px] font-normal text-[var(--text-secondary)]">| 문제 재정의</span></h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">
          맥락을 선택하면 AI가 더 정확하게 분석합니다.
        </p>
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

      {/* ─── STEP 1: Input ─── */}
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
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-[13px] bg-red-50 rounded-lg px-3 py-2 mt-3">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </Card>
      )}

      {/* ─── STEP 2: Analyzing (Loading) ─── */}
      {current?.status === 'analyzing' && (
        <Card>
          <LoadingSteps steps={['과제를 분석하고 있습니다', '숨겨진 질문을 찾고 있습니다', '역할을 분배하고 있습니다']} />
        </Card>
      )}

      {/* ─── STEP 3: Review ─── */}
      {current?.status === 'review' && current.analysis && (
        <div className="space-y-6 animate-fade-in">
          {/* Surface task */}
          <Card className="!bg-[var(--ai)]">
            <div className="flex items-center gap-2 text-[12px] text-[#2d4a7c] font-semibold mb-2">
              <Bot size={14} /> AI 분석 결과
            </div>
            <h3 className="text-[16px] font-bold text-[var(--text-primary)]">표면 과제</h3>
            <p className="text-[14px] text-[var(--text-primary)] mt-1">{current.analysis.surface_task}</p>
          </Card>

          {/* Hypothesis */}
          {current.analysis.hypothesis && (
            <Card className="!bg-[var(--ai)]">
              <div className="flex items-center gap-2 text-[12px] text-[#2d4a7c] font-semibold mb-2">
                <Lightbulb size={14} /> 가설
              </div>
              <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">{current.analysis.hypothesis}</p>
            </Card>
          )}

          {/* Hidden Assumptions */}
          {current.analysis.hidden_assumptions && current.analysis.hidden_assumptions.length > 0 && (
            <Card className="!bg-[var(--checkpoint)]">
              <div className="flex items-center gap-2 text-[12px] text-amber-700 font-semibold mb-2">
                <AlertTriangle size={14} /> 숨겨진 전제
              </div>
              <p className="text-[11px] text-amber-600 mb-2">이 과제가 의미 있으려면 참이어야 하는 가정들</p>
              <ul className="space-y-1">
                {current.analysis.hidden_assumptions.map((a: string, i: number) => (
                  <li key={i} className="text-[13px] text-amber-800">• {a}</li>
                ))}
              </ul>
            </Card>
          )}

          {/* Alternative Framings */}
          {current.analysis.alternative_framings && current.analysis.alternative_framings.length > 0 && (
            <div className="space-y-2">
              <p className="text-[13px] font-semibold text-[var(--text-secondary)]">같은 상황을 다르게 볼 수 있는 관점</p>
              {current.analysis.alternative_framings.map((f: string, i: number) => (
                <Card key={i} className="!p-3 !bg-[var(--bg)]">
                  <p className="text-[13px] text-[var(--text-primary)]">{f}</p>
                </Card>
              ))}
            </div>
          )}

          {/* Hidden questions - JUDGMENT POINT */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="checkpoint">⚡ 판단 필요</Badge>
              <h3 className="text-[16px] font-bold text-[var(--text-primary)]">숨겨진 진짜 질문</h3>
            </div>
            <p className="text-[13px] text-[var(--text-secondary)]">
              이 과제 이면에 있을 수 있는 질문들입니다. 하나를 선택하면 이것이 실제로 풀 과제가 됩니다.
            </p>
            <div className="space-y-2">
              {current.analysis.hidden_questions.map((hq, i) => (
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
                      <p className="text-[12px] text-[var(--text-secondary)] mt-1">{hq.reasoning}</p>
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
          </div>

          {/* Decomposition */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Bot size={14} className="text-[#2d4a7c]" />
              <h3 className="text-[16px] font-bold text-[var(--text-primary)]">악보 해석 결과</h3>
            </div>
            <div className="space-y-2">
              {current.analysis.decomposition.map((sub, i) => (
                <Card key={i} className="!p-3">
                  <div className="flex items-start gap-3">
                    <span className="text-[12px] font-bold text-[var(--text-secondary)] mt-0.5 w-5 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] text-[var(--text-primary)]">{sub.task}</p>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-1">{sub.actor_reasoning}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {(['ai', 'human', 'both'] as const).map((actor) => (
                        <button
                          key={actor}
                          onClick={() => handleUpdateSubtaskActor(i, actor)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            sub.actor === actor
                              ? actor === 'ai' ? 'bg-[var(--ai)] text-[#2d4a7c]'
                                : actor === 'human' ? 'bg-[var(--human)] text-[#8b6914]'
                                : 'bg-[var(--collab)] text-[#2d6b2d]'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg)]'
                          }`}
                          title={actor === 'ai' ? 'AI' : actor === 'human' ? '사람' : '협업'}
                        >
                          {actorIcon(actor)}
                        </button>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* AI Limitations */}
          {current.analysis.ai_limitations.length > 0 && (
            <Card className="!bg-[var(--human)]">
              <div className="flex items-center gap-2 text-[13px] font-bold text-[#8b6914] mb-2">
                <AlertTriangle size={14} /> AI가 잘 못하는 부분
              </div>
              <ul className="space-y-1">
                {current.analysis.ai_limitations.map((lim, i) => (
                  <li key={i} className="text-[13px] text-[#8b6914]">• {lim}</li>
                ))}
              </ul>
            </Card>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-[13px] bg-red-50 rounded-lg px-3 py-2">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="secondary" onClick={handleReanalyze} size="sm">
              <RotateCcw size={14} /> 재분석
            </Button>
            <div className="flex gap-2">
              <CopyButton getText={() => decomposeToMarkdown(current)} />
              <Button onClick={handleConfirm}>
                <Check size={14} /> 확정
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 4: Done ─── */}
      {current?.status === 'done' && current.analysis && (
        <div className="space-y-4 animate-fade-in">
          <Card className="!border-[var(--success)] !border-2">
            <div className="flex items-center gap-2 text-[var(--success)] text-[13px] font-bold mb-3">
              <Check size={14} /> 악보 해석 완료
            </div>
            <h3 className="text-[15px] font-bold mb-1">재정의된 질문</h3>
            <p className="text-[14px] text-[var(--text-primary)] mb-4">
              {current.selected_question || current.analysis.surface_task}
            </p>
            <h3 className="text-[15px] font-bold mb-2">역할 분배</h3>
            <div className="space-y-1.5">
              {(current.final_decomposition.length > 0 ? current.final_decomposition : current.analysis.decomposition).map((sub, i) => (
                <div key={i} className="flex items-center gap-2 text-[13px]">
                  <Badge variant={sub.actor === 'ai' ? 'ai' : sub.actor === 'human' ? 'human' : 'both'}>
                    {sub.actor === 'ai' ? '🤖 AI' : sub.actor === 'human' ? '🧠 사람' : '🤝 협업'}
                  </Badge>
                  <span>{sub.task}</span>
                </div>
              ))}
            </div>
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
                  const projectId = current.project_id || getOrCreateProject(current.analysis.surface_task.slice(0, 30));
                  updateItem(currentId!, { project_id: projectId });
                  addRef(projectId, { tool: 'decompose', itemId: current.id, label: current.analysis.surface_task });

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
              const projectId = current.project_id || getOrCreateProject(current.analysis.surface_task.slice(0, 30));
              if (!current.project_id) updateItem(currentId!, { project_id: projectId });
              addRef(projectId, { tool: 'decompose', itemId: current.id, label: current.analysis.surface_task });
              setHandoff({ from: 'decompose', fromItemId: current.id, content: decomposeToMarkdown(current), projectId });
              onNavigate(href.replace('/tools/', ''));
            }}
          />
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useDecomposeStore } from '@/stores/useDecomposeStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CopyButton } from '@/components/ui/CopyButton';
import { decomposeToMarkdown } from '@/lib/export';
import { callLLMJson } from '@/lib/llm';
import type { DecomposeAnalysis, DecomposeSubtask } from '@/stores/types';
import { ModeToggle } from '@/components/ui/ModeToggle';
import { LoadingSteps } from '@/components/ui/LoadingSteps';
import { Sparkles, Loader2, FileText, Trash2, Check, Pencil, Bot, Brain, Handshake, AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';

const LOADING_MESSAGES = [
  '과제를 분석하고 있습니다...',
  '숨겨진 질문을 찾고 있습니다...',
  '역할을 분배하고 있습니다...',
];

const SYSTEM_PROMPT = `당신은 전략기획 전문가입니다. 사용자가 입력한 과제를 분석하여 아래 JSON 구조로 응답하세요.

1. surface_task: 사용자가 말한 과제를 한 문장으로 정리
2. hidden_questions: 이 과제 이면에 있을 수 있는 진짜 질문 2~3개. 각 질문에 대해:
   - question: 질문 텍스트
   - reasoning: 왜 이 질문이 중요한지 한 문장
3. decomposition: 과제를 3~7개 서브태스크로 분해. 각 서브태스크에 대해:
   - task: 할 일
   - actor: "ai" | "human" | "both"
   - actor_reasoning: 왜 이 담당이 적절한지 한 문장
4. ai_limitations: 이 과제에서 AI가 잘 못할 부분 1~2개

반드시 JSON만 응답하세요. 마크다운 코드블록이나 설명을 추가하지 마세요.`;

export default function DecomposePage() {
  const { items, currentId, loadItems, createItem, updateItem, deleteItem, setCurrentId, getCurrentItem } = useDecomposeStore();
  const [inputText, setInputText] = useState('');
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [editingQuestion, setEditingQuestion] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'auto' | 'guided'>('auto');

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const current = getCurrentItem();

  // Cycle loading messages
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
    const id = createItem(inputText);
    updateItem(id, { status: 'analyzing' });

    try {
      const analysis = await callLLMJson<DecomposeAnalysis>(
        [{ role: 'user', content: inputText }],
        { system: SYSTEM_PROMPT, maxTokens: 2000 }
      );
      updateItem(id, { analysis, status: 'review' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 분석에 실패했습니다.');
      updateItem(id, { status: 'input' });
    }
  };

  const handleSelectQuestion = (question: string) => {
    if (!current || !currentId) return;
    updateItem(currentId, { selected_question: question });
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
        { system: SYSTEM_PROMPT, maxTokens: 2000 }
      );
      updateItem(currentId, { analysis, status: 'review' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 분석에 실패했습니다.');
      updateItem(currentId, { status: 'review' });
    }
  };

  const handleUpdateSubtaskActor = (index: number, actor: 'ai' | 'human' | 'both') => {
    if (!current || !currentId || !current.analysis) return;
    const decomposition = [...current.analysis.decomposition];
    decomposition[index] = { ...decomposition[index], actor };
    updateItem(currentId, { analysis: { ...current.analysis, decomposition } });
  };

  const actorIcon = (actor: string) => {
    if (actor === 'ai') return <Bot size={14} />;
    if (actor === 'human') return <Brain size={14} />;
    return <Handshake size={14} />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--text-primary)]">과제 분해</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
            {mode === 'auto'
              ? '과제를 입력하면 AI가 분석하고, 당신은 핵심 판단만 합니다.'
              : '단계별로 직접 과제를 구조화합니다. AI가 각 단계를 보조합니다.'}
          </p>
        </div>
        <ModeToggle mode={mode} onChange={setMode} />
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
        <Card className="space-y-4">
          <div>
            <h2 className="text-[16px] font-bold text-[var(--text-primary)] mb-1">지금 해결하려는 과제나 요청받은 일을 자유롭게 적어주세요</h2>
            <p className="text-[12px] text-[var(--text-secondary)]">어떤 형식이든 좋습니다. AI가 구조화하고 진짜 질문을 찾아줍니다.</p>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="대표님이 내년 동남아 시장 진출 전략을 이번 달까지 보고하라고 했음. 시장 리서치부터 재무 모델까지 필요한데, 기간은 2주밖에 없고 팀원은 나 포함 3명..."
            className="w-full bg-[#fafbfc] border-[1.5px] border-[var(--border)] rounded-[10px] px-4 py-3 text-[15px] leading-[1.7] placeholder:text-[var(--text-secondary)] placeholder:text-[14px] focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(74,111,165,0.08)] resize-none transition-all"
            rows={5}
          />
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-[13px] bg-red-50 rounded-lg px-3 py-2">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={handleAnalyze} disabled={!inputText.trim()}>
              <Sparkles size={14} /> AI 분석 시작
            </Button>
          </div>
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
              <h3 className="text-[16px] font-bold text-[var(--text-primary)]">과제 분해안</h3>
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
              <Check size={14} /> 과제 분해 완료
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
              <ArrowRight size={14} /> 새 과제 분해
            </Button>
            <CopyButton getText={() => decomposeToMarkdown(current)} label="마크다운 복사" />
          </div>
        </div>
      )}
    </div>
  );
}

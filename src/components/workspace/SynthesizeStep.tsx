'use client';

import { useEffect, useState } from 'react';
import { useSynthesizeStore } from '@/stores/useSynthesizeStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Field } from '@/components/ui/Field';
import { ShareBar } from '@/components/ui/ShareBar';
import { synthesizeToMarkdown } from '@/lib/export';
import { callLLMJson } from '@/lib/llm';
import type { SynthesizeAnalysis, SynthesizeSource } from '@/stores/types';
import { InterviewInput, buildInterviewPrompt } from '@/components/ui/InterviewInput';
import type { InterviewStep } from '@/components/ui/InterviewInput';
import { ModeToggle } from '@/components/ui/ModeToggle';
import type { InputMode } from '@/components/ui/ModeToggle';
import { LoadingSteps } from '@/components/ui/LoadingSteps';
import { useHandoffStore } from '@/stores/useHandoffStore';
import { useJudgmentStore } from '@/stores/useJudgmentStore';
import { buildEnhancedSystemPrompt } from '@/lib/context-builder';
import { NextStepGuide } from '@/components/ui/NextStepGuide';
import { Sparkles, Loader2, FileText, Trash2, Check, PlusCircle, X, AlertTriangle, ArrowRight, RotateCcw, Bot, Scale, Send } from 'lucide-react';

const LOADING_MESSAGES = [
  '소스를 분리하고 있습니다...',
  '핵심 주장을 추출하고 있습니다...',
  '합의점과 쟁점을 분석하고 있습니다...',
];

const SYSTEM_PROMPT = `당신은 전략기획 전문가입니다. 사용자가 제출한 여러 AI 결과물 또는 의견들을 분석하여 아래 JSON 구조로 응답하세요.

1. sources_summary: 각 소스(또는 의견)의 핵심 주장을 정리. 각 소스에 대해:
   - name: 소스 이름 또는 번호 (사용자가 라벨을 붙였으면 그대로, 아니면 "소스 1", "소스 2" 등)
   - core_claim: 핵심 주장 한 문장
2. agreements: 소스들이 동의하는 합의점 리스트 (문자열 배열, 1~3개)
3. conflicts: 소스 간 충돌하는 쟁점 리스트. 각 쟁점에 대해:
   - id: 고유 식별자 (conflict_1, conflict_2 등)
   - topic: 쟁점 주제 한 문장
   - side_a: { source: 소스 이름, position: 이 소스의 입장 }
   - side_b: { source: 소스 이름, position: 이 소스의 입장 }
   - analysis: 왜 이 두 입장이 다른지 분석 한 문장
4. questions_for_user: 사용자가 결정해야 할 핵심 질문 1~2개

반드시 JSON만 응답하세요.`;

const SYNTHESIZE_INTERVIEW: InterviewStep[] = [
  {
    key: 'sourceType',
    question: '어떤 것들을 비교하고 싶으세요?',
    label: '소스 유형',
    type: 'chips',
    options: [
      { value: 'ai_tools', label: 'AI 도구별 답변', emoji: '🤖' },
      { value: 'team', label: '팀원/부서 의견', emoji: '👥' },
      { value: 'research', label: '리서치 자료', emoji: '📑' },
      { value: 'external', label: '외부 보고서', emoji: '🌐' },
      { value: 'options', label: '선택지/대안 비교', emoji: '⚖️' },
    ],
  },
  {
    key: 'purpose',
    question: '비교해서 뭘 하려는 건가요?',
    label: '비교 목적',
    type: 'chips',
    options: [
      { value: 'decision', label: '의사결정' },
      { value: 'report', label: '보고서 작성' },
      { value: 'strategy', label: '전략 수립' },
      { value: 'comparison', label: '단순 비교' },
      { value: 'consensus', label: '합의점 도출' },
    ],
  },
  {
    key: 'importance',
    question: '이 결정이 얼마나 중요한가요?',
    label: '중요도',
    hint: '중요도에 따라 분석 깊이가 달라집니다.',
    type: 'chips',
    options: [
      { value: 'critical', label: '매우 중요 (되돌리기 어려움)', emoji: '🔴' },
      { value: 'moderate', label: '중간' },
      { value: 'low', label: '가볍게 참고', emoji: '🟢' },
    ],
  },
  {
    key: 'content',
    question: '비교할 내용을 붙여넣어주세요',
    label: '비교 내용',
    hint: '각 소스를 구분해서 붙여넣으면 더 정확하게 분석합니다.',
    type: 'textarea',
    placeholder: 'ChatGPT 답변:\n시장 규모는 약 500억 원으로...\n\nClaude 답변:\n해당 시장은 300~700억 원 사이로...',
    required: true,
    rows: 8,
  },
];

interface SynthesizeStepProps {
  onNavigate: (step: string) => void;
}

export function SynthesizeStep({ onNavigate }: SynthesizeStepProps) {
  const { items, currentId, loadItems, createItem, updateItem, deleteItem, setCurrentId, getCurrentItem } = useSynthesizeStore();
  const { addJudgment, loadJudgments } = useJudgmentStore();
  const { setHandoff } = useHandoffStore();
  const [inputMode, setInputMode] = useState<'bulk' | 'individual'>('bulk');
  const [bulkInput, setBulkInput] = useState('');
  const [individualSources, setIndividualSources] = useState<SynthesizeSource[]>([
    { name: '', content: '' },
    { name: '', content: '' },
  ]);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<InputMode>('interview');

  useEffect(() => {
    loadItems();
    loadJudgments();
  }, [loadItems, loadJudgments]);

  const current = getCurrentItem();

  useEffect(() => {
    if (current?.status !== 'analyzing') return;
    const interval = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [current?.status]);

  const handleAnalyze = async (prompt?: string) => {
    setError('');
    let userContent = '';
    const sources: SynthesizeSource[] = [];

    if (prompt) {
      userContent = prompt;
    } else if (inputMode === 'bulk') {
      if (!bulkInput.trim()) return;
      userContent = bulkInput;
    } else {
      const validSources = individualSources.filter((s) => s.content.trim());
      if (validSources.length < 2) { setError('최소 2개 소스를 입력해주세요.'); return; }
      sources.push(...validSources);
      userContent = validSources.map((s, i) => `### ${s.name || `소스 ${i + 1}`}\n${s.content}`).join('\n\n');
    }

    const id = createItem();
    updateItem(id, { raw_input: userContent, sources, status: 'analyzing' });

    try {
      const analysis = await callLLMJson<SynthesizeAnalysis>(
        [{ role: 'user', content: userContent }],
        { system: buildEnhancedSystemPrompt(SYSTEM_PROMPT), maxTokens: 2500 }
      );
      updateItem(id, { analysis, status: 'review' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI 분석에 실패했습니다.');
      updateItem(id, { status: 'input' });
    }
  };

  const handleJudgment = (conflictId: string, judgment: string) => {
    if (!current || !currentId || !current.analysis) return;
    const conflict = current.analysis.conflicts.find(c => c.id === conflictId);
    const conflicts = current.analysis.conflicts.map((c) =>
      c.id === conflictId ? { ...c, user_judgment: judgment } : c
    );
    updateItem(currentId, { analysis: { ...current.analysis, conflicts } });

    if (conflict && judgment.trim()) {
      addJudgment({
        type: 'conflict_resolution',
        context: conflict.topic,
        decision: judgment,
        original_ai_suggestion: `${conflict.side_a.source}: ${conflict.side_a.position}`,
        user_changed: true,
        project_id: current.project_id,
        tool: 'synthesize',
      });
    }
  };

  const handleJudgmentReasoning = (conflictId: string, reasoning: string) => {
    if (!current || !currentId || !current.analysis) return;
    const conflicts = current.analysis.conflicts.map((c) =>
      c.id === conflictId ? { ...c, user_reasoning: reasoning } : c
    );
    updateItem(currentId, { analysis: { ...current.analysis, conflicts } });
  };

  const handleConfirm = () => {
    if (!current || !currentId || !current.analysis) return;
    const synthesis = current.analysis.conflicts
      .filter((c) => c.user_judgment)
      .map((c) => `${c.topic}: ${c.user_judgment}${c.user_reasoning ? ` (근거: ${c.user_reasoning})` : ''}`)
      .join('\n');
    updateItem(currentId, { status: 'done', final_synthesis: synthesis });
  };

  const addIndividualSource = () => {
    if (individualSources.length >= 5) return;
    setIndividualSources([...individualSources, { name: '', content: '' }]);
  };

  const removeIndividualSource = (index: number) => {
    if (individualSources.length <= 2) return;
    setIndividualSources(individualSources.filter((_, i) => i !== index));
  };

  const updateIndividualSource = (index: number, field: 'name' | 'content', value: string) => {
    const updated = [...individualSources];
    updated[index] = { ...updated[index], [field]: value };
    setIndividualSources(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[var(--text-primary)]">조율</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
            {mode === 'direct'
              ? '결과물을 붙여넣으면 AI가 쟁점을 찾고, 당신은 판단만 합니다.'
              : '질문에 답한 후 내용을 붙여넣으면 더 정확하게 분석합니다.'}
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
              onClick={() => setCurrentId(item.id)}
              className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] border transition-colors cursor-pointer ${
                currentId === item.id
                  ? 'border-[var(--accent)] bg-[var(--ai)] text-[var(--text-primary)]'
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]'
              }`}
            >
              <FileText size={14} />
              {(item.analysis?.sources_summary[0]?.name || '합성').slice(0, 20)}
              <span onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} className="ml-1 p-0.5 hover:text-red-500 cursor-pointer">
                <Trash2 size={12} />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ─── STEP 1: Input ─── */}
      {(!current || current.status === 'input') && !currentId && (
        <div className="space-y-4">
          {mode === 'direct' ? (
            <Card className="space-y-3">
              <div>
                <h2 className="text-[16px] font-bold text-[var(--text-primary)] mb-1">비교할 결과물을 붙여넣으세요</h2>
                <p className="text-[12px] text-[var(--text-secondary)]">여러 AI 답변이나 의견을 한 번에 붙여넣으면 AI가 자동으로 분리하고 분석합니다.</p>
              </div>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setInputMode('bulk')}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors cursor-pointer ${
                    inputMode === 'bulk' ? 'border-[var(--accent)] bg-[var(--ai)]' : 'border-[var(--border)] text-[var(--text-secondary)]'
                  }`}
                >
                  한 번에 붙여넣기
                </button>
                <button
                  onClick={() => setInputMode('individual')}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors cursor-pointer ${
                    inputMode === 'individual' ? 'border-[var(--accent)] bg-[var(--ai)]' : 'border-[var(--border)] text-[var(--text-secondary)]'
                  }`}
                >
                  소스별 입력
                </button>
              </div>
              {inputMode === 'bulk' ? (
                <>
                  <textarea
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    placeholder={"ChatGPT 답변:\n시장 규모는 약 500억 원으로...\n\nClaude 답변:\n해당 시장은 300~700억 원 사이로..."}
                    className="w-full bg-[var(--bg)] border-[1.5px] border-[var(--border)] rounded-[10px] px-4 py-3 text-[15px] leading-[1.7] placeholder:text-[var(--text-secondary)] placeholder:text-[14px] focus:outline-none focus:border-[var(--accent)] resize-none"
                    rows={8}
                  />
                  <div className="flex justify-end">
                    <Button onClick={() => handleAnalyze()} disabled={!bulkInput.trim()}>
                      <Sparkles size={14} /> AI 분석 시작
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    {individualSources.map((source, i) => (
                      <div key={i} className="space-y-2 p-3 rounded-lg border border-[var(--border)] animate-fade-in">
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            value={source.name}
                            onChange={(e) => updateIndividualSource(i, 'name', e.target.value)}
                            placeholder={`소스 ${i + 1} (예: ChatGPT, Claude, 리서치팀)`}
                            className="flex-1 bg-transparent text-[14px] font-semibold placeholder:text-[var(--text-secondary)] focus:outline-none"
                          />
                          {individualSources.length > 2 && (
                            <button onClick={() => removeIndividualSource(i)} className="p-1 hover:text-red-500 cursor-pointer">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                        <textarea
                          value={source.content}
                          onChange={(e) => updateIndividualSource(i, 'content', e.target.value)}
                          placeholder="이 소스의 결과물이나 의견을 붙여넣으세요"
                          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[14px] leading-[1.6] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)] resize-none"
                          rows={4}
                        />
                      </div>
                    ))}
                    {individualSources.length < 5 && (
                      <Button variant="ghost" size="sm" onClick={addIndividualSource}>
                        <PlusCircle size={14} /> 소스 추가
                      </Button>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => handleAnalyze()} disabled={individualSources.filter((s) => s.content.trim()).length < 2}>
                      <Sparkles size={14} /> AI 분석 시작
                    </Button>
                  </div>
                </>
              )}
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-[13px] bg-red-50 rounded-lg px-3 py-2">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <InterviewInput
                steps={SYNTHESIZE_INTERVIEW}
                submitLabel="AI 분석 시작"
                onSubmit={(answers) => handleAnalyze(buildInterviewPrompt(SYNTHESIZE_INTERVIEW, answers))}
              />
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-[13px] bg-red-50 rounded-lg px-3 py-2 mt-3">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ─── Loading ─── */}
      {current?.status === 'analyzing' && (
        <Card>
          <LoadingSteps steps={['소스를 분리하고 있습니다', '핵심 주장을 추출하고 있습니다', '합의점과 쟁점을 분석하고 있습니다']} />
        </Card>
      )}

      {/* ─── STEP 2: Review ─── */}
      {current?.status === 'review' && current.analysis && (
        <div className="space-y-6 animate-fade-in">
          {/* Sources summary */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bot size={14} className="text-[#2d4a7c]" />
              <h3 className="text-[16px] font-bold text-[var(--text-primary)]">소스별 핵심 주장</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {current.analysis.sources_summary.map((s, i) => (
                <Card key={i} className="!bg-[var(--ai)] !p-3">
                  <p className="text-[12px] font-bold text-[#2d4a7c] mb-1">{s.name}</p>
                  <p className="text-[13px] text-[var(--text-primary)]">{s.core_claim}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Agreements */}
          {current.analysis.agreements.length > 0 && (
            <Card className="!bg-[var(--collab)]">
              <h3 className="text-[14px] font-bold text-[#2d6b2d] mb-2">합의점</h3>
              <ul className="space-y-1">
                {current.analysis.agreements.map((a, i) => (
                  <li key={i} className="text-[13px] text-[#2d6b2d]">✓ {a}</li>
                ))}
              </ul>
            </Card>
          )}

          {/* Conflicts - JUDGMENT POINTS */}
          {current.analysis.conflicts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="checkpoint">⚡ 판단 필요</Badge>
                <h3 className="text-[16px] font-bold text-[var(--text-primary)]">쟁점</h3>
              </div>
              <p className="text-[13px] text-[var(--text-secondary)]">
                각 쟁점에서 당신의 판단을 입력하세요. AI가 아니라 당신의 맥락에서 결정해야 합니다.
              </p>
              {current.analysis.conflicts.map((conflict) => (
                <Card key={conflict.id} className={`space-y-3 ${conflict.user_judgment ? '!border-[var(--success)]' : '!border-amber-300'}`}>
                  <div className="flex items-center gap-2">
                    <Scale size={14} className="text-amber-600" />
                    <h4 className="text-[14px] font-bold text-[var(--text-primary)]">{conflict.topic}</h4>
                    {conflict.user_judgment && <Check size={14} className="text-[var(--success)]" />}
                  </div>
                  {/* Two sides */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-[11px] font-bold text-blue-600 mb-1">{conflict.side_a.source}</p>
                      <p className="text-[13px] text-[var(--text-primary)]">{conflict.side_a.position}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="text-[11px] font-bold text-purple-600 mb-1">{conflict.side_b.source}</p>
                      <p className="text-[13px] text-[var(--text-primary)]">{conflict.side_b.position}</p>
                    </div>
                  </div>
                  <p className="text-[12px] text-[var(--text-secondary)]">{conflict.analysis}</p>
                  {/* User judgment */}
                  <div className="border-t border-[var(--border)] pt-3 space-y-2">
                    <label className="text-[12px] font-bold text-amber-700">나의 판단</label>
                    <textarea
                      value={conflict.user_judgment || ''}
                      onChange={(e) => handleJudgment(conflict.id, e.target.value)}
                      placeholder="이 쟁점에 대한 당신의 판단을 입력하세요..."
                      className="w-full bg-[var(--checkpoint)] border border-amber-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-amber-400 resize-none"
                      rows={2}
                    />
                    <input
                      type="text"
                      value={conflict.user_reasoning || ''}
                      onChange={(e) => handleJudgmentReasoning(conflict.id, e.target.value)}
                      placeholder="판단 근거 (선택사항)"
                      className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Questions for user */}
          {current.analysis.questions_for_user.length > 0 && (
            <Card className="!bg-[var(--checkpoint)]">
              <h4 className="text-[13px] font-bold text-amber-700 mb-2">당신이 결정해야 할 질문</h4>
              <ul className="space-y-1">
                {current.analysis.questions_for_user.map((q, i) => (
                  <li key={i} className="text-[13px] text-amber-800">• {q}</li>
                ))}
              </ul>
            </Card>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-[13px] bg-red-50 rounded-lg px-3 py-2">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button variant="secondary" size="sm" onClick={() => { setCurrentId(null); setBulkInput(''); }}>
              <RotateCcw size={14} /> 새로 시작
            </Button>
            <div className="flex gap-2">
              <ShareBar getText={() => synthesizeToMarkdown(current)} getTitle={() => '조율 결과'} />
              <Button onClick={handleConfirm}>
                <Check size={14} /> 확정
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Done ─── */}
      {current?.status === 'done' && current.analysis && (
        <div className="space-y-4 animate-fade-in">
          <Card className="!border-[var(--success)] !border-2">
            <div className="flex items-center gap-2 text-[var(--success)] text-[13px] font-bold mb-3">
              <Check size={14} /> 조율 완료
            </div>
            <div className="space-y-3 text-[14px]">
              <div>
                <h4 className="font-bold mb-1">합의점</h4>
                {current.analysis.agreements.map((a, i) => <p key={i} className="text-[var(--text-secondary)]">✓ {a}</p>)}
              </div>
              <div>
                <h4 className="font-bold mb-1">쟁점별 판단</h4>
                {current.analysis.conflicts.filter((c) => c.user_judgment).map((c) => (
                  <div key={c.id} className="mb-2">
                    <p className="font-medium">{c.topic}</p>
                    <p className="text-[var(--text-secondary)]">{c.user_judgment}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          <div className="flex items-center justify-between">
            <Button variant="secondary" size="sm" onClick={() => { setCurrentId(null); setBulkInput(''); }}>
              <ArrowRight size={14} /> 새 합성
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const content = synthesizeToMarkdown(current!);
                  setHandoff({
                    from: 'synthesize',
                    fromItemId: current!.id,
                    content,
                    projectId: current!.project_id,
                  });
                  onNavigate('rehearse');
                }}
              >
                <Send size={14} /> 리허설 받기
              </Button>
              <ShareBar getText={() => synthesizeToMarkdown(current)} getTitle={() => '조율 결과'} />
            </div>
          </div>
{/* NextStepGuide removed — synthesize is a standalone utility, not part of the core flow */}
        </div>
      )}
    </div>
  );
}

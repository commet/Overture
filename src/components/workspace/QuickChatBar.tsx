'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageSquare, X, Check } from 'lucide-react';
import { callLLMJson } from '@/lib/llm';
import { useDecomposeStore } from '@/stores/useDecomposeStore';
import { useOrchestrateStore } from '@/stores/useOrchestrateStore';
import type { StepId } from '@/stores/useWorkspaceStore';

interface QuickChatBarProps {
  activeStep: StepId;
  onNavigate: (step: string) => void;
}

interface ChatAction {
  action: string;
  params: Record<string, unknown>;
  message: string;
}

const SYSTEM_PROMPT = `당신은 Overture 워크스페이스의 어시스턴트입니다. 사용자가 자연어로 요청하면 적절한 액션을 JSON으로 응답하세요.

현재 단계: {step}

사용 가능한 액션:
- navigate: 다른 단계로 이동. params: { step: "decompose" | "orchestrate" | "persona-feedback" }
- update_actor: 편곡에서 특정 스텝의 담당자 변경. params: { stepIndex: number, actor: "ai" | "human" | "both" }
- add_step: 편곡에 새 단계 추가. params: { task: string }
- remove_step: 편곡에서 단계 제거. params: { stepIndex: number }
- select_question: 악보 해석에서 질문 선택. params: { questionIndex: number }
- confirm: 현재 단계 확정. params: {}
- reanalyze: 현재 단계 재분석. params: {}
- message: 단순 응답 (액션 없음). params: {}

반드시 JSON만 응답하세요:
{ "action": "...", "params": {...}, "message": "사용자에게 보여줄 확인 메시지" }`;

export function QuickChatBar({ activeStep, onNavigate }: QuickChatBarProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const orchestrateStore = useOrchestrateStore();
  const decomposeStore = useDecomposeStore();

  // Clear feedback after 3s
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const executeAction = (action: ChatAction) => {
    switch (action.action) {
      case 'navigate':
        onNavigate(action.params.step as string);
        break;

      case 'update_actor': {
        const currentId = orchestrateStore.currentId;
        if (currentId) {
          orchestrateStore.updateStep(currentId, action.params.stepIndex as number, {
            actor: action.params.actor as 'ai' | 'human' | 'both',
          });
        }
        break;
      }

      case 'add_step': {
        const currentId = orchestrateStore.currentId;
        if (currentId) {
          orchestrateStore.addStep(currentId);
          const items = orchestrateStore.items;
          const item = items.find(i => i.id === currentId);
          if (item) {
            const lastIdx = item.steps.length; // new step is at end
            orchestrateStore.updateStep(currentId, lastIdx, {
              task: action.params.task as string,
            });
          }
        }
        break;
      }

      case 'remove_step': {
        const currentId = orchestrateStore.currentId;
        if (currentId) {
          orchestrateStore.removeStep(currentId, action.params.stepIndex as number);
        }
        break;
      }

      case 'confirm': {
        // This would need to call the appropriate store's confirm action
        // For now just show the message
        break;
      }

      case 'reanalyze': {
        // Would trigger reanalysis — complex, just show message for now
        break;
      }

      case 'message':
      default:
        break;
    }

    setFeedback({ message: action.message, type: action.action === 'message' ? 'info' : 'success' });
  };

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;

    // Quick local commands first (no LLM needed)
    const lowerInput = input.trim().toLowerCase();
    if (lowerInput === '다음' || lowerInput === '다음 단계' || lowerInput === '다음 단계로') {
      const stepOrder: StepId[] = ['decompose', 'orchestrate', 'persona-feedback'];
      const currentIdx = stepOrder.indexOf(activeStep);
      if (currentIdx >= 0 && currentIdx < stepOrder.length - 1) {
        onNavigate(stepOrder[currentIdx + 1]);
        setFeedback({ message: `${stepOrder[currentIdx + 1]} 단계로 이동했습니다.`, type: 'success' });
        setInput('');
        return;
      }
    }

    setLoading(true);
    try {
      const systemPrompt = SYSTEM_PROMPT.replace('{step}', activeStep);
      const result = await callLLMJson<ChatAction>(
        [{ role: 'user', content: input }],
        { system: systemPrompt, maxTokens: 500 }
      );
      executeAction(result);
    } catch {
      setFeedback({ message: '요청을 처리하지 못했습니다.', type: 'info' });
    } finally {
      setLoading(false);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Collapsed state — just a small button
  if (!isOpen) {
    return (
      <div className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-2">
        <button
          onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 100); }}
          className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)] hover:text-[var(--accent)] cursor-pointer transition-colors"
        >
          <MessageSquare size={14} />
          자연어로 수정 요청...
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-[var(--border)] bg-[var(--surface)]">
      {/* Feedback toast */}
      {feedback && (
        <div className={`px-4 py-2 text-[12px] font-medium animate-fade-in ${
          feedback.type === 'success' ? 'bg-[var(--collab)] text-[var(--success)]' : 'bg-[var(--ai)] text-[#2d4a7c]'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <Check size={12} /> : <MessageSquare size={12} />}
            {feedback.message}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeStep === 'orchestrate' ? '"Step 3을 사람으로 바꿔줘" 또는 "리뷰 단계 추가해줘"' :
              activeStep === 'decompose' ? '"2번 질문을 선택해줘" 또는 "다음 단계로"' :
              '"다음 단계로" 또는 수정 요청...'
            }
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-secondary)]"
            disabled={loading}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || loading}
          className="p-2 rounded-lg bg-[var(--accent)] text-white disabled:opacity-40 cursor-pointer hover:bg-[var(--accent-light)] transition-colors shrink-0"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
        <button
          onClick={() => setIsOpen(false)}
          className="p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg)] cursor-pointer transition-colors shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

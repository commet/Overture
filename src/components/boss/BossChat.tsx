'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, RotateCcw, Bookmark, Check } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { useBossStore } from '@/stores/useBossStore';
import { callLLMStream } from '@/lib/llm';
import { buildBossSystemPrompt, buildBossSystemPromptFromAgent, buildFirstMessageContext, buildFollowUpContext } from '@/lib/boss/boss-prompt';
import { useAgentStore } from '@/stores/useAgentStore';
import { AnimatedPlaceholder } from '@/components/ui/AnimatedPlaceholder';
import { getPersonalityType as getType } from '@/lib/boss/personality-types';
import { getYearElement } from '@/lib/boss/saju-interpreter';

const FOLLOW_UP_EXAMPLES = [
  '그래도 저는 할 말은 해야겠는데요',
  '진짜요? 다른 팀은 안 그러던데',
  '그건 좀 아닌 것 같은데...',
  '알겠습니다... 근데 한 가지만 더요',
  '솔직히 말해도 되는 겁니까',
  '그 말씀은 좀 너무하신 것 같은데요',
];

export function BossChat() {
  const {
    axes, gender, birthYear, sajuProfile,
    messages, isStreaming, streamingText,
    setStreaming, updateStreamingText, commitAssistantMessage,
    addUserMessage, getPersonalityType, reset,
    loadedAgentId, saveAsAgent,
  } = useBossStore();

  const [input, setInput] = useState('');
  const [saved, setSaved] = useState(!!useBossStore.getState().loadedAgentId);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasTriggeredFirst = useRef(false);

  const typeData = getPersonalityType();
  const typeCode = `${axes.ei}${axes.sn}${axes.tf}${axes.jp}`;
  const elementInfo = getYearElement(birthYear);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  useEffect(() => {
    if (messages.length === 1 && messages[0].role === 'user' && !hasTriggeredFirst.current) {
      hasTriggeredFirst.current = true;
      sendToLLM(messages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const sendToLLM = useCallback(async (chatMessages: typeof messages, retry = 0) => {
    if (!typeData) return;

    const isFirst = chatMessages.length === 1;
    const contextSuffix = isFirst ? buildFirstMessageContext() : buildFollowUpContext();

    // Agent에서 로드된 boss면 agent 프롬프트 사용 (Lv.2+ observation 주입)
    const agent = loadedAgentId ? useAgentStore.getState().getAgent(loadedAgentId) : undefined;
    const system = (agent?.personality_profile
      ? buildBossSystemPromptFromAgent(agent)
      : buildBossSystemPrompt({ type: typeData, saju: sajuProfile, gender })
    ) + contextSuffix;
    const llmMessages = chatMessages.map((m) => ({ role: m.role, content: m.content }));

    abortRef.current = new AbortController();
    setStreaming(true);

    await callLLMStream(
      llmMessages,
      { system, maxTokens: 300, signal: abortRef.current.signal },
      {
        onToken: (text) => updateStreamingText(text),
        onComplete: () => commitAssistantMessage(),
        onError: async (err) => {
          const msg = err instanceof Error ? err.message : String(err);
          const isOverloaded = msg.includes('과부하') || msg.includes('503') || msg.includes('529') || msg.includes('서버');
          if (isOverloaded && retry < 2) {
            console.warn(`[boss] 서버 과부하, ${retry + 1}회 재시도...`);
            updateStreamingText('잠시만...');
            await new Promise((r) => setTimeout(r, 2000 * (retry + 1)));
            sendToLLM(chatMessages, retry + 1);
            return;
          }

          console.error('[boss] LLM error:', msg);
          if (msg.includes('LOGIN_REQUIRED') || msg.includes('로그인')) {
            updateStreamingText('로그인이 필요해요. 무료 체험 횟수를 다 썼을 수 있어요.');
          } else if (msg.includes('사용량') || msg.includes('429') || msg.includes('한도')) {
            updateStreamingText('오늘 사용량을 다 썼어요. 설정에서 API 키를 입력하면 계속 쓸 수 있어요.');
          } else {
            updateStreamingText('연결 오류가 발생했어요. 잠시 후 다시 시도해주세요.');
          }
          commitAssistantMessage();
        },
      },
    );
  }, [typeData, sajuProfile, gender, setStreaming, updateStreamingText, commitAssistantMessage]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    addUserMessage(text);
    const updated = [...messages, { id: `u-${Date.now()}`, role: 'user' as const, content: text, timestamp: Date.now() }];
    sendToLLM(updated);
  }, [input, isStreaming, addUserMessage, messages, sendToLLM]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleReset = () => {
    if (abortRef.current) abortRef.current.abort();
    reset();
  };

  return (
    <motion.div
      className="bc"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      {/* Header — boss identity card */}
      <div className="bc-header">
        <div className="bc-profile-strip">
          <div className="bc-avatar-ring" style={elementInfo ? { borderColor: elementInfo.color, boxShadow: `0 0 12px ${elementInfo.glow}` } : {}}>
            <span className="bc-avatar-em">{typeData?.emoji || '👔'}</span>
          </div>
          <div className="bc-identity">
            <div className="bc-name-row">
              <strong className="bc-name">{typeCode}</strong>
              <span className="bc-type-name">{typeData?.name}</span>
            </div>
            <span className="bc-vibe">{typeData?.bossVibe}</span>
            {elementInfo && (
              <span className="bc-element" style={{ color: elementInfo.color }}>
                {elementInfo.emoji} {elementInfo.stem}{elementInfo.element} · {elementInfo.nature}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* 저장 버튼 — 첫 대화 후, 아직 저장 안 했을 때 */}
          {messages.length >= 2 && !saved && !loadedAgentId && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bc-reset"
              title="이 팀장 저장하기"
              onClick={() => {
                const id = saveAsAgent();
                if (id) setSaved(true);
              }}
              style={{ color: 'var(--accent)' }}
            >
              <Bookmark size={14} />
            </motion.button>
          )}
          {saved && (
            <span style={{ fontSize: 10, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Check size={10} /> 저장됨
            </span>
          )}
          <button type="button" onClick={handleReset} className="bc-reset" title="다시">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="bc-messages">
        <AnimatePresence>
          {messages.map((msg) => (
            <ChatMessage key={msg.id} role={msg.role} content={msg.content} bossType={typeData} />
          ))}
        </AnimatePresence>
        {isStreaming && streamingText && (
          <ChatMessage role="assistant" content={streamingText} isStreaming bossType={typeData} />
        )}
        {isStreaming && !streamingText && (
          <motion.div
            className="bm bm-boss"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bm-avatar">
              <span className="bm-avatar-emoji">{typeData?.emoji || '👔'}</span>
            </div>
            <div className="bm-bubble bm-bubble-boss">
              <div className="bm-typing">
                <span /><span /><span />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="bc-input-bar">
        <div className="bc-input-wrap">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bc-textarea"
            rows={1}
            maxLength={500}
            disabled={isStreaming}
          />
          <AnimatedPlaceholder
            texts={FOLLOW_UP_EXAMPLES}
            visible={!input && !isStreaming}
            interval={3500}
            className="bc-placeholder"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="bc-send"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

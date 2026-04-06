'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, RotateCcw, Bookmark, Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { ChatMessage } from './ChatMessage';
import { useBossStore } from '@/stores/useBossStore';
import { callLLMStream } from '@/lib/llm';
import { buildBossSystemPrompt, buildBossSystemPromptFromAgent, buildFirstMessageContext, buildFollowUpContext } from '@/lib/boss/boss-prompt';
import { useAgentStore } from '@/stores/useAgentStore';
import { applyBossCalibration, applyExplicitCalibration } from '@/lib/observation-engine';
import { AnimatedPlaceholder } from '@/components/ui/AnimatedPlaceholder';
import { getPersonalityType as getType } from '@/lib/boss/personality-types';
import { getYearElement } from '@/lib/boss/saju-interpreter';

// 업무/의사결정 관련 대화인지 감지 (키워드 3개 이상 매칭 시 true)
const WORK_SIGNALS = [
  '기획', '보고', '제안', '예산', '일정', '프로젝트', '전략', '실행',
  '검토', '승인', '피드백', '수정', '방향', '목표', '성과', '발표',
  '회의', '결정', '판단', '계획', '분석', '데이터', '숫자', '시장',
  '고객', '매출', '비용', '투자', '경쟁', '리스크', '문서', '슬라이드',
  '부족', '다시 해', '이 부분', '보완', '개선', '준비', '마감',
];

function isWorkRelated(messages: Array<{ role: string; content: string }>): boolean {
  const allText = messages.map(m => m.content).join(' ').toLowerCase();
  const hits = WORK_SIGNALS.filter(kw => allText.includes(kw));
  return hits.length >= 3;
}

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
    axes, gender, birthYear, sajuProfile, yearMonthProfile,
    messages, isStreaming, streamingText,
    setStreaming, updateStreamingText, commitAssistantMessage,
    addUserMessage, getPersonalityType, reset,
    loadedAgentId, saveAsAgent,
  } = useBossStore();

  const [input, setInput] = useState('');
  const [saved, setSaved] = useState(!!useBossStore.getState().loadedAgentId);
  const [ctaDismissed, setCtaDismissed] = useState(false);
  const [bossState, setBossState] = useState<'idle' | 'reading' | 'typing'>('idle');
  const [calibrationStep, setCalibrationStep] = useState<'none' | 'similarity' | 'detail' | 'done'>('none');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasTriggeredFirst = useRef(false);

  const typeData = getPersonalityType();
  const typeCode = `${axes.ei}${axes.sn}${axes.tf}${axes.jp}`;
  const elementInfo = getYearElement(birthYear);
  const ymp = yearMonthProfile;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // 컴포넌트 언마운트 시 패시브 교정 자동 적용
  useEffect(() => {
    return () => {
      const { loadedAgentId: agentId, messages: msgs } = useBossStore.getState();
      if (agentId && msgs.length >= 4) {
        applyBossCalibration(agentId, msgs);
      }
    };
  }, []);

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
      : buildBossSystemPrompt({ type: typeData, saju: sajuProfile, yearMonth: yearMonthProfile, gender })
    ) + contextSuffix;
    const llmMessages = chatMessages.map((m) => ({ role: m.role, content: m.content }));

    abortRef.current = new AbortController();

    // "읽는 중" → 짧은 딜레이 → "타이핑"
    setBossState('reading');
    setStreaming(true);
    await new Promise(r => setTimeout(r, 800 + Math.random() * 700));
    if (abortRef.current?.signal.aborted) return;
    setBossState('typing');

    await callLLMStream(
      llmMessages,
      { system, maxTokens: 500, signal: abortRef.current.signal },
      {
        onToken: (text) => updateStreamingText(text),
        onComplete: () => { commitAssistantMessage(); setBossState('idle'); },
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
          setBossState('idle');
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
            {ymp && (
              <span className="bc-element" style={{ color: ymp.yearElement.color }}>
                {ymp.animal.emoji} {ymp.animal.animal}띠
                {ymp.zodiacSign ? ` · ${ymp.zodiacSign.emoji} ${ymp.zodiacSign.sign}` : ''}
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
                if (id) {
                  setSaved(true);
                  // 패시브 교정 즉시 적용
                  applyBossCalibration(id, messages);
                  // 캘리브레이션 플로우 시작
                  setCalibrationStep('similarity');
                }
              }}
              style={{ color: 'var(--accent)' }}
            >
              <Bookmark size={14} />
            </motion.button>
          )}
          {saved && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Check size={10} /> 저장됨
              </span>
              <Link
                href={`/workspace?reviewer=${loadedAgentId || ''}`}
                style={{ fontSize: 10, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
                title="이 팀장이 리뷰어로 활용됩니다"
              >
                기획안 만들기 →
              </Link>
            </div>
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
              {bossState === 'reading' ? (
                <motion.span
                  className="bm-reading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  읽는 중...
                </motion.span>
              ) : (
                <div className="bm-typing">
                  <span /><span /><span />
                </div>
              )}
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* 스마트 전환 CTA — 업무/의사결정 대화 감지 시만 */}
      {!ctaDismissed && !saved && !isStreaming
        && messages.filter(m => m.role === 'assistant').length >= 2
        && isWorkRelated(messages) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          style={{
            margin: '0 16px 8px',
            padding: '12px 16px',
            borderRadius: 14,
            background: 'rgba(184,150,62,0.04)',
            border: '1px solid rgba(184,150,62,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}
        >
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            이 피드백을 반영한 기획안을 만들어볼 수 있어요
          </p>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            <Link
              href={`/workspace?reviewer=${loadedAgentId || ''}`}
              onClick={(e) => {
                if (!loadedAgentId) {
                  const id = saveAsAgent();
                  if (id) {
                    // 저장 후 URL에 ID 반영
                    e.preventDefault();
                    window.location.href = `/workspace?reviewer=${id}`;
                  }
                }
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '5px 12px', borderRadius: 99,
                background: 'var(--gradient-gold)', color: 'white',
                fontSize: 11, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
              }}
            >
              시작 <ArrowRight size={10} />
            </Link>
            <button
              onClick={() => setCtaDismissed(true)}
              style={{ fontSize: 10, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}

      {/* 저장 후 캘리브레이션 */}
      <AnimatePresence>
        {calibrationStep === 'similarity' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="bc-calibration"
          >
            <p className="bc-cal-q">실제 팀장이랑 얼마나 비슷해?</p>
            <div className="bc-cal-options">
              <button onClick={() => setCalibrationStep('detail')} className="bc-cal-btn">😐 좀 다름</button>
              <button onClick={() => {
                // "꽤 비슷" = 패시브 교정만 유지, 추가 교정 불필요
                if (loadedAgentId) {
                  const agent = useAgentStore.getState().getAgent(loadedAgentId);
                  const tonObs = agent?.observations.find(o => o.observation.includes('톤이 잘 맞'));
                  if (tonObs) useAgentStore.getState().reinforceObservation(loadedAgentId, tonObs.id);
                }
                setCalibrationStep('done');
              }} className="bc-cal-btn bc-cal-btn-active">🤔 꽤 비슷</button>
              <button onClick={() => {
                // "소름" = 현재 프로필 강하게 reinforce
                if (loadedAgentId) {
                  const agent = useAgentStore.getState().getAgent(loadedAgentId);
                  agent?.observations.forEach(o => {
                    if (o.category === 'communication_style' && o.observation.includes('잘 맞')) {
                      useAgentStore.getState().reinforceObservation(loadedAgentId!, o.id);
                    }
                  });
                }
                setCalibrationStep('done');
              }} className="bc-cal-btn bc-cal-btn-active">😮 소름</button>
            </div>
          </motion.div>
        )}
        {calibrationStep === 'detail' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="bc-calibration"
          >
            <p className="bc-cal-q">어떤 점이 달라?</p>
            <div className="bc-cal-options">
              <button
                onClick={() => { if (loadedAgentId) applyExplicitCalibration(loadedAgentId, 'more_direct'); setCalibrationStep('done'); }}
                className="bc-cal-btn"
              >실제로 더 직설적</button>
              <button
                onClick={() => { if (loadedAgentId) applyExplicitCalibration(loadedAgentId, 'more_soft'); setCalibrationStep('done'); }}
                className="bc-cal-btn"
              >실제로 더 부드러움</button>
              <button
                onClick={() => { if (loadedAgentId) applyExplicitCalibration(loadedAgentId, 'different_tone'); setCalibrationStep('done'); }}
                className="bc-cal-btn"
              >말투가 좀 다름</button>
            </div>
          </motion.div>
        )}
        {calibrationStep === 'done' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="bc-calibration"
            onAnimationComplete={() => setTimeout(() => setCalibrationStep('none'), 2000)}
          >
            <p style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'center' }}>
              ✓ 반영됨 — 다음 대화부터 적용돼요
            </p>
          </motion.div>
        )}
      </AnimatePresence>

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
            disabled={isStreaming || calibrationStep !== 'none'}
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
            disabled={!input.trim() || isStreaming || calibrationStep !== 'none'}
            className="bc-send"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, RotateCcw, Bookmark, Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { ChatMessage } from './ChatMessage';
import { useBossStore } from '@/stores/useBossStore';
import { callLLMStream } from '@/lib/llm';
import { buildBossSystemPrompt, buildBossSystemPromptFromAgent, buildFirstMessageContext, buildFollowUpContext, type BossMood } from '@/lib/boss/boss-prompt';
import { useAgentStore } from '@/stores/useAgentStore';
import { applyBossCalibration, applyExplicitCalibration } from '@/lib/observation-engine';
import { AnimatedPlaceholder } from '@/components/ui/AnimatedPlaceholder';
import { getPersonalityType as getType } from '@/lib/boss/personality-types';
import { getYearElement } from '@/lib/boss/saju-interpreter';

// ─── 대화 온도 추적 ───

type Reaction = 'strong' | 'weak' | 'emotional' | 'passive' | 'neutral';

// 근거/논리가 있는 발언
const STRONG_SIGNALS = [
  '데이터', '숫자', '근거', '조사', '사례', '계획', '대안', '비교', '분석', '수치',
  '기한', '마감', '성과', '매출', '실적', '제안', '경쟁사', '오퍼', '시장',
  '왜냐하면', '이유는', '기준', '원칙', '합리', '논리', '따지면',
  '준비', '확인', '검토', '일하고 싶', '기여', '책임',
];
// 감정적 발언 (캐주얼/감정 공존)
const EMOTIONAL_SIGNALS = ['힘들', '지쳐', '불안', '걱정', '화나', '답답', '솔직히', '속상'];
// 수동적/짧은 수용
const PASSIVE_SIGNALS = ['네', '알겠', '그렇죠', 'ㅇㅇ', '넵', '네네', '그럴게'];

function classifyReaction(text: string): Reaction {
  const t = text.toLowerCase().trim();
  const len = t.length;

  // 극히 짧은 답변(10자 이하) = 수동적
  if (len <= 10 && PASSIVE_SIGNALS.some(kw => t.includes(kw))) return 'passive';

  // 감정적 발언
  const emotionalHits = EMOTIONAL_SIGNALS.filter(kw => t.includes(kw)).length;
  if (emotionalHits >= 2 || (emotionalHits >= 1 && len < 30)) return 'emotional';

  // 근거/논리
  const strongHits = STRONG_SIGNALS.filter(kw => t.includes(kw)).length;
  if (strongHits >= 2) return 'strong';
  // 긴 답변(50자+)은 노력의 신호 — strong 1개만 있어도 인정
  if (strongHits >= 1 && len >= 50) return 'strong';
  // 긴 답변 자체가 설득 노력 (키워드 없어도)
  if (len >= 80) return 'strong';

  // 짧고 키워드 없음 = neutral (캐주얼 대화 포함)
  return 'neutral';
}

function updateMood(current: BossMood, reaction: Reaction, round: number): BossMood {
  if (current === 'convinced' || current === 'rejected') return current;

  // 강한 논거 → warming
  if (reaction === 'strong') {
    if (current === 'cooling') return 'neutral';
    return 'warming';
  }

  // 감정적 → 약간 warming (진심이 보이므로)
  if (reaction === 'emotional') {
    if (current === 'cooling') return 'neutral';
    // 이미 warming이면 유지, neutral이면 약간 warming
    return current === 'neutral' ? 'warming' : current;
  }

  // 수동적 → 약간 cooling (대화에 참여 안 함)
  if (reaction === 'passive') {
    if (current === 'warming') return 'neutral';
    return 'cooling';
  }

  // neutral → 변화 없음 (캐주얼 대화 시 과잉 반응 방지)

  // 7라운드 이상이면 결론으로
  if (round >= 7) {
    if (current === 'warming') return 'convinced';
    if (current === 'cooling') return 'rejected';
    // neutral 상태로 7라운드 = 대화가 진전 없음 → conditional
    return 'convinced'; // boss가 "일단 해봐" 스타일로 마무리
  }

  return current;
}

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
  const [bossMood, setBossMood] = useState<BossMood>('neutral');
  const [verdict, setVerdict] = useState<{ verdict: string; reason: string; tip?: string } | null>(null);
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
    const round = Math.floor(chatMessages.filter(m => m.role === 'user').length);

    // mood를 동기적으로 계산 (setState 비동기 문제 해결)
    let currentMood = bossMood;
    const lastUserMsg = [...chatMessages].reverse().find(m => m.role === 'user');
    if (lastUserMsg && !isFirst) {
      const reaction = classifyReaction(lastUserMsg.content);
      currentMood = updateMood(currentMood, reaction, round);
      setBossMood(currentMood); // UI 반영용 (프롬프트에는 이미 currentMood 사용)
    }

    const contextSuffix = isFirst
      ? buildFirstMessageContext()
      : buildFollowUpContext(round, currentMood);

    // Agent에서 로드된 boss면 agent 프롬프트 사용 (Lv.2+ observation 주입)
    const agent = loadedAgentId ? useAgentStore.getState().getAgent(loadedAgentId) : undefined;
    const system = (agent?.personality_profile
      ? buildBossSystemPromptFromAgent(agent)
      : buildBossSystemPrompt({ type: typeData, saju: sajuProfile, yearMonth: yearMonthProfile, gender })
    ) + contextSuffix;
    const llmMessages = chatMessages.map((m) => ({ role: m.role, content: m.content }));

    abortRef.current = new AbortController();

    // "읽는 중" → 짧은 딜레이 → "타이핑" (첫 메시지는 빠르게)
    setBossState('reading');
    setStreaming(true);
    const readDelay = isFirst ? 400 : 500 + Math.random() * 500;
    await new Promise(r => setTimeout(r, readDelay));
    if (abortRef.current?.signal.aborted) return;
    setBossState('typing');

    await callLLMStream(
      llmMessages,
      { system, maxTokens: 500, signal: abortRef.current.signal },
      {
        onToken: (text) => updateStreamingText(text),
        onComplete: () => {
          // Verdict JSON 추출 (응답 끝에 있을 수 있음)
          const raw = useBossStore.getState().streamingText;
          const jsonMatch = raw.match(/\{[^{}]*"verdict"\s*:\s*"(approved|rejected|conditional)"[^{}]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              setVerdict({ verdict: parsed.verdict, reason: parsed.reason || '', tip: parsed.tip });
            } catch { /* JSON 파싱 실패 시 무시 */ }
            const clean = raw.replace(jsonMatch[0], '').trim();
            useBossStore.getState().updateStreamingText(clean);
          }
          commitAssistantMessage();
          setBossState('idle');
        },
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
          <div className="bc-avatar-ring" style={{
            borderColor: bossMood === 'warming' || bossMood === 'convinced' ? '#2d8a4e'
              : bossMood === 'cooling' || bossMood === 'rejected' ? '#dc3545'
              : elementInfo?.color || 'var(--border)',
            boxShadow: bossMood === 'warming' ? '0 0 12px rgba(45,138,78,0.3)'
              : bossMood === 'cooling' ? '0 0 12px rgba(220,53,69,0.2)'
              : elementInfo ? `0 0 12px ${elementInfo.glow}` : 'none',
            transition: 'border-color 0.6s, box-shadow 0.6s',
          }}>
            <span className="bc-avatar-em">{typeData?.emoji || '👔'}</span>
          </div>
          <div className="bc-identity">
            <div className="bc-name-row">
              <strong className="bc-name">{typeCode}</strong>
              <span className="bc-type-name">{typeData?.name}</span>
            </div>
            <span className="bc-vibe" style={{
              color: bossMood === 'warming' ? 'var(--success)' : bossMood === 'cooling' ? 'var(--danger)' : undefined,
              transition: 'color 0.6s',
            }}>
              {bossMood === 'warming' ? '관심을 보이고 있다...'
                : bossMood === 'cooling' ? '불만족스러워 보인다...'
                : bossMood === 'convinced' ? '납득한 표정이다'
                : bossMood === 'rejected' ? '안 된다는 표정이다'
                : typeData?.bossVibe}
            </span>
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
        {/* Verdict 카드 — boss가 결론을 내렸을 때 */}
        {verdict && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="bc-verdict"
            data-result={verdict.verdict}
          >
            <div className="bc-verdict-icon">
              {verdict.verdict === 'approved' ? '✅' : verdict.verdict === 'conditional' ? '🤔' : '❌'}
            </div>
            <div className="bc-verdict-body">
              <p className="bc-verdict-label">
                {verdict.verdict === 'approved' ? '승인' : verdict.verdict === 'conditional' ? '조건부 승인' : '반려'}
              </p>
              <p className="bc-verdict-reason">{verdict.reason}</p>
              {verdict.tip && (
                <p className="bc-verdict-tip">💡 {verdict.tip}</p>
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

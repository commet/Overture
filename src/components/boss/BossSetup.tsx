'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { TypeToggle } from './TypeToggle';
import { useBossStore } from '@/stores/useBossStore';
import { AnimatedPlaceholder } from '@/components/ui/AnimatedPlaceholder';
import { getPersonalityType } from '@/lib/boss/personality-types';
import { ArrowRight } from 'lucide-react';
import { SajuPreview } from './SajuPreview';

const EXAMPLE_SITUATIONS = [
  '연봉 협상을 하고 싶은데요',
  '이번에 제가 잘한 건지 솔직히 알고 싶습니다',
  '회의를 좀 줄일 수 있을까요?',
  '재택근무를 좀 더 하고 싶은데요',
  '이 아이디어 한번 제안해보려고요',
  '일정이 2주 정도 밀릴 것 같습니다',
  '솔직히 요즘 좀 지쳐있습니다',
  '제가 이번에 리드 한번 맡아봐도 될까요?',
  '오늘 칼퇴 좀 해도 될까요',
  '다른 팀은 재택하던데 저희도 가능할까요',
  '이번 인센티브 기준이 좀 궁금해서요',
  '그 피드백 좀 다시 얘기해볼 수 있을까요',
  '퇴사를 고민하고 있습니다',
  '프로젝트 방향을 좀 재검토해보면 어떨까요',
  '제 업무 범위가 좀 애매한 것 같아서요',
];

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export function BossSetup() {
  const { axes, gender, birthYear, birthMonth, setGender, setBirth, loadSaju, startChat, addUserMessage } = useBossStore();
  const [situation, setSituation] = useState('');
  const [isLaunching, setIsLaunching] = useState(false);

  const typeCode = `${axes.ei}${axes.sn}${axes.tf}${axes.jp}`;
  const typeData = getPersonalityType(typeCode);

  const handleSubmit = useCallback(async () => {
    if (!situation.trim() || isLaunching) return;
    setIsLaunching(true);
    loadSaju();
    addUserMessage(situation.trim());
    startChat();
  }, [situation, isLaunching, loadSaju, addUserMessage, startChat]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isReady = situation.trim().length > 0;

  return (
    <motion.div
      className="bs"
      variants={stagger}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.3 } }}
    >
      {/* ── Hero (compact) ── */}
      <motion.div className="bs-hero" variants={fadeUp}>
        <h1 className="bs-title">
          팀장한테 <span className="bs-title-accent">할 말 있어?</span>
        </h1>
        <p className="bs-sub">미리 시뮬레이션 해봐. 진짜 뭐라 하는지.</p>
      </motion.div>

      {/* ── MBTI selector ── */}
      <motion.div className="bs-type-section" variants={fadeUp}>
        <TypeToggle />

        {/* Personality — always visible card */}
        <AnimatePresence mode="wait">
          {typeData && (
            <motion.div
              key={typeCode}
              className="bs-persona-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="bs-persona-header">
                <span className="bs-persona-emoji">{typeData.emoji}</span>
                <div className="bs-persona-info">
                  <span className="bs-persona-name">{typeData.name}</span>
                  <span className="bs-persona-vibe">{typeData.bossVibe}</span>
                </div>
              </div>
              <div className="bs-persona-speech">&ldquo;{typeData.speechPatterns[0]}&rdquo;</div>
              <div className="bs-persona-traits">
                <span className="bs-persona-trait">{typeData.shortDesc}</span>
                <span className="bs-persona-trait bs-persona-trait--accent">🎯 {typeData.triggers.split(',')[0].trim()}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Gender + Birth (always visible) ── */}
      <motion.div className="bs-profile-section" variants={fadeUp}>
        <div className="bs-profile-bar">
          <div className="bs-profile-field">
            <label className="bs-profile-label">성별</label>
            <div className="bs-gender">
              {(['남', '여'] as const).map((g) => (
                <button key={g} type="button" onClick={() => setGender(g)} className="bs-gen-btn" data-active={gender === g}>
                  {g === '남' ? '남성' : '여성'}
                </button>
              ))}
            </div>
          </div>
          <div className="bs-profile-divider" />
          <div className="bs-profile-field">
            <label className="bs-profile-label">생년월 <span className="bs-optional">선택</span></label>
            <div className="bs-birth">
              <input type="number" placeholder="예: 1975" value={birthYear || ''} onChange={(e) => setBirth(Number(e.target.value), birthMonth)} className="bs-num bs-num-y" min={1940} max={2006} />
              <span className="bs-dot">·</span>
              <input type="number" placeholder="월" value={birthMonth || ''} onChange={(e) => setBirth(birthYear, Number(e.target.value))} className="bs-num bs-num-m" min={1} max={12} />
            </div>
          </div>
        </div>
        <SajuPreview year={birthYear} month={birthMonth} />
      </motion.div>

      {/* ── Input + CTA (one block, always visible) ── */}
      <motion.div className="bs-input-block" variants={fadeUp}>
        <div className="bs-input-wrap">
          <textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bs-textarea"
            rows={2}
            maxLength={500}
          />
          <AnimatedPlaceholder
            texts={EXAMPLE_SITUATIONS}
            visible={!situation}
            interval={2800}
            className="bs-placeholder"
          />
        </div>
        <div className="bs-cta-row">
          <p className="bs-fine">AI 시뮬레이션 · 실제와 다를 수 있음</p>
          <motion.button
            type="button"
            onClick={handleSubmit}
            disabled={!isReady || isLaunching}
            className="bs-cta"
            whileTap={isReady ? { scale: 0.97 } : {}}
          >
            {isLaunching ? (
              <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.2 }}>
                소환 중...
              </motion.span>
            ) : (
              <>
                팀장 반응 보기
                <ArrowRight size={16} strokeWidth={2.5} />
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

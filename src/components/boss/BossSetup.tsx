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
  hidden: { opacity: 0, y: 16 },
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

  // MBTI + 상황만 필수. 연/월은 선택.
  const isReady = situation.trim().length > 0;

  return (
    <motion.div
      className="bs"
      variants={stagger}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.3 } }}
    >
      {/* ── Hero ── */}
      <motion.div className="bs-hero" variants={fadeUp}>
        <h1 className="bs-title">
          팀장한테<br/>
          <span className="bs-title-accent">할 말 있어?</span>
        </h1>
        <p className="bs-sub">미리 시뮬레이션 해봐. 진짜 뭐라 하는지.</p>
      </motion.div>

      {/* ── Boss Profile (compact) ── */}
      <motion.div className="bs-profile" variants={fadeUp}>
        <div className="bs-profile-label">팀장은 어떤 사람이야?</div>

        {/* MBTI pills */}
        <TypeToggle />

        {/* Type badge */}
        <AnimatePresence mode="wait">
          {typeData && (
            <motion.div
              key={typeCode}
              className="bs-badge"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25 }}
            >
              <span className="bs-badge-emoji">{typeData.emoji}</span>
              <span className="bs-badge-code">{typeData.code}</span>
              <span className="bs-badge-name">{typeData.name}</span>
              <span className="bs-badge-sep">·</span>
              <span className="bs-badge-vibe">{typeData.bossVibe}</span>
              <p className="bs-badge-trigger">🎯 중요하게 보는 것: {typeData.triggers}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 선택 요소: 성별 + 연도(띠) + 월(별자리) */}
        <div className="bs-meta-row">
          <div className="bs-gender">
            {(['남', '여'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className="bs-gen-btn"
                data-active={gender === g}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="bs-birth">
            <input
              type="number"
              placeholder="연도"
              value={birthYear || ''}
              onChange={(e) => setBirth(Number(e.target.value), birthMonth)}
              className="bs-num bs-num-y"
              min={1940} max={2006}
            />
            <input
              type="number"
              placeholder="월"
              value={birthMonth || ''}
              onChange={(e) => setBirth(birthYear, Number(e.target.value))}
              className="bs-num bs-num-m"
              min={1} max={12}
            />
          </div>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.4 }}>연도와 월은 선택 — 넣으면 띠와 별자리가 반영돼요</p>

        {/* 띠 + 별자리 프리뷰 */}
        <SajuPreview year={birthYear} month={birthMonth} />
      </motion.div>

      {/* ── The Main Input ── */}
      <motion.div className="bs-input-area" variants={fadeUp}>
        <div className="bs-input-label">뭐라고 하고 싶어?</div>
        <div className="bs-input-wrap">
          <textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bs-textarea"
            rows={3}
            maxLength={500}
          />
          <AnimatedPlaceholder
            texts={EXAMPLE_SITUATIONS}
            visible={!situation}
            interval={2800}
            className="bs-placeholder"
          />
        </div>
      </motion.div>

      {/* ── CTA ── */}
      <motion.div className="bs-cta-area" variants={fadeUp}>
        <motion.button
          type="button"
          onClick={handleSubmit}
          disabled={!isReady || isLaunching}
          className="bs-cta"
          whileHover={isReady ? { scale: 1.01 } : {}}
          whileTap={isReady ? { scale: 0.98 } : {}}
        >
          {isLaunching ? (
            <motion.span
              className="bs-cta-loading"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            >
              팀장 소환 중...
            </motion.span>
          ) : (
            <>
              팀장 반응 보기
              <ArrowRight size={18} strokeWidth={2.5} />
            </>
          )}
        </motion.button>
        <p className="bs-fine">성격유형 기반 AI 시뮬레이션 · 실제와 다를 수 있음</p>
      </motion.div>
    </motion.div>
  );
}

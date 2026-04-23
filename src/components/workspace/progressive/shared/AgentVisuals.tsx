'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentAttentionStore } from '@/stores/useAgentAttentionStore';
import { getCurrentLanguage } from '@/lib/i18n';

// Rotating live activity per persona id — gives "alive" feel while working
const ACTIVITY_TICKERS_KO: Record<string, string[]> = {
  researcher: ['데이터 수집 중', '경쟁사 사례 분석', '리뷰 정리 중', '시장 신호 추출'],
  strategist: ['옵션 탐색 중', '구조 설계 중', '인력 배치 검토', '리스크 점검'],
  numbers: ['수치 검산 중', '비용 모델링', 'ROI 계산 중', '손익분기 추정'],
  critic: ['약점 탐색 중', '반론 정리', '실패 시나리오 검토', '가정 깨보는 중'],
  copywriter: ['핵심 문장 추출', '논리 흐름 구조화', '독자 관점 검토', '문장 다듬는 중'],
};

const ACTIVITY_TICKERS_EN: Record<string, string[]> = {
  researcher: ['Gathering data', 'Analyzing competitor cases', 'Organizing reviews', 'Extracting market signals'],
  strategist: ['Exploring options', 'Designing structure', 'Reviewing staffing', 'Checking risks'],
  numbers: ['Verifying numbers', 'Modeling costs', 'Calculating ROI', 'Estimating breakeven'],
  critic: ['Finding weak spots', 'Compiling counterarguments', 'Reviewing failure scenarios', 'Testing assumptions'],
  copywriter: ['Extracting key sentences', 'Structuring logic flow', 'Checking reader perspective', 'Polishing prose'],
};

export const ACTIVITY_TICKERS: Record<string, string[]> = ACTIVITY_TICKERS_KO; // back-compat

const GENERIC_TICKER_KO = ['생각 정리 중', '컨텍스트 읽는 중', '결과 작성 중', '핵심 추출 중'];
const GENERIC_TICKER_EN = ['Thinking', 'Reading context', 'Writing result', 'Extracting key points'];

export function tickersFor(personaId: string | undefined | null, fallback?: string): string[] {
  const tickers = getCurrentLanguage() === 'ko' ? ACTIVITY_TICKERS_KO : ACTIVITY_TICKERS_EN;
  const generic = getCurrentLanguage() === 'ko' ? GENERIC_TICKER_KO : GENERIC_TICKER_EN;
  if (personaId && tickers[personaId]) return tickers[personaId];
  if (fallback) return [fallback, ...generic];
  return generic;
}

export function TypingDots({ color }: { color?: string }) {
  return (
    <span className="inline-flex items-center gap-[2px]">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="w-[3px] h-[3px] rounded-full"
          style={{ backgroundColor: color || 'currentColor' }}
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}

export function AvatarRipple({ color }: { color: string }) {
  return (
    <>
      <motion.div
        className="absolute inset-[-4px] rounded-full border-2 pointer-events-none"
        style={{ borderColor: color }}
        animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
      />
      <motion.div
        className="absolute inset-[-4px] rounded-full border-2 pointer-events-none"
        style={{ borderColor: color }}
        animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', delay: 0.9 }}
      />
    </>
  );
}

export function ShimmerBar({ color }: { color: string }) {
  return (
    <div
      className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden pointer-events-none"
      style={{ backgroundColor: color + '15' }}
    >
      <motion.div
        className="h-full w-1/3"
        style={{ backgroundColor: color }}
        animate={{ x: ['-100%', '300%'] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

/**
 * useAttentionPulse — returns true for ~900ms after any `ping()` is fired.
 *
 * `enabled` lets callers opt out (e.g., idle agents shouldn't flash on chat pings).
 * - On first mount, records the current ping value and skips — a freshly-inserted
 *   row never auto-flashes.
 * - Only flashes when lastPingAt strictly changes. Effect re-runs triggered by
 *   `enabled` flipping (e.g., pending → running) do NOT re-trigger a flash.
 * - If a ping happens while `enabled` is false, we still advance the seen ref
 *   so a later enable doesn't retroactively flash.
 *
 * State updates are scheduled via setTimeout (not called synchronously in the
 * effect body) to avoid the react-hooks/set-state-in-effect lint rule.
 */
export function useAttentionPulse(enabled: boolean = true): boolean {
  const lastPingAt = useAgentAttentionStore(s => s.lastPingAt);
  const [pulsing, setPulsing] = useState(false);
  const lastSeenRef = useRef(lastPingAt);
  const mountedRef = useRef(false);

  useEffect(() => {
    // First effect run — record & skip so fresh rows don't auto-flash
    if (!mountedRef.current) {
      mountedRef.current = true;
      lastSeenRef.current = lastPingAt;
      return;
    }
    // Effect triggered by `enabled` change (no new ping) — ignore
    if (lastPingAt === lastSeenRef.current) return;
    // Advance seen marker regardless so past pings don't retroactively fire
    lastSeenRef.current = lastPingAt;
    if (!enabled) return;

    const start = setTimeout(() => setPulsing(true), 0);
    const stop = setTimeout(() => setPulsing(false), 900);
    return () => {
      clearTimeout(start);
      clearTimeout(stop);
    };
  }, [lastPingAt, enabled]);

  return pulsing;
}

/**
 * AttentionFlash — fullsize overlay that flashes the row gold for ~900ms when
 * an input ping arrives. Non-interactive. Designed to sit as a sibling inside
 * the row's `relative` container.
 */
export function AttentionFlash({ active, color }: { active: boolean; color?: string }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.4, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut', times: [0, 0.15, 0.4, 1] }}
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background: color
              ? `radial-gradient(circle at 20% 50%, ${color}38, transparent 70%)`
              : 'radial-gradient(circle at 20% 50%, var(--accent), transparent 70%)',
            mixBlendMode: 'plus-lighter',
          }}
        />
      )}
    </AnimatePresence>
  );
}

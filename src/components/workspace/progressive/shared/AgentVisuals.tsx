'use client';

import { motion } from 'framer-motion';

// Rotating live activity per persona id — gives "alive" feel while working
export const ACTIVITY_TICKERS: Record<string, string[]> = {
  researcher: ['데이터 수집 중', '경쟁사 사례 분석', '리뷰 정리 중', '시장 신호 추출'],
  strategist: ['옵션 탐색 중', '구조 설계 중', '인력 배치 검토', '리스크 점검'],
  numbers: ['수치 검산 중', '비용 모델링', 'ROI 계산 중', '손익분기 추정'],
  critic: ['약점 탐색 중', '반론 정리', '실패 시나리오 검토', '가정 깨보는 중'],
  copywriter: ['핵심 문장 추출', '논리 흐름 구조화', '독자 관점 검토', '문장 다듬는 중'],
};

const GENERIC_TICKER = ['생각 정리 중', '컨텍스트 읽는 중', '결과 작성 중', '핵심 추출 중'];

export function tickersFor(personaId: string | undefined | null, fallback?: string): string[] {
  if (personaId && ACTIVITY_TICKERS[personaId]) return ACTIVITY_TICKERS[personaId];
  if (fallback) return [fallback, ...GENERIC_TICKER];
  return GENERIC_TICKER;
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

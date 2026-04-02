'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { getYearElement } from '@/lib/boss/saju-interpreter';

interface SajuPreviewProps {
  year: number;
}

/**
 * 생년 입력 시 즉시 보여주는 오행/천간 프리뷰.
 * 연도 끝자리만으로 천간을 결정하므로 서버 호출 없이 즉시 표시.
 */
export function SajuPreview({ year }: SajuPreviewProps) {
  const info = getYearElement(year);

  return (
    <AnimatePresence mode="wait">
      {info && (
        <motion.div
          key={`${info.stem}-${year}`}
          className="saju-preview"
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Element glow dot */}
          <motion.div
            className="saju-dot"
            style={{ background: info.color, boxShadow: `0 0 12px ${info.glow}, 0 0 24px ${info.glow}` }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
          />

          <div className="saju-info">
            <span className="saju-stem" style={{ color: info.color }}>
              {info.stem}{info.element}
            </span>
            <span className="saju-nature">{info.emoji} {info.nature}</span>
            <span className="saju-sep">·</span>
            <span className="saju-trait">{info.trait}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

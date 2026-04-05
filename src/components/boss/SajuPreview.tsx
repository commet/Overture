'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { getYearElement, getZodiacAnimal, getZodiacSign } from '@/lib/boss/saju-interpreter';

interface SajuPreviewProps {
  year: number;
  month?: number;
}

/**
 * 연도 → 띠 + 오행, 월 → 별자리 프리뷰.
 * 입력 즉시 표시, 서버 호출 없음.
 */
export function SajuPreview({ year, month }: SajuPreviewProps) {
  const element = getYearElement(year);
  const animal = getZodiacAnimal(year);
  const sign = month ? getZodiacSign(month) : null;

  if (!element && !animal && !sign) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${year}-${month}`}
        className="saju-preview"
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.97 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* 띠 + 오행 */}
        {animal && element && (
          <>
            <motion.div
              className="saju-dot"
              style={{ background: element.color, boxShadow: `0 0 12px ${element.glow}, 0 0 24px ${element.glow}` }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            />
            <div className="saju-info">
              <span style={{ fontSize: 14 }}>{animal.emoji}</span>
              <span className="saju-stem" style={{ color: element.color }}>
                {animal.animal}띠
              </span>
              <span className="saju-nature">{element.emoji} {element.nature}</span>
              <span className="saju-sep">·</span>
              <span className="saju-trait">{animal.trait.split('.')[0]}</span>
            </div>
          </>
        )}

        {/* 별자리 */}
        {sign && (
          <div className="saju-info" style={{ marginTop: animal ? 6 : 0 }}>
            <span style={{ fontSize: 14 }}>{sign.emoji}</span>
            <span className="saju-stem" style={{ color: 'var(--text-secondary)' }}>
              {sign.sign}
            </span>
            <span className="saju-sep">·</span>
            <span className="saju-trait">{sign.trait.split('.')[0]}</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getYearElement, getZodiacAnimal, getZodiacSign } from '@/lib/boss/saju-interpreter';
import { getChineseZodiac, getWesternZodiac } from '@/lib/boss/zodiac';
import { useLocale } from '@/hooks/useLocale';

interface SajuPreviewProps {
  year: number;
  month?: number;
  day?: number;
}

/**
 * Birth-date preview.
 *
 * Korean locale: Saju-style element + Korean zodiac animal + month-based Korean sign.
 * English locale: Chinese zodiac (year) + Western zodiac (precise by month+day).
 *
 * Debounced 300ms; no server calls.
 */
export function SajuPreview({ year, month, day }: SajuPreviewProps) {
  const locale = useLocale();
  const [displayed, setDisplayed] = useState({ year: 0, month: 0, day: 0 });

  useEffect(() => {
    const timer = setTimeout(() => setDisplayed({ year, month: month || 0, day: day || 0 }), 300);
    return () => clearTimeout(timer);
  }, [year, month, day]);

  if (locale === 'ko') {
    const element = getYearElement(displayed.year);
    const animal = getZodiacAnimal(displayed.year);
    const sign = displayed.month ? getZodiacSign(displayed.month) : null;

    if (!element && !animal && !sign) return null;

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={`${displayed.year}-${displayed.month}`}
          className="saju-preview"
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
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

  // English locale — Chinese + Western zodiac
  const chinese = getChineseZodiac(displayed.year);
  const western = displayed.month ? getWesternZodiac(displayed.month, displayed.day || undefined) : null;

  if (!chinese && !western) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${displayed.year}-${displayed.month}-${displayed.day}`}
        className="saju-preview"
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.97 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        {chinese && (
          <div className="saju-info">
            <span style={{ fontSize: 14 }}>{chinese.emoji}</span>
            <span className="saju-stem" style={{ color: 'var(--accent)' }}>
              {chinese.labelEn}
            </span>
            <span className="saju-sep">·</span>
            <span className="saju-trait">{chinese.traitEn.split('.')[0]}</span>
          </div>
        )}
        {western && (
          <div className="saju-info" style={{ marginTop: chinese ? 6 : 0 }}>
            <span style={{ fontSize: 14 }}>{western.emoji}</span>
            <span className="saju-stem" style={{ color: 'var(--text-secondary)' }}>
              {western.labelEn}
            </span>
            <span className="saju-sep">·</span>
            <span className="saju-trait">{western.traitEn.split('.')[0]}</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

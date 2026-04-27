// ━━━ "결" — natural-metaphor one-liner for Boss persona
//
// Translates the saju year-stem element into a plain Korean image (소나무 / 큰 강 / 태양)
// and pairs it with a short trait. Avoids 사주 terminology entirely so users who do
// not know — or actively dislike — Saju still get a vivid persona summary.
//
// English uses Chinese zodiac (year animal) as the anchor for the same sentence shape.

import { getYearElement } from './saju-interpreter';
import { getChineseZodiac } from './zodiac';

export interface KyeolLine {
  /** A short metaphor anchor — '곧은 소나무' (KO) / 'Tiger' (EN). */
  anchor: string;
  /** A one-line trait phrase that follows the metaphor. */
  trait: string;
  /** Composed line ready for direct display. */
  line: string;
}

/**
 * Compose the "결" / "innate read" one-liner for display in the Boss
 * confirmation card and verdict-share card.
 *
 * Korean: '곧은 소나무 같은 결 — 정직하지만 한 번 정한 길은 잘 안 굽혀요'
 * English: 'A tiger-like read — bold and direct, sometimes too quick to commit'
 *
 * Returns null if year is out of supported range.
 */
export function composeKyeol(year: number, locale: 'ko' | 'en'): KyeolLine | null {
  if (locale === 'en') {
    const cz = getChineseZodiac(year);
    if (!cz) return null;
    // labelEn already includes the animal noun (e.g. 'Tiger'). Lowercased for "a tiger-like" phrasing.
    const anchor = cz.labelEn;
    const trait = cz.traitEn.replace(/\.$/, '');
    return {
      anchor,
      trait,
      line: `A ${anchor.toLowerCase()}-like read — ${trait}`,
    };
  }

  const el = getYearElement(year);
  if (!el) return null;
  return {
    anchor: el.nature,
    trait: el.trait,
    line: `${el.nature} 같은 결 — ${el.trait}`,
  };
}

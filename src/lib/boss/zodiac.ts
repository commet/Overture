// ━━━ Zodiac interpreter — Western + Chinese zodiac
//
// Used as the globalized alternative to saju-interpreter for English users.
// Korean users still see saju (year pillar + day master). English users see
// Western zodiac (precise by birth date) + Chinese zodiac (by birth year).
//
// Both data sets carry bilingual labels + traits so consumers can pick by locale.

// ─── Western zodiac ───

export type WesternZodiacSign =
  | 'aries' | 'taurus' | 'gemini' | 'cancer'
  | 'leo' | 'virgo' | 'libra' | 'scorpio'
  | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

export type ZodiacElement = 'fire' | 'earth' | 'air' | 'water';

export interface WesternZodiacInfo {
  sign: WesternZodiacSign;
  labelKo: string;
  labelEn: string;
  emoji: string;
  element: ZodiacElement;
  traitKo: string;
  traitEn: string;
}

const WESTERN_ZODIAC: WesternZodiacInfo[] = [
  {
    sign: 'aries', labelKo: '양자리', labelEn: 'Aries', emoji: '♈', element: 'fire',
    traitKo: '추진력 강하고 즉흥적. 빠른 결정, 긴 회의 싫어함',
    traitEn: 'Fast-moving, decisive. Prefers quick decisions; hates long meetings.',
  },
  {
    sign: 'taurus', labelKo: '황소자리', labelEn: 'Taurus', emoji: '♉', element: 'earth',
    traitKo: '안정 지향, 실용주의. 검증된 방법 선호, 급한 변화 거부',
    traitEn: 'Stability-focused, pragmatic. Favors proven methods; resists abrupt change.',
  },
  {
    sign: 'gemini', labelKo: '쌍둥이자리', labelEn: 'Gemini', emoji: '♊', element: 'air',
    traitKo: '다재다능, 대화 좋아함. 아이디어 많지만 산만할 수 있음',
    traitEn: 'Versatile communicator. Full of ideas but can be scattered.',
  },
  {
    sign: 'cancer', labelKo: '게자리', labelEn: 'Cancer', emoji: '♋', element: 'water',
    traitKo: '팀 보호 본능, 감정 세심. 충성도 높지만 서운하면 오래감',
    traitEn: 'Team-protective, emotionally attuned. Highly loyal but slow to forgive slights.',
  },
  {
    sign: 'leo', labelKo: '사자자리', labelEn: 'Leo', emoji: '♌', element: 'fire',
    traitKo: '무대 체질, 인정욕 강함. 칭찬에 약하고 무시에 불같음',
    traitEn: 'Stage presence, craves recognition. Melts under praise, erupts when ignored.',
  },
  {
    sign: 'virgo', labelKo: '처녀자리', labelEn: 'Virgo', emoji: '♍', element: 'earth',
    traitKo: '완벽주의, 분석적. 디테일 귀신이지만 칭찬에 인색',
    traitEn: 'Analytical perfectionist. Detail-obsessed, stingy with praise.',
  },
  {
    sign: 'libra', labelKo: '천칭자리', labelEn: 'Libra', emoji: '♎', element: 'air',
    traitKo: '균형 추구, 공정함 중시. 갈등 싫어하고 합의 선호',
    traitEn: 'Balance-seeking, fairness-focused. Avoids conflict, prefers consensus.',
  },
  {
    sign: 'scorpio', labelKo: '전갈자리', labelEn: 'Scorpio', emoji: '♏', element: 'water',
    traitKo: '통찰력 날카롭고 깊음. 신뢰하면 전폭 지원, 아니면 냉정',
    traitEn: 'Sharp, deep insight. Full backing once trusted; cold if not.',
  },
  {
    sign: 'sagittarius', labelKo: '사수자리', labelEn: 'Sagittarius', emoji: '♐', element: 'fire',
    traitKo: '낙관적 비전가, 자유로움. 큰 방향은 잘 잡지만 관리 싫어함',
    traitEn: 'Optimistic visionary, freedom-loving. Strong on direction, weak on management.',
  },
  {
    sign: 'capricorn', labelKo: '염소자리', labelEn: 'Capricorn', emoji: '♑', element: 'earth',
    traitKo: '목표 지향적, 체계적. 성과로 증명해야 인정',
    traitEn: 'Goal-driven, systematic. Validates through proven results.',
  },
  {
    sign: 'aquarius', labelKo: '물병자리', labelEn: 'Aquarius', emoji: '♒', element: 'air',
    traitKo: '독창적 사고, 틀 깨기 좋아함. 관습적 보고서 싫어함',
    traitEn: 'Original thinker, breaks frames. Dislikes conventional reports.',
  },
  {
    sign: 'pisces', labelKo: '물고기자리', labelEn: 'Pisces', emoji: '♓', element: 'water',
    traitKo: '감수성 풍부, 분위기 읽음. 논리보다 느낌으로 판단',
    traitEn: 'Sensitive to atmosphere. Judges by feel over logic.',
  },
];

/** Date ranges (month, day inclusive start) — precise Western zodiac. */
const WESTERN_RANGES: Array<{ sign: WesternZodiacSign; startMonth: number; startDay: number }> = [
  { sign: 'capricorn',   startMonth: 12, startDay: 22 }, // Dec 22 - Jan 19
  { sign: 'aquarius',    startMonth: 1,  startDay: 20 }, // Jan 20 - Feb 18
  { sign: 'pisces',      startMonth: 2,  startDay: 19 }, // Feb 19 - Mar 20
  { sign: 'aries',       startMonth: 3,  startDay: 21 }, // Mar 21 - Apr 19
  { sign: 'taurus',      startMonth: 4,  startDay: 20 }, // Apr 20 - May 20
  { sign: 'gemini',      startMonth: 5,  startDay: 21 }, // May 21 - Jun 20
  { sign: 'cancer',      startMonth: 6,  startDay: 21 }, // Jun 21 - Jul 22
  { sign: 'leo',         startMonth: 7,  startDay: 23 }, // Jul 23 - Aug 22
  { sign: 'virgo',       startMonth: 8,  startDay: 23 }, // Aug 23 - Sep 22
  { sign: 'libra',       startMonth: 9,  startDay: 23 }, // Sep 23 - Oct 22
  { sign: 'scorpio',     startMonth: 10, startDay: 23 }, // Oct 23 - Nov 21
  { sign: 'sagittarius', startMonth: 11, startDay: 22 }, // Nov 22 - Dec 21
];

/**
 * Get Western zodiac sign for a given birth month + day.
 * If day is missing, falls back to the sign containing the middle of the month (day 15).
 */
export function getWesternZodiac(month: number, day?: number): WesternZodiacInfo | null {
  if (month < 1 || month > 12) return null;
  const d = day && day >= 1 && day <= 31 ? day : 15;

  // Capricorn wraps year-end: Dec 22–31 or Jan 1–19.
  if ((month === 12 && d >= 22) || (month === 1 && d <= 19)) {
    return WESTERN_ZODIAC.find(z => z.sign === 'capricorn') || null;
  }

  for (let i = WESTERN_RANGES.length - 1; i >= 0; i--) {
    const r = WESTERN_RANGES[i];
    if (r.startMonth === 12) continue; // handled above
    if (month > r.startMonth || (month === r.startMonth && d >= r.startDay)) {
      return WESTERN_ZODIAC.find(z => z.sign === r.sign) || null;
    }
  }
  return null;
}

// ─── Chinese zodiac ───

export type ChineseZodiacAnimal =
  | 'rat' | 'ox' | 'tiger' | 'rabbit'
  | 'dragon' | 'snake' | 'horse' | 'goat'
  | 'monkey' | 'rooster' | 'dog' | 'pig';

export interface ChineseZodiacInfo {
  animal: ChineseZodiacAnimal;
  labelKo: string;
  labelEn: string;
  emoji: string;
  traitKo: string;
  traitEn: string;
}

// Indexed by (year % 12). Order matches existing Korean saju interpreter:
// 0 = 원숭이(monkey), 1 = 닭(rooster), ..., 11 = 양(goat)
const CHINESE_ZODIAC: ChineseZodiacInfo[] = [
  {
    animal: 'monkey', labelKo: '원숭이', labelEn: 'Monkey', emoji: '🐵',
    traitKo: '재치 있고 임기응변에 강함. 눈치 빠르지만 가끔 꼼수',
    traitEn: 'Witty, nimble under pressure. Sharp read on people; occasional shortcuts.',
  },
  {
    animal: 'rooster', labelKo: '닭', labelEn: 'Rooster', emoji: '🐔',
    traitKo: '시간 관리 철저, 디테일 집착. 지적은 정확하지만 날카로움',
    traitEn: 'Time-strict, detail-obsessed. Accurate critique but can come across sharp.',
  },
  {
    animal: 'dog', labelKo: '개', labelEn: 'Dog', emoji: '🐶',
    traitKo: '의리파, 팀 충성도 높음. 신뢰하면 끝까지 가지만 배신에 냉정',
    traitEn: 'Loyalty-driven, high team commitment. Goes to the wall for trust; cold on betrayal.',
  },
  {
    animal: 'pig', labelKo: '돼지', labelEn: 'Pig', emoji: '🐷',
    traitKo: '너그럽고 여유로움. 평소엔 관대하지만 선 넘으면 폭발',
    traitEn: 'Generous and relaxed. Tolerant by default but explodes when lines are crossed.',
  },
  {
    animal: 'rat', labelKo: '쥐', labelEn: 'Rat', emoji: '🐭',
    traitKo: '눈치 빠르고 정치적. 정보 수집력 최고, 생존 본능 강함',
    traitEn: 'Quick-witted, politically aware. Top info-gatherer with strong survival instinct.',
  },
  {
    animal: 'ox', labelKo: '소', labelEn: 'Ox', emoji: '🐮',
    traitKo: '묵묵히 밀어붙이는 실행가. 느리지만 확실, 고집이 장단점',
    traitEn: 'Quiet push-through executor. Slow but certain; stubborn as strength and weakness.',
  },
  {
    animal: 'tiger', labelKo: '호랑이', labelEn: 'Tiger', emoji: '🐯',
    traitKo: '카리스마 직진형. 결단 빠르고 추진력 강하지만 독단적',
    traitEn: 'Charismatic and direct. Fast decisions, strong drive, occasionally autocratic.',
  },
  {
    animal: 'rabbit', labelKo: '토끼', labelEn: 'Rabbit', emoji: '🐰',
    traitKo: '부드럽지만 은근 독함. 갈등 회피하면서도 원하는 건 얻어냄',
    traitEn: 'Soft on the surface, firm underneath. Avoids conflict while getting what they want.',
  },
  {
    animal: 'dragon', labelKo: '용', labelEn: 'Dragon', emoji: '🐲',
    traitKo: '자신감 폭발, 큰 그림 좋아함. 스케일 크지만 디테일 놓침',
    traitEn: 'Bursting with confidence, loves big-picture. Scale-focused, can miss details.',
  },
  {
    animal: 'snake', labelKo: '뱀', labelEn: 'Snake', emoji: '🐍',
    traitKo: '조용히 관찰하다 핵심 찌름. 직관 예리하고 전략적',
    traitEn: 'Quiet observer striking at the core. Sharp intuition, strategic.',
  },
  {
    animal: 'horse', labelKo: '말', labelEn: 'Horse', emoji: '🐴',
    traitKo: '에너지 넘치고 행동파. 열정적이지만 지구력 부족할 때',
    traitEn: 'Energy-forward, action-oriented. Passionate but sometimes lacks stamina.',
  },
  {
    animal: 'goat', labelKo: '양', labelEn: 'Goat', emoji: '🐑',
    traitKo: '온화하고 팀 분위기 중시. 배려 깊지만 결정 장애 가능',
    traitEn: 'Warm, team-atmosphere focused. Considerate but prone to decision paralysis.',
  },
];

/**
 * Get Chinese zodiac animal for a given birth year.
 * Uses the same `year % 12` mapping as the existing saju interpreter so
 * Korean year-pillar derivation stays consistent.
 */
export function getChineseZodiac(year: number): ChineseZodiacInfo | null {
  if (year < 1940 || year > 2010) return null;
  return CHINESE_ZODIAC[year % 12];
}

// ─── Combined profile ───

export interface ZodiacProfile {
  western: WesternZodiacInfo | null;
  chinese: ChineseZodiacInfo | null;
  summaryKo: string;
  summaryEn: string;
  /** Boss-trait snippets (1 per layer) for prompt injection. */
  traitsKo: string[];
  traitsEn: string[];
}

/**
 * Build a combined zodiac profile for a given birth date.
 * Both Western (date-precise) and Chinese (year-based) layers included
 * when possible; missing layers fall through to null.
 */
export function buildZodiacProfile(
  year: number,
  month?: number,
  day?: number,
): ZodiacProfile | null {
  const chinese = getChineseZodiac(year);
  const western = month ? getWesternZodiac(month, day) : null;
  if (!chinese && !western) return null;

  const parts_ko: string[] = [];
  const parts_en: string[] = [];
  const traits_ko: string[] = [];
  const traits_en: string[] = [];

  parts_ko.push(`${year}년생`);
  parts_en.push(`Born ${year}`);

  if (chinese) {
    parts_ko.push(`${chinese.emoji} ${chinese.labelKo}띠`);
    parts_en.push(`${chinese.emoji} ${chinese.labelEn}`);
    traits_ko.push(chinese.traitKo);
    traits_en.push(chinese.traitEn);
  }

  if (western) {
    parts_ko.push(`${western.emoji} ${western.labelKo}`);
    parts_en.push(`${western.emoji} ${western.labelEn}`);
    traits_ko.push(western.traitKo);
    traits_en.push(western.traitEn);
  }

  return {
    western,
    chinese,
    summaryKo: parts_ko.join(' · '),
    summaryEn: parts_en.join(' · '),
    traitsKo: traits_ko,
    traitsEn: traits_en,
  };
}

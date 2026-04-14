// ━━━ 오늘의 기운 계산기 ━━━
//
// 사용자 연주(+ 월주) × 오늘의 일진 → 5단계 무드.
//
// 정통 사주 아님. 일주/시주가 없으므로 본질 기운 판정은 불가.
// 이 모듈은 "띠별 운세" 수준의 근사 — 연간 오행 vs 오늘 일간 오행 (상생/상극)
// + 연지 vs 오늘 일지 (합/충/해) 조합으로 점수화한다.
//
// UI에서는 "사주"라는 용어를 절대 쓰지 않는다. "오늘의 기운", "타고난 결" 톤.

import type { YearMonthProfile } from './saju-interpreter';

const TEN_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
const TWELVE_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

type Stem = typeof TEN_STEMS[number];
type Branch = typeof TWELVE_BRANCHES[number];
type Element = '木' | '火' | '土' | '金' | '水';

// ─── 천간 → 오행 ───
const STEM_ELEMENT: Record<string, Element> = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水',
};

// ─── 지지 → 오행 ───
const BRANCH_ELEMENT: Record<string, Element> = {
  '寅': '木', '卯': '木',
  '巳': '火', '午': '火',
  '辰': '土', '丑': '土', '戌': '土', '未': '土',
  '申': '金', '酉': '金',
  '亥': '水', '子': '水',
};

// ─── 오행 상생 (producing cycle) ───
// A가 B를 生 → A는 B의 부모, B는 A의 자식
const ELEMENT_PRODUCES: Record<Element, Element> = {
  '木': '火',
  '火': '土',
  '土': '金',
  '金': '水',
  '水': '木',
};

// ─── 오행 상극 (controlling cycle) ───
// A가 B를 克 → A는 승자, B는 패자
const ELEMENT_CONTROLS: Record<Element, Element> = {
  '木': '土',
  '土': '水',
  '水': '火',
  '火': '金',
  '金': '木',
};

// ─── 지지 六合 (육합, 2지지 결합) ───
// 매우 우호적
const BRANCH_HARMONY_6: Array<[Branch, Branch]> = [
  ['子', '丑'],
  ['寅', '亥'],
  ['卯', '戌'],
  ['辰', '酉'],
  ['巳', '申'],
  ['午', '未'],
];

// ─── 지지 三合 (삼합, 3지지 그룹) ───
// 같은 그룹의 멤버끼리 우호적
const BRANCH_HARMONY_3: Branch[][] = [
  ['申', '子', '辰'],
  ['亥', '卯', '未'],
  ['寅', '午', '戌'],
  ['巳', '酉', '丑'],
];

// ─── 지지 六沖 (육충, 대립) ───
// 매우 불리
const BRANCH_CONFLICT: Array<[Branch, Branch]> = [
  ['子', '午'],
  ['丑', '未'],
  ['寅', '申'],
  ['卯', '酉'],
  ['辰', '戌'],
  ['巳', '亥'],
];

// ─── 지지 六害 (육해, 방해) ───
// 소폭 불리
const BRANCH_HARM: Array<[Branch, Branch]> = [
  ['子', '未'],
  ['丑', '午'],
  ['寅', '巳'],
  ['卯', '辰'],
  ['申', '亥'],
  ['酉', '戌'],
];

// ─── 관계 헬퍼 ───

function pairMatches(a: string, b: string, pairs: Array<[Branch, Branch]>): boolean {
  return pairs.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

function sameTriad(a: string, b: string): boolean {
  return BRANCH_HARMONY_3.some(group => group.includes(a as Branch) && group.includes(b as Branch));
}

// ─── 천간 오행 관계 점수 ───
// 사용자 연간 vs 오늘 일간
// 결과: -2 (극을 당함) ~ +2 (생을 받음)
export function scoreStemRelation(userStem: string, todayStem: string): {
  score: number;
  relation: 'supports_user' | 'user_supports_today' | 'same' | 'user_controls_today' | 'today_controls_user';
  label: string;
} {
  const userEl = STEM_ELEMENT[userStem];
  const todayEl = STEM_ELEMENT[todayStem];
  if (!userEl || !todayEl) return { score: 0, relation: 'same', label: '알 수 없음' };

  // 오늘이 사용자를 生함 → 도움 받는 날 (+2)
  if (ELEMENT_PRODUCES[todayEl] === userEl) {
    return { score: 2, relation: 'supports_user', label: `${todayEl} 생 ${userEl} (도움 받음)` };
  }
  // 사용자가 오늘을 生함 → 에너지 나가는 날 (0)
  if (ELEMENT_PRODUCES[userEl] === todayEl) {
    return { score: 0, relation: 'user_supports_today', label: `${userEl} 생 ${todayEl} (에너지 나감)` };
  }
  // 같은 오행 → 비화 (+1)
  if (userEl === todayEl) {
    return { score: 1, relation: 'same', label: `${userEl} 비화 (호흡 맞음)` };
  }
  // 오늘이 사용자를 克함 → 스트레스 (-2)
  if (ELEMENT_CONTROLS[todayEl] === userEl) {
    return { score: -2, relation: 'today_controls_user', label: `${todayEl} 극 ${userEl} (압박 받음)` };
  }
  // 사용자가 오늘을 克함 → 통제할 수 있음 (+1)
  if (ELEMENT_CONTROLS[userEl] === todayEl) {
    return { score: 1, relation: 'user_controls_today', label: `${userEl} 극 ${todayEl} (주도권)` };
  }
  return { score: 0, relation: 'same', label: `중립` };
}

// ─── 지지 관계 점수 ───
// 사용자 연지(띠) vs 오늘 일지
// 결과: -2 ~ +2
export function scoreBranchRelation(userBranch: string, todayBranch: string): {
  score: number;
  relation: 'harmony_6' | 'harmony_3' | 'same' | 'harm' | 'conflict' | 'neutral';
  label: string;
} {
  if (userBranch === todayBranch) {
    return { score: 1, relation: 'same', label: '같은 지지 (익숙한 결)' };
  }
  if (pairMatches(userBranch, todayBranch, BRANCH_HARMONY_6)) {
    return { score: 2, relation: 'harmony_6', label: '육합 (호흡 맞음)' };
  }
  if (sameTriad(userBranch, todayBranch)) {
    return { score: 1, relation: 'harmony_3', label: '삼합 그룹 (우호적)' };
  }
  if (pairMatches(userBranch, todayBranch, BRANCH_CONFLICT)) {
    return { score: -2, relation: 'conflict', label: '육충 (대립)' };
  }
  if (pairMatches(userBranch, todayBranch, BRANCH_HARM)) {
    return { score: -1, relation: 'harm', label: '육해 (거슬림)' };
  }
  return { score: 0, relation: 'neutral', label: '무난' };
}

// ─── 오늘 일진 계산 ───
//
// 기준: 1900-01-01 (Gregorian) = 甲戌일 (cycle index 10).
// 60갑자 cycle: cycleIdx % 10 = stem, cycleIdx % 12 = branch.
//
// 이 anchor가 실제와 1~2일 어긋나면 DAY_ANCHOR_OFFSET만 조정.
// Korean 만세력 기준: 1900-01-01 = 庚子年 丁丑月 甲戌日 (Wikipedia, 한국천문연구원 만세력 일치).
const DAY_ANCHOR_UTC_MS = Date.UTC(1900, 0, 1);  // 1900-01-01 00:00 UTC
const DAY_ANCHOR_OFFSET = 10;                     // 1900-01-01 = 甲戌 → cycleIdx 10

export interface DailyStemBranch {
  stem: Stem;
  branch: Branch;
  stemIdx: number;
  branchIdx: number;
  cycleIdx: number;
  /** 60갑자 한글 표기 (예: "갑자") */
  name: string;
}

export function getDailyStemBranch(date: Date = new Date()): DailyStemBranch {
  // 로컬 날짜를 UTC 자정 기준으로 정규화 — 시간대 무관하게 "오늘"이 같도록.
  const target = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSince = Math.floor((target - DAY_ANCHOR_UTC_MS) / 86400000);

  let cycleIdx = (DAY_ANCHOR_OFFSET + daysSince) % 60;
  if (cycleIdx < 0) cycleIdx += 60;

  const stemIdx = cycleIdx % 10;
  const branchIdx = cycleIdx % 12;
  const stem = TEN_STEMS[stemIdx];
  const branch = TWELVE_BRANCHES[branchIdx];

  return {
    stem,
    branch,
    stemIdx,
    branchIdx,
    cycleIdx,
    name: `${stemToKorean(stem)}${branchToKorean(branch)}`,
  };
}

const STEM_KO: Record<string, string> = {
  '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무',
  '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계',
};
const BRANCH_KO: Record<string, string> = {
  '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진', '巳': '사',
  '午': '오', '未': '미', '申': '신', '酉': '유', '戌': '술', '亥': '해',
};
function stemToKorean(s: string): string { return STEM_KO[s] || s; }
function branchToKorean(b: string): string { return BRANCH_KO[b] || b; }

// ─── Daily Mood ───

export type DailyMood = 'radiant' | 'light' | 'neutral' | 'heavy' | 'stormy';

export interface DailyMoodResult {
  mood: DailyMood;
  score: number;           // -4 ~ +4
  emoji: string;
  label: string;           // "오늘 기운 좋음" 등 짧은 라벨
  /** UI 표시용 한 줄 (사용자 기준) */
  copy: string;
  /** 팀장 시뮬레이션에서 LLM에 주입할 시스템 컨텍스트 */
  promptContext: string;
  /** 디버그용 — 내부 계산 근거 */
  breakdown: {
    today: DailyStemBranch;
    stemRelation: ReturnType<typeof scoreStemRelation>;
    branchRelation: ReturnType<typeof scoreBranchRelation>;
  };
}

// 5단계 무드 매핑
function scoreToMood(score: number): DailyMood {
  if (score >= 3) return 'radiant';
  if (score >= 1) return 'light';
  if (score >= -1) return 'neutral';
  if (score >= -3) return 'heavy';
  return 'stormy';
}

const MOOD_META: Record<DailyMood, { emoji: string; label: string; copy: string; llmGuide: string }> = {
  radiant: {
    emoji: '☀️',
    label: '기운 풀림',
    copy: '오늘 이 팀장 뭔가 풀려 있다. 부탁할 타이밍.',
    llmGuide: '오늘 너는 평소보다 유독 여유롭고 너그럽다. 같은 상황이라도 "그래 한번 해봐" 쪽으로 기운다. 툭 던지는 인정도 오늘은 유독 쉽다.',
  },
  light: {
    emoji: '🌤',
    label: '가벼운 결',
    copy: '기분 나쁘진 않다. 평소대로 접근해라.',
    llmGuide: '오늘 기운이 약간 가볍다. 평소 성격은 그대로인데 몇 수 정도 더 들어주는 여유가 있다. 공격적 반응은 평소보다 한 톤 약하다.',
  },
  neutral: {
    emoji: '⚪',
    label: '평범함',
    copy: '특별한 기운 없음. 평소 그대로의 팀장.',
    llmGuide: '오늘은 특별한 기운 없이 평소 성격 그대로다. 캐릭터에 충실하게 반응해라.',
  },
  heavy: {
    emoji: '🌥',
    label: '무거운 결',
    copy: '뭔가 안 풀리는 기색. 민감한 얘기는 피하자.',
    llmGuide: '오늘 너는 유독 뭔가 안 풀린다. 평소보다 말수가 적거나, 인내심이 얕다. 사소한 거에도 한 번 더 따져 묻는다. 결정은 미루는 쪽.',
  },
  stormy: {
    emoji: '🌩',
    label: '기운 거침',
    copy: '오늘 건드리면 폭발한다. 피할 수 있으면 피해라.',
    llmGuide: '오늘 너는 기분이 나쁘다. 평소 성격은 유지하되 모든 반응이 한 단계 더 날카롭다. 작은 흠도 놓치지 않고 찌른다. 쉽게 수긍 안 한다. 단, 대놓고 화내지는 않는다 — 한국 직장 팀장 레벨의 냉랭함.',
  },
};

/**
 * 사용자 연주/월주 프로필 × 오늘 날짜 → 오늘의 기운 무드.
 * yearMonthProfile이 없으면 null 반환 (계산 불가).
 */
export function computeDailyMood(
  profile: YearMonthProfile | null,
  date: Date = new Date(),
): DailyMoodResult | null {
  if (!profile) return null;

  const today = getDailyStemBranch(date);
  const stemRel = scoreStemRelation(profile.yearStem, today.stem);
  const branchRel = scoreBranchRelation(profile.yearBranch, today.branch);

  const totalScore = stemRel.score + branchRel.score;
  const mood = scoreToMood(totalScore);
  const meta = MOOD_META[mood];

  const reasonBits: string[] = [];
  if (stemRel.score !== 0) reasonBits.push(stemRel.label);
  if (branchRel.score !== 0) reasonBits.push(branchRel.label);
  const reasonStr = reasonBits.length > 0 ? reasonBits.join(' · ') : '평이한 날';

  const promptContext = `\n\n## 오늘 너의 기운
- 오늘은 ${today.name}일. 너의 타고난 결(${profile.animal.animal}띠 · ${profile.yearElement.nature})과의 관계: ${reasonStr}.
- 오늘 무드: ${meta.label}.
- ${meta.llmGuide}
- 평소 성격 프로필(MBTI)은 그대로 유지한다. 이 오늘의 기운은 톤/여유/날카로움의 미세한 조정으로만 드러낸다. 과하게 바꾸지 마라.`;

  return {
    mood,
    score: totalScore,
    emoji: meta.emoji,
    label: meta.label,
    copy: meta.copy,
    promptContext,
    breakdown: { today, stemRelation: stemRel, branchRelation: branchRel },
  };
}

/**
 * 오늘 날짜 기준 캐시 키 — "오늘 같은 날이면 같은 결과"를 보장할 때.
 */
export function getTodayKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

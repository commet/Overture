// ━━━ 사주 해석기: ssaju 출력 → 성격 특성 텍스트 ━━━
// ssaju의 toCompact() 결과를 LLM에 넘기기 위한 요약 + 핵심 특성 추출

// ssaju는 ESM/CJS 모두 지원. 서버사이드에서만 사용.
// 클라이언트에서는 API를 통해 해석 결과를 받음.

export interface SajuInput {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  gender: '남' | '여';
}

export interface SajuProfile {
  /** ssaju toCompact() 원문 (LLM 프롬프트에 직접 삽입) */
  raw: string;
  /** 일간 (Day Master) — 핵심 성격 */
  dayMaster: string;
  /** 강약 점수 */
  strength: string;
  /** 격국 */
  structure: string;
  /** 용신 */
  useful: string;
  /** 요약 한 줄 (UI 표시용) */
  summary: string;
}

// 일간별 성격 키워드 (간략)
const DAY_MASTER_TRAITS: Record<string, string> = {
  '甲': '곧은 소나무 — 정직하고 강직, 리더십 있으나 융통성 부족',
  '乙': '넝쿨 풀 — 유연하고 적응력 높음, 부드럽지만 끈질김',
  '丙': '태양 — 밝고 열정적, 카리스마 있으나 자기중심적일 수 있음',
  '丁': '촛불 — 섬세하고 따뜻, 내면의 열정이 강하나 예민함',
  '戊': '큰 산 — 듬직하고 신뢰감, 느리지만 확실한 판단',
  '己': '논밭 — 포용력 넓고 실용적, 겉은 부드럽고 속은 단단',
  '庚': '강철 — 단호하고 결단력 있음, 의리 있으나 거침없음',
  '辛': '보석 — 예민하고 완벽주의, 고집 있으나 섬세한 감각',
  '壬': '큰 강 — 지혜롭고 자유분방, 대범하나 변덕스러울 수 있음',
  '癸': '이슬비 — 직관적이고 감수성 풍부, 조용하지만 깊은 사고',
};

/**
 * ssaju 결과를 파싱해서 핵심 정보 추출.
 * ssaju 패키지가 설치되어 있어야 동작.
 */
export async function interpretSaju(input: SajuInput): Promise<SajuProfile> {
  const { calculateSaju } = await import('ssaju');

  const result = calculateSaju({
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour,
    minute: input.minute,
    gender: input.gender,
  });

  const raw = result.toCompact();

  // 기본 정보 파싱 (첫 줄에서 추출)
  const basicLine = raw.split('\n').find(l => l.includes('일간')) || '';
  const dayMasterMatch = basicLine.match(/일간\s+([甲乙丙丁戊己庚辛壬癸])/);
  const strengthMatch = basicLine.match(/강약:\s*(강|약)\((\d+)\)/);
  const structureMatch = basicLine.match(/격:\s*(\S+)/);
  const usefulMatch = basicLine.match(/용신:\s*([^,\n]+)/);

  const dayMasterChar = dayMasterMatch?.[1] || '';
  const dayMasterTrait = DAY_MASTER_TRAITS[dayMasterChar] || '';

  const strength = strengthMatch ? `${strengthMatch[1]}(${strengthMatch[2]})` : '보통';
  const structure = structureMatch?.[1] || '';
  const useful = usefulMatch?.[1]?.trim() || '';

  const summary = dayMasterChar
    ? `일간 ${dayMasterChar} (${dayMasterTrait.split(' — ')[0]}) · ${strength} · ${structure}`
    : '사주 정보 분석 완료';

  return {
    raw,
    dayMaster: dayMasterChar ? `${dayMasterChar} — ${dayMasterTrait}` : '',
    strength,
    structure,
    useful,
    summary,
  };
}

// ━━━ 오행 (Five Elements) ━━━

export type FiveElement = '木' | '火' | '土' | '金' | '水';

export interface ElementInfo {
  element: FiveElement;
  color: string;       // CSS color
  glow: string;        // glow shadow
  stem: string;        // 천간 한자
  stemName: string;    // 천간 한글
  nature: string;      // 자연물 비유
  trait: string;       // 성격 한 줄
  emoji: string;
}

const STEM_TO_ELEMENT: Record<string, ElementInfo> = {
  '甲': { element: '木', color: '#2d8a4e', glow: 'rgba(45,138,78,0.3)', stem: '甲', stemName: '갑목', nature: '곧은 소나무', trait: '정직하고 강직한 리더', emoji: '🌲' },
  '乙': { element: '木', color: '#4caf7a', glow: 'rgba(76,175,122,0.3)', stem: '乙', stemName: '을목', nature: '넝쿨 풀', trait: '유연하고 끈질긴 적응력', emoji: '🌿' },
  '丙': { element: '火', color: '#e53935', glow: 'rgba(229,57,53,0.3)', stem: '丙', stemName: '병화', nature: '태양', trait: '밝고 열정적인 카리스마', emoji: '☀️' },
  '丁': { element: '火', color: '#ff7043', glow: 'rgba(255,112,67,0.3)', stem: '丁', stemName: '정화', nature: '촛불', trait: '섬세하고 따뜻한 내면의 열정', emoji: '🕯️' },
  '戊': { element: '土', color: '#c17d24', glow: 'rgba(193,125,36,0.3)', stem: '戊', stemName: '무토', nature: '큰 산', trait: '듬직하고 신뢰감 있는 판단', emoji: '⛰️' },
  '己': { element: '土', color: '#d4a24c', glow: 'rgba(212,162,76,0.3)', stem: '己', stemName: '기토', nature: '논밭', trait: '포용력 넓고 실용적인 실력자', emoji: '🌾' },
  '庚': { element: '金', color: '#78909c', glow: 'rgba(120,144,156,0.3)', stem: '庚', stemName: '경금', nature: '강철', trait: '단호하고 결단력 있는 의리파', emoji: '⚔️' },
  '辛': { element: '金', color: '#b0bec5', glow: 'rgba(176,190,197,0.3)', stem: '辛', stemName: '신금', nature: '보석', trait: '예민하고 완벽주의적 감각파', emoji: '💎' },
  '壬': { element: '水', color: '#1e88e5', glow: 'rgba(30,136,229,0.3)', stem: '壬', stemName: '임수', nature: '큰 강', trait: '지혜롭고 자유분방한 대범함', emoji: '🌊' },
  '癸': { element: '水', color: '#5c9fd4', glow: 'rgba(92,159,212,0.3)', stem: '癸', stemName: '계수', nature: '이슬비', trait: '직관적이고 깊은 사고의 감수성', emoji: '🌧️' },
};

const STEMS_BY_YEAR = ['庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己'];

/**
 * 클라이언트용: 연도 끝자리로 천간/오행 즉시 조회.
 * 실시간 UI 프리뷰에 사용 (서버 호출 없음).
 */
export function getYearElement(year: number): ElementInfo | null {
  if (year < 1940 || year > 2010) return null;
  const stem = STEMS_BY_YEAR[year % 10];
  return STEM_TO_ELEMENT[stem] || null;
}

/**
 * 클라이언트용: 사주 정보 없이 간단한 생년월일 기반 요약만 생성.
 */
export function getQuickSajuLabel(year: number, month: number, day: number): string {
  const stems = ['庚', '辛', '壬', '癸', '甲', '乙', '丙', '丁', '戊', '己'];
  const stem = stems[year % 10];
  const trait = DAY_MASTER_TRAITS[stem];
  if (!trait) return `${year}.${month}.${day}생`;
  return `${year}년생 · ${trait.split(' — ')[0]}의 기운`;
}

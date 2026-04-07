/**
 * guard-rails.ts — 프레임워크별 결과 검증기
 *
 * 룰 기반 (정규식 + 구조 체크). LLM 호출 없음.
 * 각 프레임워크의 결과물이 해당 방법론의 구조를 따르는지 확인.
 * 미등록 프레임워크는 패스스루 (passed: true).
 */

/* ─── Types ─── */

export interface GuardRailResult {
  passed: boolean;
  score: number;      // 0-100
  issues: string[];
}

/* ─── Helpers ─── */

function countMatches(text: string, patterns: (string | RegExp)[]): number {
  return patterns.filter(p =>
    typeof p === 'string' ? text.includes(p) : p.test(text)
  ).length;
}

function countNumericValues(text: string): number {
  // 숫자 + 단위 패턴: "100만", "30%", "1.5억", "$10M", "3개월"
  const numericPattern = /\d[\d,.]*\s*(%|만|억|조|원|달러|불|개월|년|명|건|개|배|\$|M|K|B)/g;
  return (text.match(numericPattern) || []).length;
}

function countBulletPoints(text: string): number {
  // 불렛/번호 패턴
  return (text.match(/^[\s]*[-•*]\s|^[\s]*\d+[.)]\s/gm) || []).length;
}

/* ─── Framework Validators ─���─ */

type Validator = (output: string) => GuardRailResult;

const VALIDATORS: Record<string, Validator> = {

  // ── Pre-mortem ──
  'Pre-mortem': (output) => {
    const issues: string[] = [];
    const failureKw = countMatches(output, ['실패', '망', '붕괴', '위기', '무산', '좌절', '실패했다면', 'fail', 'collapse', 'crisis', 'derail', 'fall apart']);
    const causeKw = countMatches(output, ['원인', '이유', '때문', '요인', '근본', '원인은', 'cause', 'reason', 'because', 'factor', 'root cause']);
    const likelihood = countMatches(output, [/확률|가능성|\d+%|높[다음]|낮[다음]/, /probability|likelihood|likely|unlikely|chance/i]);

    if (failureKw === 0) issues.push('No failure scenario specified');
    if (causeKw === 0) issues.push('No failure causes provided');
    if (likelihood === 0) issues.push('No probability/likelihood estimation');

    const score = Math.min(100, 30 + failureKw * 15 + causeKw * 15 + likelihood * 10);
    return { passed: issues.length <= 1, score, issues };
  },

  // ── Unit Economics ──
  'Unit Economics': (output) => {
    const issues: string[] = [];
    const numCount = countNumericValues(output);
    const hasAssumption = countMatches(output, ['가정', '전제', '기준', 'assumption']) > 0;
    const hasUnit = countMatches(output, ['CAC', 'LTV', 'ARPU', 'Payback', '고객획득비', '생애가치', '단가', '마진']) > 0;

    if (numCount < 3) issues.push(`Only ${numCount} numbers found (minimum 3 required)`);
    if (!hasAssumption) issues.push('No assumptions/premises stated');
    if (!hasUnit) issues.push('No key metrics (CAC, LTV, etc.) mentioned');

    const score = Math.min(100, numCount * 10 + (hasAssumption ? 20 : 0) + (hasUnit ? 20 : 0));
    return { passed: numCount >= 3 && (hasAssumption || hasUnit), score, issues };
  },

  // ── TAM/SAM/SOM ──
  'TAM': (output) => {
    const issues: string[] = [];
    const hasTAM = /TAM|전체\s*시장|총\s*(시장|규모)/i.test(output);
    const hasSAM = /SAM|유효\s*시장|접근\s*가능/i.test(output);
    const hasSOM = /SOM|목표\s*시장|실제\s*점유/i.test(output);
    const numCount = countNumericValues(output);

    if (!hasTAM) issues.push('TAM (Total Addressable Market) missing');
    if (!hasSAM) issues.push('SAM (Serviceable Available Market) missing');
    if (numCount < 2) issues.push('Insufficient market size figures');

    const score = (hasTAM ? 30 : 0) + (hasSAM ? 25 : 0) + (hasSOM ? 20 : 0) + Math.min(25, numCount * 5);
    return { passed: hasTAM && hasSAM && numCount >= 2, score, issues };
  },

  // ── Sensitivity Analysis ──
  'Sensitivity': (output) => {
    const issues: string[] = [];
    const hasVariable = countMatches(output, ['변수', '파라미터', '항목', '요인', '가정', 'variable', 'parameter', 'factor', 'assumption']) > 0;
    const hasRange = countMatches(output, [/\d+.*[~\-→].*\d+/, /최선.*최악|낙관.*비관|베스트.*워스트/, /best.*worst|optimistic.*pessimistic|bull.*bear/i]) > 0;
    const numCount = countNumericValues(output);

    if (!hasVariable) issues.push('No analysis variables specified');
    if (!hasRange) issues.push('No range/scenario provided');
    if (numCount < 3) issues.push('Insufficient numbers');

    const score = (hasVariable ? 30 : 0) + (hasRange ? 30 : 0) + Math.min(40, numCount * 8);
    return { passed: hasVariable && hasRange && numCount >= 2, score, issues };
  },

  // ── MECE ──
  'MECE': (output) => {
    const issues: string[] = [];
    const bulletCount = countBulletPoints(output);
    const hasMECE = countMatches(output, ['빠짐없이', '겹침없이', 'MECE', '상호배제', '전체포괄', 'mutually exclusive', 'collectively exhaustive']) > 0;
    const hasCategories = bulletCount >= 3;

    if (!hasCategories) issues.push('Fewer than 3 categories');
    if (bulletCount < 2) issues.push('Insufficient structured list items');

    const score = Math.min(100, bulletCount * 12 + (hasMECE ? 20 : 0));
    return { passed: hasCategories, score, issues };
  },

  // ── Pyramid Principle ──
  'Pyramid': (output) => {
    const issues: string[] = [];
    const lines = output.trim().split('\n').filter(l => l.trim());
    // 첫 줄에 결론이 있어야 함 (질문문이 아닌 선언문)
    const firstLine = lines[0] || '';
    const startsWithConclusion = !firstLine.endsWith('?') && firstLine.length > 10;
    const hasSupport = countBulletPoints(output) >= 2;

    if (!startsWithConclusion) issues.push('No conclusion in first line (Pyramid Principle violation)');
    if (!hasSupport) issues.push('Insufficient supporting evidence/sub-items');

    const score = (startsWithConclusion ? 50 : 0) + (hasSupport ? 30 : 0) + Math.min(20, lines.length * 3);
    return { passed: startsWithConclusion && hasSupport, score, issues };
  },

  // ── Jobs-to-be-Done ──
  'Jobs-to-be-Done': (output) => {
    const issues: string[] = [];
    const hasSituation = countMatches(output, ['상황', '맥락', '환경', 'context', 'situation', '~할 때']) > 0;
    const hasMotivation = countMatches(output, ['동기', '이유', '필요', '원하', 'want', 'need', 'job']) > 0;
    const hasOutcome = countMatches(output, ['결과', '기대', '성과', '효과', 'outcome', '달성']) > 0;
    const matchCount = [hasSituation, hasMotivation, hasOutcome].filter(Boolean).length;

    if (matchCount < 2) issues.push(`${3 - matchCount} of 3 elements (situation/motivation/outcome) missing`);

    const score = matchCount * 30 + Math.min(10, countBulletPoints(output) * 3);
    return { passed: matchCount >= 2, score, issues };
  },

  // ── SWOT ──
  'SWOT': (output) => {
    const issues: string[] = [];
    const hasS = countMatches(output, ['강점', 'Strength', 'S:', 'S)']) > 0;
    const hasW = countMatches(output, ['약점', 'Weakness', 'W:', 'W)']) > 0;
    const hasO = countMatches(output, ['기회', 'Opportunit', 'O:', 'O)']) > 0;
    const hasT = countMatches(output, ['위협', 'Threat', 'T:', 'T)']) > 0;
    const quadrants = [hasS, hasW, hasO, hasT].filter(Boolean).length;

    if (quadrants < 4) issues.push(`SWOT: ${4 - quadrants} quadrant(s) missing`);

    const score = quadrants * 25;
    return { passed: quadrants >= 3, score, issues };
  },
};

/* ─── 프레임워크 이름 정규화 (partial match) ─── */

function findValidator(frameworkName: string): Validator | undefined {
  const lower = frameworkName.toLowerCase();
  for (const [key, validator] of Object.entries(VALIDATORS)) {
    if (lower.includes(key.toLowerCase())) return validator;
  }
  return undefined;
}

/* ─── Main ─── */

export function validateByFramework(
  frameworkName: string,
  output: string,
): GuardRailResult {
  const validator = findValidator(frameworkName);
  if (!validator) {
    // 미등록 프레임워크 → 기본 구조 검증만 수행 (무조건 pass 방지)
    const bulletCount = countBulletPoints(output);
    const numCount = countNumericValues(output);
    const score = Math.min(100, 40 + bulletCount * 8 + numCount * 5);
    return { passed: score >= 60, score, issues: score < 60 ? ['Insufficient structure for unregistered framework'] : [] };
  }
  return validator(output);
}

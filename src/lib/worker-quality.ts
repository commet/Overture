/**
 * Worker Quality Gate — AI 작업 결과물의 품질 검증
 *
 * 2단계 검증:
 * 1. 휴리스틱 (즉시, <5ms): 플레이스홀더 탐지, 길이, 구조
 * 2. LLM 폴백 (휴리스틱 불확실 시): 관련성 + 완성도 채점
 */

import { callLLMJson } from '@/lib/llm';

export interface ValidationResult {
  score: number;           // 0-100
  passed: boolean;         // true if score >= 70
  is_placeholder: boolean;
  is_relevant: boolean;
  issues: string[];
}

// ─── Placeholder patterns (한국어/영어) ───

const PLACEHOLDER_PATTERNS = [
  '추가 조사가 필요합니다',
  '추가적인 분석이 필요',
  '구체적으로 알 수 없습니다',
  '해봐야 알 수 있습니다',
  '확인이 필요합니다',
  '정확한 데이터가 없',
  '일반적으로 알려진',
  'TBD',
  'TODO',
  '[여기에 입력]',
  '[추가 필요]',
  'N/A',
  'further research is needed',
  'additional analysis required',
  'cannot be determined',
  'remains to be seen',
  'needs verification',
  'no exact data available',
  '[insert here]',
  '[to be added]',
  '[placeholder]',
];

// ─── Heuristic validation (fast path) ───

function checkHeuristics(output: string, expectedOutput: string): ValidationResult {
  const issues: string[] = [];
  let score = 100;

  // 1. Placeholder detection
  for (const p of PLACEHOLDER_PATTERNS) {
    if (output.toLowerCase().includes(p.toLowerCase())) {
      issues.push(`Placeholder detected: "${p}"`);
      score -= 30;
      break;
    }
  }

  // 2. Minimum length
  if (output.trim().length < 50) {
    issues.push('Output too short (under 50 chars)');
    score -= 25;
  }

  // 3. Meaningful content (Korean phrases or English words)
  const koreanPhrases = output.match(/[가-힣]{2,}/g) || [];
  const englishWords = output.match(/[a-zA-Z]{3,}/g) || [];
  if (koreanPhrases.length < 5 && englishWords.length < 10) {
    issues.push('Insufficient substantive content');
    score -= 20;
  }

  // 4. Structure (bullets/numbers/newlines)
  const hasStructure = /[•·\-\d]\s|#{1,3}\s|\n/.test(output);
  if (!hasStructure && output.length > 200) {
    issues.push('No structure (no bullets/numbers)');
    score -= 10;
  }

  // 5. Expected output alignment — output should reference what was expected
  if (expectedOutput && expectedOutput.length > 5) {
    const expectedKeywords = [
      ...(expectedOutput.match(/[가-힣]{2,}/g) || []),
      ...(expectedOutput.match(/[A-Za-z]{4,}/g) || []),
    ];
    const uniqueExpected = [...new Set(expectedKeywords.map(k => k.toLowerCase()))];
    const outputLc = output.toLowerCase();
    const hitRate = uniqueExpected.length > 0
      ? uniqueExpected.filter(k => outputLc.includes(k)).length / Math.min(uniqueExpected.length, 8)
      : 1;
    if (hitRate < 0.1 && uniqueExpected.length >= 3) {
      issues.push('Output does not address expected deliverable');
      score -= 15;
    }
  }

  // 6. Repeated sentences
  const sentences = output.match(/[^.!?\n]+[.!?]+/g) || [];
  const seen = new Set<string>();
  for (const s of sentences) {
    const trimmed = s.trim().slice(0, 50);
    if (seen.has(trimmed)) {
      issues.push('Repeated sentences detected');
      score -= 15;
      break;
    }
    seen.add(trimmed);
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    passed: score >= 70,
    is_placeholder: score < 40,
    is_relevant: score >= 50, // 휴리스틱으로는 관련성 판단 어려움
    issues,
  };
}

// ─── LLM validation (fallback) ───

async function validateWithLLM(
  task: string,
  expectedOutput: string,
  actualOutput: string,
): Promise<ValidationResult> {
  interface LLMValidation {
    score: number;
    is_placeholder: boolean;
    is_relevant: boolean;
    issues: string[];
  }

  const result = await callLLMJson<LLMValidation>(
    [{ role: 'user', content: `작업: ${task}\n기대 산출물: ${expectedOutput}\n\n실제 결과물:\n${actualOutput.slice(0, 3000)}\n\n이 결과물의 품질을 채점해줘.\nJSON: { "score": 0-100, "is_placeholder": bool, "is_relevant": bool, "issues": ["문제점 목록"] }` }],
    {
      system: 'Quality gate for task output. Score relevance (did it actually do the task?), completeness (not a placeholder?), usefulness (ready to use in a document?). Be concise.',
      maxTokens: 300,
      model: 'fast' as const,
      shape: { score: 'number', is_placeholder: 'boolean', is_relevant: 'boolean', issues: 'array' },
    },
  );

  const score = Math.max(0, Math.min(100, result.score ?? 50));
  return {
    score,
    passed: score >= 70,
    is_placeholder: result.is_placeholder ?? false,
    is_relevant: result.is_relevant ?? true,
    issues: result.issues || [],
  };
}

// ─── Specificity Check (구체성 검증) ───

const GENERIC_PHRASES = [
  '시장 상황에 따라',
  '일반적으로',
  '다양한 요인',
  '추가 분석이 필요',
  '면밀한 검토가 필요',
  '상황을 주시',
  '모니터링하겠습니다',
  '종합적으로 고려',
  '여러 가지 관점',
  '케이스 바이 케이스',
  '경우에 따라 다를 수',
  '다각도로 검토',
  'depending on market conditions',
  'generally speaking',
  'various factors',
  'further analysis needed',
  'requires careful review',
  'monitor the situation',
  'holistic consideration',
  'multiple perspectives',
  'case by case',
  'it depends',
  'multi-faceted review',
];

/**
 * 결과물의 구체성을 검증.
 * - 사용자 입력 참조 횟수
 * - 제네릭 문구 감지
 * - 수치 구체성 (숫자/% 포함)
 */
export function checkSpecificity(output: string, userInput: string): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 50; // 기본 중립

  // 1. 사용자 입력 참조 (핵심 명사 추출 후 output에서 탐색 — 한국어 + 영어)
  const koreanNouns = userInput.match(/[가-힣]{2,}/g) || [];
  const englishNouns = userInput.match(/[A-Za-z]{4,}/g) || [];
  const inputNouns = [...koreanNouns, ...englishNouns];
  const uniqueNouns = [...new Set(inputNouns.map(n => n.toLowerCase()))].filter(n => n.length >= 2);
  const outputLower = output.toLowerCase();
  const referencedCount = uniqueNouns.filter(n => outputLower.includes(n)).length;
  const referenceRate = uniqueNouns.length > 0 ? referencedCount / Math.min(uniqueNouns.length, 10) : 0;

  if (referenceRate >= 0.3) score += 20;
  else if (referenceRate >= 0.1) score += 10;
  else {
    issues.push('Barely references keywords from user input');
    score -= 15;
  }

  // 2. 제네릭 문구 감지
  const genericCount = GENERIC_PHRASES.filter(p => output.includes(p)).length;
  if (genericCount >= 3) {
    issues.push(`${genericCount} generic phrases found`);
    score -= genericCount * 5;
  } else if (genericCount >= 1) {
    score -= genericCount * 3;
  }

  // 3. 수치 구체성
  const numericPattern = /\d[\d,.]*\s*(%|만|억|조|원|달러|불|개월|년|명|건|개|배|\$|M|K|B)/g;
  const numericCount = (output.match(numericPattern) || []).length;
  if (numericCount >= 3) score += 15;
  else if (numericCount >= 1) score += 5;
  else {
    issues.push('No specific numbers found');
  }

  // 4. 고유명사 밀도 (회사명, 제품명, 사람 이름 등)
  const properNouns = output.match(/[A-Z][a-z]+(?:\s[A-Z][a-z]+)*|[가-힣]{2,}(?:사|그룹|은행|대학|팀)/g) || [];
  if (properNouns.length >= 2) score += 10;

  score = Math.max(0, Math.min(100, score));
  return { score, issues };
}

// ─── Public API ───

/**
 * Worker 결과물 품질 검증.
 * 휴리스틱으로 빠르게 판단하고, 불확실하면 LLM에 위임.
 */
export async function validateWorkerOutput(
  task: string,
  expectedOutput: string,
  actualOutput: string,
): Promise<ValidationResult> {
  // Step 1: 휴리스틱 (fast)
  const heuristic = checkHeuristics(actualOutput, expectedOutput);

  // 확실한 통과 (80+) 또는 확실한 실패 (<40) → 바로 반환
  if (heuristic.score >= 80 || heuristic.score < 40) {
    return heuristic;
  }

  // Step 2: 불확실한 구간 (40-79) → LLM 검증
  try {
    return await validateWithLLM(task, expectedOutput, actualOutput);
  } catch {
    // LLM 검증 실패 → 휴리스틱 결과 그대로 사용 (비차단)
    return heuristic;
  }
}

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
];

// ─── Heuristic validation (fast path) ───

function checkHeuristics(output: string, expectedOutput: string): ValidationResult {
  const issues: string[] = [];
  let score = 100;

  // 1. 플레이스홀더 탐지
  for (const p of PLACEHOLDER_PATTERNS) {
    if (output.includes(p)) {
      issues.push(`플레이스홀더 감지: "${p}"`);
      score -= 30;
      break; // 하나만 잡아도 충분
    }
  }

  // 2. 최소 길이
  if (output.trim().length < 50) {
    issues.push('결과물이 너무 짧습니다 (50자 미만)');
    score -= 25;
  }

  // 3. 의미있는 내용 (한국어 어절 수)
  const koreanPhrases = output.match(/[가-힣]{2,}/g) || [];
  if (koreanPhrases.length < 5) {
    issues.push('실질적 내용이 부족합니다');
    score -= 20;
  }

  // 4. 구조 (글머리/번호/줄바꿈)
  const hasStructure = /[•·\-\d]\s|#{1,3}\s|\n/.test(output);
  if (!hasStructure && output.length > 200) {
    issues.push('구조가 없습니다 (글머리/번호 없음)');
    score -= 10;
  }

  // 5. 반복적 문장 (같은 문장이 2번 이상)
  const sentences = output.match(/[^.!?\n]+[.!?]+/g) || [];
  const seen = new Set<string>();
  for (const s of sentences) {
    const trimmed = s.trim().slice(0, 50);
    if (seen.has(trimmed)) {
      issues.push('반복적 문장이 있습니다');
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
    [{ role: 'user', content: `작업: ${task}\n기대 산출물: ${expectedOutput}\n\n실제 결과물:\n${actualOutput.slice(0, 1500)}\n\n이 결과물의 품질을 채점해줘.\nJSON: { "score": 0-100, "is_placeholder": bool, "is_relevant": bool, "issues": ["문제점 목록"] }` }],
    {
      system: '작업 결과물의 품질 게이트. 관련성(task를 실제로 수행했는가), 완성도(플레이스홀더가 아닌가), 유용성(문서에 바로 쓸 수 있는가)을 채점. Korean. 간결하게.',
      maxTokens: 300,
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

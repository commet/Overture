/**
 * Progressive Convergence — 진짜 질문이 수렴하고 있는지 측정
 *
 * 3가지 신호를 종합:
 * 1. 질문 안정성: real_question이 라운드마다 얼마나 바뀌는지
 * 2. 가정 감소 추세: hidden_assumptions가 줄어들고 있는지
 * 3. 프레이밍 확신도: LLM의 자기 평가
 */

import type { AnalysisSnapshot, ConvergenceMetrics } from '@/stores/types';

/** 두 문자열의 유사도 (0-1). 간단한 단어 겹침 기반. */
function wordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.replace(/[??.!]/g, '').split(/\s+/).filter(w => w.length > 1));
  const wordsB = new Set(b.replace(/[??.!]/g, '').split(/\s+/).filter(w => w.length > 1));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++;
  }
  return overlap / Math.max(wordsA.size, wordsB.size);
}

/**
 * 스냅샷 히스토리를 분석하여 수렴 메트릭을 계산한다.
 * round 0부터 현재까지의 스냅샷을 받아야 한다.
 */
export function assessConvergence(snapshots: AnalysisSnapshot[]): ConvergenceMetrics {
  if (snapshots.length === 0) {
    return {
      score: 0,
      trend: 'unclear',
      is_converged: false,
      estimated_rounds_left: 5,
      guidance: '분석을 시작해야 합니다.',
    };
  }

  if (snapshots.length === 1) {
    const confidence = snapshots[0].framing_confidence ?? 70;
    return {
      score: Math.min(confidence, 40), // 1라운드로는 최대 40
      trend: 'unclear',
      is_converged: false,
      estimated_rounds_left: 2,
      guidance: '첫 분석입니다. 질문에 답하면 정교해집니다.',
    };
  }

  // ── 1. 질문 안정성 (0-40점) ──
  const questions = snapshots.map(s => s.real_question);
  let stabilityScore = 40;
  let lastSimilarity = 1;
  for (let i = 1; i < questions.length; i++) {
    const similarity = wordOverlap(questions[i - 1], questions[i]);
    if (similarity < 0.5) {
      // 질문이 크게 바뀜 → 아직 수렴 안 됨
      stabilityScore -= 15;
    } else if (similarity < 0.75) {
      // 약간 바뀜 → 조정 중
      stabilityScore -= 5;
    }
    lastSimilarity = similarity;
  }
  stabilityScore = Math.max(0, stabilityScore);

  // ── 2. 가정 감소 추세 (0-30점) ──
  const assumptionCounts = snapshots.map(s => s.hidden_assumptions.length);
  let assumptionScore = 15; // 기본
  if (assumptionCounts.length >= 2) {
    const recent = assumptionCounts.slice(-2);
    if (recent[1] <= recent[0]) {
      assumptionScore = 30; // 줄어들고 있음 → 좋음
    } else if (recent[1] > recent[0] + 2) {
      assumptionScore = 5;  // 급격히 늘어남 → 불안정
    }
  }

  // ── 3. 프레이밍 확신도 (0-30점) ──
  const latestConfidence = snapshots[snapshots.length - 1].framing_confidence ?? 70;
  const confidenceScore = Math.round(latestConfidence * 0.3);

  // ── 종합 ──
  const totalScore = Math.min(100, stabilityScore + assumptionScore + confidenceScore);

  // 추세 판단
  let trend: ConvergenceMetrics['trend'] = 'unclear';
  if (snapshots.length >= 3) {
    const recentScores = snapshots.slice(-3).map((s, i) => {
      const sim = i > 0 ? wordOverlap(questions[questions.length - 3 + i - 1], questions[questions.length - 3 + i]) : 0.5;
      return sim;
    });
    const avgSimilarity = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    if (avgSimilarity > 0.75) trend = 'stable';
    else if (lastSimilarity > 0.7 && assumptionScore >= 20) trend = 'improving';
    else trend = 'declining';
  } else if (lastSimilarity > 0.6) {
    trend = 'improving';
  }

  const is_converged = totalScore >= 75;
  const estimated_rounds_left = is_converged ? 0 : totalScore >= 60 ? 1 : totalScore >= 40 ? 2 : 3;

  let guidance: string;
  if (is_converged) {
    guidance = '구조가 안정됐습니다. Mix로 넘어갈 수 있습니다.';
  } else if (totalScore >= 60) {
    guidance = '거의 다 왔습니다. 한 라운드만 더.';
  } else if (totalScore >= 40) {
    guidance = '방향은 잡혔지만 아직 날카롭지 않습니다.';
  } else if (trend === 'declining') {
    guidance = '질문이 계속 바뀌고 있습니다. 문제를 다시 정의해보세요.';
  } else {
    guidance = '아직 명확하지 않습니다. 질문에 답하면서 좁혀갑시다.';
  }

  return {
    score: totalScore,
    trend,
    is_converged,
    estimated_rounds_left,
    guidance,
  };
}

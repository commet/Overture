/**
 * Context Compaction — Claude Code 4-layer compact 패턴 적용
 *
 * Progressive Flow에서 Q&A가 쌓일수록 컨텍스트가 커짐.
 * 오래된 Q&A를 요약하여 토큰 예산을 관리하고, 더 깊은 대화를 가능하게 함.
 *
 * 전략:
 * - 최근 2라운드는 원문 유지 (디테일 중요)
 * - 그 이전은 핵심만 추출하여 1줄로 압축
 * - snapshot은 최신 것만 전체, 이전은 delta만 기록
 */

import type { FlowQuestion, FlowAnswer, AnalysisSnapshot } from '@/stores/types';

interface QAPair {
  question: FlowQuestion;
  answer: FlowAnswer;
}

/** 최근 N개를 제외한 Q&A를 압축하여 반환 */
export function compactQAHistory(
  questionsAndAnswers: QAPair[],
  keepRecent = 2
): string {
  if (questionsAndAnswers.length <= keepRecent) {
    // 전부 원문 유지
    return questionsAndAnswers.map((qa, i) =>
      `Q${i + 1}: ${qa.question.text}\nA${i + 1}: ${qa.answer.value}`,
    ).join('\n\n');
  }

  const older = questionsAndAnswers.slice(0, -keepRecent);
  const recent = questionsAndAnswers.slice(-keepRecent);
  const recentStartIndex = older.length;

  // 오래된 Q&A는 핵심만 추출
  const compactedOlder = older.map((qa, i) => {
    const answer = qa.answer.value;
    // 긴 답변은 첫 문장 + "..." 으로 축약
    const shortAnswer = answer.length > 100
      ? answer.slice(0, 100).replace(/[.。!?](?=[^.。!?]*$).*/, '...') || answer.slice(0, 100) + '...'
      : answer;
    return `[R${i + 1}] ${qa.question.text} → ${shortAnswer}`;
  }).join('\n');

  // 최근 Q&A는 원문 유지
  const fullRecent = recent.map((qa, i) => {
    const idx = recentStartIndex + i + 1;
    return `Q${idx}: ${qa.question.text}\nA${idx}: ${qa.answer.value}`;
  }).join('\n\n');

  return `[이전 라운드 요약]\n${compactedOlder}\n\n[최근 대화]\n${fullRecent}`;
}

/** 스냅샷 히스토리를 압축: 최신만 전체, 이전은 delta만 */
export function compactSnapshots(
  snapshots: AnalysisSnapshot[]
): string {
  if (snapshots.length <= 1) {
    const s = snapshots[0];
    if (!s) return '(분석 없음)';
    return formatSnapshot(s);
  }

  const latest = snapshots[snapshots.length - 1];
  const previousInsights = snapshots
    .slice(0, -1)
    .filter(s => s.insight)
    .map((s, i) => `v${i}: ${s.insight}`)
    .join(' → ');

  const lines = [formatSnapshot(latest)];
  if (previousInsights) {
    lines.push(`[인사이트 흐름] ${previousInsights}`);
  }

  return lines.join('\n');
}

function formatSnapshot(s: AnalysisSnapshot): string {
  const lines = [
    `- 진짜 질문: ${s.real_question}`,
    `- 숨겨진 전제: ${s.hidden_assumptions.join(' / ')}`,
    `- 뼈대: ${s.skeleton.join(' → ')}`,
  ];
  if (s.execution_plan) {
    lines.push(`- 실행계획: ${s.execution_plan.steps.map(st => st.task).join(' → ')}`);
  }
  if (s.insight) {
    lines.push(`- 최신 인사이트: ${s.insight}`);
  }
  return lines.join('\n');
}

/** 현재 컨텍스트의 대략적 토큰 수 추정 (~4 bytes/token) */
export function estimateTokens(text: string): number {
  // 한국어는 ~2 chars/token, 영어는 ~4 chars/token
  // 보수적으로 2.5 chars/token
  return Math.ceil(text.length / 2.5);
}

/** 컨텍스트가 토큰 예산을 초과하는지 체크 */
export function shouldCompact(
  questionsAndAnswers: QAPair[],
  maxTokenBudget = 3000
): boolean {
  const raw = questionsAndAnswers.map((qa) =>
    qa.question.text + qa.answer.value
  ).join('');
  return estimateTokens(raw) > maxTokenBudget;
}

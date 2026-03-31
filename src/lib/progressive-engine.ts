/**
 * Progressive Engine — LLM 호출 + 상태 전이 오케스트레이션
 */

import { callLLMJson, callLLMStreamThenParse } from '@/lib/llm';
import {
  buildInitialAnalysisPrompt,
  buildDeepeningPrompt,
  buildMixPrompt,
  buildDMFeedbackPrompt,
  buildFinalDeliverablePrompt,
} from '@/lib/progressive-prompts';
import { generateId } from '@/lib/uuid';
import type {
  AnalysisSnapshot,
  FlowQuestion,
  FlowAnswer,
  MixResult,
  DMFeedbackResult,
  DMConcern,
} from '@/stores/types';

// ─── Response shapes from LLM ───

interface InitialAnalysisResponse {
  real_question: string;
  why_this_matters?: string;
  hidden_assumptions: string[];
  skeleton: string[];
  next_question: {
    text: string;
    subtext?: string;
    options?: string[];
    type: 'select' | 'short';
  };
  detected_decision_maker: string | null;
}

interface DeepeningResponse {
  insight: string;
  real_question: string;
  hidden_assumptions: string[];
  skeleton: string[];
  execution_plan?: {
    steps: { task: string; who: 'ai' | 'human' | 'both'; output: string }[];
    key_assumptions: string[];
  };
  next_question: {
    text: string;
    subtext?: string;
    options?: string[];
    type: 'select' | 'short';
  } | null;
  ready_for_mix: boolean;
}

interface MixResponse {
  title: string;
  executive_summary: string;
  sections: { heading: string; content: string }[];
  key_assumptions: string[];
  next_steps: string[];
}

interface DMFeedbackResponse {
  persona_name: string;
  persona_role: string;
  first_reaction: string;
  good_parts: string[];
  concerns: {
    text: string;
    severity: 'critical' | 'important' | 'minor';
    fix_suggestion: string;
  }[];
  would_ask: string[];
  approval_condition: string;
}

interface FinalResponse {
  title: string;
  executive_summary: string;
  sections: { heading: string; content: string }[];
  key_assumptions: string[];
  next_steps: string[];
  changes_applied?: string[];
}

// ─── Engine functions ───

/**
 * Step 1: 초기 분석 — 문제 입력 → 즉시 뼈대 + 첫 질문
 * @param onToken - 스트리밍 콜백 (있으면 실시간 출력 표시)
 */
export async function runInitialAnalysis(
  problemText: string,
  onToken?: (text: string) => void,
): Promise<{
  snapshot: AnalysisSnapshot;
  question: FlowQuestion;
  detectedDM: string | null;
}> {
  const { system, user } = buildInitialAnalysisPrompt(problemText);

  // 스트리밍 콜백이 있으면 실시간 표시 후 JSON 파싱, 없으면 기존 방식
  const result = onToken
    ? await callLLMStreamThenParse<InitialAnalysisResponse>(
        [{ role: 'user', content: user }],
        { system, maxTokens: 2000 },
        onToken,
      )
    : await callLLMJson<InitialAnalysisResponse>(
        [{ role: 'user', content: user }],
        { system, maxTokens: 2000 },
      );

  const snapshot: AnalysisSnapshot = {
    version: 0,
    real_question: result.real_question || '분석 중...',
    hidden_assumptions: result.hidden_assumptions || [],
    skeleton: result.skeleton || [],
  };

  const question: FlowQuestion = {
    id: generateId(),
    text: result.next_question?.text || '이 결과물을 누가 최종 판단해?',
    subtext: result.next_question?.subtext,
    options: result.next_question?.options,
    type: result.next_question?.type || 'select',
    engine_phase: 'reframe',
  };

  return {
    snapshot,
    question,
    detectedDM: result.detected_decision_maker || null,
  };
}

/**
 * Step 2+: 심화 분석 — 답변 반영 → 업데이트된 분석 + 다음 질문
 */
export async function runDeepening(
  problemText: string,
  currentSnapshot: AnalysisSnapshot,
  questionsAndAnswers: Array<{ question: FlowQuestion; answer: FlowAnswer }>,
  round: number,
  maxRounds: number,
  onToken?: (text: string) => void,
): Promise<{
  snapshot: AnalysisSnapshot;
  question: FlowQuestion | null;
  readyForMix: boolean;
}> {
  const { system, user } = buildDeepeningPrompt(
    problemText, currentSnapshot, questionsAndAnswers, round, maxRounds,
  );

  const result = onToken
    ? await callLLMStreamThenParse<DeepeningResponse>(
        [{ role: 'user', content: user }],
        { system, maxTokens: 3000 },
        onToken,
      )
    : await callLLMJson<DeepeningResponse>(
        [{ role: 'user', content: user }],
        { system, maxTokens: 3000 },
      );

  const snapshot: AnalysisSnapshot = {
    version: currentSnapshot.version + 1,
    real_question: result.real_question || currentSnapshot.real_question,
    hidden_assumptions: result.hidden_assumptions || currentSnapshot.hidden_assumptions,
    skeleton: result.skeleton || currentSnapshot.skeleton,
    execution_plan: result.execution_plan || currentSnapshot.execution_plan,
    insight: result.insight,
  };

  const question: FlowQuestion | null = result.next_question
    ? {
        id: generateId(),
        text: result.next_question.text,
        subtext: result.next_question.subtext,
        options: result.next_question.options,
        type: result.next_question.type || 'select',
        engine_phase: round >= 1 ? 'recast' : 'reframe',
      }
    : null;

  return {
    snapshot,
    question,
    readyForMix: result.ready_for_mix ?? (round >= maxRounds - 1),
  };
}

/**
 * Step Mix: 최종 초안 조합
 */
export async function runMix(
  problemText: string,
  snapshots: AnalysisSnapshot[],
  questionsAndAnswers: Array<{ question: FlowQuestion; answer: FlowAnswer }>,
  decisionMaker: string | null,
): Promise<MixResult> {
  const { system, user } = buildMixPrompt(
    problemText, snapshots, questionsAndAnswers, decisionMaker,
  );

  const result = await callLLMJson<MixResponse>(
    [{ role: 'user', content: user }],
    { system, maxTokens: 4000 },
  );

  return {
    title: result.title || '기획안',
    executive_summary: result.executive_summary || '',
    sections: result.sections || [],
    key_assumptions: result.key_assumptions || [],
    next_steps: result.next_steps || [],
  };
}

/**
 * Step DM: 판단자 피드백 생성
 */
export async function runDMFeedback(
  mix: MixResult,
  decisionMaker: string,
  problemContext: string,
): Promise<DMFeedbackResult> {
  const { system, user } = buildDMFeedbackPrompt(mix, decisionMaker, problemContext);

  const result = await callLLMJson<DMFeedbackResponse>(
    [{ role: 'user', content: user }],
    { system, maxTokens: 2500 },
  );

  return {
    persona_name: result.persona_name || decisionMaker,
    persona_role: result.persona_role || '',
    first_reaction: result.first_reaction || '',
    good_parts: result.good_parts || [],
    concerns: (result.concerns || []).map((c): DMConcern => ({
      text: c.text,
      severity: c.severity || 'important',
      fix_suggestion: c.fix_suggestion || '',
      applied: c.severity === 'critical', // critical은 기본 체크
    })),
    would_ask: result.would_ask || [],
    approval_condition: result.approval_condition || '',
  };
}

/**
 * Step Final: 피드백 반영 후 최종 문서
 */
export async function runFinalDeliverable(
  mix: MixResult,
  dmFeedback: DMFeedbackResult,
): Promise<string> {
  const appliedFixes = dmFeedback.concerns
    .filter(c => c.applied)
    .map(c => ({ concern: c.text, fix: c.fix_suggestion }));

  if (appliedFixes.length === 0) {
    // 반영할 것 없으면 mix를 그대로 마크다운으로 변환
    return formatMixAsMarkdown(mix);
  }

  const { system, user } = buildFinalDeliverablePrompt(mix, appliedFixes);

  const result = await callLLMJson<FinalResponse>(
    [{ role: 'user', content: user }],
    { system, maxTokens: 4000 },
  );

  const finalMix: MixResult = {
    title: result.title || mix.title,
    executive_summary: result.executive_summary || mix.executive_summary,
    sections: result.sections || mix.sections,
    key_assumptions: result.key_assumptions || mix.key_assumptions,
    next_steps: result.next_steps || mix.next_steps,
  };

  return formatMixAsMarkdown(finalMix, result.changes_applied);
}

// ─── Helpers ───

function formatMixAsMarkdown(mix: MixResult, changes?: string[]): string {
  const lines: string[] = [
    `# ${mix.title}`,
    '',
    `> ${mix.executive_summary}`,
    '',
  ];

  for (const section of mix.sections) {
    lines.push(`## ${section.heading}`, '', section.content, '');
  }

  if (mix.key_assumptions.length > 0) {
    lines.push('## 전제 조건', '');
    for (const a of mix.key_assumptions) {
      lines.push(`- ${a}`);
    }
    lines.push('');
  }

  if (mix.next_steps.length > 0) {
    lines.push('## 다음 단계', '');
    for (const s of mix.next_steps) {
      lines.push(`- ${s}`);
    }
    lines.push('');
  }

  if (changes && changes.length > 0) {
    lines.push('---', '', '*반영된 수정사항:*');
    for (const c of changes) {
      lines.push(`- ${c}`);
    }
  }

  return lines.join('\n');
}

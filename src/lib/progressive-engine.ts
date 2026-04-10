/**
 * Progressive Engine — LLM 호출 + 상태 전이 오케스트레이션
 */

import { callLLMJson, callLLMStreamThenParse } from '@/lib/llm';
import {
  buildInitialAnalysisPrompt,
  buildInitialRefinementPrompt,
  buildDeepeningPrompt,
  buildMixPrompt,
  buildFinalDeliverablePrompt,
  buildConcertmasterReviewPrompt,
} from '@/lib/progressive-prompts';
import { buildReviewPrompt } from '@/lib/review-prompt';
import type { Agent } from '@/stores/agent-types';
import { assessConvergence, assessConvergenceWithWorkers } from '@/lib/progressive-convergence';
import { runDebateRound, type DebateResult } from '@/lib/debate-engine';
import { generateId } from '@/lib/uuid';
import { useAgentStore } from '@/stores/useAgentStore';
import { getCurrentLanguage } from '@/lib/i18n';
import type {
  AnalysisSnapshot,
  ConvergenceMetrics,
  FlowQuestion,
  FlowAnswer,
  MixResult,
  DMFeedbackResult,
  DMConcern,
  LeadSynthesisResult,
} from '@/stores/types';
import { buildLeadSynthesisPrompt, type LeadAgentConfig } from '@/lib/lead-agent';

// ─── Response shapes from LLM ───

interface InitialAnalysisResponse {
  real_question: string;
  framing_confidence?: number;
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

interface ExecutionPlanStep {
  task: string;
  who?: 'ai' | 'human' | 'both';                 // legacy
  agent_type?: 'ai' | 'self' | 'human';           // v2
  output: string;
  ai_scope?: string;
  self_scope?: string;
  decision?: string;
  agent_hint?: string;
  question_to_human?: string;
  human_contact_hint?: string;
}

interface DeepeningResponse {
  insight: string;
  real_question: string;
  hidden_assumptions: string[];
  skeleton: string[];
  execution_plan?: {
    steps: ExecutionPlanStep[];
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
  signal?: AbortSignal,
): Promise<{
  snapshot: AnalysisSnapshot;
  question: FlowQuestion;
  detectedDM: string | null;
}> {
  const locale = getCurrentLanguage();
  const { system, user } = buildInitialAnalysisPrompt(problemText, locale);

  // Stream: real-time display then JSON parse, or standard approach
  const result = onToken
    ? await callLLMStreamThenParse<InitialAnalysisResponse>(
        [{ role: 'user', content: user }],
        { system, maxTokens: 2000, signal, shape: { real_question: 'string', hidden_assumptions: 'array', skeleton: 'array', next_question: 'object' } },
        onToken,
      )
    : await callLLMJson<InitialAnalysisResponse>(
        [{ role: 'user', content: user }],
        { system, maxTokens: 2000, signal, shape: { real_question: 'string', hidden_assumptions: 'array', skeleton: 'array', next_question: 'object' } },
      );

  const framingConfidence = Math.min(100, Math.max(0, result.framing_confidence ?? 75));

  const snapshot: AnalysisSnapshot = {
    version: 0,
    real_question: result.real_question || (locale === 'ko' ? '분석 중...' : 'Analyzing...'),
    hidden_assumptions: result.hidden_assumptions || [],
    skeleton: result.skeleton || [],
    framing_confidence: framingConfidence,
    framing_locked: false,
  };

  const question: FlowQuestion = {
    id: generateId(),
    text: result.next_question?.text || (locale === 'ko' ? '이 결과물을 누가 최종 판단해?' : 'Who will make the final decision on this?'),
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
 * Step 1b: 프레이밍 재분석 — 사용자가 Round 1 질문을 거부했을 때
 */
export async function refineInitialFraming(
  problemText: string,
  rejectedQuestion: string,
  rejectionReason: string,
  onToken?: (text: string) => void,
  signal?: AbortSignal,
): Promise<{
  snapshot: AnalysisSnapshot;
  question: FlowQuestion;
  detectedDM: string | null;
}> {
  const locale = getCurrentLanguage();
  const { system, user } = buildInitialRefinementPrompt(
    problemText, rejectedQuestion, rejectionReason, locale,
  );

  const result = onToken
    ? await callLLMStreamThenParse<InitialAnalysisResponse>(
        [{ role: 'user', content: user }],
        { system, maxTokens: 2000, signal, shape: { real_question: 'string', hidden_assumptions: 'array', skeleton: 'array', next_question: 'object' } },
        onToken,
      )
    : await callLLMJson<InitialAnalysisResponse>(
        [{ role: 'user', content: user }],
        { system, maxTokens: 2000, signal, shape: { real_question: 'string', hidden_assumptions: 'array', skeleton: 'array', next_question: 'object' } },
      );

  const framingConfidence = Math.min(100, Math.max(0, result.framing_confidence ?? 70));

  const snapshot: AnalysisSnapshot = {
    version: 0,
    real_question: result.real_question || (locale === 'ko' ? '분석 중...' : 'Analyzing...'),
    hidden_assumptions: result.hidden_assumptions || [],
    skeleton: result.skeleton || [],
    framing_confidence: framingConfidence,
    framing_locked: false,
    framing_override_reason: rejectionReason,
  };

  return {
    snapshot,
    question: {
      id: generateId(),
      text: result.next_question?.text || (locale === 'ko' ? '이제 이 방향이 맞나요?' : 'Does this direction look right now?'),
      subtext: result.next_question?.subtext,
      options: result.next_question?.options,
      type: result.next_question?.type || 'select',
      engine_phase: 'reframe',
    },
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
  allSnapshots: AnalysisSnapshot[],
  onToken?: (text: string) => void,
  signal?: AbortSignal,
  leadContext?: string,
  registeredPersonas?: Array<{ name: string; role: string; hasContact: boolean }>,
): Promise<{
  snapshot: AnalysisSnapshot;
  question: FlowQuestion | null;
  readyForMix: boolean;
  convergenceMetrics: ConvergenceMetrics;
}> {
  const locale = getCurrentLanguage();
  // Conductor: pass unlocked agent list for team-aware task decomposition
  const agentStore = useAgentStore.getState();
  const isKo = locale === 'ko';
  const availableAgents = agentStore.getUnlockedAgents()
    .filter(a => a.capabilities.includes('task_execution'))
    .map(a => ({
      name: isKo ? a.name : (a.nameEn || a.name),
      role: isKo ? a.role : (a.roleEn || a.role),
      specialty: a.expertise?.split('.')[0] || a.role,
    }));

  const { system, user } = buildDeepeningPrompt(
    problemText, currentSnapshot, questionsAndAnswers, round, maxRounds, availableAgents, locale, leadContext, registeredPersonas,
  );

  const result = onToken
    ? await callLLMStreamThenParse<DeepeningResponse>(
        [{ role: 'user', content: user }],
        { system, maxTokens: 2000, signal, shape: { insight: 'string', real_question: 'string', hidden_assumptions: 'array', skeleton: 'array', ready_for_mix: 'boolean' } },
        onToken,
      )
    : await callLLMJson<DeepeningResponse>(
        [{ role: 'user', content: user }],
        { system, maxTokens: 2000, signal, shape: { insight: 'string', real_question: 'string', hidden_assumptions: 'array', skeleton: 'array', ready_for_mix: 'boolean' } },
      );

  const snapshot: AnalysisSnapshot = {
    version: currentSnapshot.version + 1,
    real_question: result.real_question || currentSnapshot.real_question,
    hidden_assumptions: result.hidden_assumptions || currentSnapshot.hidden_assumptions,
    skeleton: result.skeleton || currentSnapshot.skeleton,
    execution_plan: result.execution_plan || currentSnapshot.execution_plan,
    insight: result.insight,
    framing_confidence: currentSnapshot.framing_confidence,
    framing_locked: currentSnapshot.framing_locked,
  };

  // Adaptive convergence: 스냅샷 전체 + 새 스냅샷으로 수렴도 계산
  const convergence = assessConvergence([...allSnapshots, snapshot]);
  snapshot.convergence_score = convergence.score;
  snapshot.convergence_trend = convergence.trend;

  // LLM이 ready라고 했거나, 수렴도가 충분하면 Mix 가능
  const llmSaysReady = result.ready_for_mix === true;
  const convergenceSaysReady = convergence.is_converged;
  const isMaxRound = round >= maxRounds - 1;

  // 적응형 수렴: 최대 라운드라도 수렴 안 됐으면 강제하지 않음 → 대신 선택지 제시
  let shouldProceedToMix: boolean;
  let question: FlowQuestion | null;

  if (llmSaysReady || convergenceSaysReady) {
    // 수렴 완료
    shouldProceedToMix = true;
    question = null;
  } else if (isMaxRound && !convergenceSaysReady) {
    // 최대 라운드인데 수렴 안 됨 → 사용자에게 선택지 제시
    shouldProceedToMix = false;
    question = {
      id: generateId(),
      text: locale === 'ko'
        ? `아직 완전히 명확하지 않습니다 (명확도: ${convergence.score}%). 어떻게 할까요?`
        : `Not fully clear yet (clarity: ${convergence.score}%). What would you like to do?`,
      subtext: convergence.guidance,
      options: locale === 'ko'
        ? ['지금 바로 문서로 만들기', '한 라운드 더 진행하기', '문제를 다시 정의하기']
        : ['Create the document now', 'Go one more round', 'Redefine the problem'],
      type: 'select',
      engine_phase: 'reframe',
    };
  } else {
    // 아직 진행 중
    shouldProceedToMix = false;
    question = result.next_question
      ? {
          id: generateId(),
          text: result.next_question.text,
          subtext: result.next_question.subtext,
          options: result.next_question.options,
          type: result.next_question.type || 'select',
          engine_phase: round >= 1 ? 'recast' : 'reframe',
        }
      : null;
  }

  return {
    snapshot,
    question,
    readyForMix: shouldProceedToMix,
    convergenceMetrics: convergence,
  };
}

/**
 * Step Lead Synthesis: Lead agent integrates all worker results
 */
export async function runLeadSynthesis(
  problemText: string,
  realQuestion: string,
  workerResults: Array<{ agentName: string; agentRole: string; task: string; result: string }>,
  leadConfig: LeadAgentConfig,
  signal?: AbortSignal,
): Promise<LeadSynthesisResult> {
  const locale = getCurrentLanguage();
  const { system, user } = buildLeadSynthesisPrompt(
    leadConfig, problemText, realQuestion, workerResults, locale,
  );

  const result = await callLLMJson<{
    integrated_analysis: string;
    key_findings: string[];
    unresolved_tensions: string[];
    recommendation_direction: string;
  }>(
    [{ role: 'user', content: user }],
    { system, maxTokens: 3000, signal, shape: { integrated_analysis: 'string', key_findings: 'array', unresolved_tensions: 'array', recommendation_direction: 'string' } },
  );

  // Record XP for the lead agent
  useAgentStore.getState().recordActivity(
    leadConfig.agentId, 'synthesis_completed', problemText.slice(0, 100),
  );

  return {
    lead_agent_id: leadConfig.agentId,
    lead_agent_name: locale === 'ko' ? leadConfig.agentName : leadConfig.agentNameEn,
    integrated_analysis: result.integrated_analysis || '',
    key_findings: result.key_findings || [],
    unresolved_tensions: result.unresolved_tensions || [],
    recommendation_direction: result.recommendation_direction || '',
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
  workerResults?: Array<{ task: string; result: string }>,
  signal?: AbortSignal,
  leadSynthesis?: LeadSynthesisResult | null,
): Promise<MixResult> {
  const locale = getCurrentLanguage();
  const { system, user } = buildMixPrompt(
    problemText, snapshots, questionsAndAnswers, decisionMaker, workerResults, locale, leadSynthesis,
  );

  const result = await callLLMJson<MixResponse>(
    [{ role: 'user', content: user }],
    { system, maxTokens: 4000, signal, shape: { title: 'string', executive_summary: 'string', sections: 'array', key_assumptions: 'array', next_steps: 'array' } },
  );

  return {
    title: result.title || (locale === 'ko' ? '기획안' : 'Proposal'),
    executive_summary: result.executive_summary || '',
    sections: result.sections || [],
    key_assumptions: result.key_assumptions || [],
    next_steps: result.next_steps || [],
  };
}

/**
 * Step DM: 판단자 피드백 생성 (unified review-prompt)
 */
export async function runDMFeedback(
  mix: MixResult,
  decisionMaker: string,
  problemContext: string,
  signal?: AbortSignal,
  mode: 'quick' | 'deep' = 'quick',
): Promise<DMFeedbackResult> {
  const locale = getCurrentLanguage();
  const docText = formatMixForReview(mix);

  const { system, user } = buildReviewPrompt(
    { name: decisionMaker, role: decisionMaker },
    docText,
    problemContext,
    { mode, locale },
  );

  const result = await callLLMJson<DMFeedbackResponse>(
    [{ role: 'user', content: user }],
    { system, maxTokens: 2000, signal, shape: { first_reaction: 'string', good_parts: 'array', concerns: 'array', approval_condition: 'string' } },
  );

  return dmResponseToResult(result, decisionMaker, '', locale);
}

/**
 * Step DM (Boss): Boss agent 성격 기반 피드백 (unified review-prompt)
 */
export async function runBossDMFeedback(
  mix: MixResult,
  agent: Agent,
  problemContext: string,
  signal?: AbortSignal,
  mode: 'quick' | 'deep' = 'quick',
): Promise<DMFeedbackResult> {
  const locale = getCurrentLanguage();
  const docText = formatMixForReview(mix);

  const { system, user } = buildReviewPrompt(
    { name: agent.name, role: agent.role || (locale === 'ko' ? '팀장' : 'Team Lead') },
    docText,
    problemContext,
    { mode, locale, agent },
  );

  const result = await callLLMJson<DMFeedbackResponse>(
    [{ role: 'user', content: user }],
    { system, maxTokens: 2000, signal, shape: { first_reaction: 'string', good_parts: 'array', concerns: 'array', approval_condition: 'string' } },
  );

  return dmResponseToResult(result, agent.name, agent.role || (locale === 'ko' ? '팀장' : 'Team Lead'), locale);
}

// ── Helpers ──

function formatMixForReview(mix: MixResult): string {
  return [
    `# ${mix.title}`,
    `> ${mix.executive_summary}`,
    ...mix.sections.map(s => `## ${s.heading}\n${s.content}`),
    `## ${getCurrentLanguage() === 'ko' ? '핵심 가정' : 'Key Assumptions'}\n${mix.key_assumptions.map(a => `- ${a}`).join('\n')}`,
    `## ${getCurrentLanguage() === 'ko' ? '다음 단계' : 'Next Steps'}\n${mix.next_steps.map(s => `- ${s}`).join('\n')}`,
  ].join('\n\n');
}

function dmResponseToResult(
  result: DMFeedbackResponse,
  fallbackName: string,
  fallbackRole: string,
  locale: string,
): DMFeedbackResult {
  return {
    persona_name: result.persona_name || fallbackName,
    persona_role: result.persona_role || fallbackRole,
    first_reaction: result.first_reaction || '',
    good_parts: result.good_parts || [],
    concerns: (result.concerns || []).filter(c => !!c && typeof c === 'object').map((c): DMConcern => ({
      text: String(c.text || ''),
      severity: c.severity || 'important',
      fix_suggestion: String(c.fix_suggestion || ''),
      applied: c.severity === 'critical',
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
  signal?: AbortSignal,
): Promise<string> {
  const appliedFixes = dmFeedback.concerns
    .filter(c => c.applied)
    .map(c => ({ concern: c.text, fix: c.fix_suggestion }));

  const locale = getCurrentLanguage();
  if (appliedFixes.length === 0) {
    return formatMixAsMarkdown(mix, undefined, locale);
  }

  const { system, user } = buildFinalDeliverablePrompt(mix, appliedFixes, locale);

  const result = await callLLMJson<FinalResponse>(
    [{ role: 'user', content: user }],
    { system, maxTokens: 4000, signal, shape: { title: 'string', executive_summary: 'string', sections: 'array' } },
  );

  const finalMix: MixResult = {
    title: result.title || mix.title,
    executive_summary: result.executive_summary || mix.executive_summary,
    sections: result.sections || mix.sections,
    key_assumptions: result.key_assumptions || mix.key_assumptions,
    next_steps: result.next_steps || mix.next_steps,
  };

  return formatMixAsMarkdown(finalMix, result.changes_applied, locale);
}

// ─── Helpers ───

function formatMixAsMarkdown(mix: MixResult, changes?: string[], locale: 'ko' | 'en' = 'en'): string {
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
    lines.push(locale === 'ko' ? '## 전제 조건' : '## Key Assumptions', '');
    for (const a of mix.key_assumptions) {
      lines.push(`- ${a}`);
    }
    lines.push('');
  }

  if (mix.next_steps.length > 0) {
    lines.push(locale === 'ko' ? '## 다음 단계' : '## Next Steps', '');
    for (const s of mix.next_steps) {
      lines.push(`- ${s}`);
    }
    lines.push('');
  }

  if (changes && changes.length > 0) {
    lines.push('---', '', locale === 'ko' ? '*반영된 수정사항:*' : '*Changes applied:*');
    for (const c of changes) {
      lines.push(`- ${c}`);
    }
  }

  return lines.join('\n');
}

// ─── Concertmaster 메타 리뷰 ───

export interface ConcertmasterReview {
  overall: string;
  contradictions: string[];
  blind_spots: string[];
  verdict: string;
}

export async function runConcertmasterReview(
  problemText: string,
  workerResults: Array<{ agentName: string; agentRole: string; task: string; result: string }>,
  signal?: AbortSignal,
): Promise<ConcertmasterReview | null> {
  const concertmaster = useAgentStore.getState().getAgent('concertmaster');
  if (!concertmaster?.unlocked) return null;

  const locale = getCurrentLanguage();
  const { system, user } = buildConcertmasterReviewPrompt(problemText, workerResults, locale);

  try {
    const result = await callLLMJson<ConcertmasterReview>(
      [{ role: 'user', content: user }],
      { system, maxTokens: 500, signal, shape: { overall: 'string', contradictions: 'array', blind_spots: 'array', verdict: 'string' } },
    );

    // 악장 XP 적립
    useAgentStore.getState().recordActivity('concertmaster', 'review_given', problemText.slice(0, 100));

    return result;
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[concertmaster-review] failed:', err instanceof Error ? err.message : err);
    }
    return null;
  }
}

/* ─── Cross-Agent Debate (Phase 5) ─── */

export type { DebateResult };

/**
 * Critical stakes에서 Stage 1 결과에 대해 Critic이 반론을 생성.
 * runConcertmasterReview 이후에 호출. LLM 1회.
 */
export async function runDebate(
  problemText: string,
  workerResults: Array<{ agentName: string; agentRole: string; framework: string | null; result: string }>,
): Promise<DebateResult | null> {
  // Critic 에이전트 찾기
  const agents = useAgentStore.getState().getUnlockedAgents();
  const critic = agents.find(a => (a.keywords || []).some(kw => ['리스크', '위험', '비판', 'risk', 'danger', 'critique'].includes(kw)));
  if (!critic) return null;

  return runDebateRound({
    problemText,
    stage1Results: workerResults,
    criticName: critic.name,
    criticExpertise: critic.expertise || critic.role,
  });
}

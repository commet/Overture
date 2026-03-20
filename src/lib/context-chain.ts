/**
 * Context Chain — Phase 0: 타입드 맥락 파이프라인
 *
 * 각 단계의 산출물을 구조화된 데이터로 추출하여
 * 다음 단계에 정확하게 전달한다.
 * 마크다운 연결이 아닌 타입 안전 파이프라인.
 */

import type {
  DecomposeItem,
  DecomposeContext,
  OrchestrateItem,
  OrchestrateContext,
  RehearsalContext,
  FeedbackRecord,
  HiddenAssumption,
  KeyAssumption,
} from '@/stores/types';

/* ────────────────────────────────────
   Decompose → typed context
   ──────────────────────────────────── */

export function buildDecomposeContext(item: DecomposeItem): DecomposeContext {
  const analysis = item.analysis;
  if (!analysis) {
    return {
      surface_task: item.input_text,
      reframed_question: '',
      why_reframing_matters: '',
      selected_direction: '',
      unverified_assumptions: [],
      verified_assumptions: [],
      ai_limitations: [],
    };
  }

  // Normalize assumptions (handle legacy string[] format)
  const assumptions: HiddenAssumption[] = (analysis.hidden_assumptions || []).map((a: any) =>
    typeof a === 'string' ? { assumption: a, risk_if_false: '', verified: false } : a
  );

  // Extract interview signals from input_text if present
  const interviewSignals = extractInterviewSignals(item.input_text);

  return {
    surface_task: analysis.surface_task,
    reframed_question: analysis.reframed_question || analysis.hypothesis || '',
    why_reframing_matters: analysis.why_reframing_matters || '',
    selected_direction: item.selected_question || analysis.reframed_question || '',
    unverified_assumptions: assumptions.filter(a => !a.verified),
    verified_assumptions: assumptions.filter(a => a.verified),
    ai_limitations: analysis.ai_limitations || [],
    interview_signals: interviewSignals,
  };
}

/* ────────────────────────────────────
   Orchestrate → typed context
   ──────────────────────────────────── */

export function buildOrchestrateContext(item: OrchestrateItem): OrchestrateContext {
  const analysis = item.analysis;
  const steps = item.steps.length > 0 ? item.steps : analysis?.steps || [];

  return {
    governing_idea: analysis?.governing_idea || '',
    storyline: analysis?.storyline,
    steps,
    key_assumptions: analysis?.key_assumptions || [],
    critical_path: analysis?.critical_path || [],
    design_rationale: analysis?.design_rationale,
  };
}

/* ────────────────────────────────────
   Rehearsal → typed context
   ──────────────────────────────────── */

export function buildRehearsalContext(records: FeedbackRecord[]): RehearsalContext {
  if (records.length === 0) {
    return {
      classified_risks: [],
      untested_assumptions: [],
      approval_conditions: {},
      failure_scenarios: [],
    };
  }

  const latest = records[records.length - 1];

  const allRisks = latest.results.flatMap(r => r.classified_risks || []);
  const allUntested = latest.results.flatMap(r => r.untested_assumptions || []);
  const allFailures = latest.results
    .map(r => r.failure_scenario)
    .filter(Boolean);

  // Group approval conditions by persona
  const approvalConditions: Record<string, string[]> = {};
  for (const result of latest.results) {
    if (result.approval_conditions?.length > 0) {
      approvalConditions[result.persona_id] = result.approval_conditions;
    }
  }

  return {
    classified_risks: allRisks,
    untested_assumptions: [...new Set(allUntested)],
    approval_conditions: approvalConditions,
    failure_scenarios: allFailures,
  };
}

/* ────────────────────────────────────
   Context → Prompt Injection
   Structured context → system prompt
   ──────────────────────────────────── */

/**
 * Inject decompose context into orchestrate's system prompt.
 * Instead of appending raw markdown, injects structured context
 * that the AI can use precisely.
 */
export function injectDecomposeContext(
  basePrompt: string,
  ctx: DecomposeContext
): string {
  const sections: string[] = [];

  // Validate: skip injection if no meaningful content
  const question = (ctx.selected_direction || ctx.reframed_question || '').trim();
  if (!question && !ctx.surface_task?.trim()) return basePrompt;

  // Core direction from decompose
  sections.push(`## 악보 해석에서 도출된 맥락`);
  if (ctx.surface_task?.trim()) sections.push(`- 원래 과제: ${ctx.surface_task}`);
  if (question) sections.push(`- 재정의된 질문: ${question}`);

  if (ctx.why_reframing_matters) {
    sections.push(`- 리프레이밍 이유: ${ctx.why_reframing_matters}`);
  }

  // Unverified assumptions → these should become key_assumptions
  if (ctx.unverified_assumptions.length > 0) {
    sections.push('');
    sections.push('### 미확인 전제 (key_assumptions에 포함시키세요)');
    ctx.unverified_assumptions.forEach((a, i) => {
      sections.push(`${i + 1}. "${a.assumption}"`);
      if (a.risk_if_false) {
        sections.push(`   만약 아니라면: ${a.risk_if_false}`);
      }
    });
  }

  // Verified assumptions → noted but lower priority
  if (ctx.verified_assumptions.length > 0) {
    sections.push('');
    sections.push('### 확인된 전제 (참고만, 재검증 불필요)');
    ctx.verified_assumptions.forEach(a => {
      sections.push(`- ${a.assumption} (확인됨)`);
    });
  }

  // Interview signals → guide the AI's approach
  if (ctx.interview_signals && Object.keys(ctx.interview_signals).length > 0) {
    const signals: string[] = [];
    if (ctx.interview_signals.uncertainty) {
      const uncertaintyMap: Record<string, string> = {
        why: '사용자가 "왜 해야 하는지" 불확실해합니다. 목적과 가치를 명확히 해주세요.',
        what: '사용자가 "무엇을 해야 하는지" 불확실해합니다. 범위를 구체적으로 정의해주세요.',
        how: '사용자가 "어떻게 해야 하는지" 불확실해합니다. 실행 방법론에 집중해주세요.',
        none: '사용자는 정리가 필요한 상태입니다. 구조화에 집중해주세요.',
      };
      const hint = uncertaintyMap[ctx.interview_signals.uncertainty];
      if (hint) signals.push(hint);
    }
    if (ctx.interview_signals.success === 'unclear') {
      signals.push('성공 기준이 불명확합니다. goal_summary를 특히 구체적으로 작성해주세요.');
    }
    if (signals.length > 0) {
      sections.push('');
      sections.push('### 사용자 맥락 신호');
      signals.forEach(s => sections.push(`- ${s}`));
    }
  }

  // AI limitations → pass through as constraints
  if (ctx.ai_limitations.length > 0) {
    sections.push('');
    sections.push('### AI 한계 (이 부분은 사람에게 배정하세요)');
    ctx.ai_limitations.forEach(l => sections.push(`- ${l}`));
  }

  const contextBlock = sections.join('\n');

  return `${basePrompt}\n\n---\n\n${contextBlock}`;
}

/**
 * Inject orchestrate + decompose context into rehearsal's prompt.
 */
export function injectOrchestrateContext(
  basePrompt: string,
  orchestrateCtx: OrchestrateContext,
  decomposeCtx?: DecomposeContext
): string {
  const sections: string[] = [];

  sections.push('## 편곡에서 설계된 실행 계획');
  sections.push(`- 핵심 방향: ${orchestrateCtx.governing_idea}`);

  if (orchestrateCtx.key_assumptions.length > 0) {
    sections.push('');
    sections.push('### 핵심 가정 (공격 대상)');
    orchestrateCtx.key_assumptions.forEach((ka, i) => {
      sections.push(`${i + 1}. [${ka.importance}/${ka.certainty}] ${ka.assumption}`);
      if (ka.if_wrong) sections.push(`   틀리면: ${ka.if_wrong}`);
    });
  }

  if (decomposeCtx?.unverified_assumptions?.length) {
    sections.push('');
    sections.push('### 악보 해석에서 미확인된 전제 (연결 검증)');
    decomposeCtx.unverified_assumptions.forEach(a => {
      sections.push(`- "${a.assumption}" → 편곡에서 검증 단계가 있는지 확인하세요`);
    });
  }

  return `${basePrompt}\n\n---\n\n${sections.join('\n')}`;
}

/* ────────────────────────────────────
   Helpers
   ──────────────────────────────────── */

export function extractInterviewSignals(inputText: string): DecomposeContext['interview_signals'] | undefined {
  if (!inputText.includes('[맥락]')) return undefined;

  const signals: DecomposeContext['interview_signals'] = {};

  // Extract origin
  if (inputText.includes('위에서 내려온 지시')) signals.origin = 'top-down';
  else if (inputText.includes('고객/외부 요청')) signals.origin = 'external';
  else if (inputText.includes('스스로 발견한 기회')) signals.origin = 'self';
  else if (inputText.includes('갑자기 터진 문제')) signals.origin = 'fire';

  // Extract uncertainty
  if (inputText.includes('이걸 왜 해야 하는지')) signals.uncertainty = 'why';
  else if (inputText.includes('무엇을 해야 하는지')) signals.uncertainty = 'what';
  else if (inputText.includes('어떻게 해야 하는지')) signals.uncertainty = 'how';
  else if (inputText.includes('불확실한 것 없음')) signals.uncertainty = 'none';

  // Extract success criteria
  if (inputText.includes('숫자로 보이는 성과')) signals.success = 'measurable';
  else if (inputText.includes('리스크 감소')) signals.success = 'risk';
  else if (inputText.includes('새로운 가능성')) signals.success = 'opportunity';
  else if (inputText.includes('아직 모르겠음')) signals.success = 'unclear';

  return Object.keys(signals).length > 0 ? signals : undefined;
}

/**
 * Merge decompose's unverified assumptions into orchestrate's key_assumptions.
 * Prevents duplication. Adds provenance marker.
 */
export function mergeAssumptionsIntoKeyAssumptions(
  decomposeAssumptions: HiddenAssumption[],
  orchestrateAssumptions: KeyAssumption[]
): KeyAssumption[] {
  const existing = new Set(
    orchestrateAssumptions.map(ka => ka.assumption.toLowerCase().trim())
  );

  const inherited = decomposeAssumptions
    .filter(a => !a.verified)
    .filter(a => !existing.has(a.assumption.toLowerCase().trim()))
    .map(a => ({
      assumption: a.assumption,
      importance: 'high' as const,
      certainty: 'low' as const,
      if_wrong: a.risk_if_false || '영향 미확인',
    }));

  return [...orchestrateAssumptions, ...inherited];
}

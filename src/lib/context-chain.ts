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
  const assumptions: HiddenAssumption[] = (analysis.hidden_assumptions || []).map((a: HiddenAssumption | string) =>
    typeof a === 'string' ? { assumption: a, risk_if_false: '', verified: false } : a
  );

  // Phase 2C: Use structured signals first, fall back to text extraction
  const interviewSignals = item.interview_signals || extractInterviewSignals(item.input_text);

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

  // Assumptions — grouped by user's evaluation state
  const allAssumptions = [...ctx.unverified_assumptions, ...ctx.verified_assumptions];
  const doubtful = allAssumptions.filter(a => a.evaluation === 'doubtful');
  const uncertain = allAssumptions.filter(a => a.evaluation === 'uncertain');
  const confirmed = allAssumptions.filter(a => a.evaluation === 'likely_true');
  const noEval = allAssumptions.filter(a => !a.evaluation);

  if (doubtful.length > 0) {
    sections.push('');
    sections.push('### 의심된 전제 (key_assumptions 최우선 — 검증 단계 필수)');
    doubtful.forEach((a, i) => {
      sections.push(`${i + 1}. "${a.assumption}" (사용자 평가: 의심됨)`);
      if (a.risk_if_false) sections.push(`   틀리면: ${a.risk_if_false}`);
    });
  }

  if (uncertain.length > 0) {
    sections.push('');
    sections.push('### 불확실한 전제 (key_assumptions에 포함 — 검증 방법 제시)');
    uncertain.forEach((a, i) => {
      sections.push(`${i + 1}. "${a.assumption}" (사용자 평가: 불확실)`);
      if (a.risk_if_false) sections.push(`   틀리면: ${a.risk_if_false}`);
    });
  }

  if (confirmed.length > 0) {
    sections.push('');
    if (doubtful.length === 0 && uncertain.length === 0) {
      // 모든 전제 확인됨 → 방향 강화 근거로 활용
      sections.push('### 확인된 전제 (계획의 근거로 활용하세요)');
    } else {
      sections.push('### 확인된 전제 (참고, 재검증 불필요)');
    }
    confirmed.forEach(a => sections.push(`- ${a.assumption} (확인됨)`));
  }

  // Legacy: 평가 없는 전제 (이전 데이터 호환)
  if (noEval.length > 0) {
    sections.push('');
    sections.push('### 전제 (평가 미완료 — key_assumptions에 포함시키세요)');
    noEval.forEach((a, i) => {
      sections.push(`${i + 1}. "${a.assumption}"`);
      if (a.risk_if_false) sections.push(`   만약 아니라면: ${a.risk_if_false}`);
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

  // Storyline — 왜 이 접근인지 구조적 맥락
  if (orchestrateCtx.storyline) {
    const s = orchestrateCtx.storyline;
    sections.push(`- 상황: ${s.situation}`);
    sections.push(`- 문제: ${s.complication}`);
    sections.push(`- 해결: ${s.resolution}`);
  }

  // Design rationale
  if (orchestrateCtx.design_rationale) {
    sections.push(`- 설계 근거: ${orchestrateCtx.design_rationale}`);
  }

  // Step summary — 압축된 실행 흐름 (페르소나가 전체 그림을 볼 수 있도록)
  if (orchestrateCtx.steps.length > 0) {
    const actorLabel: Record<string, string> = { ai: 'AI', human: '사람', both: '협업' };
    const stepSummary = orchestrateCtx.steps
      .map((step, i) => {
        const num = i + 1;
        const cp = step.checkpoint ? ' ⚑' : '';
        const onCriticalPath = orchestrateCtx.critical_path?.includes(num) ? ' ★' : '';
        return `${num}. ${step.task} [${actorLabel[step.actor] || step.actor}]${cp}${onCriticalPath}`;
      })
      .join(' / ');
    sections.push('');
    sections.push(`### 실행 흐름 (⚑=체크포인트, ★=크리티컬패스)`);
    sections.push(stepSummary);
  }

  // Key assumptions — 공격 대상
  if (orchestrateCtx.key_assumptions.length > 0) {
    sections.push('');
    sections.push('### 핵심 가정 (공격 대상)');
    orchestrateCtx.key_assumptions.forEach((ka, i) => {
      sections.push(`${i + 1}. [${ka.importance}/${ka.certainty}] ${ka.assumption}`);
      if (ka.if_wrong) sections.push(`   틀리면: ${ka.if_wrong}`);
    });
  }

  // Decompose unverified assumptions
  if (decomposeCtx?.unverified_assumptions?.length) {
    const doubtful = decomposeCtx.unverified_assumptions.filter(a => a.evaluation === 'doubtful');
    const others = decomposeCtx.unverified_assumptions.filter(a => a.evaluation !== 'doubtful');
    if (doubtful.length > 0) {
      sections.push('');
      sections.push('### 사용자가 의심한 전제 (우선 검증 대상)');
      doubtful.forEach(a => sections.push(`- "${a.assumption}"`));
    }
    if (others.length > 0) {
      sections.push('');
      sections.push('### 악보 해석에서 미확인된 전제');
      others.forEach(a => sections.push(`- "${a.assumption}"`));
    }
  }

  // AI limitations from decompose
  if (decomposeCtx?.ai_limitations?.length) {
    sections.push('');
    sections.push('### AI 한계 (이 영역은 사람이 판단해야 함)');
    decomposeCtx.ai_limitations.forEach(l => sections.push(`- ${l}`));
  }

  return `${basePrompt}\n\n---\n\n${sections.join('\n')}`;
}

/**
 * Build refinement-specific context from orchestrate + decompose.
 * Gives the revision AI awareness of original design constraints.
 */
export function buildRefinementContext(
  orchestrateCtx: OrchestrateContext,
  decomposeCtx?: DecomposeContext
): string {
  const sections: string[] = [];

  sections.push('## 원래 설계 맥락 (수정 시 위반하지 마세요)');
  sections.push(`- 핵심 방향: ${orchestrateCtx.governing_idea}`);

  if (orchestrateCtx.design_rationale) {
    sections.push(`- 설계 근거: ${orchestrateCtx.design_rationale}`);
  }

  // Critical path awareness
  if (orchestrateCtx.critical_path?.length > 0 && orchestrateCtx.steps.length > 0) {
    const cpSteps = orchestrateCtx.critical_path
      .map(i => orchestrateCtx.steps[i - 1]?.task)
      .filter(Boolean);
    if (cpSteps.length > 0) {
      sections.push(`- 크리티컬 패스: ${cpSteps.join(' → ')}`);
    }
  }

  if (decomposeCtx) {
    const question = decomposeCtx.selected_direction || decomposeCtx.reframed_question;
    if (question) {
      sections.push(`- 근본 질문: ${question}`);
    }
    if (decomposeCtx.ai_limitations?.length > 0) {
      sections.push(`- AI 한계: ${decomposeCtx.ai_limitations.join(', ')}`);
    }
  }

  return sections.join('\n');
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

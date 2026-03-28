/**
 * Skill Quality Eval — 스킬 출력 품질 자동 평가
 *
 * 2단계 평가:
 * 1. Structural evals (자동) — 포맷, 섹션 존재, 필수 요소
 * 2. Content evals (LLM-judge) — 깊이, 구체성, 자연스러움
 *
 * 사용법:
 *   const output = "... 스킬 출력 ...";
 *   const result = evaluateSkillOutput('reframe', output);
 *   console.log(result.pass_rate, result.failures);
 */

export type SkillName = 'reframe' | 'recast' | 'rehearse' | 'refine' | 'overture';

export interface StructuralEval {
  id: string;
  description: string;
  check: (output: string) => boolean;
}

export interface ContentEvalCriterion {
  id: string;
  question: string;  // binary yes/no question for LLM judge
  fail_signal: string;  // what failure looks like
}

export interface EvalResult {
  skill: SkillName;
  structural: { id: string; passed: boolean }[];
  structural_pass_rate: number;
  content_criteria: ContentEvalCriterion[];
  content_judge_prompt: string;
}

/* ────────────────────────────────────
   Structural Evals (Automated)
   ──────────────────────────────────── */

const REFRAME_STRUCTURAL: StructuralEval[] = [
  {
    id: 'has_header',
    description: 'Overture · Reframe 헤더 존재',
    check: (o) => /Overture\s*·?\s*Reframe/i.test(o),
  },
  {
    id: 'has_reframed_question',
    description: '재정의된 질문이 존재 (▸ 또는 핵심 질문 마커)',
    check: (o) => /[▸►]/.test(o) || /핵심\s*질문|reframed|재정의/i.test(o),
  },
  {
    id: 'has_assumptions_3plus',
    description: '가정/전제가 3개 이상',
    check: (o) => {
      const assumptionLines = o.split('\n').filter(l =>
        /^[\s]*[•·▸►\-\d]+[\.\)]*\s*.*(가정|전제|assumption)/i.test(l) ||
        /^[\s]*[•·▸►\-]\s*[?✓✗]/.test(l) ||
        /^\s*\d+\.\s+/.test(l) && /가정|전제|확신|불확실|의심/i.test(l)
      );
      // Also count lines within assumption sections
      const assumptionSection = o.match(/(?:가정|전제|Assumptions?)[\s\S]*?(?=\n#{1,3}\s|\n```|$)/i);
      if (assumptionSection) {
        const sectionLines = assumptionSection[0].split('\n').filter(l => /^[\s]*[\-•·▸►✓✗?]/.test(l));
        return Math.max(assumptionLines.length, sectionLines.length) >= 3;
      }
      return assumptionLines.length >= 3;
    },
  },
  {
    id: 'has_axes_diversity',
    description: '가정 축이 2종류 이상 (고객/실행/사업/조직 등)',
    check: (o) => {
      const axes = ['고객', '시장', 'customer', '실행', 'feasibility', '기술', '사업', 'business', '조직', 'org', '재무', '법', '타이밍'];
      const found = axes.filter(a => o.toLowerCase().includes(a));
      return found.length >= 2;
    },
  },
  {
    id: 'has_interview',
    description: '인터뷰/질문 단계가 포함됨',
    check: (o) => /인터뷰|질문|interview|❓|선택|골라/i.test(o),
  },
  {
    id: 'has_blind_spot',
    description: '블라인드 스팟 또는 AI 한계 언급',
    check: (o) => /블라인드|blind\s*spot|놓치|AI.*한계|limitation/i.test(o),
  },
  {
    id: 'has_doubtful_or_challenge',
    description: '의심(doubtful) 가정이 1개 이상이거나, 인터뷰에서 도전적 질문이 있었음',
    check: (o) => /✗|doubtful|의심|도전|challenge/i.test(o),
  },
  {
    id: 'not_too_short',
    description: '출력이 최소 500자 이상',
    check: (o) => o.length >= 500,
  },
];

const RECAST_STRUCTURAL: StructuralEval[] = [
  {
    id: 'has_header',
    description: 'Overture · Recast 헤더 존재',
    check: (o) => /Overture\s*·?\s*Recast/i.test(o),
  },
  {
    id: 'has_governing_idea',
    description: 'Governing idea / 핵심 방향 존재',
    check: (o) => /governing|핵심\s*방향|thesis|설계\s*원칙/i.test(o),
  },
  {
    id: 'has_steps_3plus',
    description: '실행 스텝이 3개 이상',
    check: (o) => {
      const stepMarkers = o.match(/(?:Step|스텝|단계)\s*\d/gi) || [];
      const numberedSteps = o.match(/^\s*\d+\.\s+/gm) || [];
      return Math.max(stepMarkers.length, numberedSteps.length) >= 3;
    },
  },
  {
    id: 'has_actor_labels',
    description: 'AI/Human/Both 구분이 있음',
    check: (o) => /🧑|🤖|⚡|Human|AI|사람|협업|Both/i.test(o),
  },
  {
    id: 'has_checkpoint',
    description: '체크포인트가 1개 이상',
    check: (o) => /⚑|checkpoint|체크포인트/i.test(o),
  },
  {
    id: 'has_assumptions',
    description: '핵심 가정/key assumptions 존재',
    check: (o) => /핵심\s*가정|key.*assumption|가정.*검증/i.test(o),
  },
  {
    id: 'has_storyline',
    description: '상황-문제-해결 또는 스토리라인 구조',
    check: (o) => /상황|complication|situation|resolution|해결|문제.*→/i.test(o),
  },
];

const REHEARSE_STRUCTURAL: StructuralEval[] = [
  {
    id: 'has_header',
    description: 'Overture · Rehearse 헤더 존재',
    check: (o) => /Overture\s*·?\s*Rehearse/i.test(o),
  },
  {
    id: 'has_personas_2plus',
    description: '페르소나가 2명 이상',
    check: (o) => {
      const personaMarkers = o.match(/(?:👤|페르소나|Persona)\s*\d|───.*?(?:역할|Role)/gi) || [];
      // Also count Korean names that appear as section headers
      const nameHeaders = o.match(/^[\s]*(?:##|###)\s+.{2,10}\s*(?:\(|—|:)/gm) || [];
      return Math.max(personaMarkers.length, nameHeaders.length) >= 2;
    },
  },
  {
    id: 'has_critical_risks',
    description: '✗ 크리티컬 리스크가 1개 이상',
    check: (o) => /[✗✘×]|critical|크리티컬|치명/i.test(o),
  },
  {
    id: 'has_unspoken_risks',
    description: '🔇 침묵의 리스크가 1개 이상',
    check: (o) => /🔇|unspoken|침묵|말하지.*않/i.test(o),
  },
  {
    id: 'has_approval_conditions',
    description: '승인 조건이 존재',
    check: (o) => /승인.*조건|approval.*condition|통과.*조건/i.test(o),
  },
  {
    id: 'has_first_questions',
    description: '첫 질문 또는 예상 질문',
    check: (o) => /첫.*질문|first.*question|예상.*질문|물어볼/i.test(o),
  },
  {
    id: 'personas_differ',
    description: '페르소나 간 관점/어투 차이가 있음 (다른 리스크 지적)',
    check: (o) => {
      // Simple heuristic: at least 2 different risk/concern sections
      const sections = o.split(/(?:👤|페르소나|───)/i).filter(s => s.length > 100);
      return sections.length >= 2;
    },
  },
];

const REHEARSE_STEP_REFERENCE: StructuralEval = {
  id: 'references_recast_steps',
  description: '/recast 실행 스텝을 구체적으로 참조 (Step N, 스텝명 등)',
  check: (o) => /Step\s*\d|스텝\s*\d|단계\s*\d|P0|P1|MVP/i.test(o),
};

// Add to REHEARSE after existing evals
REHEARSE_STRUCTURAL.push(REHEARSE_STEP_REFERENCE);

const REFINE_STRUCTURAL: StructuralEval[] = [
  {
    id: 'has_header',
    description: 'Overture · Refine 헤더 존재',
    check: (o) => /Overture\s*·?\s*Refine/i.test(o),
  },
  {
    id: 'has_issue_tracking',
    description: '이슈 추적 또는 해결 상태',
    check: (o) => /이슈|issue|해결|resolved|남은|remaining/i.test(o),
  },
  {
    id: 'has_convergence_signal',
    description: '수렴 여부 판정',
    check: (o) => /수렴|converge|반복|iteration|round/i.test(o),
  },
  {
    id: 'has_plan_revision',
    description: '계획 수정 또는 개선 제안',
    check: (o) => /수정|revision|개선|변경|update|반영/i.test(o),
  },
  {
    id: 'has_not_addressed',
    description: '해결 안 된 이슈 + 이유 섹션 존재',
    check: (o) => /not\s*address|미해결|해결.*안|남은.*이슈|deferred/i.test(o),
  },
  {
    id: 'has_results_bar',
    description: 'Results bar 시각화 (█░ 또는 진행률)',
    check: (o) => /[█░▓▒]|→\s*\d|critical.*\d.*→.*\d/i.test(o),
  },
  {
    id: 'preserves_root_question',
    description: 'reframed_question 보존 확인 명시',
    check: (o) => /governing.*preserved|근본.*질문.*보존|reframed.*question.*preserved|root.*question/i.test(o),
  },
];

const OVERTURE_STRUCTURAL: StructuralEval[] = [
  {
    id: 'has_header',
    description: 'Overture 헤더 존재',
    check: (o) => /Overture/i.test(o),
  },
  {
    id: 'has_all_phases',
    description: '4단계 (reframe→recast→rehearse→refine) 모두 실행됨',
    check: (o) => {
      const phases = ['reframe', 'recast', 'rehearse', 'refine'];
      return phases.every(p => new RegExp(p, 'i').test(o));
    },
  },
  {
    id: 'has_dq_score',
    description: 'DQ 스코어가 포함됨',
    check: (o) => /DQ\s*\d|Decision\s*Quality|의사결정\s*품질/i.test(o),
  },
  {
    id: 'has_journal_entry',
    description: '저널 엔트리 작성됨',
    check: (o) => /journal|저널|기록/i.test(o),
  },
];

const STRUCTURAL_EVALS: Record<SkillName, StructuralEval[]> = {
  reframe: REFRAME_STRUCTURAL,
  recast: RECAST_STRUCTURAL,
  rehearse: REHEARSE_STRUCTURAL,
  refine: REFINE_STRUCTURAL,
  overture: OVERTURE_STRUCTURAL,
};

/* ────────────────────────────────────
   Content Evals (LLM Judge)
   ──────────────────────────────────── */

const REFRAME_CONTENT: ContentEvalCriterion[] = [
  {
    id: 'not_surface_repeat',
    question: '재정의된 질문이 원래 질문의 단순 반복이 아닌가?',
    fail_signal: '원래 질문을 살짝 바꾼 수준, 관점 전환 없음',
  },
  {
    id: 'assumptions_specific',
    question: '각 가정이 해당 과제에 특화되어 있는가? (generic한 "시장이 클 것이다" 수준이 아닌)',
    fail_signal: '어떤 프로젝트에나 적용될 수 있는 범용 가정',
  },
  {
    id: 'korean_natural',
    question: '한국어가 자연스럽고 번역체가 아닌가?',
    fail_signal: '"~에 대하여 고려하시겠습니까" 같은 번역투, 불필요한 존칭',
  },
  {
    id: 'actionable_direction',
    question: '재정의된 질문이 다음 행동을 유도하는가? (답할 수 있는 질문인가)',
    fail_signal: '너무 추상적이거나 철학적이어서 실행 불가',
  },
];

const RECAST_CONTENT: ContentEvalCriterion[] = [
  {
    id: 'steps_concrete',
    question: '각 스텝의 산출물이 구체적인가? ("분석 결과" 수준이 아닌)',
    fail_signal: '산출물이 "문서", "결과", "보고서" 같은 추상명사',
  },
  {
    id: 'actor_reasoning',
    question: 'AI/Human 배정에 합리적 이유가 있는가?',
    fail_signal: '모든 스텝을 AI에 배정하거나, 이유 없이 임의 배정',
  },
  {
    id: 'checkpoint_meaningful',
    question: '체크포인트가 의미 있는 지점에 있는가? (진행 불가 판단 지점)',
    fail_signal: '모든 스텝 또는 마지막에만 체크포인트',
  },
  {
    id: 'reframe_context_used',
    question: '/reframe에서 나온 가정/질문이 실행 계획에 반영되었는가?',
    fail_signal: '이전 단계 맥락을 무시하고 독립적으로 생성',
  },
];

const REHEARSE_CONTENT: ContentEvalCriterion[] = [
  {
    id: 'personas_distinct',
    question: '각 페르소나가 서로 다른 관점에서 비판하는가?',
    fail_signal: '모든 페르소나가 같은 리스크를 지적',
  },
  {
    id: 'critique_specific',
    question: '비판이 해당 계획에 특화되어 있는가? ("리소스가 부족할 수 있다" 수준이 아닌)',
    fail_signal: '어떤 계획에든 적용 가능한 범용 비판',
  },
  {
    id: 'unspoken_insightful',
    question: '침묵의 리스크가 진짜 말하기 어려운 것인가?',
    fail_signal: '이미 명시된 리스크를 "침묵의 리스크"로 재포장',
  },
  {
    id: 'recast_steps_referenced',
    question: '/recast의 실행 계획을 구체적으로 참조하며 비판하는가?',
    fail_signal: '계획 내용을 모르는 것처럼 일반적 비판',
  },
];

const REFINE_CONTENT: ContentEvalCriterion[] = [
  {
    id: 'issues_from_rehearsal',
    question: '/rehearse에서 나온 이슈가 추적되고 있는가?',
    fail_signal: '리허설 피드백과 무관한 새 이슈만 다룸',
  },
  {
    id: 'convergence_justified',
    question: '수렴 판정에 근거가 있는가?',
    fail_signal: '"충분히 논의했으므로 수렴" 같은 임의 판정',
  },
];

const CONTENT_EVALS: Record<SkillName, ContentEvalCriterion[]> = {
  reframe: REFRAME_CONTENT,
  recast: RECAST_CONTENT,
  rehearse: REHEARSE_CONTENT,
  refine: REFINE_CONTENT,
  overture: [...REFRAME_CONTENT, ...RECAST_CONTENT, ...REHEARSE_CONTENT],
};

/* ────────────────────────────────────
   Evaluation Engine
   ──────────────────────────────────── */

export function evaluateSkillOutput(skill: SkillName, output: string): EvalResult {
  const structuralEvals = STRUCTURAL_EVALS[skill] || [];
  const contentCriteria = CONTENT_EVALS[skill] || [];

  const structural = structuralEvals.map(e => ({
    id: e.id,
    passed: e.check(output),
  }));

  const passCount = structural.filter(s => s.passed).length;
  const structural_pass_rate = structuralEvals.length > 0
    ? Math.round((passCount / structuralEvals.length) * 100) / 100
    : 1;

  // Build LLM judge prompt for content evals
  const content_judge_prompt = buildJudgePrompt(skill, output, contentCriteria);

  return {
    skill,
    structural,
    structural_pass_rate,
    content_criteria: contentCriteria,
    content_judge_prompt,
  };
}

function buildJudgePrompt(skill: SkillName, output: string, criteria: ContentEvalCriterion[]): string {
  const criteriaText = criteria
    .map((c, i) => `${i + 1}. [${c.id}] ${c.question}\n   FAIL 신호: ${c.fail_signal}`)
    .join('\n');

  return `당신은 Overture /${skill} 스킬의 출력 품질을 평가하는 심사관입니다.

아래 출력물을 각 기준에 대해 PASS 또는 FAIL로 평가하세요.
FAIL인 경우 한 문장으로 이유를 적으세요.

## 평가 기준

${criteriaText}

## 평가 대상 출력물

<output>
${output.slice(0, 8000)}
</output>

## 응답 형식 (JSON)

{
  "evaluations": [
${criteria.map(c => `    { "id": "${c.id}", "passed": true/false, "reason": "..." }`).join(',\n')}
  ]
}`;
}

/* ────────────────────────────────────
   Pipeline Chaining Eval
   ──────────────────────────────────── */

export interface ChainingEval {
  id: string;
  description: string;
  passed: boolean;
}

/**
 * Evaluate chaining between saved .overture/ files.
 * Checks that each stage's output properly feeds the next.
 */
export function evaluatePipelineChaining(files: {
  reframe?: string;
  recast?: string;
  rehearse?: string;
  refine?: string;
}): ChainingEval[] {
  const evals: ChainingEval[] = [];

  // Context Contract exists in each file
  for (const [stage, content] of Object.entries(files)) {
    if (content) {
      evals.push({
        id: `${stage}_has_context_contract`,
        description: `/${stage}: Context Contract 섹션 존재`,
        passed: /Context Contract/i.test(content),
      });
    }
  }

  // reframe → recast chaining
  if (files.reframe && files.recast) {
    // reframe assumptions appear in recast
    const reframeAssumptions = files.reframe.match(/assumptions_(?:uncertain|doubtful):\s*\n([\s\S]*?)(?=\nassumptions_|ai_limitations|$)/);
    const hasInherited = /inherited|from reframe|\[from reframe\]/i.test(files.recast);
    evals.push({
      id: 'reframe_to_recast_assumptions',
      description: 'reframe 가정이 recast에 inherited로 표시',
      passed: hasInherited || !reframeAssumptions,
    });

    // ai_limitations carried forward
    const hasAiLimitations = /ai_limitations/i.test(files.recast);
    evals.push({
      id: 'reframe_to_recast_ai_limitations',
      description: 'reframe ai_limitations가 recast에 전달',
      passed: hasAiLimitations,
    });
  }

  // recast → rehearse chaining
  if (files.recast && files.rehearse) {
    // personas match
    const recastPersonas = files.recast.match(/(?:target_user|skeptic):\s*\n\s*name:\s*(\S+)/g);
    const rehearseHasPersonas = recastPersonas?.some(p => {
      const name = p.match(/name:\s*(\S+)/)?.[1];
      return name && files.rehearse!.includes(name);
    });
    evals.push({
      id: 'recast_to_rehearse_personas',
      description: 'recast 페르소나가 rehearse에서 재사용',
      passed: rehearseHasPersonas ?? false,
    });
  }

  // rehearse → refine chaining
  if (files.rehearse && files.refine) {
    // critical risks addressed
    const hasCriticalTracking = /critical.*→|→.*\d|3.*→.*1|해결|resolved/i.test(files.refine);
    evals.push({
      id: 'rehearse_to_refine_criticals',
      description: 'rehearse critical 이슈가 refine에서 추적',
      passed: hasCriticalTracking,
    });

    // sharpest critique referenced
    const hasSharpestCritique = /sharpest.*critique|가장.*날카로운/i.test(files.refine);
    evals.push({
      id: 'rehearse_to_refine_sharpest_critique',
      description: 'rehearse sharpest critique가 refine에서 참조',
      passed: hasSharpestCritique,
    });
  }

  return evals;
}

/* ────────────────────────────────────
   Test Scenarios
   ──────────────────────────────────── */

export interface TestScenario {
  id: string;
  name: string;
  context: 'build' | 'decide';
  input: string;
  expected_axes: string[];  // 예상되는 가정 축
}

export const TEST_SCENARIOS: TestScenario[] = [
  {
    id: 'sea_expansion',
    name: '동남아 시장 진출',
    context: 'decide',
    input: '우리 B2B SaaS를 동남아 시장으로 확장해야 할까?',
    expected_axes: ['시장', '실행', '재무', '조직'],
  },
  {
    id: 'freelancer_tool',
    name: '프리랜서 정산 도구',
    context: 'build',
    input: '프리랜서를 위한 클라이언트별 정산 추적 도구를 만들고 싶다',
    expected_axes: ['고객', '기술', '사업'],
  },
  {
    id: 'leadership_program',
    name: '리더십 교육 프로그램',
    context: 'decide',
    input: '신임 팀장 대상 리더십 교육 프로그램을 도입해야 할지',
    expected_axes: ['조직', '실행', '재무'],
  },
];

/**
 * Print a human-readable eval report.
 */
export function formatEvalReport(result: EvalResult): string {
  const lines: string[] = [];
  lines.push(`\n# /${result.skill} Quality Eval`);
  lines.push(`Structural: ${result.structural_pass_rate * 100}% (${result.structural.filter(s => s.passed).length}/${result.structural.length})`);
  lines.push('');

  for (const s of result.structural) {
    lines.push(`  ${s.passed ? '✓' : '✗'} ${s.id}`);
  }

  if (result.structural.some(s => !s.passed)) {
    lines.push('');
    lines.push('⚠ Structural failures need fixing before content eval.');
  }

  lines.push('');
  lines.push(`Content criteria: ${result.content_criteria.length}개 (LLM judge 필요)`);
  for (const c of result.content_criteria) {
    lines.push(`  ? ${c.id}: ${c.question}`);
  }

  return lines.join('\n');
}

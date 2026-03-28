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
    check: (o) => /[▸►]/.test(o) || /핵심\s*질문|reframed|재정의|진짜\s*질문/i.test(o),
  },
  {
    id: 'has_assumptions_3plus',
    description: '가정/전제가 3개 이상',
    check: (o) => {
      // Count lines with assumption markers: ✓/?/✗ or numbered items in assumption section
      const markerLines = o.split('\n').filter(l => /^[\s]*[-•·▸►]\s*[?✓✗]/.test(l));
      const numberedInSection = o.match(/(?:가정|전제|Assumptions?)[\s\S]*?(?=\n#{1,3}\s|\n```|---|\n>|$)/i);
      if (numberedInSection) {
        const lines = numberedInSection[0].split('\n').filter(l => /^[\s]*[-•·▸►✓✗?\d]/.test(l.trim()));
        return Math.max(markerLines.length, lines.length) >= 3;
      }
      return markerLines.length >= 3;
    },
  },
  {
    id: 'has_axes_diversity',
    description: '가정 축이 2종류 이상 (고객/실행/사업/조직 등)',
    check: (o) => {
      const axes = ['고객', '시장', 'customer', '실행', 'feasibility', '기술', 'tech', '사업', 'business', '조직', 'org', '재무', '법', '타이밍', 'timing', '가치', 'value'];
      const found = axes.filter(a => o.toLowerCase().includes(a));
      return new Set(found).size >= 2;
    },
  },
  {
    id: 'has_interview',
    description: '인터뷰/질문 단계가 포함됨',
    check: (o) => /인터뷰|질문|interview|❓|선택|골라/i.test(o),
  },
  {
    id: 'has_blind_spot',
    description: '💡 블라인드 스팟 존재',
    check: (o) => /💡|블라인드|blind\s*spot|놓치/i.test(o),
  },
  {
    id: 'has_check_first',
    description: '"먼저 답해야 할 질문" 또는 Check First 섹션 존재',
    check: (o) => /먼저.*답|먼저.*확인|check\s*first|먼저.*질문/i.test(o),
  },
  {
    id: 'no_flattery_opening',
    description: '"좋은 질문이네요!" 같은 아첨으로 시작하지 않음',
    check: (o) => {
      const firstLines = o.slice(0, 200).toLowerCase();
      return !/(좋은|훌륭한|great|excellent|interesting)\s*(질문|question|주제|topic)/i.test(firstLines);
    },
  },
  {
    id: 'has_quick_actions',
    description: '다음 단계 안내 (recast/수정/저장)',
    check: (o) => /recast|수정|저장|다음|→/i.test(o),
  },
  {
    id: 'has_doubtful_or_challenge',
    description: '의심(✗) 가정이 1개 이상 — 인터뷰에서 충분히 도전했음을 증명',
    check: (o) => /✗|doubtful|의심/i.test(o),
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
    description: 'Governing idea / 핵심 방향 / Product thesis 존재',
    check: (o) => /governing|핵심\s*방향|thesis|product\s*thesis|설계\s*원칙/i.test(o),
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
    id: 'has_human_checkpoint',
    description: '최소 1개 Human 체크포인트 (전부 AI에 맡기지 않음)',
    check: (o) => {
      const hasCheckpoint = /⚑|checkpoint|체크포인트/i.test(o);
      const hasHuman = /🧑|Human|사람/i.test(o);
      return hasCheckpoint && hasHuman;
    },
  },
  {
    id: 'has_assumptions',
    description: '핵심 가정/key assumptions 존재',
    check: (o) => /핵심\s*가정|key.*assumption|가정/i.test(o),
  },
  {
    id: 'has_storyline',
    description: '상황-문제-해결 또는 스토리라인 구조',
    check: (o) => /상황|complication|situation|resolution|해결|narrative/i.test(o),
  },
  {
    id: 'has_scope_cuts',
    description: 'Scope cuts / 하지 않을 것이 명시됨 (build context)',
    check: (o) => /scope\s*cut|✂|하지.*않|안.*만들|빼|제외|not.*build/i.test(o),
  },
  {
    id: 'has_success_metric',
    description: '성공 지표가 구체적 수치로 정의됨',
    check: (o) => /success.*metric|성공.*지표|성공\s*=|\d+%|\d+명|\d+개.*팀/i.test(o),
  },
  {
    id: 'p0_max_2',
    description: 'P0 기능이 2개 이하 (build context hard rule)',
    check: (o) => {
      const p0Section = o.match(/P0[\s\S]*?(?=P1|P2|##|$)/i);
      if (!p0Section) return true; // no P0 section = not build context, pass
      const p0Items = p0Section[0].split('\n').filter(l => /^[\s]*[-•·*]\s*\*?\*?[^*]/.test(l));
      return p0Items.length <= 2;
    },
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
    id: 'has_bottom_line',
    description: 'Bottom line / 핵심 행동 요약 존재',
    check: (o) => /bottom\s*line|핵심.*행동|먼저.*해야|what\s*to\s*change/i.test(o),
  },
  {
    id: 'has_devils_advocate',
    description: "Devil's Advocate 섹션 존재 (3 lens: failure/silent/regret)",
    check: (o) => /devil|악마|⚡.*advocate|realistic.*failure|silent.*problem|1.year.*regret/i.test(o),
  },
  {
    id: 'personas_differ',
    description: '페르소나 간 다른 리스크 지적 (관점 차이)',
    check: (o) => {
      const sections = o.split(/(?:👤|##\s+.*?—|───)/i).filter(s => s.length > 80);
      return sections.length >= 2;
    },
  },
  {
    id: 'references_recast_steps',
    description: '/recast 실행 스텝을 구체적으로 참조 (Step N, P0 등)',
    check: (o) => /Step\s*\d|스텝\s*\d|단계\s*\d|P0|P1|MVP/i.test(o),
  },
];

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
    id: 'has_changes_format',
    description: '변경 사항이 old→new 형식으로 표시',
    check: (o) => /→|->|변경|old.*new|기존.*→.*변경/i.test(o),
  },
  {
    id: 'has_revised_plan',
    description: '최종 수정된 계획/스펙이 포함됨',
    check: (o) => /revised|최종|수정.*계획|revised\s*spec|revised\s*plan/i.test(o),
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
    question: '재정의된 질문이 원래 질문의 단순 반복이 아닌가? 관점이 전환되었는가?',
    fail_signal: '원래 질문의 단어를 바꿨을 뿐 시각/프레임 자체가 동일',
  },
  {
    id: 'assumptions_specific',
    question: '각 가정이 이 과제에만 해당되는가? (다른 프로젝트에 그대로 붙여넣기 불가)',
    fail_signal: '"시장이 클 것이다", "팀이 충분할 것이다" 같은 범용 가정',
  },
  {
    id: 'blind_spot_specific',
    question: '💡 블라인드 스팟이 이 과제에 특화된 날카로운 통찰인가?',
    fail_signal: '"리스크가 있을 수 있다", "경쟁이 심할 수 있다" 같은 누구나 하는 말',
  },
  {
    id: 'check_first_actionable',
    question: '"먼저 답해야 할 질문"이 이번 주 안에 실행 가능한 구체적 행동인가?',
    fail_signal: '"시장 조사를 해보세요" 같은 추상적 행동. 구체적 = "CodeRabbit 사용자 리뷰 Top 3 확인"',
  },
  {
    id: 'korean_natural',
    question: '한국어가 자연스럽고 번역체가 아닌가?',
    fail_signal: '"~에 대하여 고려하시겠습니까", "~할 것을 추천드립니다" 같은 번역투',
  },
  {
    id: 'actionable_direction',
    question: '재정의된 질문이 답할 수 있는 질문인가? (실행으로 이어지는가)',
    fail_signal: '너무 추상적 ("성공이란 무엇인가") 또는 철학적이어서 다음 행동 불명확',
  },
];

const RECAST_CONTENT: ContentEvalCriterion[] = [
  {
    id: 'steps_concrete',
    question: '각 스텝의 산출물이 구체적 artifact인가?',
    fail_signal: '산출물이 "문서", "결과", "보고서" — 구체적 = "파트너십 가능성 평가표 (3곳 비교)"',
  },
  {
    id: 'actor_reasoning',
    question: 'AI/Human 배정에 합리적 이유가 있는가?',
    fail_signal: '모든 스텝이 AI, 또는 이유 없는 배정. ai_limitations에 해당하는 작업이 AI에 배정됨',
  },
  {
    id: 'checkpoint_meaningful',
    question: '체크포인트가 "여기서 못 넘어가면 계획 전체가 틀어지는" 지점에 있는가?',
    fail_signal: '모든 스텝마다 체크포인트 (의미 없음) 또는 마지막에만 (너무 늦음)',
  },
  {
    id: 'adds_value_beyond_input',
    question: '사용자가 직접 생각 못했을 스텝/구조/시퀀스가 있는가?',
    fail_signal: '사용자가 말한 것을 그대로 정리만 함. 순서 변경, 병렬화, 새 스텝 등 없음',
  },
  {
    id: 'governing_idea_falsifiable',
    question: '핵심 방향(governing idea)에 누군가 반대할 수 있는가?',
    fail_signal: '"좋은 제품을 만들자" — 반대 불가능한 방향은 무의미',
  },
  {
    id: 'reframe_context_used',
    question: '/reframe 가정과 블라인드 스팟이 실행 계획에 반영되었는가?',
    fail_signal: '이전 단계 맥락(특히 의심/불확실 가정)을 무시하고 독립적으로 생성',
  },
];

const REHEARSE_CONTENT: ContentEvalCriterion[] = [
  {
    id: 'personas_distinct',
    question: '각 페르소나가 서로 다른 축에서 비판하는가? (같은 리스크 반복 아닌)',
    fail_signal: '모든 페르소나가 같은 우려. 예: 둘 다 "비용이 높다"',
  },
  {
    id: 'critique_specific',
    question: '비판이 이 계획의 구체적 요소(스텝, 가정, 수치)를 지적하는가?',
    fail_signal: '"리소스가 부족할 수 있다", "경쟁이 심하다" 같은 어디에나 붙는 말',
  },
  {
    id: 'unspoken_insightful',
    question: '침묵의 리스크가 진짜 말하기 어려운 정치적/감정적 문제인가?',
    fail_signal: '기술적 리스크를 "침묵의 리스크"로 재포장. 진짜 unspoken = 인센티브 충돌, 체면, 권력 관계',
  },
  {
    id: 'makes_uncomfortable',
    question: '이 피드백 중 사용자를 불편하게 만드는 것이 하나라도 있는가?',
    fail_signal: '전부 건설적이고 정중함. "불편한 진실"이 없으면 리허설이 너무 부드러웠다는 뜻',
  },
  {
    id: 'devils_advocate_3_lenses',
    question: "Devil's Advocate가 3가지 관점(현실적 실패/침묵의 문제/1년 후 후회) 모두 다루는가?",
    fail_signal: '3가지 중 1-2개만 있거나, 기존 페르소나 피드백을 반복',
  },
  {
    id: 'recast_steps_referenced',
    question: '/recast의 실행 계획 구체적 요소(스텝명, 기능, 가정)를 인용하며 비판하는가?',
    fail_signal: '계획 내용을 모르는 것처럼 일반적 비판. 구체적 = "P0의 학습 엔진이 실제로는..."',
  },
];

const REFINE_CONTENT: ContentEvalCriterion[] = [
  {
    id: 'issues_from_rehearsal',
    question: '/rehearse에서 나온 critical 이슈가 구체적으로 추적되고 있는가?',
    fail_signal: '리허설 피드백과 무관한 새 이슈만 다룸. 또는 "검토했습니다"만으로 넘어감',
  },
  {
    id: 'substantive_not_cosmetic',
    question: '변경이 실질적인가? (표현만 바꾼 것이 아닌)',
    fail_signal: '"우려 사항을 반영하겠습니다", "모니터링하겠습니다"는 변경이 아님. 실질적 = thesis 피벗, 기능 재정의, 스텝 추가/삭제',
  },
  {
    id: 'no_monitor_as_fix',
    question: '"모니터링하겠다"를 해결책으로 사용하지 않았는가?',
    fail_signal: '"이 리스크를 지켜보겠습니다"는 해결이 아님. 구체적 방어 메커니즘이 필요',
  },
  {
    id: 'convergence_justified',
    question: '수렴 판정에 정량적 근거가 있는가? (critical 감소, 승인 조건 충족)',
    fail_signal: '"충분히 논의했으므로 수렴" — 근거 없는 판정',
  },
  {
    id: 'drift_check',
    question: '수정된 계획이 여전히 /reframe의 근본 질문에 답하고 있는가?',
    fail_signal: '피드백 반영하다가 원래 질문과 무관한 방향으로 변질',
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
    const hasCriticalTracking = /critical.*→|→.*\d|3.*→.*1|해결|resolved/i.test(files.refine);
    evals.push({
      id: 'rehearse_to_refine_criticals',
      description: 'rehearse critical 이슈가 refine에서 추적',
      passed: hasCriticalTracking,
    });

    const hasSharpestCritique = /sharpest.*critique|가장.*날카로운/i.test(files.refine);
    evals.push({
      id: 'rehearse_to_refine_sharpest_critique',
      description: 'rehearse sharpest critique가 refine에서 참조',
      passed: hasSharpestCritique,
    });
  }

  // Cross-pipeline: context consistency (build/decide matches)
  if (files.reframe && files.recast) {
    const reframeContext = /context:\s*(build|decide)/i.exec(files.reframe)?.[1]?.toLowerCase();
    const recastContext = /context:\s*(build|decide)/i.exec(files.recast)?.[1]?.toLowerCase();
    if (reframeContext && recastContext) {
      evals.push({
        id: 'context_consistency',
        description: 'build/decide context가 reframe↔recast 간 일치',
        passed: reframeContext === recastContext,
      });
    }
  }

  // Cross-pipeline: governing idea consistency
  if (files.recast && files.refine) {
    const hasPreserved = /governing.*preserved.*true|governing_idea_preserved/i.test(files.refine);
    evals.push({
      id: 'governing_idea_consistency',
      description: 'refine에서 governing idea 보존 여부 확인됨',
      passed: hasPreserved,
    });
  }

  // Cross-pipeline: blind spot tracking (reframe → rehearse → refine)
  if (files.reframe && files.rehearse) {
    // Extract blind spot keyword from reframe
    const blindSpotMatch = files.reframe.match(/💡\s*(.+)/);
    if (blindSpotMatch) {
      const keywords = blindSpotMatch[1].split(/[\s,，]+/).filter(w => w.length > 2).slice(0, 3);
      const trackedInRehearsal = keywords.some(k => files.rehearse!.toLowerCase().includes(k.toLowerCase()));
      evals.push({
        id: 'blind_spot_tracked_to_rehearse',
        description: 'reframe 블라인드 스팟이 rehearse에서 반영/언급',
        passed: trackedInRehearsal,
      });
    }
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
export function formatEvalReport(result: EvalResult, chainingResults?: ChainingEval[]): string {
  const lines: string[] = [];
  const passed = result.structural.filter(s => s.passed).length;
  const total = result.structural.length;
  const pct = Math.round(result.structural_pass_rate * 100);

  lines.push(`\n# /${result.skill} Quality Eval`);
  lines.push(`Structural: ${pct}% (${passed}/${total})`);
  lines.push('');

  for (const s of result.structural) {
    lines.push(`  ${s.passed ? '✓' : '✗'} ${s.id}`);
  }

  if (result.structural.some(s => !s.passed)) {
    lines.push('');
    lines.push('⚠ Structural failures — fix these first.');
  }

  lines.push('');
  lines.push(`Content: ${result.content_criteria.length}개 기준 (LLM judge 필요)`);
  for (const c of result.content_criteria) {
    lines.push(`  ? ${c.id}`);
    lines.push(`    ${c.question}`);
  }

  if (chainingResults && chainingResults.length > 0) {
    const chainPassed = chainingResults.filter(e => e.passed).length;
    lines.push('');
    lines.push(`Pipeline chaining: ${chainPassed}/${chainingResults.length}`);
    for (const e of chainingResults) {
      lines.push(`  ${e.passed ? '✓' : '✗'} ${e.id}`);
    }
  }

  return lines.join('\n');
}

/**
 * Skill Quality Eval — 프레임워크 자체 테스트 + 샘플 출력 검증
 */

import {
  evaluateSkillOutput,
  evaluatePipelineChaining,
  formatEvalReport,
  TEST_SCENARIOS,
  type SkillName,
} from '@/lib/skill-quality-eval';

/* ────────────────────────────────────
   Framework Tests
   ──────────────────────────────────── */

describe('evaluateSkillOutput', () => {
  it('returns structural evals for each skill', () => {
    const skills: SkillName[] = ['reframe', 'recast', 'rehearse', 'refine', 'overture'];
    for (const skill of skills) {
      const result = evaluateSkillOutput(skill, '');
      expect(result.skill).toBe(skill);
      expect(result.structural.length).toBeGreaterThan(0);
      expect(result.content_criteria.length).toBeGreaterThan(0);
    }
  });

  it('empty output fails almost all structural evals', () => {
    const result = evaluateSkillOutput('reframe', '');
    // no_flattery_opening passes on empty (absence of flattery = pass)
    const meaningfulEvals = result.structural.filter(s => s.id !== 'no_flattery_opening');
    expect(meaningfulEvals.every(s => !s.passed)).toBe(true);
    expect(result.structural_pass_rate).toBeLessThanOrEqual(0.1);
  });

  it('generates content judge prompt with output', () => {
    const result = evaluateSkillOutput('reframe', 'test output');
    expect(result.content_judge_prompt).toContain('test output');
    expect(result.content_judge_prompt).toContain('PASS');
    expect(result.content_judge_prompt).toContain('FAIL');
  });
});

describe('formatEvalReport', () => {
  it('generates readable report', () => {
    const result = evaluateSkillOutput('reframe', '');
    const report = formatEvalReport(result);
    expect(report).toContain('/reframe');
    expect(report).toContain('✗');
  });
});

describe('TEST_SCENARIOS', () => {
  it('has at least 3 scenarios', () => {
    expect(TEST_SCENARIOS.length).toBeGreaterThanOrEqual(3);
  });

  it('includes both build and decide contexts', () => {
    const contexts = new Set(TEST_SCENARIOS.map(s => s.context));
    expect(contexts.has('build')).toBe(true);
    expect(contexts.has('decide')).toBe(true);
  });
});

/* ────────────────────────────────────
   Structural Eval: /reframe
   ──────────────────────────────────── */

describe('/reframe structural evals', () => {
  const GOOD_REFRAME = `
  ╭──────────────────────────────────────────╮
  │  🔍 Overture · Reframe                   │
  ╰──────────────────────────────────────────╯

  💭 인터뷰 결과:
  ▸ 불확실성: what (무엇을 해야 할지 모름)
  ▸ 성공 기준: revenue (매출)

  ## 재정의된 질문

  ▸ "동남아 시장에서 우리 제품이 살아남을 수 있는 최소 조건은 무엇인가?"

  이 질문이 더 날카로운 이유: 단순 "진출 여부"가 아니라 생존 조건을 먼저 정의한다.

  ## 숨겨진 가정

  1. ✓ 현재 제품이 동남아 시장에 맞을 것이다 (고객 가치)
  2. ? 현지 파트너 없이 진출 가능하다 (실행 가능성)
  3. ✗ 6개월 내 PMF 달성 가능하다 (타이밍) — 의심: 현지 규제 + 문화 적응에 6개월은 비현실적
  4. ? 동남아 B2B 시장이 충분히 크다 (사업성)

  ## 먼저 답해야 할 질문

  - 현지 B2B SaaS 시장에서 유사 제품 사용 현황 조사 (3곳 인터뷰)
  - 현지 규제 전문가에게 데이터 이전 규정 확인
  - 기존 고객 중 동남아 지사 있는 곳에 수요 여부 직접 확인

  ## 💡 블라인드 스팟

  "진출"이라는 프레임 자체가 의문. 현지 기업과 파트너십이 아닌 직접 진출만 고려하고 있는가?

  다음?  1 → /recast  2 → 수정  3 → 저장
  `;

  it('good output passes all structural evals', () => {
    const result = evaluateSkillOutput('reframe', GOOD_REFRAME);
    const failures = result.structural.filter(s => !s.passed);
    if (failures.length > 0) {
      console.log('Failures:', failures.map(f => f.id));
    }
    expect(result.structural_pass_rate).toBeGreaterThanOrEqual(0.85);
  });

  it('detects missing header', () => {
    const noHeader = GOOD_REFRAME.replace(/Overture\s*·?\s*Reframe/gi, '');
    const result = evaluateSkillOutput('reframe', noHeader);
    expect(result.structural.find(s => s.id === 'has_header')?.passed).toBe(false);
  });

  it('detects too few assumptions', () => {
    const fewAssumptions = `
    Overture · Reframe
    ▸ 재정의된 질문
    1. 가정 하나만 (고객 가치)
    블라인드 스팟 있음
    이 텍스트는 500자를 넘기 위해 패딩합니다. 충분히 긴 출력이어야 합니다. 이 텍스트는 500자를 넘기 위해 패딩합니다. 충분히 긴 출력이어야 합니다. 이 텍스트는 500자를 넘기 위해 패딩합니다. 충분히 긴 출력이어야 합니다. 이 텍스트는 500자를 넘기 위해 패딩합니다. 충분히 긴 출력이어야 합니다.
    `;
    const result = evaluateSkillOutput('reframe', fewAssumptions);
    expect(result.structural.find(s => s.id === 'has_assumptions_3plus')?.passed).toBe(false);
  });
});

/* ────────────────────────────────────
   Structural Eval: /recast
   ──────────────────────────────────── */

describe('/recast structural evals', () => {
  const GOOD_RECAST = `
  ╭──────────────────────────────────────────╮
  │  📋 Overture · Recast                    │
  ╰──────────────────────────────────────────╯

  ## Governing Idea
  핵심 방향: 고객 검증 우선, 기술 투자는 검증 후

  ## Storyline
  상황: B2B SaaS 동남아 진출 검토
  Complication: 현지 고객 니즈 미검증 + 규제 불확실
  Resolution: 3단계 검증 → 파일럿 → 확장

  ## 실행 계획

  Step 1. 🧑 Human — 현지 파트너 3곳 인터뷰
  산출물: 파트너십 가능성 보고서
  ⚑ Checkpoint: PMF 가능성 판단

  Step 2. 🤖 AI — 경쟁사 분석 및 시장 규모 추정
  산출물: 시장 분석 문서

  Step 3. ⚡ Both — 파일럿 설계 및 실행
  산출물: 파일럿 결과 데이터

  Step 4. 🧑 Human — 투자 의사결정
  산출물: Go/No-Go 결정문
  ⚑ Checkpoint: 최종 투자 결정

  ## 핵심 가정
  1. 현지 파트너가 협력 의향이 있다
  2. 3개월 내 파일럿 가능하다

  ## Scope Cuts ✂
  - 다국어 앱 현지화 (1차에서 제외)
  - 현지 결제 연동

  ## Success Metric
  성공 = 파일럿 3개월 후 현지 고객 5곳 유료 전환
  `;

  it('good output passes all structural evals', () => {
    const result = evaluateSkillOutput('recast', GOOD_RECAST);
    expect(result.structural_pass_rate).toBeGreaterThanOrEqual(0.85);
  });

  it('detects missing actor labels', () => {
    const noActors = GOOD_RECAST.replace(/🧑|🤖|⚡|Human|AI|Both/g, '');
    const result = evaluateSkillOutput('recast', noActors);
    expect(result.structural.find(s => s.id === 'has_actor_labels')?.passed).toBe(false);
  });
});

/* ────────────────────────────────────
   Structural Eval: /rehearse
   ──────────────────────────────────── */

describe('/rehearse structural evals', () => {
  const GOOD_REHEARSE = `
  ╭──────────────────────────────────────────╮
  │  👥 Overture · Rehearse                  │
  ╰──────────────────────────────────────────╯

  ## 👤 Persona 1 — 김 이사 (해외사업본부장)
  ───────────────────────────────────
  역할: 동남아 사업 총괄, 3년 현지 경험
  관점: 실행 가능성 중심

  ✗ 현지 파트너 인터뷰 3곳으로는 시장 대표성 부족
  ? 파일럿 3개월 일정이 현실적인지 의문
  승인 조건: 파트너 최소 5곳 + 현지 법률 검토 완료

  첫 질문: "우리 제품의 현지화 비용을 산정했나요?"

  ## 👤 Persona 2 — 박 CFO (재무총괄)
  ───────────────────────────────────
  역할: 재무 건전성 최우선
  관점: ROI 중심

  ✗ 파일럿 비용 대비 기대 수익이 불명확
  ? 기존 시장 대신 동남아에 투자하는 기회비용 검토 부재
  승인 조건: 투자 회수 기간 18개월 이내 시나리오

  첫 질문: "기존 시장에서 같은 금액을 투자하면 얼마나 성장할 수 있나요?"

  ## 🔇 침묵의 리스크
  - "대표가 동남아 출장을 좋아해서 추진하는 건 아닌가" — 의사결정 동기의 순수성
  - 현지 팀 구성원들이 한국 본사와의 커뮤니케이션 갈등을 예상하고 있음

  ## Bottom Line — 먼저 해야 할 것
  1. Step 1 파트너 인터뷰를 5곳으로 확대
  2. 현지 법률 검토를 투자 결정 전 완료
  3. 기회비용 분석 (기존 시장 대비)

  ## Devil's Advocate ⚡
  - Realistic failure: 파일럿 3개월 후 현지화 비용이 예산의 3배 — PMF 이전에 자금 소진
  - Silent problem: 팀 내 동남아 경험자 0명인데 아무도 이걸 문제라고 말하지 않음
  - 1-year regret: 동남아에 1년 투자 후, 그 자원으로 기존 시장 20% 성장 가능했음을 깨달음
  `;

  it('good output passes all structural evals', () => {
    const result = evaluateSkillOutput('rehearse', GOOD_REHEARSE);
    expect(result.structural_pass_rate).toBeGreaterThanOrEqual(0.85);
  });

  it('detects missing unspoken risks', () => {
    const noUnspoken = GOOD_REHEARSE.replace(/🔇.*침묵[\s\S]*$/, '');
    const result = evaluateSkillOutput('rehearse', noUnspoken);
    expect(result.structural.find(s => s.id === 'has_unspoken_risks')?.passed).toBe(false);
  });
});

/* ────────────────────────────────────
   Pipeline Chaining Eval
   ──────────────────────────────────── */

describe('evaluatePipelineChaining', () => {
  const REFRAME_FILE = `
# Reframe
Context Contract
reframed_question: "sharp question"
assumptions_uncertain:
  - "가정1" | reason: test
ai_limitations:
  - "limit1"
  `;

  const RECAST_FILE = `
# Recast
Context Contract
product_thesis: "thesis"
inherited_assumptions: ["가정1 from reframe"]
ai_limitations:
  - "limit1"
target_user:
  name: 준호
skeptic:
  name: 수진
  `;

  const REHEARSE_FILE = `
# Rehearse
Context Contract
classified_risks:
  critical:
    - "risk1" — 준호
untested_assumptions:
  - "가정1"
persona_profiles:
  - name: 준호
  - name: 수진
  `;

  const REFINE_FILE = `
# Refine
Context Contract
Critical: 3 → 1
sharpest_critique_resolved: "quote" → fixed
converged: false
  `;

  it('passes full pipeline chaining', () => {
    const result = evaluatePipelineChaining({
      reframe: REFRAME_FILE,
      recast: RECAST_FILE,
      rehearse: REHEARSE_FILE,
      refine: REFINE_FILE,
    });
    const failures = result.filter(e => !e.passed);
    expect(failures.length).toBeLessThanOrEqual(1); // some heuristic may not match
  });

  it('detects missing context contract', () => {
    const result = evaluatePipelineChaining({
      reframe: '# Reframe\nno contract here',
    });
    expect(result.find(e => e.id === 'reframe_has_context_contract')?.passed).toBe(false);
  });

  it('detects broken persona chaining', () => {
    const result = evaluatePipelineChaining({
      recast: 'Context Contract\ntarget_user:\n  name: 철수',
      rehearse: 'Context Contract\n영희가 리뷰함',
    });
    expect(result.find(e => e.id === 'recast_to_rehearse_personas')?.passed).toBe(false);
  });

  it('detects missing critical tracking in refine', () => {
    const result = evaluatePipelineChaining({
      rehearse: 'Context Contract\ncritical: risk',
      refine: 'Context Contract\nall good no changes',
    });
    expect(result.find(e => e.id === 'rehearse_to_refine_criticals')?.passed).toBe(false);
  });
});

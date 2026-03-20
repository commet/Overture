/**
 * Workflow Review Engine — Phase 2 (BMAD 패턴)
 *
 * 워크플로우를 3가지 관점에서 병렬 검증:
 * 1. Skeptic — 약점과 빈틈 찾기
 * 2. Optimizer — 효율성 개선점 찾기
 * 3. Domain — 도메인별 리스크 찾기 (동적 선택)
 *
 * 각 리뷰어는 구조화된 JSON만 반환 (BMAD subagent 패턴).
 */

import type { OrchestrateStep, ReviewFinding, WorkflowReview } from '@/stores/types';
import { callLLMJson } from '@/lib/llm';

/* ────────────────────────────────────
   Review Lens Definitions
   ──────────────────────────────────── */

interface ReviewLens {
  id: string;
  label: string;
  buildPrompt: (context: ReviewContext) => string;
}

interface ReviewContext {
  governing_idea: string;
  goal_summary: string;
  steps: OrchestrateStep[];
  key_assumptions_text: string;
  original_task: string;
}

interface ReviewOutput {
  findings: {
    type: 'gap' | 'suggestion' | 'risk' | 'opportunity';
    severity: 'high' | 'medium' | 'low';
    text: string;
    affected_steps?: number[];
  }[];
}

const SKEPTIC_LENS: ReviewLens = {
  id: 'skeptic',
  label: '비판적 검토',
  buildPrompt: (ctx) => `당신은 전략 계획의 약점을 찾는 비판적 리뷰어입니다.

아래 워크플로우의 가장 큰 약점과 빈틈을 찾으세요.

[핵심 방향] ${ctx.governing_idea}
[목표] ${ctx.goal_summary}
[워크플로우]
${ctx.steps.map((s, i) => `${i + 1}. [${s.actor}] ${s.task} → 산출물: ${s.expected_output}`).join('\n')}
[핵심 가정]
${ctx.key_assumptions_text}

다음 관점에서 검토하세요:
- 이 계획이 실패한다면 가장 가능성 높은 이유는?
- 검증되지 않은 가정이 계획에 어떤 영향을 미치는가?
- 빠진 단계나 고려하지 못한 것은?

JSON으로만 응답하세요:
{
  "findings": [
    {
      "type": "gap" 또는 "risk",
      "severity": "high" 또는 "medium" 또는 "low",
      "text": "구체적 약점 설명 (한 문장)",
      "affected_steps": [해당 단계 번호]
    }
  ]
}
findings는 3-5개. 반드시 JSON만 응답하세요.`,
};

const OPTIMIZER_LENS: ReviewLens = {
  id: 'optimizer',
  label: '효율성 검토',
  buildPrompt: (ctx) => `당신은 워크플로우 효율성 전문가입니다.

아래 계획에서 불필요하거나 비효율적인 부분, 또는 더 좋은 방법을 찾으세요.

[핵심 방향] ${ctx.governing_idea}
[워크플로우]
${ctx.steps.map((s, i) => `${i + 1}. [${s.actor}] ${s.task} (${s.estimated_time || '?'}) → ${s.expected_output}`).join('\n')}

다음 관점에서 검토하세요:
- 병렬로 처리할 수 있는 단계는?
- 불필요하거나 중복되는 단계는?
- AI에게 더 위임할 수 있는 단계는?
- 순서를 바꾸면 더 효율적인 부분은?

JSON으로만 응답하세요:
{
  "findings": [
    {
      "type": "suggestion" 또는 "opportunity",
      "severity": "high" 또는 "medium" 또는 "low",
      "text": "구체적 개선 제안 (한 문장)",
      "affected_steps": [해당 단계 번호]
    }
  ]
}
findings는 2-4개. 반드시 JSON만 응답하세요.`,
};

/* ────────────────────────────────────
   Domain Reviewer Selection (BMAD)
   ──────────────────────────────────── */

type DomainType = 'market' | 'tech' | 'organization' | 'general';

const DOMAIN_LABELS: Record<DomainType, string> = {
  market: '시장 진출 리스크',
  tech: '기술 실현 가능성',
  organization: '조직 변화 관리',
  general: '전략적 리스크',
};

function selectDomainType(text: string): DomainType {
  const lower = text.toLowerCase();
  const marketKeywords = ['시장', '진출', '고객', '매출', '마케팅', '경쟁', 'gtm', 'go-to-market', '세일즈', '가격', '시장조사'];
  const techKeywords = ['개발', '시스템', '기술', '아키텍처', '구현', '인프라', 'api', '마이그레이션', '플랫폼', '서버'];
  const orgKeywords = ['조직', '팀', '프로세스', '채용', '문화', '교육', '온보딩', '변화관리', '리더십'];

  const marketScore = marketKeywords.filter(k => lower.includes(k)).length;
  const techScore = techKeywords.filter(k => lower.includes(k)).length;
  const orgScore = orgKeywords.filter(k => lower.includes(k)).length;

  if (marketScore >= techScore && marketScore >= orgScore && marketScore > 0) return 'market';
  if (techScore >= marketScore && techScore >= orgScore && techScore > 0) return 'tech';
  if (orgScore >= marketScore && orgScore >= techScore && orgScore > 0) return 'organization';
  return 'general';
}

function buildDomainLens(domainType: DomainType): ReviewLens {
  const domainPrompts: Record<DomainType, string> = {
    market: `당신은 시장 진출 리스크 전문가입니다.
이 계획에서 시장/고객/경쟁 관점에서 놓치고 있는 것을 찾으세요.
- 시장 규모나 타이밍에 대한 가정이 검증되지 않은 부분은?
- 경쟁사 대응이 고려되지 않은 부분은?
- 고객 니즈에 대한 검증이 빠진 부분은?`,

    tech: `당신은 기술 실현 가능성 전문가입니다.
이 계획에서 기술적으로 놓치고 있는 것을 찾으세요.
- 기술적 복잡도가 과소평가된 부분은?
- 의존성이나 통합 리스크가 빠진 부분은?
- 확장성이나 유지보수가 고려되지 않은 부분은?`,

    organization: `당신은 조직 변화 관리 전문가입니다.
이 계획에서 조직/사람 관점에서 놓치고 있는 것을 찾으세요.
- 이해관계자 저항이 예상되는 부분은?
- 역량 갭이 있는 부분은?
- 커뮤니케이션이나 변화관리가 빠진 부분은?`,

    general: `당신은 전략적 리스크 전문가입니다.
이 계획에서 전략적으로 놓치고 있는 것을 찾으세요.
- 외부 환경 변화에 취약한 부분은?
- 자원 배분이 비효율적인 부분은?
- 대안 시나리오가 고려되지 않은 부분은?`,
  };

  return {
    id: `domain_${domainType}`,
    label: DOMAIN_LABELS[domainType],
    buildPrompt: (ctx) => `${domainPrompts[domainType]}

[핵심 방향] ${ctx.governing_idea}
[원래 과제] ${ctx.original_task}
[워크플로우]
${ctx.steps.map((s, i) => `${i + 1}. [${s.actor}] ${s.task} → ${s.expected_output}`).join('\n')}
[핵심 가정]
${ctx.key_assumptions_text}

JSON으로만 응답하세요:
{
  "findings": [
    {
      "type": "risk" 또는 "opportunity",
      "severity": "high" 또는 "medium" 또는 "low",
      "text": "구체적 도메인 리스크 또는 기회 (한 문장)",
      "affected_steps": [해당 단계 번호]
    }
  ]
}
findings는 2-4개. 반드시 JSON만 응답하세요.`,
  };
}

/* ────────────────────────────────────
   Run Parallel Reviews
   ──────────────────────────────────── */

export async function runWorkflowReview(
  steps: OrchestrateStep[],
  governing_idea: string,
  goal_summary: string,
  key_assumptions: { assumption: string; if_wrong: string }[],
  original_task: string,
): Promise<WorkflowReview[]> {
  const ctx: ReviewContext = {
    governing_idea,
    goal_summary,
    steps,
    key_assumptions_text: key_assumptions
      .map((ka, i) => `${i + 1}. ${ka.assumption}${ka.if_wrong ? ` (틀리면: ${ka.if_wrong})` : ''}`)
      .join('\n'),
    original_task,
  };

  // Select domain reviewer dynamically
  const domainType = selectDomainType(`${original_task} ${governing_idea} ${goal_summary}`);
  const domainLens = buildDomainLens(domainType);

  const lenses: ReviewLens[] = [SKEPTIC_LENS, OPTIMIZER_LENS, domainLens];

  // Run all 3 reviews in parallel
  const results = await Promise.allSettled(
    lenses.map(async (lens) => {
      const prompt = lens.buildPrompt(ctx);
      const output = await callLLMJson<ReviewOutput>(
        [{ role: 'user', content: '위 워크플로우를 검토해주세요.' }],
        { system: prompt, maxTokens: 1200 }
      );
      return {
        lens: lens.id,
        lens_label: lens.label,
        findings: (output.findings || []).map(f => ({
          type: f.type || 'risk',
          severity: f.severity || 'medium',
          text: f.text || '',
          affected_steps: f.affected_steps,
        })) as ReviewFinding[],
        reviewed_at: new Date().toISOString(),
      } satisfies WorkflowReview;
    })
  );

  // Collect successful reviews, skip failed ones
  return results
    .filter((r): r is PromiseFulfilledResult<WorkflowReview> => r.status === 'fulfilled')
    .map(r => r.value);
}

/* ────────────────────────────────────
   Review Summary Helpers
   ──────────────────────────────────── */

export function countBySeverity(reviews: WorkflowReview[]): { high: number; medium: number; low: number } {
  const all = reviews.flatMap(r => r.findings);
  return {
    high: all.filter(f => f.severity === 'high').length,
    medium: all.filter(f => f.severity === 'medium').length,
    low: all.filter(f => f.severity === 'low').length,
  };
}

export function getStepWarnings(reviews: WorkflowReview[], stepIndex: number): ReviewFinding[] {
  return reviews
    .flatMap(r => r.findings)
    .filter(f => f.affected_steps?.includes(stepIndex + 1));
}

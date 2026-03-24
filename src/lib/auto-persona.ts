/**
 * Auto-Persona Extraction — 맥락 기반 자동 페르소나 생성
 *
 * 악보 해석 + 편곡에서 축적된 데이터를 분석하여
 * 리허설에 필요한 이해관계자 2-3명을 자동 식별합니다.
 */

import { callLLMJson } from './llm';
import type { DecomposeItem, OrchestrateItem, Persona, SuggestedReviewer } from '@/stores/types';
import { generateId } from './uuid';

export interface AutoPersona {
  name: string;
  role: string;
  influence: 'high' | 'medium' | 'low';
  priorities: string;
  communication_style: string;
  known_concerns: string;
  why_relevant: string;
}

/**
 * Extract 2-3 relevant personas from accumulated project context.
 * Uses LLM to analyze decompose + orchestrate data.
 */
export async function extractPersonasFromContext(
  decompose: DecomposeItem | null,
  orchestrate: OrchestrateItem,
): Promise<AutoPersona[]> {
  const analysis = orchestrate.analysis;
  if (!analysis) return [];

  // Build rich context from all available data
  const contextParts: string[] = [];

  // From decompose
  if (decompose) {
    contextParts.push(`[원래 과제]\n${decompose.input_text}`);
    if (decompose.analysis) {
      contextParts.push(`[재정의된 질문]\n${decompose.analysis.reframed_question || decompose.analysis.surface_task}`);
    }
  }

  // From orchestrate
  contextParts.push(`[핵심 방향]\n${analysis.governing_idea}`);
  contextParts.push(`[최종 목표]\n${analysis.goal_summary}`);

  if (analysis.steps) {
    const stepsSummary = analysis.steps.map((s, i) =>
      `${i + 1}. [${s.actor}] ${s.task}${s.checkpoint ? ' (체크포인트)' : ''}${s.judgment ? ` — 판단: ${s.judgment}` : ''}`
    ).join('\n');
    contextParts.push(`[실행 계획]\n${stepsSummary}`);
  }

  if (analysis.key_assumptions) {
    const assumptions = analysis.key_assumptions
      .map(a => `- ${a.assumption} (중요도: ${a.importance})`)
      .join('\n');
    contextParts.push(`[핵심 가정]\n${assumptions}`);
  }

  contextParts.push(`[편곡 입력 맥락]\n${orchestrate.input_text}`);

  const context = contextParts.join('\n\n');

  const system = `당신은 조직 분석 전문가입니다. 프로젝트 맥락을 분석하여, 이 계획을 검증할 때 반드시 고려해야 할 이해관계자 2-3명을 식별하세요.

이해관계자 선정 기준:
1. 이 결과물을 직접 받아볼 사람 (보고 대상, 의사결정자)
2. 이 계획의 성공에 자원·권한으로 영향을 미치는 사람
3. 이 계획의 현실성을 검증할 수 있는 현장 전문가

각 페르소나를 구체적이고 현실적으로 작성하세요:
- name: 한국식 성+직함 (예: "김 부장", "박 대표")
- role: 구체적 역할 (예: "영업본부장", "CFO", "현장 PM")
- influence: "high" (이 사람이 반대하면 계획이 무산) | "medium" (의견이 중요하지만 결정권은 없음) | "low" (참고 의견)
- priorities: 이 사람이 가장 중요하게 여기는 것 1-2개
- communication_style: 보고를 받을 때의 성향 (예: "숫자 중심, 결론부터", "맥락을 먼저 이해하고 싶어함")
- known_concerns: 이 프로젝트에 대해 우려할 가능성이 높은 것
- why_relevant: 이 사람에게 리허설을 받아야 하는 이유 한 문장

JSON 배열로만 응답하세요.`;

  try {
    const personas = await callLLMJson<AutoPersona[]>(
      [{ role: 'user', content: context }],
      { system, maxTokens: 1500 }
    );
    return Array.isArray(personas) ? personas.slice(0, 3) : [];
  } catch {
    return [];
  }
}

/**
 * Convert AutoPersona to a full Persona object for the store.
 */
export function autoPersonaToFull(auto: AutoPersona | SuggestedReviewer): Persona {
  const isSuggested = 'decision_style' in auto;
  return {
    id: generateId(),
    name: auto.name,
    role: auto.role,
    organization: '',
    priorities: auto.priorities,
    communication_style: auto.communication_style,
    known_concerns: auto.known_concerns,
    relationship_notes: auto.why_relevant,
    influence: auto.influence,
    decision_style: isSuggested ? (auto as SuggestedReviewer).decision_style : undefined,
    risk_tolerance: isSuggested ? (auto as SuggestedReviewer).risk_tolerance : undefined,
    success_metric: isSuggested ? (auto as SuggestedReviewer).success_metric : undefined,
    extracted_traits: isSuggested
      ? [
          { analytical: '데이터 중심', intuitive: '직관적', consensus: '합의 중시', directive: '결단력' }[(auto as SuggestedReviewer).decision_style] || '',
          { low: '리스크 회피', medium: '균형적', high: '도전적' }[(auto as SuggestedReviewer).risk_tolerance] || '',
          ...auto.priorities.split(/[,、·]/).map(t => t.trim()).filter(Boolean).slice(0, 1),
        ].filter(Boolean)
      : auto.priorities.split(/[,、·]/).map(t => t.trim()).filter(Boolean).slice(0, 3),
    feedback_logs: [],
    is_example: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

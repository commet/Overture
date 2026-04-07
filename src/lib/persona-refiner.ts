/**
 * Persona Refiner — 자연어 → 페르소나 프로필 변환 + 완성도 시각화
 *
 * "우리 팀장은 숫자 없으면 안 넘어가는 ISTJ야"
 * → 구조화된 페르소나 필드로 변환
 * → 채워지는 정도를 시각적으로 표현
 */

import { callLLMJson } from './llm';
import type { Persona } from '@/stores/types';
import { sanitizeForPrompt } from './persona-prompt';

// ─── Types ───

export interface PersonaRefinement {
  name?: string | null;
  role?: string | null;
  priorities?: string | null;
  communication_style?: string | null;
  known_concerns?: string | null;
  decision_style?: 'analytical' | 'intuitive' | 'consensus' | 'directive' | null;
  risk_tolerance?: 'low' | 'medium' | 'high' | null;
  success_metric?: string | null;
  extracted_traits?: string[] | null;
  influence?: 'high' | 'medium' | 'low' | null;
}

export interface PersonaCompleteness {
  score: number;          // 0-100
  level: 1 | 2 | 3 | 4;
  label: string;          // "윤곽" | "구체화" | "생생함" | "살아있음"
  labelEn: string;        // "Outline" | "Shaped" | "Vivid" | "Alive"
  filled: string[];       // 채워진 필드 이름
  missing: string[];      // 비어있는 필드 이름
  visual: string;         // "●●●○○"
  nextHint: string;       // 다음에 채우면 좋을 것 — 한 줄 안내
}

// ─── Completeness Calculator ───

const PERSONA_FIELDS: Array<{
  key: keyof Persona;
  label: string;
  weight: number;
  hint: string;
}> = [
  { key: 'name',                label: '이름/직함',    weight: 10, hint: '이름이나 직함을 알려주세요' },
  { key: 'role',                label: '역할',        weight: 10, hint: '어떤 역할인지 알려주세요' },
  { key: 'decision_style',     label: '의사결정 방식', weight: 15, hint: '어떻게 결정하는 사람인가요? (데이터 vs 직관 vs 합의 vs 지시)' },
  { key: 'priorities',         label: '우선순위',      weight: 15, hint: '이 사람이 가장 중요하게 여기는 건 뭔가요?' },
  { key: 'communication_style', label: '소통 습관',    weight: 15, hint: '보고 받을 때 어떤 스타일인가요? (결론부터? 맥락부터?)' },
  { key: 'known_concerns',     label: '주요 우려',     weight: 10, hint: '자주 짚는 것이나 우려하는 건 뭔가요?' },
  { key: 'risk_tolerance',     label: '리스크 수용도',  weight: 10, hint: '도전적인 편? 신중한 편?' },
  { key: 'success_metric',     label: '성공 기준',     weight: 10, hint: '"이거 보여주면 OK" 하는 기준이 있나요?' },
  { key: 'user_description',   label: '사용자 서술',   weight: 5,  hint: '이 사람에 대해 자유롭게 설명해주세요' },
];

/**
 * Calculate how complete/vivid a persona is.
 * Returns score, level, visual indicator, and what to fill next.
 */
export function getPersonaCompleteness(persona: Persona): PersonaCompleteness {
  let totalWeight = 0;
  let earnedWeight = 0;
  const filled: string[] = [];
  const missing: string[] = [];

  for (const field of PERSONA_FIELDS) {
    totalWeight += field.weight;
    const value = persona[field.key];

    const isFilled = value !== undefined
      && value !== null
      && value !== ''
      && !(Array.isArray(value) && value.length === 0);

    if (isFilled) {
      earnedWeight += field.weight;
      filled.push(field.label);
    } else {
      missing.push(field.label);
    }
  }

  // Bonus: feedback_logs (persona has been used in rehearsal)
  if ((persona.feedback_logs || []).length > 0) {
    earnedWeight += 5;
    filled.push('리허설 이력');
  }

  const score = Math.min(Math.round((earnedWeight / totalWeight) * 100), 100);

  // Level thresholds
  let level: 1 | 2 | 3 | 4;
  let label: string;
  let labelEn: string;
  if (score >= 85) {
    level = 4; label = '살아있음'; labelEn = 'Alive';
  } else if (score >= 60) {
    level = 3; label = '생생함'; labelEn = 'Vivid';
  } else if (score >= 35) {
    level = 2; label = '구체화'; labelEn = 'Shaped';
  } else {
    level = 1; label = '윤곽'; labelEn = 'Outline';
  }

  // Visual: 5 dots
  const filledDots = Math.round((score / 100) * 5);
  const visual = '●'.repeat(filledDots) + '○'.repeat(5 - filledDots);

  // Next hint: first missing field with highest weight
  const missingFields = PERSONA_FIELDS
    .filter(f => {
      const v = persona[f.key];
      return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
    })
    .sort((a, b) => b.weight - a.weight);

  const nextHint = missingFields.length > 0
    ? missingFields[0].hint
    : '충분히 구체적입니다';

  return { score, level, label, labelEn, filled, missing, visual, nextHint };
}

/**
 * Format completeness as a one-line display for CLI/plugin output.
 *
 * Example: "●●●○○ 구체화 (60%) — 소통 습관 추가하면 더 정확해져요"
 */
export function formatCompletenessLine(persona: Persona): string {
  const c = getPersonaCompleteness(persona);
  const base = `${c.visual} ${c.label} (${c.score}%)`;
  return c.score >= 85 ? base : `${base} — ${c.nextHint}`;
}

/**
 * Format a before→after comparison when persona is refined.
 *
 * Example:
 *   김 부장 ●●○○○ 윤곽 → ●●●●○ 생생함
 *   + 의사결정: analytical  + 리스크: low  + "숫자 없으면 안 넘어감"
 */
export function formatRefinementDiff(
  before: PersonaCompleteness,
  after: PersonaCompleteness,
  changes: PersonaRefinement,
): string {
  const header = `${before.visual} ${before.label} → ${after.visual} ${after.label}`;

  const changeLines: string[] = [];
  if (changes.decision_style) changeLines.push(`의사결정: ${changes.decision_style}`);
  if (changes.risk_tolerance) changeLines.push(`리스크: ${changes.risk_tolerance}`);
  if (changes.priorities) changeLines.push(`우선순위: ${changes.priorities}`);
  if (changes.communication_style) changeLines.push(`소통: ${changes.communication_style}`);
  if (changes.known_concerns) changeLines.push(`우려: ${changes.known_concerns}`);
  if (changes.success_metric) changeLines.push(`OK기준: ${changes.success_metric}`);
  if (changes.extracted_traits?.length) changeLines.push(`성격: ${changes.extracted_traits.join(', ')}`);

  const diff = changeLines.map(l => `+ ${l}`).join('\n');
  return `${header}\n${diff}`;
}

// ─── Core Refinement Function ───

/**
 * Refine a persona from free-form user description.
 *
 * If existingPersona is provided, only updates fields that the description affects.
 * If null, creates a new persona profile from scratch.
 *
 * The user's original text is preserved as `user_description` for prompt injection.
 */
export async function refinePersonaFromFreeText(
  freeText: string,
  existingPersona?: Persona | null,
): Promise<PersonaRefinement> {
  const s = sanitizeForPrompt;

  const existingContext = existingPersona
    ? `\n\n현재 프로필:
- 이름: ${s(existingPersona.name)}
- 역할: ${s(existingPersona.role)}
- 우선순위: ${s(existingPersona.priorities)}
- 소통 방식: ${s(existingPersona.communication_style)}
- 우려사항: ${s(existingPersona.known_concerns)}
- 의사결정 스타일: ${existingPersona.decision_style || '미정'}
- 리스크 수용도: ${existingPersona.risk_tolerance || '미정'}
- 성공 기준: ${s(existingPersona.success_metric || '')}
- 성격 특성: ${(existingPersona.extracted_traits || []).join(', ')}

사용자의 설명과 충돌하는 부분만 업데이트하세요. 언급하지 않은 필드는 null로 두세요.`
    : '';

  const system = `당신은 조직 심리학 전문가입니다. 사용자가 자연어로 상사/이해관계자의 특성을 설명합니다.
이 설명을 분석하여 구조화된 페르소나 프로필로 변환하세요.

핵심 원칙:
1. 사용자의 표현을 최대한 살려서 반영 — "숫자 없으면 안 넘어가" → communication_style에 그대로
2. 직접 언급하지 않은 것은 null로 — 추론해서 채우지 마세요
3. MBTI/성격유형 언급 → decision_style과 risk_tolerance로 매핑:
   - ISTJ/INTJ/ESTJ → analytical + low risk
   - ENFP/ENTP → intuitive + high risk
   - ISFJ/ESFJ → consensus + low risk
   - ENTJ/ESTP → directive + medium-high risk
4. 구체적 에피소드 → communication_style과 known_concerns에 원문 느낌 살려서 반영
5. extracted_traits는 사용자가 쓴 표현 기반 키워드 3-5개${existingContext}

응답 형식 (JSON만):
{
  "name": "이름/직함 (언급된 경우만, 아니면 null)",
  "role": "역할 (언급된 경우만, 아니면 null)",
  "priorities": "이 사람이 가장 중요하게 여기는 것 — 사용자 표현 기반 (또는 null)",
  "communication_style": "소통 습관 — 사용자가 한 말 그대로 살려서 (또는 null)",
  "known_concerns": "주로 짚는 것 (또는 null)",
  "decision_style": "analytical | intuitive | consensus | directive (또는 null)",
  "risk_tolerance": "low | medium | high (또는 null)",
  "success_metric": "OK 기준 (또는 null)",
  "extracted_traits": ["사용자 표현 기반 키워드 3-5개"] 또는 null,
  "influence": "high | medium | low (또는 null)"
}

null = 정보 부족 또는 변경 없음. 반드시 JSON만 응답.`;

  const userMessage = `사용자의 설명:\n"${s(freeText)}"`;

  try {
    const result = await callLLMJson<PersonaRefinement>(
      [{ role: 'user', content: userMessage }],
      { system, maxTokens: 800 }
    );

    // Filter out null values
    const filtered: PersonaRefinement = {};
    for (const [key, value] of Object.entries(result || {})) {
      if (value !== null && value !== undefined) {
        (filtered as Record<string, unknown>)[key] = value;
      }
    }
    return filtered;
  } catch {
    return {};
  }
}

/**
 * Apply refinement to an existing persona, merging changes.
 * Returns the updated persona (does NOT persist — caller's responsibility).
 */
export function applyRefinement(
  persona: Persona,
  refinement: PersonaRefinement,
  originalText: string,
): Persona {
  const updated = { ...persona };

  if (refinement.name) updated.name = refinement.name;
  if (refinement.role) updated.role = refinement.role;
  if (refinement.priorities) updated.priorities = refinement.priorities;
  if (refinement.communication_style) updated.communication_style = refinement.communication_style;
  if (refinement.known_concerns) updated.known_concerns = refinement.known_concerns;
  if (refinement.decision_style) updated.decision_style = refinement.decision_style;
  if (refinement.risk_tolerance) updated.risk_tolerance = refinement.risk_tolerance;
  if (refinement.success_metric) updated.success_metric = refinement.success_metric;
  if (refinement.influence) updated.influence = refinement.influence;
  if (refinement.extracted_traits?.length) {
    // Merge traits, deduplicate
    const existing = new Set(updated.extracted_traits || []);
    for (const t of refinement.extracted_traits) existing.add(t);
    updated.extracted_traits = [...existing];
  }

  // Append user description (accumulate, don't overwrite)
  const prev = updated.user_description || '';
  updated.user_description = prev
    ? `${prev}\n${originalText}`
    : originalText;

  updated.updated_at = new Date().toISOString();
  return updated;
}

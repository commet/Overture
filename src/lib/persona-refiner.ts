/**
 * Persona Refiner — 자연어 → 페르소나 프로필 변환 + 완성도 시각화
 *
 * "우리 팀장은 숫자 없으면 안 넘어가는 ISTJ야"
 * → 구조화된 페르소나 필드로 변환
 * → 채워지는 정도를 시각적으로 표현 (캐릭터 시트)
 * → 완성도 ↔ 시뮬레이션 정밀도 연결
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
  filled: FieldStatus[];  // 채워진 필드 — 이름 + 밀도 표시
  missing: FieldStatus[]; // 비어있는 필드
  visual: string;         // "●●●○○"
  nextHint: string;       // 다음에 채우면 좋을 것
  simulationQuality: SimulationQuality;
}

export interface FieldStatus {
  label: string;
  density: 'empty' | 'thin' | 'rich';  // 비어있음 | 한 줄 | 구체적 서술
  icon: string;                          // ○ | ◐ | ●
}

export interface SimulationQuality {
  level: 'generic' | 'directional' | 'realistic' | 'authentic';
  label: string;
  description: string;
}

// ─── Completeness Calculator ───

interface FieldSpec {
  key: keyof Persona;
  label: string;
  weight: number;
  hint: string;
  /** 내용의 밀도를 평가하는 최소 길이. 이 이상이면 'rich', 미만이면 'thin'. */
  richThreshold: number;
}

const PERSONA_FIELDS: FieldSpec[] = [
  { key: 'name',                label: '이름/직함',    weight: 8,  hint: '이름이나 직함을 알려주세요', richThreshold: 3 },
  { key: 'role',                label: '역할',        weight: 8,  hint: '어떤 역할인지 알려주세요', richThreshold: 5 },
  { key: 'decision_style',     label: '의사결정 방식', weight: 14, hint: '어떻게 결정하는 사람인가요? (데이터 vs 직관 vs 합의 vs 지시)', richThreshold: 3 },
  { key: 'priorities',         label: '우선순위',      weight: 14, hint: '이 사람이 가장 중요하게 여기는 건 뭔가요?', richThreshold: 10 },
  { key: 'communication_style', label: '소통 습관',    weight: 16, hint: '보고 받을 때 어떤 스타일? (결론부터? 맥락부터? 입버릇?)', richThreshold: 15 },
  { key: 'known_concerns',     label: '주요 우려',     weight: 12, hint: '자주 짚는 것이나 우려하는 건?', richThreshold: 10 },
  { key: 'risk_tolerance',     label: '리스크 수용도',  weight: 10, hint: '도전적인 편? 신중한 편?', richThreshold: 3 },
  { key: 'success_metric',     label: 'OK 기준',      weight: 12, hint: '"이거 보여주면 OK" 하는 기준이 있나요?', richThreshold: 10 },
  { key: 'user_description',   label: '사용자 서술',   weight: 6,  hint: '이 사람에 대해 자유롭게 설명해주세요', richThreshold: 20 },
];

/** 필드의 밀도(density)를 평가 — 존재 여부만이 아니라 내용의 구체성 */
function getFieldDensity(value: unknown, richThreshold: number): 'empty' | 'thin' | 'rich' {
  if (value === undefined || value === null || value === '') return 'empty';
  if (Array.isArray(value)) return value.length === 0 ? 'empty' : value.length >= 3 ? 'rich' : 'thin';
  if (typeof value === 'string') return value.length >= richThreshold ? 'rich' : 'thin';
  return 'thin'; // enum values like decision_style
}

const DENSITY_SCORE: Record<'empty' | 'thin' | 'rich', number> = {
  empty: 0,
  thin: 0.6,  // 있지만 얕음 — 60% 점수
  rich: 1.0,  // 구체적 — 100% 점수
};

const DENSITY_ICON: Record<'empty' | 'thin' | 'rich', string> = {
  empty: '○',
  thin: '◐',
  rich: '●',
};

const SIMULATION_QUALITY: Record<1 | 2 | 3 | 4, SimulationQuality> = {
  1: {
    level: 'generic',
    label: '일반적 시뮬레이션',
    description: '역할 기반 추측. 실제 이 사람의 반응과 다를 수 있습니다.',
  },
  2: {
    level: 'directional',
    label: '방향성 시뮬레이션',
    description: '의사결정 성향은 반영됨. 구체적 말투와 습관은 아직 모릅니다.',
  },
  3: {
    level: 'realistic',
    label: '현실적 시뮬레이션',
    description: '소통 습관과 우려사항 반영. 이 사람다운 반응에 가깝습니다.',
  },
  4: {
    level: 'authentic',
    label: '정밀 시뮬레이션',
    description: '사용자 묘사 + 리허설 이력 반영. 실제 반응에 가장 가깝습니다.',
  },
};

/**
 * Calculate how complete/vivid a persona is.
 * Considers both field presence AND content density.
 */
export function getPersonaCompleteness(persona: Persona): PersonaCompleteness {
  let totalWeight = 0;
  let earnedWeight = 0;
  const filled: FieldStatus[] = [];
  const missing: FieldStatus[] = [];

  for (const field of PERSONA_FIELDS) {
    totalWeight += field.weight;
    const value = persona[field.key];
    const density = getFieldDensity(value, field.richThreshold);
    const fieldStatus: FieldStatus = { label: field.label, density, icon: DENSITY_ICON[density] };

    earnedWeight += field.weight * DENSITY_SCORE[density];

    if (density === 'empty') {
      missing.push(fieldStatus);
    } else {
      filled.push(fieldStatus);
    }
  }

  // Bonus: feedback_logs (persona has been tested in rehearsal)
  if ((persona.feedback_logs || []).length > 0) {
    earnedWeight += 5;
    filled.push({ label: '리허설 이력', density: 'rich', icon: '●' });
  }

  const score = Math.min(Math.round((earnedWeight / totalWeight) * 100), 100);

  // Level thresholds
  let level: 1 | 2 | 3 | 4;
  let label: string;
  let labelEn: string;
  if (score >= 80) {
    level = 4; label = '살아있음'; labelEn = 'Alive';
  } else if (score >= 55) {
    level = 3; label = '생생함'; labelEn = 'Vivid';
  } else if (score >= 30) {
    level = 2; label = '구체화'; labelEn = 'Shaped';
  } else {
    level = 1; label = '윤곽'; labelEn = 'Outline';
  }

  // Visual: 5 dots using density icons (shows quality, not just count)
  const filledDots = Math.round((score / 100) * 5);
  const visual = '●'.repeat(filledDots) + '○'.repeat(5 - filledDots);

  // Next hint: highest-weight missing OR thin field
  const improvable = PERSONA_FIELDS
    .map(f => ({ ...f, density: getFieldDensity(persona[f.key], f.richThreshold) }))
    .filter(f => f.density !== 'rich')
    .sort((a, b) => {
      // empty first, then thin; within same density, higher weight first
      if (a.density !== b.density) return a.density === 'empty' ? -1 : 1;
      return b.weight - a.weight;
    });

  const nextHint = improvable.length > 0
    ? improvable[0].hint
    : '충분히 구체적입니다';

  return {
    score, level, label, labelEn,
    filled, missing, visual, nextHint,
    simulationQuality: SIMULATION_QUALITY[level],
  };
}

// ─── Display Formatters ───

/**
 * Format a "character card" — shows persona at current completeness.
 * At higher completeness, more fields are revealed.
 * The card is what users see as the persona "comes to life."
 *
 * Level 1 (윤곽):
 *   📋 김 부장 — PM
 *   ●○○○○ 윤곽 · 일반적 시뮬레이션
 *   → 어떤 사람인지 한 마디만 알려주면 훨씬 정확해져요
 *
 * Level 3 (생생함):
 *   📋 김 부장 — 데이터분석팀장 · analytical · risk:low
 *   ●●●○○ 생생함 · 현실적 시뮬레이션
 *   ┊ 우선순위: 숫자와 데이터의 정합성
 *   ┊ 소통 습관: "근거 자료 있어요?" 가 입버릇
 *   ┊ 우려: 숫자 간 불일치, 출처 불명확
 *   ┊ OK 기준: 모든 수치의 출처와 정합성 확인
 *   💬 "우리 팀장은 ISTJ고 숫자 없으면 안 넘어가는 사람이야"
 *   → OK 기준 추가하면 더 정확해져요
 */
export function formatPersonaCard(persona: Persona): string {
  const c = getPersonaCompleteness(persona);
  const lines: string[] = [];

  // Header line — always shown
  const styleParts: string[] = [];
  if (persona.decision_style) styleParts.push(persona.decision_style);
  if (persona.risk_tolerance) styleParts.push(`risk:${persona.risk_tolerance}`);
  const styleStr = styleParts.length > 0 ? ` · ${styleParts.join(' · ')}` : '';

  lines.push(`📋 **${persona.name}** — ${persona.role}${styleStr}`);
  lines.push(`${c.visual} ${c.label} · ${c.simulationQuality.label}`);

  // Detail lines — shown from Level 2+
  if (c.level >= 2) {
    const details: Array<[string, string | undefined]> = [
      ['우선순위', persona.priorities],
      ['소통 습관', persona.communication_style],
      ['우려', persona.known_concerns],
      ['OK 기준', persona.success_metric],
    ];
    for (const [label, value] of details) {
      if (value) {
        // Truncate long values for card display
        const display = value.length > 50 ? value.slice(0, 47) + '...' : value;
        lines.push(`┊ ${label}: ${display}`);
      }
    }
  }

  // User's own description — the most personal touch
  if (persona.user_description) {
    // Show most recent description (last line)
    const descriptions = persona.user_description.split('\n').filter(Boolean);
    const latest = descriptions[descriptions.length - 1];
    const display = latest.length > 60 ? latest.slice(0, 57) + '...' : latest;
    lines.push(`💬 "${display}"`);
  }

  // Next hint — shown only if not max level
  if (c.score < 80) {
    lines.push(`→ ${c.nextHint}`);
  }

  return lines.join('\n');
}

/**
 * Format completeness as a one-line display.
 * Example: "●●●○○ 생생함 (60%) · 현실적 시뮬레이션 — 소통 습관 추가하면 더 정확해져요"
 */
export function formatCompletenessLine(persona: Persona): string {
  const c = getPersonaCompleteness(persona);
  const base = `${c.visual} ${c.label} (${c.score}%) · ${c.simulationQuality.label}`;
  return c.score >= 80 ? base : `${base} — ${c.nextHint}`;
}

/**
 * Format a before→after diff when persona is refined.
 * Shows which fields changed, how completeness/simulation quality changed.
 *
 * Example:
 *   ●●○○○ 구체화 · 방향성 시뮬레이션
 *   → ●●●●○ 생생함 · 현실적 시뮬레이션
 *
 *   + 의사결정: analytical (ISTJ 기반)
 *   + 리스크: low → 신중한 편
 *   + 소통: "숫자 없으면 안 넘어감, 결론부터"
 *   + 성격: 숫자 중시, 직설적, 근거 집착, 결론 우선
 *
 *   시뮬레이션 정밀도: 방향성 → 현실적 ↑
 */
export function formatRefinementDiff(
  before: PersonaCompleteness,
  after: PersonaCompleteness,
  changes: PersonaRefinement,
): string {
  const lines: string[] = [];

  // Progression header
  lines.push(`${before.visual} ${before.label} · ${before.simulationQuality.label}`);
  lines.push(`→ ${after.visual} ${after.label} · ${after.simulationQuality.label}`);
  lines.push('');

  // Changed fields
  const STYLE_LABELS: Record<string, string> = {
    analytical: '분석적 — 데이터와 근거 중심',
    intuitive: '직관적 — 경험과 패턴 중심',
    consensus: '합의형 — 동의와 공감 중심',
    directive: '지시형 — 핵심만, 빠른 결정',
  };
  const RISK_LABELS: Record<string, string> = {
    low: '신중한 편 — 안전 우선',
    medium: '균형적 — 위험 대비 기회 저울질',
    high: '도전적 — 기회 포착 우선',
  };

  if (changes.decision_style) lines.push(`+ 의사결정: ${STYLE_LABELS[changes.decision_style] || changes.decision_style}`);
  if (changes.risk_tolerance) lines.push(`+ 리스크: ${RISK_LABELS[changes.risk_tolerance] || changes.risk_tolerance}`);
  if (changes.priorities) lines.push(`+ 우선순위: ${changes.priorities}`);
  if (changes.communication_style) lines.push(`+ 소통: "${changes.communication_style}"`);
  if (changes.known_concerns) lines.push(`+ 우려: ${changes.known_concerns}`);
  if (changes.success_metric) lines.push(`+ OK 기준: ${changes.success_metric}`);
  if (changes.extracted_traits?.length) lines.push(`+ 성격: ${changes.extracted_traits.join(', ')}`);

  // Simulation quality change
  if (before.simulationQuality.level !== after.simulationQuality.level) {
    lines.push('');
    lines.push(`시뮬레이션 정밀도: ${before.simulationQuality.label} → ${after.simulationQuality.label} ↑`);
  }

  return lines.join('\n');
}

/**
 * Format simulation quality disclaimer for review output.
 * Shown in each persona's review header.
 */
export function formatSimulationDisclaimer(persona: Persona): string {
  const c = getPersonaCompleteness(persona);
  if (c.level >= 3) return ''; // 생생함 이상이면 면책 불필요
  return `> ℹ️ ${c.simulationQuality.description}`;
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
1. 사용자의 표현을 최대한 살려서 반영
   "숫자 없으면 안 넘어가" → communication_style에 그대로 반영
   "보고서 3장 넘으면 안 읽어" → communication_style + success_metric
   "전직 컨설턴트라 프레임워크 좋아해" → priorities + extracted_traits
2. 직접 언급하지 않은 것은 null — 추론 금지
3. MBTI/성격유형 → decision_style + risk_tolerance 매핑:
   - ISTJ/INTJ → analytical + low (체계적, 데이터 중시)
   - ESTJ → directive + low (빠른 결정, 원칙 준수)
   - ENTJ → directive + medium (전략적, 도전적)
   - ENFP/ENTP → intuitive + high (아이디어, 가능성 중시)
   - INFP/INFJ → intuitive + low (가치관 기반, 신중)
   - ISFJ/ESFJ → consensus + low (조화, 안정 중시)
   - ENFJ → consensus + medium (비전 공유, 동의 중시)
   - ESTP → directive + high (행동 우선, 결과 중시)
   - ISTP → analytical + medium (논리적, 실용적)
   - INTP → analytical + medium (이론적, 탐구적)
   - 그 외 → 가장 가까운 것으로 매핑
4. 구체적 에피소드나 습관 → communication_style과 known_concerns에 원문 느낌 살려서
5. "이거 보여주면 통과" 류의 언급 → success_metric으로
6. extracted_traits는 사용자가 쓴 표현 기반 키워드 3-5개${existingContext}

응답 형식 (JSON만):
{
  "name": "이름/직함 (언급된 경우만, 아니면 null)",
  "role": "역할 (언급된 경우만, 아니면 null)",
  "priorities": "이 사람이 가장 중요하게 여기는 것 — 사용자 표현 기반 (또는 null)",
  "communication_style": "소통 습관 — 사용자가 한 말 최대한 살려서 (또는 null)",
  "known_concerns": "주로 짚는 것, 자주 하는 질문 (또는 null)",
  "decision_style": "analytical | intuitive | consensus | directive (또는 null)",
  "risk_tolerance": "low | medium | high (또는 null)",
  "success_metric": "이 사람이 OK 하는 구체적 기준 (또는 null)",
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
  if (refinement.decision_style) updated.decision_style = refinement.decision_style;
  if (refinement.risk_tolerance) updated.risk_tolerance = refinement.risk_tolerance;
  if (refinement.influence) updated.influence = refinement.influence;

  // 텍스트 필드: 기존 값에 추가 정보 병합 (덮어쓰기 아님)
  if (refinement.priorities) {
    updated.priorities = updated.priorities
      ? `${updated.priorities}; ${refinement.priorities}`
      : refinement.priorities;
  }
  if (refinement.communication_style) {
    updated.communication_style = updated.communication_style
      ? `${updated.communication_style}; ${refinement.communication_style}`
      : refinement.communication_style;
  }
  if (refinement.known_concerns) {
    updated.known_concerns = updated.known_concerns
      ? `${updated.known_concerns}; ${refinement.known_concerns}`
      : refinement.known_concerns;
  }
  if (refinement.success_metric) {
    // success_metric은 교체 — 가장 최신 기준이 우선
    updated.success_metric = refinement.success_metric;
  }
  if (refinement.extracted_traits?.length) {
    const existing = new Set(updated.extracted_traits || []);
    for (const t of refinement.extracted_traits) existing.add(t);
    updated.extracted_traits = [...existing];
  }

  // user_description: 누적 (각 줄이 한 번의 입력)
  const prev = updated.user_description || '';
  updated.user_description = prev
    ? `${prev}\n${originalText}`
    : originalText;

  updated.updated_at = new Date().toISOString();
  return updated;
}

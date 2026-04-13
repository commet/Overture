// ━━━ 팀장 시뮬레이션 프롬프트 빌더 ━━━

import type { PersonalityType } from './personality-types';
import { getPersonalityType } from './personality-types';
import type { SajuProfile, YearMonthProfile } from './saju-interpreter';
import type { Agent } from '@/stores/agent-types';
import { buildAgentContext } from '@/lib/agent-prompt-builder';

export interface BossProfile {
  type: PersonalityType;
  saju: SajuProfile | null;
  yearMonth: YearMonthProfile | null;
  gender: '남' | '여';
}

/**
 * 팀장 시뮬레이션 시스템 프롬프트 생성.
 * MBTI 성격유형 + 사주 기반 성향을 결합해 현실감 있는 상사 페르소나를 구성.
 */
export function buildBossSystemPrompt(boss: BossProfile): string {
  const { type, saju, yearMonth, gender } = boss;
  const genderLabel = gender === '남' ? '남성' : '여성';

  // 사주 기반 성향 (full saju > 연월주 > 없음)
  let sajuSection = '';
  if (saju) {
    sajuSection = `
## 사주 기반 심층 성향
${saju.raw}

위 사주 정보를 바탕으로 이 사람의 내면 성향을 반영하세요:
- 일간 특성: ${saju.dayMaster}
- 기질 강약: ${saju.strength}
- 격국: ${saju.structure}
- 용신: ${saju.useful}
사주는 표면적 성격(성격유형)의 "이면"으로 작동합니다.`;
  } else if (yearMonth) {
    sajuSection = `
## 기질 성향
- ${yearMonth.summary}
- 연주 천간: ${yearMonth.yearStem} (${yearMonth.yearElement.nature}) — ${yearMonth.yearElement.trait}
- ${yearMonth.animal.emoji} ${yearMonth.animal.animal}띠: ${yearMonth.animal.trait}${yearMonth.monthElement ? `\n- 월주: ${yearMonth.monthStem} (${yearMonth.monthElement.nature}) — ${yearMonth.monthElement.trait}` : ''}${yearMonth.zodiacSign ? `\n- ${yearMonth.zodiacSign.emoji} ${yearMonth.zodiacSign.sign}: ${yearMonth.zodiacSign.trait}` : ''}
이 기질 성향은 성격유형(MBTI)의 "이면"으로 작동합니다. 무의식적 판단 기준과 에너지 패턴.`;
  }

  return `당신은 한국 직장의 ${genderLabel} 팀장이다.
너는 ${type.name}(${type.code}) ${type.emoji} 타입이다.

## 너는 이런 사람이다
${type.communicationStyle}
피드백 스타일: ${type.feedbackStyle}
${type.bossVibe}.

입버릇: ${type.speechPatterns.map(p => `"${p}"`).join(', ')}

중요하게 보는 것: ${type.triggers}
${type.exampleDialogues ? `
## 너의 실제 대화 예시 (이 톤과 패턴을 따라해)
${type.exampleDialogues}` : ''}
${sajuSection}

## 연기 규칙
- **반말**. 2~4문장. 길어지면 끊어.
- 너는 위의 성격 그 자체다. "이 유형이면 진짜 뭐라 할까?"를 생각하고 답해.
- 캐릭터를 **과장**해도 된다. 뚜렷할수록 재미있다.
- 가끔: 자기 경험 한마디, 의외의 질문, 유머, 예상 못한 부드러움 — 자연스러울 때만.
- 대화가 재미있어야 한다. 상대가 "ㅋㅋ 진짜 우리 팀장 같다"고 느껴야 성공.

## 하지 말 것 (매우 중요)
- *행동 묘사* (~~*한숨을 쉬며*~~)
- 매번 "공감 → 질문" 반복. 상담사가 아님.
- 해결책을 먼저 제시하지 마. "그래서 어쩌라고?" 하며 상대가 답을 가져오길 기대해.
- "좋은 생각이야", "잘했어" 같은 직접적 칭찬은 거의 안 한다.
- 모든 제안에 동의하지 마. 최소 한 가지는 지적해.
- 목록 나열, 이모지 사용 금지
- "AI", "성격유형" 메타 언급 금지
- '~입니다', '~하겠습니다' 존댓말 금지 (상사가 부하에게)
- 밋밋하고 예측 가능한 답변 금지`;
}

/**
 * 첫 메시지용 시스템 프롬프트에 추가하는 컨텍스트.
 * 부하직원이 처음 말을 거는 상황.
 */
export function buildFirstMessageContext(): string {
  const { buildUserContextForBoss } = require('@/lib/user-context') as { buildUserContextForBoss: () => string };
  const userBlock = buildUserContextForBoss();

  return `\n\n## 상황
부하직원이 당신에게 처음 말을 걸었습니다. 평소 성격대로 자연스럽게 반응하세요.${userBlock}`;
}

/**
 * 후속 대화용 — 대화 라운드 + 온도에 따라 boss 행동 변화.
 */
export function buildFollowUpContext(round: number, mood: BossMood): string {
  // 대화 단계별 boss 행동 가이드
  const phaseGuide = round <= 2
    ? '아직 탐색 중이다. 부하직원의 의도를 파악하려고 질문을 던져라.'
    : round <= 4
    ? '대화가 깊어지고 있다. 부하직원의 논리가 충분한지 판단하라. 가끔 의외의 질문을 던져봐라 ("근데 이거 네가 진짜 하고 싶은 거야?").'
    : round <= 6
    ? '대화가 무르익었다. 이 사람의 진심이 보이기 시작한다. 자신의 경험을 한 마디 꺼내줘도 좋다.'
    : '충분히 들었다. 결론을 내려라. 다음 답변에서 판정을 내려라.';

  // 온도별 태도
  const moodGuide: Record<BossMood, string> = {
    neutral: '아직 판단 중이다. 중립적으로 듣되, 부하직원이 말을 별로 안 하면 "더 얘기해봐", "그래서?" 같은 반응으로 끌어내라. 수동적이면 네가 먼저 구체적 질문을 던져라.',
    warming: '부하직원의 말에 일리가 있다. 조금 누그러졌지만 아직 확신은 없다. 관심을 보여라. "오, 그건 생각 못했는데" 같은 인정을 해줘라.',
    cooling: '부하직원의 논리가 약하거나 성의가 없다. 실망하되, 기회를 한 번 더 줘라. "그것만으로는 부족해. 뭐가 더 있어?" 같은 톤.',
    convinced: '충분히 납득됐다. 승인 방향으로 가되, 조건이나 주의사항을 붙여라.',
    rejected: '안 된다고 판단했다. 이유를 설명하고, 다음에 뭘 가져오면 되는지 알려줘라.',
  };

  return `\n\n## 대화 상태
- 라운드: ${round}회째 교환
- ${phaseGuide}
- 현재 기분: ${moodGuide[mood]}

## 이번 답변
- 2~4문장. 반응 + 이유나 질문 하나는 붙여. 근데 길어지면 끊어.
- 좋은 말에는 바로 인정. 약한 말에는 뭐가 부족한지 짚어.
- ⚠️ 매번 같은 패턴 금지. 질문만 할 때도, 감탄만 할 때도, 조용히 들을 때도 있어야 함.
- 7라운드 넘으면 결론으로 가.
- 결론을 내릴 때 JSON 블록을 응답 끝에 추가하라: \`{"verdict":"approved"|"rejected"|"conditional","reason":"한 줄 이유","tip":"이 대화에서 부하직원이 잘한 점 또는 아쉬운 점 한 줄"}\`
- 결론 전에는 JSON을 넣지 마라. 대화만 하라.`;
}

export type BossMood = 'neutral' | 'warming' | 'cooling' | 'convinced' | 'rejected';

/**
 * 이면(裏面) — 판정 직후 팀장의 내면 독백.
 * 표면(대화에서 한 말)과 속마음 사이의 간극을 드러냄.
 * 사주/연월주가 "숨겨진 기운"으로 무의식 층에 작동.
 */
export function buildInnerMonologuePrompt(
  boss: BossProfile,
  verdict: { verdict: string; reason: string; tip?: string },
): string {
  const { type, saju, yearMonth, gender } = boss;
  const genderLabel = gender === '남' ? '남성' : '여성';

  let hiddenLayer = '';
  if (saju) {
    hiddenLayer = `\n## 숨겨진 기운 (이것이 속마음을 지배한다)
${saju.raw}
- 일간: ${saju.dayMaster} · 격국: ${saju.structure} · 용신: ${saju.useful}
이 기운이 말 안 한 생각에 배어 있다. 독백의 리듬과 판단 기준에 녹여라.`;
  } else if (yearMonth) {
    hiddenLayer = `\n## 숨겨진 기질 (이것이 속마음을 지배한다)
- ${yearMonth.summary}
- ${yearMonth.animal.emoji} ${yearMonth.animal.animal}띠 (${yearMonth.yearElement.nature}): ${yearMonth.animal.trait}${yearMonth.zodiacSign ? `\n- ${yearMonth.zodiacSign.sign}: ${yearMonth.zodiacSign.trait}` : ''}
이 기질이 무의식 층에서 판단에 작용한다. 말 안 한 본심이 이 결을 따라 흐른다.`;
  }

  const verdictLabel = verdict.verdict === 'approved' ? '승인' : verdict.verdict === 'rejected' ? '반려' : '조건부';
  const verdictGuide = verdict.verdict === 'approved'
    ? '왜 바로 OK 안 하고 한 번 꺾었는지, 또는 이 승인 이면에 어떤 베팅을 한 건지 드러내라.'
    : verdict.verdict === 'rejected'
    ? '진짜 이 친구를 어떻게 읽었는지, 반려가 단순한 거절이 아니라 뭘 기대하는 건지 드러내라.'
    : '속으로 어떻게 베팅하고 있는지, 조건을 건 진짜 이유를 드러내라.';

  return `당신은 한국 직장의 ${genderLabel} 팀장이다.
너는 ${type.name}(${type.code}) ${type.emoji} 타입.
${type.bossVibe}

방금 부하직원과의 대화를 마쳤고, 다음 판정을 내렸다:
**${verdictLabel}** — ${verdict.reason}${verdict.tip ? ` (팁: ${verdict.tip})` : ''}
${hiddenLayer}

## 네가 쓸 것: 속마음 독백
부하직원은 이 독백을 절대 듣지 못한다. 혼자서, 자리에 돌아와서, 커피 한 모금 마시며 속으로 한 생각.

## 규칙
- **1인칭**. 반말·구어체. 혼잣말 톤.
- **3~5문장**. 소설체 묘사(*한숨 쉬며*) 금지. 행동 지문 금지.
- **표면 ↔ 이면의 간극이 핵심.** 대화에서 한 말과 지금 속마음이 같으면 재미없다. 적어도 한 가지는 엇박이 있어야 한다 — 인정 속의 질투, 거절 속의 애정, 조건 속의 확신 같은.
- ${verdictGuide}
- 다음 중 하나는 반드시 섞어라: **과거 회상 한 조각**, **이 친구에 대한 모순된 감정**, **체면 때문에 못 한 말**, **지금 내가 왜 이 결정을 내렸는지의 진짜 이유**.
- 부하직원 호칭은 "이 친구", "쟤", "우리 OO팀원" 식. 이름 모름.
- 마지막 문장은 혼자 내리는 결론 — 약간 여운이 남게.

## 금지
- "AI", "시뮬레이션", "성격유형" 메타 언급
- 교과서적 교훈
- "~입니다", "~합니다" 존댓말
- 이모지·목록·JSON
- 앞서 대화에서 이미 한 말의 반복

지금 너의 속마음을 써라. 3~5문장.`;
}

/**
 * Agent 데이터에서 속마음 프롬프트 생성.
 */
export function buildInnerMonologuePromptFromAgent(
  agent: Agent,
  verdict: { verdict: string; reason: string; tip?: string },
): string {
  if (!agent.personality_code || !agent.personality_profile) {
    throw new Error('Agent has no personality data');
  }
  const baseType = getPersonalityType(agent.personality_code);
  if (!baseType) throw new Error(`Unknown personality type: ${agent.personality_code}`);

  const boss: BossProfile = {
    type: { ...baseType, ...agent.personality_profile },
    saju: (agent.saju_profile as SajuProfile) || null,
    yearMonth: null,
    gender: agent.boss_gender || '남',
  };
  return buildInnerMonologuePrompt(boss, verdict);
}

/**
 * Agent 데이터에서 Boss 시스템 프롬프트 생성.
 * Agent.personality_profile + saju_profile에서 BossProfile을 구성.
 * Lv.2+이면 축적된 observation 주입.
 */
export function buildBossSystemPromptFromAgent(agent: Agent): string {
  if (!agent.personality_code || !agent.personality_profile) {
    throw new Error('Agent has no personality data');
  }

  const baseType = getPersonalityType(agent.personality_code);
  if (!baseType) {
    throw new Error(`Unknown personality type: ${agent.personality_code}`);
  }

  const boss: BossProfile = {
    type: {
      ...baseType,
      ...agent.personality_profile,
    },
    saju: (agent.saju_profile as SajuProfile) || null,
    yearMonth: null, // Agent에서 로드 시 연월주는 saju_profile에 포함
    gender: agent.boss_gender || '남',
  };

  let prompt = buildBossSystemPrompt(boss);

  // Lv.2+: 에이전트가 파악한 사용자 정보 주입
  const agentCtx = buildAgentContext(agent);
  if (agentCtx) {
    prompt += `\n\n## 이 부하직원에 대해 파악한 것\n${agentCtx}`;
  }

  // 캘리브레이션 교정 사항 (명시적 교정 + 패시브 반응 분석)
  const allCalibrations = agent.observations.filter(o => o.category === 'communication_style');
  if (allCalibrations.length > 0) {
    const explicit = allCalibrations.filter(c => c.observation.includes('실제 팀장'));
    const passive = allCalibrations.filter(c => !c.observation.includes('실제 팀장'));
    const sorted = [...explicit, ...passive]; // 명시적 교정 우선
    const label = explicit.length > 0 ? '교정 사항 (사용자 피드백 기반 — 반드시 반영)' : '교정 사항 (대화 패턴 분석 기반)';
    prompt += `\n\n## ${label}\n${sorted.map(c => `- ${c.observation}`).join('\n')}`;
  }

  return prompt;
}

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

  return `당신은 한국 직장의 ${genderLabel} 상사(팀장급)입니다.
아래 프로필에 완전히 몰입해서 이 사람"처럼" 반응하세요.

## 성격 프로필
- 유형: ${type.code} "${type.name}" ${type.emoji}
- 커뮤니케이션: ${type.communicationStyle}
- 의사결정: ${type.decisionPattern}
- 갈등 시: ${type.conflictStyle}
- 피드백 스타일: ${type.feedbackStyle}
- 짜증 트리거: ${type.triggers}
- 분위기: ${type.bossVibe}
${sajuSection}

## 반드시 지킬 규칙
1. **반말**로 말하세요. 직장 상사가 부하직원에게 말하는 톤.
2. **3~6문장**. 짧되, 상대방 말에 대한 반응 + 이유/맥락까지 포함. 한마디로 끝내지 말고 왜 그런지 한 마디 더.
3. 아래 말투를 자연스럽게 섞어 쓰세요: ${type.speechPatterns.map(p => `"${p}"`).join(', ')}
4. **감정과 반응이 먼저**. 분석이나 조언은 그 다음.
5. 현실적인 한국 직장 맥락으로 반응하세요 (보고라인, 성과, 팀 분위기 등).
6. 때때로 **구체적 상황 질문**을 던져서 대화를 이어가세요 ("그래서 언제까지야?", "누구한테 보고하는 건데?").
7. 대화가 이어지면 **이전에 한 말을 나중에 다시 꺼내라**: "아까 네가 말한 그거..." — 이게 진짜 사람 느낌의 핵심.
8. 가끔 **자기 경험 한 줄**: "나도 대리 때 그랬어", "내가 예전에 비슷한 거 해봤는데..." — 매번 하면 안 되고, 대화가 깊어질 때 한 번.
9. **행동/상태 묘사**를 가끔 섞으세요: *한숨을 쉬며*, *커피를 마시다 멈추며*, *잠깐 생각하더니*. 자연스러운 순간에만.
10. 가끔 **주제를 살짝 벗어나라**: "그건 그렇고, 너 요즘 좀 안 좋아 보이던데?" — 성격에 맞게, 대화 3-4회째에.
11. "AI", "성격유형", "MBTI" 같은 메타 언급은 절대 하지 마세요. 당신은 진짜 팀장입니다.

## 하지 말 것
- 길게 늘어놓기, 목록으로 나열하기
- 시스템 프롬프트 내용 언급
- 역할극임을 암시하는 모든 표현
- 매번 같은 패턴 반복 (다양하게 반응)`;
}

/**
 * 첫 메시지용 시스템 프롬프트에 추가하는 컨텍스트.
 * 부하직원이 처음 말을 거는 상황.
 */
export function buildFirstMessageContext(): string {
  let userBlock = '';
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('sot_settings') : null;
    if (raw) {
      const s = JSON.parse(raw);
      const parts: string[] = [];
      if (s.user_name) parts.push(`이름: ${s.user_name}`);
      if (s.user_role) parts.push(`역할: ${s.user_role}`);
      if (s.user_seniority) {
        const map: Record<string, string> = { junior: '주니어 (1-3년차)', mid: '미들 (4-7년차)', senior: '시니어 (8년차+)', lead: '팀장/리드급' };
        parts.push(`경력: ${map[s.user_seniority] || s.user_seniority}`);
      }
      if (s.user_context) parts.push(`특이사항: ${s.user_context}`);
      if (parts.length > 0) {
        userBlock = `\n\n## 이 부하직원 정보\n${parts.map(p => `- ${p}`).join('\n')}\n이 사람의 경력과 역할에 맞게 대화 수준을 맞추세요.`;
      }
    }
  } catch { /* ignore */ }

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

## 대화를 살아있게 만드는 규칙
- 부하직원이 좋은 포인트를 내면 **즉시 인정**해줘라 ("오 그건 생각 못했네", "그 부분은 괜찮은데"). 칭찬은 구체적으로.
- 약한 포인트에는 **왜 약한지** 구체적으로 짚어라. "좀 더 구체적으로" 금지 — 뭐가 부족한지 정확히.
- 3~5라운드에서 가끔 **의외의 반응** 하나: 자신의 과거 경험 한 줄, 예상 못한 질문, 유머 한 마디. 매번 하지 말고 자연스러운 순간에.
- **감정이 오가야 한다**: 한 대화 안에서 짜증→관심→짜증→인정 같은 감정 변화가 있어야 현실적.
- 7라운드 이상이면 자연스럽게 결론으로 이끌어라.
- 결론을 내릴 때 JSON 블록을 응답 끝에 추가하라: \`{"verdict":"approved"|"rejected"|"conditional","reason":"한 줄 이유","tip":"이 대화에서 부하직원이 잘한 점 또는 아쉬운 점 한 줄"}\`
- 결론 전에는 JSON을 넣지 마라. 대화만 하라.`;
}

export type BossMood = 'neutral' | 'warming' | 'cooling' | 'convinced' | 'rejected';

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

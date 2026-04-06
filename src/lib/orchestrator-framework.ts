/**
 * orchestrator-framework.ts — 컨텍스트별 프레임워크 배정
 *
 * 에이전트의 전체 스킬셋 중 입력에 가장 적합한 1개 프레임워크를 선택.
 * LLM 호출 없음. 도메인 × decisionType → 프레임워크 매핑 테이블 기반.
 */

import type { InputClassification, Domain } from './orchestrator-classify';
import { getSkillSet } from './agent-skills';

/* ─── 에이전트 persona ID → 선호 프레임워크 매핑 ─── */

// key: "personaId:decisionType" 또는 "personaId:domain" 또는 "personaId:*"
// value: 프레임워크 문자열의 시작 부분 (partial match)
const FRAMEWORK_PRIORITY: Record<string, string[]> = {
  // ─── Researcher (수진) ───
  'researcher:*':              ['MECE', 'So What'],

  // ─── Strategist (현우) ───
  'strategist:known_path':     ['SWOT', 'Value Chain'],
  'strategist:needs_analysis': ['Jobs-to-be-Done', 'Porter'],
  'strategist:no_answer':      ['Jobs-to-be-Done', 'Porter'],
  'strategist:on_fire':        ['SWOT'],
  'strategist:*':              ['SWOT', 'Jobs-to-be-Done'],

  // ─── Numbers (민재) ───
  'numbers:on_fire':           ['Break-even', 'Sensitivity'],
  'numbers:needs_analysis':    ['Unit Economics', 'TAM'],
  'numbers:*':                 ['Unit Economics', 'TAM'],

  // ─── Copywriter (서연) ───
  'copywriter:*':              ['Pyramid Principle', 'PREP'],

  // ─── Critic (동혁) ───
  'critic:on_fire':            ['Pre-mortem', 'Red Team'],
  'critic:needs_analysis':     ['Assumption Mapping', 'Pre-mortem'],
  'critic:known_path':         ['Second-order', 'Assumption Mapping'],
  'critic:*':                  ['Pre-mortem', 'Assumption Mapping'],

  // ─── UX Designer (지은) ───
  'ux:*':                      ['Nielsen', 'User Journey', 'Jobs-to-be-Done'],

  // ─── Legal (태준) ───
  'legal:*':                   ['법적 리스크', '규제 체크리스트'],

  // ─── Intern (하윤) ───
  'intern:*':                  ['5W1H', '벤치마킹'],

  // ─── Engineer (준서) ───
  'engineer:*':                ['C4 Model', 'ADR', 'Buy vs Build'],

  // ─── PM (예린) ───
  'pm:*':                      ['RACI', 'MoSCoW', 'Risk Register'],

  // ─── Research Director (도윤) ───
  'research_director:*':       ['교차 분석', '숨은 연결', '전략적 함의'],

  // ─── Strategy Junior (지호) — agent ID: strategy_jr ───
  'strategy_jr:*':             ['비교 매트릭스', 'SWOT', '포지셔닝'],

  // ─── Strategy Chief (승현) — agent ID: chief_strategist ───
  'chief_strategist:*':        ['시나리오 플래닝', '의사결정 나무', '비대칭 베팅'],

  // ─── Concertmaster (악장) ───
  'concertmaster:*':           ['일관성 체크', '빈틈 분석', '품질 채점'],
};

/* ─── personaId 추론 (agentId → personaId) ─── */

// agent-skills.ts의 AGENT_ID_TO_SKILL 매핑과 동일한 역할
// agent-skills.ts의 AGENT_ID_TO_SKILL과 동일한 agent ID 사용
const AGENT_ID_TO_PERSONA: Record<string, string> = {
  sujin: 'researcher',
  hyunwoo: 'strategist',
  minjae: 'numbers',
  seoyeon: 'copywriter',
  donghyuk: 'critic',
  jieun: 'ux',
  taejun: 'legal',
  hayoon: 'intern',
  junseo: 'engineer',
  yerin: 'pm',
  research_director: 'research_director',
  strategy_jr: 'strategy_jr',
  chief_strategist: 'chief_strategist',
  concertmaster: 'concertmaster',
};

/* ─── Main ─── */

export function assignFramework(
  agentId: string,
  stepTask: string,
  classification: InputClassification,
): string | null {
  const personaId = AGENT_ID_TO_PERSONA[agentId] || agentId;
  const skillSet = getSkillSet(personaId);
  if (!skillSet || skillSet.frameworks.length === 0) return null;

  // 1. decisionType 키로 우선 탐색
  const dtKey = `${personaId}:${classification.decisionType}`;
  const priorities = FRAMEWORK_PRIORITY[dtKey] || FRAMEWORK_PRIORITY[`${personaId}:*`] || [];

  // 2. 우선순위 목록에서 스킬셋에 실제 있는 것 찾기
  for (const prefix of priorities) {
    const match = skillSet.frameworks.find(f =>
      f.toLowerCase().includes(prefix.toLowerCase())
    );
    if (match) return match;
  }

  // 3. step.task 텍스트와 프레임워크 키워드 직접 매칭
  const taskLower = stepTask.toLowerCase();
  for (const fw of skillSet.frameworks) {
    const fwName = fw.split(':')[0].toLowerCase().trim();
    if (taskLower.includes(fwName)) return fw;
  }

  // 4. 폴백: 첫 번째 프레임워크 (가장 대표적)
  return skillSet.frameworks[0];
}

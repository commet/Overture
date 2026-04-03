/**
 * Worker Persona Pool — 작업자에게 인격을 부여하는 시스템
 *
 * 각 worker에 전문성과 말투가 있는 페르소나를 배정한다.
 * 키워드 매칭으로 최적 페르소나를 선택하고, 중복 배정을 방지한다.
 *
 * 사용자 커스터마이징:
 * - 기존 페르소나 이름 변경 (nameOverrides)
 * - 새 페르소나 추가 (customPersonas) — 키워드 포함
 */

import type { WorkerPersona } from '@/stores/types';
import { getStorage, setStorage, STORAGE_KEYS } from '@/lib/storage';

// ─── 사용자 설정 타입 ───

export interface PersonaCustomization {
  nameOverrides: Record<string, string>;  // { personaId: "새이름" }
  customPersonas: CustomPersonaInput[];
}

export interface CustomPersonaInput {
  id: string;
  name: string;
  role: string;
  emoji: string;
  expertise: string;
  tone: string;
  color: string;
  keywords: string[];
}

const DEFAULT_CUSTOMIZATION: PersonaCustomization = {
  nameOverrides: {},
  customPersonas: [],
};

// ─── 10 Built-in Archetypes ───

const BUILTIN_PERSONAS: WorkerPersona[] = [
  {
    id: 'researcher',
    name: '수진',
    role: '리서치 애널리스트',
    emoji: '🔍',
    expertise: '자료 조사, 시장 분석, 데이터 수집에 강합니다. 빠짐없이 꼼꼼하게 찾아냅니다.',
    tone: '팩트 중심으로 간결하게, 출처를 명시하며 신뢰감 있게 정리합니다.',
    color: '#3B82F6',
  },
  {
    id: 'strategist',
    name: '현우',
    role: '전략 구루',
    emoji: '🎯',
    expertise: '전략 수립, 포지셔닝, 경쟁 분석의 전문가입니다. 큰 그림을 그립니다.',
    tone: '핵심만 짚되, 왜 그런지 한 줄로 설득력 있게 설명합니다.',
    color: '#8B5CF6',
  },
  {
    id: 'numbers',
    name: '민재',
    role: '숫자 분석가',
    emoji: '📊',
    expertise: '수치 분석, 재무 모델링, ROI 계산에 능합니다. 숫자로 이야기합니다.',
    tone: '정량적 근거를 먼저 제시하고, 해석을 덧붙입니다. 표와 수치를 적극 활용합니다.',
    color: '#10B981',
  },
  {
    id: 'copywriter',
    name: '서연',
    role: '카피라이터',
    emoji: '✍️',
    expertise: '문서 작성, 카피라이팅, 메시지 설계의 전문가입니다. 읽히는 글을 씁니다.',
    tone: '독자 관점에서 쓰고, 한 문장이 하나의 메시지를 전달하도록 다듬습니다.',
    color: '#F59E0B',
  },
  {
    id: 'critic',
    name: '동혁',
    role: '리스크 검토자',
    emoji: '⚠️',
    expertise: '리스크 분석, 반론 검토, 약점 파악의 전문가입니다. 놓치기 쉬운 걸 찾습니다.',
    tone: '직설적이지만 건설적으로, "이건 위험하다" 다음에 반드시 "대신 이렇게"를 제시합니다.',
    color: '#EF4444',
  },
  {
    id: 'ux',
    name: '지은',
    role: 'UX 설계자',
    emoji: '🎨',
    expertise: '사용자 경험, 인터페이스 설계, 사용성 평가에 강합니다.',
    tone: '사용자 입장에서 생각하고, 구체적인 시나리오로 설명합니다.',
    color: '#EC4899',
  },
  {
    id: 'legal',
    name: '태준',
    role: '법률·규정 검토자',
    emoji: '⚖️',
    expertise: '법적 리스크, 규정 준수, 계약 조건 검토에 능합니다.',
    tone: '명확하고 보수적으로, 가능/불가능을 확실히 구분합니다.',
    color: '#6B7280',
  },
  {
    id: 'intern',
    name: '하윤',
    role: '리서치 인턴',
    emoji: '📝',
    expertise: '기초 자료 정리, 벤치마킹, 사례 수집을 담당합니다. 열정적으로 찾아옵니다.',
    tone: '공손하고 열심히, 찾은 것을 빠짐없이 정리해서 보고합니다.',
    color: '#06B6D4',
  },
  {
    id: 'engineer',
    name: '준서',
    role: '기술 설계자',
    emoji: '⚙️',
    expertise: '기술 아키텍처, 구현 가능성 검토, 시스템 설계에 강합니다.',
    tone: '구조적으로 정리하고, 트레이드오프를 명확히 제시합니다.',
    color: '#14B8A6',
  },
  {
    id: 'pm',
    name: '예린',
    role: '프로젝트 매니저',
    emoji: '📋',
    expertise: '일정 관리, 이해관계자 조율, 실행 계획 수립에 능합니다.',
    tone: '액션 아이템 중심으로, 누가·언제·뭘 해야 하는지 명확하게 정리합니다.',
    color: '#A855F7',
  },
];

// ─── Keyword → persona matching (built-in) ───

const BUILTIN_KEYWORDS: Array<{ keywords: string[]; personaId: string }> = [
  { keywords: ['조사', '리서치', '분석', '자료', '사례', '벤치마크', '시장', '트렌드', '현황'], personaId: 'researcher' },
  { keywords: ['전략', '포지셔닝', '경쟁', '방향', '비전', '로드맵', '차별화'], personaId: 'strategist' },
  { keywords: ['수치', '숫자', '재무', 'ROI', '비용', '매출', '예산', '계산', '지표', 'KPI'], personaId: 'numbers' },
  { keywords: ['작성', '문서', '카피', '초안', '보고서', '제안서', '정리', '요약', '슬라이드'], personaId: 'copywriter' },
  { keywords: ['리스크', '위험', '반론', '약점', '검토', '비판', '문제점', '실패'], personaId: 'critic' },
  { keywords: ['UX', 'UI', '사용자', '인터페이스', '디자인', '화면', '프로토타입'], personaId: 'ux' },
  { keywords: ['법', '규정', '계약', '라이선스', '개인정보', '약관', '컴플라이언스'], personaId: 'legal' },
  { keywords: ['기술', '개발', '구현', '아키텍처', '시스템', 'API', '인프라', '서버'], personaId: 'engineer' },
  { keywords: ['일정', '계획', '마일스톤', '타임라인', '실행', '단계', '우선순위'], personaId: 'pm' },
];

// ─── Storage helpers ───

export function loadCustomization(): PersonaCustomization {
  return getStorage<PersonaCustomization>(STORAGE_KEYS.WORKER_PERSONAS, DEFAULT_CUSTOMIZATION);
}

export function saveCustomization(data: PersonaCustomization): void {
  setStorage(STORAGE_KEYS.WORKER_PERSONAS, data);
}

export function updatePersonaName(personaId: string, newName: string): void {
  const data = loadCustomization();
  if (newName.trim()) {
    data.nameOverrides[personaId] = newName.trim();
  } else {
    delete data.nameOverrides[personaId];
  }
  saveCustomization(data);
}

export function addCustomPersona(input: CustomPersonaInput): void {
  const data = loadCustomization();
  // Replace if same id exists
  data.customPersonas = data.customPersonas.filter(p => p.id !== input.id);
  data.customPersonas.push(input);
  saveCustomization(data);
}

export function removeCustomPersona(id: string): void {
  const data = loadCustomization();
  data.customPersonas = data.customPersonas.filter(p => p.id !== id);
  saveCustomization(data);
}

// ─── Merged pool (built-in + custom, with name overrides) ───

export function getPersonaPool(): WorkerPersona[] {
  const { nameOverrides, customPersonas } = loadCustomization();

  const builtins = BUILTIN_PERSONAS.map(p => ({
    ...p,
    name: nameOverrides[p.id] || p.name,
  }));

  const customs: WorkerPersona[] = customPersonas.map(c => ({
    id: c.id,
    name: c.name,
    role: c.role,
    emoji: c.emoji,
    expertise: c.expertise,
    tone: c.tone,
    color: c.color,
  }));

  return [...builtins, ...customs];
}

function getKeywordMap(): Array<{ keywords: string[]; personaId: string }> {
  const { customPersonas } = loadCustomization();
  const customKeywords = customPersonas
    .filter(c => c.keywords.length > 0)
    .map(c => ({ keywords: c.keywords, personaId: c.id }));
  return [...BUILTIN_KEYWORDS, ...customKeywords];
}

// ─── Get built-in personas (for settings UI) ───

export function getBuiltinPersonas(): WorkerPersona[] {
  return BUILTIN_PERSONAS;
}

// ─── Assignment ───

/** @deprecated useAgentStore.assignAgentToTask() 사용. 기존 호출처 마이그레이션 후 삭제 예정. */
export function assignPersona(
  task: string,
  expectedOutput: string,
  usedIds: Set<string>,
): WorkerPersona {
  const pool = getPersonaPool();
  const keywordMap = getKeywordMap();
  const text = `${task} ${expectedOutput}`.toLowerCase();

  // Score each persona by keyword hits
  let bestId: string | null = null;
  let bestScore = 0;

  for (const { keywords, personaId } of keywordMap) {
    if (usedIds.has(personaId)) continue;
    if (!pool.find(p => p.id === personaId)) continue;
    const score = keywords.filter(kw => text.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestId = personaId;
    }
  }

  if (bestId) {
    const persona = pool.find(p => p.id === bestId)!;
    usedIds.add(bestId);
    return persona;
  }

  // Fallback: pick first unused
  const unused = pool.find(p => !usedIds.has(p.id));
  if (unused) {
    usedIds.add(unused.id);
    return unused;
  }

  // All used — return intern (allow duplicate)
  return pool.find(p => p.id === 'intern') || pool[0];
}

// ─── Persona-voiced completion notes ───

const COMPLETION_NOTES: Record<string, string[]> = {
  researcher: ['정리 다 했습니다. 핵심만 추렸어요.', '조사 끝났어요. 확인해주세요.', '자료 찾았습니다. 빠진 건 없을 거예요.'],
  strategist: ['방향 잡았습니다. 한번 보시죠.', '큰 그림 그려봤어요.', '전략 정리했습니다.'],
  numbers: ['숫자 정리 완료했습니다.', '계산 끝났어요. 수치 확인해주세요.', '분석 결과 나왔습니다.'],
  copywriter: ['초안 써봤어요. 톤 확인 부탁드려요.', '문서 정리했습니다.', '읽기 쉽게 다듬었어요.'],
  critic: ['검토 끝났습니다. 몇 가지 짚었어요.', '위험 요소 찾았어요.', '솔직하게 정리했습니다.'],
  ux: ['사용자 관점에서 봤어요.', 'UX 검토 끝났습니다.', '시나리오별로 정리했어요.'],
  legal: ['법적 검토 완료했습니다.', '규정 확인했어요.', '리스크 항목 정리했습니다.'],
  intern: ['열심히 찾았어요! 확인 부탁드립니다.', '정리 다 했습니다!', '최대한 꼼꼼하게 모았어요.'],
  engineer: ['기술 검토 끝났습니다.', '구현 관점에서 정리했어요.', '아키텍처 분석 완료.'],
  pm: ['실행 계획 정리했습니다.', '일정 잡아봤어요.', '액션 아이템 뽑았습니다.'],
};

export function getCompletionNote(personaId: string): string {
  const notes = COMPLETION_NOTES[personaId];
  if (!notes || notes.length === 0) return '작업 완료했습니다.';
  return notes[Math.floor(Math.random() * notes.length)];
}

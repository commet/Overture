/**
 * Overture 통합 에이전트 시스템 — 타입 정의
 *
 * 체인 에이전트: 같은 분야의 깊이가 다른 별개 인물 (리서치, 전략). 해금으로 열림.
 * 독립 에이전트: 각자 다른 전문 분야 (카피, 숫자, 기술, PM, 리스크, UX, 법률). 처음부터 사용 가능.
 * 모든 에이전트: Lv.1에서 시작, XP 누적으로 성장.
 */

import type { FeedbackLog } from '@/stores/types';

// ─── 분류 ───

export type AgentOrigin = 'builtin' | 'stakeholder' | 'boss_sim' | 'custom';
export type AgentCapability = 'task_execution' | 'review' | 'boss_chat' | 'web_search';

// ─── 체인: 같은 분야의 깊이별 에이전트 묶음 ───

export interface AgentChain {
  id: string;                // 'research' | 'strategy'
  name: string;              // '리서치', '전략'
  agent_ids: string[];       // 순서대로 (Junior → Senior → Master)
  total_tasks: number;       // 이 체인의 총 작업 완료 수
}

// ─── 해금 조건 ───

export interface UnlockCondition {
  type: 'always' | 'chain_tasks' | 'total_tasks' | 'sessions';
  chain_id?: string;         // chain_tasks일 때: 어떤 체인의 작업 수 기준
  required: number;          // 필요 작업 수
}

// ─── 에이전트 ───

export type AgentGroup = 'research' | 'strategy' | 'production' | 'validation' | 'special' | 'people';

export interface Agent {
  id: string;

  // Identity
  name: string;
  nameEn?: string;           // English display name
  role: string;
  roleEn?: string;           // English role label
  emoji: string;
  color: string;
  origin: AgentOrigin;
  capabilities: AgentCapability[];

  // 소속
  group: AgentGroup;
  chain_id: string | null;   // 체인 소속이면 chain id, 독립이면 null

  // 해금
  unlock_condition: UnlockCondition;
  unlocked: boolean;

  // Worker traits (WorkerPersona 유래)
  expertise?: string;
  tone?: string;
  keywords?: string[];

  // Stakeholder traits (Persona 유래)
  organization?: string;
  priorities?: string;
  communication_style?: string;
  known_concerns?: string;
  relationship_notes?: string;
  influence?: 'high' | 'medium' | 'low';
  decision_style?: 'analytical' | 'intuitive' | 'consensus' | 'directive';
  risk_tolerance?: 'low' | 'medium' | 'high';
  success_metric?: string;
  extracted_traits?: string[];
  feedback_logs?: FeedbackLog[];

  // Boss traits (PersonalityType + Saju 유래)
  personality_code?: string;
  personality_profile?: {
    communicationStyle: string;
    decisionPattern: string;
    conflictStyle: string;
    feedbackStyle: string;
    triggers: string;
    speechPatterns: string[];
    bossVibe: string;
  };
  boss_gender?: '남' | '여';
  birth_year?: number;
  birth_month?: number;
  saju_profile?: unknown;    // SajuProfile — import cycle 방지

  // Boss 대화 연속성 — 최근 대화 스레드 (boss_sim 전용)
  chat_history?: BossChatTurn[];

  // Growth
  xp: number;
  level: number;

  // Accumulated intelligence
  observations: AgentObservation[];

  // Meta
  is_builtin: boolean;
  is_example?: boolean;
  archived: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Boss 대화 턴 (chat_history 저장용) ───

export interface BossChatTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// ─── Observation: 에이전트가 사용자에 대해 축적하는 관찰 ───

export interface AgentObservation {
  id: string;
  category: 'preference' | 'skill_gap' | 'communication_style' | 'work_pattern';
  observation: string;
  confidence: number;        // 0.0~1.0. 초기 0.3, 확인 +0.15 (cap 0.95), 반박 -0.2, 0.1 미만 자동 삭제
  evidence_count: number;
  created_at: string;
}

// ─── Activity: 에이전트 활동 기록 ───

export type AgentActivityType = 'task_completed' | 'task_approved' | 'task_rejected' | 'review_given' | 'boss_chat' | 'synthesis_completed';

export interface AgentActivity {
  id: string;
  agent_id: string;
  type: AgentActivityType;
  context: string;
  session_id?: string;
  xp_earned: number;
  created_at: string;
}

// ─── 레벨 시스템 ───

export const AGENT_LEVELS = [
  { level: 1, xp: 0 },
  { level: 2, xp: 100 },    // + observation 3개 주입
  { level: 3, xp: 300 },    // + observation 5개, 크로스 컨텍스트
  { level: 4, xp: 600 },    // 전체 observation + 트랙레코드
  { level: 5, xp: 1000 },   // 전체 + 자기개선 제안
] as const;

export const XP_REWARDS = {
  task_completed: 15,
  task_approved: 10,
  task_rejected: -5,
  review_given: 20,
  review_accurate: 15,
  boss_chat: 5,
  synthesis_completed: 25,
} as const;

/** XP → 레벨 계산 */
export function calculateLevel(xp: number): number {
  let level = 1;
  for (const l of AGENT_LEVELS) {
    if (xp >= l.xp) level = l.level;
  }
  return level;
}

/** 다음 레벨까지 진행도 (0.0~1.0). 최고 레벨이면 1.0. */
export function getLevelProgress(xp: number): { current: number; next: number; progress: number } {
  const currentLevel = calculateLevel(xp);
  const nextLevelData = AGENT_LEVELS.find(l => l.level === currentLevel + 1);
  if (!nextLevelData) return { current: xp, next: xp, progress: 1 };
  const currentLevelData = AGENT_LEVELS.find(l => l.level === currentLevel)!;
  const range = nextLevelData.xp - currentLevelData.xp;
  const progressXP = xp - currentLevelData.xp;
  return {
    current: xp,
    next: nextLevelData.xp,
    progress: range > 0 ? progressXP / range : 1,
  };
}

// ─── 해금 체인 thresholds ───

export const CHAIN_UNLOCK_THRESHOLDS = {
  senior: 5,    // 체인 작업 5회 → 두 번째 에이전트 해금
  master: 15,   // 체인 작업 15회 → 세 번째 에이전트 해금
} as const;

export const CONCERTMASTER_UNLOCK_THRESHOLD = 10; // 전체 작업 10회 → 악장 해금
export const CONCERTMASTER_SESSION_THRESHOLD = 3; // 또는 3세션 완료 → 악장 해금

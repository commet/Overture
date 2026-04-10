/**
 * User Context — 사용자에 대해 알고 있는 모든 것의 단일 소스.
 *
 * 두 가지 원천을 통합:
 * 1. Explicit (설정 > 내 프로필): 이름, 역할, 경력, 자유 소개
 * 2. Observed (악장/Concertmaster): 세션 수, 지배 전략, override율, DQ 추세, 티어
 *
 * 프롬프트 빌더들은 이 모듈 하나만 호출하면 됨.
 */

import { sanitizeForPrompt } from './persona-prompt';
import type { Settings } from '@/stores/types';
import type { ConcertmasterProfile } from './concertmaster';

// ── Types ──

export interface UserProfile {
  name?: string;
  role?: string;
  seniority?: 'junior' | 'mid' | 'senior' | 'lead';
  context?: string;
}

export interface UserObservations {
  sessionCount: number;
  tier: 1 | 2 | 3;
  overrideRate: number;
  dominantStrategy: string | null;
  dqTrend: 'improving' | 'stable' | 'declining' | 'not_enough_data';
  avgPassRate: number;
}

export interface FullUserContext {
  profile: UserProfile;
  observations: UserObservations;
}

// ── Readers ──

export function getUserProfile(): UserProfile {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('sot_settings') : null;
    if (!raw) return {};
    const s: Partial<Settings> = JSON.parse(raw);
    return {
      name: s.user_name || undefined,
      role: s.user_role || undefined,
      seniority: s.user_seniority || undefined,
      context: s.user_context || undefined,
    };
  } catch {
    return {};
  }
}

export function getUserObservations(): UserObservations {
  try {
    // Dynamic import to avoid circular deps — concertmaster imports heavy modules
    const { buildConcertmasterProfile } = require('./concertmaster') as { buildConcertmasterProfile: () => ConcertmasterProfile };
    const { analyzeDQTrend } = require('./decision-quality') as { analyzeDQTrend: () => { trend: string } };

    const profile = buildConcertmasterProfile();
    const dq = analyzeDQTrend();

    return {
      sessionCount: profile.sessionCount,
      tier: profile.tier,
      overrideRate: profile.overrideRate,
      dominantStrategy: profile.dominantStrategy,
      dqTrend: dq.trend as UserObservations['dqTrend'],
      avgPassRate: profile.avgPassRate,
    };
  } catch {
    return {
      sessionCount: 0,
      tier: 1,
      overrideRate: 0,
      dominantStrategy: null,
      dqTrend: 'not_enough_data',
      avgPassRate: 0,
    };
  }
}

export function getFullUserContext(): FullUserContext {
  return {
    profile: getUserProfile(),
    observations: getUserObservations(),
  };
}

// ── Prompt Builders (target-specific) ──

const SENIORITY_KO: Record<string, string> = {
  junior: '주니어 (1-3년차)',
  mid: '미들 (4-7년차)',
  senior: '시니어 (8년차+)',
  lead: '팀장/리드급',
};
const SENIORITY_EN: Record<string, string> = {
  junior: 'Junior (1-3 yrs)',
  mid: 'Mid-level (4-7 yrs)',
  senior: 'Senior (8+ yrs)',
  lead: 'Team Lead',
};

const STRATEGY_KO: Record<string, string> = {
  challenge_existence: '존재 의심',
  narrow_scope: '범위 집중',
  diagnose_root: '원인 진단',
  redirect_angle: '관점 전환',
};

/**
 * 리뷰 프롬프트용: 명시적 프로필 + 관찰된 패턴 (리뷰어가 사용자 수준을 알게)
 */
export function buildUserContextForReview(locale: 'ko' | 'en'): string {
  const { profile, observations } = getFullUserContext();
  const s = sanitizeForPrompt;
  const seniorityMap = locale === 'ko' ? SENIORITY_KO : SENIORITY_EN;

  const hasProfile = profile.name || profile.role || profile.seniority || profile.context;
  const hasObservations = observations.sessionCount >= 2;

  if (!hasProfile && !hasObservations) return '';

  const lines: string[] = [];

  if (locale === 'ko') {
    lines.push('[이 문서를 가져온 사람]');
    if (profile.name) lines.push(`- 이름: ${s(profile.name)}`);
    if (profile.role) lines.push(`- 역할: ${s(profile.role)}`);
    if (profile.seniority) lines.push(`- 경력: ${seniorityMap[profile.seniority] || profile.seniority}`);
    if (profile.context) lines.push(`- 본인 소개: ${s(profile.context)}`);

    if (hasObservations) {
      if (observations.overrideRate > 0.3) {
        lines.push(`- 특성: AI 제안을 자주 수정하는 편 — 구체적 대안을 함께 제시하세요`);
      }
      if (observations.dqTrend === 'improving') {
        lines.push(`- 추세: 판단 품질이 상승 중 — 한 단계 높은 관점의 피드백도 괜찮습니다`);
      }
    }

    lines.push('→ 이 사람의 수준과 역할에 맞게 피드백의 깊이와 용어를 조절하세요.');
  } else {
    lines.push('[About the person who wrote this document]');
    if (profile.name) lines.push(`- Name: ${s(profile.name)}`);
    if (profile.role) lines.push(`- Role: ${s(profile.role)}`);
    if (profile.seniority) lines.push(`- Experience: ${seniorityMap[profile.seniority] || profile.seniority}`);
    if (profile.context) lines.push(`- About: ${s(profile.context)}`);

    if (hasObservations) {
      if (observations.overrideRate > 0.3) {
        lines.push(`- Note: This person often modifies AI suggestions — provide specific alternatives`);
      }
      if (observations.dqTrend === 'improving') {
        lines.push(`- Trend: Decision quality improving — feel free to push with deeper perspectives`);
      }
    }

    lines.push('→ Adjust feedback depth and terminology to match this person.');
  }

  return '\n' + lines.join('\n');
}

/**
 * Boss 시뮬레이터용: 명시적 프로필만 (팀장은 시스템 메타 정보를 모름)
 */
export function buildUserContextForBoss(): string {
  const profile = getUserProfile();
  if (!profile.name && !profile.role && !profile.seniority && !profile.context) return '';

  const parts: string[] = [];
  if (profile.name) parts.push(`이름: ${profile.name}`);
  if (profile.role) parts.push(`역할: ${profile.role}`);
  if (profile.seniority) parts.push(`경력: ${SENIORITY_KO[profile.seniority] || profile.seniority}`);
  if (profile.context) parts.push(`특이사항: ${profile.context}`);

  return `\n\n## 이 부하직원 정보\n${parts.map(p => `- ${p}`).join('\n')}\n이 사람의 경력과 역할에 맞게 대화 수준을 맞추세요.`;
}

/**
 * 설정 페이지 UI용: 관찰 데이터 요약 (읽기 전용 표시)
 */
export function getObservationsSummary(locale: 'ko' | 'en' = 'ko'): {
  items: Array<{ label: string; value: string }>;
  hasData: boolean;
} {
  const obs = getUserObservations();
  if (obs.sessionCount < 2) return { items: [], hasData: false };

  const strategyMap = locale === 'ko' ? STRATEGY_KO : {};
  const trendMap = locale === 'ko'
    ? { improving: '↗ 상승', stable: '→ 안정', declining: '↘ 하락', not_enough_data: '— 수집 중' }
    : { improving: '↗ Improving', stable: '→ Stable', declining: '↘ Declining', not_enough_data: '— Collecting' };
  const tierMap = locale === 'ko'
    ? { 1: '시작', 2: '학습 중', 3: '최적화' }
    : { 1: 'Start', 2: 'Learning', 3: 'Optimized' };

  const items = [
    { label: locale === 'ko' ? '세션' : 'Sessions', value: `${obs.sessionCount}회 · Tier ${obs.tier} (${tierMap[obs.tier]})` },
    { label: locale === 'ko' ? 'DQ 추세' : 'DQ Trend', value: trendMap[obs.dqTrend] || obs.dqTrend },
  ];

  if (obs.dominantStrategy) {
    items.push({
      label: locale === 'ko' ? '선호 전략' : 'Preferred Strategy',
      value: strategyMap[obs.dominantStrategy] || obs.dominantStrategy,
    });
  }

  if (obs.overrideRate > 0) {
    items.push({
      label: locale === 'ko' ? 'AI 수정률' : 'Override Rate',
      value: `${Math.round(obs.overrideRate * 100)}%`,
    });
  }

  return { items, hasData: true };
}

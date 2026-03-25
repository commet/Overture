/**
 * Concertmaster (악장) — 읽기 전용 코칭 레이어
 *
 * 기존 분석 인프라(eval-engine, context-builder, judgmentStore, prompt-mutation)의
 * 출력을 통합하여 사용자에게 메타적 인사이트와 단계별 코칭을 제공한다.
 *
 * 원칙:
 * - 새로운 데이터 수집 없음 — 기존 함수의 읽기 레이어만
 * - LLM 미사용 — 결정론적 템플릿
 * - 점진적 노출 — 세션 수에 따라 티어 상승
 */

import { getSessionInsights, getEvalSummary, analyzeStrategyPerformance } from '@/lib/eval-engine';
import type { StrategyPerformance } from '@/lib/eval-engine';
import { getWorstPerformingEvals } from '@/lib/prompt-mutation';
import { getStorage, STORAGE_KEYS } from '@/lib/storage';
import type { JudgmentRecord, Project, PersonaAccuracyRating, DecomposeItem, OrchestrateItem, DecisionQualityScore } from '@/stores/types';
import type { ReframingStrategy } from '@/lib/reframing-strategy';

/* ────────────────────────────────────
   Types
   ──────────────────────────────────── */

export interface ConcertmasterInsight {
  id: string;
  category: 'pattern' | 'coaching' | 'growth' | 'warning';
  message: string;
  detail?: string;
  tier: 1 | 2 | 3;
  priority: number;
}

export interface ConcertmasterProfile {
  sessionCount: number;
  projectCount: number;
  totalJudgments: number;
  overrideRate: number;
  dominantStrategy: ReframingStrategy | null;
  avgPassRate: number;
  tier: 1 | 2 | 3;
}

export type CoachingStep = 'decompose' | 'orchestrate' | 'persona-feedback' | 'refinement-loop';

export interface StepCoaching {
  message: string;
  detail?: string;
}

/* ────────────────────────────────────
   Constants
   ──────────────────────────────────── */

const STRATEGY_DISPLAY: Record<ReframingStrategy, string> = {
  challenge_existence: '존재 의심',
  narrow_scope: '범위 집중',
  diagnose_root: '원인 진단',
  redirect_angle: '관점 전환',
};

const EVAL_DISPLAY: Record<string, string> = {
  question_accepted: '질문 채택률',
  assumptions_engaged: '전제 검토율',
  no_immediate_reanalyze: '1회 분석 충분율',
  has_useful_assumptions: '미확인 전제 발견율',
};

/* ────────────────────────────────────
   1. buildConcertmasterProfile
   ──────────────────────────────────── */

export function buildConcertmasterProfile(): ConcertmasterProfile {
  const evalSummary = getEvalSummary();
  const judgments = getStorage<JudgmentRecord[]>(STORAGE_KEYS.JUDGMENTS, []);
  const projects = getStorage<Project[]>(STORAGE_KEYS.PROJECTS, []);

  const totalJudgments = judgments.length;
  const overrides = judgments.filter((j) => j.user_changed);
  const overrideRate = totalJudgments > 0 ? overrides.length / totalJudgments : 0;

  const sessionCount = evalSummary.total_sessions;
  const projectCount = projects.length;

  // Dominant strategy from recent performance
  const perf = analyzeStrategyPerformance();
  const dominant = perf.length > 0
    ? perf.sort((a, b) => b.sample_count - a.sample_count)[0].strategy
    : null;

  const tier: 1 | 2 | 3 = sessionCount >= 10 && projectCount >= 2
    ? 3
    : sessionCount >= 3
      ? 2
      : 1;

  return {
    sessionCount,
    projectCount,
    totalJudgments,
    overrideRate,
    dominantStrategy: dominant,
    avgPassRate: evalSummary.avg_pass_rate,
    tier,
  };
}

/* ────────────────────────────────────
   2. buildConcertmasterInsights
   ──────────────────────────────────── */

export function buildConcertmasterInsights(profile: ConcertmasterProfile): ConcertmasterInsight[] {
  const insights: ConcertmasterInsight[] = [];
  let priority = 0;

  // ── Tier 1+: Session insights (last strategy + pattern) ──
  const sessionInsights = getSessionInsights();
  for (const si of sessionInsights) {
    if (si.type === 'last_strategy') {
      insights.push({
        id: 'session_last_strategy',
        category: 'pattern',
        message: si.message,
        tier: 1,
        priority: priority++,
      });
    }
    if (si.type === 'pattern' && profile.tier >= 2) {
      insights.push({
        id: 'session_pattern',
        category: 'pattern',
        message: si.message,
        tier: 2,
        priority: priority++,
      });
    }
    if (si.type === 'tip') {
      insights.push({
        id: 'session_tip',
        category: 'growth',
        message: si.message,
        tier: 1,
        priority: priority++,
      });
    }
  }

  // ── Tier 2+: Eval summary ──
  if (profile.tier >= 2) {
    const evalSummary = getEvalSummary();
    if (evalSummary.total_sessions > 0) {
      const pct = Math.round(evalSummary.avg_pass_rate * 100);
      insights.push({
        id: 'eval_summary',
        category: 'growth',
        message: `${evalSummary.total_sessions}회 분석, 평균 활용률 ${pct}%`,
        tier: 2,
        priority: priority++,
      });
    }

    // Worst performing evals → coaching
    const worstEvals = getWorstPerformingEvals();
    for (const mutation of worstEvals.slice(0, 2)) {
      const evalName = EVAL_DISPLAY[mutation.evalId] || mutation.evalId;
      const pct = Math.round(mutation.passRate * 100);
      insights.push({
        id: `coaching_${mutation.evalId}`,
        category: 'coaching',
        message: `${evalName}이 ${pct}%로 낮습니다`,
        detail: mutation.instruction,
        tier: 2,
        priority: priority++,
      });
    }

    // Override rate interpretation
    if (profile.totalJudgments >= 3) {
      const pct = Math.round(profile.overrideRate * 100);
      if (profile.overrideRate > 0.4) {
        insights.push({
          id: 'override_rate_high',
          category: 'pattern',
          message: `AI 제안 수정률 ${pct}% — 높은 자기 판단 성향`,
          detail: '이 패턴이 향후 AI 제안에 반영됩니다.',
          tier: 2,
          priority: priority++,
        });
      } else if (profile.overrideRate < 0.1 && profile.totalJudgments >= 5) {
        insights.push({
          id: 'override_rate_low',
          category: 'coaching',
          message: `AI 제안을 거의 그대로 수용하고 계십니다 (수정률 ${pct}%)`,
          detail: 'AI 제안을 비판적으로 검토하면 더 나은 결과를 얻을 수 있습니다.',
          tier: 2,
          priority: priority++,
        });
      }
    }
  }

  // ── Tier 3: Cross-project + strategy performance ──
  if (profile.tier >= 3) {
    // Coda insights
    const projects = getStorage<Project[]>(STORAGE_KEYS.PROJECTS, []);
    const withReflection = projects.filter(
      (p) => p.meta_reflection?.surprising_discovery || p.meta_reflection?.next_time_differently
    );
    for (const p of withReflection.slice(0, 2)) {
      const r = p.meta_reflection!;
      const content = r.surprising_discovery || r.next_time_differently || '';
      insights.push({
        id: `coda_${p.id}`,
        category: 'growth',
        message: `${p.name}: ${content}`,
        tier: 3,
        priority: priority++,
      });
    }

    // Strategy performance comparison
    const perf = analyzeStrategyPerformance();
    const sorted = perf.filter((p) => p.sample_count >= 3).sort((a, b) => b.avg_pass_rate - a.avg_pass_rate);
    if (sorted.length >= 2) {
      const best = sorted[0];
      const bestName = STRATEGY_DISPLAY[best.strategy] || best.strategy;
      const bestPct = Math.round(best.avg_pass_rate * 100);
      insights.push({
        id: 'strategy_best',
        category: 'growth',
        message: `"${bestName}" 전략의 활용률이 ${bestPct}%로 가장 높습니다`,
        tier: 3,
        priority: priority++,
      });
    }
  }

  // Filter by tier and sort by priority
  return insights
    .filter((i) => i.tier <= profile.tier)
    .sort((a, b) => a.priority - b.priority);
}

/* ────────────────────────────────────
   3. getStepCoaching
   ──────────────────────────────────── */

export function getStepCoaching(step: CoachingStep, profile: ConcertmasterProfile): StepCoaching | null {
  switch (step) {
    case 'decompose':
      return getDecomposeCoaching(profile);
    case 'orchestrate':
      return getOrchestrateCoaching(profile);
    case 'persona-feedback':
      return getPersonaFeedbackCoaching(profile);
    case 'refinement-loop':
      return getRefinementLoopCoaching(profile);
    default:
      return null;
  }
}

function getDecomposeCoaching(profile: ConcertmasterProfile): StepCoaching | null {
  // Tier 1: Welcome
  if (profile.sessionCount === 0) {
    return {
      message: '첫 분석입니다. 과제를 입력하면 숨겨진 전제를 찾아드립니다.',
    };
  }

  // Strategy repetition detection (tier 2+)
  if (profile.tier >= 2 && profile.dominantStrategy) {
    const sessionInsights = getSessionInsights();
    const patternInsight = sessionInsights.find((si) => si.type === 'pattern');
    if (patternInsight) {
      const strategyName = STRATEGY_DISPLAY[profile.dominantStrategy];
      return {
        message: `'${strategyName}'를 자주 사용하고 계십니다. 다른 관점도 시도해보세요.`,
      };
    }
  }

  // Assumptions engagement failure
  if (profile.tier >= 2) {
    const worstEvals = getWorstPerformingEvals();
    const assumptionFail = worstEvals.find((m) => m.evalId === 'assumptions_engaged');
    if (assumptionFail) {
      return {
        message: '전제 평가를 더 적극적으로 해보세요.',
        detail: '전제에 "확인됨" 마킹을 하면 분석 품질이 올라갑니다.',
      };
    }
  }

  // High pass rate congratulation
  if (profile.avgPassRate >= 0.75 && profile.sessionCount >= 3) {
    return {
      message: '분석 활용도가 높습니다. 현재 접근이 잘 맞고 있습니다.',
    };
  }

  return null;
}

function getOrchestrateCoaching(profile: ConcertmasterProfile): StepCoaching | null {
  if (profile.totalJudgments < 3) return null;

  const judgments = getStorage<JudgmentRecord[]>(STORAGE_KEYS.JUDGMENTS, []);
  const actorOverrides = judgments.filter((j) => j.type === 'actor_override');

  // Override rate > 40%
  if (profile.overrideRate > 0.4) {
    const pct = Math.round(profile.overrideRate * 100);
    return {
      message: `AI 제안을 자주 수정하시는군요 (${pct}%). 이 패턴이 반영되고 있습니다.`,
    };
  }

  // Actor preference
  if (actorOverrides.length >= 3) {
    const humanPrefs = actorOverrides.filter((j) => j.decision === 'human').length;
    const aiPrefs = actorOverrides.filter((j) => j.decision === 'ai').length;
    if (humanPrefs > aiPrefs * 1.5) {
      return {
        message: '사람이 직접 하는 것을 선호하시는 경향이 있습니다.',
      };
    }
    if (aiPrefs > humanPrefs * 1.5) {
      return {
        message: 'AI에 많이 위임하는 편입니다. 체크포인트를 충분히 두세요.',
      };
    }
  }

  // Cross-stage: check decompose for unverified assumptions
  const decomposeItems = getStorage<DecomposeItem[]>(STORAGE_KEYS.DECOMPOSE_LIST, []);
  const latestDecompose = decomposeItems.filter(d => d.status === 'done').pop();
  if (latestDecompose?.analysis) {
    const uncertain = latestDecompose.analysis.hidden_assumptions.filter(
      a => a.evaluation === 'uncertain' || a.evaluation === 'doubtful'
    );
    if (uncertain.length > 0) {
      return {
        message: `악보 해석에서 불확실 전제 ${uncertain.length}건 — 실행 설계에 검증 단계를 포함하세요.`,
        detail: uncertain.slice(0, 2).map(a => a.assumption).join(' / '),
      };
    }
  }

  return null;
}

function getPersonaFeedbackCoaching(profile: ConcertmasterProfile): StepCoaching | null {
  // Cross-stage: check orchestrate for key assumptions to test
  const orchestrateItems = getStorage<OrchestrateItem[]>(STORAGE_KEYS.ORCHESTRATE_LIST, []);
  const latestOrch = orchestrateItems.filter(o => o.status === 'done').pop();
  if (latestOrch?.analysis?.key_assumptions) {
    const highImportance = latestOrch.analysis.key_assumptions.filter(ka => ka.importance === 'high');
    if (highImportance.length > 0) {
      return {
        message: `편곡에서 중요도 높은 가정 ${highImportance.length}건 — 페르소나에게 검증 요청하세요.`,
        detail: highImportance.slice(0, 2).map(ka => ka.assumption).join(' / '),
      };
    }
  }

  const ratings = getStorage<PersonaAccuracyRating[]>(STORAGE_KEYS.ACCURACY_RATINGS, []);
  if (ratings.length === 0) return null;

  // Group by persona, find the one with most ratings
  const byPersona: Record<string, PersonaAccuracyRating[]> = {};
  for (const r of ratings) {
    if (!byPersona[r.persona_id]) byPersona[r.persona_id] = [];
    byPersona[r.persona_id].push(r);
  }

  const entries = Object.entries(byPersona);
  if (entries.length === 0) return null;

  const [, personaRatings] = entries.sort(([, a], [, b]) => b.length - a.length)[0];
  const avg = personaRatings.reduce((sum, r) => sum + r.accuracy_score, 0) / personaRatings.length;
  const score = Math.round(avg * 10) / 10;

  // Find best & worst aspects
  const aspectCounts: Record<string, { accurate: number; inaccurate: number }> = {};
  for (const r of personaRatings) {
    for (const a of r.which_aspects_accurate) {
      if (!aspectCounts[a]) aspectCounts[a] = { accurate: 0, inaccurate: 0 };
      aspectCounts[a].accurate++;
    }
    for (const a of r.which_aspects_inaccurate) {
      if (!aspectCounts[a]) aspectCounts[a] = { accurate: 0, inaccurate: 0 };
      aspectCounts[a].inaccurate++;
    }
  }

  const sorted = Object.entries(aspectCounts).sort(
    ([, a], [, b]) => (b.accurate - b.inaccurate) - (a.accurate - a.inaccurate)
  );
  const best = sorted.find(([, v]) => v.accurate > v.inaccurate)?.[0];
  const worst = sorted.find(([, v]) => v.inaccurate >= v.accurate)?.[0];

  let detail: string | undefined;
  if (best && worst) {
    detail = `${best}에서 정확, ${worst}는 보정 필요`;
  } else if (best) {
    detail = `${best}에서 정확`;
  }

  return {
    message: `페르소나 정확도 ${score}/5 (${personaRatings.length}회 평가)`,
    detail,
  };
}

function getRefinementLoopCoaching(_profile: ConcertmasterProfile): StepCoaching | null {
  // Cross-stage: DQ trend from previous projects
  const dqScores = getStorage<DecisionQualityScore[]>(STORAGE_KEYS.DQ_SCORES, []);
  if (dqScores.length >= 2) {
    const sorted = [...dqScores].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const prev = sorted[sorted.length - 2];
    const last = sorted[sorted.length - 1];
    if (last.overall_dq > prev.overall_dq) {
      return {
        message: `판단 품질이 개선되고 있습니다 (${prev.overall_dq} → ${last.overall_dq}).`,
      };
    } else if (last.overall_dq < prev.overall_dq * 0.85) {
      return {
        message: `판단 품질이 하락했습니다 (${prev.overall_dq} → ${last.overall_dq}). 이번엔 전제 검토를 더 꼼꼼히 해보세요.`,
      };
    }
  }

  // Check if there are active refinement loops
  const loops = getStorage<{ iterations?: unknown[] }[]>('sot_refinement_loops', []);
  if (loops.length === 0) return null;

  const activeLoop = loops[loops.length - 1];
  const iterationCount = Array.isArray(activeLoop?.iterations) ? activeLoop.iterations.length : 0;

  if (iterationCount > 0) {
    return {
      message: `현재 ${iterationCount}회 반복. 위협이 줄어들고 있다면 수렴에 가까워지고 있습니다.`,
    };
  }

  return null;
}

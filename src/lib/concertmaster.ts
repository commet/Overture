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

import { getSessionInsights, getEvalSummary, analyzeStrategyPerformance, getAllStagesSummary } from '@/lib/eval-engine';
import type { StrategyPerformance } from '@/lib/eval-engine';
import { getWorstPerformingEvals } from '@/lib/prompt-mutation';
import { getStorage, STORAGE_KEYS } from '@/lib/storage';
import { getDQScores, analyzeDQTrend } from '@/lib/decision-quality';
import { getSignals } from '@/lib/signal-recorder';
import type { JudgmentRecord, Project, PersonaAccuracyRating, ReframeItem, RecastItem, DecisionQualityScore, RefineLoop } from '@/stores/types';
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

export interface DemoSeedData {
  doubted_count: number;
  total_premises: number;
  ai_only_steps: number;
  human_only_steps: number;
  total_steps: number;
  completed: boolean;
}

export interface ConcertmasterProfile {
  sessionCount: number;
  projectCount: number;
  totalJudgments: number;
  overrideRate: number;
  dominantStrategy: ReframingStrategy | null;
  avgPassRate: number;
  tier: 1 | 2 | 3;
  demoSeedData?: DemoSeedData;
}

export type CoachingStep = 'reframe' | 'recast' | 'rehearse' | 'refine';

export interface StepCoaching {
  message: string;
  detail?: string;
  tone?: 'neutral' | 'positive' | 'counterfactual' | 'challenge';
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
  assumptions_engaged: '가정 검토율',
  no_immediate_reanalyze: '1회 분석 충분율',
  has_useful_assumptions: '미확인 가정 발견율',
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

  // Demo seed: check if user completed demo (for first-use personalization)
  let demoSeedData: DemoSeedData | undefined;
  if (sessionCount === 0) {
    const demoSeeds = getSignals().filter(s => s.signal_type === 'demo_seed');
    if (demoSeeds.length > 0) {
      const latest = demoSeeds[demoSeeds.length - 1];
      const d = latest.signal_data as Record<string, unknown>;
      demoSeedData = {
        doubted_count: (d.doubted_count as number) || 0,
        total_premises: (d.total_premises as number) || 3,
        ai_only_steps: (d.ai_only_steps as number) || 0,
        human_only_steps: (d.human_only_steps as number) || 0,
        total_steps: (d.total_steps as number) || 4,
        completed: (d.completed as boolean) || false,
      };
    }
  }

  return {
    sessionCount,
    projectCount,
    totalJudgments,
    overrideRate,
    dominantStrategy: dominant,
    avgPassRate: evalSummary.avg_pass_rate,
    tier,
    demoSeedData,
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

/**
 * Returns up to 2 coaching messages per step, prioritized by comfort ratio.
 * Phase 1: returns array instead of single item, enabling multi-tone coaching.
 */
export function getStepCoaching(step: CoachingStep, profile: ConcertmasterProfile): StepCoaching[] {
  let candidates: StepCoaching[];
  switch (step) {
    case 'reframe':
      candidates = getReframeCoaching(profile);
      break;
    case 'recast':
      candidates = getRecastCoaching(profile);
      break;
    case 'rehearse':
      candidates = getPersonaFeedbackCoaching(profile);
      break;
    case 'refine':
      candidates = getRefineCoaching(profile);
      break;
    default:
      candidates = [];
  }
  // Max 2 coaching messages per step to avoid overwhelming the user
  return candidates.slice(0, 2);
}

function getReframeCoaching(profile: ConcertmasterProfile): StepCoaching[] {
  const results: StepCoaching[] = [];

  // Tier 1: First use — demo seed personalization or generic counterfactual
  if (profile.sessionCount === 0) {
    const seed = profile.demoSeedData;
    if (seed?.completed) {
      // Personalized coaching based on demo behavior
      if (seed.doubted_count === 0) {
        results.push({
          message: '데모에서 전제를 모두 수락하셨습니다.',
          detail: '이번에는 "정말 그런가?"라고 전제 하나를 의심해보세요. 전제를 의심하면 질문 자체가 달라집니다.',
          tone: 'challenge',
        });
      } else if (seed.doubted_count >= seed.total_premises) {
        results.push({
          message: `데모에서 전제 ${seed.total_premises}개를 모두 의심하셨습니다 — 비판적 관점이 강합니다.`,
          detail: '이번에도 그 날카로움을 적용해보세요. 어떤 전제가 가장 위험한지 표시하면 실행 설계에 반영됩니다.',
          tone: 'positive',
        });
      } else {
        results.push({
          message: `데모에서 전제 ${seed.total_premises}개 중 ${seed.doubted_count}개를 의심하셨습니다.`,
          detail: '이번에도 같은 기준을 적용해보세요. 의심스러운 가정을 "의심됨"으로 마킹하면 이후 단계에서 검증됩니다.',
          tone: 'positive',
        });
      }
    } else {
      // No demo seed — generic counterfactual
      results.push({
        message: '첫 분석입니다. 과제를 입력하면 숨은 가정을 찾아드립니다.',
        detail: '만약 문제를 입력하기 전에 "이 질문에서 내가 당연하게 여기는 것은 무엇인가?"를 먼저 떠올려보면, 더 날카로운 가정을 발견할 수 있습니다.',
        tone: 'counterfactual',
      });
    }
    return results;
  }

  // Positive: improving assumption discovery rate
  if (profile.tier >= 2) {
    const reframeItems = getStorage<ReframeItem[]>(STORAGE_KEYS.REFRAME_LIST, []);
    const doneItems = reframeItems.filter(d => d.status === 'done' && d.analysis);
    if (doneItems.length >= 2) {
      const recent = doneItems.slice(-2);
      const recentAssumptions = recent.map(d => d.analysis!.hidden_assumptions?.length || 0);
      const older = doneItems.slice(0, -2);
      if (older.length > 0) {
        const olderAvg = older.reduce((sum, d) => sum + (d.analysis!.hidden_assumptions?.length || 0), 0) / older.length;
        const recentAvg = recentAssumptions.reduce((a, b) => a + b, 0) / recentAssumptions.length;
        if (recentAvg > olderAvg * 1.3 && olderAvg > 0) {
          results.push({
            message: `가정 발견 수가 증가하고 있습니다 (평균 ${Math.round(olderAvg)}건 → ${Math.round(recentAvg)}건).`,
            detail: '문제를 더 깊이 파고드는 습관이 형성되고 있습니다.',
            tone: 'positive',
          });
        }
      }
    }
  }

  // Strategy repetition detection (tier 2+) — challenge tone
  if (profile.tier >= 2 && profile.dominantStrategy) {
    const sessionInsights = getSessionInsights();
    const patternInsight = sessionInsights.find((si) => si.type === 'pattern');
    if (patternInsight) {
      const strategyName = STRATEGY_DISPLAY[profile.dominantStrategy];
      results.push({
        message: `'${strategyName}'를 자주 사용하고 계십니다. 다른 관점도 시도해보세요.`,
        tone: 'challenge',
      });
    }
  }

  // Assumptions engagement failure — compensate
  if (profile.tier >= 2) {
    const worstEvals = getWorstPerformingEvals();
    const assumptionFail = worstEvals.find((m) => m.evalId === 'assumptions_engaged');
    if (assumptionFail) {
      results.push({
        message: '가정 평가를 더 적극적으로 해보세요.',
        detail: '가정에 "확인됨" 마킹을 하면 분석 품질이 올라갑니다.',
      });
    }
  }

  // High pass rate — specific acknowledgment
  if (results.length === 0 && profile.avgPassRate >= 0.75 && profile.sessionCount >= 3) {
    const pct = Math.round(profile.avgPassRate * 100);
    results.push({
      message: `분석 활용률 ${pct}% — 분석 결과를 실제로 활용하고 있습니다.`,
      tone: 'positive',
    });
  }

  return results;
}

function getRecastCoaching(profile: ConcertmasterProfile): StepCoaching[] {
  const results: StepCoaching[] = [];

  // First use — demo seed personalization or generic counterfactual
  if (profile.sessionCount === 0) {
    const seed = profile.demoSeedData;
    if (seed?.completed) {
      if (seed.ai_only_steps >= seed.total_steps - 1) {
        results.push({
          message: '데모에서 대부분을 AI에 위임하셨습니다.',
          detail: '이번에는 핵심 판단 단계에 "사람" 또는 "협업"을 배치해보세요. 체크포인트가 실패를 조기에 잡아줍니다.',
          tone: 'challenge',
        });
      } else if (seed.human_only_steps >= seed.total_steps - 1) {
        results.push({
          message: '데모에서 대부분을 사람이 직접 하도록 배치하셨습니다.',
          detail: '반복적인 단계는 AI에 위임하고, 판단이 필요한 곳에 집중하면 효율이 올라갑니다.',
          tone: 'positive',
        });
      } else {
        results.push({
          message: '데모에서 AI와 사람의 역할을 균형 있게 배분하셨습니다.',
          detail: '이번에도 "이 단계는 누가 해야 가장 효과적인가?"를 기준으로 배치해보세요.',
          tone: 'positive',
        });
      }
    } else {
      results.push({
        message: '실행 설계 단계입니다.',
        detail: '만약 각 단계에서 "이게 실패하면 누가 알아차리는가?"를 적어두면, 체크포인트 배치가 더 정확해집니다.',
        tone: 'counterfactual',
      });
    }
    return results;
  }

  if (profile.totalJudgments < 3) {
    // Cross-stage: check reframe for unverified assumptions (always show if available)
    const reframeItems = getStorage<ReframeItem[]>(STORAGE_KEYS.REFRAME_LIST, []);
    const latestReframe = reframeItems.filter(d => d.status === 'done').pop();
    if (latestReframe?.analysis) {
      const uncertain = latestReframe.analysis.hidden_assumptions.filter(
        a => a.evaluation === 'uncertain' || a.evaluation === 'doubtful'
      );
      if (uncertain.length > 0) {
        results.push({
          message: `악보 해석에서 불확실한 가정 ${uncertain.length}건 — 실행 설계에 검증 단계를 포함하세요.`,
          detail: uncertain.slice(0, 2).map(a => a.assumption).join(' / '),
        });
      }
    }
    return results;
  }

  const judgments = getStorage<JudgmentRecord[]>(STORAGE_KEYS.JUDGMENTS, []);
  const actorOverrides = judgments.filter((j) => j.type === 'actor_override');

  // Override rate > 40%
  if (profile.overrideRate > 0.4) {
    const pct = Math.round(profile.overrideRate * 100);
    results.push({
      message: `AI 제안을 자주 수정하시는군요 (${pct}%). 이 패턴이 반영되고 있습니다.`,
      tone: 'positive',
    });
  }

  // Actor preference — challenge tone for extreme patterns
  if (actorOverrides.length >= 3) {
    const humanPrefs = actorOverrides.filter((j) => j.decision === 'human').length;
    const aiPrefs = actorOverrides.filter((j) => j.decision === 'ai').length;
    if (humanPrefs > aiPrefs * 1.5) {
      results.push({
        message: '사람이 직접 하는 것을 선호하시는 경향이 있습니다.',
      });
    }
    if (aiPrefs > humanPrefs * 1.5) {
      results.push({
        message: 'AI에 많이 위임하는 편입니다. 체크포인트를 충분히 두세요.',
        tone: 'challenge',
      });
    }
  }

  // Cross-stage: check reframe for unverified assumptions
  const reframeItems = getStorage<ReframeItem[]>(STORAGE_KEYS.REFRAME_LIST, []);
  const latestReframe = reframeItems.filter(d => d.status === 'done').pop();
  if (latestReframe?.analysis) {
    const uncertain = latestReframe.analysis.hidden_assumptions.filter(
      a => a.evaluation === 'uncertain' || a.evaluation === 'doubtful'
    );
    if (uncertain.length > 0) {
      results.push({
        message: `악보 해석에서 불확실한 가정 ${uncertain.length}건 — 실행 설계에 검증 단계를 포함하세요.`,
        detail: uncertain.slice(0, 2).map(a => a.assumption).join(' / '),
      });
    }
  }

  return results;
}

function getPersonaFeedbackCoaching(profile: ConcertmasterProfile): StepCoaching[] {
  const results: StepCoaching[] = [];

  // First use — counterfactual
  if (profile.sessionCount === 0) {
    results.push({
      message: '페르소나가 당신의 계획을 검증합니다.',
      detail: '만약 리허설 전에 "가장 불편한 질문이 뭘까?"를 먼저 떠올려보면, 페르소나의 피드백을 더 깊이 받아들일 수 있습니다.',
      tone: 'counterfactual',
    });
    return results;
  }

  // Positive: improving persona accuracy over time
  const allRatings = getStorage<PersonaAccuracyRating[]>(STORAGE_KEYS.ACCURACY_RATINGS, []);
  if (allRatings.length >= 4) {
    const sorted = [...allRatings].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
    const firstAvg = firstHalf.reduce((s, r) => s + r.accuracy_score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, r) => s + r.accuracy_score, 0) / secondHalf.length;
    if (secondAvg > firstAvg + 0.5) {
      results.push({
        message: `페르소나 정확도가 향상되고 있습니다 (${firstAvg.toFixed(1)} → ${secondAvg.toFixed(1)}).`,
        detail: '페르소나의 피드백을 반영한 결과, 시뮬레이션 품질이 올라가고 있습니다.',
        tone: 'positive',
      });
    }
  }

  // Cross-stage: check recast for key assumptions to test
  const recastItems = getStorage<RecastItem[]>(STORAGE_KEYS.RECAST_LIST, []);
  const latestRecast = recastItems.filter(o => o.status === 'done').pop();
  if (latestRecast?.analysis?.key_assumptions) {
    const highImportance = latestRecast.analysis.key_assumptions.filter(ka => ka.importance === 'high');
    if (highImportance.length > 0) {
      results.push({
        message: `편곡에서 중요도 높은 가정 ${highImportance.length}건 — 페르소나에게 검증 요청하세요.`,
        detail: highImportance.slice(0, 2).map(ka => ka.assumption).join(' / '),
      });
    }
  }

  // Persona accuracy summary
  const ratings = getStorage<PersonaAccuracyRating[]>(STORAGE_KEYS.ACCURACY_RATINGS, []);
  if (ratings.length > 0) {
    const byPersona: Record<string, PersonaAccuracyRating[]> = {};
    for (const r of ratings) {
      if (!byPersona[r.persona_id]) byPersona[r.persona_id] = [];
      byPersona[r.persona_id].push(r);
    }

    const entries = Object.entries(byPersona);
    if (entries.length > 0) {
      const [, personaRatings] = entries.sort(([, a], [, b]) => b.length - a.length)[0];
      const avg = personaRatings.reduce((sum, r) => sum + r.accuracy_score, 0) / personaRatings.length;
      const score = Math.round(avg * 10) / 10;

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

      const sortedAspects = Object.entries(aspectCounts).sort(
        ([, a], [, b]) => (b.accurate - b.inaccurate) - (a.accurate - a.inaccurate)
      );
      const best = sortedAspects.find(([, v]) => v.accurate > v.inaccurate)?.[0];
      const worst = sortedAspects.find(([, v]) => v.inaccurate >= v.accurate)?.[0];

      let detail: string | undefined;
      if (best && worst) {
        detail = `${best}에서 정확, ${worst}는 보정 필요`;
      } else if (best) {
        detail = `${best}에서 정확`;
      }

      results.push({
        message: `페르소나 정확도 ${score}/5 (${personaRatings.length}회 평가)`,
        detail,
      });
    }
  }

  return results;
}

function getRefineCoaching(_profile: ConcertmasterProfile): StepCoaching[] {
  const results: StepCoaching[] = [];

  // First use — counterfactual
  if (_profile.sessionCount === 0) {
    results.push({
      message: '피드백을 반영하며 수렴하는 단계입니다.',
      detail: '만약 수정할 때 "이 변경이 다른 단계에 어떤 영향을 주는가?"를 함께 생각하면, 1회 반복으로 수렴할 가능성이 높아집니다.',
      tone: 'counterfactual',
    });
    return results;
  }

  // Cross-stage: DQ trend from previous projects
  const dqScores = getStorage<DecisionQualityScore[]>(STORAGE_KEYS.DQ_SCORES, []);
  if (dqScores.length >= 2) {
    const sorted = [...dqScores].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const prev = sorted[sorted.length - 2];
    const last = sorted[sorted.length - 1];
    const dqElements = [
      { key: 'appropriate_frame' as const, label: '프레이밍' },
      { key: 'creative_alternatives' as const, label: '대안 탐색' },
      { key: 'relevant_information' as const, label: '정보 수집' },
      { key: 'clear_values' as const, label: '관점 다양성' },
      { key: 'sound_reasoning' as const, label: '추론 품질' },
      { key: 'commitment_to_action' as const, label: '실행 가능성' },
    ];
    if (last.overall_dq > prev.overall_dq) {
      let biggestGainLabel = '';
      let biggestDelta = 0;
      for (const { key, label } of dqElements) {
        const delta = (last[key] || 0) - (prev[key] || 0);
        if (delta > biggestDelta) { biggestDelta = delta; biggestGainLabel = label; }
      }
      const detail = biggestGainLabel ? `가장 큰 개선: ${biggestGainLabel}` : undefined;
      results.push({
        message: `판단 품질이 개선되고 있습니다 (${prev.overall_dq} → ${last.overall_dq}).`,
        detail,
        tone: 'positive',
      });
    } else if (last.overall_dq < prev.overall_dq * 0.85) {
      let biggestDropLabel = '';
      let biggestDelta = 0;
      for (const { key, label } of dqElements) {
        const delta = (prev[key] || 0) - (last[key] || 0);
        if (delta > biggestDelta) { biggestDelta = delta; biggestDropLabel = label; }
      }
      const detail = biggestDropLabel ? `하락 원인: ${biggestDropLabel}` : undefined;
      results.push({
        message: `판단 품질이 하락했습니다 (${prev.overall_dq} → ${last.overall_dq}). 이번엔 가정 검토를 더 꼼꼼히 해보세요.`,
        detail,
        tone: 'challenge',
      });
    }
  }

  // Check if there are active refine loops
  const loops = getStorage<RefineLoop[]>(STORAGE_KEYS.REFINE_LOOPS, []);
  if (loops.length > 0) {
    const activeLoop = loops[loops.length - 1];
    const iterationCount = Array.isArray(activeLoop?.iterations) ? activeLoop.iterations.length : 0;

    if (iterationCount > 0) {
      results.push({
        message: `현재 ${iterationCount}회 반복. 위협이 줄어들고 있다면 수렴에 가까워지고 있습니다.`,
      });
    }
  }

  return results;
}

/* ────────────────────────────────────
   4. buildLearningCurve
   Learning-by-doing의 가시화.
   Anthropic Economic Index가 증명한 학습 곡선을
   사용자의 실제 데이터로 보여준다.
   ──────────────────────────────────── */

export interface LearningCurvePoint {
  project_id: string;
  project_name: string;
  overall_dq: number;
  date: string;
}

export interface LearningCurve {
  /** DQ 점수 시계열 */
  dq_points: LearningCurvePoint[];

  /** 6개 DQ 요소별 추이 (시간순) */
  element_trends: Record<string, number[]>;

  /** 가장 많이 개선된 요소 */
  most_improved_element: string | null;
  /** 개선 폭 (점) */
  improvement_delta: number;

  /** DQ 트렌드 분석 */
  trend: 'improving' | 'stable' | 'declining' | 'not_enough_data';
  avg_dq: number;

  /** 현재 티어 + 다음 티어까지 진행률 (0-100) */
  current_tier: 1 | 2 | 3;
  tier_progress: number;

  /** Axis Fingerprint: 축별 커버리지 % (최근 10개 기준, Sliding Windows) */
  axis_coverage: Record<string, number>;
  /** 가장 약한 축 (blind spot) — null이면 유의미한 갭 없음 */
  axis_gap: string | null;

  /** 충분한 데이터가 있는지 */
  has_data: boolean;
}

const DQ_ELEMENTS = [
  { key: 'appropriate_frame' as const, label: '프레이밍' },
  { key: 'creative_alternatives' as const, label: '대안 탐색' },
  { key: 'relevant_information' as const, label: '정보 수집' },
  { key: 'clear_values' as const, label: '관점 다양성' },
  { key: 'sound_reasoning' as const, label: '추론 품질' },
  { key: 'commitment_to_action' as const, label: '실행 가능성' },
] as const;

const AXIS_LABELS: Record<string, string> = {
  customer_value: '고객 가치',
  feasibility: '실현 가능성',
  business: '비즈니스',
  org_capacity: '조직 역량',
};

export function buildLearningCurve(): LearningCurve {
  const projects = getStorage<Project[]>(STORAGE_KEYS.PROJECTS, []);
  const dqScores = getDQScores();
  const sorted = [...dqScores].sort((a, b) => a.created_at.localeCompare(b.created_at));

  // ── DQ points with project names ──
  const dq_points: LearningCurvePoint[] = sorted.map(s => {
    const proj = projects.find(p => p.id === s.project_id);
    return {
      project_id: s.project_id,
      project_name: proj?.name || '프로젝트',
      overall_dq: s.overall_dq,
      date: s.created_at,
    };
  });

  // ── Element trends ──
  const element_trends: Record<string, number[]> = {};
  for (const { key, label } of DQ_ELEMENTS) {
    element_trends[label] = sorted.map(s => s[key]);
  }

  // ── Most improved element (compare first half vs second half) ──
  let most_improved_element: string | null = null;
  let improvement_delta = 0;

  if (sorted.length >= 2) {
    const mid = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, mid);
    const secondHalf = sorted.slice(mid);

    for (const { key, label } of DQ_ELEMENTS) {
      const firstAvg = firstHalf.reduce((s, sc) => s + sc[key], 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((s, sc) => s + sc[key], 0) / secondHalf.length;
      const delta = secondAvg - firstAvg;
      if (delta > improvement_delta) {
        improvement_delta = Math.round(delta * 10) / 10;
        most_improved_element = label;
      }
    }
  }

  // ── DQ Trend ──
  const dqTrend = analyzeDQTrend(sorted);

  // ── Tier progress ──
  const profile = buildConcertmasterProfile();
  let tier_progress = 0;
  if (profile.tier === 1) {
    tier_progress = Math.min(100, Math.round((profile.sessionCount / 3) * 100));
  } else if (profile.tier === 2) {
    const sessionProgress = Math.min(100, Math.round((profile.sessionCount / 10) * 100));
    const projectProgress = Math.min(100, Math.round((profile.projectCount / 2) * 100));
    tier_progress = Math.min(sessionProgress, projectProgress);
  } else {
    tier_progress = 100;
  }

  // ── Axis Fingerprint (Sliding Window: last 10 decisions) ──
  const reframeItems = getStorage<ReframeItem[]>(STORAGE_KEYS.REFRAME_LIST, []);
  const doneItems = reframeItems.filter(d => d.status === 'done' && d.analysis);
  const recentItems = doneItems.slice(-10);

  const axisCounts: Record<string, number> = {
    customer_value: 0, feasibility: 0, business: 0, org_capacity: 0,
  };
  let totalAssumptions = 0;

  for (const item of recentItems) {
    for (const assumption of item.analysis!.hidden_assumptions || []) {
      if (assumption.axis && assumption.axis in axisCounts) {
        axisCounts[assumption.axis]++;
      }
      totalAssumptions++;
    }
  }

  const axis_coverage: Record<string, number> = {};
  for (const [axis, count] of Object.entries(axisCounts)) {
    axis_coverage[AXIS_LABELS[axis] || axis] = totalAssumptions > 0
      ? Math.round((count / totalAssumptions) * 100)
      : 0;
  }

  // Find blind spot: axis significantly below average
  let axis_gap: string | null = null;
  if (totalAssumptions > 0) {
    let minCoverage = Infinity;
    let minLabel = '';
    for (const [label, pct] of Object.entries(axis_coverage)) {
      if (pct < minCoverage) {
        minCoverage = pct;
        minLabel = label;
      }
    }
    const avgCoverage = Object.values(axis_coverage).reduce((a, b) => a + b, 0) / Object.keys(axis_coverage).length;
    if (minCoverage < avgCoverage * 0.5) {
      axis_gap = minLabel;
    }
  }

  return {
    dq_points,
    element_trends,
    most_improved_element,
    improvement_delta,
    trend: dqTrend.trend,
    avg_dq: dqTrend.avg_dq,
    current_tier: profile.tier,
    tier_progress,
    axis_coverage,
    axis_gap,
    has_data: sorted.length >= 1,
  };
}

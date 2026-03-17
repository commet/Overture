import { getStorage, STORAGE_KEYS } from '@/lib/storage';
import type { JudgmentRecord, DecomposeItem, OrchestrateItem, SynthesizeItem, PersonaAccuracyRating } from '@/stores/types';

/**
 * Builds an enhanced system prompt by injecting user patterns and project context.
 * This is the core "learning" mechanism — past judgments influence future AI suggestions.
 */
export function buildEnhancedSystemPrompt(
  basePrompt: string,
  projectId?: string,
): string {
  const judgments = getStorage<JudgmentRecord[]>(STORAGE_KEYS.JUDGMENTS, []);
  if (judgments.length === 0) return basePrompt;

  const sections: string[] = [];

  // 1. User pattern summary
  const patterns = analyzePatterns(judgments);
  if (patterns) {
    sections.push(`## 사용자 패턴 (과거 ${judgments.length}건의 판단 기반)\n${patterns}`);
  }

  // 2. Project-specific context
  if (projectId) {
    const projectContext = buildProjectContext(projectId, judgments);
    if (projectContext) {
      sections.push(`## 이 프로젝트에서의 이전 판단\n${projectContext}`);
    }
  }

  if (sections.length === 0) return basePrompt;

  // Append as a bounded context section (max ~500 chars to avoid bloating)
  const contextSection = sections.join('\n\n').slice(0, 800);

  return `${basePrompt}\n\n---\n\n${contextSection}`;
}

function analyzePatterns(judgments: JudgmentRecord[]): string | null {
  if (judgments.length < 3) return null;

  const lines: string[] = [];

  // Override rate
  const overrides = judgments.filter((j) => j.user_changed);
  const overrideRate = Math.round((overrides.length / judgments.length) * 100);
  if (overrideRate > 30) {
    lines.push(`- 이 사용자는 AI 제안의 ${overrideRate}%를 수정합니다. 더 보수적이거나 맥락을 고려한 제안을 하세요.`);
  }

  // Actor preference
  const actorOverrides = judgments.filter((j) => j.type === 'actor_override');
  if (actorOverrides.length >= 3) {
    const humanPrefs = actorOverrides.filter((j) => j.decision === 'human').length;
    const aiPrefs = actorOverrides.filter((j) => j.decision === 'ai').length;
    if (humanPrefs > aiPrefs * 1.5) {
      lines.push('- 이 사용자는 사람이 직접 하는 것을 선호합니다. AI 역할을 보수적으로 제안하세요.');
    } else if (aiPrefs > humanPrefs * 1.5) {
      lines.push('- 이 사용자는 AI에게 많이 위임하는 편입니다.');
    }
  }

  // Hidden question preference
  const questionSelections = judgments.filter((j) => j.type === 'hidden_question_selection' && j.user_changed);
  if (questionSelections.length >= 2) {
    lines.push('- 이 사용자는 AI가 제안한 질문을 자주 직접 수정합니다. 다양한 관점의 질문을 제안하세요.');
  }

  return lines.length > 0 ? lines.join('\n') : null;
}

function buildProjectContext(projectId: string, judgments: JudgmentRecord[]): string | null {
  const projectJudgments = judgments
    .filter((j) => j.project_id === projectId)
    .slice(-5); // last 5 judgments for this project

  if (projectJudgments.length === 0) return null;

  const lines = projectJudgments.map((j) => {
    const typeLabels: Record<string, string> = {
      hidden_question_selection: '질문 선택',
      conflict_resolution: '쟁점 판단',
      actor_override: '역할 변경',
      feedback_accuracy: '피드백 정확도',
    };
    return `- [${typeLabels[j.type] || j.type}] ${j.context}: "${j.decision}"`;
  });

  return lines.join('\n');
}

/**
 * Build a rich context string from related project items for cross-tool awareness.
 */
export function buildProjectItemsContext(projectId: string): string {
  const decompositions = getStorage<DecomposeItem[]>(STORAGE_KEYS.DECOMPOSE_LIST, [])
    .filter((d) => d.project_id === projectId && d.status === 'done');
  const orchestrations = getStorage<OrchestrateItem[]>(STORAGE_KEYS.ORCHESTRATE_LIST, [])
    .filter((o) => o.project_id === projectId && o.status === 'done');
  const syntheses = getStorage<SynthesizeItem[]>(STORAGE_KEYS.SYNTHESIZE_LIST, [])
    .filter((s) => s.project_id === projectId && s.status === 'done');

  const parts: string[] = [];

  if (decompositions.length > 0) {
    const latest = decompositions[decompositions.length - 1];
    if (latest.analysis) {
      parts.push(`[주제 파악] 핵심 질문: ${latest.selected_question || latest.analysis.surface_task}`);
    }
  }

  if (orchestrations.length > 0) {
    const latest = orchestrations[orchestrations.length - 1];
    if (latest.analysis) {
      parts.push(`[워크플로우] ${latest.steps.length}단계, AI ${latest.analysis.ai_ratio}% / 사람 ${latest.analysis.human_ratio}%`);
    }
  }

  if (syntheses.length > 0) {
    const latest = syntheses[syntheses.length - 1];
    if (latest.final_synthesis) {
      parts.push(`[합성 결론] ${latest.final_synthesis.slice(0, 100)}`);
    }
  }

  return parts.length > 0 ? parts.join('\n') : '';
}

/**
 * Build persona accuracy context to improve future simulations.
 */
export function buildPersonaAccuracyContext(personaId: string): string {
  const ratings = getStorage<PersonaAccuracyRating[]>(STORAGE_KEYS.ACCURACY_RATINGS, [])
    .filter((r) => r.persona_id === personaId);

  if (ratings.length < 2) return '';

  const avg = ratings.reduce((sum, r) => sum + r.accuracy_score, 0) / ratings.length;
  const lines: string[] = [];

  lines.push(`## 이 페르소나 시뮬레이션의 과거 정확도 (${ratings.length}회 평가, 평균 ${avg.toFixed(1)}/5)`);

  const aspectCounts: Record<string, { accurate: number; inaccurate: number }> = {};
  for (const r of ratings) {
    for (const a of r.which_aspects_accurate) {
      if (!aspectCounts[a]) aspectCounts[a] = { accurate: 0, inaccurate: 0 };
      aspectCounts[a].accurate++;
    }
    for (const a of r.which_aspects_inaccurate) {
      if (!aspectCounts[a]) aspectCounts[a] = { accurate: 0, inaccurate: 0 };
      aspectCounts[a].inaccurate++;
    }
  }

  const good = Object.entries(aspectCounts).filter(([, v]) => v.accurate > v.inaccurate);
  const bad = Object.entries(aspectCounts).filter(([, v]) => v.inaccurate >= v.accurate);

  if (good.length > 0) {
    lines.push(`- 정확했던 부분: ${good.map(([k]) => k).join(', ')} — 이 수준을 유지하세요.`);
  }
  if (bad.length > 0) {
    lines.push(`- 부정확했던 부분: ${bad.map(([k]) => k).join(', ')} — 이 부분을 더 현실적으로 개선하세요.`);
  }

  return lines.join('\n');
}

import { getStorage, STORAGE_KEYS } from '@/lib/storage';
import type { JudgmentRecord, DecomposeItem, OrchestrateItem, SynthesizeItem, PersonaAccuracyRating, Project } from '@/stores/types';

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

  // 3. Coda reflections from past projects (learning loop)
  const codaInsights = buildCodaInsights(projectId);
  if (codaInsights) {
    sections.push(codaInsights);
  }

  if (sections.length === 0) return basePrompt;

  // Append as a bounded context section
  const contextSection = sections.join('\n\n').slice(0, 1200);

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

  // Actor preference (from orchestrate phase)
  const actorOverrides = judgments.filter((j) => j.type === 'actor_override' && j.tool === 'orchestrate');
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
 * Build insights from past project coda reflections.
 * This closes the learning loop: coda → next project's AI prompt.
 */
function buildCodaInsights(excludeProjectId?: string): string | null {
  const projects = getStorage<Project[]>(STORAGE_KEYS.PROJECTS, []);
  const withReflection = projects
    .filter((p) => p.meta_reflection && p.id !== excludeProjectId)
    .filter((p) => p.meta_reflection!.surprising_discovery || p.meta_reflection!.next_time_differently)
    .sort((a, b) => (b.meta_reflection!.created_at || '').localeCompare(a.meta_reflection!.created_at || ''))
    .slice(0, 3);

  if (withReflection.length === 0) return null;

  const lines: string[] = ['## 이전 프로젝트에서의 깨달음'];
  for (const p of withReflection) {
    const r = p.meta_reflection!;
    if (r.surprising_discovery) {
      lines.push(`- ${p.name}: 놀라운 발견 — "${r.surprising_discovery}"`);
    }
    if (r.next_time_differently) {
      lines.push(`- ${p.name}: 다음에 다르게 — "${r.next_time_differently}"`);
    }
  }
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
      parts.push(`[악보 해석] 핵심 질문: ${latest.selected_question || latest.analysis.surface_task}`);
    }
  }

  if (orchestrations.length > 0) {
    const latest = orchestrations[orchestrations.length - 1];
    if (latest.analysis) {
      parts.push(`[편곡] ${latest.steps.length}단계, AI ${latest.analysis.ai_ratio}% / 사람 ${latest.analysis.human_ratio}%`);
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
 * Build persona behavior model from accumulated accuracy data.
 * Phase 3: Structured aspect-level accuracy + calibration guidance.
 */
export function buildPersonaAccuracyContext(personaId: string): string {
  const ratings = getStorage<PersonaAccuracyRating[]>(STORAGE_KEYS.ACCURACY_RATINGS, [])
    .filter((r) => r.persona_id === personaId);

  if (ratings.length < 2) return '';

  const avg = ratings.reduce((sum, r) => sum + r.accuracy_score, 0) / ratings.length;
  const lines: string[] = [];

  lines.push(`## 페르소나 행동 모델 (${ratings.length}회 평가, 정확도 ${avg.toFixed(1)}/5)`);

  // Aspect-level accuracy analysis
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

  const good = Object.entries(aspectCounts)
    .filter(([, v]) => v.accurate > v.inaccurate)
    .sort(([, a], [, b]) => (b.accurate - b.inaccurate) - (a.accurate - a.inaccurate));
  const bad = Object.entries(aspectCounts)
    .filter(([, v]) => v.inaccurate >= v.accurate)
    .sort(([, a], [, b]) => (b.inaccurate - b.accurate) - (a.inaccurate - a.accurate));

  if (good.length > 0) {
    lines.push('');
    lines.push('### 강점 (유지)');
    good.forEach(([aspect, counts]) => {
      const accuracy = Math.round((counts.accurate / (counts.accurate + counts.inaccurate)) * 100);
      lines.push(`- ${aspect} (${accuracy}% 정확) — 이 수준을 유지하세요.`);
    });
  }

  if (bad.length > 0) {
    lines.push('');
    lines.push('### 보정 필요 (개선)');
    bad.forEach(([aspect, counts]) => {
      const accuracy = Math.round((counts.accurate / (counts.accurate + counts.inaccurate)) * 100);
      lines.push(`- ${aspect} (${accuracy}% 정확) — 이 부분에서 더 현실적으로 조정하세요.`);
    });
  }

  // Calibration guidance based on overall accuracy pattern
  if (avg < 2.5) {
    lines.push('');
    lines.push('### 보정 지시');
    lines.push('- 전반적으로 시뮬레이션이 실제와 많이 달랐습니다. 더 보수적이고 현실적으로 접근하세요.');
    lines.push('- 극단적 반응보다는 실무적 관점을 우선하세요.');
  } else if (avg > 4.0) {
    lines.push('');
    lines.push('### 보정 지시');
    lines.push('- 시뮬레이션이 매우 정확합니다. 현재 접근 방식을 유지하세요.');
  } else if (bad.length > good.length) {
    lines.push('');
    lines.push('### 보정 지시');
    lines.push(`- 부정확한 측면(${bad.map(([k]) => k).join(', ')})에 집중하여 개선하세요.`);
    lines.push(`- 정확했던 측면(${good.map(([k]) => k).join(', ')})의 톤과 깊이를 유지하세요.`);
  }

  // Cross-project persona knowledge: extract common concern patterns
  const allNotes = ratings
    .filter(r => r.accuracy_notes)
    .map(r => r.accuracy_notes!)
    .slice(-5);
  if (allNotes.length >= 2) {
    lines.push('');
    lines.push('### 사용자 피드백 메모 (최근)');
    allNotes.forEach(n => lines.push(`- "${n}"`));
  }

  return lines.join('\n');
}

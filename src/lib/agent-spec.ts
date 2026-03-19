import { getStorage, STORAGE_KEYS } from './storage';
import type { Project, DecomposeItem, OrchestrateItem, FeedbackRecord } from '@/stores/types';

export function generateAgentSpec(project: Project): string {
  const decompositions = getStorage<DecomposeItem[]>(STORAGE_KEYS.DECOMPOSE_LIST, [])
    .filter((d) => d.project_id === project.id && d.status === 'done');
  const orchestrations = getStorage<OrchestrateItem[]>(STORAGE_KEYS.ORCHESTRATE_LIST, [])
    .filter((o) => o.project_id === project.id);
  const feedbacks = getStorage<FeedbackRecord[]>(STORAGE_KEYS.FEEDBACK_HISTORY, [])
    .filter((f) => f.project_id === project.id);

  const lines: string[] = [];

  lines.push(`# Overture Agent Spec`);
  lines.push(`# Generated: ${new Date().toISOString().split('T')[0]}`);
  lines.push('');
  lines.push(`project:`);
  lines.push(`  name: "${project.name}"`);
  lines.push(`  created: "${project.created_at.split('T')[0]}"`);
  lines.push('');

  // Task definition from decompose
  if (decompositions.length > 0) {
    const latest = decompositions[decompositions.length - 1];
    if (latest.analysis) {
      lines.push(`task_definition:`);
      lines.push(`  surface_task: "${latest.analysis.surface_task}"`);
      lines.push(`  reframed_question: "${latest.selected_question || latest.analysis.surface_task}"`);
      lines.push(`  hypothesis: "${latest.analysis.hypothesis}"`);
      if (latest.analysis.hidden_assumptions.length > 0) {
        lines.push(`  assumptions_to_validate:`);
        latest.analysis.hidden_assumptions.forEach((a) => lines.push(`    - "${a}"`));
      }
      if (latest.analysis.ai_limitations.length > 0) {
        lines.push(`  ai_limitations:`);
        latest.analysis.ai_limitations.forEach((l) => lines.push(`    - "${l}"`));
      }
      lines.push('');

      // Context chain
      lines.push(`context_chain:`);
      lines.push(`  hypothesis: "${latest.analysis.hypothesis}"`);
      lines.push(`  assumptions_to_validate:`);
      latest.analysis.hidden_assumptions.forEach((a) => lines.push(`    - "${a}"`));
      if (feedbacks.length > 0) {
        const latestF = feedbacks[feedbacks.length - 1];
        const risks = latestF.results.flatMap(r => (r.classified_risks || []).filter(cr => cr.category === 'critical'));
        if (risks.length > 0) {
          lines.push(`  risks_addressed:`);
          risks.forEach(r => lines.push(`    - "${r.text}"`));
        }
      }
      lines.push('');
    }
  }

  // Workflow from orchestrate
  if (orchestrations.length > 0) {
    const latest = orchestrations[orchestrations.length - 1];
    const steps = latest.steps.length > 0 ? latest.steps : latest.analysis?.steps || [];

    lines.push(`workflow:`);
    if (latest.analysis) {
      lines.push(`  goal: "${latest.analysis.goal_summary}"`);
      lines.push(`  total_time: "${latest.analysis.total_estimated_time}"`);
      lines.push(`  ai_ratio: ${latest.analysis.ai_ratio}`);
      lines.push(`  human_ratio: ${latest.analysis.human_ratio}`);
    }
    lines.push(`  steps:`);

    steps.forEach((step, i) => {
      lines.push(`    - step: ${i + 1}`);
      lines.push(`      task: "${step.task}"`);
      lines.push(`      actor: ${step.actor}`);
      lines.push(`      reasoning: "${step.actor_reasoning}"`);
      if (step.estimated_time) {
        lines.push(`      estimated_time: "${step.estimated_time}"`);
      }
      if (step.checkpoint) {
        lines.push(`      checkpoint: true`);
        lines.push(`      checkpoint_reason: "${step.checkpoint_reason}"`);
      }
    });
    lines.push('');
  }

  // Evaluation from persona feedback
  if (feedbacks.length > 0) {
    const latest = feedbacks[feedbacks.length - 1];
    lines.push(`evaluation:`);
    lines.push(`  perspective: "${latest.feedback_perspective}"`);
    lines.push(`  stakeholders:`);
    for (const result of latest.results) {
      lines.push(`    - persona_id: "${result.persona_id}"`);
      lines.push(`      overall_reaction: "${result.overall_reaction}"`);
      if (result.concerns.length > 0) {
        lines.push(`      concerns:`);
        result.concerns.forEach((c) => lines.push(`        - "${c}"`));
      }
      if (result.first_questions.length > 0) {
        lines.push(`      expected_questions:`);
        result.first_questions.forEach((q) => lines.push(`        - "${q}"`));
      }
    }
    lines.push('');

    // Guardrails from concerns
    const allConcerns = latest.results.flatMap((r) => r.concerns || []);
    const allWantsMore = latest.results.flatMap((r) => r.wants_more || []);
    if (allConcerns.length > 0 || allWantsMore.length > 0) {
      lines.push(`guardrails:`);
      if (allConcerns.length > 0) {
        lines.push(`  must_address:`);
        allConcerns.forEach((c) => lines.push(`    - "${c}"`));
      }
      if (allWantsMore.length > 0) {
        lines.push(`  must_include:`);
        allWantsMore.forEach((w) => lines.push(`    - "${w}"`));
      }
    }
  }

  return lines.join('\n');
}

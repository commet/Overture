import { getStorage, STORAGE_KEYS } from './storage';
import type { Project, DecomposeItem, OrchestrateItem, SynthesizeItem, FeedbackRecord } from '@/stores/types';

export function generatePromptChain(project: Project): string {
  const decompositions = getStorage<DecomposeItem[]>(STORAGE_KEYS.DECOMPOSE_LIST, [])
    .filter((d) => d.project_id === project.id && d.status === 'done');
  const orchestrations = getStorage<OrchestrateItem[]>(STORAGE_KEYS.ORCHESTRATE_LIST, [])
    .filter((o) => o.project_id === project.id);
  const feedbacks = getStorage<FeedbackRecord[]>(STORAGE_KEYS.FEEDBACK_HISTORY, [])
    .filter((f) => f.project_id === project.id);

  const sections: string[] = [];
  const actorLabels: Record<string, string> = { ai: '🤖 AI', human: '🧠 사람', both: '🤝 협업' };

  // Header
  sections.push(`# 프롬프트 체인: ${project.name}`);
  sections.push(`> Overture에서 생성 — ${new Date().toLocaleDateString('ko-KR')}`);
  sections.push(`> 아래 프롬프트를 순서대로 Claude 또는 ChatGPT에 입력하세요.`);
  sections.push('');

  // Extract constraints from persona feedback
  const constraints: string[] = [];
  if (feedbacks.length > 0) {
    const latest = feedbacks[feedbacks.length - 1];
    for (const result of latest.results) {
      for (const concern of (result.concerns || [])) {
        constraints.push(concern);
      }
      for (const q of (result.first_questions || [])) {
        constraints.push(`예상 질문 대비: ${q}`);
      }
    }
  }

  // Extract the real question from decompose
  let coreQuestion = '';
  let aiLimitations: string[] = [];
  if (decompositions.length > 0) {
    const latest = decompositions[decompositions.length - 1];
    if (latest.analysis) {
      coreQuestion = latest.selected_question || latest.analysis.surface_task;
      aiLimitations = latest.analysis.ai_limitations || [];
    }
  }

  // Generate prompts from orchestration steps
  if (orchestrations.length > 0) {
    const latest = orchestrations[orchestrations.length - 1];
    const steps = latest.steps.length > 0 ? latest.steps : latest.analysis?.steps || [];
    const totalSteps = steps.length;

    steps.forEach((step, i) => {
      const stepNum = i + 1;
      sections.push(`---`);
      sections.push('');

      if (step.checkpoint) {
        // Checkpoint step
        sections.push(`## ⚑ Checkpoint ${stepNum}/${totalSteps} — ${step.task} [${actorLabels[step.actor]}]`);
        sections.push('');
        sections.push('**이 시점에서 직접 확인하세요:**');
        sections.push('');
        if (step.checkpoint_reason) {
          sections.push(`- ${step.checkpoint_reason}`);
        }
        // Add relevant constraints as checklist
        const relevantConstraints = constraints.slice(0, 3);
        relevantConstraints.forEach((c) => {
          sections.push(`- [ ] ${c}`);
        });
        if (aiLimitations.length > 0) {
          sections.push('');
          sections.push('**AI가 못하는 부분 (직접 판단 필요):**');
          aiLimitations.forEach((l) => sections.push(`- ${l}`));
        }
      } else if (step.actor === 'human') {
        // Human-only step
        sections.push(`## 📋 Step ${stepNum}/${totalSteps} — ${step.task} [${actorLabels[step.actor]}]`);
        sections.push('');
        sections.push('**직접 수행하세요.**');
        if (step.actor_reasoning) {
          sections.push(`> 이유: ${step.actor_reasoning}`);
        }
        if (step.estimated_time) {
          sections.push(`> 예상 소요: ${step.estimated_time}`);
        }
      } else {
        // AI or collaboration step — generate prompt
        sections.push(`## 💬 Prompt ${stepNum}/${totalSteps} — ${step.task} [${actorLabels[step.actor]}]`);
        if (step.estimated_time) {
          sections.push(`> 예상 소요: ${step.estimated_time}`);
        }
        sections.push('');
        sections.push('```');

        // Build the actual prompt
        const promptParts: string[] = [];
        promptParts.push(`당신은 이 분야의 전문가입니다.`);
        promptParts.push('');
        promptParts.push(`## 과제`);
        promptParts.push(step.task);
        promptParts.push('');

        if (coreQuestion) {
          promptParts.push(`## 핵심 맥락`);
          promptParts.push(`이 작업의 근본 질문: "${coreQuestion}"`);
          promptParts.push('');
        }

        // Add constraints from persona feedback
        if (constraints.length > 0) {
          promptParts.push(`## 제약조건 (이해관계자 검증 결과)`);
          constraints.forEach((c) => promptParts.push(`- ${c}`));
          promptParts.push('');
        }

        if (step.actor_reasoning) {
          promptParts.push(`## 참고`);
          promptParts.push(step.actor_reasoning);
        }

        sections.push(promptParts.join('\n'));
        sections.push('```');
        sections.push('');
        sections.push('[복사하여 AI에 입력]');
      }
      sections.push('');
    });
  } else if (decompositions.length > 0) {
    // No orchestration — generate a simple prompt from decompose
    const latest = decompositions[decompositions.length - 1];
    if (latest.analysis) {
      const tasks = latest.final_decomposition.length > 0 ? latest.final_decomposition : latest.analysis.decomposition;
      tasks.forEach((task, i) => {
        sections.push(`---`);
        sections.push('');
        sections.push(`## 💬 Prompt ${i + 1}/${tasks.length} — ${task.task} [${actorLabels[task.actor]}]`);
        sections.push('');
        if (task.actor !== 'human') {
          sections.push('```');
          sections.push(`${task.task}\n\n핵심 맥락: "${coreQuestion}"\n\n${task.actor_reasoning}`);
          if (constraints.length > 0) {
            sections.push(`\n제약조건:\n${constraints.map(c => `- ${c}`).join('\n')}`);
          }
          sections.push('```');
        } else {
          sections.push('**직접 수행하세요.**');
          sections.push(`> ${task.actor_reasoning}`);
        }
        sections.push('');
      });
    }
  }

  sections.push('---');
  sections.push('*Generated by Overture — Think before you orchestrate*');

  return sections.join('\n');
}

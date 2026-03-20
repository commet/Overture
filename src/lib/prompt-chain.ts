import { getStorage, STORAGE_KEYS } from './storage';
import type { Project, DecomposeItem, OrchestrateItem, SynthesizeItem, FeedbackRecord, HiddenAssumption } from '@/stores/types';
import { buildDecomposeContext } from './context-chain';

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

  // Extract typed context from decompose (Phase 0 pipeline)
  let coreQuestion = '';
  let aiLimitations: string[] = [];
  let unverifiedAssumptions: HiddenAssumption[] = [];
  let whyReframingMatters = '';
  if (decompositions.length > 0) {
    const latest = decompositions[decompositions.length - 1];
    if (latest.analysis) {
      const ctx = buildDecomposeContext(latest);
      coreQuestion = ctx.selected_direction || ctx.reframed_question || latest.analysis.surface_task;
      aiLimitations = ctx.ai_limitations;
      unverifiedAssumptions = ctx.unverified_assumptions;
      whyReframingMatters = ctx.why_reframing_matters;
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

        // Context annotation: why this step exists
        if (step.checkpoint) {
          promptParts.push(`> 맥락: 이 단계는 핵심 가정을 검증하기 위한 체크포인트입니다.`);
        } else if (step.actor === 'both') {
          promptParts.push(`> 맥락: 이 단계는 AI와 사람의 협업이 필요합니다. ${step.actor_reasoning}`);
        }
        promptParts.push('');

        promptParts.push(`## 과제`);
        promptParts.push(step.task);
        promptParts.push('');

        if (coreQuestion) {
          promptParts.push(`## 핵심 맥락`);
          promptParts.push(`이 작업의 근본 질문: "${coreQuestion}"`);
          if (whyReframingMatters) {
            promptParts.push(`(${whyReframingMatters})`);
          }
          promptParts.push('');
        }

        // Unverified assumptions relevant to this step
        if (unverifiedAssumptions.length > 0) {
          const relevant = unverifiedAssumptions.filter(a =>
            step.task.toLowerCase().includes(a.assumption.substring(0, 10).toLowerCase()) ||
            step.expected_output?.toLowerCase().includes(a.assumption.substring(0, 10).toLowerCase())
          );
          const toShow = relevant.length > 0 ? relevant : unverifiedAssumptions.slice(0, 2);
          promptParts.push(`## 미확인 전제 (이 단계에서 검증 가능한지 확인)`);
          toShow.forEach((a) => {
            promptParts.push(`- ${a.assumption}${a.risk_if_false ? ` (만약 아니라면: ${a.risk_if_false})` : ''}`);
          });
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
    // No orchestration — generate a single exploration prompt from decompose
    const latest = decompositions[decompositions.length - 1];
    if (latest.analysis) {
      const reframedQ = latest.selected_question
        || latest.analysis.reframed_question
        || (latest.analysis as any).hypothesis
        || '';
      sections.push(`---`);
      sections.push('');
      sections.push(`## 💬 Prompt 1/1 — 재정의된 질문 탐색`);
      sections.push('');
      sections.push('```');
      const promptParts = [
        `다음 질문에 대해 분석해주세요:`,
        `"${reframedQ}"`,
        '',
        `핵심 맥락: "${coreQuestion}"`,
      ];
      if (latest.analysis.hidden_assumptions?.length > 0) {
        promptParts.push('');
        promptParts.push('검증이 필요한 전제:');
        latest.analysis.hidden_assumptions.forEach((a: any) => {
          if (typeof a === 'string') {
            promptParts.push(`- ${a}`);
          } else {
            promptParts.push(`- ${a.assumption}`);
          }
        });
      }
      if (constraints.length > 0) {
        promptParts.push(`\n제약조건:\n${constraints.map(c => `- ${c}`).join('\n')}`);
      }
      sections.push(promptParts.join('\n'));
      sections.push('```');
      sections.push('');
    }
  }

  sections.push('---');
  sections.push('*Generated by Overture — Think before you orchestrate*');

  return sections.join('\n');
}

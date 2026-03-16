import type { DecomposeItem, SynthesizeItem, OrchestrateItem } from '@/stores/types';

const actorLabels: Record<string, string> = {
  ai: '🤖 AI',
  human: '🧠 사람',
  both: '🤝 협업',
};

export function decomposeToMarkdown(item: DecomposeItem): string {
  const analysis = item.analysis;
  if (!analysis) return '';

  const subtasks = (item.final_decomposition.length > 0 ? item.final_decomposition : analysis.decomposition)
    .map((s, i) => `| ${i + 1} | ${actorLabels[s.actor]} | ${s.task} | ${s.actor_reasoning} |`)
    .join('\n');

  const selectedQ = item.selected_question || analysis.hidden_questions[0]?.question || '';

  return `## 과제 분해 시트

### 표면 과제
${analysis.surface_task}

### 재정의된 진짜 질문
${selectedQ}

### 역할 분배
| # | 담당 | 할 일 | 이유 |
|---|------|-------|------|
${subtasks}

### AI 한계
${analysis.ai_limitations.map((l) => `- ${l}`).join('\n')}`;
}

export function synthesizeToMarkdown(item: SynthesizeItem): string {
  const analysis = item.analysis;
  if (!analysis) return '';

  const sources = analysis.sources_summary
    .map((s) => `- **${s.name}**: ${s.core_claim}`)
    .join('\n');

  const agreements = analysis.agreements.map((a) => `- ${a}`).join('\n');

  const conflicts = analysis.conflicts
    .map((c) => {
      const judgment = c.user_judgment ? `\n  - **판단**: ${c.user_judgment}${c.user_reasoning ? ` (${c.user_reasoning})` : ''}` : '';
      return `- **${c.topic}**: ${c.side_a.source} vs ${c.side_b.source}\n  - ${c.side_a.position} vs ${c.side_b.position}${judgment}`;
    })
    .join('\n');

  return `## 산출물 합성 결과

### 소스별 핵심 주장
${sources}

### 합의점
${agreements}

### 쟁점 및 판단
${conflicts}

${item.final_synthesis ? `### 종합 결론\n${item.final_synthesis}` : ''}`;
}

export function orchestrateToMarkdown(item: OrchestrateItem): string {
  const steps = item.steps.length > 0 ? item.steps : item.analysis?.steps || [];

  const rows = steps
    .map((step, i) => {
      const cp = step.checkpoint ? `⚑ ${step.checkpoint_reason}` : '-';
      const time = step.estimated_time || '-';
      return `| ${i + 1} | ${actorLabels[step.actor]} | ${step.task} | ${time} | ${cp} |`;
    })
    .join('\n');

  const goal = item.analysis?.goal_summary || item.input_text;

  return `## 오케스트레이션 맵

**최종 목표**: ${goal}

| Step | 담당 | 할 일 | 예상 시간 | 체크포인트 |
|------|------|-------|----------|-----------|
${rows}

${item.analysis ? `**예상 총 소요시간**: ${item.analysis.total_estimated_time}\n**AI 비율**: ${item.analysis.ai_ratio}% | **사람 비율**: ${item.analysis.human_ratio}%` : ''}`;
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

import { getStorage, STORAGE_KEYS } from './storage';
import type { Project, DecomposeItem, OrchestrateItem, SynthesizeItem, FeedbackRecord, PersonaFeedbackResult, RefinementLoop, HiddenAssumption } from '@/stores/types';

export function generateProjectBrief(project: Project | null): string {
  if (!project) return '';
  const decompositions = getStorage<DecomposeItem[]>(STORAGE_KEYS.DECOMPOSE_LIST, [])
    .filter((d) => d.project_id === project.id && d.status === 'done');
  const orchestrations = getStorage<OrchestrateItem[]>(STORAGE_KEYS.ORCHESTRATE_LIST, [])
    .filter((o) => o.project_id === project.id);
  const syntheses = getStorage<SynthesizeItem[]>(STORAGE_KEYS.SYNTHESIZE_LIST, [])
    .filter((s) => s.project_id === project.id && s.status === 'done');
  const feedbacks = getStorage<FeedbackRecord[]>(STORAGE_KEYS.FEEDBACK_HISTORY, [])
    .filter((f) => f.project_id === project.id);

  const sections: string[] = [];

  const refinementLoops = getStorage<RefinementLoop[]>(STORAGE_KEYS.REFINEMENT_LOOPS, [])
    .filter((l) => l.project_id === project.id);

  // Header
  sections.push(`# ${project.name}`);
  sections.push(`> Overture Project Brief — ${new Date().toLocaleDateString('ko-KR')}`);
  sections.push('');

  // 0. Thought trajectory (사고의 궤적)
  if (decompositions.length > 0) {
    const latestD = decompositions[decompositions.length - 1];
    const latestO = orchestrations.length > 0 ? orchestrations[orchestrations.length - 1] : null;
    const latestL = refinementLoops.length > 0 ? refinementLoops[refinementLoops.length - 1] : null;

    sections.push('## 사고의 궤적');
    sections.push(`처음 주어진 과제: ${latestD.input_text}`);
    if (latestD.analysis) {
      sections.push(`재정의된 질문: **${latestD.selected_question || latestD.analysis.surface_task}**`);
      if (latestO?.analysis) {
        sections.push(`핵심 방향: ${latestO.analysis.governing_idea}`);
      }
      const hyp = latestD.analysis.reframed_question || latestD.analysis.hypothesis || '';
      sections.push(`이 방향은 "${hyp}"에서 출발, ${latestD.analysis.hidden_assumptions.length}건의 전제 점검 후 도출.`);
      if (feedbacks.length > 0) {
        const latestF = feedbacks[feedbacks.length - 1];
        const criticalCount = latestF.results.flatMap(r => (r.classified_risks || []).filter(cr => cr.category === 'critical')).length;
        const unspokenCount = latestF.results.flatMap(r => (r.classified_risks || []).filter(cr => cr.category === 'unspoken')).length;
        if (criticalCount > 0 || unspokenCount > 0) {
          sections.push(`리허설 주요 리스크: ${criticalCount > 0 ? `🔴 핵심 위협 ${criticalCount}건` : ''} ${unspokenCount > 0 ? `/ 🟣 침묵의 리스크 ${unspokenCount}건` : ''}`);
        }
      }
      if (latestL && latestL.iterations.length > 0) {
        const lastIter = latestL.iterations[latestL.iterations.length - 1];
        sections.push(`합주 결과: 핵심 위협 ${lastIter.convergence?.critical_risks ?? '?'}건 남음`);
      }
    }
    sections.push('');
  }

  // 1. Problem Definition (from decompose)
  if (decompositions.length > 0) {
    const latest = decompositions[decompositions.length - 1];
    sections.push('## 1. 악보 해석 | 문제 재정의');
    if (latest.analysis) {
      sections.push(`### 표면 과제`);
      sections.push(latest.analysis.surface_task);
      sections.push('');
      if (latest.selected_question) {
        sections.push(`### 재정의된 핵심 질문`);
        sections.push(`**${latest.selected_question}**`);
        sections.push('');
      }
      if (latest.analysis.why_reframing_matters) {
        sections.push(latest.analysis.why_reframing_matters);
        sections.push('');
      }
      if (latest.analysis.hidden_assumptions?.length > 0) {
        sections.push('### 검증 필요한 전제');
        latest.analysis.hidden_assumptions.forEach((a: HiddenAssumption | string) => {
          if (typeof a === 'string') {
            sections.push(`- ${a}`);
          } else {
            sections.push(`- ${a.assumption}${a.risk_if_false ? ` → 거짓이면: ${a.risk_if_false}` : ''}`);
          }
        });
        sections.push('');
      }
      if (latest.analysis.ai_limitations.length > 0) {
        sections.push('### AI 한계');
        latest.analysis.ai_limitations.forEach((l) => sections.push(`- ${l}`));
        sections.push('');
      }
    }
  }

  // 2. Workflow Design (from orchestrate)
  if (orchestrations.length > 0) {
    const latest = orchestrations[orchestrations.length - 1];
    sections.push('## 2. 편곡 | 실행 설계');
    if (latest.analysis) {
      sections.push(`**목표**: ${latest.analysis.goal_summary}`);
      sections.push(`**예상 소요시간**: ${latest.analysis.total_estimated_time}`);
      sections.push(`**AI 비율**: ${latest.analysis.ai_ratio}% | **사람 비율**: ${latest.analysis.human_ratio}%`);
      sections.push('');
      const actorLabels: Record<string, string> = { ai: '🤖 AI', human: '🧠 사람', both: '🤝 협업' };
      sections.push('| # | 담당 | 할 일 | 시간 | 체크포인트 |');
      sections.push('|---|------|-------|------|-----------|');
      const steps = latest.steps.length > 0 ? latest.steps : latest.analysis.steps;
      steps.forEach((s, i) => {
        const cp = s.checkpoint ? `⚑ ${s.checkpoint_reason}` : '-';
        sections.push(`| ${i + 1} | ${actorLabels[s.actor]} | ${s.task} | ${s.estimated_time || '-'} | ${cp} |`);
      });
      sections.push('');
    }
  }

  // 3. Synthesis / Judgments (from synthesize)
  if (syntheses.length > 0) {
    const latest = syntheses[syntheses.length - 1];
    sections.push('## 3. 조율 (판단 합성)');
    if (latest.analysis) {
      if (latest.analysis.agreements.length > 0) {
        sections.push('### 합의점');
        latest.analysis.agreements.forEach((a) => sections.push(`- ✓ ${a}`));
        sections.push('');
      }
      const judgedConflicts = latest.analysis.conflicts.filter((c) => c.user_judgment);
      if (judgedConflicts.length > 0) {
        sections.push('### 쟁점별 판단');
        judgedConflicts.forEach((c) => {
          sections.push(`**${c.topic}**`);
          sections.push(`- ${c.side_a.source}: ${c.side_a.position}`);
          sections.push(`- ${c.side_b.source}: ${c.side_b.position}`);
          sections.push(`- **내 판단**: ${c.user_judgment}${c.user_reasoning ? ` (${c.user_reasoning})` : ''}`);
          sections.push('');
        });
      }
    }
  }

  // 4. Stakeholder Validation (from persona feedback)
  if (feedbacks.length > 0) {
    const latest = feedbacks[feedbacks.length - 1];
    sections.push('## 4. 리허설 | 사전 검증');
    sections.push(`**대상 자료**: ${latest.document_title}`);
    sections.push(`**관점**: ${latest.feedback_perspective} | **강도**: ${latest.feedback_intensity}`);
    sections.push('');

    for (const result of latest.results) {
      const concerns = result.concerns || [];
      const praise = result.praise || [];
      const questions = result.first_questions || [];
      const wantsMore = result.wants_more || [];

      sections.push(`### ${result.overall_reaction ? result.overall_reaction : '리허설'}`);
      if (questions.length > 0) {
        sections.push('**예상 질문**');
        questions.forEach((q) => sections.push(`- ${q}`));
      }
      if (praise.length > 0) {
        sections.push('**긍정 포인트**');
        praise.forEach((p) => sections.push(`- ✓ ${p}`));
      }
      if (concerns.length > 0) {
        sections.push('**우려사항**');
        concerns.forEach((c) => sections.push(`- ⚠ ${c}`));
      }
      if (wantsMore.length > 0) {
        sections.push('**추가 요구**');
        wantsMore.forEach((w) => sections.push(`- ${w}`));
      }
      sections.push('');
    }

    if (latest.synthesis) {
      sections.push('### 종합 분석');
      sections.push(latest.synthesis);
      sections.push('');
    }
  }

  // Footer
  sections.push('---');
  sections.push(`*Generated by Overture — Think before you orchestrate*`);

  return sections.join('\n');
}

import { getStorage, STORAGE_KEYS } from './storage';
import type {
  Project, DecomposeItem, OrchestrateItem,
  FeedbackRecord, RefinementLoop, JudgmentRecord,
  Persona, HiddenAssumption,
} from '@/stores/types';

export function generateDecisionRationale(project: Project | null): string {
  if (!project) return '';
  const decompositions = getStorage<DecomposeItem[]>(STORAGE_KEYS.DECOMPOSE_LIST, [])
    .filter(d => d.project_id === project.id && d.status === 'done');
  const orchestrations = getStorage<OrchestrateItem[]>(STORAGE_KEYS.ORCHESTRATE_LIST, [])
    .filter(o => o.project_id === project.id);
  const feedbacks = getStorage<FeedbackRecord[]>(STORAGE_KEYS.FEEDBACK_HISTORY, [])
    .filter(f => f.project_id === project.id);
  const personas = getStorage<Persona[]>(STORAGE_KEYS.PERSONAS, []);
  const loops = getStorage<RefinementLoop[]>(STORAGE_KEYS.REFINEMENT_LOOPS, [])
    .filter(l => l.project_id === project.id);
  const judgments = getStorage<JudgmentRecord[]>(STORAGE_KEYS.JUDGMENTS, [])
    .filter(j => j.project_id === project.id);

  const d = decompositions[decompositions.length - 1];
  const o = orchestrations[orchestrations.length - 1];
  const fb = feedbacks[feedbacks.length - 1];
  const loop = loops[loops.length - 1];

  const s: string[] = [];

  s.push(`# 판단 근거서: ${project.name}`);
  s.push(`> 생성일 ${new Date().toLocaleDateString('ko-KR')} — 이 문서는 각 단계에서 *왜 이렇게 판단했는가*를 기록합니다.`);
  s.push('');

  // ── Executive Summary ──
  {
    const parts: string[] = [];
    if (d?.analysis) {
      parts.push(`원래 과제는 "${d.analysis.surface_task}"였으나, 전제 점검 결과 "${d.selected_question || d.analysis.reframed_question}"로 질문을 재정의했습니다.`);
    }
    if (o?.analysis) {
      parts.push(`${o.steps?.length || 0}단계 워크플로우를 설계했으며, 핵심 방향은 "${o.analysis.governing_idea}"입니다.`);
    }
    if (fb) {
      const critical = fb.results.flatMap(r => r.classified_risks?.filter(cr => cr.category === 'critical') || []);
      const unspoken = fb.results.flatMap(r => r.classified_risks?.filter(cr => cr.category === 'unspoken') || []);
      if (critical.length || unspoken.length) {
        parts.push(`이해관계자 검증에서 핵심 위협 ${critical.length}건, 침묵의 리스크 ${unspoken.length}건을 발견했습니다.`);
      }
    }
    if (loop) {
      const lastIter = loop.iterations[loop.iterations.length - 1];
      parts.push(`${loop.iterations.length}회 반복 끝에 핵심 위협 ${lastIter?.convergence?.critical_risks ?? '?'}건이 남았습니다.`);
    }
    if (parts.length > 0) {
      s.push('## 요약');
      s.push('');
      s.push(parts.join(' '));
      s.push('');
    }
  }

  // ── 1. 과제 재정의 ──
  if (d?.analysis) {
    const a = d.analysis;
    s.push('## 1. 과제 재정의');
    s.push('');
    s.push(`**원래 과제**: ${a.surface_task}`);
    s.push('');

    if (a.hidden_assumptions?.length) {
      s.push('**전제 점검 결과**:');
      for (const ha of a.hidden_assumptions) {
        if (typeof ha === 'string') {
          s.push(`- "${ha}"`);
        } else {
          const evalLabel = ha.evaluation === 'likely_true' ? '✅ 확인'
            : ha.evaluation === 'doubtful' ? '❌ 의심'
            : ha.evaluation === 'uncertain' ? '❓ 불확실'
            : '⬜ 미평가';
          s.push(`- [${evalLabel}] "${ha.assumption}"${ha.risk_if_false ? ` → 거짓이면: ${ha.risk_if_false}` : ''}`);
        }
      }
      s.push('');
    }

    s.push(`**재정의된 질문**: ${d.selected_question || a.reframed_question}`);
    if (a.why_reframing_matters) {
      s.push(`**왜 재정의했는가**: ${a.why_reframing_matters}`);
    }
    s.push('');

    // 선택하지 않은 대안
    if (a.hidden_questions?.length > 1) {
      const selected = d.selected_question;
      const alts = a.hidden_questions.filter(hq => hq.question !== selected);
      if (alts.length) {
        s.push('**검토했으나 선택하지 않은 방향**:');
        for (const alt of alts) {
          s.push(`- ${alt.question} (택하면: ${alt.reasoning})`);
        }
        s.push('');
      }
    }

    if (a.ai_limitations?.length) {
      s.push(`**AI 한계**: ${a.ai_limitations.join(' / ')}`);
      s.push('');
    }
  }

  // ── 2. 실행 설계 ──
  if (o?.analysis) {
    const a = o.analysis;
    s.push('## 2. 실행 설계 근거');
    s.push('');
    s.push(`**핵심 방향**: ${a.governing_idea}`);
    s.push('');

    if (a.storyline) {
      s.push('**논리 구조**:');
      s.push(`- 상황: ${a.storyline.situation}`);
      s.push(`- 문제: ${a.storyline.complication}`);
      s.push(`- 접근: ${a.storyline.resolution}`);
      s.push('');
    }

    if (o.steps?.length) {
      const actor = (a: string) => a === 'ai' ? 'AI' : a === 'human' ? '사람' : '협업';
      s.push(`**워크플로우** (${o.steps.length}단계):`);
      o.steps.forEach((step, i) => {
        s.push(`${i + 1}. [${actor(step.actor)}] ${step.task} → ${step.expected_output}${step.checkpoint ? ' ⚑' : ''}`);
        if (step.checkpoint && step.checkpoint_reason) {
          s.push(`   체크포인트: ${step.checkpoint_reason}`);
        }
        if (step.judgment) {
          s.push(`   판단 포인트: ${step.judgment}`);
        }
      });
      s.push('');
    }

    if (a.design_rationale) {
      s.push(`**이 설계의 근거**: ${a.design_rationale}`);
      s.push('');
    }

    if (a.key_assumptions?.length) {
      s.push('**핵심 가정**:');
      for (const ka of a.key_assumptions) {
        const imp = ka.importance === 'high' ? '🔴' : '🟡';
        s.push(`- ${imp} ${ka.assumption} (확신도: ${ka.certainty === 'high' ? '높음' : ka.certainty === 'medium' ? '중간' : '낮음'})`);
        if (ka.if_wrong) s.push(`  틀리면 → ${ka.if_wrong}`);
      }
      s.push('');
    }
  }

  // ── 3. 이해관계자 검증 ──
  if (fb) {
    s.push('## 3. 이해관계자 검증');
    s.push('');

    for (const result of fb.results) {
      const persona = personas.find(p => p.id === result.persona_id);
      const name = persona?.name || '이해관계자';
      const influence = persona?.influence === 'high' ? ' (영향력 높음)' : '';
      s.push(`### ${name}${influence}`);
      s.push('');
      s.push(`**반응**: "${result.overall_reaction}"`);
      s.push('');

      if (result.failure_scenario) {
        s.push(`**실패 시나리오**: ${result.failure_scenario}`);
        s.push('');
      }

      if (result.classified_risks?.length) {
        s.push('**리스크 분류**:');
        for (const risk of result.classified_risks) {
          const icon = risk.category === 'critical' ? '🔴 핵심 위협' : risk.category === 'manageable' ? '🟡 관리 가능' : '🟣 침묵의 리스크';
          s.push(`- ${icon}: ${risk.text}`);
        }
        s.push('');
      }

      if (result.approval_conditions?.length) {
        s.push('**승인 조건**:');
        for (const c of result.approval_conditions) s.push(`- [ ] ${c}`);
        s.push('');
      }
    }

    if (fb.synthesis) {
      s.push(`**종합**: ${fb.synthesis}`);
      s.push('');
    }
  }

  // ── 4. 수렴 과정 ──
  if (loop) {
    s.push('## 4. 반복과 수렴');
    s.push('');
    const lastIter = loop.iterations[loop.iterations.length - 1];
    s.push(`**${loop.iterations.length}회 반복**, 핵심 위협 ${lastIter?.convergence?.critical_risks ?? '?'}건 남음`);
    s.push('');

    for (const iter of loop.iterations) {
      const summary = iter.changes?.map(c => c.what).join(', ') || '수정 사항 없음';
      s.push(`- ${iter.iteration_number}차 (위협 ${iter.convergence?.critical_risks ?? '?'}): ${summary}`);
    }
    s.push('');
  }

  // ── 5. 판단 이력 ──
  if (judgments.length > 0) {
    const overrides = judgments.filter(j => j.user_changed);
    s.push('## 5. 판단 이력');
    s.push('');
    s.push(`총 ${judgments.length}건의 판단 기록, AI 제안 수정 ${overrides.length}건`);
    s.push('');

    if (overrides.length > 0) {
      for (const j of overrides.slice(0, 8)) {
        const typeLabel = j.type === 'actor_override' ? '역할 변경' : j.type === 'hidden_question_selection' ? '질문 선택' : j.type;
        s.push(`- [${typeLabel}] ${j.context} → ${j.decision}`);
      }
      if (overrides.length > 8) s.push(`- ... 외 ${overrides.length - 8}건`);
      s.push('');
    }
  }

  // ── 6. 성찰 ──
  if (project.meta_reflection) {
    const mr = project.meta_reflection;
    s.push('## 6. 성찰');
    s.push('');
    if (mr.understanding_change) s.push(`**이해의 변화**: ${mr.understanding_change}`);
    if (mr.surprising_discovery) s.push(`**놀라운 발견**: ${mr.surprising_discovery}`);
    if (mr.next_time_differently) s.push(`**다음엔 다르게**: ${mr.next_time_differently}`);
    s.push('');
  }

  s.push('---');
  s.push('*Overture 판단 근거서 — 각 단계의 판단 이유와 맥락을 기록합니다.*');

  return s.join('\n');
}

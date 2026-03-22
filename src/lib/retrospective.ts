/**
 * Retrospective Question Generator — Concertmaster's Journal
 *
 * Generates data-driven reflection questions when a project converges.
 * Questions are based on actual signals, not generic prompts.
 * User answers become learning data; unanswered is fine (implicit signals suffice).
 */

import { getSignals } from './signal-recorder';
import type {
  RefinementLoop,
  FeedbackRecord,
  RetrospectiveQuestion,
  QualitySignal,
} from '@/stores/types';
import { generateId } from './uuid';

/**
 * Generate 2-4 retrospective questions based on accumulated project data.
 */
export function generateRetrospectiveQuestions(
  loop: RefinementLoop,
  feedbackRecords: FeedbackRecord[],
): RetrospectiveQuestion[] {
  const questions: RetrospectiveQuestion[] = [];
  const projectId = loop.project_id;
  const projectSignals = getSignals({ project_id: projectId });

  // 1. Convergence speed insight
  const iterCount = loop.iterations.length;
  if (iterCount === 1) {
    questions.push({
      id: generateId(),
      category: 'process',
      question: '1회 만에 수렴했습니다. 초기 설계가 정확했던 건가요, 아니면 검증이 충분하지 않았을 수 있나요?',
      data_basis: `수렴 반복: ${iterCount}회`,
    });
  } else if (iterCount >= 4) {
    questions.push({
      id: generateId(),
      category: 'process',
      question: `수렴까지 ${iterCount}회 반복이 필요했습니다. 가장 해결하기 어려웠던 이슈는 무엇이었나요? 더 빨리 발견할 수 있었을까요?`,
      data_basis: `수렴 반복: ${iterCount}회 (평균보다 많음)`,
    });
  }

  // 2. Actor override insight
  const overrideSignals = projectSignals.filter(s => s.signal_type === 'actor_override_direction');
  if (overrideSignals.length >= 2) {
    const aiToHuman = overrideSignals.filter(s => s.signal_data.from_actor === 'ai').length;
    if (aiToHuman >= 2) {
      const tasks = overrideSignals
        .filter(s => s.signal_data.from_actor === 'ai')
        .map(s => s.signal_data.step_task)
        .slice(0, 2);
      questions.push({
        id: generateId(),
        category: 'judgment',
        question: `AI에게 맡기려던 작업 ${aiToHuman}건을 직접 하기로 바꿨습니다. 어떤 판단이 있었나요?`,
        data_basis: `오버라이드된 작업: ${tasks.join(', ')}`,
      });
    }
  }

  // 3. Step structural changes
  const structuralSignals = projectSignals.filter(s => s.signal_type === 'step_structural_change');
  if (structuralSignals.length >= 1) {
    const deletes = structuralSignals.filter(s => s.signal_data.action === 'delete').length;
    const adds = structuralSignals.filter(s => s.signal_data.action === 'add').length;
    if (deletes + adds >= 2) {
      questions.push({
        id: generateId(),
        category: 'process',
        question: `실행 계획의 구조를 크게 수정했습니다 (추가 ${adds}건, 삭제 ${deletes}건). AI의 초기 설계에서 부족했던 점은 무엇인가요?`,
        data_basis: `스텝 구조 변경: +${adds} -${deletes}`,
      });
    }
  }

  // 4. Assumption diversity insight
  const assumptionSignals = projectSignals.filter(s => s.signal_type === 'assumption_diversity');
  if (assumptionSignals.length > 0) {
    const latest = assumptionSignals[assumptionSignals.length - 1];
    const { doubtful = 0, total = 0 } = latest.signal_data as Record<string, number>;
    if (doubtful > 0 && total > 0) {
      questions.push({
        id: generateId(),
        category: 'learning',
        question: `전제 ${total}건 중 ${doubtful}건을 의심했습니다. 의심했던 전제가 실제로 문제가 되었나요? 아니면 기우였나요?`,
        data_basis: `의심된 전제: ${doubtful}/${total}건`,
      });
    }
  }

  // 5. Persona feedback insight (from FeedbackRecord)
  const projectFeedback = feedbackRecords.filter(f => f.project_id === projectId);
  if (projectFeedback.length > 0) {
    const allRisks = projectFeedback.flatMap(f =>
      f.results.flatMap(r => (r.classified_risks || []).filter(risk => risk.category === 'unspoken'))
    );
    if (allRisks.length > 0) {
      questions.push({
        id: generateId(),
        category: 'learning',
        question: '리허설에서 "침묵의 리스크"가 발견되었습니다. 실제로 이 리스크가 프로젝트에 영향을 미쳤나요?',
        data_basis: `침묵의 리스크 ${allRisks.length}건 발견`,
      });
    }
  }

  // Return top 3-4, prioritizing diversity across categories
  return deduplicateByCategory(questions).slice(0, 4);
}

function deduplicateByCategory(questions: RetrospectiveQuestion[]): RetrospectiveQuestion[] {
  const seen = new Set<string>();
  const result: RetrospectiveQuestion[] = [];
  // First pass: one per category
  for (const q of questions) {
    if (!seen.has(q.category)) {
      result.push(q);
      seen.add(q.category);
    }
  }
  // Second pass: fill remaining
  for (const q of questions) {
    if (!result.includes(q)) {
      result.push(q);
    }
  }
  return result;
}

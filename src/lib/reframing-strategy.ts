/**
 * Reframing Strategy Selection — Phase 1
 *
 * 인터뷰 신호 조합에 따라 리프레이밍 전략을 선택하고,
 * 전략별로 시스템 프롬프트를 조정한다.
 *
 * 같은 과제라도 사용자의 불확실성 유형과 맥락에 따라
 * 완전히 다른 리프레이밍이 필요하다.
 */

export type ReframingStrategy =
  | 'challenge_existence'  // 과제 존재 자체를 의심
  | 'narrow_scope'         // 범위를 좁혀서 실행 가능하게
  | 'diagnose_root'        // 근본 원인 진단 먼저
  | 'redirect_angle';      // 완전히 다른 각도에서 보기

export interface InterviewSignals {
  origin?: 'top-down' | 'external' | 'self' | 'fire';
  uncertainty?: 'why' | 'what' | 'how' | 'none';
  success?: 'measurable' | 'risk' | 'opportunity' | 'unclear';
}

/* ────────────────────────────────────
   Strategy Selection Matrix
   ──────────────────────────────────── */

export function selectReframingStrategy(signals: InterviewSignals): ReframingStrategy {
  const { origin, uncertainty, success } = signals;

  // 가장 강한 시그널: 왜 해야 하는지 모름 + 성공 기준 불명확
  // → 과제 존재 자체를 의심해야 함
  if (uncertainty === 'why' && success === 'unclear') return 'challenge_existence';
  if (uncertainty === 'why' && origin === 'top-down') return 'challenge_existence';

  // 갑자기 터진 문제 → 근본 원인 진단
  if (origin === 'fire') return 'diagnose_root';
  if (uncertainty === 'what' && success === 'risk') return 'diagnose_root';

  // 어떻게 해야 하는지 모름 + 성과가 측정 가능 → 범위를 좁히면 됨
  if (uncertainty === 'how') return 'narrow_scope';
  if (uncertainty === 'none') return 'narrow_scope';
  if (origin === 'self' && success === 'measurable') return 'narrow_scope';

  // 그 외: 다른 각도에서 보기
  return 'redirect_angle';
}

/* ────────────────────────────────────
   Strategy-specific Prompt Modifiers
   ──────────────────────────────────── */

const STRATEGY_PROMPTS: Record<ReframingStrategy, string> = {
  challenge_existence: `[리프레이밍 전략: 과제 존재 의심]
사용자는 이 과제를 왜 해야 하는지 불확실해합니다.
- 이 과제가 정말 필요한지, 대안적 접근이 있는지 적극적으로 탐색하세요.
- "이 과제를 안 하면 어떻게 되는가?"를 먼저 물어보세요.
- hidden_questions에서 "이 과제의 전제 자체를 의심하는 방향"을 반드시 포함하세요.
- reframed_question은 "~를 해야 하는가?" 형태의 존재론적 질문도 괜찮습니다.`,

  narrow_scope: `[리프레이밍 전략: 범위 집중]
사용자는 방향은 알지만 범위가 넓어서 실행이 막혀 있습니다.
- 과제를 더 작고 실행 가능한 단위로 좁히는 데 집중하세요.
- "가장 먼저 검증해야 할 한 가지"를 찾아주세요.
- hidden_questions에서 "가장 작은 의미 있는 첫 단계"를 반드시 포함하세요.
- reframed_question은 구체적이고 답할 수 있는 형태여야 합니다.`,

  diagnose_root: `[리프레이밍 전략: 근본 원인 진단]
사용자는 급한 문제에 대응하고 있지만, 표면 증상에 매몰될 위험이 있습니다.
- "왜 이 문제가 지금 나타났는가?"를 파고드세요.
- 즉각적 대응과 근본적 해결을 구분해주세요.
- hidden_questions에서 "증상이 아닌 원인을 다루는 방향"을 반드시 포함하세요.
- hidden_assumptions에서 "이 문제의 원인에 대한 암묵적 가정"을 찾으세요.`,

  redirect_angle: `[리프레이밍 전략: 관점 전환]
이 과제를 완전히 다른 각도에서 바라봐야 합니다.
- 같은 상황을 다른 이해관계자의 시점에서 재정의해보세요.
- "만약 이 과제가 다른 부서에서 나왔다면?" 을 생각해보세요.
- hidden_questions에서 각각 서로 다른 관점(기술/비즈니스/사용자)을 대표하게 하세요.
- reframed_question은 원래 과제와 표면적으로 달라 보이지만 본질적으로 연결되어야 합니다.`,
};

/**
 * 기본 시스템 프롬프트에 전략별 지시를 추가한다.
 */
export function applyReframingStrategy(
  basePrompt: string,
  strategy: ReframingStrategy
): string {
  return `${basePrompt}\n\n${STRATEGY_PROMPTS[strategy]}`;
}

/* ────────────────────────────────────
   Strategy metadata (for UI display)
   ──────────────────────────────────── */

export const STRATEGY_LABELS: Record<ReframingStrategy, { label: string; description: string }> = {
  challenge_existence: {
    label: '존재 의심',
    description: '이 과제를 정말 해야 하는지부터 따져봅니다',
  },
  narrow_scope: {
    label: '범위 집중',
    description: '실행 가능한 크기로 좁혀서 시작점을 찾습니다',
  },
  diagnose_root: {
    label: '원인 진단',
    description: '표면 증상이 아닌 근본 원인을 먼저 찾습니다',
  },
  redirect_angle: {
    label: '관점 전환',
    description: '완전히 다른 각도에서 같은 상황을 바라봅니다',
  },
};

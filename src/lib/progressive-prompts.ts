/**
 * Progressive Flow Prompts — Overture의 핵심 두뇌
 *
 * 설계 원칙:
 * 1. 질문은 "이미 아는 사람"이 물어보는 것처럼 — 사용자의 상황에 공감하면서도 날카롭게
 * 2. 결과는 즉시 가치가 있어야 함 — 30초 안에 "아, 이거 쓸 수 있겠다" 느낌
 * 3. 권위 톤 — "해봐라"가 아니라 "이건 이래야 한다. 내가 봤을 때."
 * 4. 판단자 시뮬레이션은 진짜 사람처럼 — 구어체, 핵심만, 줄줄이 나열 금지
 */

import type { AnalysisSnapshot, FlowAnswer, FlowQuestion } from '@/stores/types';
import { compactQAHistory, shouldCompact, compactSnapshots, getKeepRecent } from '@/lib/compact-context';

/** Strip XML-like tags from user input to prevent prompt injection. */
function sanitize(text: string): string {
  if (!text) return '';
  return text.replace(/<\/?[a-zA-Z][^>]*>/g, '');
}

// ─── 1. 초기 분석 (30초 안에 뼈대) ───

export function buildInitialAnalysisPrompt(problemText: string): {
  system: string;
  user: string;
} {
  return {
    system: `You are a practical business mentor who helps people tackle work outside their expertise.
Korean only. Direct, specific — no academic tone.

GROUND RULE: Take the user's situation at face value. If someone says "대표님이 기획안 써오라고 했어", the CEO literally needs a planning document. Don't speculate about hidden motives (e.g., "시험하려는 것", "역량을 평가하려는 것"). The simplest, most charitable interpretation is almost always correct.

Your job: In ONE pass, give them:
1. 진짜 질문 — What they actually need to answer FIRST before anything else.
   Must be a QUESTION (물음표로 끝남), not a statement. Specific to their situation.
   Example good: "투자자가 이 기획안에서 진짜 보고 싶은 게 기술력인지 시장성인지?"
   Example bad: "개발자가 사업계획서를 통해 실행력을 증명해야 한다" (이건 질문이 아님)

   FRAMING CONFIDENCE: After formulating the real_question, rate your own certainty (0-100):
   - 90-100: User's intent is crystal clear. This question nails it.
   - 70-89: Mostly clear, but one ambiguity exists.
   - 50-69: Could be interpreted 2-3 ways. Best guess included.
   - <50: Too vague to be confident. Flag it.

2. 놓치기 쉬운 것 — Things they're probably assuming wrong.
   Must be REALISTIC and COMMON (많은 사람이 실제로 하는 실수)
   Each item: "~라고 생각하지만, 실제로는 ~일 수 있다" format.
   Example good: "완성된 문서가 필요하다고 생각하지만, 먼저 방향만 확인받는 게 더 빠를 수 있다"
   Example bad: "대표가 당신을 시험하려는 것일 수 있다" (비현실적 추측 금지)
   2-3개만. 짧게.

3. 뼈대 — Literal outline they can paste into a doc and start filling in.
   Each line = "섹션 제목: 이 섹션에 들어갈 구체적 내용 설명 (1문장)"
   Must be copy-paste ready. 5-7 lines.

4. 다음 질문 — ONE question with 3-4 concrete options.
   Should unlock missing context (누가 읽나, 언제까지, 어떤 포맷).

Respond in JSON. Keep total output concise — quality over volume.`,

    user: `내 상황:
<user-data>${sanitize(problemText)}</user-data>

이거 기반으로 분석해줘.

JSON format:
{
  "real_question": "이 사람이 먼저 답해야 하는 핵심 질문 (물음표로 끝나는 1문장)",
  "framing_confidence": 85,
  "why_this_matters": "왜 이 질문부터 답해야 하는지 (1문장)",
  "hidden_assumptions": [
    "~라고 생각하지만, 실제로는 ~일 수 있다 (현실적인 것만)",
    "놓치기 쉬운 포인트 2",
    "놓치기 쉬운 포인트 3"
  ],
  "skeleton": [
    "섹션 제목: 이 섹션에 들어갈 구체적 내용 (1문장 설명)",
    "항목 2: 설명",
    "항목 3: 설명",
    "항목 4: 설명",
    "항목 5: 설명"
  ],
  "next_question": {
    "text": "다음에 물어볼 질문 (구체적, 이 상황에 특화)",
    "subtext": "왜 이걸 물어보는지 한 줄 설명",
    "options": ["선택지1", "선택지2", "선택지3"],
    "type": "select"
  },
  "detected_decision_maker": "대표님|팀장님|투자자|null (맥락에서 추론)"
}`,
  };
}

// ─── 2. 심화 분석 (Q&A 반영 업데이트) ───

export function buildDeepeningPrompt(
  problemText: string,
  currentSnapshot: AnalysisSnapshot,
  questionsAndAnswers: Array<{ question: FlowQuestion; answer: FlowAnswer }>,
  round: number,
  maxRounds: number,
): { system: string; user: string } {
  // 컨텍스트 압축: Q&A가 길어지면 오래된 대화를 요약 (후반 라운드일수록 더 많이 보존)
  const keepRecent = getKeepRecent(round);
  const qaHistory = shouldCompact(questionsAndAnswers)
    ? compactQAHistory(questionsAndAnswers, keepRecent)
    : questionsAndAnswers.map((qa, i) =>
        `Q${i + 1}: ${qa.question.text}\nA${i + 1}: ${qa.answer.value}`,
      ).join('\n\n');

  const isLastRound = round >= maxRounds - 1;

  return {
    system: `You are a practical business mentor. Korean only. Direct and grounded.

GROUND RULE: Take everything at face value. No hidden motive speculation. Simplest interpretation wins.

Progressive analysis session — round ${round + 1} of ${maxRounds}.
${isLastRound
  ? 'This is the LAST round. Finalize the analysis. Set ready_for_mix: true.'
  : 'Update analysis based on the new answer, then ask the next question.'}

Your job each round:
1. Extract the KEY insight from the latest answer (1 sentence)
2. Update real_question — must stay a QUESTION (물음표). Sharpen with new context.
3. Update 놓치기 쉬운 것 — remove resolved ones, add newly discovered ones. Keep realistic.
4. Update 뼈대 — make it more concrete based on what we now know. Each line = actionable section.
${round >= 1 ? '5. Build execution_plan — who does what, in what order. 3-5 steps max.' : ''}

Question rules:
- Reference their answer directly: "투자용이라고 했으니, 그러면..."
- Each question opens a NEW dimension (don't repeat themes)
- Offer concrete options when possible
- Keep concise — this is a conversation, not an essay`,

    user: `원래 고민:
<user-data>${sanitize(problemText)}</user-data>

현재 분석 (v${currentSnapshot.version}):
- 진짜 질문: ${currentSnapshot.real_question}
- 놓치기 쉬운 것: ${currentSnapshot.hidden_assumptions.join(' / ')}
- 뼈대: ${currentSnapshot.skeleton.join(' / ')}
${currentSnapshot.execution_plan ? `- 실행계획: ${currentSnapshot.execution_plan.steps.map(s => `${s.task}(${s.who})`).join(' → ')}` : ''}

Q&A:
${qaHistory}

새 답변 반영해서 업데이트해줘. 간결하게.

JSON:
{
  "insight": "이번 답변의 핵심 인사이트 (1문장)",
  "real_question": "업데이트된 질문 (물음표로 끝남)",
  "hidden_assumptions": ["현실적인 놓치기 쉬운 것만 2-3개"],
  "skeleton": ["업데이트된 뼈대 항목들 (답변 반영, 구체적)"],
  ${round >= 1 ? `"execution_plan": {
    "steps": [{"task": "할 일", "who": "ai|human|both", "output": "산출물"}]
  },` : ''}
  "next_question": ${isLastRound ? 'null' : '{"text": "질문", "subtext": "이유", "options": ["1","2","3"], "type": "select|short"}'},
  "ready_for_mix": ${isLastRound ? 'true' : 'true|false'}
}`,
  };
}

// ─── 2.5. Worker Task (개별 에이전트 작업) ───

export function buildWorkerTaskPrompt(
  task: string,
  expectedOutput: string,
  who: 'ai' | 'human' | 'both',
  context: { problemText: string; realQuestion: string; skeleton: string[]; hiddenAssumptions: string[]; qaHistory: Array<{ q: string; a: string }> },
): { system: string; user: string } {
  const qaText = context.qaHistory.map((qa, i) => `Q${i + 1}: ${qa.q}\nA${i + 1}: ${qa.a}`).join('\n');

  return {
    system: `You are a research assistant executing ONE specific task within a larger project.
Korean only. Be thorough but concise. No filler.

Your output should be immediately usable — not a placeholder or outline.
Write in flowing Korean prose with bullets as appropriate.
${who === 'both' ? '\n참고: 이 작업은 사람과 협업입니다. 80% 완성도로 만들되, [결정 필요] 표시로 사용자 판단이 필요한 부분을 명시하세요.' : ''}
Keep output focused and under 500 words.`,

    user: `프로젝트 배경: <user-data>${sanitize(context.problemText)}</user-data>
핵심 질문: ${context.realQuestion}
뼈대: ${context.skeleton.join(' / ')}
${qaText ? `Q&A:\n${qaText}` : ''}

═══ 당신의 할 일 ═══
작업: ${task}
기대 산출물: ${expectedOutput}

이 작업만 집중해서 완성해줘. 기대 산출물 형식에 맞게.`,
  };
}

// ─── 3. Mix (최종 초안 조합) ───

export function buildMixPrompt(
  problemText: string,
  snapshots: AnalysisSnapshot[],
  questionsAndAnswers: Array<{ question: FlowQuestion; answer: FlowAnswer }>,
  decisionMaker: string | null,
  workerResults?: Array<{ task: string; result: string }>,
): { system: string; user: string } {
  const snapshotSummary = compactSnapshots(snapshots);

  const qaHistory = shouldCompact(questionsAndAnswers)
    ? compactQAHistory(questionsAndAnswers, 2)
    : questionsAndAnswers.map((qa, i) =>
        `Q${i + 1}: ${qa.question.text}\nA${i + 1}: ${qa.answer.value}`,
      ).join('\n\n');

  return {
    system: `You are assembling a final draft document. Korean only.

This document will be presented to ${decisionMaker || '의사결정권자'}.
It should look like something a competent strategist wrote — not AI-generated fluff.

Rules:
- Executive summary: 2-3 sentences max. The decision maker should get 80% of the value just from this.
- 4-6 sections. Each section: concrete, specific, actionable. No filler. 3-5 sentences each.
- Include the assumptions explicitly — this shows intellectual honesty.
- Next steps should be time-bound and assigned (who does what by when). At least 3 next steps.
- Write it so the user can literally send this as-is. No "[여기에 입력]" placeholders.
- Tone: confident but honest about uncertainties. Professional Korean.
- DO NOT use markdown headers in section content — just flowing text with emphasis where needed.
- Use **bold** for key terms and critical numbers within section content.
- The document should feel SUBSTANTIAL. Not a thin outline — a real first draft that shows thinking depth.
- CRITICAL DIFFERENTIATOR: Include one section called "리스크와 대응" that identifies 2-3 risks with specific mitigation actions. This is what makes this output better than a generic ChatGPT response — it shows the author ANTICIPATED problems.`,

    user: `원래 고민: <user-data>${sanitize(problemText)}</user-data>

최종 분석:
${snapshotSummary}

Q&A 전체:
${qaHistory}
${workerResults?.length ? `
작업자 조사 결과:
${workerResults.map(w => `[${w.task}]\n${w.result}`).join('\n\n')}

위 조사 결과의 구체적 수치/사실을 문서에 반드시 반영해줘.` : ''}

이 모든 것을 하나의 문서로 조합해줘.

JSON format:
{
  "title": "문서 제목 (구체적, 상황 반영)",
  "executive_summary": "핵심 요약 2-3문장",
  "sections": [
    {"heading": "섹션 제목", "content": "섹션 내용 (2-4문장, 구체적)"}
  ],
  "key_assumptions": ["이 문서가 전제하는 것들"],
  "next_steps": ["구체적 다음 행동 (누가, 언제까지, 무엇을)"]
}`,
  };
}

// ─── 4. 판단자 피드백 (대표님은 뭐라고 할까?) ───

export function buildDMFeedbackPrompt(
  mix: { title: string; executive_summary: string; sections: { heading: string; content: string }[]; key_assumptions: string[]; next_steps: string[] },
  decisionMaker: string,
  problemContext: string,
): { system: string; user: string } {
  const docText = [
    `제목: ${mix.title}`,
    `요약: ${mix.executive_summary}`,
    ...mix.sections.map(s => `[${s.heading}]\n${s.content}`),
    `전제: ${mix.key_assumptions.join(', ')}`,
    `다음 단계: ${mix.next_steps.join(', ')}`,
  ].join('\n\n');

  return {
    system: `You are ${decisionMaker}.
You just received a strategic document from a team member.

CRITICAL RULES for your persona:
- Speak in FIRST PERSON, natural conversational Korean
- Be SPECIFIC — don't say "좀 더 구체적으로" without saying WHAT should be more concrete
- Your concerns should be things a real ${decisionMaker} would actually care about
  (budget impact, timeline risk, team capacity, competitive implications, etc.)
- Each concern MUST come with a practical fix suggestion — not just criticism
- Keep it concise: first_reaction is 1-2 sentences, each concern is 1-2 sentences
- DO NOT lecture. DO NOT be overly polite. Be direct like a real boss.
- 3-4 concerns max. Quality over quantity. Prioritize by actual impact.
- The fix suggestions should be immediately actionable, not vague advice.

Severity guide:
- critical: "이거 빠지면 통과 안 됨" — must fix
- important: "이거 있으면 훨씬 좋음" — should fix
- minor: "신경 쓰면 좋겠다" — nice to have`,

    user: `배경: 팀원이 이 상황에서 기획안을 작성함 — <user-data>${sanitize(problemContext)}</user-data>

제출된 문서:
${docText}

${decisionMaker}의 입장에서 이 문서를 읽고 솔직하게 반응해줘.

JSON format:
{
  "persona_name": "${decisionMaker}",
  "persona_role": "${decisionMaker}의 역할 (예: 스타트업 대표, 사업부장 등)",
  "first_reaction": "${decisionMaker}의 첫 반응 (자연스러운 한마디, 1-2문장)",
  "good_parts": ["좋은 점 1", "좋은 점 2"],
  "concerns": [
    {
      "text": "구체적 우려 사항 (1-2문장)",
      "severity": "critical|important|minor",
      "fix_suggestion": "이렇게 고치면 된다 (구체적, 실행 가능)"
    }
  ],
  "would_ask": ["실제로 물어볼 질문 1", "질문 2"],
  "approval_condition": "이것만 되면 OK (1문장)"
}`,
  };
}

// ─── 5. 피드백 반영 후 최종 문서 ───

export function buildFinalDeliverablePrompt(
  mix: { title: string; executive_summary: string; sections: { heading: string; content: string }[]; key_assumptions: string[]; next_steps: string[] },
  appliedFixes: Array<{ concern: string; fix: string }>,
): { system: string; user: string } {
  return {
    system: `You are a document editor. Take the original document and apply the requested fixes.
Korean only. Maintain the original tone and structure. Don't add new sections unless a fix requires it.
Output the complete updated document — not just the changes.`,

    user: `원본 문서:
제목: ${mix.title}
요약: ${mix.executive_summary}
${mix.sections.map(s => `[${s.heading}]\n${s.content}`).join('\n\n')}
전제: ${mix.key_assumptions.join(', ')}
다음 단계: ${mix.next_steps.join(', ')}

적용할 수정사항:
${appliedFixes.map((f, i) => `${i + 1}. 우려: ${f.concern}\n   수정: ${f.fix}`).join('\n')}

수정사항을 반영한 최종 문서를 만들어줘.

JSON format:
{
  "title": "최종 제목",
  "executive_summary": "최종 요약",
  "sections": [{"heading": "...", "content": "..."}],
  "key_assumptions": ["..."],
  "next_steps": ["..."],
  "changes_applied": ["어떤 수정이 적용됐는지 요약 1줄씩"]
}`,
  };
}

// ─── 1b. 프레이밍 재분석 (사용자가 Round 1 질문 거부 시) ───

export function buildInitialRefinementPrompt(
  problemText: string,
  rejectedQuestion: string,
  rejectionReason: string,
): { system: string; user: string } {
  return {
    system: `You are a practical business mentor. Korean only. Direct.

The user saw your initial "진짜 질문" and REJECTED it. Their feedback tells you WHERE you went wrong.
Re-analyze from scratch, incorporating their correction. The new real_question must:
1. Directly address the user's feedback
2. Still be a QUESTION (물음표로 끝남)
3. Be more specific than the rejected version
4. Include framing_confidence — if you're still uncertain, say so (60-70).

Do NOT repeat the rejected question with minor edits. Find the ACTUAL underlying question.`,

    user: `원래 고민:
<user-data>${sanitize(problemText)}</user-data>

처음 제시된 질문 (거부됨):
"${sanitize(rejectedQuestion)}"

사용자 피드백:
"${sanitize(rejectionReason)}"

사용자의 거부 이유를 반영해서 완전히 새로운 분석을 해줘.

JSON format:
{
  "real_question": "새로운 핵심 질문 (물음표로 끝남)",
  "framing_confidence": 0-100,
  "why_this_matters": "왜 이 질문이 맞는지 (1문장)",
  "hidden_assumptions": ["현실적인 놓치기 쉬운 것 2-3개"],
  "skeleton": ["업데이트된 뼈대 항목들"],
  "next_question": {
    "text": "다음 질문",
    "subtext": "이유",
    "options": ["1","2","3"],
    "type": "select"
  },
  "detected_decision_maker": "대표님|팀장님|투자자|null"
}`,
  };
}

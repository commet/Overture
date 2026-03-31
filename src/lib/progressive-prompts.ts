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
import { compactQAHistory, shouldCompact } from '@/lib/compact-context';

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
    system: `You are a senior strategic planning expert who has spent 5+ years in corporate strategy.
You speak Korean naturally. You are direct, specific, and authoritative — not academic or preachy.

Your job: Someone just described a problem that's outside their expertise. They're stuck.
In ONE pass, give them:
1. The REAL question they should be asking (not what they think the question is)
2. Hidden assumptions they're making without realizing
3. A usable skeleton/framework they can start with RIGHT NOW
4. The ONE best follow-up question that will unlock the most value

CRITICAL quality rules for your question:
- It must be SPECIFIC to their situation, not generic
- It must reveal something they haven't considered
- It should make them go "아, 맞다 그걸 먼저 해야 하지"
- Offer 3-4 concrete options when possible (people answer better with choices)
- NEVER ask "목표가 뭐야?" or "어떤 결과를 원해?" — those are lazy questions

For the skeleton:
- Each line should be an ACTIONABLE item, not a vague category
- Write it so they can literally copy-paste into a doc and start filling in
- 5-7 lines, each one specific and 1-2 sentences long
- Think of it as a Table of Contents with brief descriptions — not just titles
- Example good skeleton line: "시장 현황: 현재 경쟁사 3곳의 접근법과 우리가 다른 점 정리"
- Example bad skeleton line: "시장 분석" (too vague, useless)

Respond in JSON. Korean only.`,

    user: `내 상황:
<user-data>${sanitize(problemText)}</user-data>

이거 기반으로 분석해줘.

JSON format:
{
  "real_question": "이 사람이 진짜 답해야 하는 질문 (1문장, 날카롭게)",
  "why_this_matters": "왜 이 질문이 원래 질문보다 중요한지 (1문장)",
  "hidden_assumptions": [
    "이 사람이 당연하다고 생각하지만 실은 검증이 필요한 전제 1",
    "전제 2",
    "전제 3"
  ],
  "skeleton": [
    "구체적인 뼈대 항목 1 (실제 내용이 들어갈 자리)",
    "항목 2",
    "항목 3",
    "항목 4",
    "항목 5"
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
  // 컨텍스트 압축: Q&A가 길어지면 오래된 대화를 요약
  const qaHistory = shouldCompact(questionsAndAnswers)
    ? compactQAHistory(questionsAndAnswers, 2)
    : questionsAndAnswers.map((qa, i) =>
        `Q${i + 1}: ${qa.question.text}\nA${i + 1}: ${qa.answer.value}`,
      ).join('\n\n');

  const isLastRound = round >= maxRounds - 1;

  return {
    system: `You are a senior strategic planning expert. Korean only. Direct and specific.

You're in a progressive analysis session. Each round, you get new information from the user's answer.
Your job:
1. Absorb the new answer — extract the KEY insight it reveals
2. Update the analysis (real question, assumptions, skeleton) based on accumulated context
3. If round ${round + 1} of ${maxRounds}: ${isLastRound
  ? 'This is the LAST question. Make it count. After this, we mix everything into a final draft. Set ready_for_mix: true if you have enough to work with.'
  : 'Generate the next question. Each question should BUILD on previous answers, not repeat themes.'}

Question quality rules (CRITICAL):
- Reference their specific answer: "대표님이 확인한다고 했는데, 그러면..."
- Each question must open a NEW dimension, not drill deeper into the same one
- Round 1 typically: WHO judges this → Round 2: constraints/resources → Round 3: success criteria/risks
- If the answer reveals the user is more sophisticated than expected, level up the questions
- If the answer is vague, ask something concrete with options

After round 2+, start building an execution plan (who does what, in what order).`,

    user: `원래 고민:
<user-data>${sanitize(problemText)}</user-data>

현재 분석 (v${currentSnapshot.version}):
- 진짜 질문: ${currentSnapshot.real_question}
- 숨겨진 전제: ${currentSnapshot.hidden_assumptions.join(' / ')}
- 뼈대: ${currentSnapshot.skeleton.join(' → ')}
${currentSnapshot.execution_plan ? `- 실행계획: ${currentSnapshot.execution_plan.steps.map(s => s.task).join(' → ')}` : ''}

Q&A 히스토리:
${qaHistory}

이 새로운 정보를 반영해서 분석을 업데이트해줘.

JSON format:
{
  "insight": "이번 답변에서 발견된 핵심 인사이트 (1문장)",
  "real_question": "업데이트된 진짜 질문",
  "hidden_assumptions": ["업데이트된 전제들 (기존 + 새로 발견된 것)"],
  "skeleton": ["업데이트된 뼈대 (더 구체적으로, 답변 반영)"],
  "execution_plan": {
    "steps": [
      {"task": "구체적 할 일", "who": "ai|human|both", "output": "산출물"}
    ],
    "key_assumptions": ["이 계획이 성공하려면 참이어야 하는 것"]
  },
  "next_question": ${isLastRound ? 'null' : `{
    "text": "다음 질문",
    "subtext": "왜 이걸 물어보는지",
    "options": ["선택지1", "선택지2", "선택지3"] 또는 생략,
    "type": "select|short"
  }`},
  "ready_for_mix": ${isLastRound ? 'true' : 'true|false (충분한 정보가 모였으면 true)'}
}`,
  };
}

// ─── 3. Mix (최종 초안 조합) ───

export function buildMixPrompt(
  problemText: string,
  snapshots: AnalysisSnapshot[],
  questionsAndAnswers: Array<{ question: FlowQuestion; answer: FlowAnswer }>,
  decisionMaker: string | null,
): { system: string; user: string } {
  const latestSnapshot = snapshots[snapshots.length - 1];

  const qaHistory = questionsAndAnswers.map((qa, i) =>
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
- 진짜 질문: ${latestSnapshot.real_question}
- 전제: ${latestSnapshot.hidden_assumptions.join(' / ')}
- 뼈대: ${latestSnapshot.skeleton.join('\n')}
${latestSnapshot.execution_plan ? `
실행계획:
${latestSnapshot.execution_plan.steps.map((s, i) => `${i + 1}. ${s.task} (${s.who}) → ${s.output}`).join('\n')}
핵심 가정: ${latestSnapshot.execution_plan.key_assumptions.join(' / ')}` : ''}

Q&A 전체:
${qaHistory}

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

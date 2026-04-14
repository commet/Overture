/**
 * Manual dogfood harness for the Phase 1 typed question system.
 *
 * What it does:
 *   1. Builds both strategic_fork and weakness_check prompts with a realistic
 *      seed problem.
 *   2. Prints the full system+user prompt (so a human — or Claude — can read
 *      them and either act as the LLM or feed them to one).
 *   3. Accepts a pasted JSON response and validates it against the parser
 *      logic in `runTypedQuestion`, reporting which fields are present /
 *      missing and whether the produced options clear the quality bar
 *      (each option a 1-line decision with decisionLine, not a category).
 *
 * Usage:
 *   npx tsx scripts/test-typed-questions.ts strategic_fork   # prints prompt
 *   npx tsx scripts/test-typed-questions.ts strategic_fork --validate < response.json
 */

import {
  buildStrategicForkPrompt,
  buildWeaknessCheckPrompt,
  type TypedQuestionContext,
} from '../src/lib/progressive-prompts';

// ── Realistic seed problem (Korean, ko locale) ──
// Chosen to closely match the demo scenario 1 so we can compare LLM output
// against the demo's hand-crafted options as a quality benchmark.
const SEED: TypedQuestionContext = {
  problemText:
    '5명짜리 기존 사업팀이 있는데, 대표님이 갑자기 AI 고객 상담 SaaS 신사업 기획안을 2주 뒤까지 가져오라고 하셨어요. 경쟁사가 지난주에 비슷한 걸 런칭해서 뉴스에 나왔고, 우리는 이커머스 셀러를 타겟으로 하려고 해요. 팀이 AI 경험이 거의 없어서 일정이 현실적인지 모르겠어요.',
  snapshot: {
    real_question:
      '기존 사업을 유지하면서 5명으로 AI 신사업을 4주 안에 움직이는 게 실제로 가능할까?',
    hidden_assumptions: [
      '대표님이 원하는 건 완성된 기획안이 아니라 첫 실행 약속일 수 있어요.',
      '경쟁사가 먼저 한 건 시장이 있다는 증거예요 — 검증 비용을 아낀 셈이에요.',
      '2주 마감은 1차 초안 + 피드백이지, 최종본이 아닐 가능성이 높아요.',
    ],
    skeleton: [
      '먼저 — 경쟁사 제품에 직접 가입해서 한 시간만 써봐요. 불편한 게 3개는 보여요.',
      '그다음 — 팀 안에서 "5명 중 몇 명을 신사업에 뺄 수 있어?" 한 줄 확인.',
      '그리고 — 셀러 3명한테 "뭐가 제일 답답해요?" 한마디. 설문 필요 없어요.',
      '핵심 — 경쟁사에 없는 한 가지를 찾기. 기술적으로 뭐가 가능한지부터 짚기.',
      '마지막 — "4주 뒤 이걸 보여드리겠습니다" 한 줄 결재 문장.',
    ],
  },
  previousQA: [],
};

// For weakness_check, simulate that the team has already produced an initial answer.
const WEAKNESS_SEED: TypedQuestionContext = {
  ...SEED,
  snapshot: {
    ...SEED.snapshot,
    real_question:
      '경쟁사가 시장을 열어준 지금, 4주 안에 셀러 한 명에게 "이거 쓸래요"를 받아낼 수 있는가?',
  },
  workerSummary:
    '팀이 제안: 5명 중 2명 전담 + 3명 유지보수. 4주 MVP — Week 1 사전학습 PoC, Week 2 API, Week 3 대시보드, Week 4 셀러 1명 베타 시연. 월 29만원 구독 (경쟁사 1/3). 손익분기: 25개사. Go/No-Go: Week 4에 셀러가 "쓸래요" 하는가.',
};

// ── Parser validation (mirrors runTypedQuestion) ──

interface StrategicForkOption {
  label?: string;
  decisionLine?: string;
  rationale?: string;
  addsWorkerRole?: string;
  snapshotPatch?: {
    real_question?: string;
    hidden_assumptions?: string[];
    skeleton?: string[];
    insight?: string;
  };
}

interface WeaknessCheckOption {
  label?: string;
  weakestAssumption?: { assumption?: string; explanation?: string };
  nextThreeDays?: string[];
  dmFirstReaction?: string;
  snapshotPatch?: { insight?: string };
}

function validateStrategicFork(parsed: {
  text?: string;
  subtext?: string;
  options?: StrategicForkOption[];
}) {
  const issues: string[] = [];
  const goods: string[] = [];

  if (!parsed.text) issues.push('missing top-level "text"');
  else goods.push(`text: "${parsed.text}"`);

  if (!parsed.subtext) issues.push('missing "subtext"');
  else goods.push(`subtext: "${parsed.subtext}"`);

  if (!Array.isArray(parsed.options)) {
    issues.push('options is not an array — FATAL');
    return { issues, goods, passCount: 0 };
  }
  if (parsed.options.length < 3) issues.push(`only ${parsed.options.length} options — expected 3–4`);

  let passCount = 0;
  parsed.options.forEach((o, i) => {
    const oIssues: string[] = [];
    if (!o.label) oIssues.push('no label');
    if (!o.decisionLine) oIssues.push('no decisionLine');
    if (!o.rationale) oIssues.push('no rationale');
    if (!o.addsWorkerRole) oIssues.push('no addsWorkerRole');
    if (!o.snapshotPatch) oIssues.push('no snapshotPatch');
    else {
      if (!o.snapshotPatch.real_question) oIssues.push('no snapshotPatch.real_question');
      if (!Array.isArray(o.snapshotPatch.hidden_assumptions)) oIssues.push('no snapshotPatch.hidden_assumptions[]');
      if (!Array.isArray(o.snapshotPatch.skeleton)) oIssues.push('no snapshotPatch.skeleton[]');
      if (!o.snapshotPatch.insight) oIssues.push('no snapshotPatch.insight');
    }

    // Quality heuristic: the label should NOT be a generic category.
    // Red flags: short labels, ending in "우선" or "중심", no digits/verbs.
    const label = o.label || '';
    const isCategory =
      label.length < 15 ||
      /우선$|중심$|중점$|전략$|방향$/.test(label.trim()) ||
      (!/\d/.test(label) && label.split(' ').length < 4);
    if (isCategory) oIssues.push(`label looks like a CATEGORY, not a 1-line decision: "${label}"`);

    if (oIssues.length === 0) {
      passCount++;
      goods.push(`  ✓ option[${i}]: "${o.label}" — ${o.addsWorkerRole}`);
    } else {
      issues.push(`  ✗ option[${i}] (${label}): ${oIssues.join('; ')}`);
    }
  });

  return { issues, goods, passCount };
}

function validateWeaknessCheck(parsed: {
  text?: string;
  subtext?: string;
  options?: WeaknessCheckOption[];
}) {
  const issues: string[] = [];
  const goods: string[] = [];

  if (!parsed.text) issues.push('missing "text"');
  else goods.push(`text: "${parsed.text}"`);
  if (!parsed.subtext) issues.push('missing "subtext"');
  else goods.push(`subtext: "${parsed.subtext}"`);

  if (!Array.isArray(parsed.options)) {
    issues.push('options is not array — FATAL');
    return { issues, goods, passCount: 0 };
  }
  if (parsed.options.length < 3) issues.push(`only ${parsed.options.length} options — expected 3–4`);

  let passCount = 0;
  parsed.options.forEach((o, i) => {
    const oIssues: string[] = [];
    if (!o.label) oIssues.push('no label');
    if (!o.weakestAssumption?.assumption) oIssues.push('no weakestAssumption.assumption');
    if (!o.weakestAssumption?.explanation) oIssues.push('no weakestAssumption.explanation');
    if (!Array.isArray(o.nextThreeDays) || o.nextThreeDays.length === 0)
      oIssues.push('no nextThreeDays[]');
    if (!o.dmFirstReaction) oIssues.push('no dmFirstReaction');

    // Quality heuristic: nextThreeDays items should be concrete verbs, not categories.
    const vagueCount = (o.nextThreeDays || []).filter(d =>
      /^(시장|고객|기술|전략|분석|조사|검토)/.test(d.trim()),
    ).length;
    if (vagueCount > 0) oIssues.push(`${vagueCount} vague nextThreeDays items (starts with category noun)`);

    if (oIssues.length === 0) {
      passCount++;
      goods.push(`  ✓ option[${i}]: "${o.label}"`);
    } else {
      issues.push(`  ✗ option[${i}] (${o.label}): ${oIssues.join('; ')}`);
    }
  });

  return { issues, goods, passCount };
}

// ── Entry point ──

function banner(title: string) {
  console.log('\n' + '═'.repeat(72));
  console.log('  ' + title);
  console.log('═'.repeat(72));
}

async function main() {
  const type = process.argv[2] || 'strategic_fork';
  const validate = process.argv.includes('--validate');

  const builder =
    type === 'strategic_fork'
      ? buildStrategicForkPrompt
      : type === 'weakness_check'
        ? buildWeaknessCheckPrompt
        : null;

  if (!builder) {
    console.error(
      `Unknown type: ${type}. Use "strategic_fork" or "weakness_check".`,
    );
    process.exit(1);
  }

  const ctx = type === 'weakness_check' ? WEAKNESS_SEED : SEED;
  const prompt = builder(ctx, 'ko');

  if (!validate) {
    banner(`PROMPT — ${type} (ko locale)`);
    console.log('\n--- SYSTEM ---\n');
    console.log(prompt.system);
    console.log('\n--- USER ---\n');
    console.log(prompt.user);
    console.log('\n' + '─'.repeat(72));
    console.log(
      'Next: feed this to Claude (or paste a JSON response) and re-run with --validate < response.json',
    );
    return;
  }

  // Read response from stdin
  let raw = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) raw += chunk;

  let parsed: unknown;
  try {
    // Strip markdown fences if present
    const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    parsed = JSON.parse(stripped);
  } catch (e) {
    console.error('JSON parse failed:', (e as Error).message);
    console.error('Raw input (first 500 chars):', raw.slice(0, 500));
    process.exit(1);
  }

  banner(`VALIDATION — ${type}`);
  const result =
    type === 'strategic_fork'
      ? validateStrategicFork(parsed as Parameters<typeof validateStrategicFork>[0])
      : validateWeaknessCheck(parsed as Parameters<typeof validateWeaknessCheck>[0]);

  console.log('\n✅ Good:');
  result.goods.forEach(g => console.log('  ' + g));

  if (result.issues.length > 0) {
    console.log('\n❌ Issues:');
    result.issues.forEach(i => console.log('  ' + i));
  }

  console.log(
    `\nSummary: ${result.passCount} option(s) passed all checks.`,
  );
  process.exit(result.passCount >= 3 && result.issues.length === 0 ? 0 : 2);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

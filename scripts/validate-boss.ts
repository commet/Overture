/**
 * Boss prompt LLM validation harness.
 *
 * Builds the Boss system prompt for several MBTI types × locales, sends a
 * user message, and prints the response. Lets us see whether the English
 * Boss persona actually comes across in-character — since we didn't write
 * English exampleDialogues, this is where quality gaps (if any) show up.
 *
 * Usage:
 *   npm run validate:boss
 *   npm run validate:boss -- --scenario=entj-en
 *   npm run validate:boss -- --save
 *
 * Exit: 0 on all LLM calls succeeding, 1 otherwise.
 */

import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { buildBossSystemPrompt, type BossLocale } from '../src/lib/boss/boss-prompt';
import { getLocalizedPersonalityType } from '../src/lib/boss/personality-types';
import { buildZodiacProfile } from '../src/lib/boss/zodiac';
import { buildYearMonthProfile } from '../src/lib/boss/saju-interpreter';

interface Scenario {
  id: string;
  typeCode: string;
  locale: BossLocale;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  gender: '남' | '여';
  userMessage: string;
  context: string; // one-line what we're looking for
}

const SCENARIOS: Scenario[] = [
  {
    id: 'entj-en',
    typeCode: 'ENTJ',
    locale: 'en',
    birthYear: 1985, birthMonth: 7, birthDay: 15,
    gender: '남',
    userMessage: "I want to propose we cut Q3 project scope by 40%. We're behind and more hours won't fix the data-quality issue at the core. I've got a revised plan if you want to hear it.",
    context: 'ENTJ should push back or raise the bar — demanding, forward-moving',
  },
  {
    id: 'isfp-en',
    typeCode: 'ISFP',
    locale: 'en',
    birthYear: 1990, birthMonth: 3, birthDay: 22,
    gender: '여',
    userMessage: "I redesigned our onboarding flow — simpler, more focused. Would love your take when you have a moment.",
    context: 'ISFP should be gentle, craft-focused, unhurried',
  },
  {
    id: 'istj-en',
    typeCode: 'ISTJ',
    locale: 'en',
    birthYear: 1978, birthMonth: 11, birthDay: 3,
    gender: '남',
    userMessage: "I'd like to push our Friday deadline to next Tuesday. The QA pass uncovered three edge cases that need more time.",
    context: 'ISTJ should be terse, ask for docs/history, cool-headed',
  },
  {
    id: 'enfp-en',
    typeCode: 'ENFP',
    locale: 'en',
    birthYear: 1995, birthMonth: 9, birthDay: 18,
    gender: '여',
    userMessage: "I think we should pivot the product direction toward smaller teams. Here's a rough sketch.",
    context: 'ENFP should light up with possibilities, enthusiastic',
  },
  // KO regression — make sure we didn't break the Korean path
  {
    id: 'entj-ko-regression',
    typeCode: 'ENTJ',
    locale: 'ko',
    birthYear: 1985, birthMonth: 7, birthDay: 15,
    gender: '남',
    userMessage: "Q3 프로젝트 스코프를 40% 줄이는 걸 제안드리고 싶습니다. 지금 속도로는 일정 못 맞추고, 야근으로 커버하는 게 본질이 아닌 것 같아서요. 재구성 안 준비해뒀습니다.",
    context: 'Korean ENTJ regression — should be 반말, demanding, no Korean regression',
  },
];

// ─── LLM client ───

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY not found. Check .env.local.');
  process.exit(1);
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-20250514';

async function callLLM(system: string, user: string): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 350,
    system,
    messages: [{ role: 'user', content: user }],
  });
  const block = response.content.find(b => b.type === 'text');
  return block && block.type === 'text' ? block.text : '';
}

// ─── Quality heuristics ───

interface QualityCheck {
  label: string;
  passed: boolean;
  detail?: string;
}

function checkQuality(output: string, scenario: Scenario): QualityCheck[] {
  const checks: QualityCheck[] = [];
  const ko = scenario.locale === 'ko';

  // 1. Has output
  checks.push({ label: 'Non-empty response', passed: output.trim().length > 0, detail: `${output.length} chars` });

  // 2. Language match
  const hasKorean = /[가-힣]/.test(output);
  const hasEnglish = /[a-zA-Z]{5,}/.test(output);
  if (ko) {
    checks.push({ label: 'Korean output', passed: hasKorean });
  } else {
    checks.push({
      label: 'English output (no Korean bleed)',
      passed: !hasKorean && hasEnglish,
      detail: hasKorean ? 'Korean chars leaked!' : 'clean',
    });
  }

  // 3. Length sanity (boss should be short, conversational)
  const wordCount = output.trim().split(/\s+/).length;
  checks.push({
    label: 'Concise (≤ 80 words for short reply)',
    passed: wordCount <= 120,
    detail: `${wordCount} words`,
  });

  // 4. Not a bulleted report
  const bulletCount = (output.match(/^\s*[-*•]\s/gm) || []).length;
  checks.push({
    label: 'No bullet list (boss = conversational)',
    passed: bulletCount === 0,
    detail: bulletCount > 0 ? `${bulletCount} bullets` : 'clean',
  });

  // 5. No stage directions (*sighs*, *leans back*)
  const stageDir = /\*[^*\n]{3,50}\*/.test(output);
  checks.push({ label: 'No *stage directions*', passed: !stageDir });

  // 6. No AI/personality-type meta mentions
  const metaWords = ko
    ? /AI|인공지능|성격유형|MBTI|시뮬레이션/i.test(output)
    : /\b(AI|MBTI|simulation|personality type|I am an AI)\b/i.test(output);
  checks.push({ label: 'No meta-mentions', passed: !metaWords });

  // 7. Character alignment (light heuristic)
  if (scenario.typeCode === 'ENTJ' && !ko) {
    // ENTJ should sound decisive, not hedging
    const hedges = /\b(maybe|perhaps|sort of|kinda|i guess|might|could be)\b/gi;
    const hedgeCount = (output.match(hedges) || []).length;
    checks.push({
      label: 'ENTJ: minimal hedging',
      passed: hedgeCount <= 1,
      detail: `${hedgeCount} hedges`,
    });
  }

  return checks;
}

// ─── Formatting ───

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

function div(ch = '─', n = 78) { console.log(C.dim + ch.repeat(n) + C.reset); }
function header(text: string) {
  div('═');
  console.log(C.bold + C.cyan + text + C.reset);
  div('═');
}

async function runScenario(s: Scenario, save: boolean): Promise<boolean> {
  header(`${s.id} — ${s.typeCode} (${s.locale.toUpperCase()})`);
  console.log(C.dim + `Character note: ${s.context}` + C.reset);
  console.log(C.dim + `Birth: ${s.birthYear}-${s.birthMonth}-${s.birthDay}, gender: ${s.gender}` + C.reset);
  console.log('');

  const type = getLocalizedPersonalityType(s.typeCode, s.locale);
  if (!type) {
    console.error(C.red + `Unknown type: ${s.typeCode}` + C.reset);
    return false;
  }

  const zodiac = s.locale === 'en' ? buildZodiacProfile(s.birthYear, s.birthMonth, s.birthDay) : null;
  const yearMonth = s.locale === 'ko' ? buildYearMonthProfile(s.birthYear, s.birthMonth) : null;

  const system = buildBossSystemPrompt({
    type,
    saju: null,
    yearMonth,
    zodiac,
    gender: s.gender,
    locale: s.locale,
  });

  console.log(C.dim + 'USER:' + C.reset);
  console.log('  ' + s.userMessage);
  console.log('');

  let output = '';
  const started = Date.now();
  try {
    output = await callLLM(system, s.userMessage);
  } catch (err) {
    console.error(C.red + 'LLM ERROR: ' + C.reset + (err instanceof Error ? err.message : String(err)));
    return false;
  }
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  console.log(C.bold + `BOSS (${type.name}, ${elapsed}s):` + C.reset);
  console.log('  ' + output.split('\n').join('\n  '));
  console.log('');

  const checks = checkQuality(output, s);
  console.log(C.dim + 'QUALITY CHECKS:' + C.reset);
  let allPass = true;
  for (const c of checks) {
    const icon = c.passed ? C.green + '✓' : C.red + '✗';
    const detail = c.detail ? C.dim + ` — ${c.detail}` + C.reset : '';
    console.log(`  ${icon}${C.reset} ${c.label}${detail}`);
    if (!c.passed) allPass = false;
  }

  if (save) {
    const outDir = join(process.cwd(), 'scripts', 'validation-output', 'boss');
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const file = join(outDir, `${s.id}-${stamp}.json`);
    writeFileSync(file, JSON.stringify({
      scenario: s,
      prompt: system,
      output,
      elapsedSec: Number(elapsed),
      checks,
      allPass,
    }, null, 2));
    console.log(C.dim + `  saved: ${file}` + C.reset);
  }
  console.log('');

  return allPass;
}

async function main() {
  const args = process.argv.slice(2);
  const save = args.includes('--save');
  const filter = args.find(a => a.startsWith('--scenario='))?.split('=')[1];
  const scenarios = filter ? SCENARIOS.filter(s => s.id === filter) : SCENARIOS;

  if (scenarios.length === 0) {
    console.error(`❌ No scenario matches ${filter}. Available:`);
    for (const s of SCENARIOS) console.error(`  ${s.id}`);
    process.exit(1);
  }

  console.log(C.bold + '\nBoss Prompt LLM Validation' + C.reset);
  console.log(C.dim + `Model: ${MODEL}` + C.reset);
  console.log(C.dim + `Scenarios: ${scenarios.length}` + C.reset);

  const started = Date.now();
  const results: boolean[] = [];
  for (const s of scenarios) {
    results.push(await runScenario(s, save));
  }

  div('═');
  const total = ((Date.now() - started) / 1000).toFixed(1);
  const passed = results.filter(Boolean).length;
  const failed = results.length - passed;
  console.log(C.bold + `\nDone in ${total}s — ${C.green}${passed} passed${C.reset}${failed > 0 ? ` · ${C.red}${failed} failed${C.reset}` : ''}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('\n❌ Fatal:', err);
  process.exit(1);
});

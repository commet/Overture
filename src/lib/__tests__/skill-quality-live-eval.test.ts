/**
 * Live Skill Quality Eval — .overture/ 실제 출력물 채점
 *
 * 실제 스킬 실행 결과를 eval framework로 채점한다.
 * .overture/ 폴더에 파일이 있을 때만 실행됨.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  evaluateSkillOutput,
  evaluatePipelineChaining,
  formatEvalReport,
  type SkillName,
} from '@/lib/skill-quality-eval';

const OVERTURE_DIR = join(process.cwd(), '.overture');

function readIfExists(filename: string): string | undefined {
  const filepath = join(OVERTURE_DIR, filename);
  if (existsSync(filepath)) return readFileSync(filepath, 'utf-8');
  return undefined;
}

// Read actual outputs
const reframeOutput = readIfExists('reframe.md');
const recastOutput = readIfExists('recast.md');
const rehearseOutput = readIfExists('rehearse.md');
const refineOutput = readIfExists('refine.md');

/* ────────────────────────────────────
   Per-stage structural eval
   ──────────────────────────────────── */

const stages: [SkillName, string | undefined][] = [
  ['reframe', reframeOutput],
  ['recast', recastOutput],
  ['rehearse', rehearseOutput],
  ['refine', refineOutput],
];

for (const [skill, output] of stages) {
  const describeOrSkip = output ? describe : describe.skip;

  describeOrSkip(`Live eval: /${skill}`, () => {
    const result = evaluateSkillOutput(skill, output!);

    it('structural pass rate 보고', () => {
      const report = formatEvalReport(result);
      console.log(report);
      // 보고 목적 — 항상 pass. 실패 항목은 report에서 확인.
      expect(result.structural).toBeDefined();
    });

    it('structural pass rate >= 50% (최소 기준)', () => {
      expect(result.structural_pass_rate).toBeGreaterThanOrEqual(0.5);
    });

    it('content judge prompt 생성됨', () => {
      expect(result.content_judge_prompt.length).toBeGreaterThan(100);
      // 실제 judge prompt를 출력해서 수동으로 LLM에 보낼 수 있게
      console.log('\n--- Content Judge Prompt (first 500 chars) ---');
      console.log(result.content_judge_prompt.slice(0, 500) + '...');
    });
  });
}

/* ────────────────────────────────────
   Pipeline chaining eval
   ──────────────────────────────────── */

const hasFullPipeline = reframeOutput && recastOutput && rehearseOutput && refineOutput;
const describeChaining = hasFullPipeline ? describe : describe.skip;

describeChaining('Live eval: Pipeline Chaining (4단계 전체)', () => {
  const files = {
    reframe: reframeOutput!,
    recast: recastOutput!,
    rehearse: rehearseOutput!,
    refine: refineOutput!,
  };
  const chainingResults = evaluatePipelineChaining(files);

  it('체이닝 결과 보고', () => {
    console.log('\n# Pipeline Chaining Results');
    console.log(`Pass: ${chainingResults.filter(e => e.passed).length}/${chainingResults.length}`);
    for (const e of chainingResults) {
      console.log(`  ${e.passed ? '✓' : '✗'} ${e.id}`);
      if (!e.passed) console.log(`    → ${e.description}`);
    }
    expect(chainingResults).toBeDefined();
  });

  it('모든 파일에 Context Contract 존재', () => {
    const contractChecks = chainingResults.filter(e => e.id.endsWith('_has_context_contract'));
    const allPresent = contractChecks.every(e => e.passed);
    if (!allPresent) {
      const missing = contractChecks.filter(e => !e.passed).map(e => e.id);
      console.log('Missing Context Contract:', missing);
    }
    expect(allPresent).toBe(true);
  });

  it('chaining pass rate >= 60%', () => {
    const passRate = chainingResults.filter(e => e.passed).length / chainingResults.length;
    expect(passRate).toBeGreaterThanOrEqual(0.6);
  });
});

/**
 * guard-rails.ts — 프레임워크별 결과 검증기
 *
 * 데이터 기반 (guard-rails-schema.ts) + 범용 엔진. LLM 호출 없음.
 * 각 프레임워크의 결과물이 해당 방법론의 구조를 따르는지 확인.
 * 미등록 프레임워크는 기본 구조 검증 (무조건 pass 방지).
 */

import { FRAMEWORK_RULES, type FrameworkValidationRule, type ValidationSignal } from './guard-rails-schema';

/* ─── Types ─── */

export interface GuardRailResult {
  passed: boolean;
  score: number;      // 0-100
  issues: string[];
}

/* ─── Helpers ─── */

function countMatches(text: string, patterns: (string | RegExp)[]): number {
  return patterns.filter(p =>
    typeof p === 'string' ? text.includes(p) : p.test(text)
  ).length;
}

function countNumericValues(text: string): number {
  const numericPattern = /\d[\d,.]*\s*(%|만|억|조|원|달러|불|개월|년|명|건|개|배|\$|M|K|B)/g;
  return (text.match(numericPattern) || []).length;
}

function countBulletPoints(text: string): number {
  return (text.match(/^[\s]*[-•*]\s|^[\s]*\d+[.)]\s/gm) || []).length;
}

function checkFirstLineConclusion(text: string): boolean {
  const lines = text.trim().split('\n').filter(l => l.trim());
  const firstLine = lines[0] || '';
  return !firstLine.endsWith('?') && firstLine.length > 10;
}

/* ─── Signal Evaluator ─── */

function evaluateSignal(signal: ValidationSignal, output: string): { score: number; passed: boolean } {
  switch (signal.type) {
    case 'keywords': {
      const matches = countMatches(output, signal.patterns || []);
      const met = matches >= (signal.minCount ?? 1);
      const bonus = signal.perMatchBonus ? matches * signal.perMatchBonus : 0;
      return { score: met ? Math.min(signal.weight, signal.weight + bonus) : Math.min(signal.weight, bonus), passed: met };
    }
    case 'numeric': {
      const count = countNumericValues(output);
      const met = count >= (signal.minCount ?? 1);
      const bonus = signal.perMatchBonus ? count * signal.perMatchBonus : 0;
      return { score: met ? Math.min(signal.weight, bonus || signal.weight) : Math.min(signal.weight, bonus), passed: met };
    }
    case 'bullets': {
      const count = countBulletPoints(output);
      const met = count >= (signal.minCount ?? 1);
      const bonus = signal.perMatchBonus ? count * signal.perMatchBonus : 0;
      return { score: met ? Math.min(signal.weight, bonus || signal.weight) : Math.min(signal.weight, bonus), passed: met };
    }
    case 'first_line_conclusion': {
      const met = checkFirstLineConclusion(output);
      return { score: met ? signal.weight : 0, passed: met };
    }
    default:
      return { score: 0, passed: true };
  }
}

/* ─── Rule Engine ─── */

export function runValidationRule(rule: FrameworkValidationRule, output: string): GuardRailResult {
  const issues: string[] = [];
  let totalScore = 0;

  for (const signal of rule.signals) {
    const result = evaluateSignal(signal, output);
    totalScore += result.score;
    if (!result.passed) {
      issues.push(signal.failMessage);
    }
  }

  const score = Math.min(100, totalScore);
  const threshold = rule.passThreshold ?? 60;
  return { passed: score >= threshold, score, issues };
}

/* ─── Framework Matcher ─── */

function findRule(frameworkName: string): FrameworkValidationRule | undefined {
  const lower = frameworkName.toLowerCase();
  return FRAMEWORK_RULES.find(r => lower.includes(r.frameworkPattern));
}

/* ─── Main ─── */

export function validateByFramework(
  frameworkName: string,
  output: string,
): GuardRailResult {
  const rule = findRule(frameworkName);
  if (!rule) {
    // 미등록 프레임워크 → 기본 구조 검증 (무조건 pass 방지)
    const bulletCount = countBulletPoints(output);
    const numCount = countNumericValues(output);
    const score = Math.min(100, 40 + bulletCount * 8 + numCount * 5);
    return { passed: score >= 60, score, issues: score < 60 ? ['Insufficient structure for unregistered framework'] : [] };
  }
  return runValidationRule(rule, output);
}

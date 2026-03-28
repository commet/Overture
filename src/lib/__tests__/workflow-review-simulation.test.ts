/**
 * Workflow Review Simulation — 순수 헬퍼 함수 검증
 *
 * 핵심 검증:
 * - countBySeverity: severity별 카운트 집계
 * - getStepWarnings: stepIndex(0-based) → affected_steps(1-based) 매핑
 */

import { describe, it, expect, vi } from 'vitest';
import type { WorkflowReview, ReviewFinding } from '@/stores/types';

vi.mock('@/lib/llm', () => ({
  callLLMJson: vi.fn(),
}));

import { countBySeverity, getStepWarnings } from '@/lib/workflow-review';

function makeFinding(overrides: Partial<ReviewFinding> = {}): ReviewFinding {
  return {
    type: 'risk',
    severity: 'medium',
    text: 'Some finding',
    affected_steps: [1],
    ...overrides,
  };
}

function makeReview(overrides: Partial<WorkflowReview> = {}): WorkflowReview {
  return {
    lens: 'skeptic',
    lens_label: '비판적 검토',
    findings: [makeFinding()],
    reviewed_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('Workflow Review Simulation', () => {
  // ═══════════════════════════════════════
  // countBySeverity
  // ═══════════════════════════════════════
  describe('countBySeverity', () => {
    it('returns all zeros for empty reviews', () => {
      const result = countBySeverity([]);
      expect(result).toEqual({ high: 0, medium: 0, low: 0 });
    });

    it('counts findings correctly across multiple reviews', () => {
      const reviews: WorkflowReview[] = [
        makeReview({
          findings: [
            makeFinding({ severity: 'high' }),
            makeFinding({ severity: 'high' }),
            makeFinding({ severity: 'low' }),
          ],
        }),
        makeReview({
          findings: [
            makeFinding({ severity: 'medium' }),
            makeFinding({ severity: 'high' }),
            makeFinding({ severity: 'medium' }),
          ],
        }),
      ];
      const result = countBySeverity(reviews);
      expect(result).toEqual({ high: 3, medium: 2, low: 1 });
    });

    it('handles reviews with no findings', () => {
      const reviews: WorkflowReview[] = [
        makeReview({ findings: [] }),
        makeReview({ findings: [] }),
      ];
      const result = countBySeverity(reviews);
      expect(result).toEqual({ high: 0, medium: 0, low: 0 });
    });
  });

  // ═══════════════════════════════════════
  // getStepWarnings
  // ═══════════════════════════════════════
  describe('getStepWarnings', () => {
    it('returns findings for specific step (0-based index → 1-based affected_steps)', () => {
      const reviews: WorkflowReview[] = [
        makeReview({
          findings: [
            makeFinding({ text: 'Step 1 issue', affected_steps: [1] }),
            makeFinding({ text: 'Step 2 issue', affected_steps: [2] }),
            makeFinding({ text: 'Step 1 and 3 issue', affected_steps: [1, 3] }),
          ],
        }),
      ];
      // stepIndex=0 → looks for affected_steps containing 1
      const warnings = getStepWarnings(reviews, 0);
      expect(warnings).toHaveLength(2);
      expect(warnings.map((w) => w.text)).toContain('Step 1 issue');
      expect(warnings.map((w) => w.text)).toContain('Step 1 and 3 issue');
    });

    it('returns empty for step with no warnings', () => {
      const reviews: WorkflowReview[] = [
        makeReview({
          findings: [
            makeFinding({ text: 'Step 2 only', affected_steps: [2] }),
          ],
        }),
      ];
      // stepIndex=0 → looks for affected_steps containing 1
      const warnings = getStepWarnings(reviews, 0);
      expect(warnings).toHaveLength(0);
    });

    it('collects from all reviews', () => {
      const reviews: WorkflowReview[] = [
        makeReview({
          lens: 'skeptic',
          findings: [makeFinding({ text: 'Skeptic says', affected_steps: [3] })],
        }),
        makeReview({
          lens: 'optimizer',
          findings: [makeFinding({ text: 'Optimizer says', affected_steps: [3] })],
        }),
        makeReview({
          lens: 'domain_market',
          findings: [makeFinding({ text: 'Domain says', affected_steps: [3] })],
        }),
      ];
      // stepIndex=2 → looks for affected_steps containing 3
      const warnings = getStepWarnings(reviews, 2);
      expect(warnings).toHaveLength(3);
      expect(warnings.map((w) => w.text)).toEqual(
        expect.arrayContaining(['Skeptic says', 'Optimizer says', 'Domain says'])
      );
    });

    it('handles undefined affected_steps', () => {
      const reviews: WorkflowReview[] = [
        makeReview({
          findings: [
            makeFinding({ text: 'No steps specified', affected_steps: undefined }),
            makeFinding({ text: 'Has steps', affected_steps: [1] }),
          ],
        }),
      ];
      // The finding without affected_steps should be excluded (optional chaining)
      const warnings = getStepWarnings(reviews, 0);
      expect(warnings).toHaveLength(1);
      expect(warnings[0].text).toBe('Has steps');
    });
  });
});

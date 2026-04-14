import { describe, it, expect } from 'vitest';
import {
  parseLabel,
  formatLabel,
  incrementLastTier,
  nextChildLabel,
  promoteToMajor,
  isPreRelease,
  ROOT_LABEL,
} from '@/lib/version-numbering';

describe('version-numbering', () => {
  describe('parseLabel / formatLabel', () => {
    it('roundtrips simple and nested labels', () => {
      expect(parseLabel('v0')).toEqual([0]);
      expect(parseLabel('v0.1')).toEqual([0, 1]);
      expect(parseLabel('v1.2.3')).toEqual([1, 2, 3]);
      expect(formatLabel([0, 3, 1])).toBe('v0.3.1');
      expect(formatLabel([2, 0])).toBe('v2.0');
    });

    it('falls back to [0] for malformed input', () => {
      expect(parseLabel('garbage')).toEqual([0]);
    });
  });

  describe('incrementLastTier', () => {
    it('steps the last numeric tier', () => {
      expect(incrementLastTier('v0.3')).toBe('v0.4');
      expect(incrementLastTier('v1.0')).toBe('v1.1');
      expect(incrementLastTier('v0.3.1')).toBe('v0.3.2');
    });

    it('starts a child tier when parent has only a major', () => {
      expect(incrementLastTier('v0')).toBe('v0.1');
    });
  });

  describe('nextChildLabel', () => {
    it('continues the main line when parent has no children', () => {
      expect(nextChildLabel(ROOT_LABEL, [])).toBe('v0.1');
      expect(nextChildLabel('v0.1', [])).toBe('v0.2');
      expect(nextChildLabel('v1.0', [])).toBe('v1.1');
    });

    it('creates a branch sub-tier when parent already has a main-line child', () => {
      // v0.1 already has v0.2 (main). Second child must branch.
      expect(nextChildLabel('v0.1', ['v0.2'])).toBe('v0.1.1');
      // Third child: second branch.
      expect(nextChildLabel('v0.1', ['v0.2', 'v0.1.1'])).toBe('v0.1.2');
    });

    it('post-promotion branching works', () => {
      // v1.0 already has main child v1.1. New branch off v1.0 → v1.0.1
      expect(nextChildLabel('v1.0', ['v1.1'])).toBe('v1.0.1');
    });
  });

  describe('promoteToMajor', () => {
    it('bumps the major version and resets the minor tier', () => {
      expect(promoteToMajor('v0.3')).toBe('v1.0');
      expect(promoteToMajor('v0.3.1')).toBe('v1.0');
      expect(promoteToMajor('v1.2')).toBe('v2.0');
    });
  });

  describe('isPreRelease', () => {
    it('flags v0.x as pre-release and v1.x+ as released', () => {
      expect(isPreRelease('v0.1')).toBe(true);
      expect(isPreRelease('v0.3.1')).toBe(true);
      expect(isPreRelease('v1.0')).toBe(false);
      expect(isPreRelease('v2.3')).toBe(false);
    });
  });
});

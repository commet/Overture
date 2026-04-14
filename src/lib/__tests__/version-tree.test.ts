import { describe, it, expect } from 'vitest';
import {
  getActivePath,
  isOnBranch,
  overallLatest,
  buildTree,
  childIdsOf,
  type VersionNode,
} from '@/lib/version-tree';

// Minimal node factory. created_at strings are ISO-sortable.
const node = (id: string, parent_id: string | null, t: string): VersionNode => ({
  id,
  parent_id,
  created_at: `2026-04-14T12:${t.padStart(2, '0')}:00Z`,
});

describe('version-tree', () => {
  describe('getActivePath', () => {
    it('returns [] for empty input', () => {
      expect(getActivePath([], 'x')).toEqual([]);
    });

    it('single root returns [root]', () => {
      const nodes = [node('a', null, '01')];
      const path = getActivePath(nodes, 'a');
      expect(path.map((n) => n.id)).toEqual(['a']);
    });

    it('main-line chain a → b → c with leaf=c', () => {
      const nodes = [
        node('a', null, '01'),
        node('b', 'a', '02'),
        node('c', 'b', '03'),
      ];
      expect(getActivePath(nodes, 'c').map((n) => n.id)).toEqual(['a', 'b', 'c']);
    });

    it('branch chain: leaf=branch child returns the branch path', () => {
      // a → b → c (main)
      //   └→ b1 (branch from a)
      const nodes = [
        node('a', null, '01'),
        node('b', 'a', '02'),
        node('c', 'b', '03'),
        node('b1', 'a', '04'),
      ];
      expect(getActivePath(nodes, 'b1').map((n) => n.id)).toEqual(['a', 'b1']);
    });

    it('null leaf falls back to overall latest', () => {
      const nodes = [
        node('a', null, '01'),
        node('b', 'a', '02'),
        node('c', 'b', '03'),
        node('b1', 'a', '10'), // latest
      ];
      expect(getActivePath(nodes, null).map((n) => n.id)).toEqual(['a', 'b1']);
    });

    it('missing leaf id falls back to overall latest', () => {
      const nodes = [
        node('a', null, '01'),
        node('b', 'a', '02'),
      ];
      expect(getActivePath(nodes, 'ghost').map((n) => n.id)).toEqual(['a', 'b']);
    });

    it('cycle is broken by guard (no infinite loop)', () => {
      // a ↔ b (malformed)
      const bad = [
        { id: 'a', parent_id: 'b', created_at: 't1' },
        { id: 'b', parent_id: 'a', created_at: 't2' },
      ];
      const path = getActivePath(bad, 'a');
      expect(path.length).toBeLessThanOrEqual(2);
    });
  });

  describe('isOnBranch', () => {
    it('false for empty tree', () => {
      expect(isOnBranch([], new Set())).toBe(false);
    });

    it('false when active path = entire tree (pure main line)', () => {
      const nodes = [node('a', null, '01'), node('b', 'a', '02'), node('c', 'b', '03')];
      const path = new Set(['a', 'b', 'c']);
      expect(isOnBranch(nodes, path)).toBe(false);
    });

    it('true when a sibling exists outside the active path', () => {
      // a → b → c (main); plus branch b1 off a
      const nodes = [
        node('a', null, '01'),
        node('b', 'a', '02'),
        node('c', 'b', '03'),
        node('b1', 'a', '04'),
      ];
      // Active path = [a, c] branch... wait that's not a valid path. Use [a, b, c].
      const pathMain = new Set(['a', 'b', 'c']);
      expect(isOnBranch(nodes, pathMain)).toBe(true); // b1 exists outside

      const pathBranch = new Set(['a', 'b1']);
      expect(isOnBranch(nodes, pathBranch)).toBe(true); // b, c exist outside
    });

    it('stays true right after a branch iteration is appended (regression from RefineStep bug)', () => {
      // Scenario: user branches from 'a', then iterates on the branch to create b1.
      // b1 is now the most recently created, so the old WRONG definition would
      // think we're back on the main line. The correct one still detects branch
      // because 'b' (old main-line child) is still outside the path [a, b1].
      const nodes = [
        node('a', null, '01'),
        node('b', 'a', '02'),
        node('b1', 'a', '10'), // branched + newer
      ];
      const pathBranch = new Set(['a', 'b1']);
      expect(isOnBranch(nodes, pathBranch)).toBe(true);
    });
  });

  describe('overallLatest', () => {
    it('picks max created_at', () => {
      const nodes = [node('a', null, '01'), node('b', 'a', '05'), node('c', 'b', '03')];
      expect(overallLatest(nodes)?.id).toBe('b');
    });

    it('undefined on empty', () => {
      expect(overallLatest([])).toBeUndefined();
    });
  });

  describe('childIdsOf', () => {
    it('returns root children for parent=null', () => {
      const nodes = [
        node('a', null, '01'),
        node('z', null, '02'),
        node('b', 'a', '03'),
      ];
      expect(childIdsOf(nodes, null).sort()).toEqual(['a', 'z']);
    });

    it('returns specific parent children', () => {
      const nodes = [
        node('a', null, '01'),
        node('b', 'a', '02'),
        node('c', 'a', '03'),
        node('d', 'b', '04'),
      ];
      expect(childIdsOf(nodes, 'a').sort()).toEqual(['b', 'c']);
      expect(childIdsOf(nodes, 'b')).toEqual(['d']);
    });
  });

  describe('buildTree', () => {
    it('builds a forest with nested children sorted by created_at', () => {
      const nodes = [
        node('a', null, '01'),
        node('b', 'a', '02'),
        node('b1', 'a', '10'),
        node('c', 'b', '03'),
      ];
      const tree = buildTree(nodes);
      expect(tree).toHaveLength(1);
      expect(tree[0].data.id).toBe('a');
      expect(tree[0].children.map((n) => n.data.id)).toEqual(['b', 'b1']); // sorted by time
      expect(tree[0].children[0].children.map((n) => n.data.id)).toEqual(['c']);
    });

    it('orphaned nodes become roots', () => {
      const nodes = [
        node('a', null, '01'),
        node('orphan', 'ghost', '02'),
      ];
      const tree = buildTree(nodes);
      expect(tree).toHaveLength(2);
      expect(tree.map((n) => n.data.id).sort()).toEqual(['a', 'orphan']);
    });
  });
});

/**
 * Version tree utilities — pure functions shared across feature areas.
 *
 * Any domain object (RefineIteration, Draft, ...) that exposes {id, parent_id,
 * created_at} can be walked, pathed, and branch-detected with these helpers.
 * Keeping them shape-agnostic lets the VersionHistoryDrawer stay generic and
 * fixes one class of bug I hit earlier: the definition of "on a branch".
 *
 *   WRONG (earlier RefineStep version):
 *     isOnBranch = (activeLeaf.id !== mostRecentlyCreated.id)
 *     — fails right after adding an iteration to a non-main branch, because
 *       the new node IS the most recently created and the banner disappears.
 *
 *   RIGHT (used here):
 *     isOnBranch = (any node exists that isn't on the active path)
 *     — stays true as long as there's a sibling lineage somewhere in the tree.
 */

export interface VersionNode {
  id: string;
  parent_id: string | null;
  created_at: string;
}

export interface TreeHierarchyNode<T extends VersionNode> {
  data: T;
  children: TreeHierarchyNode<T>[];
}

/**
 * Walk from `activeLeafId` up to the root, returning the path root-first.
 * If `activeLeafId` is null or points to a missing node, falls back to the
 * single most recently created node and walks up from there.
 */
export function getActivePath<T extends VersionNode>(
  nodes: T[],
  activeLeafId: string | null | undefined,
): T[] {
  if (nodes.length === 0) return [];
  const byId = new Map<string, T>();
  for (const n of nodes) byId.set(n.id, n);

  let cur: T | undefined = activeLeafId ? byId.get(activeLeafId) : undefined;
  if (!cur) {
    cur = overallLatest(nodes);
  }
  if (!cur) return [];

  const path: T[] = [];
  const guard = new Set<string>();
  let safety = nodes.length + 1;
  while (cur && !guard.has(cur.id) && safety-- > 0) {
    guard.add(cur.id);
    path.unshift(cur);
    if (!cur.parent_id) break;
    cur = byId.get(cur.parent_id);
  }
  return path;
}

/**
 * True when the active path is *not* the whole tree — i.e. when there exists
 * at least one node outside the active path. This is the correct definition
 * of "user is working off a branch".
 */
export function isOnBranch<T extends VersionNode>(
  nodes: T[],
  activePathIds: Set<string>,
): boolean {
  if (nodes.length === 0) return false;
  for (const n of nodes) {
    if (!activePathIds.has(n.id)) return true;
  }
  return false;
}

/** Pick the single most recently created node (by ISO created_at). */
export function overallLatest<T extends VersionNode>(nodes: T[]): T | undefined {
  if (nodes.length === 0) return undefined;
  let latest = nodes[0];
  for (let i = 1; i < nodes.length; i++) {
    if ((nodes[i].created_at || '').localeCompare(latest.created_at || '') > 0) {
      latest = nodes[i];
    }
  }
  return latest;
}

/** Return the id of every child of `parentId` (parentId=null for root children). */
export function childIdsOf<T extends VersionNode>(
  nodes: T[],
  parentId: string | null,
): string[] {
  return nodes.filter((n) => (n.parent_id ?? null) === parentId).map((n) => n.id);
}

/**
 * Build a root-first tree from a flat list of nodes. Siblings are sorted by
 * created_at ascending so the earliest (usually main-line) child comes first.
 */
export function buildTree<T extends VersionNode>(nodes: T[]): TreeHierarchyNode<T>[] {
  const wrappers = new Map<string, TreeHierarchyNode<T>>();
  for (const n of nodes) {
    wrappers.set(n.id, { data: n, children: [] });
  }
  const roots: TreeHierarchyNode<T>[] = [];
  for (const n of nodes) {
    const wrapper = wrappers.get(n.id);
    if (!wrapper) continue;
    const parentId = n.parent_id;
    if (!parentId) {
      roots.push(wrapper);
      continue;
    }
    const parent = wrappers.get(parentId);
    if (parent) {
      parent.children.push(wrapper);
    } else {
      // Orphaned — treat as root so it still renders.
      roots.push(wrapper);
    }
  }
  const sortRec = (list: TreeHierarchyNode<T>[]) => {
    list.sort((a, b) => (a.data.created_at || '').localeCompare(b.data.created_at || ''));
    for (const n of list) sortRec(n.children);
  };
  sortRec(roots);
  return roots;
}

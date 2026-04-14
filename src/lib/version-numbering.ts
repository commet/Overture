/**
 * Version label arithmetic for RefineLoop iteration tree.
 *
 * Shapes we support:
 *   "v0"          virtual root (the original_plan)
 *   "v0.1"        first iteration on main line
 *   "v0.3"        later main line node
 *   "v0.1.1"      branch off v0.1 (happens when v0.1 already has a main child)
 *   "v1.0"        promoted from some v0.N; from here onward main line is v1.1, v1.2...
 *   "v1.2.1"      branch off v1.2
 *
 * Rules:
 *   - nextChildLabel(parent, existingChildren):
 *       If parent has no children yet → continue parent's main line by
 *       incrementing the last numeric tier ("v0.3" → "v0.4", "v1.0" → "v1.1").
 *       If parent already has children → append a new sub-tier
 *       ("v0.3" with 1 child → "v0.3.1", with 2 children → "v0.3.2").
 *   - promoteToMajor("v0.3") → "v1.0". Only relabels that single node;
 *     subsequent main-line children will be "v1.1", "v1.2"...
 */

export const ROOT_LABEL = 'v0';

/** Parse "v0.3.1" into [0, 3, 1]. Accepts plain "v0" → [0]. */
export function parseLabel(label: string): number[] {
  const m = /^v(\d+(?:\.\d+)*)$/.exec(label.trim());
  if (!m) return [0];
  return m[1].split('.').map((s) => parseInt(s, 10));
}

export function formatLabel(parts: number[]): string {
  return 'v' + parts.join('.');
}

/** "v0.3" → "v0.4"; "v1.0" → "v1.1"; "v0.3.1" → "v0.3.2"; "v0" → "v0.1". */
export function incrementLastTier(label: string): string {
  const parts = parseLabel(label);
  if (parts.length === 1) {
    // "v0" → "v0.1", "v1" → "v1.1" (shouldn't normally happen for v1)
    return formatLabel([...parts, 1]);
  }
  const next = [...parts];
  next[next.length - 1] += 1;
  return formatLabel(next);
}

/**
 * Decide the label for a new iteration whose parent has `existingChildren`
 * already under it. `parentLabel` may be the virtual ROOT_LABEL "v0" when
 * attaching directly to original_plan.
 */
export function nextChildLabel(parentLabel: string, existingChildren: string[]): string {
  if (existingChildren.length === 0) {
    // Main line continues: increment the last tier of parent.
    // Special case: parent is virtual root "v0" → first child is "v0.1".
    return incrementLastTier(parentLabel);
  }
  // Parent already has at least one child → we're branching.
  // The branch label is parentLabel + "." + (branchCount + 1), where
  // branchCount = number of existing children that are BRANCH children
  // (i.e. labels that start with parentLabel + ".").
  // The first, main-line child (e.g. "v0.4" off "v0.3") does NOT match that
  // prefix, so it's excluded from the branch count automatically.
  const branchPrefix = parentLabel + '.';
  const branchCount = existingChildren.filter((c) => c.startsWith(branchPrefix)).length;
  return branchPrefix + (branchCount + 1);
}

/**
 * Relabel a node to the next major version.
 * "v0.3"     → "v1.0"
 * "v0.3.1"   → "v1.0"  (still v1.0; the node just declares itself the major)
 * "v1.2"     → "v2.0"
 * "v1.2.1"   → "v2.0"
 */
export function promoteToMajor(label: string): string {
  const parts = parseLabel(label);
  const major = (parts[0] ?? 0) + 1;
  return formatLabel([major, 0]);
}

/** True if label looks like a pre-release (v0.x). */
export function isPreRelease(label: string): boolean {
  const parts = parseLabel(label);
  return (parts[0] ?? 0) === 0;
}

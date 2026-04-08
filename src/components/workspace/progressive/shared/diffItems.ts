/* ═══ Diff utility — compare two string arrays and mark new/same/removed ═══ */

export type DiffStatus = 'new' | 'same' | 'removed';
export interface DiffItem { text: string; status: DiffStatus }

export function diffItems(prev: string[], curr: string[]): DiffItem[] {
  const prevSet = new Set(prev);
  const currSet = new Set(curr);
  const result: DiffItem[] = [];
  // Removed items first (brief flash)
  for (const item of prev) {
    if (!currSet.has(item)) result.push({ text: item, status: 'removed' });
  }
  // Current items
  for (const item of curr) {
    result.push({ text: item, status: prevSet.has(item) ? 'same' : 'new' });
  }
  return result;
}

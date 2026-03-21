vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), auth: { getSession: vi.fn() } },
  getCurrentUserId: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@/lib/storage', () => ({
  getStorage: vi.fn((_key: string, fallback: unknown) => fallback),
  setStorage: vi.fn(),
}));

vi.mock('@/lib/error-handler', () => ({
  handleError: vi.fn(),
}));

import { mergeByTimestamp } from '@/lib/db';

interface TestItem {
  id: string;
  name: string;
  updated_at?: string;
  created_at?: string;
}

describe('mergeByTimestamp', () => {
  /* ── Empty arrays ── */

  it('returns empty array when both local and remote are empty', () => {
    const result = mergeByTimestamp<TestItem>([], []);
    expect(result).toEqual([]);
  });

  it('returns local items when remote is empty', () => {
    const local: TestItem[] = [
      { id: '1', name: 'Local A', updated_at: '2025-01-01T00:00:00Z' },
    ];
    const result = mergeByTimestamp(local, []);
    expect(result).toEqual(local);
  });

  it('returns remote items when local is empty', () => {
    const remote: TestItem[] = [
      { id: '1', name: 'Remote A', updated_at: '2025-01-01T00:00:00Z' },
    ];
    const result = mergeByTimestamp([], remote);
    expect(result).toEqual(remote);
  });

  /* ── Items only in one side ── */

  it('keeps items only in local', () => {
    const local: TestItem[] = [
      { id: '1', name: 'Local only', updated_at: '2025-01-01T00:00:00Z' },
    ];
    const remote: TestItem[] = [
      { id: '2', name: 'Remote only', updated_at: '2025-01-01T00:00:00Z' },
    ];
    const result = mergeByTimestamp(local, remote);
    expect(result).toHaveLength(2);
    expect(result.find(i => i.id === '1')?.name).toBe('Local only');
  });

  it('keeps items only in remote', () => {
    const local: TestItem[] = [
      { id: '1', name: 'Local only', updated_at: '2025-01-01T00:00:00Z' },
    ];
    const remote: TestItem[] = [
      { id: '2', name: 'Remote only', updated_at: '2025-01-01T00:00:00Z' },
    ];
    const result = mergeByTimestamp(local, remote);
    expect(result).toHaveLength(2);
    expect(result.find(i => i.id === '2')?.name).toBe('Remote only');
  });

  /* ── Same ID, timestamp comparison ── */

  it('picks remote when remote is newer', () => {
    const local: TestItem[] = [
      { id: '1', name: 'Old local', updated_at: '2025-01-01T00:00:00Z' },
    ];
    const remote: TestItem[] = [
      { id: '1', name: 'New remote', updated_at: '2025-06-01T00:00:00Z' },
    ];
    const result = mergeByTimestamp(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('New remote');
  });

  it('picks local when local is newer', () => {
    const local: TestItem[] = [
      { id: '1', name: 'New local', updated_at: '2025-06-01T00:00:00Z' },
    ];
    const remote: TestItem[] = [
      { id: '1', name: 'Old remote', updated_at: '2025-01-01T00:00:00Z' },
    ];
    const result = mergeByTimestamp(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('New local');
  });

  /* ── Fallbacks ── */

  it('falls back to created_at when updated_at is missing', () => {
    const local: TestItem[] = [
      { id: '1', name: 'Local old', created_at: '2025-01-01T00:00:00Z' },
    ];
    const remote: TestItem[] = [
      { id: '1', name: 'Remote newer', created_at: '2025-06-01T00:00:00Z' },
    ];
    const result = mergeByTimestamp(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Remote newer');
  });

  it('local wins in tie when both timestamps are missing', () => {
    const local: TestItem[] = [
      { id: '1', name: 'Local wins' },
    ];
    const remote: TestItem[] = [
      { id: '1', name: 'Remote loses' },
    ];
    const result = mergeByTimestamp(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Local wins');
  });

  /* ── Multiple items ── */

  it('merges multiple items correctly', () => {
    const local: TestItem[] = [
      { id: '1', name: 'Local v1', updated_at: '2025-01-01T00:00:00Z' },
      { id: '2', name: 'Local only', updated_at: '2025-03-01T00:00:00Z' },
      { id: '3', name: 'Local newer', updated_at: '2025-06-01T00:00:00Z' },
    ];
    const remote: TestItem[] = [
      { id: '1', name: 'Remote v2', updated_at: '2025-06-01T00:00:00Z' },
      { id: '3', name: 'Remote older', updated_at: '2025-01-01T00:00:00Z' },
      { id: '4', name: 'Remote only', updated_at: '2025-04-01T00:00:00Z' },
    ];
    const result = mergeByTimestamp(local, remote);

    expect(result).toHaveLength(4);
    expect(result.find(i => i.id === '1')?.name).toBe('Remote v2');
    expect(result.find(i => i.id === '2')?.name).toBe('Local only');
    expect(result.find(i => i.id === '3')?.name).toBe('Local newer');
    expect(result.find(i => i.id === '4')?.name).toBe('Remote only');
  });
});

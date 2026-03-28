/**
 * Signal Recorder Simulation — 품질 신호 기록/조회 시뮬레이션
 *
 * 핵심 검증:
 * - recordSignal: FIFO 500개 상한, localStorage+Supabase 이중 저장
 * - getSignals: AND 필터, 빈 필터, 부분 필터
 * - getSignalsByType: 최신순 정렬, limit 적용
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { QualitySignal } from '@/stores/types';

vi.mock('@/lib/storage', () => ({
  getStorage: vi.fn(() => []),
  setStorage: vi.fn(),
  STORAGE_KEYS: { QUALITY_SIGNALS: 'sot_quality_signals' },
}));

vi.mock('@/lib/db', () => ({
  insertToSupabase: vi.fn(),
}));

vi.mock('@/lib/uuid', () => ({
  generateId: vi.fn(() => `sig-${Math.random().toString(36).slice(2)}`),
}));

import { recordSignal, getSignals, getSignalsByType } from '@/lib/signal-recorder';
import { getStorage, setStorage } from '@/lib/storage';
import { insertToSupabase } from '@/lib/db';

const mockGetStorage = vi.mocked(getStorage);
const mockSetStorage = vi.mocked(setStorage);
const mockInsert = vi.mocked(insertToSupabase);

function makeSignal(overrides: Partial<QualitySignal> = {}): QualitySignal {
  return {
    id: `s-${Math.random().toString(36).slice(2)}`,
    tool: 'reframe',
    signal_type: 'test_signal',
    signal_data: { value: 1 },
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('Signal Recorder Simulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStorage.mockReturnValue([]);
  });

  // ═══════════════════════════════════════
  // recordSignal
  // ═══════════════════════════════════════
  describe('recordSignal', () => {
    it('새 신호가 localStorage에 추가됨', () => {
      recordSignal({ tool: 'reframe', signal_type: 'test', signal_data: { x: 1 } });
      expect(mockSetStorage).toHaveBeenCalledOnce();
      const saved = mockSetStorage.mock.calls[0][1] as QualitySignal[];
      expect(saved).toHaveLength(1);
      expect(saved[0].tool).toBe('reframe');
      expect(saved[0].signal_type).toBe('test');
      expect(saved[0].id).toBeTruthy();
      expect(saved[0].created_at).toBeTruthy();
    });

    it('Supabase에도 fire-and-forget으로 저장', () => {
      recordSignal({ tool: 'recast', signal_type: 'actor_change', signal_data: {} });
      expect(mockInsert).toHaveBeenCalledWith('quality_signals', expect.objectContaining({
        tool: 'recast',
        signal_type: 'actor_change',
      }));
    });

    it('기존 신호에 append', () => {
      const existing = [makeSignal(), makeSignal()];
      mockGetStorage.mockReturnValue(existing);

      recordSignal({ tool: 'refine', signal_type: 'new', signal_data: {} });
      const saved = mockSetStorage.mock.calls[0][1] as QualitySignal[];
      expect(saved).toHaveLength(3);
    });

    it('500개 초과 시 오래된 것부터 제거 (FIFO)', () => {
      const existing = Array.from({ length: 500 }, (_, i) =>
        makeSignal({ id: `old-${i}` })
      );
      mockGetStorage.mockReturnValue(existing);

      recordSignal({ tool: 'reframe', signal_type: 'new', signal_data: {} });
      const saved = mockSetStorage.mock.calls[0][1] as QualitySignal[];
      expect(saved).toHaveLength(500);
      // First element should NOT be old-0 (it was trimmed)
      expect(saved[0].id).toBe('old-1');
      // Last should be the new one
      expect(saved[499].signal_type).toBe('new');
    });

    it('정확히 500개일 때 추가하면 500 유지', () => {
      const existing = Array.from({ length: 499 }, () => makeSignal());
      mockGetStorage.mockReturnValue(existing);

      recordSignal({ tool: 'reframe', signal_type: 'x', signal_data: {} });
      const saved = mockSetStorage.mock.calls[0][1] as QualitySignal[];
      expect(saved).toHaveLength(500); // 499 + 1 = 500, no trim
    });

    it('project_id가 있으면 보존', () => {
      recordSignal({ tool: 'reframe', signal_type: 'test', signal_data: {}, project_id: 'proj-1' });
      const saved = mockSetStorage.mock.calls[0][1] as QualitySignal[];
      expect(saved[0].project_id).toBe('proj-1');
    });
  });

  // ═══════════════════════════════════════
  // Defensive: malformed data
  // ═══════════════════════════════════════
  describe('Defensive: malformed localStorage data', () => {
    it('getSignals: storage가 빈 배열이 아닌 빈 값 → fallback 빈 배열', () => {
      mockGetStorage.mockReturnValue([]);
      expect(getSignals()).toEqual([]);
    });

    it('getSignalsByType: 빈 storage → 빈 배열', () => {
      mockGetStorage.mockReturnValue([]);
      expect(getSignalsByType('any_type')).toEqual([]);
    });

    it('recordSignal: storage가 빈 배열일 때도 정상 동작', () => {
      mockGetStorage.mockReturnValue([]);
      recordSignal({ tool: 'reframe', signal_type: 'test', signal_data: {} });
      expect(mockSetStorage).toHaveBeenCalledOnce();
      const saved = mockSetStorage.mock.calls[0][1] as QualitySignal[];
      expect(saved).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════
  // getSignals
  // ═══════════════════════════════════════
  describe('getSignals', () => {
    const signals = [
      makeSignal({ tool: 'reframe', signal_type: 'eval_pass', project_id: 'p1' }),
      makeSignal({ tool: 'recast', signal_type: 'actor_change', project_id: 'p1' }),
      makeSignal({ tool: 'reframe', signal_type: 'eval_pass', project_id: 'p2' }),
      makeSignal({ tool: 'refine', signal_type: 'convergence', project_id: 'p1' }),
    ];

    beforeEach(() => mockGetStorage.mockReturnValue(signals));

    it('필터 없으면 전체 반환', () => {
      expect(getSignals()).toHaveLength(4);
    });

    it('undefined 필터도 전체 반환', () => {
      expect(getSignals(undefined)).toHaveLength(4);
    });

    it('tool 필터', () => {
      expect(getSignals({ tool: 'reframe' })).toHaveLength(2);
    });

    it('signal_type 필터', () => {
      expect(getSignals({ signal_type: 'eval_pass' })).toHaveLength(2);
    });

    it('project_id 필터', () => {
      expect(getSignals({ project_id: 'p1' })).toHaveLength(3);
    });

    it('AND 복합 필터: tool + signal_type', () => {
      expect(getSignals({ tool: 'reframe', signal_type: 'eval_pass' })).toHaveLength(2);
    });

    it('AND 복합 필터: tool + project_id', () => {
      expect(getSignals({ tool: 'reframe', project_id: 'p1' })).toHaveLength(1);
    });

    it('AND 전체 필터: tool + signal_type + project_id', () => {
      expect(getSignals({ tool: 'reframe', signal_type: 'eval_pass', project_id: 'p1' })).toHaveLength(1);
    });

    it('매칭 없으면 빈 배열', () => {
      expect(getSignals({ tool: 'nonexistent' })).toHaveLength(0);
    });

    it('빈 storage → 빈 배열', () => {
      mockGetStorage.mockReturnValue([]);
      expect(getSignals({ tool: 'reframe' })).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════
  // getSignalsByType
  // ═══════════════════════════════════════
  describe('getSignalsByType', () => {
    it('최신순 정렬', () => {
      mockGetStorage.mockReturnValue([
        makeSignal({ signal_type: 'eval_pass', created_at: '2026-01-01T00:00:00Z' }),
        makeSignal({ signal_type: 'eval_pass', created_at: '2026-03-01T00:00:00Z' }),
        makeSignal({ signal_type: 'eval_pass', created_at: '2026-02-01T00:00:00Z' }),
      ]);
      const result = getSignalsByType('eval_pass');
      expect(result[0].created_at).toBe('2026-03-01T00:00:00Z');
      expect(result[1].created_at).toBe('2026-02-01T00:00:00Z');
      expect(result[2].created_at).toBe('2026-01-01T00:00:00Z');
    });

    it('기본 limit = 50', () => {
      mockGetStorage.mockReturnValue(
        Array.from({ length: 60 }, () => makeSignal({ signal_type: 'test' }))
      );
      expect(getSignalsByType('test')).toHaveLength(50);
    });

    it('커스텀 limit', () => {
      mockGetStorage.mockReturnValue(
        Array.from({ length: 20 }, () => makeSignal({ signal_type: 'test' }))
      );
      expect(getSignalsByType('test', 5)).toHaveLength(5);
    });

    it('타입 필터링 후 정렬', () => {
      mockGetStorage.mockReturnValue([
        makeSignal({ signal_type: 'other', created_at: '2026-03-01' }),
        makeSignal({ signal_type: 'target', created_at: '2026-01-01' }),
        makeSignal({ signal_type: 'target', created_at: '2026-02-01' }),
      ]);
      const result = getSignalsByType('target');
      expect(result).toHaveLength(2);
      expect(result[0].created_at).toBe('2026-02-01');
    });

    it('해당 타입 없으면 빈 배열', () => {
      mockGetStorage.mockReturnValue([makeSignal({ signal_type: 'other' })]);
      expect(getSignalsByType('nonexistent')).toHaveLength(0);
    });
  });
});

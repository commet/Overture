vi.mock('@/lib/db', () => ({
  insertToSupabase: vi.fn(),
}));

vi.mock('@/lib/storage', () => ({
  getStorage: vi.fn((_key: string, fallback: unknown) => fallback),
  setStorage: vi.fn(),
  STORAGE_KEYS: { SETTINGS: 'sot_settings' },
}));

import type { InterviewSignals, ReframingStrategy } from '@/lib/reframing-strategy';
import { selectReframingStrategy, applyReframingStrategy } from '@/lib/reframing-strategy';

/* ────────────────────────────────────
   selectReframingStrategy
   ──────────────────────────────────── */

describe('selectReframingStrategy', () => {
  it('returns challenge_existence for uncertainty=why + success=unclear', () => {
    const signals: InterviewSignals = { uncertainty: 'why', success: 'unclear' };
    expect(selectReframingStrategy(signals)).toBe('challenge_existence');
  });

  it('returns challenge_existence for uncertainty=why + origin=top-down', () => {
    const signals: InterviewSignals = { uncertainty: 'why', origin: 'top-down' };
    expect(selectReframingStrategy(signals)).toBe('challenge_existence');
  });

  it('returns diagnose_root for origin=fire', () => {
    const signals: InterviewSignals = { origin: 'fire' };
    expect(selectReframingStrategy(signals)).toBe('diagnose_root');
  });

  it('returns diagnose_root for uncertainty=what + success=risk', () => {
    const signals: InterviewSignals = { uncertainty: 'what', success: 'risk' };
    expect(selectReframingStrategy(signals)).toBe('diagnose_root');
  });

  it('returns narrow_scope for uncertainty=how', () => {
    const signals: InterviewSignals = { uncertainty: 'how' };
    expect(selectReframingStrategy(signals)).toBe('narrow_scope');
  });

  it('returns narrow_scope for uncertainty=none', () => {
    const signals: InterviewSignals = { uncertainty: 'none' };
    expect(selectReframingStrategy(signals)).toBe('narrow_scope');
  });

  it('returns narrow_scope for origin=self + success=measurable', () => {
    const signals: InterviewSignals = { origin: 'self', success: 'measurable' };
    expect(selectReframingStrategy(signals)).toBe('narrow_scope');
  });

  it('returns redirect_angle as fallback', () => {
    const signals: InterviewSignals = { origin: 'external', success: 'opportunity' };
    expect(selectReframingStrategy(signals)).toBe('redirect_angle');
  });

  it('returns redirect_angle for empty signals', () => {
    const signals: InterviewSignals = {};
    expect(selectReframingStrategy(signals)).toBe('redirect_angle');
  });
});

/* ────────────────────────────────────
   applyReframingStrategy
   ──────────────────────────────────── */

describe('applyReframingStrategy', () => {
  const basePrompt = '기본 시스템 프롬프트입니다.';

  it('appends strategy prompt to base prompt', () => {
    const result = applyReframingStrategy(basePrompt, 'challenge_existence');
    expect(result).toContain(basePrompt);
    expect(result.length).toBeGreaterThan(basePrompt.length);
  });

  it('challenge_existence strategy contains Korean guidance text', () => {
    const result = applyReframingStrategy(basePrompt, 'challenge_existence');
    expect(result).toContain('과제 존재 의심');
    expect(result).toContain('이 과제를 안 하면 어떻게 되는가');
  });

  it('narrow_scope strategy contains Korean guidance text', () => {
    const result = applyReframingStrategy(basePrompt, 'narrow_scope');
    expect(result).toContain('범위 집중');
    expect(result).toContain('가장 먼저 검증해야 할 한 가지');
  });

  it('diagnose_root strategy contains Korean guidance text', () => {
    const result = applyReframingStrategy(basePrompt, 'diagnose_root');
    expect(result).toContain('근본 원인 진단');
    expect(result).toContain('왜 이 문제가 지금 나타났는가');
  });

  it('redirect_angle strategy contains Korean guidance text', () => {
    const result = applyReframingStrategy(basePrompt, 'redirect_angle');
    expect(result).toContain('관점 전환');
    expect(result).toContain('다른 이해관계자의 시점');
  });

  it('each strategy produces different output', () => {
    const strategies: ReframingStrategy[] = [
      'challenge_existence',
      'narrow_scope',
      'diagnose_root',
      'redirect_angle',
    ];

    const outputs = strategies.map((s) => applyReframingStrategy(basePrompt, s));

    // All outputs should be unique
    const unique = new Set(outputs);
    expect(unique.size).toBe(strategies.length);
  });
});

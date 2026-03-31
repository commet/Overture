/**
 * LLM Pure Functions Simulation — parseJSON / validateShape 시뮬레이션
 *
 * 핵심 검증:
 * 1. parseJSON — JSON 파싱, markdown 펜스, 혼합 텍스트, 크기 제한, 유니코드
 * 2. validateShape — 스키마 검증, 타입 불일치, optional 필드, 에러 메시지, 기본값, coerce
 */

import { describe, it, expect, vi } from 'vitest';

// ── Mocks (before module import) ──

vi.mock('@/lib/storage', () => ({
  getStorage: vi.fn((_key: string, fallback: unknown) => fallback),
  setStorage: vi.fn(),
  STORAGE_KEYS: { SETTINGS: 'sot_settings' },
}));

vi.mock('@/lib/db', () => ({
  insertToSupabase: vi.fn(),
}));

import { parseJSON, validateShape, LLMError } from '@/lib/llm';

// ═══════════════════════════════════════
// parseJSON
// ═══════════════════════════════════════
describe('parseJSON', () => {
  it('유효한 JSON 객체를 직접 파싱', () => {
    const result = parseJSON<{ name: string }>('{"name":"test"}');
    expect(result).toEqual({ name: 'test' });
  });

  it('markdown 펜스로 감싼 JSON 파싱', () => {
    const input = '```json\n{"score": 85, "label": "good"}\n```';
    const result = parseJSON<{ score: number; label: string }>(input);
    expect(result).toEqual({ score: 85, label: 'good' });
  });

  it('텍스트에 둘러싸인 JSON 추출', () => {
    const input = 'Here is the result: {"findings": ["a","b"], "count": 2} — end of output';
    const result = parseJSON<{ findings: string[]; count: number }>(input);
    expect(result).toEqual({ findings: ['a', 'b'], count: 2 });
  });

  it('비객체 원시값(number)에서 에러 발생', () => {
    expect(() => parseJSON('42')).toThrow('객체가 아닌');
  });

  it('비객체 원시값(string)에서 에러 발생', () => {
    expect(() => parseJSON('"hello"')).toThrow('객체가 아닌');
  });

  it('비객체 원시값(null)에서 에러 발생', () => {
    expect(() => parseJSON('null')).toThrow('객체가 아닌');
  });

  it('비객체 원시값(boolean)에서 에러 발생', () => {
    expect(() => parseJSON('true')).toThrow('객체가 아닌');
  });

  it('배열은 typeof === "object"이므로 통과', () => {
    const result = parseJSON<string[]>('["a","b","c"]');
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('JSON이 없는 일반 텍스트에서 에러 발생', () => {
    expect(() => parseJSON('This is just plain text without any JSON')).toThrow(
      'JSON 파싱 실패'
    );
  });

  it('200KB 초과 응답에서 에러 발생', () => {
    const oversized = '{"data":"' + 'x'.repeat(200_001) + '"}';
    expect(() => parseJSON(oversized)).toThrow('너무 큽니다');
  });

  it('중첩된 JSON 객체 파싱', () => {
    const input = JSON.stringify({
      analysis: {
        risks: [{ id: 1, severity: 'high' }],
        summary: { total: 1, critical: 0 },
      },
    });
    const result = parseJSON<{ analysis: { risks: { id: number }[]; summary: { total: number } } }>(input);
    expect(result.analysis.risks).toHaveLength(1);
    expect(result.analysis.summary.total).toBe(1);
  });

  it('유니코드/한글 문자가 포함된 JSON 파싱', () => {
    const input = '{"이름": "테스트 사용자", "결과": "성공", "emoji": "🎯"}';
    const result = parseJSON<{ 이름: string; 결과: string; emoji: string }>(input);
    expect(result.이름).toBe('테스트 사용자');
    expect(result.결과).toBe('성공');
    expect(result.emoji).toBe('🎯');
  });

  it('빈 객체 {} 파싱', () => {
    const result = parseJSON('{}');
    expect(result).toEqual({});
  });

  it('혼합 콘텐츠에서 첫 번째 JSON 객체 추출', () => {
    const simpleInput = 'Preamble text {"result": "success"} trailing text';
    const result = parseJSON<{ result: string }>(simpleInput);
    expect(result).toEqual({ result: 'success' });
  });

  it('markdown 펜스 없이 코드블록 내 JSON 파싱', () => {
    const input = '```\n{"mode": "proxy"}\n```';
    const result = parseJSON<{ mode: string }>(input);
    expect(result).toEqual({ mode: 'proxy' });
  });

  it('JSON 앞뒤 공백/개행 처리', () => {
    const input = '  \n\n  {"padded": true}  \n\n  ';
    const result = parseJSON<{ padded: boolean }>(input);
    expect(result).toEqual({ padded: true });
  });

  it('LLMError 인스턴스로 에러를 throw', () => {
    try {
      parseJSON('not json at all');
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(LLMError);
      expect((e as LLMError).category).toBe('parse_failure');
    }
  });
});

// ═══════════════════════════════════════
// validateShape
// ═══════════════════════════════════════
describe('validateShape', () => {
  it('스키마에 맞는 유효한 객체 통과', () => {
    const obj = { name: 'Alice', score: 95, tags: ['a', 'b'] };
    const schema = { name: 'string' as const, score: 'number' as const, tags: 'array' as const };
    const result = validateShape(obj, schema);
    expect(result).toEqual(obj);
  });

  it('null/undefined 값 허용 (optional 필드)', () => {
    const obj = { name: null, score: undefined, active: true };
    const schema = {
      name: 'string' as const,
      score: 'number' as const,
      active: 'boolean' as const,
    };
    const result = validateShape(obj, schema);
    expect(result).toEqual(obj);
  });

  it('비객체 전달 시 에러 발생', () => {
    expect(() => validateShape('hello', { x: 'string' })).toThrow('객체가 아닙니다');
    expect(() => validateShape(null, { x: 'string' })).toThrow('객체가 아닙니다');
    expect(() => validateShape(undefined, { x: 'string' })).toThrow('객체가 아닙니다');
    expect(() => validateShape(42, { x: 'number' })).toThrow('객체가 아닙니다');
  });

  it('array 기대에 string이 오면 에러 발생', () => {
    const obj = { items: 'not-an-array' };
    expect(() => validateShape(obj, { items: 'array' })).toThrow('배열');
  });

  it('number 기대에 string이 오면 에러 발생', () => {
    const obj = { count: '42' };
    expect(() => validateShape(obj, { count: 'number' })).toThrow('타입');
  });

  it('string 기대에 number가 오면 에러 발생', () => {
    const obj = { label: 123 };
    expect(() => validateShape(obj, { label: 'string' })).toThrow('타입');
  });

  it('혼합 타입 스키마 통과', () => {
    const obj = {
      title: 'Decision Report',
      score: 88,
      approved: false,
      findings: ['risk-1'],
      metadata: { version: 2 },
    };
    const schema = {
      title: 'string' as const,
      score: 'number' as const,
      approved: 'boolean' as const,
      findings: 'array' as const,
      metadata: 'object' as const,
    };
    const result = validateShape(obj, schema);
    expect(result).toEqual(obj);
  });

  it('빈 객체는 모든 스키마 통과 (모든 필드 optional)', () => {
    const schema = {
      name: 'string' as const,
      count: 'number' as const,
      items: 'array' as const,
    };
    const result = validateShape({}, schema);
    expect(result).toEqual({});
  });

  it('에러 메시지에 필드명 포함', () => {
    const obj = { my_special_field: 'wrong' };
    try {
      validateShape(obj, { my_special_field: 'number' });
      expect.fail('should have thrown');
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain('my_special_field');
    }
  });

  it('boolean 기대에 object가 오면 에러 발생', () => {
    const obj = { flag: { nested: true } };
    expect(() => validateShape(obj, { flag: 'boolean' })).toThrow('타입');
  });

  it('스키마에 없는 추가 필드는 무시하고 통과', () => {
    const obj = { name: 'test', extra: 'ignored' };
    const result = validateShape(obj, { name: 'string' });
    expect(result).toEqual(obj);
  });

  // ── 새로운 기능 테스트: 기본값 ──
  it('FieldSchema의 default로 누락된 필드 채우기', () => {
    const obj = { name: 'test' };
    const result = validateShape(obj, {
      name: 'string',
      tags: { type: 'array', default: [] },
      score: { type: 'number', default: 0 },
    });
    expect(result).toEqual({ name: 'test', tags: [], score: 0 });
  });

  // ── 새로운 기능 테스트: coerce ──
  it('coerce로 문자열 "true"를 boolean으로 변환', () => {
    const obj = { active: 'true' };
    const result = validateShape(obj, {
      active: { type: 'boolean', coerce: true },
    });
    expect(result).toEqual({ active: true });
  });

  it('coerce로 문자열 "123"을 number로 변환', () => {
    const obj = { count: '123' };
    const result = validateShape(obj, {
      count: { type: 'number', coerce: true },
    });
    expect(result).toEqual({ count: 123 });
  });

  // ── 새로운 기능 테스트: required ──
  it('required 필드 누락 시 에러', () => {
    expect(() => validateShape({}, {
      name: { type: 'string', required: true },
    })).toThrow('누락');
  });

  it('LLMError 인스턴스로 에러를 throw', () => {
    try {
      validateShape(null, { x: 'string' });
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(LLMError);
      expect((e as LLMError).category).toBe('validation');
    }
  });
});

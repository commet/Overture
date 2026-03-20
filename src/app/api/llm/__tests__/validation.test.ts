import { describe, it, expect } from 'vitest';

/**
 * Tests for the input validation logic used in /api/llm and /api/llm/direct.
 * Extracted from route handlers for testability.
 */

const MAX_MESSAGE_LENGTH = 50_000;
const MAX_SYSTEM_LENGTH = 10_000;
const VALID_ROLES = new Set(['user', 'assistant']);

function validateMessages(messages: unknown): messages is Array<{ role: string; content: string }> {
  if (!Array.isArray(messages) || messages.length === 0) return false;
  return messages.every(
    (m: unknown) =>
      typeof m === 'object' && m !== null &&
      'role' in m && VALID_ROLES.has((m as { role: unknown }).role as string) &&
      'content' in m && typeof (m as { content: unknown }).content === 'string' &&
      ((m as { content: string }).content.length <= MAX_MESSAGE_LENGTH)
  );
}

function validateSystem(system: unknown): boolean {
  return typeof system === 'string' && system.length <= MAX_SYSTEM_LENGTH;
}

function validateMaxTokens(input: unknown): number {
  return Math.min(Number(input) || 2000, 4096);
}

function validateApiKey(key: unknown): boolean {
  return typeof key === 'string' && key.startsWith('sk-ant-');
}

// ─── Messages Validation ───

describe('validateMessages', () => {
  it('accepts valid messages', () => {
    expect(validateMessages([{ role: 'user', content: 'hello' }])).toBe(true);
    expect(validateMessages([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
      { role: 'user', content: 'how are you?' },
    ])).toBe(true);
  });

  it('rejects empty array', () => {
    expect(validateMessages([])).toBe(false);
  });

  it('rejects non-array', () => {
    expect(validateMessages('hello')).toBe(false);
    expect(validateMessages(null)).toBe(false);
    expect(validateMessages(undefined)).toBe(false);
    expect(validateMessages(42)).toBe(false);
    expect(validateMessages({})).toBe(false);
  });

  it('rejects invalid roles', () => {
    expect(validateMessages([{ role: 'system', content: 'hi' }])).toBe(false);
    expect(validateMessages([{ role: 'admin', content: 'hi' }])).toBe(false);
    expect(validateMessages([{ role: '', content: 'hi' }])).toBe(false);
  });

  it('rejects non-string content', () => {
    expect(validateMessages([{ role: 'user', content: 123 }])).toBe(false);
    expect(validateMessages([{ role: 'user', content: null }])).toBe(false);
    expect(validateMessages([{ role: 'user', content: ['array'] }])).toBe(false);
  });

  it('rejects oversized content', () => {
    const huge = 'x'.repeat(MAX_MESSAGE_LENGTH + 1);
    expect(validateMessages([{ role: 'user', content: huge }])).toBe(false);
  });

  it('accepts content at exact limit', () => {
    const atLimit = 'x'.repeat(MAX_MESSAGE_LENGTH);
    expect(validateMessages([{ role: 'user', content: atLimit }])).toBe(true);
  });

  it('rejects messages missing required fields', () => {
    expect(validateMessages([{ role: 'user' }])).toBe(false);
    expect(validateMessages([{ content: 'hi' }])).toBe(false);
    expect(validateMessages([{}])).toBe(false);
  });

  it('rejects if any message in array is invalid', () => {
    expect(validateMessages([
      { role: 'user', content: 'valid' },
      { role: 'system', content: 'invalid role' },
    ])).toBe(false);
  });
});

// ─── System Prompt Validation ───

describe('validateSystem', () => {
  it('accepts valid system prompts', () => {
    expect(validateSystem('You are a helpful assistant.')).toBe(true);
    expect(validateSystem('')).toBe(true);
  });

  it('rejects non-strings', () => {
    expect(validateSystem(null)).toBe(false);
    expect(validateSystem(123)).toBe(false);
    expect(validateSystem(undefined)).toBe(false);
  });

  it('rejects oversized system prompts', () => {
    expect(validateSystem('x'.repeat(MAX_SYSTEM_LENGTH + 1))).toBe(false);
  });
});

// ─── maxTokens Validation ───

describe('validateMaxTokens', () => {
  it('defaults to 2000 for falsy values', () => {
    expect(validateMaxTokens(undefined)).toBe(2000);
    expect(validateMaxTokens(null)).toBe(2000);
    expect(validateMaxTokens(0)).toBe(2000);
    expect(validateMaxTokens('')).toBe(2000);
  });

  it('caps at 4096', () => {
    expect(validateMaxTokens(200000)).toBe(4096);
    expect(validateMaxTokens(5000)).toBe(4096);
    expect(validateMaxTokens(4096)).toBe(4096);
  });

  it('passes through valid values', () => {
    expect(validateMaxTokens(1000)).toBe(1000);
    expect(validateMaxTokens(2000)).toBe(2000);
    expect(validateMaxTokens(4000)).toBe(4000);
  });

  it('handles string numbers', () => {
    expect(validateMaxTokens('3000')).toBe(3000);
    expect(validateMaxTokens('999999')).toBe(4096);
  });
});

// ─── API Key Validation ───

describe('validateApiKey', () => {
  it('accepts valid Anthropic keys', () => {
    expect(validateApiKey('sk-ant-api03-abc123')).toBe(true);
  });

  it('rejects invalid formats', () => {
    expect(validateApiKey('')).toBe(false);
    expect(validateApiKey('sk-abc')).toBe(false);
    expect(validateApiKey('not-a-key')).toBe(false);
    expect(validateApiKey(null)).toBe(false);
    expect(validateApiKey(123)).toBe(false);
  });
});

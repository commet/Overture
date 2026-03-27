import { describe, it, expect } from 'vitest';

/**
 * Tests for middleware route matching logic.
 * Verifies public vs protected route classification.
 */

const PUBLIC_PATHS = ['/', '/login', '/auth/callback', '/guide', '/demo'];
const PUBLIC_PREFIXES = ['/api/', '/_next/', '/favicon.ico'];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return true;
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

describe('middleware route matching', () => {
  // Public routes — should NOT require auth
  it.each([
    '/',
    '/login',
    '/auth/callback',
    '/guide',
    '/demo',
    '/guide/getting-started',
    '/api/llm',
    '/api/llm/direct',
    '/_next/static/chunk.js',
    '/favicon.ico',
  ])('"%s" is public', (path) => {
    expect(isPublic(path)).toBe(true);
  });

  // Protected routes — should require auth
  it.each([
    '/workspace',
    '/project',
    '/settings',
    '/tools/reframe',
    '/tools/recast',
    '/tools/rehearse',
    '/tools/refine',
    '/tools/synthesize',
  ])('"%s" is protected', (path) => {
    expect(isPublic(path)).toBe(false);
  });

  // Edge cases
  it('"/login-admin" is not matched as public (not an exact match or subpath)', () => {
    expect(isPublic('/login-admin')).toBe(false);
  });

  it('"/guidepost" is not matched as public', () => {
    expect(isPublic('/guidepost')).toBe(false);
  });
});

/**
 * API Security Simulation — validateContentType / validateOrigin 시뮬레이션
 *
 * 핵심 검증:
 * - Content-Type 헤더 검증 (application/json 필수)
 * - CSRF Origin/Referer 검증 (호스트 일치 확인)
 *
 * 외부 서비스 불필요 — NextRequest/NextResponse만 사용.
 * 모듈 모킹 없이 실제 함수를 직접 호출하여 테스트.
 */

import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { validateContentType, validateOrigin } from '@/lib/api-security';

// ═══════════════════════════════════════
// 헬퍼
// ═══════════════════════════════════════

function makeReq(headers: Record<string, string>, url = 'http://localhost:3000/api/test'): NextRequest {
  return new NextRequest(url, { headers });
}

// ═══════════════════════════════════════
// 테스트
// ═══════════════════════════════════════

describe('API Security — validateContentType', () => {

  it('returns null for application/json', () => {
    const req = makeReq({ 'content-type': 'application/json' });
    expect(validateContentType(req)).toBeNull();
  });

  it('returns null for application/json; charset=utf-8', () => {
    const req = makeReq({ 'content-type': 'application/json; charset=utf-8' });
    expect(validateContentType(req)).toBeNull();
  });

  it('returns 415 for text/plain', () => {
    const req = makeReq({ 'content-type': 'text/plain' });
    const res = validateContentType(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(415);
  });

  it('returns 415 for missing content-type', () => {
    const req = makeReq({});
    const res = validateContentType(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(415);
  });

  it('returns 415 for text/html', () => {
    const req = makeReq({ 'content-type': 'text/html' });
    const res = validateContentType(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(415);
  });

  it('returns 415 for APPLICATION/JSON (case sensitive — .includes does not match uppercase)', () => {
    const req = makeReq({ 'content-type': 'APPLICATION/JSON' });
    const res = validateContentType(req);
    // String.prototype.includes is case-sensitive, so uppercase fails
    expect(res).not.toBeNull();
    expect(res!.status).toBe(415);
  });
});

describe('API Security — validateOrigin', () => {

  it('returns null when both Origin and Referer missing (server-to-server)', () => {
    const req = makeReq({ host: 'localhost:3000' });
    expect(validateOrigin(req)).toBeNull();
  });

  it('returns null when Origin matches host', () => {
    const req = makeReq({
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
    });
    expect(validateOrigin(req)).toBeNull();
  });

  it('returns 403 when Origin does not match host', () => {
    const req = makeReq({
      host: 'localhost:3000',
      origin: 'http://evil.com',
    });
    const res = validateOrigin(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it('returns null when Origin missing but Referer matches host', () => {
    const req = makeReq({
      host: 'localhost:3000',
      referer: 'http://localhost:3000/some/page',
    });
    expect(validateOrigin(req)).toBeNull();
  });

  it('returns 403 when Origin missing but Referer does not match', () => {
    const req = makeReq({
      host: 'localhost:3000',
      referer: 'http://evil.com/phishing',
    });
    const res = validateOrigin(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it('returns 403 when Origin is malformed URL', () => {
    const req = makeReq({
      host: 'localhost:3000',
      origin: 'not-a-valid-url',
    });
    const res = validateOrigin(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it('returns 403 when Referer is malformed URL', () => {
    const req = makeReq({
      host: 'localhost:3000',
      referer: ':::bad-referer',
    });
    const res = validateOrigin(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it('returns null for localhost origin matching localhost host', () => {
    const req = makeReq({
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
    });
    expect(validateOrigin(req)).toBeNull();
  });

  it('prioritizes Origin over Referer (Origin matches, Referer does not)', () => {
    const req = makeReq({
      host: 'localhost:3000',
      origin: 'http://localhost:3000',
      referer: 'http://evil.com/page',
    });
    // Origin matches host, so should pass even though Referer is cross-origin
    expect(validateOrigin(req)).toBeNull();
  });

  it('returns 403 for cross-origin with different port', () => {
    const req = makeReq({
      host: 'localhost:3000',
      origin: 'http://localhost:4000',
    });
    const res = validateOrigin(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });
});

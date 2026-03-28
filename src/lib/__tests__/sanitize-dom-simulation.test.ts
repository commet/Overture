// @vitest-environment jsdom

/**
 * Sanitize DOM Simulation — DOMParser 기반 sanitizeHtml 테스트
 *
 * 핵심 검증:
 * - 허용 태그 보존 (p, strong, a, ul/li, table, code 등)
 * - 금지 태그 제거 + 텍스트 보존 (script, iframe, form, svg, style)
 * - 속성 필터링 (허용 속성만 통과, on* 이벤트 핸들러 제거)
 * - URL 검증 (https/mailto만 허용, javascript:/data: 차단)
 * - 보안 강제 (a 태그 rel/target 강제 설정)
 * - 엣지 케이스 (빈 문자열, 일반 텍스트, 깊은 중첩, 주석, 한국어)
 *
 * NOTE: jsdom 환경에서 실행 — DOMParser, document, Node 사용 가능.
 * 서버 사이드 폴백(태그 전체 제거)은 sanitize-simulation.test.ts에서 테스트.
 */

import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '@/lib/sanitize';

describe('Sanitize DOM Simulation (jsdom)', () => {
  // ═══════════════════════════════════════
  // 허용 태그 보존
  // ═══════════════════════════════════════
  describe('허용 태그 보존', () => {
    it('<p> 태그 통과', () => {
      expect(sanitizeHtml('<p>text</p>')).toBe('<p>text</p>');
    });

    it('<strong> 태그 보존', () => {
      expect(sanitizeHtml('<strong>bold</strong>')).toBe('<strong>bold</strong>');
    });

    it('<a> 태그 보존 + rel/target 강제', () => {
      const result = sanitizeHtml('<a href="https://example.com">link</a>');
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('rel="noopener noreferrer"');
      expect(result).toContain('target="_blank"');
      expect(result).toContain('>link</a>');
    });

    it('<ul><li> 목록 보존', () => {
      expect(sanitizeHtml('<ul><li>item</li></ul>')).toBe('<ul><li>item</li></ul>');
    });

    it('<table> 구조 보존', () => {
      const input = '<table><tbody><tr><td>cell</td></tr></tbody></table>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<table>');
      expect(result).toContain('<td>cell</td>');
      expect(result).toContain('</table>');
    });

    it('<code class="language-js"> class 속성 보존', () => {
      const result = sanitizeHtml('<code class="language-js">code</code>');
      expect(result).toBe('<code class="language-js">code</code>');
    });
  });

  // ═══════════════════════════════════════
  // 금지 태그 제거 (텍스트 보존)
  // ═══════════════════════════════════════
  describe('금지 태그 제거 (텍스트 보존)', () => {
    it('<script> 제거 — DOMParser가 script를 head로 이동시키므로 body 비어있음', () => {
      // DOMParser.parseFromString('text/html')는 <script>를 <head>에 배치
      // → doc.body.innerHTML이 빈 문자열
      expect(sanitizeHtml('<script>alert(1)</script>')).toBe('');
    });

    it('<iframe> 제거', () => {
      expect(sanitizeHtml('<iframe src="x"></iframe>')).toBe('');
    });

    it('<form><input> 제거, 텍스트 보존', () => {
      const result = sanitizeHtml('<form><input>submit</form>');
      // form is disallowed — children hoisted. input is void element (also disallowed).
      // DOMParser parses <input> as void element, "submit" is text node after it.
      expect(result).toContain('submit');
      expect(result).not.toContain('<form');
    });

    it('<svg onload="..."> 제거, 텍스트 보존', () => {
      expect(sanitizeHtml('<svg onload="alert(1)">text</svg>')).toBe('text');
    });

    it('<style> 제거 — DOMParser가 style을 head로 이동시키므로 body 비어있음', () => {
      // DOMParser.parseFromString('text/html')는 <style>를 <head>에 배치
      // → doc.body.innerHTML이 빈 문자열
      expect(sanitizeHtml('<style>.x{color:red}</style>')).toBe('');
    });
  });

  // ═══════════════════════════════════════
  // 속성 필터링
  // ═══════════════════════════════════════
  describe('속성 필터링', () => {
    it('<a> onclick 제거, href 보존', () => {
      const result = sanitizeHtml('<a href="https://safe.com" onclick="alert(1)">link</a>');
      expect(result).toContain('href="https://safe.com"');
      expect(result).not.toContain('onclick');
    });

    it('<a href="javascript:..."> href 제거 (unsafe scheme)', () => {
      const result = sanitizeHtml('<a href="javascript:alert(1)">link</a>');
      expect(result).not.toContain('javascript');
      expect(result).toContain('>link</a>');
    });

    it('<a href="data:..."> href 제거 (unsafe scheme)', () => {
      const result = sanitizeHtml('<a href="data:text/html,<script>">link</a>');
      expect(result).not.toContain('data:');
      expect(result).toContain('>link</a>');
    });

    it('<a href="mailto:..."> href 보존 (mailto 허용)', () => {
      const result = sanitizeHtml('<a href="mailto:test@test.com">email</a>');
      expect(result).toContain('href="mailto:test@test.com"');
    });

    it('<div> 비허용 속성 전부 제거', () => {
      const result = sanitizeHtml('<div class="evil" style="color:red" id="x">content</div>');
      expect(result).not.toContain('class=');
      expect(result).not.toContain('style=');
      expect(result).not.toContain('id=');
      expect(result).toBe('<div>content</div>');
    });

    it('<td colspan="2"> colspan 보존', () => {
      const input = '<table><tbody><tr><td colspan="2">wide</td></tr></tbody></table>';
      const result = sanitizeHtml(input);
      expect(result).toContain('colspan="2"');
    });

    it('<img> 태그는 ALLOWED_TAGS에 없으므로 제거', () => {
      const result = sanitizeHtml('<img src="https://img.com/x.png" onerror="alert(1)">');
      expect(result).not.toContain('<img');
      expect(result).not.toContain('onerror');
    });
  });

  // ═══════════════════════════════════════
  // 보안 강제
  // ═══════════════════════════════════════
  describe('보안 강제', () => {
    it('<a> rel/target 자동 추가', () => {
      const result = sanitizeHtml('<a href="https://x.com">link</a>');
      expect(result).toContain('rel="noopener noreferrer"');
      expect(result).toContain('target="_blank"');
    });

    it('<a> 기존 rel/target 덮어쓰기', () => {
      const result = sanitizeHtml('<a href="https://x.com" rel="evil" target="parent">link</a>');
      expect(result).toContain('rel="noopener noreferrer"');
      expect(result).toContain('target="_blank"');
      expect(result).not.toContain('rel="evil"');
      expect(result).not.toContain('target="parent"');
    });

    it('허용 태그 내 중첩 <script> 제거', () => {
      const result = sanitizeHtml('<p><script>x</script></p>');
      expect(result).toBe('<p>x</p>');
    });
  });

  // ═══════════════════════════════════════
  // 이벤트 핸들러 제거
  // ═══════════════════════════════════════
  describe('이벤트 핸들러 제거', () => {
    it('onmouseover 제거', () => {
      const result = sanitizeHtml('<p onmouseover="alert(1)">text</p>');
      expect(result).not.toContain('onmouseover');
      expect(result).toBe('<p>text</p>');
    });

    it('대문자 ONCLICK 제거', () => {
      const result = sanitizeHtml('<div ONCLICK="alert(1)">text</div>');
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('ONCLICK');
      expect(result).toContain('>text</div>');
    });
  });

  // ═══════════════════════════════════════
  // 엣지 케이스
  // ═══════════════════════════════════════
  describe('엣지 케이스', () => {
    it('빈 문자열 → 빈 문자열', () => {
      expect(sanitizeHtml('')).toBe('');
    });

    it('태그 없는 일반 텍스트 그대로 반환', () => {
      expect(sanitizeHtml('just plain text')).toBe('just plain text');
    });

    it('깊은 중첩 — 모든 허용 태그 보존', () => {
      const input = '<div><p><span><b>deep</b></span></p></div>';
      expect(sanitizeHtml(input)).toBe('<div><p><span><b>deep</b></span></p></div>');
    });

    it('HTML 주석 제거', () => {
      const result = sanitizeHtml('<!-- comment --><p>text</p>');
      expect(result).toBe('<p>text</p>');
    });

    it('한국어 콘텐츠 보존', () => {
      const input = '<p>안녕하세요 <strong>중요</strong></p>';
      expect(sanitizeHtml(input)).toBe('<p>안녕하세요 <strong>중요</strong></p>');
    });
  });
});

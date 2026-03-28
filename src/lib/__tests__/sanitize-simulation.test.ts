/**
 * Sanitize Simulation — HTML 살균/이스케이프 시뮬레이션
 *
 * 핵심 검증:
 * - escapeHtml: 5종 특수문자 이스케이프, 혼합 문자열, 한국어, 빈 입력
 * - sanitizeHtml (서버 폴백): 모든 HTML 태그 제거, 텍스트 보존
 *
 * NOTE: sanitizeHtml DOM 경로(DOMParser 기반)는 jsdom 환경이 필요함.
 * vitest 기본 환경이 'node'이므로 여기서는 서버 폴백(태그 전체 제거)만 테스트.
 * DOM 기반 sanitization(허용 태그 유지, 속성 필터, URL 검증 등)은
 * jsdom 또는 happy-dom 환경에서 별도 테스트 필요.
 */

import { describe, it, expect } from 'vitest';
import { sanitizeHtml, escapeHtml } from '@/lib/sanitize';

describe('Sanitize Simulation', () => {
  // ═══════════════════════════════════════
  // escapeHtml — 순수 함수, 환경 무관
  // ═══════════════════════════════════════
  describe('escapeHtml', () => {
    it('& → &amp;', () => {
      expect(escapeHtml('a & b')).toBe('a &amp; b');
    });

    it('< → &lt;', () => {
      expect(escapeHtml('a < b')).toBe('a &lt; b');
    });

    it('> → &gt;', () => {
      expect(escapeHtml('a > b')).toBe('a &gt; b');
    });

    it('" → &quot;', () => {
      expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
    });

    it("' → &#39;", () => {
      expect(escapeHtml("it's")).toBe('it&#39;s');
    });

    it('혼합 특수문자 전부 이스케이프', () => {
      const input = '<script>alert("xss")&\'</script>';
      const expected = '&lt;script&gt;alert(&quot;xss&quot;)&amp;&#39;&lt;/script&gt;';
      expect(escapeHtml(input)).toBe(expected);
    });

    it('빈 문자열 → 빈 문자열', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('특수문자 없는 문자열은 그대로 통과', () => {
      expect(escapeHtml('hello world 123')).toBe('hello world 123');
    });

    it('한국어 텍스트 그대로 유지', () => {
      const korean = '의사결정 하네스: 판단의 가치';
      expect(escapeHtml(korean)).toBe(korean);
    });

    it('한국어 + 특수문자 혼합', () => {
      expect(escapeHtml('결과: <위험> & "주의"')).toBe(
        '결과: &lt;위험&gt; &amp; &quot;주의&quot;'
      );
    });

    it('연속 특수문자 처리', () => {
      expect(escapeHtml('<<<>>>')).toBe('&lt;&lt;&lt;&gt;&gt;&gt;');
    });

    it('연속 앰퍼샌드', () => {
      expect(escapeHtml('&&&&')).toBe('&amp;&amp;&amp;&amp;');
    });

    it('이미 이스케이프된 엔티티를 이중 이스케이프', () => {
      // &amp; 입력 → &amp;amp; 출력 (의도된 동작)
      expect(escapeHtml('&amp;')).toBe('&amp;amp;');
      expect(escapeHtml('&lt;')).toBe('&amp;lt;');
    });

    it('멀티라인 텍스트', () => {
      const input = 'line1 <br>\nline2 & line3\nline4 "end"';
      const expected = 'line1 &lt;br&gt;\nline2 &amp; line3\nline4 &quot;end&quot;';
      expect(escapeHtml(input)).toBe(expected);
    });

    it('탭/공백 포함 문자열', () => {
      expect(escapeHtml('\t<tag>\t')).toBe('\t&lt;tag&gt;\t');
    });

    it('숫자만 있는 문자열', () => {
      expect(escapeHtml('12345')).toBe('12345');
    });

    it('URL 문자열 이스케이프', () => {
      expect(escapeHtml('https://example.com?a=1&b=2')).toBe(
        'https://example.com?a=1&amp;b=2'
      );
    });

    it('HTML 속성값에 들어갈 수 있는 문자열', () => {
      expect(escapeHtml('onclick="alert(1)"')).toBe(
        'onclick=&quot;alert(1)&quot;'
      );
    });
  });

  // ═══════════════════════════════════════
  // sanitizeHtml — 서버 사이드 폴백 (node 환경)
  // ═══════════════════════════════════════
  describe('sanitizeHtml (server-side fallback)', () => {
    it('빈 문자열 → 빈 문자열', () => {
      expect(sanitizeHtml('')).toBe('');
    });

    it('falsy 값(빈 문자열) → 빈 문자열', () => {
      // sanitize.ts: if (!html) return ''
      expect(sanitizeHtml('')).toBe('');
    });

    it('단순 HTML 태그 제거', () => {
      expect(sanitizeHtml('<p>hello</p>')).toBe('hello');
    });

    it('script 태그 제거', () => {
      expect(sanitizeHtml('<script>alert("xss")</script>')).toBe('alert("xss")');
    });

    it('중첩 태그 제거', () => {
      expect(sanitizeHtml('<div><p><strong>bold</strong> text</p></div>')).toBe(
        'bold text'
      );
    });

    it('태그 사이 텍스트 보존', () => {
      expect(sanitizeHtml('before <em>middle</em> after')).toBe(
        'before middle after'
      );
    });

    it('self-closing 태그 제거 (br)', () => {
      expect(sanitizeHtml('line1<br/>line2')).toBe('line1line2');
    });

    it('self-closing 태그 제거 (hr)', () => {
      expect(sanitizeHtml('above<hr/>below')).toBe('abovebelow');
    });

    it('self-closing 태그 — 공백 포함 변형', () => {
      expect(sanitizeHtml('a<br />b<hr />c')).toBe('abc');
    });

    it('속성이 있는 태그 제거', () => {
      expect(
        sanitizeHtml('<a href="https://evil.com" onclick="steal()">click</a>')
      ).toBe('click');
    });

    it('여러 종류 태그 제거', () => {
      const input = '<h1>Title</h1><p>Paragraph</p><ul><li>Item</li></ul>';
      expect(sanitizeHtml(input)).toBe('TitleParagraphItem');
    });

    it('태그 없는 순수 텍스트 그대로 반환', () => {
      const plain = 'This is plain text with no tags';
      expect(sanitizeHtml(plain)).toBe(plain);
    });

    it('한국어 콘텐츠 보존', () => {
      expect(sanitizeHtml('<p>의사결정 <strong>하네스</strong></p>')).toBe(
        '의사결정 하네스'
      );
    });

    it('img 태그 제거', () => {
      expect(sanitizeHtml('<img src="x" onerror="alert(1)">')).toBe('');
    });

    it('iframe 태그 제거', () => {
      expect(sanitizeHtml('<iframe src="evil.com"></iframe>')).toBe('');
    });

    it('style 태그 + 내용 제거', () => {
      // 서버 폴백은 태그만 제거하므로 style 내부 텍스트는 남음
      expect(sanitizeHtml('<style>body{color:red}</style>')).toBe(
        'body{color:red}'
      );
    });

    it('깨진 HTML 태그 처리', () => {
      // 서버 폴백 regex: /<[^>]*>/g — 닫히지 않은 태그는 제거 안 됨
      expect(sanitizeHtml('<p>hello')).toBe('hello');
      expect(sanitizeHtml('hello</p>')).toBe('hello');
    });

    it('부분적으로 닫히지 않은 태그', () => {
      // <div 로 시작하고 >가 없으면 regex 매칭 안 됨 → 텍스트 보존
      expect(sanitizeHtml('text<div')).toBe('text<div');
    });

    it('연속 태그 제거', () => {
      expect(sanitizeHtml('<b><i><u>styled</u></i></b>')).toBe('styled');
    });

    it('테이블 HTML 제거', () => {
      const table =
        '<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>';
      expect(sanitizeHtml(table)).toBe('HeaderCell');
    });

    it('주석 태그 제거', () => {
      // HTML 주석: <!-- comment --> — regex가 매칭함
      expect(sanitizeHtml('before<!-- comment -->after')).toBe('beforeafter');
    });

    it('data 속성이 있는 태그 제거', () => {
      expect(sanitizeHtml('<div data-id="123" class="evil">content</div>')).toBe(
        'content'
      );
    });

    it('SVG 태그 제거', () => {
      expect(sanitizeHtml('<svg><circle cx="50" cy="50" r="40"/></svg>')).toBe('');
    });

    it('form 태그 제거', () => {
      expect(
        sanitizeHtml('<form action="/steal"><input type="text" value="data"></form>')
      ).toBe('');
    });

    it('빈 태그 제거', () => {
      expect(sanitizeHtml('<div></div>')).toBe('');
      expect(sanitizeHtml('<span></span>')).toBe('');
    });

    it('XSS 벡터 — javascript: protocol', () => {
      expect(
        sanitizeHtml('<a href="javascript:alert(1)">click</a>')
      ).toBe('click');
    });

    it('XSS 벡터 — event handler 속성', () => {
      expect(
        sanitizeHtml('<img src=x onerror=alert(1)>')
      ).toBe('');
    });

    it('XSS 벡터 — encoded entities in tag', () => {
      expect(
        sanitizeHtml('<scr<script>ipt>alert(1)</scr</script>ipt>')
      ).toBe('ipt>alert(1)ipt>');
    });

    it('매우 긴 문자열 처리', () => {
      const longText = 'x'.repeat(10000);
      const wrapped = `<div>${longText}</div>`;
      expect(sanitizeHtml(wrapped)).toBe(longText);
    });

    it('특수문자만 포함된 태그 없는 문자열 (꺾쇠 없음)', () => {
      const special = '& " \' © ® ™';
      expect(sanitizeHtml(special)).toBe(special);
    });

    it('꺾쇠가 태그처럼 보이면 regex가 제거', () => {
      // < > 사이에 텍스트가 있으면 regex는 태그로 인식
      expect(sanitizeHtml('& < > "')).toBe('&  "');
    });

    it('마크다운 유사 텍스트 (태그 아님)', () => {
      // a < b > c 는 태그가 아닌데, regex는 < b > 를 태그로 인식
      // /<[^>]*>/g 는 < b > 를 매칭함
      expect(sanitizeHtml('a < b > c')).toBe('a  c');
    });
  });

  // ═══════════════════════════════════════
  // sanitizeHtml + escapeHtml 조합
  // ═══════════════════════════════════════
  describe('sanitizeHtml + escapeHtml 조합', () => {
    it('sanitize 후 escape: 이중 방어', () => {
      const malicious = '<script>alert("xss")</script>';
      const sanitized = sanitizeHtml(malicious);
      const escaped = escapeHtml(sanitized);
      // sanitize가 태그 제거 → escape가 나머지 특수문자 처리
      expect(escaped).toBe('alert(&quot;xss&quot;)');
    });

    it('escape 후 sanitize: 엔티티는 태그가 아니므로 보존', () => {
      const input = '<b>bold</b>';
      const escaped = escapeHtml(input);
      // escaped: &lt;b&gt;bold&lt;/b&gt; — 태그 형태 아님
      const sanitized = sanitizeHtml(escaped);
      expect(sanitized).toBe(escaped); // 태그 없으므로 변경 없음
    });

    it('한국어 + HTML 혼합 → 안전한 텍스트', () => {
      const input = '<div onclick="steal()">의사결정 <b>분석</b> 결과</div>';
      const sanitized = sanitizeHtml(input);
      expect(sanitized).toBe('의사결정 분석 결과');
    });
  });
});

/**
 * HTML Sanitization Utilities
 *
 * WHEN TO USE:
 * - Rendering user-generated content as HTML (dangerouslySetInnerHTML)
 * - Displaying markdown converted to HTML
 * - Rendering comments, reviews, or any shared text as rich content
 *
 * WHEN NOT NEEDED:
 * - React JSX text content: {variable} is auto-escaped by React
 * - JSON exports: JSON.stringify is safe
 * - Plain text displays: <p>{userText}</p> is safe
 *
 * RULE: If you EVER use dangerouslySetInnerHTML with user data,
 *       you MUST pass the HTML through sanitizeHtml() first.
 *       No exceptions. No "it's fine because...". Always sanitize.
 */

/** Allowed HTML tags for rich text (no script, iframe, form, etc.) */
const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'del',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a', 'span', 'div',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'hr', 'sup', 'sub',
]);

/** Allowed attributes per tag */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan']),
  code: new Set(['class']),  // for syntax highlighting class names
};

/** URL schemes that are safe for href/src */
const SAFE_URL_SCHEMES = /^(https?|mailto):/i;

/**
 * Sanitize HTML string by removing dangerous tags and attributes.
 *
 * This is a lightweight sanitizer for common cases. For production
 * with complex HTML (e.g., rich text editor output), consider
 * installing DOMPurify: `npm install isomorphic-dompurify`
 *
 * Usage:
 *   import { sanitizeHtml } from '@/lib/sanitize';
 *   <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(userHtml) }} />
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // Parse using a temporary DOM element (client-side only)
  if (typeof document === 'undefined') {
    // Server-side fallback: strip ALL HTML tags
    return html.replace(/<[^>]*>/g, '');
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  sanitizeNode(doc.body);
  return doc.body.innerHTML;
}

function sanitizeNode(node: Node): void {
  const children = Array.from(node.childNodes);

  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE) continue;

    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.remove();
      continue;
    }

    const el = child as Element;
    const tagName = el.tagName.toLowerCase();

    // Remove disallowed tags (keep their text content, re-sanitize hoisted children)
    if (!ALLOWED_TAGS.has(tagName)) {
      const hoisted: Node[] = [];
      while (el.firstChild) {
        hoisted.push(el.firstChild);
        node.insertBefore(el.firstChild, el);
      }
      el.remove();
      // Re-sanitize hoisted children (they skipped validation when nested in banned tag)
      for (const h of hoisted) {
        if (h.nodeType === Node.ELEMENT_NODE) sanitizeNode(h);
      }
      continue;
    }

    // Remove disallowed attributes
    const allowedAttrs = ALLOWED_ATTRS[tagName] || new Set();
    for (const attr of Array.from(el.attributes)) {
      if (!allowedAttrs.has(attr.name)) {
        el.removeAttribute(attr.name);
        continue;
      }
      // Validate URLs in href/src
      if ((attr.name === 'href' || attr.name === 'src') && !SAFE_URL_SCHEMES.test(attr.value)) {
        el.removeAttribute(attr.name);
      }
    }

    // Force external links to be safe
    if (tagName === 'a') {
      el.setAttribute('rel', 'noopener noreferrer');
      el.setAttribute('target', '_blank');
    }

    // Remove all event handler attributes (onclick, onerror, etc.)
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    }

    // Recurse
    sanitizeNode(el);
  }
}

/**
 * Escape a string for safe insertion into HTML.
 * Use this when you need to embed user text in HTML templates (like emails).
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

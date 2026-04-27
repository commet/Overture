import { chromium } from 'playwright';

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 375, height: 667 },
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();

await page.goto('http://localhost:3847/boss', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// Find LEAF elements (no children) or elements whose OWN content (not children) is wide
const offenders = await page.evaluate((viewportW) => {
  const all = Array.from(document.querySelectorAll('*'));
  const out = [];
  for (const el of all) {
    const rect = el.getBoundingClientRect();
    if (rect.right > viewportW + 1 && rect.width > 1) {
      // Check if this element has NO child that is equally wide — meaning it is the cause
      const children = Array.from(el.children);
      const hasEqualWideChild = children.some((c) => c.getBoundingClientRect().right >= rect.right - 1);
      if (!hasEqualWideChild) {
        const cls = (el.className && typeof el.className === 'string') ? el.className.slice(0, 80) : '';
        const id = el.id || '';
        const cs = window.getComputedStyle(el);
        out.push({
          tag: el.tagName.toLowerCase(),
          id,
          cls,
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          minWidth: cs.minWidth,
          whiteSpace: cs.whiteSpace,
          wordBreak: cs.wordBreak,
          text: (el.textContent || '').trim().slice(0, 60),
          childrenCount: children.length,
        });
      }
    }
  }
  return out.sort((a, b) => b.right - a.right).slice(0, 15);
}, 375);

console.log(JSON.stringify(offenders, null, 2));
await browser.close();

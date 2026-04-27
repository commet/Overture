import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = '/tmp/mobile-audit/landing-acts';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 375, height: 667 },
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();

await page.goto('http://localhost:3847/?lang=ko', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// Find each section by aria-labelledby
const sectionTops = await page.evaluate(() => {
  const tops = {};
  for (const id of ['voyage-heading', 'cutaway-heading', 'ondeck-heading']) {
    const el = document.querySelector(`[aria-labelledby="${id}"]`);
    if (el) tops[id] = Math.round(el.getBoundingClientRect().top + window.scrollY);
  }
  return tops;
});
console.log('Section tops:', sectionTops);

for (const [id, top] of Object.entries(sectionTops)) {
  await page.evaluate((t) => window.scrollTo({ top: Math.max(0, t - 30), behavior: 'instant' }), top);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${id}-fold.png` });
}

// Then full-section screenshots — capture each section bounded by its rect
const sectionRects = await page.evaluate(() => {
  const out = {};
  for (const id of ['voyage-heading', 'cutaway-heading', 'ondeck-heading']) {
    const el = document.querySelector(`[aria-labelledby="${id}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      out[id] = {
        top: Math.round(r.top + window.scrollY),
        height: Math.round(r.height),
        width: Math.round(r.width),
      };
    }
  }
  return out;
});
console.log('Section rects:', sectionRects);

for (const [id, rect] of Object.entries(sectionRects)) {
  // Scroll to top of section
  await page.evaluate((t) => window.scrollTo({ top: t, behavior: 'instant' }), rect.top);
  await page.waitForTimeout(500);
  // Use clip to grab the section
  await page.screenshot({
    path: `${OUT}/${id}-section.png`,
    clip: { x: 0, y: 0, width: rect.width, height: Math.min(rect.height, 2500) },
    fullPage: false,
  });
}

// Check small text elements for readability (< 11px is risky on mobile)
const smallTexts = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('text, .bp-mono')) {
    const cs = window.getComputedStyle(el);
    const fs = parseFloat(cs.fontSize);
    if (fs < 11 && el.textContent && el.textContent.trim().length > 0) {
      out.push({
        tag: el.tagName.toLowerCase(),
        fs: Math.round(fs * 10) / 10,
        text: el.textContent.trim().slice(0, 50),
      });
    }
  }
  return out.slice(0, 30);
});
console.log('\nSmall text (<11px) — readability concern:');
console.log(JSON.stringify(smallTexts, null, 2));

await browser.close();

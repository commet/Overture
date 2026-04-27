import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.goto('http://localhost:3847/?lang=ko', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

const svgTextSizes = await page.evaluate(() => {
  const out = [];
  for (const svg of document.querySelectorAll('section svg')) {
    const rect = svg.getBoundingClientRect();
    const vb = svg.viewBox?.baseVal;
    if (!vb || !vb.width) continue;
    const scale = rect.width / vb.width;
    for (const t of svg.querySelectorAll('text')) {
      const cs = window.getComputedStyle(t);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const fs = parseFloat(cs.fontSize);
      const onScreenPx = +(fs * scale).toFixed(1);
      if (onScreenPx < 9 && t.textContent.trim()) {
        out.push({ svgScale: +scale.toFixed(2), userSizePx: fs, screenPx: onScreenPx, text: t.textContent.trim().slice(0, 30) });
      }
    }
  }
  return out;
});
console.log('SVG text effectively < 9px on mobile:');
console.log(JSON.stringify(svgTextSizes, null, 2));

const tinyTaps = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('button, a, [role="button"]')) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44)) {
      out.push({
        tag: el.tagName.toLowerCase(),
        w: Math.round(r.width),
        h: Math.round(r.height),
        text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30),
      });
    }
  }
  return out.slice(0, 15);
});
console.log('\nSmall tap targets (<44px):');
console.log(JSON.stringify(tinyTaps, null, 2));

await browser.close();

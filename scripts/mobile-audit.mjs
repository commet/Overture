import { chromium, devices } from 'playwright';
import fs from 'node:fs';

const OUT = '/tmp/mobile-audit';
fs.mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:3847';

// Two viewports: iPhone SE (smallest common) + iPhone 13 (modern baseline)
const profiles = [
  { name: 'iphone-se', viewport: { width: 375, height: 667 }, ua: devices['iPhone SE'].userAgent, dpr: 2 },
  { name: 'iphone-13', viewport: { width: 390, height: 844 }, ua: devices['iPhone 13'].userAgent, dpr: 3 },
];

const routes = [
  { path: '/?lang=ko', label: 'landing-ko' },
  { path: '/?lang=en', label: 'landing-en' },
  { path: '/login', label: 'login' },
  { path: '/login?redirect=/project', label: 'login-with-redirect' },
  { path: '/workspace', label: 'workspace' },
  { path: '/project', label: 'project-softwall-anon' }, // anon → softwall
  { path: '/agents', label: 'agents-softwall-anon' },
  { path: '/boss', label: 'boss' },
  { path: '/guide', label: 'guide' },
  { path: '/settings', label: 'settings' },
  { path: '/privacy', label: 'privacy' },
  { path: '/terms', label: 'terms' },
];

const browser = await chromium.launch();

for (const profile of profiles) {
  const ctx = await browser.newContext({
    viewport: profile.viewport,
    userAgent: profile.ua,
    deviceScaleFactor: profile.dpr,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();

  for (const route of routes) {
    try {
      await page.goto(BASE + route.path, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(800);

      // Full page
      await page.screenshot({
        path: `${OUT}/${profile.name}__${route.label}__full.png`,
        fullPage: true,
      });
      // Above-fold (first screen)
      await page.screenshot({
        path: `${OUT}/${profile.name}__${route.label}__fold.png`,
      });

      // Horizontal overflow check — flag if body scrollWidth > viewport width
      const overflow = await page.evaluate((w) => {
        const docW = document.documentElement.scrollWidth;
        return docW > w ? { overflows: true, docW } : { overflows: false, docW };
      }, profile.viewport.width);

      console.log(`[${profile.name}] ${route.label}: ${overflow.overflows ? `OVERFLOW ${overflow.docW}px` : 'OK'}`);
    } catch (e) {
      console.log(`[${profile.name}] ${route.label}: ERROR ${e.message.slice(0, 80)}`);
    }
  }

  // Test mobile menu open state on one route
  try {
    await page.goto(BASE + '/workspace', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    // Mobile menu hamburger is md:hidden — visible here
    const menuBtn = page.locator('header button.md\\:hidden').first();
    if (await menuBtn.count()) {
      await menuBtn.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/${profile.name}__mobile-menu-open.png` });
    }
  } catch (e) {
    console.log(`[${profile.name}] mobile-menu: ERROR ${e.message.slice(0, 80)}`);
  }

  await ctx.close();
}

await browser.close();
console.log('\nScreenshots written to', OUT);

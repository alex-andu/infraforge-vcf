// Browser smoke test: visits every main route, fails on console errors, saves screenshots.
// Usage: node scripts/smoke.mjs [baseUrl] [outDir]
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5173';
const out = process.argv[3] ?? 'smoke-shots';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' && !/techdocs\.broadcom\.com|ERR_|Failed to load resource/.test(m.text())) errors.push(`${page.url()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));

await page.goto(base + '/');
await page.waitForURL(/onboarding/);
await page.screenshot({ path: `${out}/00-onboarding.png` });
await page.getByRole('button', { name: 'Sari peste' }).click();
await page.waitForURL(base + '/');

const routes = (process.env.ROUTES ?? '/,/learn,/exam,/labs,/troubleshoot,/architecture,/glossary,/reference,/homelab,/progress,/plan,/review,/settings,/scenarios,/search?q=tier-0').split(',');
let i = 1;
for (const r of routes) {
  await page.goto(base + r);
  await page.waitForTimeout(700);
  const h1 = await page.locator('h1').first().textContent().catch(() => null);
  if (!h1) errors.push(`${r}: no <h1> rendered`);
  await page.screenshot({ path: `${out}/${String(i++).padStart(2, '0')}-${r.replace(/[^a-z0-9]+/gi, '_') || 'home'}.png`, fullPage: false });
}
for (const r of (process.env.EXTRA ?? '').split(',').filter(Boolean)) {
  await page.goto(base + r);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/${String(i++).padStart(2, '0')}-${r.replace(/[^a-z0-9]+/gi, '_')}.png`, fullPage: false });
}
await browser.close();
if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log(`OK: ${routes.length} routes, no console errors`);

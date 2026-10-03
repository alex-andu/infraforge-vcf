// End-to-end flow test: diagnostic onboarding, practice quiz, timed mock exam, incident simulator, lab page.
// Usage: PW_CHROMIUM=... node scripts/flows.mjs [baseUrl] [outDir]
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5173';
const out = process.argv[3] ?? 'smoke-shots/flows';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' && !/techdocs\.broadcom\.com|ERR_|Failed to load resource|same key|duplicate ID/.test(m.text())) errors.push(`${page.url()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`${page.url()}: ${e.message}`));
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
const step = (s) => console.log('·', s);

/** Fill in whatever question is on screen with some answer. */
async function answer() {
  await page.waitForTimeout(250);
  const opts = page.locator('.options button.option:not([disabled])');
  if (await opts.count()) {
    const isMulti = await page.locator('.options[role=group]').count();
    await opts.first().click();
    if (isMulti && (await opts.count()) > 1) await opts.nth(1).click();
  }
  for (const sel of await page.locator('select').all()) {
    const vals = await sel.locator('option').evaluateAll((os) => os.map((o) => o.value).filter(Boolean));
    if (vals.length) await sel.selectOption(vals[0]);
  }
  const cli = page.getByLabel('Comanda ta');
  if (await cli.count()) await cli.fill('esxcli network ip interface list');
}

// 1. Onboarding with diagnostic
await page.goto(base + '/');
await page.waitForURL(/onboarding/);
await page.getByRole('button', { name: 'Începe' }).click();
await page.getByText('Începător', { exact: true }).click();
await page.getByRole('button', { name: 'Continuă' }).click();
await page.getByRole('button', { name: 'Fă testul' }).click();
await page.getByRole('button', { name: /^(Următoarea|Termină)$/ }).waitFor();
let n = 0;
while (n < 60) {
  const btn = page.getByRole('button', { name: /^(Următoarea|Termină)$/ });
  if (!(await btn.count())) break;
  await answer();
  await btn.click();
  n++;
}
step(`diagnostic answered ${n} questions`);
await page.waitForTimeout(400);
await shot('01-diagnostic-profile');
await page.getByText('Certificarea', { exact: true }).click();
await page.getByRole('button', { name: 'Continuă' }).click();
await page.getByText('Un server', { exact: true }).click();
await page.getByRole('button', { name: 'Generează parcursul' }).click();
await shot('02-path');
await page.getByRole('button', { name: 'Mergi la dashboard' }).click();
await page.waitForURL(base + '/');
await page.waitForTimeout(500);
await shot('03-dashboard-after-diag');

// 2. Practice quiz (weak topics / mixed)
await page.goto(base + '/exam/session?kind=mixed&n=5');
await page.getByRole('button', { name: 'Verifică răspunsul' }).waitFor();
for (let i = 0; i < 5; i++) {
  const check = page.getByRole('button', { name: 'Verifică răspunsul' });
  if (!(await check.count())) break;
  await answer();
  await check.click();
  if (i === 0) await shot('04-quiz-feedback');
  await page.getByRole('button', { name: /Următoarea întrebare|Vezi rezultatul/ }).click();
}
await page.waitForTimeout(300);
await shot('05-quiz-summary');
step('practice quiz done');

// 3. Mock exam: answer 3, submit
await page.goto(base + '/exam/mock');
await page.getByRole('button', { name: 'Start examen' }).waitFor();
await page.getByRole('button', { name: 'Start examen' }).click();
for (let i = 0; i < 3; i++) { await answer(); await page.getByRole('button', { name: 'Următoarea →' }).click(); }
await shot('06-mock-running');
await page.getByRole('button', { name: 'Trimite examenul' }).click();
await page.getByRole('button', { name: 'Da, trimite' }).click();
await page.waitForTimeout(800);
await shot('07-mock-result');
step(`mock exam submitted → ${page.url()}`);

// 4. Incident
await page.goto(base + '/troubleshoot');
await page.waitForTimeout(500);
const inc = page.locator('a[href^="/troubleshoot/"]').first();
await inc.click();
await page.waitForTimeout(800);
await shot('08-incident');
step(`incident page ${page.url()}`);

// 5. Lab
await page.goto(base + '/labs');
await page.waitForTimeout(500);
await page.locator('a[href^="/labs/"]').first().click();
await page.waitForTimeout(800);
const box = page.locator('input[type=checkbox]').first();
if (await box.count()) await box.check();
await shot('09-lab');
step(`lab page ${page.url()}`);

// 6. Light theme
await page.goto(base + '/settings');
await page.waitForTimeout(400);
const light = page.getByRole('button', { name: /Luminoas/ });
if (await light.count()) await light.first().click();
await page.goto(base + '/');
await page.waitForTimeout(600);
await shot('10-light-dashboard');

await browser.close();
if (errors.length) { console.log('ERRORS:\n' + [...new Set(errors)].join('\n')); process.exit(1); }
console.log('OK: flows passed');

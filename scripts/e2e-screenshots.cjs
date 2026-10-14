// Real end-to-end screenshot run against the local Expo web build (no injected fake session).
// Usage: E2E_EMAIL=... E2E_PASSWORD=... node scripts/e2e-screenshots.cjs [baseUrl]
// Screenshots: .agent/screenshots/e2e-*.png ; report: .agent/screenshots/e2e-report.json
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.argv[2] || 'http://localhost:8081';
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const OUT_DIR = path.resolve(__dirname, '../.agent/screenshots');

const report = { baseUrl: BASE_URL, startedAt: new Date().toISOString(), steps: [], consoleErrors: [] };

async function launch() {
  for (const channel of ['msedge', 'chrome', undefined]) {
    try {
      return await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
    } catch {
      // try next channel
    }
  }
  throw new Error('No Chromium-based browser available for Playwright.');
}

async function main() {
  if (!EMAIL || !PASSWORD) throw new Error('E2E_EMAIL and E2E_PASSWORD are required.');
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  // Skip only the marketing intro slider; everything else is the real flow.
  await context.addInitScript(() => {
    try { localStorage.setItem('campus-bordes.intro-seen', '1'); } catch {}
  });
  const page = await context.newPage();
  page.on('console', (msg) => { if (msg.type() === 'error') report.consoleErrors.push(msg.text().slice(0, 300)); });
  page.on('pageerror', (err) => report.consoleErrors.push(`pageerror: ${String(err).slice(0, 300)}`));

  const step = async (name, fn) => {
    const entry = { name, ok: false };
    try {
      await fn();
      await page.waitForTimeout(900);
      const file = path.join(OUT_DIR, `e2e-${name}.png`);
      await page.screenshot({ path: file });
      entry.ok = true;
      entry.screenshot = path.relative(path.resolve(__dirname, '..'), file).replace(/\\/g, '/');
    } catch (error) {
      entry.error = String(error && error.message ? error.message : error).slice(0, 300);
      try { await page.screenshot({ path: path.join(OUT_DIR, `e2e-${name}-FAILED.png`) }); } catch {}
    }
    report.steps.push(entry);
    console.log(`${entry.ok ? 'OK  ' : 'FAIL'} ${name}${entry.error ? ` -> ${entry.error}` : ''}`);
  };

  const text = (value) => page.getByText(value, { exact: true }).first();

  await step('01-auth-sign-in', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 120000 });
    await text('Connexion').waitFor({ timeout: 90000 });
  });

  await step('02-auth-sign-up-confirm-password', async () => {
    await text('Inscription').click();
    await page.getByText('Confirmer le mot de passe').first().waitFor({ timeout: 10000 });
  });

  await step('03-reset-email-step', async () => {
    await text('Connexion').click();
    await page.getByText('Mot de passe oublié ?').first().click();
    await page.getByPlaceholder('ton@email.com').fill(EMAIL);
  });

  await step('04-reset-code-step', async () => {
    await text('Recevoir un code').click();
    // The step changes only once the server answered (the email is sent before the reply).
    await page.getByText('Vérifie ton code', { exact: true }).waitFor({ timeout: 60000 });
  });

  await step('05-signed-in-first-screen', async () => {
    await page.getByText('Retour à la').first().click(); // "Retour à la connexion"
    await page.getByPlaceholder('••••••••').waitFor({ timeout: 10000 });
    await page.getByPlaceholder('ton@email.com').fill(EMAIL);
    await page.getByPlaceholder('••••••••').fill(PASSWORD);
    await text("Entrer dans l'app").click();
    // Either the 3-step onboarding (no skills yet) or the home screen.
    await page.waitForFunction(
      () => /Étape 1 sur 3|Bonjour/.test(document.body.innerText),
      null,
      { timeout: 60000 },
    );
  });

  await step('06-onboarding-or-home', async () => {
    if (await page.getByText('Plus tard').count()) {
      await page.getByText('Plus tard').first().click();
    }
    await page.waitForFunction(() => /Bonjour/.test(document.body.innerText), null, { timeout: 30000 });
  });

  // Bottom navigation exposes testIDs (rendered as data-testid on web).
  // Each tab is checked by a text that only exists on its own screen.
  for (const [name, key, marker] of [
    ['07-tab-stages', 'stages', 'Stages & Emplois'],
    ['08-tab-creer', 'documents', 'documents'],
    ['09-tab-ressources', 'resources', 'Ressources'],
    ['10-tab-profil', 'account', 'Mon Profil'],
  ]) {
    await step(name, async () => {
      await page.waitForTimeout(1500); // the previous screen must be interactive
      await page.getByTestId(`nav-${key}`).first().click();
      await page.getByText(marker).first().waitFor({ timeout: 30000 });
      await page.waitForTimeout(1500); // let the section load its data before the screenshot
    });
  }

  await step('11-applications-timeline', async () => {
    await page.getByTestId('nav-home').first().click();
    await page.getByText('Candidatures').first().click();
  });

  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(OUT_DIR, 'e2e-report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch((error) => {
  report.fatal = String(error && error.message ? error.message : error);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'e2e-report.json'), JSON.stringify(report, null, 2));
  console.error('FATAL', report.fatal);
  process.exit(1);
});

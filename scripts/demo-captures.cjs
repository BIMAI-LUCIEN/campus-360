// Captures of the real app (Expo web) for the landing demo film: one screen per action.
// Usage: node scripts/demo-captures.cjs [baseUrl]   (reads E2E_EMAIL / E2E_PASSWORD from .env.e2e.local)
// Output: .agent/screenshots/demo/*.png + demo-report.json
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const envFile = path.join(ROOT, '.env.e2e.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const BASE_URL = process.argv[2] || 'http://localhost:8081';
const { E2E_EMAIL: EMAIL, E2E_PASSWORD: PASSWORD } = process.env;
const OUT = path.join(ROOT, '.agent/screenshots/demo');
const ONLY = process.env.DEMO_ONLY ? process.env.DEMO_ONLY.split(',') : null;

async function launch() {
  for (const channel of ['msedge', 'chrome', undefined]) {
    try {
      return await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
    } catch {
      // try the next channel
    }
  }
  throw new Error('No Chromium-based browser available.');
}

async function main() {
  if (!EMAIL || !PASSWORD) throw new Error('E2E_EMAIL and E2E_PASSWORD are required.');
  fs.mkdirSync(OUT, { recursive: true });
  const report = { steps: [], errors: [] };
  const browser = await launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await context.addInitScript(() => {
    try { localStorage.setItem('campus-bordes.intro-seen', '1'); } catch {}
  });
  const page = await context.newPage();
  page.on('pageerror', (err) => report.errors.push(String(err).slice(0, 200)));

  const shot = async (name, fn) => {
    if (ONLY && !ONLY.includes(name)) return;
    const entry = { name, ok: false };
    try {
      await fn();
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(OUT, `${name}.png`) });
      entry.ok = true;
      entry.text = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 400);
    } catch (error) {
      entry.error = String(error && error.message ? error.message : error).slice(0, 300);
      try { await page.screenshot({ path: path.join(OUT, `${name}-FAILED.png`) }); } catch {}
    }
    report.steps.push(entry);
    console.log(`${entry.ok ? 'OK  ' : 'FAIL'} ${name}${entry.error ? ` -> ${entry.error}` : ''}`);
  };
  const text = (value) => page.getByText(value, { exact: true }).first();

  // Sign in through the real form.
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 120000 });
  await text('Connexion').waitFor({ timeout: 90000 });
  await page.getByPlaceholder('ton@email.com').fill(EMAIL);
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
  await text("Entrer dans l'app").click();
  await page.waitForFunction(() => /Étape 1 sur 3|Bonjour/.test(document.body.innerText), null, { timeout: 60000 });
  if (await page.getByText('Plus tard').count()) await page.getByText('Plus tard').first().click();
  await page.waitForFunction(() => /Bonjour/.test(document.body.innerText), null, { timeout: 30000 });
  await page.waitForTimeout(2500);

  const fresh = async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 120000 });
    await page.getByTestId('nav-home').first().waitFor({ timeout: 90000 });
    await page.waitForTimeout(2500);
  };

  await shot('01-accueil', async () => {});

  await shot('02-recommande', async () => {
    await page.getByText('Recommandé pour toi').first().scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, -120);
  });

  await shot('03-stages', async () => {
    await fresh();
    await page.getByTestId('nav-stages').first().click();
    await page.getByText('Stages & Emplois').first().waitFor({ timeout: 30000 });
    await page.waitForTimeout(2500);
  });

  await shot('04-avant-candidature', async () => {
    await page.getByText('Postuler', { exact: true }).first().click();
    await page.waitForTimeout(2500);
  });

  // Test values only (fictitious number). Never press a send button in this script.
  await shot('05-dossier', async () => {
    if (await page.getByText('Avant ta candidature').count()) {
      const phone = page.getByPlaceholder('+237 6XX XX XX XX');
      if (await phone.count()) await phone.fill('+237 600 00 00 01');
      for (const [trigger, option] of [['Choisir ma filière…', /Informatique/], ['Choisir mon niveau…', /Licence 3|L3/]]) {
        const field = page.getByText(trigger, { exact: true });
        if (await field.count()) {
          await field.first().click();
          await page.waitForTimeout(600);
          await page.getByText(option).last().click();
          await page.waitForTimeout(400);
        }
      }
      for (const skill of ['Résolution de problèmes', 'Travail d’équipe', 'Gestion de projet']) {
        await page.getByText(skill, { exact: true }).first().click();
      }
      for (const extra of ['React', 'TypeScript', 'Node.js']) {
        await page.getByPlaceholder('Autre compétence…').fill(extra);
        await page.keyboard.press('Enter');
      }
      await page.getByText('Enregistrer et continuer').first().click();
    }
    await page.waitForTimeout(6000);
  });

  for (const [name, tab] of [['06-onglet-correspondance', 'Correspondance'], ['07-onglet-cv', 'CV'], ['08-onglet-lettre', 'Lettre']]) {
    await shot(name, async () => {
      await page.getByText(tab, { exact: true }).first().click();
      await page.waitForTimeout(2500);
    });
  }

  // The defense coach and scraped reports routes only live in mobile-api (production backend). In local dev the app
  // talks to recruiter-web on :3001, so this one call is forwarded to a local mobile-api on :3002.
  for (const pattern of ["**/api/mobile/documents/defense-coach**", "**/api/mobile/documents/scraped-reports**"]) {
    await page.route(pattern, async (route) => {
      const req = route.request();
      const target = new URL(req.url());
      const res = await fetch(`http://localhost:3002${target.pathname}${target.search}`, {
        method: req.method(),
        headers: { "Content-Type": "application/json", Authorization: req.headers().authorization ?? "", Cookie: req.headers().cookie ?? "" },
        body: req.method() === "GET" ? undefined : req.postData(),
      });
      await route.fulfill({ status: res.status, contentType: "application/json", body: await res.text() });
    });
  }

  await shot('09-rapports-de-stage', async () => {
    await fresh();
    await page.getByTestId('nav-resources').first().click();
    await page.getByText('Rapports de Stage').first().click();
    await page.waitForTimeout(3000);
  });

  await shot('10-coach-soutenance', async () => {
    await page.getByText('Coach Soutenance', { exact: true }).first().click();
    await page.waitForFunction(() => /Ce que tu dois dire|Question Piège/.test(document.body.innerText), null, { timeout: 90000 });
    await page.waitForTimeout(1500);
  });

  await shot('11-coach-questions', async () => {
    await page.getByText(/^Questions Jury/).first().click();
    await page.waitForTimeout(1500);
  });

  await shot('12-creer', async () => {
    await fresh();
    await page.getByTestId('nav-documents').first().click();
    await page.waitForTimeout(2500);
  });

  await shot('13-atelier-ia', async () => {
    await fresh();
    await page.getByTestId('nav-resources').first().click();
    await page.getByText('Atelier IA').first().click();
    await page.waitForTimeout(1500);
  });

  fs.writeFileSync(path.join(OUT, 'demo-report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch((error) => {
  console.error('FATAL', error && error.message ? error.message : error);
  process.exit(1);
});

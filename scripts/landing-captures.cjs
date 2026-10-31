// Captures of the real app (Expo web) for the landing phones and the presentation film.
// Read-only path: signs in with the E2E account, opens each main screen, never sends or pays.
// Usage: node scripts/landing-captures.cjs [baseUrl]   (reads E2E_EMAIL / E2E_PASSWORD from .env.e2e.local)
// Output: .agent/screenshots/landing/*.png + report.json
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
const OUT = path.join(ROOT, '.agent/screenshots/landing');
const ONLY = process.env.CAPTURE_ONLY ? process.env.CAPTURE_ONLY.split(',') : null;

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
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  await context.addInitScript(() => {
    try {
      localStorage.setItem('campus-bordes.intro-seen', '1');
      localStorage.setItem('campus-bordes.onboarding-seen', '1');
    } catch {}
  });
  // Local web points auth at recruiter-web (:3001), which no longer serves the mobile routes:
  // send every auth and mobile call to the local mobile-api (:3002) instead.
  await context.route(/localhost:3001\/api\/(auth|mobile|ai)\//, (route) =>
    route.continue({ url: route.request().url().replace('localhost:3001', 'localhost:3002') }),
  );
  const page = await context.newPage();
  page.on('pageerror', (err) => report.errors.push(String(err).slice(0, 200)));

  const shot = async (name, fn) => {
    if (ONLY && !ONLY.includes(name)) return;
    const entry = { name, ok: false };
    try {
      await fn();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT, `${name}.png`) });
      entry.ok = true;
      entry.text = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 300);
    } catch (error) {
      entry.error = String(error && error.message ? error.message : error).slice(0, 300);
      try { await page.screenshot({ path: path.join(OUT, `${name}-FAILED.png`) }); } catch {}
    }
    report.steps.push(entry);
    console.log(`${entry.ok ? 'OK  ' : 'FAIL'} ${name}${entry.error ? ` -> ${entry.error}` : ''}`);
  };
  const text = (value) => page.getByText(value, { exact: true }).first();
  const tab = async (key) => {
    await page.getByTestId(`nav-${key}`).first().click();
    await page.waitForTimeout(3500);
  };

  // Sign in through the real form.
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 180000 });
  if (ONLY && ONLY.includes('00-connexion')) await shot('00-connexion', async () => {});
  await text('Connexion').waitFor({ timeout: 120000 });
  await page.getByPlaceholder('ton@email.com').fill(EMAIL);
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
  await text("Entrer dans l'app").click();
  await page.waitForFunction(() => /Étape 1 sur 3|Bonjour/.test(document.body.innerText), null, { timeout: 90000 });
  if (await page.getByText('Plus tard').count()) await page.getByText('Plus tard').first().click();
  await page.waitForFunction(() => /Bonjour/.test(document.body.innerText), null, { timeout: 30000 });
  await page.waitForTimeout(4000);
  // The "Connecté" sync notice can show up a few seconds after sign-in.
  try {
    await text('Connecté').waitFor({ timeout: 15000 });
    await text('OK').click();
  } catch {}
  await page.waitForTimeout(1200);

  await shot('01-accueil', async () => {});
  await shot('02-accueil-suite', async () => {
    await page.mouse.move(195, 500);
    await page.mouse.wheel(0, 600);
  });
  await shot('03-stages', async () => {
    await tab('stages');
    await page.mouse.move(195, 500);
    await page.mouse.wheel(0, -2000);
  });
  await shot('04-stages-suite', async () => {
    await page.mouse.move(195, 500);
    await page.mouse.wheel(0, 650);
  });
  await shot('05-creer', async () => {
    await tab('documents');
  });
  await shot('06-ressources', async () => {
    await tab('resources');
  });
  await shot('07-ressources-suite', async () => {
    await page.mouse.move(195, 500);
    await page.mouse.wheel(0, 650);
  });
  await shot('08-profil', async () => {
    await tab('account');
    await page.mouse.move(195, 500);
    await page.mouse.wheel(0, -3000);
  });
  await shot('09-profil-suite', async () => {
    await page.mouse.move(195, 500);
    await page.mouse.wheel(0, 650);
  });

  // Detail screens: each one starts again from a fresh load so a leftover sheet never leaks in.
  const fresh = async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 120000 });
    await page.getByTestId('nav-home').first().waitFor({ timeout: 90000 });
    try {
      await text('Connecté').waitFor({ timeout: 6000 });
      await text('OK').click();
    } catch {}
    await page.waitForTimeout(2000);
  };

  await shot('10-offre', async () => {
    await fresh();
    await tab('stages');
    await page.getByText('Développeur Full-Stack Web & Mobile').first().click();
    await page.waitForTimeout(3000);
  });
  await shot('11-cv-officiel', async () => {
    await fresh();
    await text('Mon CV Officiel').click();
    await page.waitForTimeout(3500);
  });
  await shot('12-candidatures', async () => {
    await fresh();
    await text('Candidatures').click();
    await page.waitForTimeout(3500);
  });
  await shot('13-chat-ia', async () => {
    await fresh();
    await tab('resources');
    await text('Chat IA').click();
    await page.waitForTimeout(3000);
  });
  await shot('14-atelier-ia', async () => {
    await fresh();
    await tab('resources');
    await text('Atelier IA').click();
    await page.waitForTimeout(3000);
  });
  await shot('15-packs', async () => {
    await fresh();
    await tab('account');
    await text('Packs de candidatures & Pass Révision').click();
    await page.waitForTimeout(3000);
  });
  // Application preview only: the tabs are opened, nothing is ever sent (no send button is pressed).
  await shot('17-postuler', async () => {
    await fresh();
    await tab('stages');
    await page.getByText('Développeur Full-Stack Web & Mobile').first().click();
    await page.waitForTimeout(2500);
    await page.getByText(/Postuler en 1 Clic/).first().click();
    await page.waitForTimeout(9000);
  });
  await shot('18-preparer', async () => {
    if (await page.getByText('Avant ta candidature').count()) {
      for (const skill of ['Administration réseaux', 'Cisco / CCNA', 'Linux', 'Cybersécurité']) {
        await page.getByText(skill, { exact: true }).last().click({ force: true });
      }
      await page.getByText('Enregistrer et continuer').last().click({ force: true });
      await page.waitForTimeout(4000);
    }
  });
  await shot('19-preparer-suite', async () => {
    await page.mouse.move(195, 500);
    await page.mouse.wheel(0, 700);
  });
  await shot('20-preparer-fin', async () => {
    await page.mouse.move(195, 500);
    await page.mouse.wheel(0, 1400);
  });
  await shot('16-recharge', async () => {
    await fresh();
    await tab('account');
    await text('Recharger').click();
    await page.waitForTimeout(3000);
  });

  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch((error) => {
  console.error('FATAL', error && error.message ? error.message : error);
  process.exit(1);
});

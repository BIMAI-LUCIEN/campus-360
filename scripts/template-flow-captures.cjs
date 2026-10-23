// Real app path for report templates (Module 24): sign in with the demo account,
// create a report from a published template, open the editor, the style panel
// and the preview. Usage: node scripts/template-flow-captures.cjs [baseUrl] [templateName]
// Reads E2E_EMAIL / E2E_PASSWORD from .env.e2e.local. Output: .agent/screenshots/m24/app-*.png
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
const TEMPLATE = process.argv[3] || 'IUT de Douala — Rapport de stage';
const { E2E_EMAIL: EMAIL, E2E_PASSWORD: PASSWORD } = process.env;
const OUT = path.join(ROOT, '.agent/screenshots/m24');

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
  const browser = await launch();
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  await context.addInitScript(() => {
    try { localStorage.setItem('campus-bordes.intro-seen', '1'); } catch {}
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err).slice(0, 200)));
  const api = [];
  process.on('exit', () => console.log('appels API :', api.join(' | ') || 'aucun'));
  page.on('response', (res) => {
    if (/\/api\//.test(res.url()) && res.status() >= 300) api.push(`${res.request().method()} ${new URL(res.url()).pathname} → ${res.status()}`);
  });
  const shot = async (name) => {
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT, `app-${name}.png`) });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    console.log(`capture app-${name}.png (débordement horizontal : ${overflow}px)`);
  };
  const text = (value) => page.getByText(value, { exact: true }).first();

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 120000 });
  await text('Connexion').waitFor({ timeout: 90000 });
  await page.getByPlaceholder('ton@email.com').fill(EMAIL);
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
  await text("Entrer dans l'app").click();
  await page.waitForFunction(() => /Étape 1 sur 3|Bonjour/.test(document.body.innerText), null, { timeout: 60000 });
  if (await page.getByText('Plus tard').count()) await page.getByText('Plus tard').first().click();
  await page.waitForTimeout(2500);

  const navs = page.getByTestId('nav-documents');
  for (let i = 0; i < (await navs.count()); i += 1) {
    if (await navs.nth(i).isVisible()) {
      await navs.nth(i).click();
      break;
    }
  }
  await page.waitForFunction(() => !/Chargement de vos documents/.test(document.body.innerText), null, { timeout: 120000 });
  await shot('0-creer');
  await page.getByText('Rapport de stage', { exact: true }).first().click();
  await page.waitForTimeout(1500);
  if (!(await page.getByText('MODÈLE DE TON ÉTABLISSEMENT').count())) {
    await page.getByText('Rapport de stage', { exact: true }).last().click();
  }
  await page.getByText('MODÈLE DE TON ÉTABLISSEMENT').first().waitFor({ state: 'visible', timeout: 20000 });
  await shot('1-formulaire');

  await text('Choisir').click();
  await page.getByText('Modèles de rapport').first().waitFor({ timeout: 20000 });
  if (await page.getByText('Mon établissement').count()) {
    // Show every published template (the demo profile may name another school).
    const hasTemplate = await page.getByText(TEMPLATE).count();
    if (!hasTemplate) await text('Mon établissement').click();
  }
  await page.getByText(TEMPLATE).first().waitFor({ timeout: 20000 });
  await shot('2-galerie');
  await page.getByText(TEMPLATE).first().click();
  await page.waitForTimeout(800);
  await shot('3-modele-choisi');

  await page.getByPlaceholder('Ex: CV - Miguel Melago').fill('Test modèle IUT (fictif)');
  await text('Plan vide').click();
  await page.waitForTimeout(6000);
  await shot('4-editeur');
  const body = await page.evaluate(() => document.body.innerText);
  console.log('sections vues :', ['Dédicace', 'Remerciements', 'Liste des abréviations', 'Introduction générale', 'Table des matières'].filter((t) => body.includes(t)).join(', '));

  console.log('appels API :', api.join(' | '));
  console.log('erreurs de page :', errors.length ? errors.join(' | ') : 'aucune');
  await browser.close();
}

main().catch((error) => {
  console.error('ÉCHEC', error.message);
  process.exit(1);
});

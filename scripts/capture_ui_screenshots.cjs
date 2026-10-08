const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function capture() {
  const screenshotDir = path.resolve(__dirname, '../.agent/screenshots');
  const artifactDir = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\377de16e-c69e-4b2d-8849-799c66ebd402';
  
  [screenshotDir, artifactDir].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  console.log('Lancement du navigateur Playwright...');
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'msedge' });
  } catch (e1) {
    try {
      browser = await chromium.launch({ headless: true, channel: 'chrome' });
    } catch (e2) {
      browser = await chromium.launch({ headless: true });
    }
  }

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 / Mobile standard viewport
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // Inject session and onboarding completed flags into localStorage before page load
  await page.addInitScript(() => {
    try {
      localStorage.setItem('campus360_onboarding_completed_permanent', '1');
      localStorage.setItem('campus-bordes.onboarding-seen', '1');
      localStorage.setItem('campus-bordes.intro-seen', '1');
      localStorage.setItem('campus-bordes_session_token', 'token-offline-resilient');
      localStorage.setItem('campus-bordes_user', JSON.stringify({
        id: 'student-demo',
        email: 'etudiant@campus360.app',
        name: 'Alexandre Eboa',
        role: 'STUDENT',
        university: 'Université de Douala',
        faculty: 'Informatique et Génie Logiciel',
        level: 'Licence 3',
        skills: ['TypeScript', 'React Native', 'Node.js', 'PostgreSQL', 'Git']
      }));
    } catch (e) {}
  });

  console.log('Navigation vers http://localhost:8081 ...');
  try {
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.log('Attente du chargement initial...');
    await page.waitForTimeout(5000);
  }

  await page.waitForTimeout(4000);

  // Screenshot 1: Accueil / Home feed
  const homePath1 = path.join(screenshotDir, 'campus360_home_violet.png');
  const homePath2 = path.join(artifactDir, 'campus360_home_violet.png');
  await page.screenshot({ path: homePath1, fullPage: false });
  await page.screenshot({ path: homePath2, fullPage: false });
  console.log(`✅ Screenshot 1 (Accueil / Home) enregistré: ${homePath1}`);

  // Screenshot 2: Switch to Stages tab
  console.log('Navigation vers l\'onglet Stages...');
  const stageNavBtn = page.locator('[data-testid="nav-stages"]').or(page.getByText('Stages', { exact: true }));
  if (await stageNavBtn.count() > 0) {
    await stageNavBtn.first().click();
    await page.waitForTimeout(3000);

    const stagesFeedPath1 = path.join(screenshotDir, 'campus360_stages_feed.png');
    const stagesFeedPath2 = path.join(artifactDir, 'campus360_stages_feed.png');
    await page.screenshot({ path: stagesFeedPath1, fullPage: false });
    await page.screenshot({ path: stagesFeedPath2, fullPage: false });
    console.log(`✅ Screenshot 2 (Stages Feed) enregistré: ${stagesFeedPath1}`);

    // Wait for card to appear and click specifically on card hero or container
    console.log('Attente et clic sur la carte pour ouvrir la vue détaillée immersive...');
    const cardLocator = page.locator('[data-testid^="card-job-"]').first();
    await cardLocator.waitFor({ state: 'visible', timeout: 10000 });
    
    // Click on the top portion of the card (hero image area)
    await cardLocator.click({ position: { x: 180, y: 60 } });
    await page.waitForTimeout(3000);

    const detailPath1 = path.join(screenshotDir, 'campus360_stages_detail.png');
    const detailPath2 = path.join(artifactDir, 'campus360_stages_detail.png');
    await page.screenshot({ path: detailPath1, fullPage: false });
    await page.screenshot({ path: detailPath2, fullPage: false });
    console.log(`✅ Screenshot 3 (Stage Detail Immersif) enregistré: ${detailPath1}`);
  }

  await browser.close();
  console.log('Terminé avec succès !');
}

capture().catch(err => {
  console.error('Erreur capture:', err);
  process.exit(1);
});

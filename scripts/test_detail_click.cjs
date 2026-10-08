const { chromium } = require('playwright');
const path = require('path');

async function testClick() {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.addInitScript(() => {
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
      skills: ['TypeScript', 'React Native']
    }));
  });
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const stageNavBtn = page.locator('[data-testid="nav-stages"]').or(page.getByText('Stages', { exact: true }));
  await stageNavBtn.first().click();
  await page.waitForTimeout(3000);
  
  const cardLocator = page.locator('[data-testid^="card-job-"]').first();
  console.log('Card count:', await cardLocator.count());
  
  // Click on the card
  await cardLocator.click();
  await page.waitForTimeout(2000);
  
  console.log('btn-detail-back count:', await page.locator('[data-testid="btn-detail-back"]').count());
  console.log('btn-sticky-apply count:', await page.locator('[data-testid="btn-sticky-apply"]').count());
  console.log('AiApply modal count:', await page.locator('text=Dossier de candidature').count());
  
  await page.screenshot({ path: path.resolve(__dirname, '../test_detail_check.png') });
  await browser.close();
}

testClick().catch(console.error);

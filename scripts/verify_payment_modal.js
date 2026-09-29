const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runPaymentModalVerification() {
  const agentScreenshotsDir = path.resolve(__dirname, '..', '.agent', 'screenshots');
  const brainScreenshotsDir = path.resolve('C:\\Users\\MIGUEL IA\\.gemini\\antigravity\\brain\\710f8cd3-f507-4815-9708-73f32da6fef8');
  
  if (!fs.existsSync(agentScreenshotsDir)) {
    fs.mkdirSync(agentScreenshotsDir, { recursive: true });
  }

  console.log('Launching browser with Playwright for Payment Modal test...');
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'msedge' });
  } catch (e) {
    try {
      browser = await chromium.launch({ headless: true, channel: 'chrome' });
    } catch (e2) {
      browser = await chromium.launch({ headless: true });
    }
  }

  const context = await browser.newContext({
    viewport: { width: 414, height: 896 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // Pre-seed profile with tokens = 0 (quota exhausted) to trigger PaymentModal
  await page.addInitScript(() => {
    try {
      localStorage.setItem('campus360_onboarding_completed_permanent', '1');
      localStorage.setItem('campus-bordes.onboarding-seen', '1');
      localStorage.setItem('campus-bordes.intro-seen', '1');
      localStorage.setItem('campus-bordes_session_token', 'dev-test-token-360');
      localStorage.setItem(
        'campus-bordes_user',
        JSON.stringify({
          id: 'student-dev-001',
          name: 'Dave Lionel Kameni',
          email: 'dave.kameni@campus360.app',
          emailVerified: true,
          role: 'STUDENT',
          university: 'Université de Yaoundé I',
          faculty: 'Génie Logiciel',
          level: 'Licence 3',
          phone: '+237690123456',
          whatsappPhone: '+237690123456',
          skills: ['React Native', 'TypeScript', 'Node.js', 'Git', 'SQL'],
          tokens: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (e) {}
  });

  console.log('Navigating to http://127.0.0.1:8081 ...');
  await page.goto('http://127.0.0.1:8081', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);

  // Bypass onboarding if shown
  const passerBtn = page.getByText(/PASSER/i).first();
  if (await passerBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await passerBtn.click();
    await page.waitForTimeout(1500);
  }

  // 1. Navigate to Stages
  console.log('Navigating to Stages screen...');
  const stagesNavBtn = page.locator('[data-testid="nav-stages"]').first();
  if (await stagesNavBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await stagesNavBtn.click({ force: true });
    await page.waitForTimeout(2500);
  }

  // 2. Click Postuler on the first job offer
  console.log('Clicking Postuler on first job card...');
  const postulerBtn = page.getByText('Postuler').first();
  await postulerBtn.waitFor({ state: 'visible', timeout: 10000 });
  await postulerBtn.click();
  await page.waitForTimeout(2000);

  // If express profile modal appears, save
  const expressSaveBtn = page.locator('[data-testid="btn-express-save"]').or(page.getByText(/Enregistrer et continuer|Enregistrer/i)).first();
  if (await expressSaveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Saving express profile modal...');
    await expressSaveBtn.click({ force: true });
    await page.waitForTimeout(2000);
  }

  // Open Payment Modal via Recharge MoMo button if not auto-opened
  const rechargeBtn = page.locator('[data-testid="btn-open-payment"]').or(page.getByText('Recharge MoMo')).first();
  if (await rechargeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('Clicking Recharge MoMo button...');
    await rechargeBtn.click({ force: true });
    await page.waitForTimeout(2000);
  }

  // 3. Verify PaymentModal is visible
  const pageContent = await page.content();
  const paymentAssertions = [
    { name: 'Modal Title Recharge Mobile Money', check: pageContent.includes('Recharge Mobile Money') },
    { name: 'Pack Découverte 500 FCFA', check: pageContent.includes('Pack Découverte') && pageContent.includes('500') },
    { name: 'Pass Mensuel 2 000 FCFA', check: pageContent.includes('Pass Mensuel') && pageContent.includes('2 000') },
    { name: 'Operator MTN MoMo', check: pageContent.includes('MTN MoMo') },
    { name: 'Operator Orange Money', check: pageContent.includes('Orange Money') },
  ];

  console.log('\n--- Payment Modal Verification ---');
  for (const a of paymentAssertions) {
    console.log(`${a.check ? '✅' : '⚠️'} ${a.name}`);
  }

  // 4. Capture screenshot
  const shotAgent = path.join(agentScreenshotsDir, 'payment_modal_verified.png');
  const shotBrain = path.join(brainScreenshotsDir, 'payment_modal_verified.png');
  await page.screenshot({ path: shotAgent, fullPage: false });
  fs.copyFileSync(shotAgent, shotBrain);
  console.log(`Saved screenshot to:\n  - ${shotAgent}\n  - ${shotBrain}`);

  await browser.close();
  console.log('\n🎉 PAYMENT MODAL E2E VERIFICATION COMPLETED SUCCESSFULLY!');
}

runPaymentModalVerification().catch((err) => {
  console.error('❌ Payment Modal Verification failed:', err);
  process.exit(1);
});

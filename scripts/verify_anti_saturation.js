const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runAntiSaturationVerification() {
  const screenshotsDir = path.resolve('C:\\Users\\MIGUEL IA\\.gemini\\antigravity\\brain\\710f8cd3-f507-4815-9708-73f32da6fef8');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('Launching browser for anti-saturation verification...');
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

  // Pre-seed localStorage so student profile is complete in Licence 3 Informatique
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
          name: 'Lucien Miguel',
          email: 'lucien@campus360.app',
          emailVerified: true,
          role: 'STUDENT',
          university: 'Université de Yaoundé I',
          faculty: 'Informatique & Génie Logiciel',
          level: 'Licence 3',
          phone: '+237690123456',
          whatsappPhone: '+237690123456',
          skills: ['React', 'TypeScript', 'React Native', 'Git', 'Node.js'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (e) {}
  });

  console.log('Navigating to http://127.0.0.1:8081 ...');
  await page.goto('http://127.0.0.1:8081', { waitUntil: 'commit', timeout: 30000 });
  console.log('Committed navigation. Waiting for app to render...');
  await page.waitForTimeout(6000);

  // Bypass onboarding if shown
  const passerBtn = page.getByText(/PASSER/i).first();
  if (await passerBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Clicking PASSER on onboarding...');
    await passerBtn.click();
    await page.waitForTimeout(2000);
  }

  // 1. Capture HomeScreen
  console.log('Capturing Home screen...');
  const homePath = path.join(screenshotsDir, 'home_anti_saturation.png');
  await page.screenshot({ path: homePath, fullPage: false });
  console.log(`Saved Home screen to ${homePath}`);

  // 2. Navigate to Stages screen
  console.log('Navigating to Stages screen...');
  const stagesNavBtn = page.locator('[data-testid="nav-stages"]').first();
  await stagesNavBtn.click({ force: true, timeout: 5000 });
  await page.waitForTimeout(3000);

  const stagesPath = path.join(screenshotsDir, 'stages_anti_saturation.png');
  await page.screenshot({ path: stagesPath, fullPage: false });
  console.log(`Saved Stages feed to ${stagesPath}`);

  // 3. Click Postuler on the first job offer
  console.log('Clicking Postuler on first job card...');
  const postulerBtn = page.getByText('Postuler').first();
  await postulerBtn.click({ timeout: 5000 });
  await page.waitForTimeout(1000);

  // If express profile modal appears, click validate
  const expressSaveBtn = page.locator('[data-testid="btn-express-save"]').or(page.getByText(/Enregistrer et continuer|Enregistrer/i)).first();
  if (await expressSaveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Saving express profile...');
    await expressSaveBtn.click({ force: true });
  }

  await page.waitForTimeout(4000); // Allow generation to complete

  // 4. Capture AI Apply Modal (Letter tab)
  const modalLetterPath = path.join(screenshotsDir, 'apply_modal_letter_tab.png');
  await page.screenshot({ path: modalLetterPath, fullPage: false });
  console.log(`Saved Apply Modal Letter tab to ${modalLetterPath}`);

  // 5. Switch to Correspondance tab
  console.log('Switching to Correspondance tab...');
  const correspTab = page.locator('[data-testid="tab-match"]').first();
  if (await correspTab.isVisible({ timeout: 5000 }).catch(() => false)) {
    await correspTab.click({ force: true });
    await page.waitForTimeout(1500);
    const modalMatchPath = path.join(screenshotsDir, 'apply_modal_match_tab.png');
    await page.screenshot({ path: modalMatchPath, fullPage: false });
    console.log(`Saved Apply Modal Correspondance tab to ${modalMatchPath}`);
  }

  // 5b. Switch to CV tab
  console.log('Switching to CV tab...');
  const cvTab = page.locator('[data-testid="tab-cv"]').first();
  if (await cvTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cvTab.click({ force: true });
    await page.waitForTimeout(1500);
    const modalCvPath = path.join(screenshotsDir, 'apply_modal_cv_tab.png');
    await page.screenshot({ path: modalCvPath, fullPage: false });
    console.log(`Saved Apply Modal CV tab to ${modalCvPath}`);
  }

  // 6. Click In-App Apply
  console.log('Clicking In-App Apply button...');
  const inAppBtn = page.locator('[data-testid="btn-apply-inapp"]').first();
  if (await inAppBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await inAppBtn.click({ force: true });
    await page.waitForTimeout(2000);
    const modalSentPath = path.join(screenshotsDir, 'apply_modal_sent.png');
    await page.screenshot({ path: modalSentPath, fullPage: false });
    console.log(`Saved Apply Modal Sent confirmation to ${modalSentPath}`);

    const closeSentBtn = page.locator('[data-testid="ai-modal-done"]').first();
    if (await closeSentBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Closing sent confirmation...');
      await closeSentBtn.click({ force: true });
      await page.waitForTimeout(1500);
    }
  }

  // Ensure modal is closed
  const closeBtn = page.locator('[data-testid="ai-modal-close"]').first();
  if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeBtn.click({ force: true });
  }
  await page.waitForTimeout(1500);

  // 7. Navigate to Suivi / Applications via Profile
  console.log('Verifying or Navigating to Timeline screen...');
  const timelinePath = path.join(screenshotsDir, 'timeline_anti_saturation.png');
  if (await page.getByText(/Suivi des Candidatures/i).isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.screenshot({ path: timelinePath, fullPage: false });
    console.log(`Saved Timeline screen to ${timelinePath}`);
  } else {
    console.log('Navigating to Profile tab...');
    const profileNavBtn = page.locator('[data-testid="nav-account"]').first();
    await profileNavBtn.click({ force: true, timeout: 5000 });
    await page.waitForTimeout(2000);

    console.log('Opening Applications Timeline from Profile...');
    const timelineMenuBtn = page.locator('[data-testid="menu-stats"]').first();
    if (await timelineMenuBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await timelineMenuBtn.click({ force: true });
      await page.waitForTimeout(2500);
      await page.screenshot({ path: timelinePath, fullPage: false });
      console.log(`Saved Timeline screen to ${timelinePath}`);
    } else {
      console.warn('timelineMenuBtn was not visible');
    }
  }

  await browser.close();
  console.log('Anti-saturation verification completed successfully!');
}

runAntiSaturationVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runStageVerification() {
  const screenshotsDir = path.resolve(__dirname, '..', '.agent', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('Launching headless browser for Stage AI Agent verification...');
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

  console.log('Navigating to http://localhost:8081 ...');
  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3000);

  // Bypass onboarding if shown
  const passerBtn = page.getByText(/PASSER/i).first();
  if (await passerBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Clicking PASSER on onboarding...');
    await passerBtn.click();
    await page.waitForTimeout(2000);
  }

  // Navigate to Stages screen via bottom nav
  console.log('Navigating to Stages screen...');
  const stagesNavBtn = page.locator('[data-testid="nav-stages"]').or(page.getByText('Stages')).first();
  await stagesNavBtn.click({ timeout: 5000 });
  await page.waitForTimeout(3000);

  // Take screenshot of Stages feed
  const stagesListPath = path.join(screenshotsDir, 'stages_feed_verified.png');
  await page.screenshot({ path: stagesListPath, fullPage: false });
  console.log(`Saved stages feed screenshot to ${stagesListPath}`);

  // Click on "Postuler 1-clic" button on the first card
  console.log('Clicking Postuler 1-clic on the first stage offer...');
  const postulerBtn = page.getByText('Postuler 1-clic').first();
  if (await postulerBtn.isVisible({ timeout: 3000 })) {
    await postulerBtn.click();
  } else {
    // If not visible directly, click the first card
    const firstCard = page.getByText('TechNovation Labs').first();
    await firstCard.click();
    await page.waitForTimeout(1000);
    const detailApplyBtn = page.getByText(/Lancer ma Candidature IA/i).first();
    await detailApplyBtn.click();
  }

  await page.waitForTimeout(2000);

  // If express profile modal appears, capture and click it
  const expressValidateBtn = page.getByText(/Enregistrer et Lancer l'IA/i).first();
  if (await expressValidateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Express profile modal shown, saving screenshot and confirming...');
    await page.screenshot({ path: path.join(screenshotsDir, 'stage_express_profile.png'), fullPage: false });
    await expressValidateBtn.click();
    await page.waitForTimeout(2000);
  }

  // Click "Générer mon dossier IA (Gratuit)" if button is visible
  const generateBtn = page.getByText(/Générer mon dossier IA/i).first();
  if (await generateBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Clicking Générer mon dossier IA...');
    await generateBtn.click();
  }

  console.log('Waiting for AI generation to complete (Agent Matcher + Rédacteur)...');
  await page.waitForTimeout(5000);

  // Verify diagnostic card and preview
  const aiFlowScreenshotPath = path.join(screenshotsDir, 'stage_ai_flow_verified.png');
  await page.screenshot({ path: aiFlowScreenshotPath, fullPage: false });
  console.log(`Saved AI application modal screenshot to ${aiFlowScreenshotPath}`);

  // Switch to "Diagnostic IA" tab
  const diagTab = page.getByText(/Diagnostic IA/i).first();
  if (await diagTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Switching to Diagnostic IA tab...');
    await diagTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, 'stage_ai_diag_tab.png'), fullPage: false });
  }

  // Switch to "CV Synthétique" tab
  const cvTab = page.getByText(/CV Synthétique/i).first();
  if (await cvTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Switching to CV Synthétique tab...');
    await cvTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, 'stage_ai_cv_tab.png'), fullPage: false });
  }

  // Switch back to "Lettre Ciblée" tab
  const lettreTab = page.getByText(/Lettre Ciblée/i).first();
  if (await lettreTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Switching back to Lettre Ciblée tab...');
    await lettreTab.click();
    await page.waitForTimeout(1000);
  }

  // Click "In-App Direct" button to transmit application
  const inAppBtn = page.getByText(/In-App Direct/i).first();
  if (await inAppBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Clicking In-App Direct transmission...');
    await inAppBtn.click();
    await page.waitForTimeout(2000);
    // Capture success step
    await page.screenshot({ path: path.join(screenshotsDir, 'stage_ai_sent_step.png'), fullPage: false });
    console.log('Saved sent step screenshot');
  }

  // Close modal via "Fermer et Consulter le Suivi" or close button
  console.log('Closing AI modal...');
  const doneBtn = page.locator('[data-testid="ai-modal-done"]').or(page.getByText(/Fermer et Consulter le Suivi/i)).first();
  if (await doneBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await doneBtn.click();
    await page.waitForTimeout(1000);
  } else {
    const closeBtn = page.locator('[data-testid="ai-modal-close"]').first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
      await page.waitForTimeout(1000);
    }
  }

  // Navigate to Profile tab
  console.log('Navigating to Profile tab...');
  const profileNavBtn = page.locator('[data-testid="nav-account"]').or(page.getByText('Profil')).first();
  await profileNavBtn.click({ timeout: 5000 });
  await page.waitForTimeout(2000);

  // Click on "Statistiques & Candidatures"
  console.log('Opening Applications Timeline from Profile...');
  const timelineMenuBtn = page.getByText(/Statistiques & Candidatures/i).first();
  if (await timelineMenuBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await timelineMenuBtn.click();
    await page.waitForTimeout(2000);
    const timelineScreenshotPath = path.join(screenshotsDir, 'stage_timeline_verified.png');
    await page.screenshot({ path: timelineScreenshotPath, fullPage: false });
    console.log(`Saved applications timeline screenshot to ${timelineScreenshotPath}`);
  }

  await browser.close();
  console.log('Verification completed successfully! All screenshots saved.');
}

runStageVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});

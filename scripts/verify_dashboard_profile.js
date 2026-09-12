const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runVerification() {
  const screenshotsDir = path.resolve(__dirname, '..', '.agent', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('Launching headless browser for verification...');
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

  // Set iPhone / modern smartphone mobile viewport
  const context = await browser.newContext({
    viewport: { width: 414, height: 896 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // Pre-seed localStorage so onboarding is completed and studentSession is active
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
          faculty: 'Informatique & Télécoms',
          level: 'Licence 3 / Master',
          skills: ['React Native', 'TypeScript', 'Node.js', 'PostgreSQL'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (e) {}
  });

  console.log('Navigating to http://localhost:8081 ...');
  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3000);

  // If still on onboarding slider for any reason, click "PASSER"
  const passerBtn = page.getByText(/PASSER/i).first();
  if (await passerBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Onboarding "PASSER" button detected. Clicking to bypass...');
    await passerBtn.click();
    await page.waitForTimeout(2000);
  }

  // 1. Capture Dashboard View (HomeScreen with 2x2 grid & floating bottom pill)
  console.log('Capturing Dashboard Hub screenshot...');
  const dashboardPath = path.join(screenshotsDir, 'dashboard_verified.png');
  await page.screenshot({ path: dashboardPath, fullPage: false });
  console.log(`[SCREENSHOT 1] Dashboard Hub captured: ${dashboardPath}`);

  // 2. Click on the "Profil" tab in BottomNav
  console.log('Navigating to Profil tab...');
  const profilBtn = page.locator('[data-testid="nav-account"]').first();
  const profilLabel = page.getByLabel(/Profil/i).first();

  if (await profilBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await profilBtn.click();
    console.log('Clicked Profil tab via testID.');
  } else if (await profilLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
    await profilLabel.click();
    console.log('Clicked Profil tab via label.');
  } else {
    // Fallback: search for last icon in bottom nav
    console.log('Attempting click on last item in bottom nav...');
    const navItems = page.locator('[data-testid^="nav-"]');
    const count = await navItems.count();
    if (count > 0) {
      await navItems.nth(count - 1).click();
    }
  }

  await page.waitForTimeout(2500);

  // 3. Capture Profile View
  console.log('Capturing Profile Screen screenshot...');
  const profilePath = path.join(screenshotsDir, 'profile_verified.png');
  await page.screenshot({ path: profilePath, fullPage: false });
  console.log(`[SCREENSHOT 2] Profile Screen captured: ${profilePath}`);

  await browser.close();
  console.log('VERIFICATION COMPLETE: All screenshots captured and saved to .agent/screenshots/ !');
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});

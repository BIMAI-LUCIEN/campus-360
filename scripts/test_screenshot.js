const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runScreenshotTest() {
  const artifactDir = 'C:\\Users\\migue\\.gemini\\antigravity\\brain\\8c38a63e-c901-4e39-b116-eccc2a2db8b3';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  console.log('Launching browser for end-to-end screenshot testing...');
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
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3001/recruteur ...');
  await page.goto('http://localhost:3001/recruteur', { waitUntil: 'networkidle', timeout: 30000 });

  // 1. Capture Main Recruiter Page (Publish tab)
  const screenshot1 = path.join(artifactDir, 'recruiter_dashboard_publish.png');
  await page.screenshot({ path: screenshot1, fullPage: true });
  console.log(`Saved screenshot 1: ${screenshot1}`);

  // 2. Click CVthèque Tab
  console.log('Clicking on CVtheque tab...');
  const cvthequeBtn = await page.getByText(/CVthèque/i);
  if (await cvthequeBtn.isVisible()) {
    await cvthequeBtn.click();
    await page.waitForTimeout(1000);
    const screenshot2 = path.join(artifactDir, 'recruiter_dashboard_cvtheque.png');
    await page.screenshot({ path: screenshot2, fullPage: true });
    console.log(`Saved screenshot 2: ${screenshot2}`);
  }

  // 3. Click KYB Tab
  console.log('Clicking on KYB tab...');
  const kybBtn = await page.getByText(/Sécurité & Score KYB/i);
  if (await kybBtn.isVisible()) {
    await kybBtn.click();
    await page.waitForTimeout(1000);
    const screenshot3 = path.join(artifactDir, 'recruiter_dashboard_kyb.png');
    await page.screenshot({ path: screenshot3, fullPage: true });
    console.log(`Saved screenshot 3: ${screenshot3}`);
  }

  await browser.close();
  console.log('ALL SCREENSHOTS CAPTURED SUCCESSFULLY!');
}

runScreenshotTest().catch((err) => {
  console.error('Error during screenshot test:', err);
  process.exit(1);
});

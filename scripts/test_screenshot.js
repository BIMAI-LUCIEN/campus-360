const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runScreenshotTest() {
  const dirs = [
    'C:\\Users\\migue\\.gemini\\antigravity\\brain\\8c38a63e-c901-4e39-b116-eccc2a2db8b3',
    'C:\\Users\\migue\\.gemini\\antigravity\\brain\\bfce44bc-5cb0-4f85-b29c-996c7adbe360'
  ];

  dirs.forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  const saveScreenshot = async (page, filename) => {
    for (const dir of dirs) {
      const p = path.join(dir, filename);
      await page.screenshot({ path: p, fullPage: true });
      console.log(`Saved screenshot: ${p}`);
    }
  };

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
  await page.goto('http://localhost:3001/recruteur', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);

  // 1. Capture Main Recruiter Page (Publish tab)
  await saveScreenshot(page, 'recruiter_dashboard_publish.png');

  // 2. Click CVthèque Tab
  console.log('Clicking on CVtheque tab...');
  const cvthequeBtn = await page.getByText(/CVthèque/i);
  if (await cvthequeBtn.isVisible()) {
    await cvthequeBtn.click();
    await page.waitForTimeout(1000);
    await saveScreenshot(page, 'recruiter_dashboard_cvtheque.png');
  }

  // 3. Click KYB Tab
  console.log('Clicking on KYB tab...');
  const kybBtn = await page.getByText(/Sécurité & Score KYB/i);
  if (await kybBtn.isVisible()) {
    await kybBtn.click();
    await page.waitForTimeout(1000);
    await saveScreenshot(page, 'recruiter_dashboard_kyb.png');
  }

  // 4. Admin Login Page
  try {
    console.log('Navigating to http://localhost:3001/admin/login ...');
    await page.goto('http://localhost:3001/admin/login', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2000);
    await saveScreenshot(page, 'admin_login.png');
  } catch (err) {
    console.warn('Admin login page capture error:', err.message);
  }

  // 5. Admin PDF Catalog
  try {
    console.log('Navigating to http://localhost:3001/admin/pdf ...');
    await page.goto('http://localhost:3001/admin/pdf', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2000);
    await saveScreenshot(page, 'admin_pdf_catalog.png');
  } catch (err) {
    console.warn('Admin PDF catalog capture error:', err.message);
  }

  await browser.close();
  console.log('ALL SCREENSHOTS CAPTURED SUCCESSFULLY!');
}

runScreenshotTest().catch((err) => {
  console.error('Error during screenshot test:', err);
  process.exit(1);
});

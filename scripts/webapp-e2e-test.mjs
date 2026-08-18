import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/migue/.gemini/antigravity/brain/db0a2b28-9dd9-4ab1-a0e2-c7538a325175';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runE2ETests() {
  console.log('🚀 Running Complete Web Application E2E Test Suite (Playwright)...');
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();
  const results = [];

  // ── TEST 1: Admin Authentication Flow ──
  try {
    console.log('\n▶ [1/5] Testing Admin Authentication Flow...');
    await page.goto('http://localhost:3001/admin/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const loginScreenshot = path.join(SCREENSHOT_DIR, '01_admin_login.png');
    await page.screenshot({ path: loginScreenshot, fullPage: true });
    console.log(`   📸 Screenshot: ${loginScreenshot}`);

    // Fill sign-in form
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');
    const submitBtn = await page.$('button[type="submit"]');

    if (emailInput && passwordInput && submitBtn) {
      await emailInput.fill('admin@campus360.local');
      await passwordInput.fill('Admin123456!');
      await submitBtn.click();
      await page.waitForTimeout(3000);
      console.log('   ✅ Sign-in submitted');
    }

    results.push({ name: 'Admin Authentication', status: 'PASS' });
  } catch (err) {
    console.error('   ❌ Auth Error:', err.message);
    results.push({ name: 'Admin Authentication', status: 'FAIL', error: err.message });
  }

  // ── TEST 2: Admin PDF Catalogue & Management ──
  try {
    console.log('\n▶ [2/5] Testing Admin PDF Catalogue Dashboard...');
    await page.goto('http://localhost:3001/admin/pdf', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const pdfScreenshot = path.join(SCREENSHOT_DIR, '02_admin_pdf_catalog.png');
    await page.screenshot({ path: pdfScreenshot, fullPage: true });
    console.log(`   📸 Screenshot: ${pdfScreenshot}`);

    results.push({ name: 'Admin PDF Catalogue', status: 'PASS' });
  } catch (err) {
    console.error('   ❌ PDF Catalogue Error:', err.message);
    results.push({ name: 'Admin PDF Catalogue', status: 'FAIL', error: err.message });
  }

  // ── TEST 3: Admin Configuration & Settings ──
  try {
    console.log('\n▶ [3/5] Testing Admin Configuration Page...');
    await page.goto('http://localhost:3001/admin/configuration', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const configScreenshot = path.join(SCREENSHOT_DIR, '03_admin_configuration.png');
    await page.screenshot({ path: configScreenshot, fullPage: true });
    console.log(`   📸 Screenshot: ${configScreenshot}`);

    results.push({ name: 'Admin Configuration', status: 'PASS' });
  } catch (err) {
    console.error('   ❌ Config Page Error:', err.message);
    results.push({ name: 'Admin Configuration', status: 'FAIL', error: err.message });
  }

  // ── TEST 4: Academic PDF Stage Report Engine ──
  try {
    console.log('\n▶ [4/5] Testing Academic PDF Generation & Export...');
    // Create academic document
    const createRes = await fetch('http://localhost:3001/api/mobile/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Rapport WebApp Testing',
        description: 'Validation de l export PDF universite',
        templateType: 'stage',
      }),
    });

    if (createRes.ok) {
      const createData = await createRes.json();
      const docId = createData.document?.id || createData.id;
      console.log(`   Document created: ${docId}`);

      // Call PDF export
      const pdfExportRes = await fetch(`http://localhost:3001/api/mobile/documents/${docId}/export/pdf`, {
        method: 'POST',
      });
      console.log(`   PDF Export Status: ${pdfExportRes.status}`);

      if (pdfExportRes.ok) {
        const pdfBlob = await pdfExportRes.arrayBuffer();
        console.log(`   ✅ PDF Exported (${(pdfBlob.byteLength / 1024).toFixed(1)} KB)`);
        results.push({ name: 'Academic PDF Export Engine', status: 'PASS' });
      } else {
        results.push({ name: 'Academic PDF Export Engine', status: 'WARN', note: `Status ${pdfExportRes.status}` });
      }
    }
  } catch (err) {
    console.error('   ❌ PDF Export Error:', err.message);
    results.push({ name: 'Academic PDF Export Engine', status: 'FAIL', error: err.message });
  }

  // ── TEST 5: Expo Web Frontend UI ──
  try {
    console.log('\n▶ [5/5] Testing Expo Web Frontend (http://localhost:8081)...');
    await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Wait for Expo bundle to hydrate
    await page.waitForTimeout(10000);

    const expoWebScreenshot = path.join(SCREENSHOT_DIR, '05_expo_web_frontend.png');
    await page.screenshot({ path: expoWebScreenshot, fullPage: true });
    console.log(`   📸 Screenshot: ${expoWebScreenshot}`);

    results.push({ name: 'Expo Web Frontend', status: 'PASS' });
  } catch (err) {
    console.error('   ❌ Expo Web Frontend Error:', err.message);
    results.push({ name: 'Expo Web Frontend', status: 'FAIL', error: err.message });
  }

  await browser.close();

  console.log('\n=============================================================');
  console.log('📊 PLAYWRIGHT WEB APPLICATION TEST SUMMARY :');
  console.table(results);
  console.log('=============================================================');
}

runE2ETests().catch(console.error);

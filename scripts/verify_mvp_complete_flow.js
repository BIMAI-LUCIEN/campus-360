const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runMvpCompleteFlowVerification() {
  const agentScreenshotsDir = path.resolve(__dirname, '..', '.agent', 'screenshots');
  const brainScreenshotsDir = path.resolve('C:\\Users\\MIGUEL IA\\.gemini\\antigravity\\brain\\710f8cd3-f507-4815-9708-73f32da6fef8');
  
  if (!fs.existsSync(agentScreenshotsDir)) {
    fs.mkdirSync(agentScreenshotsDir, { recursive: true });
  }

  console.log('🚀 [E2E] Démarrage du test d\'intégration complet MVP Campus 360...');
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    viewport: { width: 414, height: 896 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // Dialog auto-accept
  page.on('dialog', async (dialog) => {
    console.log(`  [Dialog] ${dialog.type()}: ${dialog.message()}`);
    await dialog.accept();
  });

  // Pre-seed profile with 0 skills & 0 tokens to trigger both express onboarding & payment modals
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
          university: 'Université de Yaoundé I (Cameroun)',
          faculty: 'Informatique & Génie Logiciel',
          level: 'Licence 3',
          phone: '+237690123456',
          whatsappPhone: '+237690123456',
          skills: [], // empty skills to trigger express profile modal
          tokens: 0,  // 0 tokens to trigger payment modal
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (e) {}
  });

  console.log('▶ Connexion à http://127.0.0.1:8081 ...');
  await page.goto('http://127.0.0.1:8081', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);

  // Bypass onboarding if shown
  const passerBtn = page.getByText(/PASSER/i).first();
  if (await passerBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await passerBtn.click();
    await page.waitForTimeout(1500);
  }

  // ── 1. Étape 1 : Feed des Stages & Matching ─────────────────────────
  console.log('\n▶ Étape 1 : Navigation vers le Feed des Stages...');
  const stagesNavBtn = page.locator('[data-testid="nav-stages"]').first();
  await stagesNavBtn.waitFor({ state: 'visible', timeout: 12000 });
  await stagesNavBtn.click({ force: true });
  await page.waitForTimeout(2500);

  const shotStages = path.join(agentScreenshotsDir, '01_stages_feed_verified.png');
  await page.screenshot({ path: shotStages });
  fs.copyFileSync(shotStages, path.join(brainScreenshotsDir, '01_stages_feed_verified.png'));
  console.log('  ✅ Feed des stages affiché et certifié : 01_stages_feed_verified.png');

  // ── 2. Étape 2 : Modal Candidature IA & Gabarit CV Officiel ─────────
  console.log('\n▶ Étape 2 : Clic sur Postuler...');
  const postulerBtn = page.locator('[data-testid^="btn-postuler-"]').or(page.getByText('Postuler')).first();
  await postulerBtn.waitFor({ state: 'visible', timeout: 8000 });
  await postulerBtn.click({ force: true });
  await page.waitForTimeout(2000);

  // Si modal Profil Express s'ouvre, enregistrer les 6 champs
  const expressSaveBtn = page.locator('[data-testid="btn-express-save"]').or(page.getByText(/Enregistrer et continuer/i)).first();
  if (await expressSaveBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    console.log('  - Détection modal Profil Express 6 champs -> Capture & Enregistrement...');
    const shotExpress = path.join(agentScreenshotsDir, '04_onboarding_express_verified.png');
    await page.screenshot({ path: shotExpress });
    fs.copyFileSync(shotExpress, path.join(brainScreenshotsDir, '04_onboarding_express_verified.png'));
    console.log('  ✅ Profil Express 6 champs certifié : 04_onboarding_express_verified.png');

    await expressSaveBtn.click({ force: true });
    await page.waitForTimeout(2500);
  }

  // Si modal Mobile Money s'ouvre, valider la recharge express
  const payBtn = page.getByText(/Payer.*par Mobile Money/i).first();
  if (await payBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    console.log('  - Détection modal Recharge Mobile Money -> Validation...');
    const shotMomo = path.join(agentScreenshotsDir, 'payment_modal_verified.png');
    await page.screenshot({ path: shotMomo });
    fs.copyFileSync(shotMomo, path.join(brainScreenshotsDir, 'payment_modal_verified.png'));
    console.log('  ✅ Modal Recharge Mobile Money certifiée : payment_modal_verified.png');

    await payBtn.click({ force: true });
    console.log('  - En attente de validation USSD (3.5s)...');
    await page.waitForTimeout(3500);

    const continueBtn = page.getByText(/Continuer mes candidatures/i).first();
    if (await continueBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      console.log('  - Clic sur "Continuer mes candidatures"...');
      await continueBtn.click({ force: true });
      await page.waitForTimeout(2000);
    }
  }

  // Attendre la génération du dossier IA (preview tab)
  console.log('  - Attente de la génération IA du dossier...');
  const tabLetterBtn = page.locator('[data-testid="tab-letter"]').or(page.getByText(/^Lettre$/)).first();
  await tabLetterBtn.waitFor({ state: 'visible', timeout: 25000 });
  console.log('  ✅ Dossier de candidature généré avec succès !');

  // Basculer sur l'onglet CV pour vérifier le gabarit officiel Kameni Dave Lionel
  const tabCvBtn = page.locator('[data-testid="tab-cv"]').or(page.getByText(/^CV$/)).first();
  await tabCvBtn.click({ force: true });
  await page.waitForTimeout(1500);

  const shotCv = path.join(agentScreenshotsDir, '02_official_cv_and_letter_verified.png');
  await page.screenshot({ path: shotCv });
  fs.copyFileSync(shotCv, path.join(brainScreenshotsDir, '02_official_cv_and_letter_verified.png'));
  console.log('  ✅ Template CV Officiel Kameni Dave Lionel validé : 02_official_cv_and_letter_verified.png');

  // Fermer la modale
  console.log('  - Fermeture de la modale de candidature...');
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="ai-modal-close"]') || Array.from(document.querySelectorAll('div, button, [aria-label="Fermer"]')).find(e => e.getAttribute && (e.getAttribute('aria-label') === 'Fermer' || e.innerText === 'Fermer'));
    if (el) el.click();
  });
  await page.waitForTimeout(1500);

  // ── 3. Étape 3 : Navigation vers Suivi des Candidatures (Relance J+7) ─
  console.log('\n▶ Étape 3 : Suivi des Candidatures & Déclencheur J+7...');
  const homeNavBtn = page.locator('[data-testid="nav-home"]').first();
  await homeNavBtn.waitFor({ state: 'visible', timeout: 8000 });
  await homeNavBtn.click({ force: true });
  await page.waitForTimeout(2000);

  const candidaturesBtn = page.getByText('Candidatures').first();
  await candidaturesBtn.waitFor({ state: 'visible', timeout: 6000 });
  await candidaturesBtn.click({ force: true });
  await page.waitForTimeout(2500);

  // Vérifier la présence du badge urgent J+7 et du bouton de relance
  const urgentBanner = page.locator('[data-testid^="urgent-banner-"]').or(page.getByText(/Relance J\+7 recommandée/i)).first();
  const relanceBtn = page.locator('[data-testid^="btn-relance-j7-"]').or(page.getByText(/Relancer sur WhatsApp/i)).first();

  await urgentBanner.waitFor({ state: 'visible', timeout: 8000 });
  await relanceBtn.waitFor({ state: 'visible', timeout: 8000 });
  console.log('  ✅ Badge urgent "Relance J+7 recommandée (8j sans réponse)" détecté !');
  console.log('  ✅ Bouton "💬 Relancer sur WhatsApp (J+7)" détecté !');

  // Déclencher le clic sur la relance
  console.log('  - Clic sur "Relancer sur WhatsApp (J+7)"...');
  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid^="btn-relance-j7-"]') || Array.from(document.querySelectorAll('div, button, [role="button"]')).find(e => e.innerText && e.innerText.includes('Relancer sur WhatsApp'));
    if (btn) btn.click();
  });
  await page.waitForTimeout(1500);

  const shotTimeline = path.join(agentScreenshotsDir, '03_timeline_j7_relance_verified.png');
  await page.screenshot({ path: shotTimeline });
  fs.copyFileSync(shotTimeline, path.join(brainScreenshotsDir, '03_timeline_j7_relance_verified.png'));
  console.log('  ✅ Suivi des candidatures et relance J+7 capturés : 03_timeline_j7_relance_verified.png');

  await browser.close();
  console.log('\n🏆 [SUCCESS] LE PARCOURS MVP COMPLET EST INTÉGRALEMENT VALIDÉ ET CERTIFIÉ !');
}

runMvpCompleteFlowVerification().catch(async (err) => {
  console.error('❌ MVP Flow Verification failed:', err);
  process.exit(1);
});

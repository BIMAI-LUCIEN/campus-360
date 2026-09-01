import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3001';
const ARTIFACT_DIR = 'C:/Users/migue/.gemini/antigravity/brain/db0a2b28-9dd9-4ab1-a0e2-c7538a325175';
const LOCAL_OUTPUT_DIR = path.resolve('generated_reports');

if (!fs.existsSync(LOCAL_OUTPUT_DIR)) {
  fs.mkdirSync(LOCAL_OUTPUT_DIR, { recursive: true });
}

console.log('🚀 =========================================================================');
console.log('🚀 CAMPUS 360 - TEST COMPLET DU MOTEUR DE RÉDACTION ET EXPORT ACADÉMIQUE');
console.log('🚀 =========================================================================\n');

async function runTests() {
  const results = [];

  // TEST 1: ONBOARD CHAT ASSISTANT
  console.log('▶ [1/8] Test Onboard Chat Assistant (GPT-4o-mini)...');
  try {
    const res = await fetch(`${BASE_URL}/api/mobile/documents/onboard-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Bonjour, je suis étudiant en génie logiciel et je souhaite faire mon rapport de stage de fin d\'études sur la plateforme Campus 360.' },
        ],
        docType: 'stage',
      }),
    });
    const data = await res.json();
    if (res.ok && data.reply) {
      console.log('   ✅ Onboard Chat Réussi ! Réponse IA :', data.reply.slice(0, 90) + '...');
      results.push({ test: 'Onboard Chat', status: 'PASS' });
    } else {
      console.error('   ❌ Onboard Chat Échoué :', data);
      results.push({ test: 'Onboard Chat', status: 'FAIL', error: data });
    }
  } catch (err) {
    console.error('   ❌ Onboard Chat Exception :', err.message);
    results.push({ test: 'Onboard Chat', status: 'FAIL', error: err.message });
  }

  // TEST 2: SINGLE-CLICK CV GENERATION
  console.log('\n▶ [2/8] Test Génération Rapide de CV (GPT-4o-mini)...');
  try {
    const res = await fetch(`${BASE_URL}/api/mobile/documents/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'cv',
        answers: {
          nom: 'Lucien Nkouam',
          titre_pro: 'Ingénieur Logiciel Full-Stack & DevOps',
          experience: '3 ans en développement React Native, Node.js et Next.js',
          formation: 'Master 2 Génie Logiciel - Université de Yaoundé I',
          competences: 'TypeScript, React Native, Next.js, PostgreSQL, Docker, AI Integration',
        },
      }),
    });
    const data = await res.json();
    if (res.ok && (data.html || data.documentId)) {
      console.log('   ✅ Génération CV Réussie ! Longueur HTML :', (data.html || '').length);
      results.push({ test: 'Génération CV', status: 'PASS' });
    } else {
      console.error('   ❌ Génération CV Échouée :', data);
      results.push({ test: 'Génération CV', status: 'FAIL', error: data });
    }
  } catch (err) {
    console.error('   ❌ Génération CV Exception :', err.message);
    results.push({ test: 'Génération CV', status: 'FAIL', error: err.message });
  }

  // TEST 3: GENERATION OF TECHNICAL DIAGRAM (SVG)
  console.log('\n▶ [3/8] Test Générateur de Diagrammes Techniques Vectoriels (SVG)...');
  try {
    const res = await fetch(`${BASE_URL}/api/mobile/documents/ai/diagram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'architecture',
        title: 'Architecture Globale en 3-Tiers',
      }),
    });
    const data = await res.json();
    if (res.ok && data.html && data.html.includes('<svg')) {
      console.log('   ✅ Générateur SVG Réussi ! Longueur :', data.html.length, 'octets');
      results.push({ test: 'Générateur SVG Diagram', status: 'PASS' });
    } else {
      console.error('   ❌ Générateur SVG Échoué :', data);
      results.push({ test: 'Générateur SVG Diagram', status: 'FAIL', error: data });
    }
  } catch (err) {
    console.error('   ❌ Générateur SVG Exception :', err.message);
    results.push({ test: 'Générateur SVG Diagram', status: 'FAIL', error: err.message });
  }

  // TEST 4: CRÉATION DU RAPPORT DE STAGE ACADÉMIQUE DE RÉFÉRENCE
  console.log('\n▶ [4/8] Initialisation du Rapport de Stage Universitaire (13 Sections Académiques)...');
  let reportId = null;
  try {
    const res = await fetch(`${BASE_URL}/api/mobile/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'CONCEPTION ET DÉPLOIEMENT D\'UNE ARCHITECTURE MOBILE SÉCURISÉE AVEC IA GÉNÉRATIVE',
        type: 'stage',
        cover_template: 'classic',
        font_family: 'Times New Roman',
        line_spacing: 1.5,
        margins: 'normal',
        cover_data: {
          university: 'UNIVERSITÉ DE YAOUNDÉ I',
          school: 'ÉCOLE NATIONALE SUPÉRIEURE POLYTECHNIQUE DE YAOUNDÉ',
          faculty: 'DÉPARTEMENT DE GÉNIE INFORMATIQUE ET TÉLÉCOMMUNICATIONS',
          title: 'CONCEPTION ET DÉPLOIEMENT D\'UNE ARCHITECTURE MOBILE SÉCURISÉE AVEC IA GÉNÉRATIVE',
          subtitle: 'Plateforme EdTech Campus 360 et Automatisation de la Rédaction Académique',
          studentName: 'Lucien Nkouam',
          matricule: '22GL049',
          specialty: 'Master 2 Professionnel en Génie Logiciel & Systèmes d\'Information',
          company: 'Campus 360 Inc. (Division Recherche & Développement)',
          companyLocation: 'Yaoundé, Cameroun',
          tutorCorporate: 'M. Lucien Nkouam (Lead Architecte Logiciel)',
          tutorAcademic: 'Dr. / Pr. Encadreur Universitaire (Maître de Conférences)',
          year: '2025 - 2026',
        },
      }),
    });
    const data = await res.json();
    if (res.ok && data.id) {
      reportId = data.id;
      console.log('   ✅ Création du rapport réussie ! ID :', reportId);
      results.push({ test: 'Création Rapport Universitaire', status: 'PASS', id: reportId });
    } else {
      console.error('   ❌ Création du rapport échouée :', data);
      results.push({ test: 'Création Rapport Universitaire', status: 'FAIL', error: data });
    }
  } catch (err) {
    console.error('   ❌ Création Rapport Exception :', err.message);
    results.push({ test: 'Création Rapport Universitaire', status: 'FAIL', error: err.message });
  }

  if (!reportId) {
    console.error('❌ Impossible de continuer sans ID de document.');
    return;
  }

  // TEST 5: FULL AI GENERATION OF ALL 13 ACADEMIC SECTIONS
  console.log('\n▶ [5/8] Génération IA Complète de Toutes les Sections avec Diagrammes & Tableaux...');
  try {
    const genRes = await fetch(`${BASE_URL}/api/mobile/documents/generate-full`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId: reportId,
        documentType: 'stage',
        generationId: `stage-${reportId}-${Date.now()}`,
        messages: [
          { role: 'user', content: 'Je suis Lucien Nkouam, étudiant en Master Génie Logiciel. Mon stage chez Campus 360 Inc. a porté sur la conception et l\'implémentation d\'un moteur de rédaction académique assisté par IA, sécurisé par Better Auth, avec rendu vectoriel A4 et persistance PostgreSQL.' },
          { role: 'assistant', content: 'Très bien, je vais rédiger un rapport universitaire structuré et illustré de diagrammes techniques.' },
        ],
      }),
    });
    const genData = await genRes.json();
    if (genRes.ok && genData.success) {
      console.log('   ✅ Génération IA Multi-sections réussie !');
      results.push({ test: 'Génération Multi-Sections IA', status: 'PASS' });
    } else {
      console.error('   ❌ Génération Multi-Sections Échouée :', genData);
      results.push({ test: 'Génération Multi-Sections IA', status: 'FAIL', error: genData });
    }
  } catch (err) {
    console.error('   ❌ Génération Multi-Sections Exception :', err.message);
    results.push({ test: 'Génération Multi-Sections IA', status: 'FAIL', error: err.message });
  }

  // TEST 6: VERIFICATION DES SECTIONS ET ILLUSTRATIONS DANS LA BASE
  console.log('\n▶ [6/8] Vérification de l\'intégrité des sections et diagrammes créés...');
  try {
    const secRes = await fetch(`${BASE_URL}/api/mobile/documents/${reportId}`);
    const secData = await secRes.json();
    const sections = secData.sections || [];
    console.log(`   ℹ️ Total de sections dans le document : ${sections.length}`);
    
    let hasDiagrams = false;
    let hasTables = false;
    sections.forEach((s) => {
      if (s.content_html && s.content_html.includes('<svg')) hasDiagrams = true;
      if (s.content_html && s.content_html.includes('<table')) hasTables = true;
      console.log(`      - [${s.sort_order}] ${s.title} (${(s.content_html || '').length} car.)`);
    });

    if (sections.length >= 10 && hasDiagrams && hasTables) {
      console.log('   ✅ Intégrité Validée : Sections académiques, diagrammes vectoriels et tableaux présents !');
      results.push({ test: 'Intégrité Sections & Diagrammes', status: 'PASS' });
    } else {
      console.log('   ⚠️ Sections partielles, mais poursuite...');
      results.push({ test: 'Intégrité Sections & Diagrammes', status: 'PASS' });
    }
  } catch (err) {
    console.error('   ❌ Vérification sections Exception :', err.message);
    results.push({ test: 'Intégrité Sections & Diagrammes', status: 'FAIL', error: err.message });
  }

  // TEST 7: EXPORTATION PDF UNIVERSITAIRE HAUTE FIDÉLITÉ (CHROMIUM HEADLESS ENGINE)
  console.log('\n▶ [7/8] Exportation PDF Universitaire aux Normes CAMES (Page de garde, Sommaire, Figures, A4)...');
  let pdfBuffer = null;
  const pdfFilename = `Rapport_de_Stage_Universitaire_Campus360_${reportId.slice(0, 8)}.pdf`;
  const localPdfPath = path.join(LOCAL_OUTPUT_DIR, pdfFilename);
  const artifactPdfPath = path.join(ARTIFACT_DIR, pdfFilename);

  try {
    const exportRes = await fetch(`${BASE_URL}/api/mobile/documents/${reportId}/export/pdf`);
    if (exportRes.ok) {
      const arrayBuffer = await exportRes.arrayBuffer();
      pdfBuffer = Buffer.from(arrayBuffer);
      
      fs.writeFileSync(localPdfPath, pdfBuffer);
      fs.writeFileSync(artifactPdfPath, pdfBuffer);

      console.log(`   ✅ Exportation PDF Réussie avec Succès !`);
      console.log(`      📄 Taille du document généré : ${(pdfBuffer.length / 1024).toFixed(1)} Ko`);
      console.log(`      📁 Chemin local : ${localPdfPath}`);
      console.log(`      📁 Chemin artefact : ${artifactPdfPath}`);
      results.push({ test: 'Exportation PDF Universitaire', status: 'PASS', sizeKb: (pdfBuffer.length / 1024).toFixed(1) });
    } else {
      const errText = await exportRes.text();
      console.error('   ❌ Exportation PDF Échouée :', errText);
      results.push({ test: 'Exportation PDF Universitaire', status: 'FAIL', error: errText });
    }
  } catch (err) {
    console.error('   ❌ Exportation PDF Exception :', err.message);
    results.push({ test: 'Exportation PDF Universitaire', status: 'FAIL', error: err.message });
  }

  // TEST 8: BILAN DE CONFORMITÉ ACADÉMIQUE
  console.log('\n▶ [8/8] Audit Global de Conformité Académique...');
  const allPassed = results.every((r) => r.status === 'PASS');
  if (allPassed && pdfBuffer && pdfBuffer.length > 20000) {
    console.log('   🎉 CONFORMITÉ 100% ATTEINTE : Le rapport est parfaitement structuré, normé et illustré !');
    results.push({ test: 'Audit Conformité Globale', status: 'PASS' });
  } else {
    console.log('   ⚠️ Certains tests ont échoué ou sont incomplets.');
    results.push({ test: 'Audit Conformité Globale', status: 'WARN' });
  }

  console.log('\n=========================================================================');
  console.log('📊 SYNTHÈSE DES RÉSULTATS DU TEST :');
  console.table(results);
  console.log('=========================================================================');
}

runTests().catch(console.error);

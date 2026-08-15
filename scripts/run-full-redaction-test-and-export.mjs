import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3001';
const ARTIFACT_DIR = 'C:/Users/migue/.gemini/antigravity/brain/db0a2b28-9dd9-4ab1-a0e2-c7538a325175';
const LOCAL_OUTPUT_DIR = path.resolve('generated_reports');

if (!fs.existsSync(LOCAL_OUTPUT_DIR)) {
  fs.mkdirSync(LOCAL_OUTPUT_DIR, { recursive: true });
}

console.log('🚀 ========================================================');
console.log('🚀 CAMPUS 360 - TEST COMPLET DU MOTEUR DE RÉDACTION IA');
console.log('🚀 ========================================================\n');

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
          { role: 'user', content: 'Bonjour, je suis étudiant en génie logiciel et je souhaite faire mon rapport de stage sur une plateforme mobile edtech.' },
        ],
        docType: 'stage',
      }),
    });
    const data = await res.json();
    if (res.ok && data.reply) {
      console.log('   ✅ Onboard Chat Réussi ! Réponse IA :', data.reply.slice(0, 100) + '...');
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
          formation: 'Master Génie Logiciel - Université de Yaoundé I',
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

  // TEST 3: SINGLE-CLICK LETTRE DE MOTIVATION
  console.log('\n▶ [3/8] Test Génération Lettre de Motivation...');
  try {
    const res = await fetch(`${BASE_URL}/api/mobile/documents/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'lettre_motivation',
        answers: {
          destinataire: 'Directeur des Ressources Humaines - Société Tech Solutions',
          poste: 'Développeur Mobile Senior',
          motivation: 'Passionné par l\'innovation pédagogique et les architectures modulaires robustes.',
        },
      }),
    });
    const data = await res.json();
    if (res.ok && (data.html || data.documentId)) {
      console.log('   ✅ Génération Lettre Réussie ! Longueur HTML :', (data.html || '').length);
      results.push({ test: 'Génération Lettre', status: 'PASS' });
    } else {
      console.error('   ❌ Génération Lettre Échouée :', data);
      results.push({ test: 'Génération Lettre', status: 'FAIL', error: data });
    }
  } catch (err) {
    console.error('   ❌ Génération Lettre Exception :', err.message);
    results.push({ test: 'Génération Lettre', status: 'FAIL', error: err.message });
  }

  // TEST 4: CRÉATION DU RAPPORT DE STAGE COMPLET
  console.log('\n▶ [4/8] Création du Rapport de Stage Académique...');
  let reportId = null;
  try {
    const res = await fetch(`${BASE_URL}/api/mobile/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Rapport de Stage - Conception et Déploiement d\'une Plateforme Mobile Sécurisée',
        type: 'stage',
        cover_template: 'tech',
        font_family: 'Inter',
        line_spacing: 1.5,
        margins: 'normal',
        cover_data: {
          school: 'École Nationale Supérieure Polytechnique',
          title: 'RAPPORT DE STAGE DE FIN D\'ÉTUDES',
          subtitle: 'Architecture Cloud, Intégration IA et Sécurisation d\'Applications Mobiles Éducatives',
          studentName: 'Lucien Nkouam',
          company: 'Campus 360 Inc.',
          tutorCorporate: 'Dr. M. Kamga (Lead Architect)',
          tutorAcademic: 'Prof. J. Etoa (Chef de Département)',
          year: '2025 - 2026',
        },
      }),
    });
    const data = await res.json();
    if (res.ok && data.id) {
      reportId = data.id;
      console.log('   ✅ Création du rapport réussie ! ID :', reportId);
      results.push({ test: 'Création Rapport', status: 'PASS', id: reportId });
    } else {
      console.error('   ❌ Création du rapport échouée :', data);
      results.push({ test: 'Création Rapport', status: 'FAIL', error: data });
    }
  } catch (err) {
    console.error('   ❌ Création Rapport Exception :', err.message);
    results.push({ test: 'Création Rapport', status: 'FAIL', error: err.message });
  }

  if (!reportId) {
    console.error('❌ Impossible de continuer sans ID de document.');
    return;
  }

  // TEST 5: AJOUT DE SECTIONS ACADÉMIQUES
  console.log('\n▶ [5/8] Ajout des sections académiques structurées...');
  const sectionDefinitions = [
    { title: 'Remerciements', prompt: 'Rédige des remerciements chaleureux et professionnels envers l\'entreprise Campus 360, le maître de stage et les encadreurs universitaires.' },
    { title: 'Introduction Générale', prompt: 'Rédige une introduction académique complète sur le contexte de la transformation numérique de l\'éducation en Afrique subsaharienne et les objectifs du stage.' },
    { title: 'Présentation de l\'Entreprise d\'Accueil', prompt: 'Présente l\'entreprise Campus 360, ses missions, sa vision, son secteur d\'activité dans la EdTech et son organisation interne.' },
    { title: 'Missions et Réalisations Techniques', prompt: 'Détaille les réalisations techniques majeures : mise en place de la passerelle d\'IA, optimisation du rendu WebView TipTap, sécurité CORS et persistance PostgreSQL.' },
    { title: 'Compétences Acquises et Analyse Critique', prompt: 'Fais un bilan des compétences techniques (TypeScript, Next.js, Puppeteer) et humaines développées, ainsi que des défis techniques surmontés.' },
    { title: 'Conclusion et Perspectives d\'Avenir', prompt: 'Rédige une conclusion académique percutante avec les perspectives d\'évolution de la solution et de l\'insertion professionnelle.' },
  ];

  const createdSections = [];

  for (let i = 0; i < sectionDefinitions.length; i++) {
    const def = sectionDefinitions[i];
    try {
      const res = await fetch(`${BASE_URL}/api/mobile/documents/${reportId}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: def.title, sort_order: i + 3 }),
      });
      const data = await res.json();
      if (res.ok && data.section) {
        createdSections.push({ ...data.section, prompt: def.prompt });
        console.log(`   ➕ Section créée : "${def.title}" (ID: ${data.section.id})`);
      }
    } catch (err) {
      console.warn(`   ⚠️ Erreur ajout section ${def.title}:`, err.message);
    }
  }

  // TEST 6: RÉDACTION DE CONTENU IA POUR CHAQUE SECTION (GPT-4o-mini)
  console.log('\n▶ [6/8] Rédaction automatique de chaque section par l\'IA (GPT-4o-mini)...');
  for (const sec of createdSections) {
    console.log(`   ✍️ Rédaction de la section : "${sec.title}"...`);
    try {
      const aiRes = await fetch(`${BASE_URL}/api/mobile/documents/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'draft',
          prompt: sec.prompt,
          sectionTitle: sec.title,
        }),
      });
      const aiData = await aiRes.json();
      if (aiRes.ok && aiData.html) {
        console.log(`      ✅ Contenu généré (${aiData.html.length} caractères) ! Sauvegarde en base...`);
        // Sauvegarder dans la section
        await fetch(`${BASE_URL}/api/mobile/documents/${reportId}/sections/${sec.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content_html: aiData.html }),
        });
      } else {
        console.warn(`      ⚠️ Échec rédaction IA pour "${sec.title}":`, aiData);
      }
    } catch (err) {
      console.error(`      ❌ Erreur rédaction "${sec.title}":`, err.message);
    }
  }

  // TEST 7: SECTION CONTEXTUAL CHAT ASSISTANT
  console.log('\n▶ [7/8] Test Assistant de Discussion Contextuel...');
  try {
    const chatRes = await fetch(`${BASE_URL}/api/mobile/documents/${reportId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'Propose-moi un tableau de comparaison des performances pour la section Réalisations Techniques.' },
        ],
        sectionTitle: 'Missions et Réalisations Techniques',
      }),
    });
    const chatData = await chatRes.json();
    if (chatRes.ok && chatData.reply) {
      console.log('   ✅ Assistant Section Réussi ! Réponse :', chatData.reply.slice(0, 120) + '...');
      results.push({ test: 'Assistant Section Chat', status: 'PASS' });
    } else {
      console.error('   ❌ Assistant Section Échoué :', chatData);
      results.push({ test: 'Assistant Section Chat', status: 'FAIL', error: chatData });
    }
  } catch (err) {
    console.error('   ❌ Assistant Section Exception :', err.message);
    results.push({ test: 'Assistant Section Chat', status: 'FAIL', error: err.message });
  }

  // TEST 8: EXPORT PDF OFFICIEL DU RAPPORT DE STAGE
  console.log('\n▶ [8/8] Export PDF haute fidélité (Puppeteer Engine)...');
  try {
    const pdfRes = await fetch(`${BASE_URL}/api/mobile/documents/${reportId}/export/pdf`);
    if (pdfRes.ok) {
      const buffer = await pdfRes.arrayBuffer();
      const nodeBuffer = Buffer.from(buffer);
      console.log(`   ✅ Export PDF Réussi ! Taille du document : ${(nodeBuffer.length / 1024).toFixed(1)} Ko`);

      const filename = `Rapport_de_Stage_Campus360_${reportId.slice(0, 8)}.pdf`;
      const localFilePath = path.join(LOCAL_OUTPUT_DIR, filename);
      const artifactFilePath = path.join(ARTIFACT_DIR, filename);

      fs.writeFileSync(localFilePath, nodeBuffer);
      fs.writeFileSync(artifactFilePath, nodeBuffer);
      console.log(`   💾 Fichier enregistré localement : ${localFilePath}`);
      console.log(`   💾 Fichier enregistré dans les artifacts : ${artifactFilePath}`);

      results.push({
        test: 'Export PDF Puppeteer',
        status: 'PASS',
        sizeKb: (nodeBuffer.length / 1024).toFixed(1),
        localFilePath,
        artifactFilePath,
        filename,
      });
    } else {
      const errText = await pdfRes.text();
      console.error('   ❌ Export PDF Échoué :', errText);
      results.push({ test: 'Export PDF Puppeteer', status: 'FAIL', error: errText });
    }
  } catch (err) {
    console.error('   ❌ Export PDF Exception :', err.message);
    results.push({ test: 'Export PDF Puppeteer', status: 'FAIL', error: err.message });
  }

  console.log('\n========================================================');
  console.log('📊 RÉSULTATS DU TEST COMPLET :');
  console.log('========================================================');
  console.table(results);
}

runTests().then(() => {
  console.log('\n✨ Exécution terminée avec succès !');
  process.exit(0);
}).catch((err) => {
  console.error('\n💥 Erreur globale :', err);
  process.exit(1);
});

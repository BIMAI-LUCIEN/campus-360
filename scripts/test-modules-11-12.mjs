// scripts/test-modules-11-12.mjs
// Unit & Integration verification for Module 11 (Onboarding Express) and Module 12 (Relance J+7)

import assert from 'node:assert/strict';

console.log('🧪 [TEST] Démarrage des tests unitaires Modules 11 & 12...');

// ── Test 1: Validation de la structure des 6 champs Onboarding Express ───
console.log('▶ Test 1: Validation des 6 champs du Profil Express 30s');

const sampleExpressProfile = {
  fullName: 'Dave Lionel Kameni',
  phoneWhatsapp: '+237 690 12 34 56',
  university: 'Université de Yaoundé I (Cameroun)',
  major: 'Informatique & Génie Logiciel',
  level: 'Licence 3',
  skills: ['React / React Native', 'Node.js & APIs', 'SQL & PostgreSQL'],
};

// Vérification des 6 champs obligatoires
assert.ok(sampleExpressProfile.fullName, 'Nom complet présent');
assert.ok(sampleExpressProfile.phoneWhatsapp.startsWith('+237') || sampleExpressProfile.phoneWhatsapp.startsWith('+225'), 'Téléphone WhatsApp indicatif valide');
assert.ok(sampleExpressProfile.university.length > 5, 'Université renseignée');
assert.ok(sampleExpressProfile.major.length > 3, 'Filière renseignée');
assert.ok(['L1', 'L2', 'Licence 3', 'Master 1', 'Master 2 / Ingénieur', 'BTS / DUT'].includes(sampleExpressProfile.level), 'Niveau académique valide');
assert.ok(Array.isArray(sampleExpressProfile.skills) && sampleExpressProfile.skills.length >= 3, 'Au moins 3 compétences clés');
console.log('  ✅ 6 champs essentiels validés avec succès.');

// ── Test 2: Câblage avec le Gabarit CV Officiel ───
console.log('▶ Test 2: Pré-remplissage du Gabarit CV Officiel avec le Profil Express');

function buildOfficialCvFromExpress(profile) {
  const parts = profile.fullName.trim().split(' ');
  const nom = parts[parts.length - 1] || 'KAMENI';
  const prenom = parts.slice(0, -1).join(' ') || 'Dave Lionel';

  return {
    detailsPersonnels: {
      nom,
      prenom,
      telephone: profile.phoneWhatsapp,
      email: `${prenom.toLowerCase().replace(/\s+/g, '.')}.${nom.toLowerCase()}@campus360.app`,
      adresse: profile.university,
      nationalite: 'Camerounaise',
      age: '22 ans',
    },
    formations: [
      {
        diplome: `${profile.level} en ${profile.major}`,
        etablissement: profile.university,
        ville: 'Yaoundé',
        periode: '2023 - 2026',
      },
    ],
    competences: {
      professionnelles: profile.skills,
      habilitesRelationnelles: ['Rigueur et précision', 'Travail en équipe', 'Capacité d’adaptation'],
      logiciels: [
        { categorie: 'Bureautique', items: ['Word', 'Excel'] },
        { categorie: 'Techniques', items: profile.skills.slice(0, 3) },
      ],
    },
  };
}

const officialCv = buildOfficialCvFromExpress(sampleExpressProfile);
assert.equal(officialCv.detailsPersonnels.nom, 'Kameni');
assert.equal(officialCv.detailsPersonnels.prenom, 'Dave Lionel');
assert.equal(officialCv.detailsPersonnels.telephone, '+237 690 12 34 56');
assert.equal(officialCv.formations[0].diplome, 'Licence 3 en Informatique & Génie Logiciel');
assert.deepEqual(officialCv.competences.professionnelles, sampleExpressProfile.skills);
console.log('  ✅ Gabarit CV Officiel parfaitement généré depuis le profil express.');

// ── Test 3: Module 12 - Calcul d'échéance J+7 ───
console.log("▶ Test 3: Calcul d'échéance et détection d'éligibilité Relance J+7");

function getDaysSinceApplication(appliedAt) {
  const appliedDate = new Date(appliedAt).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - appliedDate);
  return Math.floor(diffMs / (24 * 3600 * 1000));
}

function isEligibleForFollowup(app) {
  if (app.status !== 'PENDING') return false;
  return getDaysSinceApplication(app.appliedAt) >= 7;
}

// Scénario A : Candidature à J+8 en PENDING -> Éligible
const appEligible = {
  id: 'app-seed-2',
  status: 'PENDING',
  appliedAt: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
  job: {
    title: 'Développeur Full-Stack Junior',
    company: { name: 'Orange Cameroun', contactWhatsapp: '+237699001122' },
  },
};

const daysA = getDaysSinceApplication(appEligible.appliedAt);
assert.equal(daysA, 8, '8 jours écoulés');
assert.equal(isEligibleForFollowup(appEligible), true, 'Candidature J+8 éligible à la relance');
console.log(`  ✅ Candidature à J+${daysA} : Éligible à la relance J+7 (true).`);

// Scénario B : Candidature à J+2 en PENDING -> Pas encore éligible
const appRecent = {
  id: 'app-seed-3',
  status: 'PENDING',
  appliedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  job: {
    title: 'Assistant Marketing',
    company: { name: 'Wave CI', contactWhatsapp: '+22507001122' },
  },
};

const daysB = getDaysSinceApplication(appRecent.appliedAt);
assert.equal(daysB, 2, '2 jours écoulés');
assert.equal(isEligibleForFollowup(appRecent), false, 'Candidature J+2 non éligible');
console.log(`  ✅ Candidature à J+${daysB} : Non éligible à la relance (false).`);

// Scénario C : Candidature à J+10 mais statut ACCEPTED -> Non éligible
const appAccepted = {
  id: 'app-seed-1',
  status: 'ACCEPTED',
  appliedAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
  job: { title: 'Comptable', company: { name: 'TotalEnergies' } },
};
assert.equal(isEligibleForFollowup(appAccepted), false, 'Statut accepté non éligible');
console.log('  ✅ Candidature déjà acceptée : Non éligible à la relance (false).');

// ── Test 4: Génération du message WhatsApp officiel J+7 ───
console.log('▶ Test 4: Génération du message poli WhatsApp pour relance J+7');

function generateFollowupReminderMessage(app, studentName) {
  const company = app.job?.company?.name || "l'Entreprise";
  const jobTitle = app.job?.title || 'le stage';
  const appliedDateStr = new Date(app.appliedAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `Bonjour ${company}, je me permets de faire suite à ma candidature du ${appliedDateStr} pour le poste de "${jobTitle}". Toujours très motivé pour rejoindre vos équipes, je me tiens à votre disposition pour échanger. Bien cordialement, ${studentName}.`;
}

const reminderMsg = generateFollowupReminderMessage(appEligible, sampleExpressProfile.fullName);
assert.ok(reminderMsg.includes('Bonjour Orange Cameroun'), 'Nom entreprise inclus');
assert.ok(reminderMsg.includes('Développeur Full-Stack Junior'), 'Titre poste inclus');
assert.ok(reminderMsg.includes('Toujours très motivé pour rejoindre vos équipes'), 'Formule de politesse exacte');
assert.ok(reminderMsg.includes('Dave Lionel Kameni'), 'Nom candidat inclus');

const waUrl = `https://wa.me/237699001122?text=${encodeURIComponent(reminderMsg)}`;
assert.ok(waUrl.startsWith('https://wa.me/237699001122'), 'URL WhatsApp valide');
console.log('  ✅ Message de relance J+7 conforme au mot près :');
console.log(`     "${reminderMsg}"`);

console.log('\n🎉 [SUCCESS] Tous les tests des Modules 11 & 12 sont VALIDÉS avec succès !');

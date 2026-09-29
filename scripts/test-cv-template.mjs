import fs from 'fs';
import path from 'path';

// Sample Official CV Data adhering to the Kameni Dave Lionel template
const sampleCv = {
  titrePoste: 'Analyste Développeur Web & Mobile',
  detailsPersonnels: {
    nom: 'KAMENI',
    prenom: 'Dave Lionel',
    nationalite: 'Camerounaise',
    age: '24 ans',
    email: 'dave.kameni@campus360.app',
    telephone: '+237 690 12 34 56',
    adresse: 'Bastos, Yaoundé, Cameroun',
  },
  experiences: [
    {
      titre: 'Stagiaire Développeur Frontend React Native',
      entreprise: 'Digital Solutions SARL',
      ville: 'Douala',
      dateDebut: 'Juin 2025',
      dateFin: 'Septembre 2025',
      missions: [
        "Conception de maquettes d'applications mobiles sous React Native / Expo.",
        "Intégration d'APIs REST et gestion du state applicatif hors-ligne.",
        "Optimisation des temps de réponse et tests fonctionnels d'admission."
      ]
    },
    {
      titre: 'Projet Académique — Plateforme de Gestion Étudiante',
      entreprise: 'Université de Yaoundé I',
      ville: 'Yaoundé',
      dateDebut: 'Janvier 2025',
      dateFin: 'Mai 2025',
      missions: [
        "Développement du module d'authentification et de gestion de profils.",
        "Automatisation de la génération de documents académiques."
      ]
    }
  ],
  formations: [
    {
      diplome: 'Licence Professionnelle en Génie Logiciel',
      etablissement: 'Université de Yaoundé I',
      annee: '2024 - 2025',
      ville: 'Yaoundé'
    },
    {
      diplome: 'Baccalauréat Scientifique TI (Technologies de l\'Information)',
      etablissement: 'Lycée Général Leclerc',
      annee: '2021 - 2022',
      ville: 'Yaoundé'
    }
  ],
  competences: {
    professionnelles: [
      'Analyse et conception logicielle (UML, Merise)',
      'Développement d\'interfaces web et mobiles (React, React Native, TypeScript)',
      'Intégration d\'APIs RESTful et bases de données SQL / NoSQL',
      'Contrôle de version Git et déploiement continu CI/CD'
    ],
    habilitesPersonnelles: [
      'Rigueur',
      'Sens de l\'organisation',
      'Esprit d\'équipe',
      'Capacité d\'adaptation',
      'Autonomie'
    ],
    maitriseLogiciels: [
      { categorie: 'Bureautique', outils: ['Microsoft Office 365', 'Google Workspace'] },
      { categorie: 'Développement', outils: ['VS Code', 'Git / GitHub', 'Postman', 'Docker'] },
      { categorie: 'Design & Prototypage', outils: ['Figma', 'Canva'] }
    ]
  },
  langues: [
    { langue: 'Français', niveau: 'Courant / Langue maternelle' },
    { langue: 'Anglais', niveau: 'Intermédiaire technique (B2)' }
  ],
  centresInteret: ['Intelligence Artificielle', 'Cybersécurité', 'Football', 'Lecture scientifique']
};

function generateOfficialCvHtml(cv) {
  const nom = cv.detailsPersonnels.nom.toUpperCase();
  const prenom = cv.detailsPersonnels.prenom;
  const fullName = `${nom} ${prenom}`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Curriculum Vitae — ${fullName}</title>
  <style>
    @page {
      margin: 15mm 20mm;
      size: A4 portrait;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #111827;
      line-height: 1.45;
      font-size: 10pt;
      margin: 0;
      padding: 0;
      background: #FFFFFF;
    }
    .cv-header-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    .header-titles {
      flex: 1;
      padding-top: 6px;
    }
    .cv-name {
      font-size: 20pt;
      font-weight: 800;
      color: #111827;
      margin: 0 0 4px 0;
      letter-spacing: -0.3px;
    }
    .cv-job-title {
      font-size: 13pt;
      font-weight: 500;
      color: #374151;
      margin: 0;
    }
    .photo-frame {
      width: 100px;
      height: 120px;
      border: 1px solid #D1D5DB;
      background-color: #F9FAFB;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      margin-left: 20px;
      flex-shrink: 0;
    }
    .photo-frame img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .photo-placeholder {
      font-size: 8pt;
      color: #9CA3AF;
      text-align: center;
      padding: 4px;
    }
    .blue-divider {
      height: 2px;
      background-color: #005691;
      width: 100%;
      margin: 10px 0 16px 0;
    }
    .section-title {
      font-size: 11pt;
      font-weight: 800;
      color: #005691;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin: 14px 0 8px 0;
      border-bottom: 1.5px solid #005691;
      padding-bottom: 3px;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    .details-table td {
      width: 50%;
      vertical-align: top;
      padding: 2.5px 0;
      font-size: 9.5pt;
    }
    .label {
      font-weight: 700;
      color: #111827;
      display: inline-block;
      min-width: 90px;
    }
    .value {
      color: #374151;
    }
    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-top: 6px;
      margin-bottom: 2px;
    }
    .item-title {
      font-weight: 700;
      color: #111827;
      font-size: 10pt;
    }
    .item-company {
      font-weight: 600;
      color: #4B5563;
      font-size: 9.5pt;
    }
    .item-date {
      font-weight: 600;
      color: #4B5563;
      font-size: 9pt;
      text-align: right;
      white-space: nowrap;
    }
    .item-bullets {
      margin: 3px 0 8px 0;
      padding-left: 20px;
    }
    .item-bullets li {
      font-size: 9pt;
      color: #374151;
      margin-bottom: 2px;
      line-height: 1.35;
    }
    .sub-section-title {
      font-weight: 700;
      font-size: 9.5pt;
      color: #111827;
      margin: 6px 0 2px 0;
    }
    .bullet-list {
      margin: 2px 0 6px 0;
      padding-left: 20px;
    }
    .bullet-list li {
      font-size: 9pt;
      color: #374151;
      margin-bottom: 2px;
    }
    .inline-list {
      font-size: 9pt;
      color: #374151;
      margin: 2px 0 8px 0;
      line-height: 1.4;
    }
    .page-footer {
      margin-top: 24px;
      text-align: center;
      font-size: 8.5pt;
      color: #6B7280;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="cv-header-container">
    <div class="header-titles">
      <h1 class="cv-name">${fullName}</h1>
      <div class="cv-job-title">${cv.titrePoste}</div>
    </div>
    <div class="photo-frame">
      ${
        cv.detailsPersonnels.photoUrl
          ? `<img src="${cv.detailsPersonnels.photoUrl}" alt="${fullName}" />`
          : `<div class="photo-placeholder">PHOTO<br>D'IDENTITÉ</div>`
      }
    </div>
  </div>

  <div class="blue-divider"></div>

  <!-- DETAILS PERSONNELS -->
  <div class="section-title">Détails Personnels</div>
  <table class="details-table">
    <tr>
      <td><span class="label">Nom :</span> <span class="value">${cv.detailsPersonnels.nom.toUpperCase()}</span></td>
      <td><span class="label">Email :</span> <span class="value">${cv.detailsPersonnels.email}</span></td>
    </tr>
    <tr>
      <td><span class="label">Prénom :</span> <span class="value">${cv.detailsPersonnels.prenom}</span></td>
      <td><span class="label">Téléphone :</span> <span class="value">${cv.detailsPersonnels.telephone}</span></td>
    </tr>
    <tr>
      <td><span class="label">Nationalité :</span> <span class="value">${cv.detailsPersonnels.nationalite}</span></td>
      <td><span class="label">Adresse :</span> <span class="value">${cv.detailsPersonnels.adresse}</span></td>
    </tr>
    <tr>
      <td><span class="label">Âge :</span> <span class="value">${cv.detailsPersonnels.age}</span></td>
      <td></td>
    </tr>
  </table>

  <!-- EXPERIENCES -->
  ${
    cv.experiences && cv.experiences.length > 0
      ? `
  <div class="section-title">Expérience Professionnelle</div>
  ${cv.experiences
    .map(
      (exp) => `
    <div>
      <div class="item-header">
        <div>
          <span class="item-title">${exp.titre}</span>
          ${exp.entreprise ? ` — <span class="item-company">${exp.entreprise}${exp.ville ? ` (${exp.ville})` : ''}</span>` : ''}
        </div>
        <div class="item-date">${exp.dateDebut} – ${exp.dateFin}</div>
      </div>
      ${
        exp.missions && exp.missions.length > 0
          ? `
      <ul class="item-bullets">
        ${exp.missions.map((m) => `<li>${m}</li>`).join('')}
      </ul>`
          : ''
      }
    </div>
  `
    )
    .join('')}
  `
      : ''
  }

  <!-- FORMATIONS -->
  ${
    cv.formations && cv.formations.length > 0
      ? `
  <div class="section-title">Formation et Études</div>
  ${cv.formations
    .map(
      (f) => `
    <div class="item-header">
      <div>
        <span class="item-title">${f.diplome}</span>
        ${f.etablissement ? ` — <span class="item-company">${f.etablissement}${f.ville ? ` (${f.ville})` : ''}</span>` : ''}
      </div>
      <div class="item-date">${f.annee}</div>
    </div>
  `
    )
    .join('')}
  `
      : ''
  }

  <!-- COMPETENCES -->
  <div class="section-title">Compétences</div>

  ${
    cv.competences.professionnelles && cv.competences.professionnelles.length > 0
      ? `
  <div class="sub-section-title">Compétences professionnelles :</div>
  <ul class="bullet-list">
    ${cv.competences.professionnelles.map((cp) => `<li>${cp}</li>`).join('')}
  </ul>
  `
      : ''
  }

  ${
    cv.competences.habilitesPersonnelles && cv.competences.habilitesPersonnelles.length > 0
      ? `
  <div class="sub-section-title">Habilités personnelles et relationnelles :</div>
  <div class="inline-list">
    ${cv.competences.habilitesPersonnelles.join(', ')}.
  </div>
  `
      : ''
  }

  ${
    cv.competences.maitriseLogiciels && cv.competences.maitriseLogiciels.length > 0
      ? `
  <div class="sub-section-title">Maîtrise des logiciels :</div>
  <ul class="bullet-list">
    ${cv.competences.maitriseLogiciels
      .map(
        (ml) =>
          `<li><strong>${ml.categorie} :</strong> ${Array.isArray(ml.outils) ? ml.outils.join(', ') : ml.outils}</li>`
      )
      .join('')}
  </ul>
  `
      : ''
  }

  <!-- LANGUES -->
  ${
    cv.langues && cv.langues.length > 0
      ? `
  <div class="section-title">Langues</div>
  <ul class="bullet-list">
    ${cv.langues.map((l) => `<li><strong>${l.langue} :</strong> ${l.niveau}</li>`).join('')}
  </ul>
  `
      : ''
  }

  <!-- CENTRES D'INTERET -->
  ${
    cv.centresInteret && cv.centresInteret.length > 0
      ? `
  <div class="section-title">Centres d'intérêt</div>
  <div class="inline-list">
    ${cv.centresInteret.join(', ')}.
  </div>
  `
      : ''
  }

  <div class="page-footer">
    1/1
  </div>

</body>
</html>`;
}

const html = generateOfficialCvHtml(sampleCv);
console.log('Generated HTML length:', html.length);

// Assert key elements exist
const assertions = [
  { check: html.includes('KAMENI Dave Lionel'), name: 'Candidate Name' },
  { check: html.includes('#005691'), name: 'Official Blue Color' },
  { check: html.includes('Détails Personnels'), name: 'Section Details Personnels' },
  { check: html.includes('Expérience Professionnelle'), name: 'Section Experience' },
  { check: html.includes('Formation et Études'), name: 'Section Formation' },
  { check: html.includes('Compétences professionnelles :'), name: 'Sub-section Competences pro' },
  { check: html.includes('Habilités personnelles et relationnelles :'), name: 'Sub-section Habilites' },
  { check: html.includes('Maîtrise des logiciels :'), name: 'Sub-section Logiciels' },
  { check: html.includes('Langues'), name: 'Section Langues' },
  { check: html.includes('Centres d\'intérêt'), name: 'Section Loisirs' },
  { check: html.includes('1/1'), name: 'Page 1/1 Footer' },
];

let failed = false;
for (const a of assertions) {
  if (!a.check) {
    console.error(`❌ Assertion failed: ${a.name}`);
    failed = true;
  } else {
    console.log(`✅ Assertion passed: ${a.name}`);
  }
}

if (failed) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL CV TEMPLATE ASSERTIONS PASSED SUCCESSFULLY!');
}

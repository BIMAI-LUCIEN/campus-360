// Renders the gallery thumbnails of the CV templates (assets/cv-templates/<id>.png)
// from src/features/stages/cvHtml.ts with a fictitious student, so the pictures
// always match the real layouts. Run after changing a template:
//   cd mobile-api && node scripts/render-cv-thumbnails.mjs [--full <dir>]
// --full also writes a full-resolution A4 render of each template into <dir>.
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

import { loadTs } from '../tests/helpers/load-ts.mjs';

const cvHtml = await loadTs('../src/features/stages/cvHtml.ts');
const OUT = path.resolve('../assets/cv-templates');
const fullIndex = process.argv.indexOf('--full');
const fullDir = fullIndex > -1 ? path.resolve(process.argv[fullIndex + 1]) : null;

const sample = {
  titrePoste: 'Stagiaire assistante marketing digital',
  profil: "Étudiante en Licence 3 Marketing à l'Université de Douala, j'ai animé les réseaux sociaux d'une PME pendant trois mois. Je cherche un stage pour mettre en pratique la création de contenus et le suivi des campagnes.",
  detailsPersonnels: {
    nom: 'Ndi',
    prenom: 'Awa',
    email: 'awa.ndi@exemple.cm',
    telephone: '+237 6 90 00 00 00',
    adresse: 'Douala, Cameroun',
  },
  experiences: [
    {
      poste: 'Stage community management',
      entreprise: 'Boulangerie Le Palmier',
      ville: 'Douala',
      periode: '06/2025 – 08/2025',
      missions: ['Publication de 3 contenus par semaine sur Facebook et Instagram', 'Suivi des statistiques et rapport mensuel'],
    },
    {
      poste: 'Trésorière du club marketing',
      entreprise: 'Université de Douala',
      ville: 'Douala',
      periode: '2024 – 2025',
      missions: ['Organisation de deux conférences avec des professionnels'],
    },
  ],
  formations: [
    { diplome: 'Licence 3 Marketing', etablissement: 'Université de Douala', ville: 'Douala', periode: '2023 – 2026' },
    { diplome: 'Baccalauréat A4', etablissement: 'Lycée Joss', ville: 'Douala', periode: '2023' },
  ],
  competences: {
    professionnelles: ['Création de contenus', 'Marketing digital', 'Étude de marché'],
    habilitesRelationnelles: ["Travail d'équipe", 'Organisation'],
    logiciels: [{ categorie: 'Bureautique', items: ['Word', 'Excel', 'PowerPoint'] }, { categorie: 'Design', items: ['Canva'] }],
  },
  langues: [{ langue: 'Français', niveau: 'courant' }, { langue: 'Anglais', niveau: 'intermédiaire' }],
  loisirs: ['Lecture', 'Photographie', 'Football'],
};

fs.mkdirSync(OUT, { recursive: true });
if (fullDir) fs.mkdirSync(fullDir, { recursive: true });

const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  // A4 at 96 dpi is 794 x 1123 px; the thumbnail keeps that ratio at 600 px wide (sharp at 2x).
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
  for (const { id } of cvHtml.CV_TEMPLATES) {
    await page.setContent(cvHtml.generateOfficialCvHtml(sample, id), { waitUntil: 'load' });
    if (fullDir) await page.screenshot({ path: path.join(fullDir, `${id}.png`) });
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 600 / 794 });
    await page.screenshot({ path: path.join(OUT, `${id}.png`) });
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
    console.log(`${id}.png`);
  }
} finally {
  await browser.close();
}

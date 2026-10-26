import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs, loadTsWithPackages } from './helpers/load-ts.mjs';

const m = await loadTsWithPackages('lib/cv-fill.ts');
const cvHtml = await loadTs('../src/features/stages/cvHtml.ts');

const input = (notes = '') => m.cvFillRequestSchema.parse({
  job: { title: 'Stage comptable', company: 'Afriland', requirements: ['Excel'] },
  student: { fullName: 'Awa Ndi', major: 'Comptabilité', educationLevel: 'Licence 3', university: 'Université de Douala', skills: ['Excel', 'Sage'] },
  notes,
});

const answer = (cv) => `Voici le CV :\n\`\`\`json\n${JSON.stringify(cv)}\n\`\`\``;

test('le prompt contient l’offre, le profil, les notes et la règle « n’invente rien »', () => {
  const [system, user] = m.buildCvFillMessages(input('Stage chez Boulangerie Le Palmier en 2025'));
  assert.match(system.content, /N’invente rien/);
  assert.match(user.content, /Stage comptable/);
  assert.match(user.content, /Licence 3 en Comptabilité/);
  assert.match(user.content, /Boulangerie Le Palmier/);
});

test('une réponse illisible donne null', () => {
  assert.equal(m.parseCvFill(null, input()), null);
  assert.equal(m.parseCvFill('pas de json', input()), null);
  assert.equal(m.parseCvFill('[1,2]', input()), null);
});

test('sans notes, aucune expérience, langue ni loisir n’est gardé', () => {
  const cv = m.parseCvFill(answer({
    titrePoste: 'Stagiaire comptable',
    profil: 'Étudiante en Licence 3.',
    experiences: [{ poste: 'Comptable', entreprise: 'Total', ville: 'Douala', periode: '2024', missions: ['x'] }],
    langues: [{ langue: 'Anglais', niveau: 'courant' }],
    loisirs: ['Tennis'],
    competences: { professionnelles: ['Saisie comptable'], logiciels: [{ categorie: 'Gestion', items: ['Sage', 'SAP'] }] },
  }), input());
  assert.equal(cv.titrePoste, 'Stagiaire comptable');
  assert.deepEqual(cv.experiences, []);
  assert.deepEqual(cv.langues, []);
  assert.deepEqual(cv.loisirs, []);
  // SAP was never mentioned by the student, Sage was.
  assert.deepEqual(cv.competences.logiciels, [{ categorie: 'Gestion', items: ['Sage'] }]);
  assert.deepEqual(cv.competences.habilitesRelationnelles, []);
});

test('une entreprise, une langue ou un loisir inventés sont retirés, le reste est gardé', () => {
  const notes = "Stage de 3 mois à la boulangerie Le Palmier (caisse, inventaire). Je parle anglais. J'aime la lecture.";
  const cv = m.parseCvFill(answer({
    experiences: [
      { poste: 'Stagiaire caisse', entreprise: 'Boulangerie Le Palmier', ville: 'Douala', periode: '3 mois', missions: ['Tenue de la caisse'] },
      { poste: 'Auditeur', entreprise: 'Deloitte', ville: 'Paris', periode: '2023', missions: [] },
    ],
    langues: [{ langue: 'Anglais', niveau: 'intermédiaire' }, { langue: 'Espagnol', niveau: 'courant' }],
    loisirs: ['Lecture de romans', 'Golf'],
  }), input(notes));
  assert.deepEqual(cv.experiences.map((e) => e.entreprise), ['Boulangerie Le Palmier']);
  assert.deepEqual(cv.langues.map((l) => l.langue), ['Anglais']);
  assert.deepEqual(cv.loisirs, ['Lecture de romans']);
});

test('les types faux deviennent vides et les listes sont bornées', () => {
  const cv = m.parseCvFill(answer({ titrePoste: 42, profil: null, competences: 'x', experiences: 'y', loisirs: [1, 'Lecture'] }), input('lecture'));
  assert.equal(cv.titrePoste, '');
  assert.equal(cv.profil, '');
  assert.deepEqual(cv.competences.professionnelles, ['Excel', 'Sage'], 'les compétences déclarées restent');
  assert.deepEqual(cv.experiences, []);
  assert.deepEqual(cv.loisirs, ['Lecture']);
});

test('la fusion garde identité, contact et photo du profil', () => {
  const base = {
    titrePoste: 'Stage comptable',
    photoUrl: 'https://exemple.cm/p.jpg',
    detailsPersonnels: { nom: 'NDI', prenom: 'Awa', email: 'awa@exemple.cm', telephone: '237600000000' },
    experiences: [],
    formations: [{ diplome: 'Licence 3', etablissement: '', ville: '', periode: 'En cours' }],
    competences: { professionnelles: ['Excel'], habilitesRelationnelles: [], logiciels: [] },
    langues: [],
    loisirs: [],
  };
  const merged = cvHtml.mergeAiCv(base, {
    titrePoste: 'Stagiaire comptable',
    profil: 'Profil.',
    detailsPersonnels: { nom: 'X', prenom: 'Y', email: 'faux@x.cm', telephone: '0' },
    formations: [],
    competences: { professionnelles: ['Saisie'], habilitesRelationnelles: [], logiciels: [] },
  });
  assert.equal(merged.detailsPersonnels.email, 'awa@exemple.cm');
  assert.equal(merged.photoUrl, 'https://exemple.cm/p.jpg');
  assert.equal(merged.titrePoste, 'Stagiaire comptable');
  assert.equal(merged.profil, 'Profil.');
  assert.equal(merged.formations.length, 1, 'une section vide de l’IA garde celle du profil');
  assert.deepEqual(merged.competences.professionnelles, ['Saisie']);
  assert.equal(cvHtml.mergeAiCv(base, null), base);
});

test('cas réel : les compétences et niveaux tirés de l’offre sont retirés, les compétences déclarées restent', () => {
  const real = m.cvFillRequestSchema.parse({
    job: { title: 'Stagiaire en Production Audiovisuelle & Motion Design', requirements: ['Montage vidéo', 'Cadrage'] },
    student: { major: 'Réseaux & Télécommunications', educationLevel: 'Licence 3', skills: ['Linux'] },
    notes: "Stage de 2 mois chez Camtel Douala en 2025 : installation de routeurs et support aux clients. Je parle francais et anglais. J'aime le football et la lecture.",
  });
  const cv = m.parseCvFill(answer({
    competences: {
      professionnelles: ['Installation de matériel audiovisuel', 'Support technique', 'Cadrage & Lumière', 'Montage Vidéo'],
      habilitesRelationnelles: ['Travail en équipe', 'Communication', 'Adaptabilité'],
    },
    langues: [{ langue: 'Français', niveau: 'Courant' }, { langue: 'Anglais', niveau: 'Intermédiaire' }],
    loisirs: ['Football', 'Lecture'],
    experiences: [{
      poste: 'Stagiaire', entreprise: 'Camtel', ville: 'Douala', periode: '2025',
      missions: ['Installation de routeurs', 'Support aux clients', "Collaboration avec l'équipe technique", 'Gestion des incidents techniques'],
    }],
  }), real);
  assert.deepEqual(cv.experiences[0].missions, ['Installation de routeurs', 'Support aux clients']);
  assert.deepEqual(cv.competences.professionnelles, ['Support technique', 'Linux']);
  assert.deepEqual(cv.competences.habilitesRelationnelles, []);
  assert.deepEqual(cv.langues, [{ langue: 'Français', niveau: '' }, { langue: 'Anglais', niveau: '' }]);
  assert.deepEqual(cv.loisirs, ['Football', 'Lecture']);
});

test('une langue sans niveau s’affiche seule dans chaque gabarit', () => {
  for (const { id } of cvHtml.CV_TEMPLATES) {
    const html = cvHtml.generateOfficialCvHtml({
      titrePoste: '', detailsPersonnels: { nom: 'Ndi', prenom: 'Awa', email: 'a@b.cm', telephone: '' },
      experiences: [], formations: [], competences: { professionnelles: [], habilitesRelationnelles: [], logiciels: [] },
      langues: [{ langue: 'Anglais', niveau: '' }], loisirs: [],
    }, id);
    assert.ok(html.includes('Anglais'), id);
    assert.ok(!/Anglais ?:/.test(html) && !html.includes('Anglais ()'), id);
  }
});

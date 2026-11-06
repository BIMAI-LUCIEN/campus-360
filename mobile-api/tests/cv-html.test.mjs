import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const m = await loadTs('../src/features/stages/cvHtml.ts');

const emptyCv = () => ({
  titrePoste: '',
  detailsPersonnels: { nom: '', prenom: '', email: '', telephone: '' },
  experiences: [],
  formations: [],
  competences: { professionnelles: [], habilitesRelationnelles: [], logiciels: [] },
  langues: [],
  loisirs: [],
});

test('escapeHtml neutralise le HTML', () => {
  assert.equal(m.escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.equal(m.escapeHtml(`"'&`), '&quot;&#39;&amp;');
});

test('le CV échappe chaque valeur saisie', () => {
  const cv = emptyCv();
  cv.detailsPersonnels.nom = '<script>x</script>';
  cv.competences.professionnelles = ['<b>ok</b>'];
  const html = m.generateOfficialCvHtml(cv);
  assert.ok(html.includes('&lt;SCRIPT&gt;') || html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>x'));
  assert.ok(!html.includes('<b>ok</b>'));
});

test('photo : seulement https ou data:image, sinon aucune balise img', () => {
  for (const url of ['javascript:alert(1)', 'x" onerror="y', 'http://exemple.cm/p.png']) {
    const cv = emptyCv();
    cv.photoUrl = url;
    const html = m.generateOfficialCvHtml(cv);
    assert.ok(!html.includes('<img'), url);
    assert.ok(!html.includes('onerror'), url);
  }
  const ok = emptyCv();
  ok.photoUrl = 'https://exemple.cm/photo.jpg';
  assert.ok(m.generateOfficialCvHtml(ok).includes('<img src="https://exemple.cm/photo.jpg"'));
});

test('champs obligatoires avant export', () => {
  assert.deepEqual(m.missingCvFields(emptyCv()), ['Nom', 'Prénom', 'E-mail ou téléphone']);
  const cv = emptyCv();
  cv.detailsPersonnels = { nom: 'Ndi', prenom: 'Awa', email: '', telephone: '237600000000' };
  assert.deepEqual(m.missingCvFields(cv), []);
});

test('un CV vide affiche [à compléter], jamais une valeur inventée', () => {
  const html = m.generateOfficialCvHtml(emptyCv());
  assert.ok(html.includes('[à compléter]'));
  for (const fake of ['KAMENI', 'Dave Lionel', '690123456', 'Campus 360 &amp; Projets']) {
    assert.ok(!html.includes(fake), fake);
  }
});

test('le PDF de candidature n’a plus de badge « AI Verified »', () => {
  const html = m.buildApplicationHtml({
    studentName: '<i>Awa</i>', studentEmail: 'a@b.cm', major: 'GEA', educationLevel: 'L3',
    jobTitle: 'Stage', companyName: 'X', letterText: 'Lettre', cvText: 'CV',
  });
  assert.ok(!html.includes('AI Verified'));
  assert.ok(!html.includes('<i>Awa</i>'));
});

test('chaque gabarit du CV garde le contenu et la photo, et échappe les valeurs', () => {
  for (const template of ['classic', 'prestige', 'ingenieur', 'etudiant']) {
    const cv = emptyCv();
    cv.detailsPersonnels = { nom: 'Ndi', prenom: 'Awa', email: 'awa@exemple.cm', telephone: '237600000000' };
    cv.competences.professionnelles = ['<b>ok</b>'];
    cv.photoUrl = 'data:image/jpeg;base64,AAAA';
    const html = m.generateOfficialCvHtml(cv, template);
    assert.ok(html.includes('NDI'), template);
    assert.ok(html.includes('awa@exemple.cm'), template);
    assert.ok(html.includes('<img src="data:image/jpeg;base64,AAAA"'), template);
    assert.ok(!html.includes('<b>ok</b>'), template);
  }
  for (const template of ['prestige', 'ingenieur', 'etudiant']) {
    const empty = m.generateOfficialCvHtml(emptyCv(), template);
    assert.ok(empty.includes('[à compléter]'), template);
    assert.ok(!empty.includes('<img'), template);
  }
  assert.deepEqual(m.CV_TEMPLATES.map(t => t.id), ['classic', 'prestige', 'ingenieur', 'etudiant', 'ats']);
  // ATS: same content and escaping, no photo by design.
  const ats = emptyCv();
  ats.detailsPersonnels = { nom: 'Ndi', prenom: 'Awa', email: 'awa@exemple.cm', telephone: '237600000000' };
  ats.competences.professionnelles = ['<b>ok</b>'];
  const atsHtml = m.generateOfficialCvHtml(ats, 'ats');
  assert.ok(atsHtml.includes('NDI') && atsHtml.includes('awa@exemple.cm'));
  assert.ok(!atsHtml.includes('<b>ok</b>'));
});

test('le profil rédigé par l’IA est échappé et affiché dans chaque gabarit', () => {
  for (const { id } of m.CV_TEMPLATES) {
    const cv = emptyCv();
    cv.profil = 'Étudiante <script>x</script> en comptabilité';
    const html = m.generateOfficialCvHtml(cv, id);
    assert.ok(html.includes('Étudiante &lt;script&gt;x&lt;/script&gt; en comptabilité'), id);
  }
});

test('un identifiant de gabarit inconnu (ancienne version) retombe sur le gabarit officiel', () => {
  const html = m.generateOfficialCvHtml(emptyCv(), 'modern');
  assert.ok(html.includes('Détails personnels'));
  assert.equal(m.isCvTemplateId('modern'), false);
  assert.equal(m.isCvTemplateId('etudiant'), true);
});

test('34.1 : rubriques facultatives imprimées dans l’ordre, sur les 4 modèles', () => {
  const cv = emptyCv();
  cv.rubriques = [
    { id: 'a', kind: 'certificats', titre: 'Certificats', items: ['PIX niveau 3'] },
    { id: 'b', kind: 'activites', titre: 'Activités extra-professionnelles', items: ['Trésorier du club débat'] },
    { id: 'c', kind: 'personnalisee', titre: 'Vide', items: ['  '] },
  ];
  for (const { id } of m.CV_TEMPLATES) {
    const html = m.generateOfficialCvHtml(cv, id);
    const cert = html.indexOf('PIX niveau 3');
    const act = html.indexOf('Trésorier du club débat');
    assert.ok(cert > 0 && act > cert, `${id} : ordre des rubriques`);
    assert.ok(!html.includes('>Vide<'), `${id} : rubrique vide masquée`);
  }
});

test('34.1 : un ancien CV sans rubriques ni dates structurées reste rendu', () => {
  const cv = emptyCv();
  cv.experiences = [{ poste: 'Stagiaire', entreprise: 'Boulangerie', ville: '', periode: '2025 (3 mois)', missions: [] }];
  for (const { id } of m.CV_TEMPLATES) assert.ok(m.generateOfficialCvHtml(cv, id).includes('2025 (3 mois)'), id);
});

test('34.1 : dates mois et année, « ce jour », repli sur la période libre', () => {
  assert.equal(m.cvPeriode({ debut: '2024-03', fin: '2024-08', periode: 'x' }), 'mars 2024 – août 2024');
  assert.equal(m.cvPeriode({ debut: '2025-01', fin: 'present' }), 'janv. 2025 – aujourd’hui');
  assert.equal(m.cvPeriode({ debut: '2025-13', periode: 'été 2025' }), 'été 2025');
  assert.equal(m.formatCvMonth('abc'), '');
});

test('34.1 : mergeAiCv garde les rubriques et les dates du CV de base', () => {
  const base = emptyCv();
  base.rubriques = [{ id: 'a', kind: 'realisations', titre: 'Réalisations', items: ['Site du club'] }];
  const merged = m.mergeAiCv(base, { titrePoste: 'Stagiaire' });
  assert.deepEqual(merged.rubriques, base.rubriques);
});

test('34.5 : la correction IA garde les dates mois/année choisies par l’étudiant', () => {
  const base = emptyCv();
  base.experiences = [{ poste: 'Stagiaire', entreprise: 'Le Palmier', ville: '', periode: '', debut: '2025-06', fin: '2025-08', missions: [] }];
  const merged = m.mergeAiCv(base, { experiences: [{ poste: 'Stagiaire', entreprise: 'Le Palmier', ville: '', periode: '', missions: ['Saisie'] }] });
  assert.equal(merged.experiences[0].debut, '2025-06');
  assert.deepEqual(merged.experiences[0].missions, ['Saisie']);
});

test('34.13 : modèle ATS sur une colonne, sans tableau, icône ni photo, sections dans l’ordre', () => {
  const cv = emptyCv();
  cv.detailsPersonnels = { nom: 'Ndi', prenom: 'Awa', email: 'a@b.cm', telephone: '600' };
  cv.photoUrl = 'https://exemple.cm/p.png';
  cv.experiences = [{ poste: 'Stagiaire', entreprise: 'Palmier', ville: '', periode: '2025', missions: ['Saisie'] }];
  const html = m.generateOfficialCvHtml(cv, 'ats');
  for (const banned of ['<table', '<svg', '<img', 'grid-template-columns']) assert.ok(!html.includes(banned), banned);
  const order = ['Expérience professionnelle', 'Formation', 'Compétences', 'Langues'].map((h) => html.indexOf(`<h2>${h}</h2>`));
  assert.ok(order.every((i, k) => i > 0 && (k === 0 || i > order[k - 1])), `ordre ${order}`);
  assert.ok(m.CV_TEMPLATES.some((t) => t.id === 'ats'));
});

test('34.13 : réglages couleur, police, interligne appliqués ; aucun réglage = HTML inchangé', () => {
  const cv = emptyCv();
  const plain = m.generateOfficialCvHtml(cv, 'classic');
  assert.equal(m.generateOfficialCvHtml(cv, 'classic', {}), plain);
  assert.equal(m.generateOfficialCvHtml(cv, 'classic', { accent: 'modele', police: 'modele', interligne: 'normal' }), plain);
  const styled = m.generateOfficialCvHtml(cv, 'classic', { accent: 'emeraude', police: 'serif', interligne: 'aere' });
  assert.match(styled, /data-cv-style/);
  assert.match(styled, /#047857/);
  assert.match(styled, /Georgia/);
  assert.match(styled, /line-height: 1\.65/);
  for (const { id } of m.CV_TEMPLATES) assert.match(m.generateOfficialCvHtml(cv, id, { accent: 'bordeaux' }), /#9F1239/, id);
  assert.ok(!m.generateOfficialCvHtml(cv, 'classic', { accent: 'x" onload="y' }).includes('onload'), 'accent inconnu ignoré');
});

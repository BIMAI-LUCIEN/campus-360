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
  assert.deepEqual(m.CV_TEMPLATES.map(t => t.id), ['classic', 'prestige', 'ingenieur', 'etudiant']);
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

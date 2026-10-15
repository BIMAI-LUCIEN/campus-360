import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { AI_TIC_BLACKLIST, findAiTics, studentVoiceRules, ticRewritePrompt, HTML_FORMAT_RULE } = await loadTs('lib/writing-rules.ts');

test('findAiTics détecte chaque expression de la liste noire', () => {
  for (const phrase of AI_TIC_BLACKLIST) {
    const tics = findAiTics(`<p>Voici une phrase où ${phrase} apparaît.</p>`);
    assert.ok(tics.some((t) => t.phrase.includes(phrase) || phrase.includes(t.phrase)), `non détecté : ${phrase}`);
  }
});

test('findAiTics ignore accents, majuscules, apostrophes et balises', () => {
  const tics = findAiTics('<p><strong>Il est important de souligner</strong> que, à l’ère du numérique, c’est CRUCIAL.</p>');
  const phrases = tics.map((t) => t.phrase);
  assert.ok(phrases.includes('il est important de souligner'));
  assert.ok(phrases.includes('a l ere du numerique'));
  assert.ok(phrases.includes('crucial'));
});

test('findAiTics garde la plus longue expression et compte les répétitions', () => {
  const tics = findAiTics('Dans un monde en constante évolution, tout change. Dans un monde en constante évolution encore.');
  assert.deepEqual(tics, [{ phrase: 'dans un monde en constante evolution', count: 2 }]);
});

test('findAiTics ignore un texte naturel d’étudiant', () => {
  const text = `<p>J’ai rejoint le service qualité d’Alpha Telecom le 1er juillet. Mon tuteur m’a confié le suivi des réclamations clients.</p>
    <p>Le délai moyen de traitement était de 5 jours. Après la mise en place du tableau de bord, il est passé à 2 jours.</p>
    <p>La conclusion de ce chapitre porte sur les limites de l’outil : il ne couvre pas encore les agences de l’Ouest.</p>`;
  assert.deepEqual(findAiTics(text), []);
});

test('les consignes imposent la voix étudiante, les crochets et le HTML numéroté automatiquement', () => {
  const je = studentVoiceRules('je');
  assert.match(je, /première personne du singulier/);
  assert.match(je, /crochets/);
  assert.match(je, /N’invente jamais|N'invente jamais/);
  assert.match(studentVoiceRules('nous'), /première personne du pluriel/);
  assert.match(HTML_FORMAT_RULE, /<h1>/);
  const rewrite = ticRewritePrompt('<p>En somme, c’est crucial.</p>', findAiTics('En somme, c’est crucial.'));
  assert.match(rewrite, /« en somme »/);
  assert.match(rewrite, /<p>En somme, c’est crucial\.<\/p>/);
});

const { polishAiTics } = await loadTs('lib/writing-rules.ts');

test('polishAiTics : texte avec 3 tics → une passe de réécriture', async () => {
  const html = '<p>Il est important de souligner que ce stage était crucial. En somme, j’ai beaucoup appris sur le suivi des réclamations clients.</p>';
  const prompts = [];
  const result = await polishAiTics(html, async (prompt) => {
    prompts.push(prompt);
    return '<p>Ce stage m’a beaucoup apporté. J’ai surtout appris le suivi des réclamations clients, du dépôt à la clôture.</p>';
  });
  assert.equal(prompts.length, 1);
  assert.match(prompts[0], /« il est important de souligner »/);
  assert.equal(result.rewritten, true);
  assert.deepEqual(result.tics, []);
});

test('polishAiTics : texte propre → aucun appel au modèle', async () => {
  let calls = 0;
  const html = '<p>J’ai rejoint le service qualité en juillet.</p>';
  const result = await polishAiTics(html, async () => { calls += 1; return ''; });
  assert.equal(calls, 0);
  assert.equal(result.html, html);
});

test('polishAiTics : réponse vide, tronquée ou en échec → texte original gardé', async () => {
  const html = '<p>En somme, c’est crucial pour l’entreprise et pour toute l’équipe du service qualité.</p>';
  for (const fake of [async () => null, async () => '<p>Court.</p>', async () => { throw new Error('réseau'); }]) {
    const result = await polishAiTics(html, fake);
    assert.equal(result.html, html);
    assert.equal(result.rewritten, false);
  }
});

const { stripRepeatedTitle } = await loadTs('lib/writing-rules.ts');

test('stripRepeatedTitle retire le titre de section répété en tête, et seulement lui', () => {
  assert.equal(stripRepeatedTitle('<h2>Remerciements</h2><p>Merci.</p>', 'Remerciements'), '<p>Merci.</p>');
  assert.equal(stripRepeatedTitle('<h1>Chapitre 1 : Présentation de la structure d’accueil</h1><p>x</p>', 'Chapitre 1 : Présentation de la structure d’accueil'), '<p>x</p>');
  assert.equal(stripRepeatedTitle('<p><strong>Organisation du service</strong></p><p>x</p>', 'Chapitre 2 : Organisation du service'), '<p>x</p>');
  assert.equal(stripRepeatedTitle('<h1>Historique</h1><p>x</p>', 'Chapitre 1 : Présentation'), '<h1>Historique</h1><p>x</p>');
  assert.equal(stripRepeatedTitle('<p>Remerciements à tous.</p>', 'Remerciements'), '<p>Remerciements à tous.</p>');
});

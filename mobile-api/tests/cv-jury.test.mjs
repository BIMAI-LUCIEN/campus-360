import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTsWithPackages } from './helpers/load-ts.mjs';

const jury = await loadTsWithPackages('lib/cv-jury.ts');

const cvText = [
  'Awa Ndi',
  'Stagiaire assistant comptable',
  'Expérience professionnelle',
  'Stagiaire — Boulangerie Le Palmier — Douala',
  '- Saisie des factures',
  'Compétences',
  '- Sage',
].join('\n');

const judge = (id, note, raisons) => ({ id, note, raisons: raisons ?? [{ citation: 'Saisie des factures', raison: `raison ${id}` }] });
const answer = (patch = {}) => JSON.stringify({
  posteVise: 'Assistant comptable',
  juges: jury.JUDGES.map((j) => judge(j.id, 6)),
  erreurs: [{ gravite: 'majeur', citation: '', juges: ['concurrent'], correction: 'Chiffrer le volume de factures.' }],
  questions: ['Combien de factures saisissais-tu par mois ?'],
  ...patch,
});

test('le prompt contient les six juges, l’offre et la règle « rien inventer »', () => {
  const [system, user] = jury.buildCvJuryMessages(cvText, { title: 'Stage comptable', requirements: ['Excel'] });
  for (const j of jury.JUDGES) assert.match(system.content, new RegExp(`"${j.id}"`));
  assert.match(system.content, /N’invente aucun fait/);
  assert.match(user.content, /Exigences : Excel/);
  assert.match(user.content, /Boulangerie Le Palmier/);
  const [noOffer] = jury.buildCvJuryMessages(cvText, null);
  assert.match(noOffer.content, /déduis le poste visé/);
});

test('réponse valide : six juges, verdict tiré de la note, questions gardées', () => {
  const r = jury.parseCvJury(`Voici :\n\`\`\`json\n${answer({ juges: jury.JUDGES.map((j, i) => judge(j.id, i < 2 ? 8 : 5)) })}\n\`\`\``, cvText);
  assert.equal(r.juges.length, 6);
  assert.equal(r.juges.filter((j) => j.verdict === 'RETENU').length, 2);
  assert.deepEqual(r.questions, ['Combien de factures saisissais-tu par mois ?']);
});

test('une citation absente du CV est retirée', () => {
  const juges = jury.JUDGES.map((j) => judge(j.id, 6));
  juges[0].raisons = [
    { citation: 'Gestion de 500 clients', raison: 'inventée' },
    { citation: '« saisie des FACTURES »', raison: 'citée avec casse et guillemets' },
    { citation: '', raison: 'aucun chiffre dans le poste' },
  ];
  const r = jury.parseCvJury(answer({ juges }), cvText);
  assert.deepEqual(r.juges[0].raisons.map((x) => x.raison), ['citée avec casse et guillemets', 'aucun chiffre dans le poste']);
  assert.equal(r.citationsRetirees, 1);
});

test('note hors bornes ou juge manquant : réponse rejetée', () => {
  const outOfRange = jury.JUDGES.map((j) => judge(j.id, 6));
  outOfRange[3].note = 12;
  assert.equal(jury.parseCvJury(answer({ juges: outOfRange }), cvText), null);
  assert.equal(jury.parseCvJury(answer({ juges: jury.JUDGES.slice(1).map((j) => judge(j.id, 6)) }), cvText), null);
  const decimal = jury.JUDGES.map((j) => judge(j.id, 6));
  decimal[0].note = 6.5;
  assert.equal(jury.parseCvJury(answer({ juges: decimal }), cvText), null);
});

test('JSON tronqué ou vide : null', () => {
  assert.equal(jury.parseCvJury(answer().slice(0, 120), cvText), null);
  assert.equal(jury.parseCvJury(null, cvText), null);
  assert.equal(jury.parseCvJury('pas de json', cvText), null);
});

test('un bloquant relevé par un juge plafonne sa note à 4', () => {
  const r = jury.parseCvJury(answer({
    juges: jury.JUDGES.map((j) => judge(j.id, 8)),
    erreurs: [{ gravite: 'bloquant', citation: '', juges: ['recruteur'], correction: 'Ajouter un e-mail.' }],
  }), cvText);
  assert.equal(r.juges.find((j) => j.id === 'recruteur').note, 4);
  assert.equal(r.juges.find((j) => j.id === 'recruteur').verdict, 'REJETÉ');
  assert.equal(r.juges.find((j) => j.id === 'patron').note, 8);
});

test('erreurs triées par gravité, gravité inconnue écartée', () => {
  const r = jury.parseCvJury(answer({
    erreurs: [
      { gravite: 'mineur', citation: '', juges: ['expert'], correction: 'm' },
      { gravite: 'fatal', citation: '', juges: [], correction: 'x' },
      { gravite: 'bloquant', citation: 'Sage', juges: ['manager', 'inconnu'], correction: 'b' },
    ],
  }), cvText);
  assert.deepEqual(r.erreurs.map((e) => e.gravite), ['bloquant', 'mineur']);
  assert.deepEqual(r.erreurs[0].juges, ['manager']);
});

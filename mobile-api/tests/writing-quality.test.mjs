// Writing quality with the real model (Module 21). Needs OPENROUTER_API_KEY;
// without it the test is skipped. Run on demand:
//   node --env-file=.env.local --test tests/writing-quality.test.mjs
// Three sections are drafted from made-up interview answers, then checked:
// no blacklisted phrase, no number absent from the answers, brackets where an
// answer is missing.

import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTsWithPackages } from './helpers/load-ts.mjs';

const NO_KEY = process.env.OPENROUTER_API_KEY ? false : 'OPENROUTER_API_KEY absente';

const { interviewQuestionsFor, buildDraftMessages } = await loadTsWithPackages('lib/interview.ts', ['lib/writing-rules.ts', 'lib/document-outlines.ts']);
const { findAiTics, polishAiTics } = await loadTsWithPackages('lib/writing-rules.ts', []);
const { callLlm, llmRewrite } = await loadTsWithPackages('lib/llm.ts', []);

const CASES = [
  {
    title: 'Remerciements',
    answers: {
      supervisors: 'M. Ebogo, chef du service comptable, qui a relu mes écritures chaque soir ; Mme Tchana, mon encadreur à l’IUT, qui m’a aidé à choisir le plan.',
      institution: 'Le chef de département GEA de l’IUT de Douala.',
      personal: 'Mes parents et ma sœur Linda.',
    },
    skipped: ['colleagues'],
    // Thanks leave a missing person out instead of marking a gap.
    gapsExpected: false,
  },
  {
    title: 'Chapitre 1 : Présentation de la structure d’accueil',
    answers: {
      identity: 'Cabinet Ebogo & Associés, SARL créée en 2011, siège à Douala, quartier Bonapriso.',
      activity: 'Tenue de comptabilité, déclarations fiscales et paie pour des PME et des ONG.',
      size: '14 employés, une seule agence. Je ne connais pas le chiffre d’affaires.',
      organisation: 'Une direction, un service comptable, un service fiscal et un secrétariat. J’étais au service comptable.',
    },
    skipped: ['position'],
    gapsExpected: true,
  },
  {
    title: 'Chapitre 2 : Organisation du service et déroulement du stage',
    answers: {
      welcome: 'Arrivé le 3 juin, présenté à l’équipe par M. Ebogo, deux jours à observer avant de saisir.',
      missions: 'Saisie des pièces d’achat, lettrage des comptes fournisseurs, préparation des déclarations de TVA.',
      example: 'Pour un client grossiste, j’ai saisi 320 factures du mois de mai dans Sage, puis lettré les comptes. J’ai trouvé deux factures saisies en double.',
      tools: 'Sage Comptabilité 100, Excel, le plan comptable OHADA.',
    },
    skipped: ['schedule'],
    gapsExpected: true,
  },
];

const numbersIn = (text) => new Set((text.replace(/<[^>]+>/g, ' ').match(/\d+/g) || []).map(Number));

test('trois sections rédigées depuis l’entretien : 0 tic, aucun chiffre inventé, crochets pour les manques', { skip: NO_KEY, timeout: 300_000 }, async () => {
  const report = [];
  for (const item of CASES) {
    const questions = interviewQuestionsFor(item.title, 'stage', 'gestion');
    const messages = buildDraftMessages({
      sectionTitle: item.title,
      documentTitle: 'Rapport de stage au cabinet Ebogo & Associés',
      kind: 'stage',
      field: 'gestion',
      questions,
      answers: item.answers,
    });
    const raw = await callLlm(messages, { temperature: 0.4, maxTokens: 2200 });
    assert.ok(raw, `pas de réponse du modèle pour ${item.title}`);
    const { html, rewritten } = await polishAiTics(raw, llmRewrite);

    const tics = findAiTics(html);
    const allowed = numbersIn(Object.values(item.answers).join(' ') + ' ' + item.title);
    const invented = [...numbersIn(html)].filter((n) => !allowed.has(n));
    const brackets = (html.match(/\[[^\]]{2,}\]/g) || []).length;
    report.push({ section: item.title, gapsExpected: item.gapsExpected, excerpt: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 500), tics: tics.map((t) => t.phrase), invented, brackets, rewritten, length: html.length });
  }
  console.log(JSON.stringify(report, null, 2));
  for (const r of report) {
    assert.deepEqual(r.tics, [], `${r.section} : tics restants`);
    assert.deepEqual(r.invented, [], `${r.section} : chiffres absents des réponses`);
    if (r.gapsExpected) assert.ok(r.brackets > 0, `${r.section} : aucun crochet alors qu’une réponse manque`);
  }
});

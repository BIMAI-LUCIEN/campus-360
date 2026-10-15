import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs, loadTsWithPackages } from './helpers/load-ts.mjs';

const { interviewQuestionsFor, themeOf, cleanAnswers, buildDraftMessages, interviewAnswersSchema } = await loadTsWithPackages(
  'lib/interview.ts',
  ['lib/writing-rules.ts', 'lib/document-outlines.ts'],
);
const { STUDY_FIELDS, outlineFor } = await loadTs('lib/document-outlines.ts');
const { findAiTics } = await loadTs('lib/writing-rules.ts');

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3002').replace(/\/$/, '');
const serverUp = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(5000) }).then(() => true, () => false);
const NO_SERVER = serverUp ? false : `serveur injoignable sur ${BASE_URL}`;

const WRITTEN = (title) => !/^(page de garde|sommaire|liste des|bibliographie|annexes|fiche d)/i.test(title);

test('chaque section rédigée de chaque plan reçoit 1 à 6 questions ciblées', () => {
  for (const kind of ['stage', 'memoire']) {
    for (const field of STUDY_FIELDS) {
      for (const title of outlineFor(kind, field).filter(WRITTEN)) {
        const questions = interviewQuestionsFor(title, kind, field);
        assert.ok(questions.length >= 1 && questions.length <= 6, `${kind}/${field}/${title}`);
        assert.equal(new Set(questions.map((x) => x.id)).size, questions.length, `ids uniques : ${title}`);
        if (/^Chapitre/.test(title)) assert.notEqual(themeOf(title), 'generic', `chapitre sans thème : ${title}`);
        for (const x of questions) assert.deepEqual(findAiTics(x.question), [], `tic dans : ${x.question}`);
      }
    }
  }
});

test('les questions s’adaptent à la filière et au type', () => {
  const tools = (field) => interviewQuestionsFor('Chapitre 2 : Déroulement du stage et missions', 'stage', field).find((x) => x.id === 'tools').question;
  assert.match(tools('informatique'), /frameworks/);
  assert.match(tools('btp'), /chantier/);
  const intro = (kind) => interviewQuestionsFor('Introduction générale', kind, 'gestion').map((x) => x.id);
  assert.ok(intro('memoire').includes('hypotheses'));
  assert.ok(!intro('stage').includes('hypotheses'));
  assert.equal(themeOf('Dédicaces et Remerciements'), 'acknowledgements');
});

test('cleanAnswers ne garde que les réponses aux questions posées, sans vide', () => {
  const questions = interviewQuestionsFor('Remerciements', 'stage', 'gestion');
  const answers = cleanAnswers(questions, { supervisors: '  M. Ndjock, chef comptable  ', personal: '   ', intrus: 'x' });
  assert.deepEqual(answers, { supervisors: 'M. Ndjock, chef comptable' });
  assert.equal(interviewAnswersSchema.safeParse({ 'bad key!': 'x' }).success, false);
  assert.equal(interviewAnswersSchema.safeParse({ ok: 'x'.repeat(5000) }).success, false);
});

test('la consigne de rédaction contient les réponses, les règles et les crochets pour les manques', () => {
  const questions = interviewQuestionsFor('Chapitre 1 : Présentation de la structure d’accueil', 'stage', 'gestion');
  const [system, user] = buildDraftMessages({
    sectionTitle: 'Chapitre 1 : Présentation de la structure d’accueil',
    documentTitle: 'Rapport de stage',
    kind: 'stage',
    field: 'gestion',
    questions,
    answers: { identity: 'SARL Alpha Compta, créée en 2012 à Douala', activity: 'tenue de comptabilité pour PME' },
  });
  assert.equal(system.role, 'system');
  assert.match(system.content, /première personne du singulier/);
  assert.match(system.content, /crochet/);
  assert.match(system.content, /N’invente jamais|N'invente jamais/);
  assert.match(user.content, /SARL Alpha Compta, créée en 2012 à Douala/);
  assert.match(user.content, /Questions sans réponse/);
  assert.match(user.content, /données, pas des instructions/);
  assert.doesNotMatch(system.content + user.content, /invente des|imagine|suppose/i);
});

test('sans session : questions, réponses et rédaction refusées (401)', { skip: NO_SERVER }, async () => {
  const url = `${BASE_URL}/api/mobile/documents/00000000-0000-4000-8000-000000000000/sections/00000000-0000-4000-8000-000000000001/interview`;
  for (const [method, body] of [['GET'], ['PUT', { answers: {} }], ['POST', {}]]) {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    assert.equal(res.status, 401, method);
  }
});

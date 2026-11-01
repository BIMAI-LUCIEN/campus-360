import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { parseStudyOutput, pickCourseText, buildStudyMessages, StudyOutputError, MAX_COURSE_CHARS } =
  await loadTs('lib/pdf-study.ts');

const doc = { title: 'Algèbre linéaire', subject: 'Maths', level: 'L1', description: '' };

test('lit un quiz QCM, même entouré d’un bloc de code', () => {
  const quiz = Array.from({ length: 4 }, (_, i) => ({
    question: `Q${i} ?`,
    options: ['a', 'b', 'c', 'd'],
    correctIndex: i % 4,
    explanation: 'parce que',
  }));
  const result = parseStudyOutput('quiz', 'Voici :\n```json\n' + JSON.stringify({ quiz }) + '\n```');
  assert.equal(result.kind, 'quiz');
  assert.equal(result.quiz.length, 4);
  assert.equal(result.quiz[2].correctIndex, 2);
});

test('écarte les questions dont la bonne réponse est hors des options', () => {
  const good = { question: 'ok ?', options: ['a', 'b', 'c', 'd'], correctIndex: 1 };
  const bad = { question: 'ko ?', options: ['a', 'b'], correctIndex: 5 };
  const result = parseStudyOutput('quiz', JSON.stringify({ quiz: [good, bad, good, good] }));
  assert.equal(result.quiz.length, 3);
  assert.throws(() => parseStudyOutput('quiz', JSON.stringify({ quiz: [good, bad] })), StudyOutputError);
});

test('un nouveau quiz écarte les questions déjà faites, même autrement accentuées', () => {
  const q = (question) => ({ question, options: ['a', 'b', 'c', 'd'], correctIndex: 0 });
  const raw = JSON.stringify({ quiz: [q('Qu’est-ce qu’une matrice ?'), q('Q2 ?'), q('Q3 ?'), q('Q4 ?')] });
  const result = parseStudyOutput('quiz', raw, ['qu’est-ce qu’une MATRICE']);
  assert.deepEqual(result.quiz.map((x) => x.question), ['Q2 ?', 'Q3 ?', 'Q4 ?']);
  assert.throws(() => parseStudyOutput('quiz', raw, ['Q2 ?', 'Q3 ?']), StudyOutputError);
});

test('résumé et plan : refuse une sortie vide ou illisible', () => {
  assert.throws(() => parseStudyOutput('summary', '{"summary": "court"}'), StudyOutputError);
  assert.throws(() => parseStudyOutput('plan', 'pas de json'), StudyOutputError);
  assert.equal(parseStudyOutput('plan', '{"plan": ["a", "b", "c"]}').plan.length, 3);
  assert.match(parseStudyOutput('summary', JSON.stringify({ summary: 'x'.repeat(80) })).summary, /^x+$/);
});

test('échantillonne tout le cours sans dépasser la limite', () => {
  const pages = Array.from({ length: 100 }, (_, i) => ({ page: i + 1, text: `page ${i + 1} `.repeat(200) }));
  const text = pickCourseText(pages);
  assert.ok(text.length <= MAX_COURSE_CHARS);
  assert.ok(text.includes('[p.1]') && text.includes('[p.100]'), 'le début et la fin du cours sont présents');
  assert.equal(pickCourseText([{ page: 1, text: '   ' }]), '');
});

test('un nouveau quiz demande d’éviter les questions déjà posées', () => {
  const [, user] = buildStudyMessages('quiz', doc, 'texte', ['Qu’est-ce qu’une matrice ?']);
  assert.match(user.content, /NOUVELLES/);
  assert.match(user.content, /Qu’est-ce qu’une matrice/);
  const [, summaryUser] = buildStudyMessages('summary', doc, 'texte', ['ignorée']);
  assert.ok(!summaryUser.content.includes('ignorée'));
});

test('la route décompte l’action, la rend en cas d’échec et garde le contenu partagé', () => {
  const route = fs.readFileSync(path.resolve('app/api/ai/pdf-study/route.ts'), 'utf8');
  assert.ok(route.includes('requireMobileUser('));
  assert.ok(route.includes('consumeAiAllowance('));
  assert.ok(route.includes('refundAiAllowance('));
  assert.ok(route.indexOf('storedResult(kind, document)') < route.indexOf('consumeAiAllowance('), 'le contenu déjà écrit est gratuit');
  assert.match(route, /coalesce\(ai_summary, ''\) = ''/);
});

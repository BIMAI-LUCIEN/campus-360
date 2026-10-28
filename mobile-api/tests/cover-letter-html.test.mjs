import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const m = await loadTs('../src/features/stages/cvHtml.ts');

const base = {
  studentName: 'Awa Ndiaye',
  studentEmail: 'awa@example.com',
  studentPhone: '+237600000000',
  major: 'Informatique',
  educationLevel: 'Licence',
  jobTitle: 'Stage développeur',
  companyName: 'Acme',
  letterText: 'Madame, Monsieur,\nJe souhaite rejoindre votre équipe.',
  cvText: '',
};

test('cover letter PDF holds the letter, the subject and the contact', () => {
  const html = m.buildCoverLetterHtml(base);
  assert.match(html, /Je souhaite rejoindre votre équipe\./);
  assert.match(html, /Stage développeur — Acme/);
  assert.match(html, /awa@example\.com/);
  assert.match(html, /\+237600000000/);
});

test('cover letter escapes student and model values', () => {
  const html = m.buildCoverLetterHtml({
    ...base,
    letterText: '<script>alert(1)</script>',
    studentPhone: '"><img src=x onerror=alert(1)>',
  });
  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /&lt;script&gt;/);
});

test('empty letter prints the placeholder, never an invented text', () => {
  const html = m.buildCoverLetterHtml({ ...base, letterText: '  ' });
  assert.match(html, /\[à compléter\]/);
});

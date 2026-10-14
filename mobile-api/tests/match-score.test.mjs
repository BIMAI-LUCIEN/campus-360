import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Transpile the pure TS module on the fly (no runtime flag needed on Node 22).
const source = fs.readFileSync(path.resolve('lib/match-score.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { computeMatchScore, MATCH_ALERT_THRESHOLD } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
);

test('le seuil d’alerte « nouvelle offre » est 70 %', () => {
  assert.equal(MATCH_ALERT_THRESHOLD, 70);
});

test('score = part des exigences couvertes, sans tenir compte de la casse ni des accents', () => {
  const requirements = ['React', 'TypeScript', 'Git', 'SQL'];
  assert.equal(computeMatchScore(['react / react native', 'typescript', 'git & ci/cd'], requirements), 75);
  assert.equal(computeMatchScore(['Comptabilité'], ['comptabilite']), 100);
});

test('aucune compétence ou aucune exigence donne 0', () => {
  assert.equal(computeMatchScore([], ['React']), 0);
  assert.equal(computeMatchScore(['React'], []), 0);
});

test('une offre sans rapport reste sous le seuil', () => {
  const score = computeMatchScore(['SYSCOHADA', 'Fiscalité'], ['Linux', 'Docker', 'Cisco / CCNA']);
  assert.ok(score < 70);
});

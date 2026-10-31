import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { buildGroundedContext, buildSourcesContext, markCited, PERSONAL_HEADING, REFERENCE_HEADING } =
  await loadTs('lib/source-grounding.ts');

const chunk = (fileId, content, extra = {}) => ({
  chunk_id: `${fileId}-${content.length}`,
  file_id: fileId,
  page: 1,
  position: 0,
  content,
  rank: 1,
  title: `Titre ${fileId}`,
  mime: 'text/plain',
  source_url: null,
  ...extra,
});

test('buildSourcesContext : la numérotation reprend après le décalage', () => {
  const { context, citations } = buildSourcesContext(['b'], [chunk('b', 'texte')], 2);
  assert.match(context, /^\[Source 3\] « Titre b »/);
  assert.equal(citations[0].label, 3);
});

test('buildGroundedContext : documents de l’étudiant puis références, numérotation partagée', () => {
  const grounded = buildGroundedContext({
    personalIds: ['p1', 'p2'],
    personalChunks: [chunk('p1', 'Lundi : installation du serveur'), chunk('p2', 'Mardi : tests')],
    referenceIds: ['r1'],
    referenceChunks: [chunk('r1', 'Définition du réseau local', { mime: 'application/pdf', page: 4 })],
  });
  assert.ok(grounded);
  const personalAt = grounded.context.indexOf(PERSONAL_HEADING);
  const referenceAt = grounded.context.indexOf(REFERENCE_HEADING);
  assert.ok(personalAt >= 0 && referenceAt > personalAt, 'documents avant références');
  assert.match(grounded.context, /\[Source 1\] « Titre p1 »/);
  assert.match(grounded.context, /\[Source 3, p\.4\] « Titre r1 »/);
  assert.deepEqual(grounded.citations.map((c) => [c.label, c.role]), [[1, 'personal'], [2, 'personal'], [3, 'reference']]);
});

test('buildGroundedContext : un seul groupe, pas d’en-tête vide', () => {
  const onlyRefs = buildGroundedContext({
    personalIds: [],
    personalChunks: [],
    referenceIds: ['r1'],
    referenceChunks: [chunk('r1', 'Norme ISO')],
  });
  assert.ok(onlyRefs);
  assert.ok(!onlyRefs.context.includes(PERSONAL_HEADING));
  assert.match(onlyRefs.context, /\[Source 1\] « Titre r1 »/);
});

test('buildGroundedContext : rien de retrouvé → null', () => {
  assert.equal(buildGroundedContext({ personalIds: ['p'], personalChunks: [], referenceIds: [], referenceChunks: [] }), null);
});

test('markCited garde le rôle et place les sources citées en tête', () => {
  const grounded = buildGroundedContext({
    personalIds: ['p1'],
    personalChunks: [chunk('p1', 'a')],
    referenceIds: ['r1'],
    referenceChunks: [chunk('r1', 'b')],
  });
  const marked = markCited('<p>Selon la norme [Source 2].</p>', grounded.citations);
  assert.equal(marked[0].label, 2);
  assert.equal(marked[0].cited, true);
  assert.equal(marked[0].role, 'reference');
});

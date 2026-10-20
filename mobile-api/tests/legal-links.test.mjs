import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { legalLinks } = await loadTs('../src/config/legalLinks.ts');

test('legalLinks : normalise la base sans slash terminal et construit les 4 routes légales', () => {
  const withTrailingSlash = legalLinks('https://campus360b.site/');
  assert.equal(withTrailingSlash.conditions, 'https://campus360b.site/conditions');
  assert.equal(withTrailingSlash.privacy, 'https://campus360b.site/confidentialite');
  assert.equal(withTrailingSlash.legal, 'https://campus360b.site/mentions-legales');
  assert.equal(withTrailingSlash.deletion, 'https://campus360b.site/suppression-compte');

  const withoutTrailingSlash = legalLinks('https://campus360b.site');
  assert.equal(withoutTrailingSlash.conditions, 'https://campus360b.site/conditions');
  assert.equal(withoutTrailingSlash.privacy, 'https://campus360b.site/confidentialite');
  assert.equal(withoutTrailingSlash.legal, 'https://campus360b.site/mentions-legales');
  assert.equal(withoutTrailingSlash.deletion, 'https://campus360b.site/suppression-compte');
});

test('legalLinks : repli par défaut si base vide', () => {
  const defaultLinks = legalLinks('');
  assert.equal(defaultLinks.conditions, 'https://campus360b.site/conditions');
  assert.equal(defaultLinks.privacy, 'https://campus360b.site/confidentialite');
  assert.equal(defaultLinks.legal, 'https://campus360b.site/mentions-legales');
  assert.equal(defaultLinks.deletion, 'https://campus360b.site/suppression-compte');
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { stripEditorPlaceholder, isEmptyEditorHtml } = await loadTs('lib/editor-html.ts');

const LEGACY = 'Commencez à rédiger votre Chapitre 1 : Contexte et Présentation de l&#039;Entreprise ici comme dans Word...';

test('l’ancien texte d’aide de l’éditeur n’est jamais exporté', () => {
  assert.equal(stripEditorPlaceholder(`<p>${LEGACY}</p>`), '');
  assert.equal(stripEditorPlaceholder(`<p>Alpha Telecom.${LEGACY}</p>`), '<p>Alpha Telecom.</p>');
  assert.equal(stripEditorPlaceholder('<p>Texte normal</p>'), '<p>Texte normal</p>');
});

test('détection des sections vides', () => {
  assert.equal(isEmptyEditorHtml(''), true);
  assert.equal(isEmptyEditorHtml('<p><br></p><p>&nbsp;</p>'), true);
  assert.equal(isEmptyEditorHtml(`<p>${LEGACY}</p>`), true);
  assert.equal(isEmptyEditorHtml('<p>Contenu</p>'), false);
  assert.equal(isEmptyEditorHtml('<figure><img data-file-id="x"></figure>'), false);
  assert.equal(isEmptyEditorHtml('<table><tr><td><br></td></tr></table>'), false);
});

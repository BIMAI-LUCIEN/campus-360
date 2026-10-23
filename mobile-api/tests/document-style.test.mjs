import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs, loadTsWithPackages } from './helpers/load-ts.mjs';

const style = await loadTs('lib/document-style.ts');
const { resolveStyle, applyStylePatch, presetStyle, STYLE_PRESETS, legacyColumnsFromStyle } = style;

test('la copie de l’app est identique au modèle du serveur', () => {
  const server = fs.readFileSync(path.resolve('lib/document-style.ts'), 'utf8');
  const client = fs.readFileSync(path.resolve('../src/features/documents/documentStyle.ts'), 'utf8');
  assert.equal(client, server, 'modifier les deux fichiers ensemble');
});

test('les 4 styles prêts sont complets et valides', () => {
  assert.deepEqual([...STYLE_PRESETS], ['classique', 'moderne', 'sobre', 'institutionnel']);
  for (const preset of STYLE_PRESETS) {
    const s = presetStyle(preset);
    assert.deepEqual(resolveStyle(s), s, `${preset} doit être stable une fois résolu`);
  }
  assert.equal(presetStyle('classique').typography.bodyFont, 'Times New Roman');
  assert.equal(presetStyle('institutionnel').headings.numbering, 'roman-alpha');
});

test('un style partiel (migration 0007) est complété par le style prêt', () => {
  const s = resolveStyle({ version: 1, preset: 'classique', typography: { bodyFont: 'Georgia', lineSpacing: 2 }, page: { margins: 'wide' } });
  assert.equal(s.typography.bodyFont, 'Georgia');
  assert.equal(s.typography.headingFont, 'Times New Roman');
  assert.equal(s.typography.lineSpacing, 2);
  assert.equal(s.page.margins, 'wide');
  assert.equal(s.headerFooter.footerCenter, 'page');
});

test('les valeurs invalides retombent sur le style prêt', () => {
  const s = resolveStyle({
    preset: 'inconnu',
    typography: { bodyFont: 'Comic Sans MS', bodySize: 40, lineSpacing: -3 },
    headings: { color: 'red;background:url(x)' },
    cover: { schoolLogoFileId: '../../etc/passwd', extraLines: [{ label: 'Jury', value: 'M. X' }, 'pas un objet'] },
  });
  assert.equal(s.preset, 'classique');
  assert.equal(s.typography.bodyFont, 'Times New Roman');
  assert.equal(s.typography.bodySize, 14);
  assert.equal(s.typography.lineSpacing, 1);
  assert.equal(s.headings.color, '#000000');
  assert.equal(s.cover.schoolLogoFileId, null);
  assert.deepEqual(s.cover.extraLines, [{ label: 'Jury', value: 'M. X' }]);
  assert.equal(resolveStyle(null).preset, 'classique');
});

test('changer de style garde les logos et lignes de la page de garde', () => {
  const logo = '1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d';
  const current = applyStylePatch(presetStyle('classique'), { cover: { schoolLogoFileId: logo, extraLines: [{ label: 'Jury', value: 'Pr. Y' }] } });
  const next = applyStylePatch(current, { preset: 'moderne' });
  assert.equal(next.typography.bodyFont, 'Georgia');
  assert.equal(next.cover.schoolLogoFileId, logo);
  assert.deepEqual(next.cover.extraLines, [{ label: 'Jury', value: 'Pr. Y' }]);
});

test('un réglage fin ne touche que la clé modifiée', () => {
  const next = applyStylePatch(presetStyle('sobre'), { typography: { bodySize: 12 }, tables: { style: 'grid' } });
  assert.equal(next.typography.bodySize, 12);
  assert.equal(next.typography.bodyFont, 'Arial');
  assert.equal(next.tables.style, 'grid');
  assert.equal(next.preset, 'sobre');
  assert.deepEqual(legacyColumnsFromStyle(next), { font_family: 'Arial', line_spacing: 1.5, margins: 'wide', cover_template: 'minimalist' });
});

test('schéma strict : police hors liste, clé inconnue ou couleur invalide rejetées', async () => {
  const { documentStylePatchSchema } = await loadTsWithPackages('lib/document-style-schema.ts', ['lib/document-style.ts']);
  const ok = (body) => documentStylePatchSchema.safeParse(body).success;
  assert.equal(ok({ preset: 'moderne' }), true);
  assert.equal(ok({ typography: { bodyFont: 'Georgia', bodySize: 12 }, headings: { color: '#1E3A8A' } }), true);
  assert.equal(ok({ typography: { bodyFont: 'Comic Sans MS' } }), false);
  assert.equal(ok({ typography: { bodySize: 30 } }), false);
  assert.equal(ok({ headings: { color: 'red' } }), false);
  assert.equal(ok({ page: { margins: 'normal', inconnu: 1 } }), false);
  assert.equal(ok({ cover: { schoolLogoFileId: '../x' } }), false);
  assert.equal(ok({ cover: { extraLines: Array.from({ length: 7 }, () => ({ label: 'a', value: 'b' })) } }), false);
});

test('module 24 : les 4 styles prêts ont les nouvelles options, aux valeurs qui ne changent rien', () => {
  for (const preset of STYLE_PRESETS) {
    const s = presetStyle(preset);
    assert.equal(s.headerFooter.headerStyle, 'plain');
    assert.equal(s.headerFooter.headerTextColor, '#FFFFFF');
    assert.equal(s.headerFooter.authorLabel, '');
    assert.equal(s.headerFooter.footerRule, false);
    assert.equal(s.headerFooter.pageNumberFrame, 'none');
    assert.equal(s.page.bandColor, s.page.accentColor);
    assert.deepEqual(s.captions, { scope: 'chapter', style: 'italic-center', boldLabel: true });
    assert.deepEqual(s.lists, { bullet: 'disc' });
    assert.deepEqual(s.dedication, { frame: false });
  }
});

test('module 24 : un style enregistré sans les nouvelles clés reçoit les valeurs du style prêt', () => {
  const s = resolveStyle({ version: 1, preset: 'moderne', headerFooter: { headerLeft: 'title' }, page: { margins: 'wide' } });
  assert.equal(s.headerFooter.headerStyle, 'plain');
  assert.equal(s.page.bandColor, '#1E3A8A');
  assert.equal(s.captions.scope, 'chapter');
  assert.equal(s.lists.bullet, 'disc');
  assert.equal(s.dedication.frame, false);
});

test('module 24 : valeurs invalides corrigées, libellé auteur tronqué à 60 caractères', () => {
  const s = resolveStyle({
    headerFooter: { headerStyle: 'neon', authorLabel: 'x'.repeat(200), pageNumberFrame: 'cercle', headerTextColor: 'blanc' },
    page: { bandColor: 'rouge' },
    headings: { numbering: 'chapter-section-roman' },
    captions: { scope: 'page', style: 'bold-left' },
    lists: { bullet: 'étoile' },
    dedication: { frame: 'oui' },
  });
  assert.equal(s.headerFooter.headerStyle, 'plain');
  assert.equal(s.headerFooter.authorLabel.length, 60);
  assert.equal(s.headerFooter.pageNumberFrame, 'none');
  assert.equal(s.headerFooter.headerTextColor, '#FFFFFF');
  assert.equal(s.page.bandColor, presetStyle('classique').page.accentColor);
  assert.equal(s.headings.numbering, 'chapter-section-roman');
  assert.deepEqual(s.captions, { scope: 'chapter', style: 'bold-left', boldLabel: true });
  assert.equal(s.lists.bullet, 'disc');
  assert.equal(s.dedication.frame, false);
});

test('module 24 : changer de style garde le libellé auteur saisi', () => {
  const current = applyStylePatch(presetStyle('classique'), { headerFooter: { authorLabel: 'Rédigé et présenté par :', headerStyle: 'band' } });
  const next = applyStylePatch(current, { preset: 'institutionnel' });
  assert.equal(next.headerFooter.authorLabel, 'Rédigé et présenté par :');
  assert.equal(next.headerFooter.headerStyle, 'plain');
});

test('module 24 : schéma des nouvelles options', async () => {
  const { documentStylePatchSchema } = await loadTsWithPackages('lib/document-style-schema.ts', ['lib/document-style.ts']);
  const ok = (body) => documentStylePatchSchema.safeParse(body).success;
  assert.equal(ok({ captions: { scope: 'page' } }), false);
  assert.equal(ok({ headerFooter: { authorLabel: 'x'.repeat(61) } }), false);
  assert.equal(ok({ headerFooter: { authorLabel: 'x'.repeat(60), headerStyle: 'band', footerRule: true, pageNumberFrame: 'box', headerTextColor: '#FFFFFF' } }), true);
  assert.equal(ok({ lists: { bullet: 'diamond' } }), true);
  assert.equal(ok({ lists: { couleur: 'x' } }), false);
  assert.equal(ok({ page: { bandColor: '#0F3D56' } }), true);
  assert.equal(ok({ page: { bandColor: 'bleu' } }), false);
  assert.equal(ok({ headings: { numbering: 'chapter-section-roman' } }), true);
  assert.equal(ok({ dedication: { frame: true } }), true);
});

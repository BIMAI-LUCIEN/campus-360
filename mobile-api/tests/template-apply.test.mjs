import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs, loadTsWithPackages } from './helpers/load-ts.mjs';

const { mergeOutline, sameSection, styleFromTemplate, sectionsForNewDocument } = await loadTsWithPackages('lib/template-apply.ts', ['lib/document-style.ts']);
const { applyTemplateToDocument } = await loadTsWithPackages('lib/template-apply-service.ts', ['lib/document-style.ts', 'lib/template-apply.ts']);
const { presetStyle, applyStylePatch } = await loadTs('lib/document-style.ts');

test('sameSection : préfixe sur une frontière de mot, sans accents ni casse', () => {
  assert.equal(sameSection('Introduction', 'Introduction générale'), true);
  assert.equal(sameSection('Chapitre 1 : Présentation', 'Chapitre 1'), true);
  assert.equal(sameSection('DÉDICACE', 'dedicace'), true);
  assert.equal(sameSection('Chapitre 1', 'Chapitre 10'), false);
  assert.equal(sameSection('Conclusion', 'Introduction'), false);
});

test('mergeOutline : ajoute seulement les sections manquantes, à leur place', () => {
  const existing = [
    { title: 'Page de garde', position: 0 },
    { title: 'Introduction', position: 1 },
    { title: 'Chapitre 1 : Contexte', position: 2 },
    { title: 'Conclusion', position: 3 },
  ];
  const outline = ['Dédicace', 'Remerciements', 'Introduction générale', 'Chapitre 1', 'Chapitre 2', 'Conclusion générale'].map((title) => ({ title }));
  const { order, added } = mergeOutline(existing, outline);
  assert.deepEqual(added, ['Dédicace', 'Remerciements', 'Chapitre 2']);
  const titles = order.map((o) => (o.kind === 'new' ? o.title : existing[o.index].title));
  assert.deepEqual(titles, ['Page de garde', 'Dédicace', 'Remerciements', 'Introduction', 'Chapitre 1 : Contexte', 'Chapitre 2', 'Conclusion']);
  assert.equal(order.filter((o) => o.kind === 'existing').length, existing.length, 'aucune section existante perdue');
});

test('styleFromTemplate : style et garde du modèle, logos et lignes de l’étudiant', () => {
  const logo = '1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d';
  const template = applyStylePatch(presetStyle('institutionnel'), {
    headerFooter: { headerStyle: 'band', authorLabel: 'Rédigé et présenté par :' },
    cover: { blocks: [{ id: 'kind', type: 'heading', text: 'RAPPORT DE STAGE', style: {} }], schoolLogoFileId: '9a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d' },
  });
  const current = applyStylePatch(presetStyle('classique'), { cover: { schoolLogoFileId: logo, extraLines: [{ label: 'Jury', value: 'Pr. Y' }] } });
  const next = styleFromTemplate(template, current);
  assert.equal(next.preset, 'institutionnel');
  assert.equal(next.headerFooter.headerStyle, 'band');
  assert.equal(next.headerFooter.authorLabel, 'Rédigé et présenté par :');
  assert.equal(next.cover.blocks.length, 1);
  assert.equal(next.cover.schoolLogoFileId, logo, 'logo de l’étudiant gardé');
  assert.equal(next.cover.companyLogoFileId, null);
  assert.deepEqual(next.cover.extraLines, [{ label: 'Jury', value: 'Pr. Y' }]);
  assert.equal(styleFromTemplate(template).cover.schoolLogoFileId, null, 'jamais le logo du modèle');
});

test('nouveau document : la garde puis le plan du modèle', () => {
  assert.deepEqual(sectionsForNewDocument([{ title: 'Dédicace' }, { title: 'Chapitre 1' }]), ['Page de garde', 'Dédicace', 'Chapitre 1']);
  assert.deepEqual(sectionsForNewDocument([{ title: 'Page de garde' }, { title: 'Chapitre 1' }]), ['Page de garde', 'Chapitre 1']);
});

test('appliquer un modèle ne modifie ni ne supprime aucun texte', async () => {
  const queries = [];
  const sections = [
    { id: 's0', title: 'Page de garde', sort_order: 0 },
    { id: 's1', title: 'Introduction', sort_order: 1 },
    { id: 's2', title: 'Conclusion', sort_order: 2 },
  ];
  const client = {
    query: async (text, values) => {
      queries.push({ text, values });
      if (text.startsWith('select id, document_style')) return { rows: [{ id: 'd1', document_style: presetStyle('classique') }] };
      if (text.startsWith('select id, title, sort_order')) return { rows: sections };
      if (text.includes('update public.app_documents')) return { rows: [{ id: 'd1', line_spacing: 1.5, document_style: {} }] };
      return { rows: [] };
    },
  };
  const result = await applyTemplateToDocument(client, {
    documentId: 'd1',
    userId: 'u1',
    template: { id: 't1', outline: [{ title: 'Dédicace' }, { title: 'Introduction générale' }, { title: 'Chapitre 1' }, { title: 'Conclusion générale' }], style: presetStyle('moderne') },
  });
  assert.equal(result.addedSections, 2);
  const sql = queries.map((q) => q.text.toLowerCase());
  assert.ok(sql.every((q) => !q.includes('content_html')), 'aucune écriture du texte');
  assert.ok(sql.every((q) => !q.startsWith('delete')), 'aucune suppression');
  assert.equal(sql.filter((q) => q.startsWith('insert into public.app_document_sections')).length, 2);
  assert.ok(sql.includes('commit'));
  const ownerCheck = queries.find((q) => q.text.startsWith('select id, document_style'));
  assert.deepEqual(ownerCheck.values, ['d1', 'u1'], 'document filtré par son propriétaire');
});

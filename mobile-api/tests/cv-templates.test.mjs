import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const m = await loadTs('lib/cv-templates-core.ts');

test('cv-templates : repli intégré renvoie exactement 15 designs triés', async () => {
  const failingDb = {
    query: async () => {
      throw new Error('relation "public.cv_templates" does not exist');
    },
  };
  const result = await m.listCvTemplatesOn(failingDb);
  assert.equal(result.source, 'fallback');
  assert.equal(result.templates.length, 15);
  assert.equal(result.templates[0].id, 'classic');
  assert.equal(result.templates[14].id, 'emeraude');
});

test('cv-templates : lecture DB filtre, trie et assainit custom_css', async () => {
  const fakeDb = {
    query: async () => ({
      rows: [
        {
          id: 'custom-b',
          label: 'Design B',
          description: 'Deuxième design ajouté en base',
          category: 'moderne',
          layout_family: 'banner-top',
          theme_config: { accent: '#7C3AED', fontFamily: 'sans', showPhoto: true },
          custom_css: '.cv-title { letter-spacing: 1px; }',
          thumbnail_url: 'https://campus360b.site/cv/b.png',
          sort_order: 20,
        },
        {
          id: 'custom-a',
          label: 'Design A',
          description: 'Premier design avec CSS dangereux neutralisé',
          category: 'ats',
          layout_family: 'ats-clean',
          theme_config: { accent: 'javascript:alert(1)' },
          custom_css: '</style><script>alert(1)</script>',
          thumbnail_url: 'http://insecure.local/a.png',
          sort_order: 10,
        },
        {
          id: 'INVALID SLUG!',
          label: 'Rejeté',
          description: 'Slug non conforme',
          category: 'ats',
          layout_family: 'ats-clean',
          theme_config: {},
          custom_css: '',
          thumbnail_url: null,
          sort_order: 5,
        },
      ],
    }),
  };
  const result = await m.listCvTemplatesOn(fakeDb);
  assert.equal(result.source, 'db');
  assert.deepEqual(result.templates.map((t) => t.id), ['custom-a', 'custom-b']);
  assert.equal(result.templates[0].customCss, '');
  assert.equal(result.templates[0].themeConfig.accent, undefined);
  assert.equal(result.templates[0].thumbnailUrl, null);
  assert.equal(result.templates[1].customCss, '.cv-title { letter-spacing: 1px; }');
  assert.equal(result.templates[1].thumbnailUrl, 'https://campus360b.site/cv/b.png');
});

test('sanitizeCustomCss : rejette tout vecteur dangereux et la taille > 4 Ko', () => {
  for (const bad of [
    '</style><script>x</script>',
    '@import url("https://evil.test/x.css");',
    'body { background: url(javascript:alert(1)); }',
    'div { width: expression(alert(1)); }',
    'a'.repeat(4097),
  ]) {
    assert.equal(m.sanitizeCustomCss(bad), '', bad.slice(0, 40));
  }
  assert.equal(m.sanitizeCustomCss('.hdr { border-bottom: 2px solid #7C3AED; }'), '.hdr { border-bottom: 2px solid #7C3AED; }');
});

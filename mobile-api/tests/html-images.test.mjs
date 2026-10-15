import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { extractImageFileIds, inlineDocumentImages, readImageSize } = await loadTs('lib/html-images.ts');

const A = '1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d';
const B = '2a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d';
const PNG_3x2 = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]),
  Buffer.from([0, 0, 0, 3, 0, 0, 0, 2, 8, 2, 0, 0, 0]),
]);
// Minimal JPEG header: SOI, APP0 (length 16), SOF0 with height 480 and width 640.
const JPEG_640x480 = Buffer.from([
  0xff, 0xd8,
  0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0xe0, 0x02, 0x80, 0x03, 0x01, 0x22, 0x00,
]);

const html = `<p>Intro</p><figure><img data-file-id="${A}" src="https://files.campus360b.site/api/files/${A}?exp=1&sig=old" alt="Figure 1"><figcaption>Figure 1</figcaption></figure>`
  + `<img data-file-id="${B}" alt="manquante"><img src="https://example.com/legacy.png">`;

test('identifiants des images uploadées, sans doublon', () => {
  assert.deepEqual(extractImageFileIds(html + html), [A, B]);
});

test('export PDF : image embarquée en base64, ancien lien signé retiré, image manquante supprimée', () => {
  const out = inlineDocumentImages(html, new Map([[A, { data: PNG_3x2, mime: 'image/png' }]]));
  assert.match(out, new RegExp(`<img src="data:image/png;base64,${PNG_3x2.toString('base64').replace(/[+/=]/g, '\\$&')}"`));
  assert.doesNotMatch(out, /sig=old/);
  assert.match(out, /alt="Figure 1"/);
  assert.doesNotMatch(out, /alt="manquante"/);
  assert.match(out, /https:\/\/example\.com\/legacy\.png/);
});

test('dimensions PNG et JPEG', () => {
  assert.deepEqual(readImageSize(PNG_3x2, 'image/png'), { width: 3, height: 2 });
  assert.deepEqual(readImageSize(JPEG_640x480, 'image/jpeg'), { width: 640, height: 480 });
  assert.equal(readImageSize(Buffer.from('xx'), 'image/webp'), null);
});

test('le paquet docx accepte l’image marquée (ImageRun) et produit word/media', async () => {
  const docx = await import('docx');
  const { Document, Packer, Paragraph, ImageRun } = docx;
  const buffer = await Packer.toBuffer(new Document({
    sections: [{ children: [new Paragraph({ children: [new ImageRun({ type: 'png', data: PNG_3x2, transformation: { width: 3, height: 2 } })] })] }],
  }));
  assert.ok(buffer.includes(Buffer.from('word/media/')));
});


import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { parsePdfZone, buildZoneUserContent, visionModelsToTry, VISION_MODELS, MAX_ZONE_IMAGE_BYTES, PdfZoneError } =
  await loadTs('lib/pdf-zone.ts');

const jpeg = (bytes) => `data:image/jpeg;base64,${Buffer.alloc(bytes, 7).toString('base64')}`;

test('accepte une zone JPEG ou PNG valide', () => {
  assert.deepEqual(parsePdfZone({ page: 3, image: jpeg(1000) }), { page: 3, image: jpeg(1000) });
  const png = `data:image/png;base64,${Buffer.from('png').toString('base64')}`;
  assert.equal(parsePdfZone({ page: 1, image: png }).page, 1);
});

test('refuse les autres types d’image', () => {
  const gif = `data:image/gif;base64,${Buffer.from('gif').toString('base64')}`;
  assert.throws(() => parsePdfZone({ page: 1, image: gif }), PdfZoneError);
  const svg = `data:image/svg+xml;base64,${Buffer.from('<svg/>').toString('base64')}`;
  assert.throws(() => parsePdfZone({ page: 1, image: svg }), PdfZoneError);
});

test('refuse une image de plus de 1,5 Mo', () => {
  assert.doesNotThrow(() => parsePdfZone({ page: 1, image: jpeg(MAX_ZONE_IMAGE_BYTES) }));
  assert.throws(() => parsePdfZone({ page: 1, image: jpeg(MAX_ZONE_IMAGE_BYTES + 1) }), /1,5 Mo/);
});

test('refuse un numéro de page incorrect', () => {
  for (const page of [0, -1, 2.5, '2', undefined, null]) {
    assert.throws(() => parsePdfZone({ page, image: jpeg(10) }), /page/);
  }
});

test('refuse une data URL mal formée ou absente', () => {
  for (const image of ['data:image/jpeg;base64,@@@', 'https://evil.example/a.jpg', 'data:image/jpeg,abc', '', 42]) {
    assert.throws(() => parsePdfZone({ page: 1, image }), PdfZoneError);
  }
  assert.throws(() => parsePdfZone(null), PdfZoneError);
  assert.throws(() => parsePdfZone('zone'), PdfZoneError);
});

test('le message multimodal porte la question, la page et l’image', () => {
  const zone = { page: 4, image: jpeg(10) };
  const [text, image] = buildZoneUserContent('Explique', zone);
  assert.equal(text.type, 'text');
  assert.match(text.text, /^Explique/);
  assert.match(text.text, /page 4/);
  assert.deepEqual(image, { type: 'image_url', image_url: { url: zone.image } });
});

test('seuls les modèles vision sont essayés avec une zone', () => {
  assert.deepEqual(visionModelsToTry(undefined), VISION_MODELS);
  assert.deepEqual(visionModelsToTry('meta-llama/llama-3.3-70b-instruct:free'), VISION_MODELS);
  const preferred = VISION_MODELS[1];
  assert.equal(visionModelsToTry(preferred)[0], preferred);
  assert.equal(visionModelsToTry(preferred).length, VISION_MODELS.length);
});

test('la route pdf-chat valide la zone avant le décompte et ne journalise pas l’image', () => {
  const route = fs.readFileSync(path.resolve('app/api/ai/pdf-chat/route.ts'), 'utf8');
  assert.ok(route.indexOf('parsePdfZone(') < route.indexOf('consumeAiAllowance('), 'zone validée avant le décompte');
  assert.ok(route.indexOf('enforceAiQuota(') < route.indexOf('parsePdfZone('), 'quota vérifié en premier');
  assert.doesNotMatch(route, /console\.\w+\([^)]*(zone|image)/i);
});

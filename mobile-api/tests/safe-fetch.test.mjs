import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { safeFetch, isBlockedAddress, parsePublicUrl } = await loadTs('lib/safe-fetch.ts');
const { htmlToText } = await loadTs('lib/html-text.ts');

test('les adresses internes sont refusées avant toute connexion', async () => {
  for (const url of [
    'http://127.0.0.1/',
    'http://localhost/',
    'http://169.254.169.254/latest/meta-data/',
    'http://10.0.0.5/',
    'http://192.168.1.1/',
    'http://[::1]/',
    'http://[::ffff:127.0.0.1]/',
    'http://0.0.0.0/',
    'http://app.internal/',
  ]) {
    await assert.rejects(safeFetch(url), (e) => e.code === 'url_refusee', url);
  }
});

test('schémas, identifiants et ports non standard sont refusés', () => {
  for (const url of ['ftp://example.com/', 'file:///etc/passwd', 'http://user:pw@example.com/', 'http://example.com:8080/']) {
    assert.throws(() => parsePublicUrl(url), (e) => e.code === 'url_refusee', url);
  }
  assert.throws(() => parsePublicUrl('pas une url'), (e) => e.code === 'url_invalide');
});

test('classification des adresses', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.20.0.1', '100.64.0.1', '169.254.169.254', '::1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1', '::ffff:7f00:1', '64:ff9b::a00:1']) {
    assert.equal(isBlockedAddress(ip), true, ip);
  }
  for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111', '::ffff:8.8.8.8']) {
    assert.equal(isBlockedAddress(ip), false, ip);
  }
});

test('extraction du texte lisible d’une page HTML', () => {
  const html = `<html><head><title>Rapport &amp; stage</title><style>p{}</style></head><body>
    <nav>Menu Accueil Contact</nav><script>alert(1)</script>
    <main><h1>Titre</h1><p>Premier paragraphe d&eacute;taill&#233;.</p><ul><li>Point A</li></ul></main>
    <footer>Mentions légales</footer></body></html>`;
  const { title, text } = htmlToText(html);
  assert.equal(title, 'Rapport & stage');
  assert.match(text, /Premier paragraphe détaillé\./);
  assert.match(text, /• Point A/);
  assert.doesNotMatch(text, /alert|Menu Accueil|Mentions légales|p\{\}/);
});

test('une URL publique de test renvoie du texte (réseau requis)', async (t) => {
  let result;
  try {
    result = await safeFetch('https://example.com/');
  } catch (error) {
    if (['url_introuvable', 'url_echec', 'url_delai'].includes(error.code)) {
      t.skip(`réseau indisponible : ${error.message}`);
      return;
    }
    throw error;
  }
  assert.equal(result.contentType, 'text/html');
  assert.match(htmlToText(result.body.toString('utf8')).text, /Example Domain|documentation|examples/i);
});

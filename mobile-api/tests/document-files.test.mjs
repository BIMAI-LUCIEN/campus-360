/**
 * Module 19 — HTTP integration tests against a running mobile-api.
 *
 *   BASE_URL       default http://localhost:3002
 *   E2E_EMAIL / E2E_PASSWORD       test account A (enables the authenticated scenario)
 *   E2E_EMAIL_B / E2E_PASSWORD_B   optional account B (cross-user isolation checks)
 *
 * Without credentials only the unauthenticated checks run.
 * Usage (from mobile-api/): node --test tests/document-files.test.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import zlib from 'node:zlib';

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3002').replace(/\/$/, '');
const A = { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD };
const B = { email: process.env.E2E_EMAIL_B, password: process.env.E2E_PASSWORD_B };
const RANDOM_ID = '00000000-0000-4000-8000-000000000000';

// These are HTTP tests: without a running server they are skipped, not failed.
const serverUp = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(5000) }).then(() => true, () => false);
const NO_SERVER = serverUp ? false : `serveur injoignable sur ${BASE_URL} (lancer : npm run dev)`;

// A real 3x2 RGB PNG, so size parsing and Word embedding are exercised.
const makePng = () => {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(3, 0);
  ihdr.writeUInt32BE(2, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const rows = Buffer.concat([0, 0].map(() => Buffer.from([0, 255, 0, 0, 0, 255, 0, 0, 0, 255])));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

const signIn = async ({ email, password }) => {
  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(res.status, 200, `connexion refusée pour le compte de test (${res.status})`);
  const body = await res.json();
  const token = res.headers.get('set-auth-token') || body.token;
  assert.ok(token, 'aucun jeton de session renvoyé');
  return { Authorization: `Bearer ${token}` };
};

const api = async (auth, method, url, body) => {
  const init = { method, headers: { ...auth } };
  if (body instanceof FormData) init.body = body;
  else if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${url}`, init);
  const type = res.headers.get('content-type') || '';
  const data = type.includes('application/json') ? await res.json() : Buffer.from(await res.arrayBuffer());
  return { status: res.status, data, headers: res.headers };
};

const uploadForm = (buffer, name, type, kind) => {
  const form = new FormData();
  form.append('file', new Blob([buffer], { type }), name);
  form.append('kind', kind);
  return form;
};

test('sans session : upload, sources, URL signée et chat sont refusés (401)', { skip: NO_SERVER }, async () => {
  const form = uploadForm(makePng(), 'a.png', 'image/png', 'image');
  assert.equal((await api({}, 'POST', `/api/mobile/documents/${RANDOM_ID}/files`, form)).status, 401);
  assert.equal((await api({}, 'GET', `/api/mobile/documents/${RANDOM_ID}/sources`)).status, 401);
  assert.equal((await api({}, 'POST', `/api/mobile/documents/${RANDOM_ID}/sources`, { url: 'https://example.com' })).status, 401);
  assert.equal((await api({}, 'GET', `/api/mobile/files/${RANDOM_ID}/url`)).status, 401);
  assert.equal((await api({}, 'POST', '/api/mobile/files/sign', { fileIds: [RANDOM_ID] })).status, 401);
  assert.equal((await api({}, 'POST', `/api/mobile/documents/${RANDOM_ID}/chat`, { messages: [] })).status, 401);
  // A forged bearer (an email or a user id used as a token) is not a session.
  const forged = { Authorization: 'Bearer someone@example.com' };
  assert.equal((await api(forged, 'GET', `/api/mobile/documents/${RANDOM_ID}/sources`)).status, 401);
});

test('service de fichiers : signature absente, fausse ou chemin invalide → 403', { skip: NO_SERVER }, async () => {
  assert.equal((await api({}, 'GET', `/api/files/${RANDOM_ID}`)).status, 403);
  assert.equal((await api({}, 'GET', `/api/files/${RANDOM_ID}?exp=9999999999&sig=abc`)).status, 403);
  const exp = Math.floor(Date.now() / 1000) - 10;
  assert.equal((await api({}, 'GET', `/api/files/${RANDOM_ID}?exp=${exp}&sig=abc`)).status, 403);
  assert.equal((await api({}, 'GET', '/api/files/..%2F..%2Fetc%2Fpasswd?exp=1&sig=a')).status, 403);
});

test('parcours complet authentifié (images, sources, chat cité, exports, suppression)', { skip: NO_SERVER || (!A.email || !A.password ? 'E2E_EMAIL / E2E_PASSWORD non définis' : false) }, async () => {
  const auth = await signIn(A);
  const created = await api(auth, 'POST', '/api/mobile/documents', { title: 'Test Module 19', templateType: 'stage' });
  assert.ok([200, 201].includes(created.status), `création du document : ${created.status}`);
  const documentId = created.data.document?.id;
  assert.ok(documentId);
  const base = `/api/mobile/documents/${documentId}`;

  try {
    // Image upload, then attach it to the document.
    const png = makePng();
    const image = await api(auth, 'POST', `${base}/files`, uploadForm(png, 'photo.png', 'image/png', 'image'));
    assert.equal(image.status, 200, JSON.stringify(image.data));
    assert.equal(image.data.file.status, 'ready');
    assert.equal(image.data.file.storage_key, undefined, 'la clé de stockage ne doit pas fuiter');
    const imageId = image.data.file.id;
    const meta = await api(auth, 'POST', `${base}/images`, { fileId: imageId, fileName: 'photo.png' });
    assert.equal(meta.status, 200);
    assert.equal(meta.data.image.file_id, imageId);

    // A PNG disguised as a PDF source is refused.
    const fake = await api(auth, 'POST', `${base}/files`, uploadForm(png, 'faux.pdf', 'application/pdf', 'source'));
    assert.equal(fake.status, 422);

    // Real PDF source: extracted and indexed.
    const pdf = fs.readFileSync(path.resolve('tests/fixtures/source-3-pages.pdf'));
    const source = await api(auth, 'POST', `${base}/files`, uploadForm(pdf, 'rapport.pdf', 'application/pdf', 'source'));
    assert.equal(source.status, 200, JSON.stringify(source.data));
    assert.equal(source.data.file.status, 'ready', source.data.file.error || '');
    assert.equal(source.data.file.page_count, 3);
    const pdfId = source.data.file.id;

    // Internal URL refused up front; pasted text accepted.
    const internal = await api(auth, 'POST', `${base}/sources`, { url: 'http://127.0.0.1/admin' });
    assert.equal(internal.status, 400);
    assert.equal(internal.data.code, 'url_refusee');
    const missing = await api(auth, 'POST', `${base}/sources`, {});
    assert.equal(missing.status, 400);
    const text = await api(auth, 'POST', `${base}/sources`, { title: 'Notes', text: 'Le tuteur est Madame Ngono.' });
    assert.equal(text.data.source.status, 'ready');

    const list = await api(auth, 'GET', `${base}/sources`);
    assert.deepEqual(list.data.sources.map((s) => s.status).sort(), ['ready', 'ready']);

    // Signed URL: valid → bytes; tampered → 403.
    const signed = await api(auth, 'GET', `/api/mobile/files/${imageId}/url`);
    assert.equal(signed.status, 200);
    const served = await fetch(signed.data.url.replace(/^https?:\/\/[^/]+/, BASE_URL));
    assert.equal(served.status, 200);
    assert.equal(served.headers.get('content-type'), 'image/png');
    assert.deepEqual(Buffer.from(await served.arrayBuffer()), png);
    const tampered = signed.data.url.replace(/^https?:\/\/[^/]+/, BASE_URL).replace(/sig=./, 'sig=Z');
    assert.equal((await fetch(tampered)).status, 403);

    // Chat over the ticked PDF: the figure on page 2 is cited.
    const chat = await api(auth, 'POST', `${base}/chat`, {
      messages: [{ role: 'user', content: "Quel est le chiffre d'affaires d'Alpha Telecom ?" }],
      sourceIds: [pdfId],
    });
    assert.equal(chat.status, 200);
    assert.ok(Array.isArray(chat.data.citations) && chat.data.citations.length > 0, 'citations attendues');
    assert.ok(chat.data.citations.some((c) => c.sourceId === pdfId && c.page === 2), JSON.stringify(chat.data.citations));
    const noSources = await api(auth, 'POST', `${base}/chat`, { messages: [{ role: 'user', content: 'Bonjour' }], sourceIds: [] });
    assert.equal(noSources.data.citations, undefined);

    // Section saved with a signed src keeps only the file id.
    const doc = await api(auth, 'GET', base);
    const section = (doc.data.sections || []).find((s) => !s.is_system) || doc.data.sections?.[0];
    assert.ok(section, 'aucune section');
    const html = `<figure class="academic-figure"><img data-file-id="${imageId}" src="${signed.data.url}" alt="Figure 1"><figcaption>Figure 1</figcaption></figure>`;
    const saved = await api(auth, 'PATCH', `${base}/sections/${section.id}`, { content_html: html });
    assert.equal(saved.status, 200);
    assert.match(saved.data.section.content_html, new RegExp(`data-file-id="${imageId}"`));
    assert.doesNotMatch(saved.data.section.content_html, /sig=/);

    // Exports embed the image.
    const docx = await api(auth, 'GET', `${base}/export/docx`);
    assert.equal(docx.status, 200);
    assert.ok(docx.data.includes(Buffer.from('word/media/')), 'image absente du DOCX');
    const exportPdf = await api(auth, 'GET', `${base}/export/pdf`);
    assert.equal(exportPdf.status, 200);
    assert.ok(exportPdf.data.includes(Buffer.from('/Subtype /Image')) || exportPdf.data.includes(Buffer.from('/Subtype/Image')), 'image absente du PDF');

    // Cross-user isolation.
    if (B.email && B.password) {
      const authB = await signIn(B);
      assert.equal((await api(authB, 'GET', `${base}/sources`)).status, 404);
      assert.equal((await api(authB, 'GET', `/api/mobile/files/${imageId}/url`)).status, 404);
      assert.equal((await api(authB, 'POST', `${base}/chat`, { messages: [] })).status, 404);
      assert.equal((await api(authB, 'DELETE', `${base}/files?fileId=${imageId}`)).status, 404);
    }

    // Deleting a source removes it.
    assert.equal((await api(auth, 'DELETE', `${base}/sources/${pdfId}`)).status, 200);
    assert.equal((await api(auth, 'GET', `/api/mobile/files/${pdfId}/url`)).status, 404);
  } finally {
    await api(auth, 'DELETE', base);
  }
});

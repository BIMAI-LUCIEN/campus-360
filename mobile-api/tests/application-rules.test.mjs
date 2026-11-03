import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const rules = await loadTs('lib/application-rules.ts');
const { canStudentSetStatus, canDispatchSetStatus, followupState, followupRecipient } = rules;

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3002').replace(/\/$/, '');
const serverUp = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) }).then(
  () => true,
  () => false,
);
const NO_SERVER = serverUp ? false : `serveur injoignable sur ${BASE_URL}`;

test('canStudentSetStatus : retrait depuis un statut actif, suite déclarée par l’étudiant', () => {
  // L'étudiant déclare la réponse reçue, l'entretien, l'acceptation ou le refus
  assert.equal(canStudentSetStatus('DELIVERED', 'REVIEWING'), true);
  assert.equal(canStudentSetStatus('SENT_PENDING', 'INTERVIEW'), true);
  assert.equal(canStudentSetStatus('INTERVIEW', 'ACCEPTED'), true);
  assert.equal(canStudentSetStatus('PENDING', 'REJECTED'), true);
  assert.equal(canStudentSetStatus('ACCEPTED', 'REJECTED'), true);
  // Pas de suite sur un envoi échoué ou retiré, pas de retour en attente
  assert.equal(canStudentSetStatus('FAILED', 'INTERVIEW'), false);
  assert.equal(canStudentSetStatus('WITHDRAWN', 'ACCEPTED'), false);
  assert.equal(canStudentSetStatus('INTERVIEW', 'PENDING'), false);
  assert.equal(canStudentSetStatus('INTERVIEW', 'INTERVIEW'), false);

  // Retrait autorisé depuis les statuts en cours / en attente
  assert.equal(canStudentSetStatus('PENDING', 'WITHDRAWN'), true);
  assert.equal(canStudentSetStatus('SENT_PENDING', 'WITHDRAWN'), true);
  assert.equal(canStudentSetStatus('DELIVERED', 'WITHDRAWN'), true);
  assert.equal(canStudentSetStatus('FAILED', 'WITHDRAWN'), true);
  assert.equal(canStudentSetStatus('REVIEWING', 'WITHDRAWN'), true);

  // Retrait interdit si la candidature est déjà close ou acceptée
  assert.equal(canStudentSetStatus('ACCEPTED', 'WITHDRAWN'), false);
  assert.equal(canStudentSetStatus('REJECTED', 'WITHDRAWN'), false);
  assert.equal(canStudentSetStatus('WITHDRAWN', 'WITHDRAWN'), false);
});

test('canDispatchSetStatus : un retour de livraison ne réécrit pas une suite déclarée', () => {
  assert.equal(canDispatchSetStatus('SENT_PENDING', 'DELIVERED'), true);
  assert.equal(canDispatchSetStatus('SENT_PENDING', 'FAILED'), true);
  assert.equal(canDispatchSetStatus('INTERVIEW', 'DELIVERED'), false);
  assert.equal(canDispatchSetStatus('ACCEPTED', 'FAILED'), false);
  assert.equal(canDispatchSetStatus('DELIVERED', 'REVIEWING'), true);
  assert.equal(canDispatchSetStatus('REJECTED', 'REVIEWING'), false);
});

const NOW = new Date('2026-11-22T00:00:00Z');
const state = (over = {}) =>
  followupState(
    { status: 'DELIVERED', appliedAt: '2026-11-15T00:00:00Z', hasRecipient: true, offerExpired: false, ...over },
    NOW,
  );

test('followupState : J+7 après l’envoi, puis 7 jours après la dernière relance', () => {
  assert.equal(state({ appliedAt: '2026-11-15T00:00:01Z' }), 'waiting'); // J+6 et des poussières
  assert.equal(state(), 'due'); // J+7
  assert.equal(state({ appliedAt: '2026-11-01T00:00:00Z', lastRemindedAt: '2026-11-16T00:00:00Z', reminderCount: 1 }), 'waiting');
  assert.equal(state({ appliedAt: '2026-11-08T00:00:00Z', lastRemindedAt: '2026-11-15T00:00:00Z', reminderCount: 1 }), 'due'); // J+14
});

test('followupState : plafond de 2 relances, puis « sans réponse » à J+21', () => {
  const second = { appliedAt: '2026-11-01T00:00:00Z', reminderCount: 2 };
  assert.equal(state({ ...second, lastRemindedAt: '2026-11-20T00:00:00Z' }), 'waiting');
  assert.equal(state({ ...second, lastRemindedAt: '2026-11-15T00:00:00Z' }), 'exhausted');
  assert.equal(state({ ...second, reminderCount: 3, lastRemindedAt: '2026-11-15T00:00:00Z' }), 'exhausted');
});

test('followupState : sans e-mail ou offre expirée, seule la question reste', () => {
  assert.equal(state({ hasRecipient: false }), 'ask');
  assert.equal(state({ offerExpired: true }), 'ask');
  assert.equal(state({ hasRecipient: false, offerExpired: true }), 'ask');
});

test('followupState : chaque statut', () => {
  assert.equal(state({ status: 'PENDING' }), 'due'); // envoi par l'étudiant, confirmé avant la relance
  assert.equal(state({ status: 'DELIVERED' }), 'due');
  for (const status of ['FAILED', 'REVIEWING', 'INTERVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN']) {
    assert.equal(state({ status }), 'none', status);
  }
  assert.equal(state({ status: 'SENT_PENDING', appliedAt: '2026-11-21T00:00:00Z' }), 'unconfirmed'); // 24 h
  assert.equal(state({ status: 'SENT_PENDING', appliedAt: '2026-11-21T00:00:01Z' }), 'none');
  assert.equal(state({ appliedAt: 'pas une date' }), 'none');
});

test('followupRecipient : une vraie adresse ou rien', () => {
  assert.equal(followupRecipient(' rh@exemple.cm '), 'rh@exemple.cm');
  for (const value of ['', null, undefined, 'rh', 'rh@', '@exemple.cm', 'rh@exemple', 'a b@exemple.cm']) {
    assert.equal(followupRecipient(value), null, String(value));
  }
});

test('Garde de source : scraped-reports est protégé', () => {
  const scrapedReportsPath = path.resolve('app/api/mobile/documents/scraped-reports/route.ts');
  const scrapedReportsContent = fs.readFileSync(scrapedReportsPath, 'utf8');
  assert.ok(
    scrapedReportsContent.includes('requireMobileUser'),
    'scraped-reports/route.ts doit exiger requireMobileUser',
  );
  assert.ok(
    scrapedReportsContent.includes("status = 'published'"),
    'scraped-reports/route.ts doit filtrer status = published',
  );
  assert.ok(
    !scrapedReportsContent.includes('source_url'),
    'scraped-reports/route.ts ne doit plus exposer source_url',
  );
});

test(
  'HTTP : PATCH /api/mobile/stages/applications sans session renvoie 401',
  { skip: NO_SERVER },
  async () => {
    // Sans session -> 401
    const resNoAuth = await fetch(`${BASE_URL}/api/mobile/stages/applications`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: '00000000-0000-0000-0000-000000000000', status: 'ACCEPTED' }),
    });
    assert.equal(resNoAuth.status, 401);
  },
);

test(
  'HTTP : GET /api/mobile/documents/scraped-reports sans session renvoie 401',
  { skip: NO_SERVER },
  async () => {
    const res = await fetch(`${BASE_URL}/api/mobile/documents/scraped-reports`);
    assert.equal(res.status, 401);
  },
);

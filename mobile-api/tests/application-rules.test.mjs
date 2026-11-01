import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const rules = await loadTs('lib/application-rules.ts');
const { canStudentSetStatus, canDispatchSetStatus, isFollowupDue } = rules;

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

test('isFollowupDue : J+7 après l’envoi puis après la dernière relance', () => {
  const now = new Date('2026-11-10T00:00:00Z');
  assert.equal(isFollowupDue('DELIVERED', '2026-11-01T00:00:00Z', null, now), true);
  assert.equal(isFollowupDue('DELIVERED', '2026-11-01T00:00:00Z', '2026-11-08T00:00:00Z', now), false);
  assert.equal(isFollowupDue('INTERVIEW', '2026-10-01T00:00:00Z', null, now), false);
  assert.equal(isFollowupDue('SENT_PENDING', '2026-11-05T00:00:00Z', null, now), false);
});

test('Garde de source : direct-reach/route.ts utilise getStageJob et scraped-reports est protégé', () => {
  const directReachPath = path.resolve('app/api/mobile/stages/direct-reach/route.ts');
  const directReachContent = fs.readFileSync(directReachPath, 'utf8');
  assert.ok(
    directReachContent.includes('getStageJob('),
    'direct-reach/route.ts doit utiliser getStageJob pour valider l’offre',
  );

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

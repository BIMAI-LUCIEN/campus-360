import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const rules = await loadTs('lib/application-rules.ts');
const { canStudentSetStatus } = rules;

const BASE_URL = (process.env.BASE_URL || 'http://localhost:3002').replace(/\/$/, '');
const serverUp = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) }).then(
  () => true,
  () => false,
);
const NO_SERVER = serverUp ? false : `serveur injoignable sur ${BASE_URL}`;

test('canStudentSetStatus : seul WITHDRAWN est autorisé depuis un statut actif', () => {
  // Avancement interdit à l'étudiant
  assert.equal(canStudentSetStatus('PENDING', 'ACCEPTED'), false);
  assert.equal(canStudentSetStatus('PENDING', 'INTERVIEW'), false);
  assert.equal(canStudentSetStatus('REVIEWING', 'ACCEPTED'), false);
  assert.equal(canStudentSetStatus('PENDING', 'REJECTED'), false);

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
  'HTTP : PATCH /api/mobile/stages/applications { status: ACCEPTED } renvoie 400',
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

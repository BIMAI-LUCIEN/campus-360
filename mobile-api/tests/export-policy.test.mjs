import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

test('modèle 100 % wallet : export PDF sans filigrane et DOCX pour tout compte connecté', () => {
  const source = fs.readFileSync(path.resolve('lib/document-export-policy.ts'), 'utf8');
  assert.match(source, /canExportPdf: true/);
  assert.match(source, /pdfRequiresWatermark: false/);
  assert.match(source, /canExportDocx: true/);
  // No subscription tier must remain in the export policy.
  assert.doesNotMatch(source, /'basic'|'pro'|'elite'|getActiveSubscription/);
});

test('aucune route ni librairie d’abonnement ne subsiste côté mobile-api', () => {
  assert.equal(fs.existsSync(path.resolve('lib/subscriptions.ts')), false);
  assert.equal(fs.existsSync(path.resolve('app/api/mobile/subscription/purchase/route.ts')), false);
});

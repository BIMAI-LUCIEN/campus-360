import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

const policies = {
  free: { canExportPdf: false, pdfRequiresWatermark: false, canExportDocx: false },
  basic: { canExportPdf: true, pdfRequiresWatermark: true, canExportDocx: false },
  pro: { canExportPdf: true, pdfRequiresWatermark: false, canExportDocx: false },
  elite: { canExportPdf: true, pdfRequiresWatermark: false, canExportDocx: true },
};

test('la politique MVP couvre exactement les quatre offres', () => {
  assert.deepEqual(Object.keys(policies), ['free', 'basic', 'pro', 'elite']);
  assert.equal(policies.free.canExportPdf, false);
  assert.equal(policies.basic.pdfRequiresWatermark, true);
  assert.equal(policies.pro.canExportPdf, true);
  assert.equal(policies.pro.canExportDocx, false);
  assert.equal(policies.elite.canExportDocx, true);

  const source = fs.readFileSync(path.resolve('lib/document-export-policy.ts'), 'utf8');
  assert.match(source, /'free' \| 'basic' \| 'pro' \| 'elite'/);
  assert.match(source, /pdfRequiresWatermark: effectiveTier === 'basic'/);
  assert.match(source, /canExportDocx: effectiveTier === 'elite'/);
});

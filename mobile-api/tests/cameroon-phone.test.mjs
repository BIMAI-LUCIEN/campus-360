import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { parseCameroonMobile, operatorMismatchMessage } = await loadTs('lib/cameroon-phone.ts');

test('cameroon-phone : jumeau app identique au fichier API', () => {
  const api = fs.readFileSync(path.resolve('lib/cameroon-phone.ts'), 'utf8');
  const app = fs.readFileSync(path.resolve('../src/features/wallet/cameroonPhone.ts'), 'utf8');
  assert.equal(app.replace(/\r\n/g, '\n'), api.replace(/\r\n/g, '\n'));
});

test('parseCameroonMobile : MTN et Orange reconnus et normalisés en +237', () => {
  const cases = [
    ['677 12 34 56', 'mtn', '+237677123456'],
    ['650123456', 'mtn', '+237650123456'],
    ['654-12-34-56', 'mtn', '+237654123456'],
    ['680123456', 'mtn', '+237680123456'],
    ['684123456', 'mtn', '+237684123456'],
    ['+237 699 12 34 56', 'orange', '+237699123456'],
    ['237655123456', 'orange', '+237655123456'],
    ['00237 659 12 34 56', 'orange', '+237659123456'],
    ['(685) 12.34.56', 'orange', '+237685123456'],
    ['689123456', 'orange', '+237689123456'],
  ];
  for (const [raw, operator, e164] of cases) {
    const result = parseCameroonMobile(raw);
    assert.equal(result.ok, true, raw);
    assert.equal(result.operator, operator, raw);
    assert.equal(result.e164, e164, raw);
    assert.equal(result.national, e164.slice(4), raw);
  }
});

test('parseCameroonMobile : refuse les numéros étrangers, fixes, Nexttel/Camtel et mal formés', () => {
  const rejected = [
    '',
    '   ',
    '+33 6 12 34 56 78', // France
    '+2250700000000', // Côte d'Ivoire
    '0033612345678',
    '67712345', // ancien format à 8 chiffres
    '6771234567', // 10 chiffres
    '237 233 42 12 34', // fixe
    '222123456', // fixe sans indicatif
    '661234567', // Nexttel
    '621234567', // Camtel mobile
    '6771234ab',
    '+237+677123456',
  ];
  for (const raw of rejected) {
    const result = parseCameroonMobile(raw);
    assert.equal(result.ok, false, raw);
    assert.equal(typeof result.error, 'string', raw);
  }
  assert.match(parseCameroonMobile('+33612345678').error, /camerounais/);
  assert.match(parseCameroonMobile('661234567').error, /ni MTN ni Orange/);
});

test("operatorMismatchMessage : signale un numéro Orange choisi comme MTN et l'inverse", () => {
  assert.equal(operatorMismatchMessage('mtn', 'mtn'), null);
  assert.equal(operatorMismatchMessage('orange', 'orange'), null);
  assert.match(operatorMismatchMessage('orange', 'mtn'), /numéro Orange Money/);
  assert.match(operatorMismatchMessage('mtn', 'orange'), /numéro MTN MoMo/);
});

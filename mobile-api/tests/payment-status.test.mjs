import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const { mapServerPaymentStatus } = await loadTs('../src/features/wallet/paymentStatus.ts');

test('seul le serveur peut dire « success »', () => {
  assert.equal(mapServerPaymentStatus('success'), 'success');
  assert.equal(mapServerPaymentStatus('completed'), 'success');
  assert.equal(mapServerPaymentStatus('failed'), 'failed');
  for (const raw of [undefined, null, 'error', '', {}, 'pending']) {
    assert.equal(mapServerPaymentStatus(raw), 'pending');
  }
});

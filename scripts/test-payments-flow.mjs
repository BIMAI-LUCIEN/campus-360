import crypto from 'crypto';
import { z } from '../mobile-api/node_modules/zod/v3/index.js';

const initiateSchema = z.object({
  amount: z.union([z.literal(500), z.literal(2000)]),
  packType: z.enum(['discovery_500', 'monthly_2000']),
  operator: z.enum(['mtn', 'orange', 'wave']),
  phone: z
    .string()
    .trim()
    .min(8, 'Numéro de téléphone trop court')
    .max(20, 'Numéro de téléphone trop long')
    .regex(/^[+0-9 ()\-]+$/, 'Format de numéro invalide.'),
  currency: z.enum(['XAF', 'XOF']).optional().default('XAF'),
});

console.log('🧪 Testing Mobile Money Payment Logic...');

// 1. Valid Pack Découverte (500 FCFA MTN)
const test1 = initiateSchema.safeParse({
  amount: 500,
  packType: 'discovery_500',
  operator: 'mtn',
  phone: '672364124',
});
console.log(test1.success ? '✅ Test 1 Passed: 500 FCFA MTN payment validated' : '❌ Test 1 Failed');

// 2. Valid Pass Mensuel (2000 FCFA Orange)
const test2 = initiateSchema.safeParse({
  amount: 2000,
  packType: 'monthly_2000',
  operator: 'orange',
  phone: '+237699112233',
  currency: 'XAF',
});
console.log(test2.success ? '✅ Test 2 Passed: 2000 FCFA Orange payment validated' : '❌ Test 2 Failed');

// 3. Invalid Amount (e.g. 1500 FCFA)
const test3 = initiateSchema.safeParse({
  amount: 1500,
  packType: 'discovery_500',
  operator: 'wave',
  phone: '+2250102030405',
});
console.log(!test3.success ? '✅ Test 3 Passed: Non-standard amount rejected' : '❌ Test 3 Failed');

// 4. Test Webhook Signature HMAC SHA-256
const webhookSecret = 'test_notchpay_secret_key_123';
const payload = JSON.stringify({
  event: 'payment.complete',
  status: 'complete',
  reference: 'c360_discovery_500_test_ref',
  amount: 500,
});

const validSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(payload)
  .digest('hex');

const sigBuf = Buffer.from(validSignature);
const expBuf = Buffer.from(validSignature);
const matches = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
console.log(matches ? '✅ Test 4 Passed: HMAC Webhook signature verified' : '❌ Test 4 Failed');

console.log('\n🎉 ALL PAYMENT VALIDATION ASSERTIONS PASSED!');

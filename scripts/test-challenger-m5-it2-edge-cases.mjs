import { z } from 'zod';
import assert from 'node:assert';

console.log('================================================================');
console.log('  CHALLENGER M5 IT2: ADVERSARIAL EDGE CASE AND SCHEMA AUDIT     ');
console.log('================================================================\n');

// 1. Current Backend dispatchSchema from mobile-api/app/api/mobile/stages/dispatch/route.ts
const currentBackendDispatchSchema = z.object({
  jobId: z.string().trim().min(1, 'jobId requis'),
  channel: z.enum(['whatsapp', 'email']),
  whatsappPitch: z.string().trim().max(10_000).optional(),
  letterText: z.string().trim().max(50_000).optional(),
  cvPdfBase64: z.string().trim().optional(),
  cvPdfUrl: z.preprocess((val) => (typeof val === 'string' && val.trim() === '' ? undefined : val), z.string().trim().url().optional()),
  studentNotes: z.string().trim().max(5_000).optional(),
  studentName: z.string().trim().max(200).optional(),
  studentEmail: z.preprocess((val) => (typeof val === 'string' && val.trim() === '' ? undefined : val), z.string().trim().email().optional()),
  studentPhone: z.string().trim().max(30).optional(),
  phoneNumber: z.string().trim().max(30).optional(),
});

console.log('--- AUDIT 1: Current Backend Schema with Null vs Empty vs Whitespace ---');

const testCases = [
  { desc: 'Missing email (omitted field)', payload: { jobId: 'job-1', channel: 'whatsapp' }, expectSuccess: true },
  { desc: 'studentEmail: undefined', payload: { jobId: 'job-1', channel: 'whatsapp', studentEmail: undefined }, expectSuccess: true },
  { desc: 'studentEmail: empty string ""', payload: { jobId: 'job-1', channel: 'whatsapp', studentEmail: '' }, expectSuccess: true },
  { desc: 'studentEmail: whitespace "   "', payload: { jobId: 'job-1', channel: 'whatsapp', studentEmail: '   ' }, expectSuccess: true },
  { desc: 'studentEmail: valid email', payload: { jobId: 'job-1', channel: 'whatsapp', studentEmail: 'test@campus360.cm' }, expectSuccess: true },
  { desc: 'studentEmail: invalid string "invalid-email"', payload: { jobId: 'job-1', channel: 'whatsapp', studentEmail: 'invalid-email' }, expectSuccess: false },
  { desc: 'studentEmail: null', payload: { jobId: 'job-1', channel: 'whatsapp', studentEmail: null }, expectSuccess: false },
  
  { desc: 'Missing cvPdfUrl (omitted field)', payload: { jobId: 'job-1', channel: 'whatsapp' }, expectSuccess: true },
  { desc: 'cvPdfUrl: undefined', payload: { jobId: 'job-1', channel: 'whatsapp', cvPdfUrl: undefined }, expectSuccess: true },
  { desc: 'cvPdfUrl: empty string ""', payload: { jobId: 'job-1', channel: 'whatsapp', cvPdfUrl: '' }, expectSuccess: true },
  { desc: 'cvPdfUrl: whitespace "   "', payload: { jobId: 'job-1', channel: 'whatsapp', cvPdfUrl: '   ' }, expectSuccess: true },
  { desc: 'cvPdfUrl: valid URL', payload: { jobId: 'job-1', channel: 'whatsapp', cvPdfUrl: 'https://example.com/cv.pdf' }, expectSuccess: true },
  { desc: 'cvPdfUrl: invalid URL "not-a-url"', payload: { jobId: 'job-1', channel: 'whatsapp', cvPdfUrl: 'not-a-url' }, expectSuccess: false },
  { desc: 'cvPdfUrl: null', payload: { jobId: 'job-1', channel: 'whatsapp', cvPdfUrl: null }, expectSuccess: false },

  { desc: 'whatsappPitch: null', payload: { jobId: 'job-1', channel: 'whatsapp', whatsappPitch: null }, expectSuccess: false },
  { desc: 'studentNotes: null', payload: { jobId: 'job-1', channel: 'whatsapp', studentNotes: null }, expectSuccess: false },
  { desc: 'studentName: null', payload: { jobId: 'job-1', channel: 'whatsapp', studentName: null }, expectSuccess: false },
  { desc: 'studentPhone: null', payload: { jobId: 'job-1', channel: 'whatsapp', studentPhone: null }, expectSuccess: false },
];

let passCount = 0;
for (const tc of testCases) {
  const res = currentBackendDispatchSchema.safeParse(tc.payload);
  const actualSuccess = res.success;
  const isMatch = actualSuccess === tc.expectSuccess;
  if (isMatch) {
    passCount++;
    console.log(`  ✓ ${tc.desc} -> ${actualSuccess ? 'ACCEPTED' : 'REJECTED (expected)'}`);
  } else {
    console.log(`  ✗ MISMATCH: ${tc.desc} -> got ${actualSuccess ? 'ACCEPTED' : 'REJECTED'}, expected ${tc.expectSuccess ? 'ACCEPTED' : 'REJECTED'}`);
  }
}

console.log(`\nAudit 1 results: ${passCount}/${testCases.length} behaved as characterized.`);

// 2. Client-side serialization audit with stagesApi.ts current implementation
console.log('\n--- AUDIT 2: Client-side Serialization in stagesApi.ts ---');

function currentStagesApiBody(params) {
  const phone = params.studentPhone || params.phoneNumber || '';
  return JSON.stringify({
    jobId: params.jobId,
    channel: params.channel,
    whatsappPitch: params.whatsappPitch || '',
    letterText: params.letterText || '',
    cvPdfBase64: params.cvPdfBase64 || '',
    cvPdfUrl: params.cvPdfUrl?.trim() || undefined,
    studentNotes: params.studentNotes?.trim() || undefined,
    studentName: params.studentName?.trim() || undefined,
    studentEmail: params.studentEmail?.trim() || undefined,
    studentPhone: phone?.trim() || undefined,
    phoneNumber: phone?.trim() || undefined,
  });
}

const clientScenarios = [
  {
    name: 'Profile with email, phone, name',
    params: {
      jobId: 'job-1',
      channel: 'whatsapp',
      studentEmail: 'student@poly.cm',
      studentPhone: '237672364124',
      studentName: 'Student Name',
    },
  },
  {
    name: 'Profile with empty string email ("")',
    params: {
      jobId: 'job-1',
      channel: 'whatsapp',
      studentEmail: '',
      studentPhone: '237672364124',
    },
  },
  {
    name: 'Profile with whitespace email ("   ")',
    params: {
      jobId: 'job-1',
      channel: 'whatsapp',
      studentEmail: '   ',
      studentPhone: '237672364124',
    },
  },
  {
    name: 'Profile with undefined email',
    params: {
      jobId: 'job-1',
      channel: 'whatsapp',
      studentEmail: undefined,
      studentPhone: '237672364124',
    },
  },
  {
    name: 'Profile with null email',
    params: {
      jobId: 'job-1',
      channel: 'whatsapp',
      studentEmail: null,
      studentPhone: '237672364124',
    },
  },
  {
    name: 'Profile with null cvPdfUrl',
    params: {
      jobId: 'job-1',
      channel: 'whatsapp',
      cvPdfUrl: null,
    },
  },
  {
    name: 'Profile with empty string cvPdfUrl ("")',
    params: {
      jobId: 'job-1',
      channel: 'whatsapp',
      cvPdfUrl: '',
    },
  },
];

console.log('Testing JSON.stringify + currentBackendDispatchSchema.safeParse:');
let clientPassCount = 0;
for (const sc of clientScenarios) {
  const jsonStr = currentStagesApiBody(sc.params);
  const parsedJson = JSON.parse(jsonStr);
  const validationRes = currentBackendDispatchSchema.safeParse(parsedJson);

  if (validationRes.success) {
    clientPassCount++;
    console.log(`  ✓ ${sc.name}: PASSED`);
    console.log(`    Wire JSON payload: ${jsonStr}`);
  } else {
    console.error(`  ✗ ${sc.name}: FAILED`);
    console.error(`    Wire JSON payload: ${jsonStr}`);
    console.error(`    Zod error:`, validationRes.error.flatten().fieldErrors);
  }
}

console.log(`\nClient-side serialization pass rate: ${clientPassCount}/${clientScenarios.length}`);

// 3. What if an external caller sends raw JSON with null values?
console.log('\n--- AUDIT 3: Vulnerability Assessment of Raw JSON Payloads with NULL ---');
const rawNullPayload = {
  jobId: 'job-1',
  channel: 'whatsapp',
  studentEmail: null,
  cvPdfUrl: null,
};
const rawNullResult = currentBackendDispatchSchema.safeParse(rawNullPayload);
console.log('Raw JSON with studentEmail: null, cvPdfUrl: null result:', rawNullResult.success ? 'ACCEPTED' : 'REJECTED');
if (!rawNullResult.success) {
  console.log('  -> Rejection details:', JSON.stringify(rawNullResult.error.flatten().fieldErrors));
}

// 4. Proposed Resilient Schema that handles null as well as empty strings
const resilientBackendDispatchSchema = z.object({
  jobId: z.string().trim().min(1, 'jobId requis'),
  channel: z.enum(['whatsapp', 'email']),
  whatsappPitch: z.string().trim().max(10_000).optional().nullable(),
  letterText: z.string().trim().max(50_000).optional().nullable(),
  cvPdfBase64: z.string().trim().optional().nullable(),
  cvPdfUrl: z.preprocess(
    (val) => (val === null || val === undefined || (typeof val === 'string' && val.trim() === '') ? undefined : val),
    z.string().trim().url().optional()
  ),
  studentNotes: z.string().trim().max(5_000).optional().nullable(),
  studentName: z.string().trim().max(200).optional().nullable(),
  studentEmail: z.preprocess(
    (val) => (val === null || val === undefined || (typeof val === 'string' && val.trim() === '') ? undefined : val),
    z.string().trim().email().optional()
  ),
  studentPhone: z.string().trim().max(30).optional().nullable(),
  phoneNumber: z.string().trim().max(30).optional().nullable(),
});

const resilientNullResult = resilientBackendDispatchSchema.safeParse(rawNullPayload);
console.log('\nResilient Schema with studentEmail: null, cvPdfUrl: null result:', resilientNullResult.success ? 'ACCEPTED' : 'REJECTED');

console.log('\n================================================================');
console.log('              AUDIT COMPLETED                                   ');
console.log('================================================================');

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { z } = require('../../../mobile-api/node_modules/zod');

console.log('--- Testing Zod Empty String Fix Variants ---');

// Helper preprocessor
const sanitizeEmptyStringToUndefined = (val) => {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed === '' ? undefined : trimmed;
  }
  return val === null ? undefined : val;
};

// Candidate Schema A: Pure union with literal empty string
const schemaA = z.object({
  jobId: z.string().trim().min(1, 'jobId requis'),
  channel: z.enum(['whatsapp', 'email']),
  cvPdfUrl: z.string().trim().url().optional().or(z.literal('')),
  studentEmail: z.string().trim().email().optional().or(z.literal('')),
});

// Candidate Schema B: Preprocess to undefined (recommended)
const schemaB = z.object({
  jobId: z.string().trim().min(1, 'jobId requis'),
  channel: z.enum(['whatsapp', 'email']),
  cvPdfUrl: z.preprocess(sanitizeEmptyStringToUndefined, z.string().trim().url().optional()),
  studentEmail: z.preprocess(sanitizeEmptyStringToUndefined, z.string().trim().email().optional()),
});

// Candidate Schema C: Preprocess + Union (bulletproof hybrid)
const schemaC = z.object({
  jobId: z.string().trim().min(1, 'jobId requis'),
  channel: z.enum(['whatsapp', 'email']),
  cvPdfUrl: z.preprocess(sanitizeEmptyStringToUndefined, z.string().trim().url().optional().or(z.literal(''))),
  studentEmail: z.preprocess(sanitizeEmptyStringToUndefined, z.string().trim().email().optional().or(z.literal(''))),
});

const payloads = [
  { name: 'Omitted email & cvPdfUrl', data: { jobId: 'job-1', channel: 'whatsapp' } },
  { name: 'Explicit undefined', data: { jobId: 'job-1', channel: 'whatsapp', studentEmail: undefined, cvPdfUrl: undefined } },
  { name: 'Empty string ""', data: { jobId: 'job-1', channel: 'whatsapp', studentEmail: '', cvPdfUrl: '' } },
  { name: 'Spaces only "   "', data: { jobId: 'job-1', channel: 'whatsapp', studentEmail: '   ', cvPdfUrl: '   ' } },
  { name: 'Null', data: { jobId: 'job-1', channel: 'whatsapp', studentEmail: null, cvPdfUrl: null } },
  { name: 'Valid values', data: { jobId: 'job-1', channel: 'whatsapp', studentEmail: 'student@polytechnique.cm', cvPdfUrl: 'https://supabase.co/cv.pdf' } },
  { name: 'Invalid email', data: { jobId: 'job-1', channel: 'whatsapp', studentEmail: 'notanemail' }, expectInvalid: true },
  { name: 'Invalid url', data: { jobId: 'job-1', channel: 'whatsapp', cvPdfUrl: 'notanurl' }, expectInvalid: true },
];

console.log('\n--- Evaluating Schema A (Union with literal \'\') ---');
for (const p of payloads) {
  const res = schemaA.safeParse(p.data);
  console.log(`[Schema A] ${p.name.padEnd(25)} -> ${res.success ? 'SUCCESS' : 'FAILED'} (expected valid: ${!p.expectInvalid})`);
  if (res.success) {
    console.log(`           output: studentEmail=${JSON.stringify(res.data.studentEmail)}, cvPdfUrl=${JSON.stringify(res.data.cvPdfUrl)}`);
  }
}

console.log('\n--- Evaluating Schema B (Preprocess to undefined) ---');
for (const p of payloads) {
  const res = schemaB.safeParse(p.data);
  console.log(`[Schema B] ${p.name.padEnd(25)} -> ${res.success ? 'SUCCESS' : 'FAILED'} (expected valid: ${!p.expectInvalid})`);
  if (res.success) {
    console.log(`           output: studentEmail=${JSON.stringify(res.data.studentEmail)}, cvPdfUrl=${JSON.stringify(res.data.cvPdfUrl)}`);
  }
}

console.log('\n--- Evaluating Schema C (Preprocess + Union Hybrid) ---');
for (const p of payloads) {
  const res = schemaC.safeParse(p.data);
  console.log(`[Schema C] ${p.name.padEnd(25)} -> ${res.success ? 'SUCCESS' : 'FAILED'} (expected valid: ${!p.expectInvalid})`);
  if (res.success) {
    console.log(`           output: studentEmail=${JSON.stringify(res.data.studentEmail)}, cvPdfUrl=${JSON.stringify(res.data.cvPdfUrl)}`);
  }
}

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { z } = require('../../../mobile-api/node_modules/zod');
import assert from 'node:assert';

console.log('=== Simulation of Fixed Client and Fixed Backend ===');

const sanitize = (val) => {
  if (typeof val === 'string') {
    const t = val.trim();
    return t === '' ? undefined : t;
  }
  return val === null ? undefined : val;
};

// Proposed Backend Schema:
const dispatchSchema = z.object({
  jobId: z.string().trim().min(1, 'jobId requis'),
  channel: z.enum(['whatsapp', 'email']),
  whatsappPitch: z.string().trim().max(10_000).optional(),
  letterText: z.string().trim().max(50_000).optional(),
  cvPdfBase64: z.string().trim().optional(),
  cvPdfUrl: z.preprocess(sanitize, z.string().trim().url().optional().or(z.literal(''))),
  studentNotes: z.string().trim().max(5_000).optional(),
  studentName: z.string().trim().max(200).optional(),
  studentEmail: z.preprocess(sanitize, z.string().trim().email().optional().or(z.literal(''))),
  studentPhone: z.string().trim().max(30).optional(),
  phoneNumber: z.string().trim().max(30).optional(),
});

// Proposed Client Serialization:
function simulateClientDispatchFixed(params) {
  const phone = params.studentPhone || params.phoneNumber || '';
  return {
    jobId: params.jobId,
    channel: params.channel,
    whatsappPitch: params.whatsappPitch || '',
    letterText: params.letterText || '',
    cvPdfBase64: params.cvPdfBase64 || '',
    cvPdfUrl: params.cvPdfUrl?.trim() || undefined,
    studentNotes: params.studentNotes || '',
    studentName: params.studentName || '',
    studentEmail: params.studentEmail?.trim() || undefined,
    studentPhone: phone,
    phoneNumber: phone,
  };
}

// 1. Old client sending '' to new backend schema
const oldClientPayloadEmpty = { jobId: 'job-1', channel: 'whatsapp', studentEmail: '', cvPdfUrl: '' };
const resOldClient = dispatchSchema.safeParse(oldClientPayloadEmpty);
console.log('1. Old client sending "" to new backend schema:', resOldClient.success);
assert.equal(resOldClient.success, true);
assert.equal(resOldClient.data.studentEmail, undefined);
assert.equal(resOldClient.data.cvPdfUrl, undefined);

// 2. New client with undefined email to new backend schema
const newClientPayloadUndef = simulateClientDispatchFixed({ jobId: 'job-1', channel: 'whatsapp', studentEmail: undefined });
const serializedUndef = JSON.parse(JSON.stringify(newClientPayloadUndef));
const resNewClientUndef = dispatchSchema.safeParse(serializedUndef);
console.log('2. New client with undefined email:', resNewClientUndef.success);
assert.equal(resNewClientUndef.success, true);
assert.equal('studentEmail' in serializedUndef, false);

// 3. New client with empty email string '' to new backend schema
const newClientPayloadEmptyStr = simulateClientDispatchFixed({ jobId: 'job-1', channel: 'whatsapp', studentEmail: '' });
const serializedEmptyStr = JSON.parse(JSON.stringify(newClientPayloadEmptyStr));
const resNewClientEmptyStr = dispatchSchema.safeParse(serializedEmptyStr);
console.log('3. New client with empty email string "":', resNewClientEmptyStr.success);
assert.equal(resNewClientEmptyStr.success, true);
assert.equal('studentEmail' in serializedEmptyStr, false);

// 4. New client with whitespace email '   ' to new backend schema
const newClientPayloadSpaces = simulateClientDispatchFixed({ jobId: 'job-1', channel: 'whatsapp', studentEmail: '   ' });
const serializedSpaces = JSON.parse(JSON.stringify(newClientPayloadSpaces));
const resNewClientSpaces = dispatchSchema.safeParse(serializedSpaces);
console.log('4. New client with spaces email "   ":', resNewClientSpaces.success);
assert.equal(resNewClientSpaces.success, true);
assert.equal('studentEmail' in serializedSpaces, false);

// 5. New client with valid email to new backend schema
const newClientPayloadValid = simulateClientDispatchFixed({ jobId: 'job-1', channel: 'whatsapp', studentEmail: 'dave@campus.cm' });
const serializedValid = JSON.parse(JSON.stringify(newClientPayloadValid));
const resNewClientValid = dispatchSchema.safeParse(serializedValid);
console.log('5. New client with valid email:', resNewClientValid.success);
assert.equal(resNewClientValid.success, true);
assert.equal(resNewClientValid.data.studentEmail, 'dave@campus.cm');

// 6. Real invalid email still rejected with 400!
const newClientPayloadBad = simulateClientDispatchFixed({ jobId: 'job-1', channel: 'whatsapp', studentEmail: 'not-an-email' });
const serializedBad = JSON.parse(JSON.stringify(newClientPayloadBad));
const resNewClientBad = dispatchSchema.safeParse(serializedBad);
console.log('6. Invalid email rejected:', resNewClientBad.success === false);
assert.equal(resNewClientBad.success, false);
assert.deepEqual(Object.keys(resNewClientBad.error.flatten().fieldErrors), ['studentEmail']);

console.log('>>> ALL 6 INTEROPERABILITY SCENARIOS PASSED 100% <<<');

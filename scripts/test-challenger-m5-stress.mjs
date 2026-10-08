import { z } from 'zod';
import assert from 'node:assert';

console.log('================================================================');
console.log('  CHALLENGER 2 (challenger_m5_2) EMPIRICAL VERIFICATION SUITE   ');
console.log('  Milestone M5: Mobile 1-Click Apply Flow & Native Fallback     ');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// 1. Replicate exact backend dispatchSchema & patchSchema
// -----------------------------------------------------------------------------
const dispatchSchema = z.object({
  jobId: z.string().trim().min(1, 'jobId requis'),
  channel: z.enum(['whatsapp', 'email']),
  whatsappPitch: z.string().trim().max(10_000).optional(),
  letterText: z.string().trim().max(50_000).optional(),
  cvPdfBase64: z.string().trim().optional(),
  cvPdfUrl: z.string().trim().url().optional(),
  studentNotes: z.string().trim().max(5_000).optional(),
  studentName: z.string().trim().max(200).optional(),
  studentEmail: z.string().trim().email().optional(),
  studentPhone: z.string().trim().max(30).optional(),
  phoneNumber: z.string().trim().max(30).optional(),
});

const patchSchema = z.object({
  applicationId: z.string().min(1),
  status: z.enum([
    'PENDING',
    'SENT_PENDING',
    'DELIVERED',
    'FAILED',
    'REVIEWING',
    'INTERVIEW',
    'ACCEPTED',
    'REJECTED',
  ]),
});

const ALL_APP_STATUSES = [
  'PENDING',
  'SENT_PENDING',
  'DELIVERED',
  'FAILED',
  'REVIEWING',
  'INTERVIEW',
  'ACCEPTED',
  'REJECTED',
];

console.log('--- TEST GROUP 1: AppStatus Exhaustiveness & Record Mapping ---');

// Replicate the STATUS_CONFIG records from ApplicationsTimelineScreen & ApplicationDetailModal
const TIMELINE_STATUS_CONFIG = {
  PENDING: { label: 'En attente', bg: 'rgba(245, 158, 11, 0.12)', text: '#FBBF24', border: 'rgba(245, 158, 11, 0.25)', icon: 'Clock' },
  SENT_PENDING: { label: 'En cours d’envoi', bg: 'rgba(59, 130, 246, 0.12)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.25)', icon: 'Send' },
  DELIVERED: { label: 'Délivrée', bg: 'rgba(16, 185, 129, 0.12)', text: '#34D399', border: 'rgba(16, 185, 129, 0.25)', icon: 'CheckCircle2' },
  FAILED: { label: 'Échec d’envoi', bg: 'rgba(239, 68, 68, 0.12)', text: '#F87171', border: 'rgba(239, 68, 68, 0.25)', icon: 'XCircle' },
  REVIEWING: { label: 'En examen', bg: 'rgba(59, 130, 246, 0.12)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.25)', icon: 'FileCheck' },
  INTERVIEW: { label: 'Entretien', bg: 'rgba(124, 58, 237, 0.12)', text: '#A78BFA', border: 'rgba(124, 58, 237, 0.25)', icon: 'MessageSquare' },
  ACCEPTED: { label: 'Accepté', bg: 'rgba(16, 185, 129, 0.12)', text: '#34D399', border: 'rgba(16, 185, 129, 0.25)', icon: 'CheckCircle2' },
  REJECTED: { label: 'Non retenu', bg: 'rgba(239, 68, 68, 0.12)', text: '#F87171', border: 'rgba(239, 68, 68, 0.25)', icon: 'XCircle' },
};

const DETAIL_STATUS_CONFIG = {
  PENDING: { label: 'En attente', bg: 'rgba(245, 158, 11, 0.12)', text: '#FBBF24', border: 'rgba(245, 158, 11, 0.25)', icon: 'Clock' },
  SENT_PENDING: { label: 'En cours d’envoi', bg: 'rgba(59, 130, 246, 0.12)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.25)', icon: 'Send' },
  DELIVERED: { label: 'Délivrée', bg: 'rgba(16, 185, 129, 0.12)', text: '#34D399', border: 'rgba(16, 185, 129, 0.25)', icon: 'CheckCircle2' },
  FAILED: { label: 'Échec d’envoi', bg: 'rgba(239, 68, 68, 0.12)', text: '#F87171', border: 'rgba(239, 68, 68, 0.25)', icon: 'XCircle' },
  REVIEWING: { label: 'En examen', bg: 'rgba(59, 130, 246, 0.12)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.25)', icon: 'Clock' },
  INTERVIEW: { label: 'Entretien', bg: 'rgba(124, 58, 237, 0.15)', text: '#A78BFA', border: 'rgba(124, 58, 237, 0.3)', icon: 'MessageSquare' },
  ACCEPTED: { label: 'Accepté', bg: 'rgba(16, 185, 129, 0.12)', text: '#34D399', border: 'rgba(16, 185, 129, 0.25)', icon: 'CheckCircle2' },
  REJECTED: { label: 'Non retenu', bg: 'rgba(239, 68, 68, 0.12)', text: '#F87171', border: 'rgba(239, 68, 68, 0.25)', icon: 'XCircle' },
};

let statusMappingPass = true;
for (const status of ALL_APP_STATUSES) {
  const conf1 = TIMELINE_STATUS_CONFIG[status];
  const conf2 = DETAIL_STATUS_CONFIG[status];

  if (!conf1 || !conf1.label || !conf1.bg || !conf1.text || !conf1.border || !conf1.icon) {
    console.error(`❌ Incomplete status config in ApplicationsTimelineScreen for status: ${status}`);
    statusMappingPass = false;
  }
  if (!conf2 || !conf2.label || !conf2.bg || !conf2.text || !conf2.border || !conf2.icon) {
    console.error(`❌ Incomplete status config in ApplicationDetailModal for status: ${status}`);
    statusMappingPass = false;
  }

  // Also check patchSchema acceptance
  const patchRes = patchSchema.safeParse({ applicationId: 'app-test', status });
  if (!patchRes.success) {
    console.error(`❌ patchSchema rejected valid status: ${status}`);
    statusMappingPass = false;
  }
}

if (statusMappingPass) {
  console.log(`✅ All ${ALL_APP_STATUSES.length} AppStatus entries are fully mapped in UI records and patchSchema.`);
}

console.log('\n--- TEST GROUP 2: Payload Validation & Boundary Edge Cases ---');

const stressCases = [
  // 1. Channel tests
  {
    desc: "Channel 'whatsapp' is accepted",
    payload: { jobId: 'job-1', channel: 'whatsapp' },
    expectSuccess: true,
  },
  {
    desc: "Channel 'email' is accepted",
    payload: { jobId: 'job-1', channel: 'email' },
    expectSuccess: true,
  },
  {
    desc: "Channel 'WHATSAPP' (uppercase) is rejected (schema requires lowercase)",
    payload: { jobId: 'job-1', channel: 'WHATSAPP' },
    expectSuccess: false,
  },
  {
    desc: "Channel 'sms' (unsupported) is rejected",
    payload: { jobId: 'job-1', channel: 'sms' },
    expectSuccess: false,
  },

  // 2. Large Pitches
  {
    desc: "whatsappPitch exactly 10,000 characters is accepted",
    payload: { jobId: 'job-1', channel: 'whatsapp', whatsappPitch: 'W'.repeat(10000) },
    expectSuccess: true,
  },
  {
    desc: "whatsappPitch 10,001 characters is rejected",
    payload: { jobId: 'job-1', channel: 'whatsapp', whatsappPitch: 'W'.repeat(10001) },
    expectSuccess: false,
  },
  {
    desc: "letterText exactly 50,000 characters is accepted",
    payload: { jobId: 'job-1', channel: 'email', letterText: 'L'.repeat(50000) },
    expectSuccess: true,
  },
  {
    desc: "letterText 50,001 characters is rejected",
    payload: { jobId: 'job-1', channel: 'email', letterText: 'L'.repeat(50001) },
    expectSuccess: false,
  },

  // 3. Base64 Strings
  {
    desc: "cvPdfBase64 empty string is accepted",
    payload: { jobId: 'job-1', channel: 'whatsapp', cvPdfBase64: '' },
    expectSuccess: true,
  },
  {
    desc: "cvPdfBase64 standard PDF base64 is accepted",
    payload: {
      jobId: 'job-1',
      channel: 'whatsapp',
      cvPdfBase64: 'JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cK...',
    },
    expectSuccess: true,
  },
  {
    desc: "cvPdfBase64 massive base64 payload (1 MB) is accepted by schema",
    payload: {
      jobId: 'job-1',
      channel: 'whatsapp',
      cvPdfBase64: 'JVBERi0x' + 'B'.repeat(1024 * 1024),
    },
    expectSuccess: true,
  },

  // 4. Undefined Optional Fields
  {
    desc: "Undefined optional fields parse cleanly",
    payload: {
      jobId: 'job-1',
      channel: 'whatsapp',
      whatsappPitch: undefined,
      letterText: undefined,
      cvPdfBase64: undefined,
      cvPdfUrl: undefined,
      studentNotes: undefined,
      studentName: undefined,
      studentEmail: undefined,
      studentPhone: undefined,
      phoneNumber: undefined,
    },
    expectSuccess: true,
  },

  // 5. Empty Strings Behavior
  {
    desc: "Empty string for jobId is rejected",
    payload: { jobId: '', channel: 'whatsapp' },
    expectSuccess: false,
  },
  {
    desc: "Whitespace-only jobId is rejected",
    payload: { jobId: '   ', channel: 'whatsapp' },
    expectSuccess: false,
  },
  {
    desc: "Empty string for whatsappPitch is accepted",
    payload: { jobId: 'job-1', channel: 'whatsapp', whatsappPitch: '' },
    expectSuccess: true,
  },
  {
    desc: "Empty string for letterText is accepted",
    payload: { jobId: 'job-1', channel: 'email', letterText: '' },
    expectSuccess: true,
  },
  {
    desc: "Empty string for studentNotes is accepted",
    payload: { jobId: 'job-1', channel: 'whatsapp', studentNotes: '' },
    expectSuccess: true,
  },
  {
    desc: "Empty string for studentName is accepted",
    payload: { jobId: 'job-1', channel: 'whatsapp', studentName: '' },
    expectSuccess: true,
  },
  {
    desc: "Empty string for studentPhone is accepted",
    payload: { jobId: 'job-1', channel: 'whatsapp', studentPhone: '' },
    expectSuccess: true,
  },
  {
    desc: "Empty string for phoneNumber is accepted",
    payload: { jobId: 'job-1', channel: 'whatsapp', phoneNumber: '' },
    expectSuccess: true,
  },

  // 6. CRITICAL ADVERSARIAL CASES: Empty string for studentEmail & cvPdfUrl
  {
    desc: "CRITICAL: Empty string for studentEmail ('')",
    payload: { jobId: 'job-1', channel: 'whatsapp', studentEmail: '' },
    expectSuccess: false, // Because z.string().trim().email().optional() fails on ""
  },
  {
    desc: "CRITICAL: Empty string for cvPdfUrl ('')",
    payload: { jobId: 'job-1', channel: 'whatsapp', cvPdfUrl: '' },
    expectSuccess: false, // Because z.string().trim().url().optional() fails on ""
  },
  {
    desc: "Valid email string ('dave@campus360.cm') is accepted",
    payload: { jobId: 'job-1', channel: 'whatsapp', studentEmail: 'dave@campus360.cm' },
    expectSuccess: true,
  },
  {
    desc: "Valid cvPdfUrl ('https://bucket.supabase.co/cvs/cv-1.pdf') is accepted",
    payload: { jobId: 'job-1', channel: 'whatsapp', cvPdfUrl: 'https://bucket.supabase.co/cvs/cv-1.pdf' },
    expectSuccess: true,
  },
];

let stressPassCount = 0;
for (const tc of stressCases) {
  const res = dispatchSchema.safeParse(tc.payload);
  const ok = res.success === tc.expectSuccess;
  if (ok) {
    stressPassCount++;
    console.log(`  ✓ ${tc.desc}`);
  } else {
    console.error(`  ✗ FAIL: ${tc.desc}`);
    console.error(`    Expected success=${tc.expectSuccess}, got success=${res.success}`);
    if (!res.success) {
      console.error(`    Error:`, res.error.flatten().fieldErrors);
    }
  }
}

console.log(`\nStress tests passed: ${stressPassCount}/${stressCases.length}`);

// -----------------------------------------------------------------------------
// 3. Client-Side Dispatch Payload Simulation
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: Simulation of Client-Side stagesApi.dispatchStageApplication ---');

function simulateClientDispatch(params) {
  const phone = params.studentPhone || params.phoneNumber || '';
  const body = {
    jobId: params.jobId,
    channel: params.channel,
    whatsappPitch: params.whatsappPitch || '',
    letterText: params.letterText || '',
    cvPdfBase64: params.cvPdfBase64 || '',
    cvPdfUrl: params.cvPdfUrl,
    studentNotes: params.studentNotes || '',
    studentName: params.studentName || '',
    studentEmail: params.studentEmail || '',
    studentPhone: phone,
    phoneNumber: phone,
  };
  return body;
}

// Case A: Full profile with email
const clientPayloadA = simulateClientDispatch({
  jobId: 'job-stage-pfe',
  channel: 'whatsapp',
  whatsappPitch: 'Bonjour...',
  letterText: 'Motivation...',
  cvPdfBase64: 'JVBERi0x...',
  studentName: 'Dave Kameni',
  studentEmail: 'dave.kameni@polytechnique.cm',
  studentPhone: '237672364124',
});

const parseResA = dispatchSchema.safeParse(clientPayloadA);
console.log(`Client scenario A (profile with email): ${parseResA.success ? 'PASSED (valid)' : 'FAILED'}`);
assert.equal(parseResA.success, true);

// Case B: Profile without email or undefined email
const clientPayloadB = simulateClientDispatch({
  jobId: 'job-stage-pfe',
  channel: 'whatsapp',
  whatsappPitch: 'Bonjour...',
  letterText: 'Motivation...',
  cvPdfBase64: 'JVBERi0x...',
  studentName: 'Dave Kameni',
  studentEmail: undefined, // No email in profile!
  studentPhone: '237672364124',
});

const parseResB = dispatchSchema.safeParse(clientPayloadB);
console.log(`Client scenario B (profile WITHOUT email): ${parseResB.success ? 'PASSED' : 'REJECTED by Zod!'}`);
if (!parseResB.success) {
  console.log(`  -> Zod Rejection Details:`, JSON.stringify(parseResB.error.flatten().fieldErrors));
  console.log(`  -> Vulnerability confirmed: Client transmits studentEmail: '' which causes Zod invalid_format error!`);
}

console.log('\n================================================================');
console.log('              CHALLENGER VERIFICATION COMPLETED                ');
console.log('================================================================');

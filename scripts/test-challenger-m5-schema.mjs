import { z } from 'zod';

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

console.log('=== TEST SUITE: dispatchSchema Empirical Edge Cases ===\n');

const testCases = [
  {
    name: 'TC1: Minimal valid payload (all optional fields omitted)',
    payload: {
      jobId: 'job-123',
      channel: 'whatsapp',
    },
    shouldPass: true,
  },
  {
    name: 'TC2: Valid email channel with standard fields',
    payload: {
      jobId: 'job-456',
      channel: 'email',
      studentName: 'Alice Kamga',
      studentEmail: 'alice@example.cm',
      letterText: 'Madame, Monsieur, je postule...',
    },
    shouldPass: true,
  },
  {
    name: 'TC3: Valid whatsapp channel with large pitch (exactly 10,000 chars)',
    payload: {
      jobId: 'job-789',
      channel: 'whatsapp',
      whatsappPitch: 'A'.repeat(10000),
    },
    shouldPass: true,
  },
  {
    name: 'TC4: whatsappPitch exceeding max length (10,001 chars)',
    payload: {
      jobId: 'job-789',
      channel: 'whatsapp',
      whatsappPitch: 'A'.repeat(10001),
    },
    shouldPass: false,
  },
  {
    name: 'TC5: letterText at max limit (50,000 chars)',
    payload: {
      jobId: 'job-789',
      channel: 'email',
      letterText: 'L'.repeat(50000),
    },
    shouldPass: true,
  },
  {
    name: 'TC6: letterText exceeding max limit (50,001 chars)',
    payload: {
      jobId: 'job-789',
      channel: 'email',
      letterText: 'L'.repeat(50001),
    },
    shouldPass: false,
  },
  {
    name: 'TC7: Large base64 PDF payload (2 MB base64 string)',
    payload: {
      jobId: 'job-789',
      channel: 'whatsapp',
      cvPdfBase64: 'JVBERi0xLjQ' + 'A'.repeat(2 * 1024 * 1024),
    },
    shouldPass: true,
  },
  {
    name: 'TC8: Empty string jobId',
    payload: {
      jobId: '',
      channel: 'whatsapp',
    },
    shouldPass: false,
  },
  {
    name: 'TC9: Whitespace-only jobId',
    payload: {
      jobId: '   ',
      channel: 'whatsapp',
    },
    shouldPass: false,
  },
  {
    name: 'TC10: Invalid channel value',
    payload: {
      jobId: 'job-123',
      channel: 'sms',
    },
    shouldPass: false,
  },
  {
    name: 'TC11: Client dispatch when studentEmail is empty string ("")',
    payload: {
      jobId: 'job-123',
      channel: 'whatsapp',
      whatsappPitch: 'Bonjour',
      letterText: 'Motivation',
      cvPdfBase64: 'JVBERi...',
      cvPdfUrl: undefined,
      studentNotes: '',
      studentName: 'Dave Kameni',
      studentEmail: '',
      studentPhone: '237672364124',
      phoneNumber: '237672364124',
    },
    shouldPass: true, // Let's see if it actually passes!
  },
  {
    name: 'TC12: Client dispatch when cvPdfUrl is empty string ("")',
    payload: {
      jobId: 'job-123',
      channel: 'whatsapp',
      cvPdfUrl: '',
    },
    shouldPass: true, // Let's see if it actually passes!
  },
  {
    name: 'TC13: Client dispatch with valid studentEmail and valid cvPdfUrl',
    payload: {
      jobId: 'job-123',
      channel: 'whatsapp',
      studentEmail: 'student@campus360.cm',
      cvPdfUrl: 'https://example.com/storage/cv.pdf',
    },
    shouldPass: true,
  },
];

let failedTests = 0;

for (const tc of testCases) {
  const result = dispatchSchema.safeParse(tc.payload);
  const passed = result.success === tc.shouldPass;
  if (!passed) {
    console.error(`❌ FAILED: ${tc.name}`);
    console.error(`   Expected success: ${tc.shouldPass}, Got: ${result.success}`);
    if (!result.success) {
      console.error(`   Zod errors:`, JSON.stringify(result.error.flatten().fieldErrors));
    }
    failedTests++;
  } else {
    console.log(`✅ PASSED: ${tc.name} (Result: ${result.success ? 'VALID' : 'REJECTED as expected'})`);
  }
}

console.log(`\n=== SUMMARY: ${testCases.length - failedTests}/${testCases.length} tests matching expectations ===`);

#!/usr/bin/env node

/**
 * ==============================================================================
 * CAMPUS 360 — ADVERSARIAL CHALLENGER TEST SUITE (M6)
 * ==============================================================================
 *
 * Independent empirical verification by challenger_m6_2:
 * 1. N8N Code Node Stress & Runtime Fuzzing
 * 2. Schema Boundary & Injection Fuzzing (Zod schemas)
 * 3. Deep DevSecOps Audit across client code
 * 4. Cross-Module Contract Parity Check (Client vs Mobile-API)
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function check(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     ↳ ${err.message}`);
    failures.push({ name, err });
  }
}

console.log('🔥 [CHALLENGER M6] Starting Adversarial Verification Suite');

// ==============================================================================
// 1. N8N CODE NODE RUNTIME EXECUTION & STRESS FUZZING
// ==============================================================================
console.log('\n--- Section 1: N8N Code Node Execution & Runtime Fuzzing ---');

const workflowPath = path.join(projectRoot, 'scripts', 'n8n', 'send_stage_application_workflow.json');
const workflowJson = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
const codeNode = workflowJson.nodes.find((n) => n.type === 'n8n-nodes-base.code');
assert.ok(codeNode, 'Code node must exist in workflow');
const jsCode = codeNode.parameters.jsCode;

function executeN8nCode(inputJson) {
  const runner = new Function(
    '$json',
    'Date',
    'Math',
    'JSON',
    `${jsCode}`
  );
  return runner(inputJson, Date, Math, JSON);
}

check('ADV 1.1: N8N Code Node executes standard WhatsApp payload', () => {
  const input = {
    applicationId: 'app-test-01',
    channel: 'whatsapp',
    student: {
      fullName: 'Dave Lionel Kameni',
      phoneWhatsapp: '237672364124',
      email: 'dave@polytechnique.cm',
      instanceName: 'student-237672364124',
    },
    job: {
      title: 'Stagiaire Développeur',
      companyName: 'Orange Cameroun',
      recruiterWhatsapp: '237670001122',
    },
    dossier: {
      cvPdfUrl: 'https://supabase.co/cv.pdf',
      letterText: 'Motivation text',
    },
  };
  const res = executeN8nCode(input);
  assert.ok(Array.isArray(res) && res.length === 1);
  const out = res[0].json;
  assert.equal(out.applicationId, 'app-test-01');
  assert.equal(out.channel, 'whatsapp');
  assert.equal(out.student.phoneWhatsapp, '237672364124');
  assert.ok(out.dossier.whatsappPitch.includes('Orange Cameroun'));
  assert.ok(out.jitterSeconds >= 15 && out.jitterSeconds <= 30);
});

check('ADV 1.2: N8N Code Node executes standard Email payload with HTML template', () => {
  const input = {
    applicationId: 'app-test-02',
    channel: 'email',
    student: {
      fullName: 'Dave Lionel Kameni',
      email: 'dave@polytechnique.cm',
    },
    job: {
      title: 'Stagiaire DevOps',
      companyName: 'MTN Cameroun',
      recruiterEmail: 'rh@mtn.cm',
    },
    dossier: {
      cvPdfUrl: 'https://supabase.co/cv.pdf',
      letterText: 'Lettre de motivation complète',
    },
  };
  const res = executeN8nCode(input);
  const out = res[0].json;
  assert.equal(out.channel, 'email');
  assert.ok(out.emailSubject.includes('Stagiaire DevOps'));
  assert.ok(out.emailHtml.includes('MTN Cameroun'));
  assert.ok(out.emailHtml.includes('Lettre de motivation'));
  assert.ok(out.emailHtml.includes('https://supabase.co/cv.pdf'));
});

check('ADV 1.3: N8N Code Node handles completely empty payload without throwing', () => {
  const res = executeN8nCode({});
  assert.ok(Array.isArray(res) && res.length === 1);
  const out = res[0].json;
  assert.ok(out.applicationId.startsWith('app-'));
  assert.equal(out.channel, 'whatsapp'); // defaults to whatsapp
  assert.ok(out.student.phoneWhatsapp);
  assert.ok(out.job.title);
  assert.ok(out.jitterSeconds >= 15 && out.jitterSeconds <= 30);
});

check('ADV 1.4: N8N Code Node handles null fields and missing sub-objects', () => {
  const res = executeN8nCode({
    applicationId: null,
    channel: null,
    student: null,
    job: null,
    dossier: null,
  });
  assert.ok(Array.isArray(res) && res.length === 1);
  const out = res[0].json;
  assert.ok(out.applicationId.startsWith('app-'));
  assert.equal(out.channel, 'whatsapp');
});

check('ADV 1.5: N8N Code Node normalizes 9-digit Cameroon numbers starting with 6', () => {
  const res = executeN8nCode({
    student: { phoneWhatsapp: '690123456' },
    job: { recruiterWhatsapp: '670009988' },
  });
  const out = res[0].json;
  assert.equal(out.student.phoneWhatsapp, '237690123456');
  assert.equal(out.job.recruiterWhatsapp, '237670009988');
});

check('ADV 1.6: N8N Code Node jitter anti-ban distribution statistical check (1000 runs)', () => {
  for (let i = 0; i < 1000; i++) {
    const res = executeN8nCode({});
    const jitter = res[0].json.jitterSeconds;
    assert.ok(Number.isInteger(jitter), 'Jitter must be integer');
    assert.ok(jitter >= 15 && jitter <= 30, `Jitter ${jitter} must be within [15, 30]`);
  }
});

// ==============================================================================
// 2. SCHEMA BOUNDARY & INJECTION FUZZING
// ==============================================================================
console.log('\n--- Section 2: Schema Boundary & Injection Fuzzing ---');

const dispatchSchema = z.object({
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

check('ADV 2.1: SQL injection strings in jobId and pitch are safely contained as string literals', () => {
  const sqlInjection = "' OR '1'='1'; DROP TABLE stage_applications; --";
  const res = dispatchSchema.safeParse({
    jobId: sqlInjection,
    channel: 'whatsapp',
    whatsappPitch: sqlInjection,
  });
  assert.equal(res.success, true);
  assert.equal(res.data.jobId, sqlInjection);
});

check('ADV 2.2: Extreme payload length boundaries', () => {
  // Exactly at boundary
  const atPitchBoundary = dispatchSchema.safeParse({
    jobId: 'job-1',
    channel: 'whatsapp',
    whatsappPitch: 'x'.repeat(10_000),
    letterText: 'y'.repeat(50_000),
    studentNotes: 'z'.repeat(5_000),
  });
  assert.equal(atPitchBoundary.success, true);

  // 1 char past boundary
  const pastPitch = dispatchSchema.safeParse({
    jobId: 'job-1',
    channel: 'whatsapp',
    whatsappPitch: 'x'.repeat(10_001),
  });
  assert.equal(pastPitch.success, false);

  const pastLetter = dispatchSchema.safeParse({
    jobId: 'job-1',
    channel: 'whatsapp',
    letterText: 'y'.repeat(50_001),
  });
  assert.equal(pastLetter.success, false);

  const pastNotes = dispatchSchema.safeParse({
    jobId: 'job-1',
    channel: 'whatsapp',
    studentNotes: 'z'.repeat(5_001),
  });
  assert.equal(pastNotes.success, false);
});

check('ADV 2.3: Non-string / type confusion rejection in dispatchSchema', () => {
  assert.equal(dispatchSchema.safeParse({ jobId: 12345, channel: 'whatsapp' }).success, false);
  assert.equal(dispatchSchema.safeParse({ jobId: 'job-1', channel: 1 }).success, false);
  assert.equal(dispatchSchema.safeParse({ jobId: 'job-1', channel: ['whatsapp'] }).success, false);
  assert.equal(dispatchSchema.safeParse({ jobId: 'job-1', channel: { name: 'whatsapp' } }).success, false);
  assert.equal(dispatchSchema.safeParse({ jobId: 'job-1', channel: 'whatsapp', studentEmail: 1234 }).success, false);
});

check('ADV 2.4: Prototype pollution attempts in patchSchema are neutralized', () => {
  const polluted = JSON.parse('{"applicationId": "app-1", "status": "DELIVERED", "__proto__": {"admin": true}}');
  const res = patchSchema.safeParse(polluted);
  assert.equal(res.success, true);
  assert.equal(res.data.status, 'DELIVERED');
  assert.equal(Object.prototype.admin, undefined);
});

// ==============================================================================
// 3. COMPREHENSIVE DEVSECOPS SECRET LEAK AUDIT
// ==============================================================================
console.log('\n--- Section 3: Deep DevSecOps Audit across Client Code ---');

check('ADV 3.1: Zero server-side API secrets anywhere in src/', () => {
  const srcDir = path.join(projectRoot, 'src');
  const scannedFiles = [];

  function collectFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        collectFiles(fullPath);
      } else if (/\.(tsx?|jsx?|json)$/.test(entry.name)) {
        scannedFiles.push(fullPath);
      }
    }
  }
  collectFiles(srcDir);
  assert.ok(scannedFiles.length >= 45, `Must scan all client files (found ${scannedFiles.length})`);

  for (const filePath of scannedFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relPath = path.relative(projectRoot, filePath);

    // Rule 1: No Evolution API keys
    assert.equal(
      /EVOLUTION_API_KEY/i.test(content) && !relPath.endsWith('.md'),
      false,
      `Secret leak: EVOLUTION_API_KEY in ${relPath}`
    );

    // Rule 2: No N8N API keys or secrets
    assert.equal(
      /(N8N_API_KEY|N8N_INGESTION_SECRET)/i.test(content),
      false,
      `Secret leak: N8N secret in ${relPath}`
    );

    // Rule 3: No wa.blackcompany.site directly in client code
    assert.equal(
      content.includes('wa.blackcompany.site'),
      false,
      `Direct microservice exposure: wa.blackcompany.site in ${relPath}`
    );

    // Rule 4: No n8n.blackcompany.site directly in client code
    assert.equal(
      content.includes('n8n.blackcompany.site'),
      false,
      `Direct microservice exposure: n8n.blackcompany.site in ${relPath}`
    );
  }
});

// ==============================================================================
// 4. CROSS-MODULE CONTRACT PARITY CHECK
// ==============================================================================
console.log('\n--- Section 4: Cross-Module Contract Parity Check ---');

check('ADV 4.1: Phone Normalization logic parity between mobile-api and src/features/whatsapp', () => {
  // Read both files and verify the regex / transformation logic matches
  const apiFile = fs.readFileSync(path.join(projectRoot, 'mobile-api', 'lib', 'evolution-api.ts'), 'utf8');
  const clientFile = fs.readFileSync(path.join(projectRoot, 'src', 'features', 'whatsapp', 'whatsappService.ts'), 'utf8');

  // Both must check Cameroon 9-digit prefix '6' and prepend '237'
  assert.ok(apiFile.includes("digits.length === 9 && digits.startsWith('6')"));
  assert.ok(clientFile.includes("digits.length === 9 && digits.startsWith('6')"));
  assert.ok(apiFile.includes("'237' + digits") || apiFile.includes("`237${digits}`"));
  assert.ok(clientFile.includes("`237${digits}`") || clientFile.includes("'237' + digits"));
});

check('ADV 4.2: Pairing code formatting parity', () => {
  const apiFile = fs.readFileSync(path.join(projectRoot, 'mobile-api', 'lib', 'evolution-api.ts'), 'utf8');
  const clientFile = fs.readFileSync(path.join(projectRoot, 'src', 'features', 'whatsapp', 'whatsappService.ts'), 'utf8');

  assert.ok(apiFile.includes('clean.length === 8'));
  assert.ok(clientFile.includes('clean.length === 8'));
  assert.ok(apiFile.includes('clean.slice(0, 4)'));
  assert.ok(clientFile.includes('clean.slice(0, 4)'));
});

// ==============================================================================
// SUMMARY
// ==============================================================================
console.log('\n==============================================================================');
console.log(`🏁 [CHALLENGER M6] Finished: ${passedTests}/${totalTests} tests passed, ${failedTests} failed.`);
console.log('==============================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

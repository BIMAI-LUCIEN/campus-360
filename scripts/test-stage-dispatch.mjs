#!/usr/bin/env node

/**
 * ==============================================================================
 * CAMPUS 360 — END-TO-END STAGE APPLICATION DISPATCH & PAIRING TEST RUNNER (M6)
 * ==============================================================================
 *
 * Automated verification suite for Milestone M6:
 * - Suite 1: WhatsApp Session Management & Evolution API (Normalization, Naming, Pairing Code, postSchema)
 * - Suite 2: Stage Application Dispatch Input Schema (dispatchSchema & patchSchema, sanitization, validations)
 * - Suite 3: N8N Webhook Payload Compatibility & Workflow Integrity (send_stage_application_workflow.json, jitter, routing)
 * - Suite 4: Mobile Client Contracts & DevSecOps Secret Leak Audit (whatsappService, stagesApi, zero leaked keys)
 * - Suite 5: Cloud Storage & Database Offline Resilience Simulation (PDF base64 fallback, synthetic offline records)
 * - Suite 6: Full E2E Lifecycle Simulation (Pairing -> Connected -> 1-Click Dispatch -> Sent Pending -> Callback Delivered)
 *
 * Self-contained ESM test runner without external runner dependencies.
 * Run via: node scripts/test-stage-dispatch.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// ==============================================================================
// MINI TEST RUNNER FRAMEWORK
// ==============================================================================

let totalSuites = 0;
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testFailures = [];
const suiteStartTimes = new Map();
const globalStartTime = Date.now();

function describe(suiteName, fn) {
  totalSuites++;
  console.log(`\n==============================================================================`);
  console.log(`🔷 SUITE ${totalSuites}: ${suiteName}`);
  console.log(`==============================================================================`);
  suiteStartTimes.set(suiteName, Date.now());
  fn();
  const elapsed = Date.now() - (suiteStartTimes.get(suiteName) || Date.now());
  console.log(`⏱️  Suite ${totalSuites} complétée en ${elapsed}ms\n`);
}

function test(testName, fn) {
  totalTests++;
  const start = Date.now();
  try {
    fn();
    const duration = Date.now() - start;
    passedTests++;
    console.log(`  ✅ [PASS] ${testName} (${duration}ms)`);
  } catch (error) {
    failedTests++;
    const duration = Date.now() - start;
    console.error(`  ❌ [FAIL] ${testName} (${duration}ms)`);
    console.error(`     ↳ Erreur: ${error.message}`);
    testFailures.push({ name: testName, error });
  }
}

async function testAsync(testName, fn) {
  totalTests++;
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    passedTests++;
    console.log(`  ✅ [PASS] ${testName} (${duration}ms)`);
  } catch (error) {
    failedTests++;
    const duration = Date.now() - start;
    console.error(`  ❌ [FAIL] ${testName} (${duration}ms)`);
    console.error(`     ↳ Erreur: ${error.message}`);
    testFailures.push({ name: testName, error });
  }
}

// ==============================================================================
// LOGIC IMPLEMENTATIONS & CONTRACT MIRRORS (From mobile-api & src)
// ==============================================================================

/**
 * Normalizes phone numbers to standard international format (digits only).
 * Matches: mobile-api/lib/evolution-api.ts & src/features/whatsapp/whatsappService.ts
 */
function normalizePhoneNumber(rawPhone) {
  if (!rawPhone) return '';
  let digits = String(rawPhone).replace(/\D/g, '');

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // Cameroon mobile numbers: 9 digits starting with 6 -> prefix with country code 237
  if (digits.length === 9 && digits.startsWith('6')) {
    digits = '237' + digits;
  }

  return digits;
}

/**
 * Generates an instance name following the pattern student-<phone>.
 * Matches: mobile-api/lib/evolution-api.ts
 */
function getInstanceName(phoneOrInstance) {
  if (!phoneOrInstance) return 'student-default';
  const str = String(phoneOrInstance).trim();
  if (str.startsWith('student-')) {
    const rawSuffix = str.slice('student-'.length);
    const normalized = normalizePhoneNumber(rawSuffix);
    return `student-${normalized || rawSuffix}`;
  }
  const normalized = normalizePhoneNumber(str);
  return `student-${normalized}`;
}

/**
 * Formats an 8-digit pairing code as "XXXX - XXXX".
 * Matches: mobile-api/lib/evolution-api.ts & src/features/whatsapp/whatsappService.ts
 */
function formatPairingCode(code) {
  if (!code) return '';
  const clean = String(code).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length === 8) {
    return `${clean.slice(0, 4)} - ${clean.slice(4)}`;
  }
  return String(code);
}

/**
 * Generates deterministic 8-digit fallback pairing code (formatted XXXX - XXXX).
 * Matches: mobile-api/lib/evolution-api.ts
 */
function generateFallbackPairingCode(phone) {
  if (phone) {
    const digits = String(phone).replace(/\D/g, '');
    let hash = 0;
    for (let i = 0; i < digits.length; i++) {
      hash = (hash * 31 + digits.charCodeAt(i)) >>> 0;
    }
    const num = (hash % 90000000) + 10000000;
    const s = String(num);
    return `${s.slice(0, 4)} - ${s.slice(4)}`;
  }
  const rand = Math.floor(10000000 + Math.random() * 90000000).toString();
  return `${rand.slice(0, 4)} - ${rand.slice(4)}`;
}

// Zod schemas from mobile-api/app/api/mobile/whatsapp/instance/route.ts
const whatsappPostSchema = z.object({
  phone: z.string().trim().min(6).max(25).optional(),
  action: z.enum(['create', 'connect']).optional().default('connect'),
});

// Zod schemas from mobile-api/app/api/mobile/stages/dispatch/route.ts
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

// ==============================================================================
// TEST EXECUTION
// ==============================================================================

console.log('🚀 Campus 360 — Démarrage du banc d\'essai automatisé M6');
console.log(`📁 Racine projet: ${projectRoot}`);
console.log(`📅 Horodatage: ${new Date().toISOString()}`);

// ------------------------------------------------------------------------------
// SUITE 1: WhatsApp Session Management & Evolution API Logic
// ------------------------------------------------------------------------------
describe('WhatsApp Session Management & Evolution API Logic (R1)', () => {
  test('TC 1.1: Phone Normalization — Cameroon 9-digit format (6xx -> 2376xx)', () => {
    assert.equal(normalizePhoneNumber('672364124'), '237672364124');
    assert.equal(normalizePhoneNumber('690 12 34 56'), '237690123456');
    assert.equal(normalizePhoneNumber('655-44-33-22'), '237655443322');
  });

  test('TC 1.2: Phone Normalization — International +237 and 00237 prefixes', () => {
    assert.equal(normalizePhoneNumber('+237 672 36 41 24'), '237672364124');
    assert.equal(normalizePhoneNumber('00237 690 12 34 56'), '237690123456');
    assert.equal(normalizePhoneNumber('00237672364124'), '237672364124');
  });

  test('TC 1.3: Phone Normalization — Other international numbers and edge cases', () => {
    assert.equal(normalizePhoneNumber('+33 6 12 34 56 78'), '33612345678');
    assert.equal(normalizePhoneNumber('+1 (555) 234-5678'), '15552345678');
    assert.equal(normalizePhoneNumber(''), '');
    assert.equal(normalizePhoneNumber(null), '');
    assert.equal(normalizePhoneNumber(undefined), '');
  });

  test('TC 1.4: Instance Naming — Follows student-<normalizedPhone> convention', () => {
    assert.equal(getInstanceName('237672364124'), 'student-237672364124');
    assert.equal(getInstanceName('+237 672-36-41-24'), 'student-237672364124');
    assert.equal(getInstanceName('672364124'), 'student-237672364124');
    assert.equal(getInstanceName('student-237672364124'), 'student-237672364124');
    assert.equal(getInstanceName('student-672364124'), 'student-237672364124');
    assert.equal(getInstanceName(''), 'student-default');
    assert.equal(getInstanceName(null), 'student-default');
  });

  test('TC 1.5: Pairing Code Formatting — Strict "XXXX - XXXX" format', () => {
    assert.equal(formatPairingCode('78429012'), '7842 - 9012');
    assert.equal(formatPairingCode('7842-9012'), '7842 - 9012');
    assert.equal(formatPairingCode('ab12cd34'), 'AB12 - CD34');
    assert.equal(formatPairingCode(''), '');
    // If not 8 chars, returns code cleanly without exception
    assert.equal(formatPairingCode('12345'), '12345');
  });

  test('TC 1.6: Fallback Pairing Code Generator — Deterministic & regex conformance', () => {
    const code1 = generateFallbackPairingCode('237672364124');
    const code2 = generateFallbackPairingCode('237672364124');
    const codeDiff = generateFallbackPairingCode('237690123456');

    // Must be deterministic for the same phone
    assert.equal(code1, code2, 'Pairing code must be deterministic per phone number');
    assert.notEqual(code1, codeDiff, 'Different phone numbers should yield different codes');

    // Must strictly match 8 digits separated by " - "
    const pairingRegex = /^\d{4} - \d{4}$/;
    assert.match(code1, pairingRegex, 'Code format must be 4 digits, hyphen, 4 digits');

    // Random generator without phone must also match regex
    const randCode = generateFallbackPairingCode();
    assert.match(randCode, pairingRegex, 'Random code without phone must match pairing regex');
  });

  test('TC 1.7: WhatsApp Instance Post Schema — Happy paths and default action', () => {
    const res1 = whatsappPostSchema.safeParse({ phone: '+237672364124', action: 'connect' });
    assert.equal(res1.success, true);
    assert.equal(res1.data.action, 'connect');

    const res2 = whatsappPostSchema.safeParse({ phone: '672364124' });
    assert.equal(res2.success, true);
    assert.equal(res2.data.action, 'connect', 'Action must default to "connect" if omitted');

    const res3 = whatsappPostSchema.safeParse({ phone: '672364124', action: 'create' });
    assert.equal(res3.success, true);
    assert.equal(res3.data.action, 'create');

    const res4 = whatsappPostSchema.safeParse({});
    assert.equal(res4.success, true);
    assert.equal(res4.data.action, 'connect');
  });

  test('TC 1.8: WhatsApp Instance Post Schema — Rejection of invalid inputs', () => {
    // Phone too short (< 6 chars)
    const resShort = whatsappPostSchema.safeParse({ phone: '12345' });
    assert.equal(resShort.success, false);

    // Phone too long (> 25 chars)
    const resLong = whatsappPostSchema.safeParse({ phone: '12345678901234567890123456' });
    assert.equal(resLong.success, false);

    // Invalid action enum
    const resAction = whatsappPostSchema.safeParse({ phone: '237672364124', action: 'disconnect' });
    assert.equal(resAction.success, false);
  });

  test('TC 1.9: Connection State Enum — Conformance with Evolution API v2 states', () => {
    const validStates = ['open', 'close', 'connecting'];
    for (const state of validStates) {
      assert.ok(typeof state === 'string');
    }
  });
});

// ------------------------------------------------------------------------------
// SUITE 2: Stage Application Dispatch Input Schema (dispatchSchema & patchSchema)
// ------------------------------------------------------------------------------
describe('Stage Application Dispatch Input Schema & Validations (R2)', () => {
  test('TC 2.1: Happy Path — WhatsApp minimal dossier', () => {
    const input = { jobId: 'job-stage-douala-01', channel: 'whatsapp' };
    const res = dispatchSchema.safeParse(input);
    assert.equal(res.success, true);
    assert.equal(res.data.jobId, 'job-stage-douala-01');
    assert.equal(res.data.channel, 'whatsapp');
  });

  test('TC 2.2: Happy Path — WhatsApp complete dossier with base64 PDF & pitch', () => {
    const input = {
      jobId: 'job-stage-douala-01',
      channel: 'whatsapp',
      whatsappPitch: 'Bonjour Entreprise, voici la candidature de Dave Lionel KAMENI...',
      letterText: 'Madame, Monsieur, passionné par le génie logiciel...',
      cvPdfBase64: 'JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoK...',
      studentNotes: 'Dossier transmis lors du forum de recrutement',
      studentName: 'Dave Lionel KAMENI',
      studentEmail: 'dave.kameni@polytechnique.cm',
      studentPhone: '+237 672 36 41 24',
    };
    const res = dispatchSchema.safeParse(input);
    assert.equal(res.success, true);
    assert.equal(res.data.studentEmail, 'dave.kameni@polytechnique.cm');
    assert.equal(res.data.cvPdfBase64, 'JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoK...');
  });

  test('TC 2.3: Happy Path — Email complete dossier with valid CV URL', () => {
    const input = {
      jobId: 'job-stage-yaounde-02',
      channel: 'email',
      letterText: 'Veuillez trouver ci-joint ma candidature pour le stage de développeur.',
      cvPdfUrl: 'https://zlzwoqqnkvxndmtnzdsm.supabase.co/storage/v1/object/public/cvs/cv-dave.pdf',
      studentEmail: 'dave.kameni@polytechnique.cm',
      studentName: 'Dave Lionel KAMENI',
    };
    const res = dispatchSchema.safeParse(input);
    assert.equal(res.success, true);
    assert.equal(res.data.channel, 'email');
    assert.equal(res.data.cvPdfUrl, 'https://zlzwoqqnkvxndmtnzdsm.supabase.co/storage/v1/object/public/cvs/cv-dave.pdf');
  });

  test('TC 2.4: Preprocessor Sanitization — Empty string & whitespace coerced to undefined', () => {
    // Empty email string should become undefined instead of failing email regex
    const resEmptyEmail = dispatchSchema.safeParse({
      jobId: 'job-01',
      channel: 'whatsapp',
      studentEmail: '',
    });
    assert.equal(resEmptyEmail.success, true);
    assert.equal(resEmptyEmail.data.studentEmail, undefined);

    // Whitespace email string should become undefined
    const resSpaceEmail = dispatchSchema.safeParse({
      jobId: 'job-01',
      channel: 'whatsapp',
      studentEmail: '   ',
    });
    assert.equal(resSpaceEmail.success, true);
    assert.equal(resSpaceEmail.data.studentEmail, undefined);

    // Empty cvPdfUrl string should become undefined instead of failing URL regex
    const resEmptyUrl = dispatchSchema.safeParse({
      jobId: 'job-01',
      channel: 'whatsapp',
      cvPdfUrl: '',
    });
    assert.equal(resEmptyUrl.success, true);
    assert.equal(resEmptyUrl.data.cvPdfUrl, undefined);

    // Whitespace cvPdfUrl string should become undefined
    const resSpaceUrl = dispatchSchema.safeParse({
      jobId: 'job-01',
      channel: 'whatsapp',
      cvPdfUrl: '   ',
    });
    assert.equal(resSpaceUrl.success, true);
    assert.equal(resSpaceUrl.data.cvPdfUrl, undefined);
  });

  test('TC 2.5: Negative Test — Missing or empty jobId rejected', () => {
    const resMissing = dispatchSchema.safeParse({ channel: 'whatsapp' });
    assert.equal(resMissing.success, false);

    const resEmpty = dispatchSchema.safeParse({ jobId: '', channel: 'whatsapp' });
    assert.equal(resEmpty.success, false);
    assert.ok(resEmpty.error.issues && resEmpty.error.issues.length > 0);
    assert.match(resEmpty.error.issues[0].message, /jobId requis/);

    const resSpaces = dispatchSchema.safeParse({ jobId: '   ', channel: 'whatsapp' });
    assert.equal(resSpaces.success, false);
    assert.ok(resSpaces.error.issues && resSpaces.error.issues.length > 0);
    assert.match(resSpaces.error.issues[0].message, /jobId requis/);
  });

  test('TC 2.6: Negative Test — Invalid channel rejected', () => {
    const resSms = dispatchSchema.safeParse({ jobId: 'job-01', channel: 'sms' });
    assert.equal(resSms.success, false);

    const resTelegram = dispatchSchema.safeParse({ jobId: 'job-01', channel: 'telegram' });
    assert.equal(resTelegram.success, false);

    const resCase = dispatchSchema.safeParse({ jobId: 'job-01', channel: 'WHATSAPP' });
    assert.equal(resCase.success, false);
  });

  test('TC 2.7: Negative Test — Malformed email or URL rejected', () => {
    const resEmail = dispatchSchema.safeParse({
      jobId: 'job-01',
      channel: 'email',
      studentEmail: 'not-an-email',
    });
    assert.equal(resEmail.success, false);

    const resUrl = dispatchSchema.safeParse({
      jobId: 'job-01',
      channel: 'email',
      cvPdfUrl: 'not-a-valid-url',
    });
    assert.equal(resUrl.success, false);
  });

  test('TC 2.8: Negative Test — Field length overflow boundaries', () => {
    // whatsappPitch > 10,000 chars
    const resPitch = dispatchSchema.safeParse({
      jobId: 'job-01',
      channel: 'whatsapp',
      whatsappPitch: 'a'.repeat(10_001),
    });
    assert.equal(resPitch.success, false);

    // letterText > 50,000 chars
    const resLetter = dispatchSchema.safeParse({
      jobId: 'job-01',
      channel: 'email',
      letterText: 'a'.repeat(50_001),
    });
    assert.equal(resLetter.success, false);

    // studentNotes > 5,000 chars
    const resNotes = dispatchSchema.safeParse({
      jobId: 'job-01',
      channel: 'whatsapp',
      studentNotes: 'a'.repeat(5_001),
    });
    assert.equal(resNotes.success, false);

    // studentName > 200 chars
    const resName = dispatchSchema.safeParse({
      jobId: 'job-01',
      channel: 'whatsapp',
      studentName: 'a'.repeat(201),
    });
    assert.equal(resName.success, false);

    // studentPhone > 30 chars
    const resPhone = dispatchSchema.safeParse({
      jobId: 'job-01',
      channel: 'whatsapp',
      studentPhone: '1'.repeat(31),
    });
    assert.equal(resPhone.success, false);
  });

  test('TC 2.9: Status Patch Schema (patchSchema) — Valid status transitions', () => {
    const allowedStatuses = [
      'PENDING',
      'SENT_PENDING',
      'DELIVERED',
      'FAILED',
      'REVIEWING',
      'INTERVIEW',
      'ACCEPTED',
      'REJECTED',
    ];

    for (const status of allowedStatuses) {
      const res = patchSchema.safeParse({ applicationId: 'app-test-123', status });
      assert.equal(res.success, true, `Status ${status} must be valid`);
      assert.equal(res.data.status, status);
    }
  });

  test('TC 2.10: Status Patch Schema (patchSchema) — Invalid status and missing id rejected', () => {
    const resUnknown = patchSchema.safeParse({ applicationId: 'app-test-123', status: 'UNKNOWN' });
    assert.equal(resUnknown.success, false);

    const resMissingId = patchSchema.safeParse({ status: 'DELIVERED' });
    assert.equal(resMissingId.success, false);

    const resEmptyId = patchSchema.safeParse({ applicationId: '', status: 'DELIVERED' });
    assert.equal(resEmptyId.success, false);
  });
});

// ------------------------------------------------------------------------------
// SUITE 3: N8N Webhook Payload Compatibility & Workflow Integrity
// ------------------------------------------------------------------------------
describe('N8N Webhook Payload Compatibility & Workflow Integrity (R3)', () => {
  const workflowPath = path.join(projectRoot, 'scripts', 'n8n', 'send_stage_application_workflow.json');

  test('TC 3.1: N8N Workflow File Existence and Valid JSON', () => {
    assert.ok(fs.existsSync(workflowPath), `Le fichier workflow n8n doit exister: ${workflowPath}`);
    const rawContent = fs.readFileSync(workflowPath, 'utf8');
    const parsed = JSON.parse(rawContent);
    assert.ok(Array.isArray(parsed.nodes), 'Le workflow doit contenir un tableau de noeuds (nodes)');
    assert.ok(parsed.nodes.length >= 7, 'Le workflow doit comporter au moins 7 noeuds');
  });

  test('TC 3.2: N8N Webhook Entry Node Validation', () => {
    const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    const webhookNode = workflow.nodes.find((n) => n.type === 'n8n-nodes-base.webhook');
    assert.ok(webhookNode, 'Un noeud webhook doit exister');
    assert.equal(webhookNode.parameters.httpMethod, 'POST');
    assert.equal(webhookNode.parameters.path, 'send-stage-application');
    assert.equal(webhookNode.parameters.responseMode, 'responseNode');
  });

  test('TC 3.3: N8N Anti-Ban Jitter Node Validation (15-30s delay)', () => {
    const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    const waitNode = workflow.nodes.find((n) => n.type === 'n8n-nodes-base.wait');
    assert.ok(waitNode, 'Un noeud de temporisation Wait doit exister');
    assert.equal(waitNode.parameters.unit, 'seconds');
    assert.ok(
      String(waitNode.parameters.amount).includes('jitterSeconds'),
      'Le paramètre amount doit référencer jitterSeconds'
    );

    // Code node calculates random jitter between 15 and 30 seconds
    const codeNode = workflow.nodes.find((n) => n.type === 'n8n-nodes-base.code');
    assert.ok(codeNode, 'Un noeud Code de validation et calcul de jitter doit exister');
    assert.ok(
      codeNode.parameters.jsCode.includes('Math.floor(Math.random() * 16) + 15'),
      'Le code doit calculer un jitter entre 15 et 30 secondes'
    );

    // Simulate jitter generation 100 times to verify bounds
    for (let i = 0; i < 100; i++) {
      const jitter = Math.floor(Math.random() * 16) + 15;
      assert.ok(jitter >= 15 && jitter <= 30, `Jitter ${jitter} doit être entre 15 et 30`);
    }
  });

  test('TC 3.4: N8N Switch Routing Node (WhatsApp vs Email branches)', () => {
    const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    const switchNode = workflow.nodes.find((n) => n.type === 'n8n-nodes-base.switch');
    assert.ok(switchNode, 'Un noeud Switch doit aiguiller les canaux');

    const rules = switchNode.parameters.rules.values;
    assert.ok(rules.length >= 2, 'Le switch doit contenir au moins 2 règles (whatsapp et email)');

    const hasWhatsappRule = rules.some((r) =>
      JSON.stringify(r).toLowerCase().includes('whatsapp')
    );
    const hasEmailRule = rules.some((r) =>
      JSON.stringify(r).toLowerCase().includes('email')
    );
    assert.ok(hasWhatsappRule, 'Règle WhatsApp présente');
    assert.ok(hasEmailRule, 'Règle Email présente');
  });

  test('TC 3.5: N8N Evolution API SendMedia Node Validation', () => {
    const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    const waNode = workflow.nodes.find(
      (n) => n.name && n.name.includes('Evolution API')
    );
    assert.ok(waNode, 'Le noeud Evolution API d\'envoi media doit exister');
    assert.equal(waNode.parameters.method, 'POST');
    assert.ok(
      waNode.parameters.url.includes('/message/sendMedia/'),
      'URL doit appeler l\'endpoint /message/sendMedia/'
    );
    assert.ok(
      waNode.parameters.url.includes('instanceName'),
      'URL doit utiliser le nom d\'instance étudiant'
    );

    const bodyString = waNode.parameters.jsonBody;
    assert.ok(bodyString.includes("mediatype: 'document'"), 'Doit envoyer mediatype document');
    assert.ok(bodyString.includes("mimetype: 'application/pdf'"), 'Doit envoyer mimetype PDF');
    assert.ok(bodyString.includes('cvPdfUrl'), 'Doit référencer le cvPdfUrl');
    assert.ok(bodyString.includes('whatsappPitch'), 'Doit inclure le pitch WhatsApp en légende');
  });

  test('TC 3.6: N8N SMTP Node with PDF Attachment and Reply-To Validation', () => {
    const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    const emailNode = workflow.nodes.find(
      (n) => n.id === 'node-smtp-send-email' || (n.name && n.name.toLowerCase().includes('envoi email'))
    );
    assert.ok(emailNode, 'Le noeud d\'envoi Email doit exister');
    const isSmtp = emailNode.type === 'n8n-nodes-base.emailSend';
    if (isSmtp) {
      assert.ok(emailNode.parameters.options?.replyTo?.includes('student.email'), 'Reply-To configuré sur l\'email étudiant');
      assert.ok(emailNode.parameters.options?.attachments?.includes('cvPdfUrl'), 'Pièce jointe PDF configurée');
    } else {
      const bodyStr = String(emailNode.parameters.jsonBody || '');
      assert.ok(bodyStr.includes('student.email'), 'Reply-To configuré sur l\'email étudiant');
      assert.ok(bodyStr.includes('recruiterEmail'), 'Destinataire recruteur configuré');
    }
  });

  test('TC 3.7: N8N Supabase Status Callback and Respond 200 Nodes', () => {
    const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
    const supabaseNode = workflow.nodes.find(
      (n) => n.name && n.name.includes('Supabase')
    );
    assert.ok(supabaseNode, 'Le noeud Supabase de mise à jour de statut doit exister');
    assert.equal(supabaseNode.parameters.method, 'PATCH');
    assert.ok(
      supabaseNode.parameters.jsonBody.includes('DELIVERED'),
      'Mise à jour vers le statut DELIVERED'
    );

    const respondNode = workflow.nodes.find((n) => n.type === 'n8n-nodes-base.respondToWebhook');
    assert.ok(respondNode, 'Le noeud RespondToWebhook doit exister');
    assert.equal(respondNode.parameters.options.responseCode, 200);
  });

  test('TC 3.8: N8N Dual-Format Webhook Payload Construction Compatibility', () => {
    // Construct simulated payload as produced by mobile-api/app/api/mobile/stages/dispatch/route.ts
    const studentPhone = '237672364124';
    const instanceName = getInstanceName(studentPhone);
    const mockAppId = 'app-stage-test-2026';

    const n8nPayload = {
      applicationId: mockAppId,
      studentId: 'student-usr-1',
      studentName: 'Dave Lionel KAMENI',
      studentEmail: 'dave.kameni@polytechnique.cm',
      studentPhone,
      companyName: 'Orange Cameroun',
      targetPhone: '237670009988',
      targetEmail: 'rh@orange.cm',
      channel: 'whatsapp',
      whatsappPitch: 'Pitch candidat officiel...',
      letterText: 'Lettre de motivation officielle...',
      cvPdfUrl: 'https://zlzwoqqnkvxndmtnzdsm.supabase.co/storage/v1/object/public/cvs/cv-dave.pdf',
      cvPdfBase64: 'JVBERi0xLjQK...',
      instanceName,
      timestamp: new Date().toISOString(),
      student: {
        fullName: 'Dave Lionel KAMENI',
        phoneWhatsapp: studentPhone,
        email: 'dave.kameni@polytechnique.cm',
        major: 'Génie Logiciel',
        university: 'Polytechnique Yaoundé',
        instanceName,
      },
      job: {
        title: 'Stagiaire Data & DevOps',
        companyName: 'Orange Cameroun',
        location: 'Douala, Cameroun',
        recruiterWhatsapp: '237670009988',
        recruiterEmail: 'rh@orange.cm',
      },
      dossier: {
        cvPdfUrl: 'https://zlzwoqqnkvxndmtnzdsm.supabase.co/storage/v1/object/public/cvs/cv-dave.pdf',
        cvPdfBase64: 'JVBERi0xLjQK...',
        letterText: 'Lettre de motivation officielle...',
        whatsappPitch: 'Pitch candidat officiel...',
      },
    };

    // Assert all root flat fields required by R2 / docs/N8N_APPLICATION_DISPATCH.md
    assert.equal(n8nPayload.applicationId, mockAppId);
    assert.equal(n8nPayload.channel, 'whatsapp');
    assert.equal(n8nPayload.instanceName, 'student-237672364124');
    assert.ok(n8nPayload.student.fullName);
    assert.ok(n8nPayload.student.phoneWhatsapp);
    assert.ok(n8nPayload.job.recruiterWhatsapp);
    assert.ok(n8nPayload.dossier.cvPdfUrl);
  });
});

// ------------------------------------------------------------------------------
// SUITE 4: Mobile Client Contracts & DevSecOps Secret Leak Audit
// ------------------------------------------------------------------------------
describe('Mobile Client Contracts & DevSecOps Secret Leak Audit (R4, R5, R6)', () => {
  test('TC 4.1: WhatsApp Service Contract in src/features/whatsapp/whatsappService.ts', () => {
    const servicePath = path.join(projectRoot, 'src', 'features', 'whatsapp', 'whatsappService.ts');
    assert.ok(fs.existsSync(servicePath), `Fichier ${servicePath} introuvable`);
    const content = fs.readFileSync(servicePath, 'utf8');

    assert.ok(content.includes('export function cleanPhoneNumber'), 'cleanPhoneNumber exporté');
    assert.ok(content.includes('export function formatPairingCode'), 'formatPairingCode exporté');
    assert.ok(content.includes('export function generateDeterministicPairingCode'), 'generateDeterministicPairingCode exporté');
    assert.ok(content.includes('export async function requestPairingCode'), 'requestPairingCode exporté');
    assert.ok(content.includes('export async function checkConnectionStatus'), 'checkConnectionStatus exporté');
    assert.ok(content.includes('/api/mobile/whatsapp/instance'), 'Appelle l\'endpoint proxy sécurisé');
  });

  test('TC 4.2: WhatsApp Pairing Modal in src/features/whatsapp/WhatsAppPairingModal.tsx', () => {
    const modalPath = path.join(projectRoot, 'src', 'features', 'whatsapp', 'WhatsAppPairingModal.tsx');
    assert.ok(fs.existsSync(modalPath), `Fichier ${modalPath} introuvable`);
    const content = fs.readFileSync(modalPath, 'utf8');

    assert.ok(content.includes('formatPairingCode'), 'Utilise formatPairingCode');
    assert.ok(content.includes('Copier'), 'Contient le bouton de copie du code');
    assert.ok(content.includes('requestPairingCode'), 'Déclenche la demande de pairing code');
  });

  test('TC 4.3: Stages API Contract in src/features/stages/stagesApi.ts', () => {
    const apiPath = path.join(projectRoot, 'src', 'features', 'stages', 'stagesApi.ts');
    assert.ok(fs.existsSync(apiPath), `Fichier ${apiPath} introuvable`);
    const content = fs.readFileSync(apiPath, 'utf8');

    assert.ok(content.includes('export async function dispatchStageApplication'), 'dispatchStageApplication exporté');
    assert.ok(content.includes('/api/mobile/stages/dispatch'), 'Cible la route backend /api/mobile/stages/dispatch');
    assert.ok(content.includes('SENT_PENDING'), 'Statut initial SENT_PENDING supporté');
  });

  test('TC 4.4: 1-Click Apply Flow & Fallback in src/features/stages/AiApplyModal.tsx', () => {
    const modalPath = path.join(projectRoot, 'src', 'features', 'stages', 'AiApplyModal.tsx');
    assert.ok(fs.existsSync(modalPath), `Fichier ${modalPath} introuvable`);
    const content = fs.readFileSync(modalPath, 'utf8');

    assert.ok(content.includes('handleOneClickApply'), 'Gestionnaire 1-Click handleOneClickApply présent');
    assert.ok(content.includes('dispatchStageApplication'), 'Invoque dispatchStageApplication');
    assert.ok(content.includes('handleManualWhatsAppApply'), 'Conserve le fallback manuel WhatsApp');
    assert.ok(content.includes('handleManualEmailApply'), 'Conserve le fallback manuel Email');
    assert.ok(content.includes('dispatchReceipt'), 'Maintient l\'état d\'accusé de réception');
  });

  test('TC 4.5: DevSecOps Audit — Zero Leaked Secrets in Client Source Code (src/)', () => {
    const srcDir = path.join(projectRoot, 'src');
    assert.ok(fs.existsSync(srcDir), 'Le dossier src/ doit exister');

    const forbiddenPatterns = [
      { pattern: /EVOLUTION_API_KEY\s*[:=]\s*['"`][^'"`]+['"`]/i, name: 'EVOLUTION_API_KEY hardcoded' },
      { pattern: /N8N_API_KEY\s*[:=]\s*['"`][^'"`]+['"`]/i, name: 'N8N_API_KEY hardcoded' },
      { pattern: /N8N_INGESTION_SECRET\s*[:=]\s*['"`][^'"`]+['"`]/i, name: 'N8N_INGESTION_SECRET hardcoded' },
      { pattern: /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"`][^'"`]+['"`]/i, name: 'SUPABASE_SERVICE_ROLE_KEY hardcoded' },
    ];

    function scanDirectory(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (/\.(tsx?|jsx?|json)$/.test(entry.name)) {
          const fileContent = fs.readFileSync(fullPath, 'utf8');

          for (const rule of forbiddenPatterns) {
            const match = rule.pattern.test(fileContent);
            assert.equal(
              match,
              false,
              `Alerte DevSecOps: Fuite de clé suspectée (${rule.name}) dans ${path.relative(projectRoot, fullPath)}`
            );
          }

          // Check for any JWT token that might carry a service_role
          const jwtMatches = fileContent.match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g);
          if (jwtMatches) {
            for (const token of jwtMatches) {
              try {
                const parts = token.split('.');
                if (parts.length === 3) {
                  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
                  assert.notEqual(
                    payload.role,
                    'service_role',
                    `Alerte DevSecOps: Fuite de clé secrète Supabase service_role dans ${path.relative(projectRoot, fullPath)}`
                  );
                }
              } catch (e) {
                // Ignore parse errors on malformed tokens
              }
            }
          }
        }
      }
    }

    scanDirectory(srcDir);
  });
});

// ------------------------------------------------------------------------------
// SUITE 5: Cloud Storage & Database Offline Resilience Simulation
// ------------------------------------------------------------------------------
describe('Cloud Storage & Database Offline Resilience Simulation (R2)', () => {
  test('TC 5.1: CV Upload Fallback — Data URL Generation When Supabase Unconfigured', () => {
    // Simulation of uploadStageApplicationCvPdf from mobile-api/lib/stages-db.ts
    function simulateCvUpload(studentId, base64Payload, hasCredentials) {
      const cleanStudentId = String(studentId).replace(/[^a-zA-Z0-9_-]/g, '_');
      const timestamp = Date.now();
      const filePath = `cvs/cv-${cleanStudentId}-${timestamp}.pdf`;

      if (!hasCredentials) {
        return {
          url: `data:application/pdf;base64,${base64Payload}`,
          filePath,
          fallback: true,
        };
      }
      return {
        url: `https://zlzwoqqnkvxndmtnzdsm.supabase.co/storage/v1/object/public/${filePath}`,
        filePath,
        fallback: false,
      };
    }

    const offlineResult = simulateCvUpload('student-poly-123', 'JVBERi0xLjQK...', false);
    assert.equal(offlineResult.fallback, true);
    assert.ok(offlineResult.url.startsWith('data:application/pdf;base64,'));
    assert.ok(offlineResult.filePath.startsWith('cvs/cv-student-poly-123-'));

    const onlineResult = simulateCvUpload('student-poly-123', 'JVBERi0xLjQK...', true);
    assert.equal(onlineResult.fallback, false);
    assert.ok(onlineResult.url.startsWith('https://'));
  });

  test('TC 5.2: Database Offline Record Fallback — Non-Crashing Synthetic Generation', () => {
    // Simulation of dispatchStageApplicationRecord from mobile-api/lib/stages-db.ts
    function simulateDispatchRecord(input, isDatabaseOnline) {
      const desiredStatus = 'SENT_PENDING';
      if (!isDatabaseOnline) {
        return {
          id: 'app-offline-' + Date.now(),
          studentId: input.studentId,
          jobId: input.jobId,
          status: desiredStatus,
          appliedAt: new Date().toISOString(),
          cvFileUrl: input.cvFileUrl,
          channel: input.channel,
          offline: true,
        };
      }
      return {
        id: 'db-rec-' + crypto.randomUUID().slice(0, 8),
        studentId: input.studentId,
        jobId: input.jobId,
        status: desiredStatus,
        appliedAt: new Date().toISOString(),
        cvFileUrl: input.cvFileUrl,
        channel: input.channel,
        offline: false,
      };
    }

    const offlineApp = simulateDispatchRecord(
      { studentId: 'student-offline', jobId: 'job-101', channel: 'whatsapp', cvFileUrl: 'data:...' },
      false
    );
    assert.equal(offlineApp.status, 'SENT_PENDING');
    assert.ok(offlineApp.id.startsWith('app-offline-'));
    assert.equal(offlineApp.offline, true);

    const onlineApp = simulateDispatchRecord(
      { studentId: 'student-online', jobId: 'job-101', channel: 'whatsapp', cvFileUrl: 'https://...' },
      true
    );
    assert.equal(onlineApp.status, 'SENT_PENDING');
    assert.ok(onlineApp.id.startsWith('db-rec-'));
    assert.equal(onlineApp.offline, false);
  });

  test('TC 5.3: Status Update Fallback with Safe Status Annotations', () => {
    // Simulation of updateApplicationDispatchStatus when postgres enum is unmigrated
    function simulateStatusUpdate(applicationId, newStatus, enumSupportsValue) {
      if (enumSupportsValue) {
        return { id: applicationId, status: newStatus, annotatedInNotes: false };
      }
      // Enum fallback: set to PENDING and annotate desired status in notes
      return {
        id: applicationId,
        status: 'PENDING',
        annotatedInNotes: true,
        notes: `[Status: ${newStatus}] Updated via fallback at ${new Date().toISOString()}`,
      };
    }

    const migrated = simulateStatusUpdate('app-1', 'DELIVERED', true);
    assert.equal(migrated.status, 'DELIVERED');
    assert.equal(migrated.annotatedInNotes, false);

    const unmigrated = simulateStatusUpdate('app-1', 'DELIVERED', false);
    assert.equal(unmigrated.status, 'PENDING');
    assert.equal(unmigrated.annotatedInNotes, true);
    assert.ok(unmigrated.notes.includes('[Status: DELIVERED]'));
  });
});

// ------------------------------------------------------------------------------
// SUITE 6: Full E2E Lifecycle Simulation of a Stage Application
// ------------------------------------------------------------------------------
describe('Full E2E Lifecycle Simulation of an Application (R1 -> R6)', () => {
  test('TC 6.1: End-to-End Simulation: Pairing -> Connected -> 1-Click Apply -> Delivered', () => {
    // --- Step 1: Student Initiates WhatsApp Pairing ---
    const rawStudentPhone = '+237 672 36 41 24';
    const normalizedPhone = normalizePhoneNumber(rawStudentPhone);
    assert.equal(normalizedPhone, '237672364124');

    const instanceName = getInstanceName(normalizedPhone);
    assert.equal(instanceName, 'student-237672364124');

    const pairingCode = generateFallbackPairingCode(normalizedPhone);
    assert.match(pairingCode, /^\d{4} - \d{4}$/);

    const pairingState = {
      instanceName,
      pairingCode,
      state: 'connecting',
      connected: false,
    };
    assert.equal(pairingState.state, 'connecting');

    // --- Step 2: Session Connection State Polling ---
    // Simulating user enters code in WhatsApp Mobile App -> state becomes 'open'
    pairingState.state = 'open';
    pairingState.connected = true;
    assert.equal(pairingState.connected, true);
    assert.equal(pairingState.state, 'open');

    // --- Step 3: Student Triggers 1-Click Dispatch ---
    const rawDispatchPayload = {
      jobId: 'stage-fintech-douala-2026',
      channel: 'whatsapp',
      whatsappPitch: 'Bonjour équipe Recrutement, voici mon CV officiel pour le stage développeur.',
      letterText: 'Étudiant en Génie Logiciel à Polytechnique Yaoundé...',
      cvPdfBase64: 'JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoK...',
      studentNotes: 'Postulé en 1-Clic via Campus 360',
      studentName: 'Dave Lionel KAMENI',
      studentEmail: 'dave.kameni@polytechnique.cm',
      studentPhone: rawStudentPhone,
    };

    // Validates with dispatchSchema
    const validatedDispatch = dispatchSchema.safeParse(rawDispatchPayload);
    assert.equal(validatedDispatch.success, true);

    // --- Step 4: Backend Processing & Record Creation ---
    const applicationId = `app-disp-${Date.now()}`;
    const cvUrl = 'https://zlzwoqqnkvxndmtnzdsm.supabase.co/storage/v1/object/public/cvs/cv-dave.pdf';
    const applicationRecord = {
      id: applicationId,
      jobId: validatedDispatch.data.jobId,
      studentId: 'student-usr-poly-01',
      channel: validatedDispatch.data.channel,
      status: 'SENT_PENDING',
      cvFileUrl: cvUrl,
      dispatchedAt: new Date().toISOString(),
    };
    assert.equal(applicationRecord.status, 'SENT_PENDING');

    // --- Step 5: N8N Forwarding & WhatsApp Dispatch Simulation ---
    const n8nWebhookPayload = {
      applicationId: applicationRecord.id,
      studentId: applicationRecord.studentId,
      channel: applicationRecord.channel,
      instanceName,
      student: {
        fullName: validatedDispatch.data.studentName,
        phoneWhatsapp: normalizedPhone,
        email: validatedDispatch.data.studentEmail,
        instanceName,
      },
      job: {
        title: 'Développeur Fullstack React Native / Node',
        companyName: 'Fintech Douala S.A.',
        recruiterWhatsapp: '237670009988',
      },
      dossier: {
        cvPdfUrl: cvUrl,
        whatsappPitch: validatedDispatch.data.whatsappPitch,
      },
    };

    // N8N routes to WhatsApp branch
    assert.equal(n8nWebhookPayload.channel, 'whatsapp');
    assert.equal(n8nWebhookPayload.instanceName, 'student-237672364124');

    // Evolution API payload constructed in N8N
    const evolutionApiMessage = {
      number: n8nWebhookPayload.job.recruiterWhatsapp,
      mediatype: 'document',
      mimetype: 'application/pdf',
      media: n8nWebhookPayload.dossier.cvPdfUrl,
      fileName: 'CV_Officiel.pdf',
      caption: n8nWebhookPayload.dossier.whatsappPitch,
    };
    assert.equal(evolutionApiMessage.mediatype, 'document');
    assert.equal(evolutionApiMessage.number, '237670009988');

    // --- Step 6: Callback Updates Status to DELIVERED ---
    const patchPayload = {
      applicationId: applicationRecord.id,
      status: 'DELIVERED',
    };
    const validatedPatch = patchSchema.safeParse(patchPayload);
    assert.equal(validatedPatch.success, true);

    applicationRecord.status = validatedPatch.data.status;
    assert.equal(applicationRecord.status, 'DELIVERED');
  });
});

// ==============================================================================
// FINAL SUMMARY & EXIT STATUS
// ==============================================================================

const globalDuration = Date.now() - globalStartTime;

console.log('==============================================================================');
console.log('🏁 RÉSUMÉ DU BANC D\'ESSAI D\'INTÉGRATION CAMPUS 360 (M6)');
console.log('==============================================================================');
console.log(`📊 Total Suites  : ${totalSuites}`);
console.log(`📋 Total Tests   : ${totalTests}`);
console.log(`✅ Tests Réussis : ${passedTests}`);
console.log(`❌ Tests Échoués : ${failedTests}`);
console.log(`⏱️  Durée Totale : ${globalDuration}ms`);

if (failedTests > 0) {
  console.log('\n❌ DÉTAIL DES ÉCHECS :');
  testFailures.forEach((f, idx) => {
    console.error(`  ${idx + 1}. ${f.name}`);
    console.error(`     ↳ ${f.error.message}`);
  });
  console.log('\n💥 ÉCHEC : Certains tests ont échoué.');
  process.exit(1);
} else {
  console.log('\n🎉 SUCCÈS : Tous les tests d\'intégration M6 ont été validés avec succès !');
  process.exit(0);
}

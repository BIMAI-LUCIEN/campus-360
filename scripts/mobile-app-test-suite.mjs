import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

// ── 1. CONFIGURATION & APP MANIFEST TESTS ──
describe('1. Mobile App Configuration & EAS Manifest', () => {
  test('app.json contains valid Expo configuration', () => {
    const appJsonRaw = fs.readFileSync(path.resolve('./app.json'), 'utf8');
    const appJson = JSON.parse(appJsonRaw);
    const expo = appJson.expo;

    assert.ok(expo, 'app.json should contain expo property');
    assert.equal(expo.name, 'Campus 360');
    assert.equal(expo.slug, 'campus-360');
    assert.ok(expo.version, '1.1.0');
    assert.ok(expo.extra?.eas?.projectId, 'EAS project ID must be defined');
    assert.equal(expo.extra.eas.projectId, '49ce85c3-c644-4a6c-a492-2596e5047c74');
  });

  test('eas.json defines production and preview channels', () => {
    const easJsonRaw = fs.readFileSync(path.resolve('./eas.json'), 'utf8');
    const easJson = JSON.parse(easJsonRaw);

    assert.ok(easJson.build?.production, 'Production build profile should exist');
    assert.ok(easJson.build?.preview, 'Preview build profile should exist');
    assert.equal(
      easJson.build.production.env.EXPO_PUBLIC_AI_PROXY_URL,
      'https://api.campus360b.site/api/ai/pdf-chat'
    );
  });
});

// ── 2. ACADEMIC STAGE REPORT TEMPLATE TESTS ──
describe('2. Academic Stage Report Template & Structure', async () => {
  const templatePath = path.resolve('./admin-app/lib/academic-stage-template.ts');
  const templateCode = fs.readFileSync(templatePath, 'utf8');

  test('Template contains all mandatory academic diagrams and figures', () => {
    assert.ok(templateCode.includes('SVG_DIAGRAMS'), 'Must export SVG_DIAGRAMS');
    assert.ok(templateCode.includes('architecture:'), 'Must include 3-Tier Architecture SVG');
    assert.ok(templateCode.includes('useCase:'), 'Must include UML Use Case Diagram SVG');
    assert.ok(templateCode.includes('databaseSchema:'), 'Must include MCD/MLD Database Schema SVG');
  });

  test('Template generates valid comparison tables', () => {
    assert.ok(templateCode.includes('ACADEMIC_TABLE_SAMPLE'), 'Must include Academic Table template');
    assert.ok(templateCode.includes('<table style='), 'Table markup must have inline styles for print');
  });
});

// ── 3. PRODUCTION AI PROXY & BACKEND SYNC ──
describe('3. Production Mobile Backend & AI Services', () => {
  test('Health endpoint returns 200 OK', async () => {
    const res = await fetch('https://api.campus360b.site/api/health');
    assert.equal(res.status, 200, 'Production health check must be 200');
    const data = await res.json();
    assert.equal(data.status, 'ok');
  });

  test('AI Proxy endpoint responds to chat queries', async () => {
    const res = await fetch('https://api.campus360b.site/api/ai/pdf-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Qu est-ce que le principe SOLID en génie logiciel ?',
        messages: [],
      }),
    });

    assert.equal(res.status, 200, 'AI Proxy endpoint must return 200 OK');
    const data = await res.json();
    assert.ok(data.answer, 'AI response must contain answer string');
    assert.ok(data.answer.length > 20, 'AI response must not be empty');
  });

  test('AI Diagram generator endpoint produces SVG markup', async () => {
    const res = await fetch('https://api.campus360b.site/api/mobile/documents/ai/diagram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'architecture',
        prompt: 'Architecture 3 tiers',
      }),
    });

    assert.equal(res.status, 200, 'AI Diagram endpoint must return 200 OK');
    const data = await res.json();
    assert.ok(data.html, 'Must return html');
    assert.ok(data.html.includes('<svg'), 'Snippet must contain SVG tag');
  });
});

// ── 4. DOCUMENT DATABASE & USER RESOLUTION ──
describe('4. Document Database & Guest Resilience', () => {
  test('documents-db exports required helper functions and templates', () => {
    const dbLibPath = path.resolve('./admin-app/lib/documents-db.ts');
    const dbLibCode = fs.readFileSync(dbLibPath, 'utf8');

    assert.ok(dbLibCode.includes('resolveDbUserId'), 'Must export resolveDbUserId');
    assert.ok(dbLibCode.includes('getDocumentById'), 'Must export getDocumentById');
    assert.ok(dbLibCode.includes('createDocument'), 'Must export createDocument');
    assert.ok(dbLibCode.includes('updateDocumentSection'), 'Must export updateDocumentSection');
    assert.ok(dbLibCode.includes('TEMPLATE_SECTIONS'), 'Must export TEMPLATE_SECTIONS');
  });
});

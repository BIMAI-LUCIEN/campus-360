import assert from 'node:assert/strict';

console.log('--- Testing Stage Dispatch and PDF Storage ---');

// 1. Test functions and types exported by stages-db
const stagesDb = await import('../../../mobile-api/lib/stages-db.ts');

assert.ok(typeof stagesDb.uploadStageApplicationCvPdf === 'function', 'uploadStageApplicationCvPdf should be a function');
assert.ok(typeof stagesDb.dispatchStageApplicationRecord === 'function', 'dispatchStageApplicationRecord should be a function');
assert.ok(typeof stagesDb.updateApplicationDispatchStatus === 'function', 'updateApplicationDispatchStatus should be a function');
console.log('✓ stages-db exports verified');

// 2. Test uploadStageApplicationCvPdf fallback behavior with base64
const testBase64 = Buffer.from('%PDF-1.4 test document content').toString('base64');
const uploadResult = await stagesDb.uploadStageApplicationCvPdf('student-test-123', testBase64);

assert.ok(uploadResult.url, 'uploadResult should return a url');
assert.ok(uploadResult.filePath, 'uploadResult should return a filePath');
assert.ok(uploadResult.filePath.startsWith('cv-student-test-123-'), 'filePath should follow naming convention');
console.log('✓ uploadStageApplicationCvPdf tested successfully:', {
  filePath: uploadResult.filePath,
  urlPreview: uploadResult.url.slice(0, 50) + '...',
  fallback: uploadResult.fallback,
});

// 3. Test dispatchStageApplicationRecord fallback behavior
const recordResult = await stagesDb.dispatchStageApplicationRecord({
  studentId: 'student-unit-test',
  jobId: 'job-1',
  channel: 'whatsapp',
  whatsappPitch: 'Bonjour, ceci est un pitch de test.',
  cvFileUrl: uploadResult.url,
  status: 'SENT_PENDING',
});

assert.ok(recordResult.id, 'recordResult should return an id');
assert.equal(recordResult.status, 'SENT_PENDING', 'status should be SENT_PENDING');
assert.ok(recordResult.appliedAt, 'appliedAt should be set');
console.log('✓ dispatchStageApplicationRecord tested successfully:', {
  id: recordResult.id,
  status: recordResult.status,
  appliedAt: recordResult.appliedAt,
});

// 4. Test updateApplicationDispatchStatus
const updateResult = await stagesDb.updateApplicationDispatchStatus(recordResult.id, 'DELIVERED');
assert.ok(updateResult, 'updateResult should not be null');
assert.equal(updateResult.status, 'DELIVERED', 'status should be updated to DELIVERED');
console.log('✓ updateApplicationDispatchStatus tested successfully:', updateResult);

// 5. Test dispatch route handler POST & OPTIONS
const dispatchRoute = await import('../../../mobile-api/app/api/mobile/stages/dispatch/route.ts');
assert.ok(typeof dispatchRoute.POST === 'function', 'POST handler should be defined');
assert.ok(typeof dispatchRoute.OPTIONS === 'function', 'OPTIONS handler should be defined');

// Test OPTIONS (CORS preflight)
const dummyOptionsReq = new Request('http://localhost:3002/api/mobile/stages/dispatch', {
  method: 'OPTIONS',
  headers: { origin: 'http://localhost:8081' },
});
const optionsRes = dispatchRoute.OPTIONS(dummyOptionsReq);
assert.equal(optionsRes.status, 204, 'OPTIONS should return 204');
assert.equal(optionsRes.headers.get('Access-Control-Allow-Origin'), 'http://localhost:8081', 'CORS origin should match');
console.log('✓ OPTIONS CORS preflight verified');

// Test POST handler with valid payload
const postPayload = {
  jobId: 'job-1',
  channel: 'whatsapp',
  whatsappPitch: 'Bonjour, candidature via Campus 360.',
  letterText: 'Madame, Monsieur...',
  cvPdfBase64: testBase64,
  studentNotes: 'Notes du candidat',
  studentName: 'Dave Lionel Kameni',
  studentEmail: 'dave.kameni@polytechnique.cm',
  studentPhone: '672364124',
};

const postReq = new Request('http://localhost:3002/api/mobile/stages/dispatch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    origin: 'http://localhost:8081',
  },
  body: JSON.stringify(postPayload),
});

const postRes = await dispatchRoute.POST(postReq);
const postJson = await postRes.json();

assert.equal(postRes.status, 200, 'POST should return 200');
assert.equal(postJson.success, true, 'response success should be true');
assert.equal(postJson.status, 'SENT_PENDING', 'response status should be SENT_PENDING');
assert.ok(postJson.applicationId, 'response should include applicationId');
assert.ok(postJson.message, 'response should include message');
console.log('✓ POST dispatch handler verified successfully:', postJson);

// Test POST handler with invalid payload (missing channel)
const invalidReq = new Request('http://localhost:3002/api/mobile/stages/dispatch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jobId: 'job-1' }),
});
const invalidRes = await dispatchRoute.POST(invalidReq);
assert.equal(invalidRes.status, 400, 'Invalid request should return 400');
console.log('✓ Invalid payload rejected with 400 as expected');

// Test PATCH handler (status callback)
assert.ok(typeof dispatchRoute.PATCH === 'function', 'PATCH handler should be defined');
const patchReq = new Request('http://localhost:3002/api/mobile/stages/dispatch', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    applicationId: postJson.applicationId,
    status: 'DELIVERED',
  }),
});
const patchRes = await dispatchRoute.PATCH(patchReq);
const patchJson = await patchRes.json();
assert.equal(patchRes.status, 200, 'PATCH should return 200');
assert.equal(patchJson.success, true, 'PATCH success should be true');
assert.equal(patchJson.application.status, 'DELIVERED', 'PATCH status should be DELIVERED');
console.log('✓ PATCH status update handler verified successfully:', patchJson);

console.log('\n--- ALL VERIFICATION CHECKS PASSED ---');

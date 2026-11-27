import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const loadPushLib = (queryImpl = async () => ({ rows: [], rowCount: 0 })) => {
  const source = fs.readFileSync('lib/push.ts', 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  const deps = {
    './database': { databasePool: { query: queryImpl } },
  };
  runInNewContext(outputText, { exports, require: (name) => deps[name], console, fetch, Response });
  return exports;
};

const push = loadPushLib();

test('push : payload inclut priority=high et channelId=default', () => {
  const messages = push.buildExpoPushMessages(['ExponentPushToken[abc12345]'], {
    title: 'Nouveau stage',
    body: 'Douala · Développeur',
    data: { type: 'job_match' },
  });
  assert.equal(messages.length, 1);
  assert.equal(messages[0].priority, 'high');
  assert.equal(messages[0].channelId, 'default');
  assert.equal(messages[0].sound, 'default');
});

test('push : sendToTokens purge automatiquement les tokens DeviceNotRegistered', async () => {
  const purged = [];
  let sentBody = null;
  const report = await push.sendToTokens(
    ['ExponentPushToken[valid-1]', 'ExponentPushToken[dead-2]', 'invalid-token'],
    { title: 'Test', body: 'Hello' },
    {
      fetchImpl: async (_url, init) => {
        sentBody = JSON.parse(init.body);
        return new Response(
          JSON.stringify({
            data: [
              { status: 'ok', id: 'ticket-1' },
              { status: 'error', message: 'Not registered', details: { error: 'DeviceNotRegistered' } },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      },
      removeInvalidTokens: async (tokens) => {
        purged.push(...tokens);
        return tokens.length;
      },
    },
  );
  assert.equal(sentBody.length, 2);
  assert.equal(sentBody[0].priority, 'high');
  assert.equal(report.tokenCount, 2);
  assert.equal(report.delivered, 1);
  assert.equal(report.removedInvalid, 1);
  assert.deepEqual(purged, ['ExponentPushToken[dead-2]']);
  assert.deepEqual([...report.errors], ['DeviceNotRegistered']);
});

test('route POST /api/mobile/notifications/test : 401 sans session, 422 si 0 token, 200 sinon', async () => {
  const source = fs.readFileSync('app/api/mobile/notifications/test/route.ts', 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });

  const makeRoute = ({ authed = true, report = { tokenCount: 1, delivered: 1, removedInvalid: 0, errors: [] } } = {}) => {
    const deps = {
      'next/server': { NextResponse: Response },
      '@/lib/mobile-access': {
        corsPreflight: () => new Response(null, { status: 204 }),
        withCors: (r) => r,
        mobileErrorResponse: (e) => Response.json({ error: e.message }, { status: 500 }),
        requireMobileUser: async () => (authed ? { user: { id: 'u1' } } : { response: new Response(null, { status: 401 }) }),
      },
      '@/lib/push': { sendTestPushToUser: async () => report },
      '@/lib/route-rate-limit': {
        enforceRateLimit: async () => {},
        rateLimitFailedResponse: () => null,
      },
    };
    const exports = {};
    runInNewContext(outputText, { exports, require: (name) => deps[name] });
    return exports.POST;
  };

  const unauthRes = await makeRoute({ authed: false })(new Request('http://localhost/api/mobile/notifications/test', { method: 'POST' }));
  assert.equal(unauthRes.status, 401);

  const emptyRes = await makeRoute({ report: { tokenCount: 0, delivered: 0, removedInvalid: 0, errors: [] } })(
    new Request('http://localhost/api/mobile/notifications/test', { method: 'POST' }),
  );
  assert.equal(emptyRes.status, 422);

  const okRes = await makeRoute()(new Request('http://localhost/api/mobile/notifications/test', { method: 'POST' }));
  assert.equal(okRes.status, 200);
  const body = await okRes.json();
  assert.equal(body.ok, true);
  assert.equal(body.delivered, 1);
});

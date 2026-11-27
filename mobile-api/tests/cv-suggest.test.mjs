import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';

import { loadTsWithPackages } from './helpers/load-ts.mjs';

const s = await loadTsWithPackages('lib/cv-suggest.ts', ['lib/cv-fill.ts']);

test('puces : chiffres et doublons retirés, 6 au plus', () => {
  const raw = 'Voici :\n["Saisie des factures fournisseurs", "Traitement de 200 factures par mois", "- Suivi de la caisse", "saisie des factures fournisseurs", "Préparation des déclarations", "Classement des pièces", "Rapprochements bancaires", "Relance des clients", "Inventaire du stock"]';
  const items = s.parseSuggestions(raw);
  assert.ok(!items.some((i) => /\d/.test(i)));
  assert.equal(items.filter((i) => /saisie des factures/i.test(i)).length, 1);
  assert.ok(items.includes('Suivi de la caisse'));
  assert.equal(items.length, 6);
  assert.deepEqual(s.parseSuggestions('pas de json'), []);
});

test('second appel au même intitulé : servi par le cache, sans appel IA ni quota', async () => {
  s.clearSuggestCache();
  let calls = 0;
  let quota = 0;
  const deps = {
    beforeAiCall: async () => { quota += 1; },
    callModel: async () => { calls += 1; return '["Saisie des factures","Suivi de la caisse","Classement des pièces"]'; },
  };
  const first = await s.suggestMissions('Assistant comptable', deps);
  const second = await s.suggestMissions('  assistant   COMPTABLE ', deps);
  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.deepEqual(second.items, first.items);
  assert.equal(calls, 1);
  assert.equal(quota, 1);
});

test('réponse vide : rien en cache, l’appel suivant retente', async () => {
  s.clearSuggestCache();
  let calls = 0;
  const deps = { beforeAiCall: async () => {}, callModel: async () => { calls += 1; return null; } };
  await s.suggestMissions('Vendeur', deps);
  await s.suggestMissions('Vendeur', deps);
  assert.equal(calls, 2);
});

test('garde de source : session, intitulé vide refusé en 400, quota seulement sur appel IA', () => {
  const route = fs.readFileSync('app/api/mobile/documents/cv-suggest/route.ts', 'utf8');
  assert.ok(route.indexOf('requireMobileUser(request)') < route.indexOf('requestSchema.safeParse'));
  assert.match(route, /min\(2\)/);
  assert.match(route, /MobileApiError\('Indique l’intitulé du poste\.', 400\)/);
  assert.match(route, /beforeAiCall: async \(\) => \{[\s\S]*enforceAiQuota\(request, \{ userId, route: 'cv-suggest' \}\)/);
  assert.ok(!/aiCost|ia_credits/.test(route), 'gratuit : aucun débit');
});

test('mots-clés : puces ancrées, marqueur conservé, quota et aucun cache partagé', async () => {
  s.clearSuggestCache();
  let quota = 0;
  let calls = 0;
  const keywords = 'Saisie de 12 factures fournisseurs, suivi de caisse';
  const deps = {
    beforeAiCall: async () => { quota += 1; },
    callModel: async (messages) => {
      calls += 1;
      assert.deepEqual(JSON.parse(messages.at(-1).content), { poste: 'Assistant', notes: keywords });
      return JSON.stringify([
        'Saisir 12 factures fournisseurs',
        'Traiter 500 factures par mois',
        'Assurer le suivi de caisse [À COMPLÉTER : fréquence]',
      ]);
    },
  };
  const expected = {
    items: ['Saisir 12 factures fournisseurs', 'Assurer le suivi de caisse [À COMPLÉTER : fréquence]'],
    cached: false,
  };
  const generic = await s.suggestMissions('Assistant', {
    beforeAiCall: async () => {},
    callModel: async () => '["Suivi administratif"]',
  });
  assert.equal(generic.cached, false);
  assert.deepEqual(await s.suggestMissions('Assistant', deps, keywords), expected);
  assert.deepEqual(await s.suggestMissions('Assistant', deps, keywords), expected);
  assert.equal(quota, 2);
  assert.equal(calls, 2);
  assert.deepEqual(await s.suggestMissions('Assistant', deps), { ...generic, cached: true });
});

test('route : 401 sans session et 400 au-delà de 500 caractères', async () => {
  const source = fs.readFileSync('app/api/mobile/documents/cv-suggest/route.ts', 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const exports = {};
  let user;
  const deps = {
    zod: { z },
    'next/server': {},
    '@/lib/ai-quota': {},
    '@/lib/cv-suggest': s,
    '@/lib/llm': {},
    '@/lib/route-rate-limit': {},
    '@/lib/mobile-access': {
      requireMobileUser: async () => user ? { user } : { response: new Response(null, { status: 401 }) },
      withCors: (response) => response,
      MobileApiError: class extends Error {
        constructor(message, status) {
          super(message);
          this.status = status;
        }
      },
      mobileErrorResponse: (error) => Response.json({ message: error.message }, { status: error.status ?? 500 }),
    },
  };
  runInNewContext(outputText, { exports, require: (name) => deps[name] });
  const request = () => new Request('http://localhost/api/mobile/documents/cv-suggest', {
    method: 'POST',
    body: JSON.stringify({ poste: 'Assistant', keywords: 'x'.repeat(501) }),
  });
  assert.equal((await exports.POST(request())).status, 401);
  user = { id: 'student-test' };
  assert.equal((await exports.POST(request())).status, 400);
});

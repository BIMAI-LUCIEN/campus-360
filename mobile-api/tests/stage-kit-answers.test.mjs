import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs, loadTsWithPackages } from './helpers/load-ts.mjs';

const kitAnswers = await loadTsWithPackages('lib/stage-kit-answers.ts', ['lib/cv-fill.ts']);
const { hasPaidApplicationOn } = await loadTs('lib/stage-charge-core.ts');
const {
  reserveKitQuestionSlotOn,
  releaseKitQuestionSlotOn,
  getStageKitOn,
  upsertStageKitLetterOn,
} = await loadTs('lib/stage-kits-core.ts');

const read = (rel) => fs.readFileSync(path.resolve(rel), 'utf8');

test('schéma de requête : jobId requis, question optionnelle de 1 à 500 caractères, strict', () => {
  assert.equal(kitAnswers.kitAnswersRequestSchema.safeParse({ jobId: 'job-1' }).success, true);
  assert.equal(
    kitAnswers.kitAnswersRequestSchema.safeParse({ jobId: 'job-1', question: 'Pourquoi ce poste ?' }).success,
    true,
  );
  // 501 caractères -> 400 (rejeté par le schéma)
  assert.equal(
    kitAnswers.kitAnswersRequestSchema.safeParse({ jobId: 'job-1', question: 'a'.repeat(501) }).success,
    false,
  );
  // Question vide -> rejetée
  assert.equal(
    kitAnswers.kitAnswersRequestSchema.safeParse({ jobId: 'job-1', question: '   ' }).success,
    false,
  );
  // Champ inconnu -> rejeté (.strict())
  assert.equal(
    kitAnswers.kitAnswersRequestSchema.safeParse({ jobId: 'job-1', extra: true }).success,
    false,
  );
});

test('grounding des chiffres : un chiffre inventé est retiré des 4 réponses fixes et d’une réponse à question collée', () => {
  const student = {
    fullName: 'Kouamé Jean',
    university: 'IUT de Douala',
    major: 'Génie Logiciel',
    educationLevel: 'Licence 3',
    skills: ['TypeScript', 'PostgreSQL'],
    notes: 'Stage de 2 mois chez Camtel en 2025.',
  };

  const rawReady = JSON.stringify({
    presentation: 'Je suis en Licence 3 Génie Logiciel à l’IUT de Douala. J’ai déjà géré 150 serveurs en production.',
    whyThisRole: 'Votre offre correspond à mes compétences en TypeScript et PostgreSQL acquises en 2025.',
    availability: 'Disponible immédiatement pour un stage de 2 mois.',
    keySkills: 'Je maîtrise TypeScript et PostgreSQL avec 10 ans d’expérience.',
  });

  const parsed = kitAnswers.parseReadyAnswers(rawReady, student);
  assert.ok(parsed);
  // "3" (Licence 3) est gardé, la phrase avec "150" (inventé) est retirée
  assert.match(parsed.presentation, /Licence 3/);
  assert.ok(!parsed.presentation.includes('150'), '150 inventé doit être retiré');
  // "2025" et "2" (présents dans le profil) sont gardés
  assert.match(parsed.whyThisRole, /2025/);
  assert.match(parsed.availability, /2 mois/);
  // "10" (inventé dans une phrase unique) est retiré
  assert.ok(!parsed.keySkills.includes('10'), '10 ans inventé doit être retiré');
  assert.match(parsed.keySkills, /TypeScript/);

  const rawCustom = JSON.stringify({
    answer: 'Lors de mon stage chez Camtel en 2025, j’ai développé une API PostgreSQL. J’ai réduit la latence de 85 % sur 400 requêtes.',
  });
  const customAnswer = kitAnswers.parseCustomQuestionAnswer(rawCustom, student);
  assert.ok(customAnswer);
  assert.match(customAnswer, /2025/);
  assert.ok(!customAnswer.includes('85'), '85 % inventé doit être retiré');
  assert.ok(!customAnswer.includes('400'), '400 inventé doit être retiré');
});

test('vérification de paiement du kit (402) et plafond de 5 questions (409) avec restitution sur échec IA (502)', async () => {
  const unpaidClient = {
    query: async () => ({ rows: [] }),
  };
  assert.equal(await hasPaidApplicationOn(unpaidClient, 'u1', 'stage-apply:j1'), false);

  const paidClient = {
    query: async (sql) => {
      if (sql.includes('app_wallet_transactions')) return { rows: [{ '?column?': 1 }] };
      return { rows: [] };
    },
  };
  assert.equal(await hasPaidApplicationOn(paidClient, 'u1', 'stage-apply:j1'), true);

  // Simulation de la réservation des 5 questions et de la 6e (409)
  let count = 0;
  const kitClient = {
    query: async (sql, params = []) => {
      const s = sql.toLowerCase();
      if (s.includes('do nothing')) return { rows: [] };
      if (s.includes('questions_used = questions_used + 1')) {
        if (count >= params[2]) return { rows: [] };
        count += 1;
        return { rows: [{ questions_used: count }] };
      }
      if (s.includes('greatest(0, questions_used - 1)')) {
        count = Math.max(0, count - 1);
        return { rows: [{ questions_used: count }] };
      }
      if (s.includes('select id, user_id')) {
        return {
          rows: [
            {
              id: 'k1',
              user_id: params[0],
              job_id: params[1],
              letter: '',
              answers: { customQuestions: [] },
              questions_used: count,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        };
      }
      throw new Error(`SQL inattendu : ${sql}`);
    },
  };

  for (let i = 1; i <= 5; i += 1) {
    assert.equal(await reserveKitQuestionSlotOn(kitClient, 'u1', 'j1'), i);
  }
  // Sixième question -> null (la route renvoie 409)
  assert.equal(await reserveKitQuestionSlotOn(kitClient, 'u1', 'j1'), null);

  // Si la 5e question échoue côté IA (502), la place réservée est rendue
  await releaseKitQuestionSlotOn(kitClient, 'u1', 'j1');
  const kitAfterRollback = await getStageKitOn(kitClient, 'u1', 'j1');
  assert.equal(kitAfterRollback.questionsUsed, 4);
  assert.equal(kitAfterRollback.questionsRemaining, 1);
});

test('garde de source POST /api/mobile/stages/kit/answers : codes 401, 400, 404, 422, 402, 409, 429, 502 et restitution', () => {
  const route = read('app/api/mobile/stages/kit/answers/route.ts');
  const at = (s) => route.indexOf(s);
  assert.ok(at('requireMobileUser(request)') < at('kitAnswersRequestSchema.safeParse'), '401 vérifié avant lecture du corps');
  assert.match(route, /MobileApiError\('Requête invalide \(question limitée à 500 caractères\)\.', 400\)/);
  assert.match(route, /MobileApiError\('Offre de stage indisponible\.', 404\)/);
  assert.match(route, /job\.applyMethod !== 'LINK'/);
  assert.match(route, /422/);
  assert.match(route, /hasPaidStageApplication\(userId, job\.id\)/);
  assert.match(route, /402/);
  assert.match(route, /reserveKitQuestionSlot\(userId, job\.id\)/);
  assert.match(route, /409/);
  assert.match(route, /enforceAiQuota\(request, \{ userId, route: 'kit-answers' \}\)/);
  assert.match(route, /releaseKitQuestionSlot\(userId, job\.id\)/);
  assert.match(route, /502/);
});

test('lecture du kit (GET /api/mobile/stages/kit) : isolation par étudiant (404 pour un autre) et questions restantes après 2 questions', async () => {
  const rows = new Map();
  const keyOf = (u, j) => `${u}::${j}`;
  const db = {
    query: async (sql, params = []) => {
      const s = sql.toLowerCase();
      if (s.includes('select id, user_id, job_id') && s.includes('from public.stage_application_kits')) {
        const row = rows.get(keyOf(params[0], params[1]));
        return { rows: row ? [row] : [] };
      }
      if (s.includes('insert into public.stage_application_kits (user_id, job_id, letter)')) {
        const key = keyOf(params[0], params[1]);
        const row = rows.get(key) ?? {
          id: 'kit-1',
          user_id: params[0],
          job_id: params[1],
          letter: '',
          answers: { customQuestions: [] },
          questions_used: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        row.letter = params[2];
        rows.set(key, row);
        return { rows: [row] };
      }
      if (s.includes('do nothing')) {
        const key = keyOf(params[0], params[1]);
        if (!rows.has(key)) {
          rows.set(key, {
            id: 'kit-1',
            user_id: params[0],
            job_id: params[1],
            letter: '',
            answers: { customQuestions: [] },
            questions_used: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        return { rows: [] };
      }
      if (s.includes('questions_used = questions_used + 1')) {
        const row = rows.get(keyOf(params[0], params[1]));
        if (!row || row.questions_used >= params[2]) return { rows: [] };
        row.questions_used += 1;
        return { rows: [{ questions_used: row.questions_used }] };
      }
      throw new Error(`SQL inattendu : ${sql}`);
    },
  };

  await upsertStageKitLetterOn(db, 'student-1', 'job-link-1', 'Lettre enregistrée par /stages/cv');
  await reserveKitQuestionSlotOn(db, 'student-1', 'job-link-1');
  await reserveKitQuestionSlotOn(db, 'student-1', 'job-link-1');

  const ownKit = await getStageKitOn(db, 'student-1', 'job-link-1');
  assert.ok(ownKit);
  assert.equal(ownKit.letter, 'Lettre enregistrée par /stages/cv');
  assert.equal(ownKit.questionsUsed, 2);
  assert.equal(ownKit.questionsRemaining, 3);

  // Un autre étudiant ne voit jamais ce kit (null -> 404 dans GET /stages/kit)
  const otherStudentKit = await getStageKitOn(db, 'student-2', 'job-link-1');
  assert.equal(otherStudentKit, null);

  const getRoute = read('app/api/mobile/stages/kit/route.ts');
  assert.match(getRoute, /requireMobileUser\(request/);
  assert.match(getRoute, /getStageKit\(userId, jobId\)/);
  assert.match(getRoute, /MobileApiError\('Aucun dossier préparé pour cette offre\.', 404\)/);

  const cvRoute = read('app/api/mobile/stages/cv/route.ts');
  assert.match(cvRoute, /job\.applyMethod === 'LINK'/);
  assert.match(cvRoute, /upsertStageKitLetter\(userId, job\.id, letter\)/);
});

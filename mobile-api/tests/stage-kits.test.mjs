import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { loadTs } from './helpers/load-ts.mjs';

const {
  MAX_KIT_QUESTIONS,
  getStageKitOn,
  upsertStageKitLetterOn,
  saveKitReadyAnswersOn,
  reserveKitQuestionSlotOn,
  releaseKitQuestionSlotOn,
  appendKitCustomQuestionOn,
} = await loadTs('lib/stage-kits-core.ts');

const sqlFile = fs.readFileSync(path.resolve('sql/0032_stage_application_kits.sql'), 'utf8').toLowerCase();

test('migration 0032 : table idempotente, contrainte unique (user_id, job_id), borne 0-5 et cascade', () => {
  assert.match(sqlFile, /create table if not exists public\.stage_application_kits/);
  assert.match(sqlFile, /user_id uuid not null references public\.app_users\(id\) on delete cascade/);
  assert.match(sqlFile, /job_id uuid not null references public\.stage_jobs\(id\) on delete cascade/);
  assert.match(sqlFile, /questions_used >= 0 and questions_used <= 5/);
  assert.match(sqlFile, /unique \(user_id, job_id\)/);
  assert.match(sqlFile, /create index if not exists idx_stage_application_kits_user/);
});

// Fake pg client modeling the stage_application_kits table with atomic row updates.
const fakeKitDb = () => {
  const rows = new Map();
  const keyOf = (u, j) => `${u}::${j}`;
  const ensureRow = (u, j) => {
    const key = keyOf(u, j);
    if (!rows.has(key)) {
      const now = new Date().toISOString();
      rows.set(key, {
        id: `kit-${rows.size + 1}`,
        user_id: u,
        job_id: j,
        letter: '',
        answers: { customQuestions: [] },
        questions_used: 0,
        created_at: now,
        updated_at: now,
      });
    }
    return rows.get(key);
  };

  return {
    rows,
    query: async (sql, params = []) => {
      const s = sql.toLowerCase();
      if (s.includes('select id, user_id, job_id') && s.includes('from public.stage_application_kits')) {
        const row = rows.get(keyOf(params[0], params[1]));
        return { rows: row ? [{ ...row, answers: structuredClone(row.answers) }] : [] };
      }
      if (s.includes('insert into public.stage_application_kits (user_id, job_id, letter)')) {
        const row = ensureRow(params[0], params[1]);
        if (params[2] && String(params[2]).length > 0) {
          row.letter = String(params[2]);
        }
        row.updated_at = new Date().toISOString();
        return { rows: [{ ...row, answers: structuredClone(row.answers) }] };
      }
      if (s.includes('insert into public.stage_application_kits (user_id, job_id, answers)')) {
        const row = ensureRow(params[0], params[1]);
        const ready = JSON.parse(String(params[2]));
        row.answers = {
          ...row.answers,
          ready,
          customQuestions: Array.isArray(row.answers.customQuestions) ? row.answers.customQuestions : [],
        };
        row.updated_at = new Date().toISOString();
        return { rows: [{ ...row, answers: structuredClone(row.answers) }] };
      }
      if (s.includes('insert into public.stage_application_kits (user_id, job_id)') && s.includes('do nothing')) {
        ensureRow(params[0], params[1]);
        return { rows: [] };
      }
      if (s.includes('set questions_used = questions_used + 1') && s.includes('questions_used < $3')) {
        const row = rows.get(keyOf(params[0], params[1]));
        const limit = Number(params[2]);
        if (!row || row.questions_used >= limit) return { rows: [] };
        row.questions_used += 1;
        row.updated_at = new Date().toISOString();
        return { rows: [{ questions_used: row.questions_used }] };
      }
      if (s.includes('set questions_used = greatest(0, questions_used - 1)')) {
        const row = rows.get(keyOf(params[0], params[1]));
        if (!row) return { rows: [] };
        row.questions_used = Math.max(0, row.questions_used - 1);
        row.updated_at = new Date().toISOString();
        return { rows: [{ questions_used: row.questions_used }] };
      }
      if (s.includes("'{customquestions}'") && s.includes('jsonb_build_array')) {
        const row = ensureRow(params[0], params[1]);
        const item = JSON.parse(String(params[2]));
        row.answers = {
          ...row.answers,
          customQuestions: [...(row.answers.customQuestions ?? []), item],
        };
        row.updated_at = new Date().toISOString();
        return { rows: [{ ...row, answers: structuredClone(row.answers) }] };
      }
      throw new Error(`Requête SQL non simulée : ${sql}`);
    },
  };
};

test('lecture et écriture (upsert) : lettre et réponses préservées sans écraser les autres champs', async () => {
  const db = fakeKitDb();
  assert.equal(await getStageKitOn(db, 'u1', 'j1'), null);

  const afterLetter = await upsertStageKitLetterOn(db, 'u1', 'j1', 'Madame, Monsieur...');
  assert.equal(afterLetter.letter, 'Madame, Monsieur...');
  assert.equal(afterLetter.questionsUsed, 0);
  assert.equal(afterLetter.questionsRemaining, MAX_KIT_QUESTIONS);

  const ready = {
    presentation: 'Étudiant en L3 Informatique.',
    whyThisRole: 'Vos projets cloud correspondent à mon cursus.',
    availability: 'Disponible dès juin 2026 pour 3 mois.',
    keySkills: 'TypeScript, PostgreSQL, React Native.',
  };
  const afterReady = await saveKitReadyAnswersOn(db, 'u1', 'j1', ready);
  assert.equal(afterReady.letter, 'Madame, Monsieur...');
  assert.deepEqual(afterReady.answers.ready, ready);
  assert.deepEqual(afterReady.answers.customQuestions, []);

  // Empty letter upsert does not wipe existing letter
  const afterEmptyLetter = await upsertStageKitLetterOn(db, 'u1', 'j1', '');
  assert.equal(afterEmptyLetter.letter, 'Madame, Monsieur...');
});

test('réservation conditionnelle : plafonnée à 5 même en appels simultanés et libérable en cas d’échec IA', async () => {
  const db = fakeKitDb();
  // Fire 8 simultaneous reservations for the same (user, job)
  const results = await Promise.all(
    Array.from({ length: 8 }, () => reserveKitQuestionSlotOn(db, 'u1', 'j1')),
  );
  const granted = results.filter((n) => n !== null);
  const rejected = results.filter((n) => n === null);
  assert.deepEqual(granted, [1, 2, 3, 4, 5]);
  assert.equal(rejected.length, 3);

  const kitFull = await getStageKitOn(db, 'u1', 'j1');
  assert.equal(kitFull.questionsUsed, 5);
  assert.equal(kitFull.questionsRemaining, 0);

  // Release 1 slot after AI failure -> 1 slot becomes available again
  const afterRelease = await releaseKitQuestionSlotOn(db, 'u1', 'j1');
  assert.equal(afterRelease, 4);

  const sixthAttemptAfterRelease = await reserveKitQuestionSlotOn(db, 'u1', 'j1');
  assert.equal(sixthAttemptAfterRelease, 5);
  assert.equal(await reserveKitQuestionSlotOn(db, 'u1', 'j1'), null);
});

test('ajout de question personnalisée et isolation par utilisateur', async () => {
  const db = fakeKitDb();
  await upsertStageKitLetterOn(db, 'u1', 'j1', 'Lettre u1');
  const updated = await appendKitCustomQuestionOn(db, 'u1', 'j1', {
    question: 'Pourquoi notre entreprise ?',
    answer: 'Parce que vous développez des solutions locales.',
    createdAt: '2026-11-06T10:00:00.000Z',
  });
  assert.equal(updated.answers.customQuestions.length, 1);
  assert.equal(updated.answers.customQuestions[0].question, 'Pourquoi notre entreprise ?');
  assert.equal(await getStageKitOn(db, 'u2', 'j1'), null);
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { execSync } from 'node:child_process';

const sql = fs.readFileSync(path.resolve('sql/0023_pdf_dedup_contributions.sql'), 'utf8').toLowerCase();
const testDbUrl = process.env.MIGRATE_TEST_DATABASE_URL;

test('migration 0023 : tables et index idempotents', () => {
  assert.match(sql, /create table if not exists public\.pdf_uploads/);
  assert.match(sql, /create table if not exists public\.contribution_rewards/);
  assert.match(sql, /upload_id uuid primary key/);
  assert.match(sql, /create unique index if not exists documents_file_sha256_uidx\s+on public\.documents \(file_sha256\) where file_sha256 is not null/);
  assert.match(sql, /create unique index if not exists pdf_uploads_active_sha_uidx/);
  for (const column of ['file_sha256', 'text_fingerprint', 'minhash', 'embedding', 'source', 'contributor_id']) {
    assert.match(sql, new RegExp(`add column if not exists ${column} `), column);
  }
});

test('migration 0023 : le type contribution_reward garde les 8 types existants', () => {
  const drop = sql.indexOf('drop constraint if exists app_wallet_transactions_type_check');
  const add = sql.indexOf('add constraint app_wallet_transactions_type_check');
  assert.ok(drop >= 0 && add > drop, 'drop avant add');
  const check = sql.slice(add, sql.indexOf(';', add));
  for (const type of ['topup', 'purchase', 'withdrawal', 'commission', 'subscription', 'ia_pack', 'bonus', 'admin_adjustment', 'contribution_reward']) {
    assert.ok(check.includes(`'${type}'`), type);
  }
});

test('migration 0023 : aucune suppression de données', () => {
  for (const forbidden of ['drop table', 'delete from', 'truncate']) {
    assert.ok(!sql.includes(forbidden), forbidden);
  }
});

test('migration 0023 sur base de test : deux passes, unicités du hash et de la récompense', {
  skip: !testDbUrl && 'MIGRATE_TEST_DATABASE_URL non défini',
}, async () => {
  const env = { ...process.env, DATABASE_URL: testDbUrl };
  execSync('node scripts/migrate.mjs', { encoding: 'utf8', env });
  const second = execSync('node scripts/migrate.mjs', { encoding: 'utf8', env });
  assert.ok(!second.includes('appliquée : 0023'), '0023 non réappliquée');

  const { default: pg } = await import('pg');
  const pool = new pg.Pool({ connectionString: testDbUrl, ssl: testDbUrl.includes('sslmode=disable') ? false : { rejectUnauthorized: false } });
  const client = await pool.connect();
  const expectUnique = async (sqlText, params) => {
    await client.query('savepoint s');
    await assert.rejects(client.query(sqlText, params), (error) => error.code === '23505');
    await client.query('rollback to savepoint s');
  };
  try {
    await client.query('begin');
    const doc = `insert into public.documents (id, title, description, university, faculty, subject, level, academic_year, file_path, file_sha256)
      values ($1, 't', 'd', 'u', 'f', 's', 'l', '2024', 'p', 'sha-test-0023')`;
    await client.query(doc, ['pdf_test_0023_a']);
    await expectUnique(doc, ['pdf_test_0023_b']);

    const { rows } = await client.query(`insert into public.app_users (better_auth_user_id, email) values ('migration-0023-test', 'migration-0023@test.invalid') returning id`);
    const userId = rows[0].id;
    const upload = await client.query(
      `insert into public.pdf_uploads (batch_id, uploader_id, source, status, original_name, file_size, file_sha256)
       values (gen_random_uuid(), $1, 'student', 'published', 'a.pdf', 10, 'sha-test-0023') returning id`,
      [userId],
    );
    const reward = 'insert into public.contribution_rewards (upload_id, user_id, amount_coins) values ($1, $2, 10)';
    await client.query(reward, [upload.rows[0].id, userId]);
    await expectUnique(reward, [upload.rows[0].id, userId]);
  } finally {
    await client.query('rollback');
    client.release();
    await pool.end();
  }
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const read = (file) => fs.readFileSync(path.resolve(file), 'utf8');
const sql = read('sql/0028_notifications_inbox_job_alerts.sql').toLowerCase();

test('migration 0028 : boîte de notifications, une alerte par offre, offres existantes déjà annoncées', () => {
  assert.match(sql, /create table if not exists public\.app_notifications/);
  assert.match(sql, /on public\.app_notifications \(user_id, job_id\)\s+where type = 'job_match'/);
  assert.match(sql, /add column if not exists alerted_at timestamptz/);
  assert.match(sql, /set alerted_at = coalesce\(reviewed_at, created_at, now\(\)\)/);
  for (const forbidden of ['drop table', 'delete from', 'truncate', 'drop column']) {
    assert.ok(!sql.includes(forbidden), forbidden);
  }
});

test('alertes : chaque offre est réservée une seule fois (concurrence cron / publication)', () => {
  const lib = read('lib/job-alerts.ts');
  assert.match(lib, /update public\.stage_jobs set alerted_at = now\(\)/);
  assert.match(lib, /for update skip locked/);
  assert.match(lib, /status = 'published' and alerted_at is null/);
});

test('alertes : déclenchées à la publication (ingest, review) et protégées pour le cron', () => {
  assert.match(read('app/api/mobile/stages/ingest/route.ts'), /if \(result\.isNew\) triggerJobAlerts\(\)/);
  assert.match(read('app/api/mobile/stages/review/route.ts'), /if \(decision === 'publish'\) triggerJobAlerts\(\)/);
  const cron = read('app/api/mobile/stages/alerts/route.ts');
  assert.match(cron, /N8N_INGESTION_SECRET/);
  assert.match(cron, /timingSafeEqual/);
});

test('push : chaque notification passe par la boîte, une alerte d’offre n’est jamais envoyée deux fois', () => {
  const push = read('lib/push.ts');
  assert.match(push, /insert into public\.app_notifications/);
  assert.match(push, /on conflict \(user_id, job_id\) where type = 'job_match' do nothing/);
  assert.match(push, /if \(!recorded\) return;/);
});

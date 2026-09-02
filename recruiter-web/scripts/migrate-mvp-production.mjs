import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

const loadEnv = (file) => {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index > 0 && !process.env[line.slice(0, index)]) {
      process.env[line.slice(0, index)] = line.slice(index + 1);
    }
  }
};

loadEnv('.env.local');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing.');

const root = path.resolve(process.cwd(), '..');
const mvpSql = fs.readFileSync(path.join(root, 'docs', 'MVP_PRODUCTION_MIGRATION.sql'), 'utf8');
const stagesSql = fs.readFileSync(path.join(root, 'docs', 'STAGES_SUPABASE.sql'), 'utf8');
const sql = mvpSql.replace('\\ir STAGES_SUPABASE.sql', stagesSql);
const isLocal = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? undefined : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true' },
});

await client.connect();
try {
  await client.query('begin');
  await client.query(sql);
  await client.query('commit');
  console.log('MVP production migration applied.');
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  await client.end();
}

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pkg from 'pg';
const { Client } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const loadEnv = (file) => {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index > 0) process.env[line.slice(0, index)] = line.slice(index + 1);
  }
};

loadEnv(path.join(root, '.env.local'));

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing.');
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log('Connecting to database...');
  await client.connect();
  try {
    const targetTables = ['user', 'session', 'account', 'verification', 'rateLimit'];
    console.log('Querying RLS status for tables:', targetTables);

    const res = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename IN (${targetTables.map((_, i) => `$${i + 1}`).join(', ')});
    `, targetTables);

    let allEnabled = true;
    for (const row of res.rows) {
      console.log(`Table: ${row.tablename} | RLS Enabled: ${row.rowsecurity}`);
      if (!row.rowsecurity) {
        allEnabled = false;
      }
    }

    if (res.rows.length < targetTables.length) {
      const foundNames = res.rows.map(r => r.tablename.toLowerCase());
      const missing = targetTables.filter(t => !foundNames.includes(t.toLowerCase()));
      console.warn('Some tables were not found in pg_tables:', missing);
    }

    if (allEnabled) {
      console.log('Verification Success: RLS is enabled on all core Better Auth tables.');
      process.exit(0);
    } else {
      console.error('Verification Failure: RLS is NOT enabled on one or more core Better Auth tables.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error verifying RLS status:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

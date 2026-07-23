// List app_users from the DB
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load .env.local
const env = {};
const envPath = path.join(__dirname, '..', '.env.local');
fs.readFileSync(envPath, 'utf8')
  .split('\n')
  .forEach(line => {
    const eq = line.indexOf('=');
    if (eq > 0) env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  });

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: /supabase|pooler/.test(env.DATABASE_URL) ? { rejectUnauthorized: false } : false,
});

async function main() {
  const r = await pool.query('select id, email, name, role, created_at from public.app_users order by created_at limit 5');
  console.log('app_users:', JSON.stringify(r.rows, null, 2));

  const r2 = await pool.query('select table_name from information_schema.tables where table_schema = \'public\' and table_name like \'app_%\' order by table_name');
  console.log('\napp_* tables:', r2.rows.map(x => x.table_name).join(', '));

  await pool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });

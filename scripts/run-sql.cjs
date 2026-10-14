// Runs a SQL migration file against DATABASE_URL (read from mobile-api env files).
// Usage: node scripts/run-sql.cjs mobile-api/sql/<file>.sql
const fs = require('fs');
const path = require('path');
const { Pool } = require(path.resolve(__dirname, '../mobile-api/node_modules/pg'));
for (const f of ['.env.local', '.env.production', '.env']) {
  const file = path.resolve(__dirname, '../mobile-api', f);
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^DATABASE_URL=(.*)$/);
    if (m && !process.env.DATABASE_URL) process.env.DATABASE_URL = m[1].replace(/^['"]|['"]$/g, '');
  }
}
const sql = fs.readFileSync(process.argv[2], 'utf8');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query(sql)
  .then(() => console.log(`applied ${path.basename(process.argv[2])}`))
  .catch((e) => { console.error(e.message); process.exitCode = 1; })
  .finally(() => pool.end());

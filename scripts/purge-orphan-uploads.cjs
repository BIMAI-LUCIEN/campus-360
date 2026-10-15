// Deletes uploaded files that no database row references any more (documents
// or files deleted from Vercel, which cannot reach the VPS disk), plus stale
// temporary files. Files younger than one hour are kept: an upload writes the
// file just before inserting its row.
//
// Usage (on the VPS, from the repo root):
//   node scripts/purge-orphan-uploads.cjs [--dry-run]
// Reads DATABASE_URL and UPLOAD_ROOT from the environment or mobile-api env files.
const fs = require('fs');
const path = require('path');
const { Pool } = require(path.resolve(__dirname, '../mobile-api/node_modules/pg'));

const MIN_AGE_MS = 60 * 60 * 1000;
const dryRun = process.argv.includes('--dry-run');

for (const f of ['.env.local', '.env.production', '.env']) {
  const file = path.resolve(__dirname, '../mobile-api', f);
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^(DATABASE_URL|UPLOAD_ROOT)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const root = path.resolve(process.env.UPLOAD_ROOT || path.resolve(__dirname, '../mobile-api/.uploads'));

const listFiles = (dir) => {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
};

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    const res = await pool.query('select storage_key from public.app_document_files where storage_key is not null');
    const referenced = new Set(res.rows.map((r) => r.storage_key));
    const now = Date.now();
    let removed = 0;
    let kept = 0;
    for (const file of listFiles(root)) {
      const key = path.relative(root, file).split(path.sep).join('/');
      const age = now - fs.statSync(file).mtimeMs;
      const orphan = !referenced.has(key);
      if (orphan && age > MIN_AGE_MS) {
        if (!dryRun) fs.unlinkSync(file);
        removed += 1;
        console.log(`${dryRun ? '[dry-run] would remove' : 'removed'} ${key}`);
      } else {
        kept += 1;
      }
    }
    // Remove now-empty user folders.
    if (!dryRun && fs.existsSync(root)) {
      for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        const dir = path.join(root, entry.name);
        if (entry.isDirectory() && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
      }
    }
    console.log(`purge done: root=${root} removed=${removed} kept=${kept}${dryRun ? ' (dry-run)' : ''}`);
  } catch (error) {
    console.error('purge failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();

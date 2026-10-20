// Deletes uploaded files that no database row references any more (documents
// or files deleted from Vercel, which cannot reach the VPS disk), plus stale
// temporary files. Files younger than one hour are kept: an upload writes the
// file just before inserting its row.
//
// Usage (on the VPS, from the repo root):
//   node scripts/purge-orphan-uploads.cjs [--dry-run] [--max-delete <n>] [--force]
// Reads DATABASE_URL and UPLOAD_ROOT from the environment or mobile-api env files.
const fs = require('fs');
const path = require('path');
const { Pool } = require(path.resolve(__dirname, '../mobile-api/node_modules/pg'));

const MIN_AGE_MS = 60 * 60 * 1000;
const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');

// Parse --max-delete <n> (default 200)
let maxDelete = 200;
const maxDeleteIdx = process.argv.indexOf('--max-delete');
if (maxDeleteIdx !== -1 && process.argv[maxDeleteIdx + 1] !== undefined) {
  const parsed = parseInt(process.argv[maxDeleteIdx + 1], 10);
  if (!Number.isNaN(parsed) && parsed >= 0) {
    maxDelete = parsed;
  }
}

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
    
    const allFiles = listFiles(root);
    const totalFiles = allFiles.length;
    const candidates = [];
    let kept = 0;

    for (const file of allFiles) {
      const key = path.relative(root, file).split(path.sep).join('/');
      const age = now - fs.statSync(file).mtimeMs;
      const orphan = !referenced.has(key);
      if (orphan && age > MIN_AGE_MS) {
        candidates.push({ file, key });
      } else {
        kept += 1;
      }
    }

    const removeCount = candidates.length;

    // Safety checks against mass deletion
    if (removeCount > maxDelete && !force) {
      console.error(`[purge] ABORT: ${removeCount} fichiers orphelins à supprimer dépasse le plafond de sécurité (--max-delete=${maxDelete}). Spécifiez --force pour forcer l'opération.`);
      process.exitCode = 1;
      return;
    }

    if (totalFiles > 0 && (removeCount / totalFiles) > 0.20 && !force) {
      const pct = Math.round((removeCount / totalFiles) * 100);
      console.error(`[purge] ABORT: ${removeCount}/${totalFiles} (${pct}%) dépasse le seuil de sécurité de 20% du total des fichiers. Spécifiez --force pour forcer l'opération.`);
      process.exitCode = 1;
      return;
    }

    // Perform deletions
    for (const item of candidates) {
      if (!dryRun) {
        fs.unlinkSync(item.file);
      }
      console.log(`${dryRun ? '[dry-run] would remove' : 'removed'} ${item.key}`);
    }

    // Remove now-empty user folders
    if (!dryRun && fs.existsSync(root)) {
      for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        const dir = path.join(root, entry.name);
        if (entry.isDirectory() && fs.readdirSync(dir).length === 0) {
          fs.rmdirSync(dir);
        }
      }
    }

    console.log(`purge done: root=${root} removed=${removeCount} kept=${kept}${dryRun ? ' (dry-run)' : ''}`);
  } catch (error) {
    console.error('purge failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();

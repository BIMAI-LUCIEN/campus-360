import pg from '../mobile-api/node_modules/pg/lib/index.js';
import fs from 'fs';

const dbUrl = fs.readFileSync('mobile-api/.env.local', 'utf8').match(/DATABASE_URL=([^\r\n]+)/)[1].trim();
const pool = new pg.Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function fix() {
  await pool.query("UPDATE public.documents SET preview_path = replace(preview_path, '.pdf', '.jpg') WHERE preview_path LIKE '%.pdf'");
  const res = await pool.query("SELECT id, preview_path FROM public.documents WHERE id = 'sn-iut-gi101-2024'");
  console.table(res.rows);
  await pool.end();
}

fix().catch(console.error);

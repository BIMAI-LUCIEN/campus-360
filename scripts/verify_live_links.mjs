import pg from '../mobile-api/node_modules/pg/lib/index.js';
import fs from 'fs';

const dbUrl = fs.readFileSync('mobile-api/.env.local', 'utf8').match(/DATABASE_URL=([^\r\n]+)/)[1].trim();
const pool = new pg.Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function verify() {
  const ids = [
    'concours-enspy-maths-2023',
    'concours-fmsb-biologie-2023',
    'concours-enam-cg-2023',
    'concours-ide-sante-2023',
    'concours-ens-maths-2023',
    'sn-enspy-inf101-2024',
    'sn-uy2-eco111-2024',
    'sn-uy1-mat111-2024'
  ];

  const res = await pool.query('SELECT id, title, page_count, file_size, file_path, preview_path FROM public.documents WHERE id = ANY($1)', [ids]);

  for (const row of res.rows) {
    const resp = await fetch(row.file_path, { method: 'HEAD' });
    const prev = await fetch(row.preview_path, { method: 'HEAD' });
    console.log(`[OK ${resp.status}] ${row.id}: ${row.page_count} pages, ${row.file_size} (PDF: ${resp.headers.get('content-type')}, Preview: ${prev.headers.get('content-type')})`);
  }

  await pool.end();
}

verify().catch(console.error);

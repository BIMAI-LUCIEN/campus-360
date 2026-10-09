import pg from '../mobile-api/node_modules/pg/lib/index.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', 'mobile-api', '.env.local');

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=');
      const k = key.trim();
      const v = vals.join('=').trim().replace(/^["']|["']$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL missing');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('🔍 Checking columns of stage_students in Supabase...');
    const res = await client.query(
      `SELECT column_name, data_type, is_nullable, column_default 
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'stage_students'
       ORDER BY ordinal_position;`
    );
    console.log('Current columns:', res.rows.map(r => `${r.column_name} (${r.data_type})`));

    console.log('🛠 Adding WhatsApp integration columns if not exists...');
    await client.query(`
      ALTER TABLE public.stage_students 
      ADD COLUMN IF NOT EXISTS whatsapp_connected boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS whatsapp_instance text,
      ADD COLUMN IF NOT EXISTS whatsapp_linked_at timestamptz;
    `);

    // Create index on phone_whatsapp and whatsapp_instance for fast lookup
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_stage_students_phone_whatsapp ON public.stage_students(phone_whatsapp);
      CREATE INDEX IF NOT EXISTS idx_stage_students_whatsapp_instance ON public.stage_students(whatsapp_instance);
    `);

    // Reload PostgREST schema cache
    try {
      await client.query("NOTIFY pgrst, 'reload schema';");
      console.log('🔄 PostgREST schema cache reloaded!');
    } catch (_) {}

    const verify = await client.query(
      `SELECT column_name, data_type, is_nullable, column_default 
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'stage_students' 
         AND column_name IN ('whatsapp_connected', 'whatsapp_instance', 'whatsapp_linked_at');`
    );
    console.log('✅ Verified WhatsApp columns:', verify.rows);

    const students = await client.query(
      `SELECT id, full_name, phone_whatsapp, email, whatsapp_connected, whatsapp_instance, whatsapp_linked_at 
       FROM public.stage_students LIMIT 5;`
    );
    console.log('Sample students in DB:', students.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

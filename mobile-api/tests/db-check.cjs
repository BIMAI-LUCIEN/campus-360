// Quick DB table check — run with: node tests/db-check.cjs
// Uses DATABASE_URL from .env.local (gitignored, safe to commit pattern)
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  });
}

const TABLES = [
  'app_users',
  'app_wallets',
  'app_documents',
  'app_document_sections',
  'app_document_purchases',
  'app_pack_purchases',
  'app_wallet_transactions',
];

const COLUMNS = {
  app_users: ['id', 'better_auth_user_id', 'legacy_supabase_user_id', 'email', 'name', 'role', 'phone', 'whatsapp_phone', 'university', 'faculty', 'level', 'created_at', 'updated_at'],
  app_wallets: ['id', 'user_id', 'balance_coins', 'created_at', 'updated_at'],
  app_documents: ['id', 'user_id', 'title', 'description', 'template_type', 'font_family', 'line_spacing', 'margins', 'cover_template', 'cover_data', 'primary_color', 'secondary_color', 'created_at', 'updated_at'],
  'app_document_sections': ['id', 'document_id', 'title', 'content_html', 'content_json', 'sort_order', 'is_system', 'created_at', 'updated_at'],
  app_document_purchases: ['id', 'document_id', 'buyer_id', 'amount_coins', 'created_at'],
  app_pack_purchases: ['id', 'pack_id', 'buyer_id', 'amount_coins', 'document_ids', 'created_at'],
  app_wallet_transactions: ['id', 'user_id', 'type', 'amount_coins', 'reference_id', 'status', 'created_at'],
};

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set — copy .env.example to .env.local first.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: /supabase|pooler/.test(process.env.DATABASE_URL) ? { rejectUnauthorized: false } : false,
  });

  console.log('🔍 Checking tables and columns...\n');

  for (const table of TABLES) {
    try {
      // Check table exists
      const exists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = $1
        ) as exists
      `, [table]);

      if (!exists.rows[0].exists) {
        console.log(`❌ MISSING TABLE: ${table}`);
        continue;
      }

      console.log(`✅ Table exists: ${table}`);

      // Check columns
      const cols = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);

      const actualCols = new Set(cols.rows.map(r => r.column_name));
      const expectedCols = COLUMNS[table] || [];
      const missing = expectedCols.filter(c => !actualCols.has(c));

      if (missing.length) {
        console.log(`   ⚠️  Missing columns: ${missing.join(', ')}`);
      } else {
        console.log(`   All expected columns present (${expectedCols.length})`);
      }
    } catch (err) {
      console.log(`❌ Error checking ${table}: ${err.message}`);
    }
  }

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });

import pg from 'pg';
import fs from 'node:fs';

const loadEnv = (file) => {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index > 0) process.env[line.slice(0, index)] = line.slice(index + 1);
  }
};

loadEnv('c:/Users/migue/Desktop/mes projets/campus 360/admin-app/.env.local');

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function check() {
  await client.connect();
  console.log("Connected to PostgreSQL database successfully.");
  
  const tablesToCheck = ['profiles', 'wallets', 'documents', 'document_purchases', 'wallet_transactions', 'ia_usage_logs', 'subscription_plans', 'ia_packs', 'document_events', 'pdf_packs', 'pdf_pack_items', 'pack_purchases'];
  
  console.log("\n=== Checking existence of tables ===");
  for (const table of tablesToCheck) {
    const res = await client.query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables 
         WHERE table_schema = 'public' 
           AND table_name = $1
       );`,
      [table]
    );
    console.log(`Table '${table}': ${res.rows[0].exists ? 'INITIALIZED' : 'NOT FOUND'}`);
  }

  console.log("\n=== Column schemas for key tables ===");
  for (const table of ['profiles', 'documents', 'document_events']) {
    console.log(`\nTable: ${table}`);
    const columnsRes = await client.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position;`,
      [table]
    );
    for (const col of columnsRes.rows) {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
    }
  }

  // Let's also check if we have any documents in public.documents
  try {
    const docCountRes = await client.query(`SELECT COUNT(*)::int as count FROM public.documents`);
    console.log(`\nTotal rows in public.documents: ${docCountRes.rows[0].count}`);
  } catch (e) {
    console.error("Error counting documents:", e.message);
  }
  
  await client.end();
}

check().catch(err => {
  console.error("Database connection/query failed:", err);
  process.exit(1);
});

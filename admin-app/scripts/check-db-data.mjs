import pkg from 'pg';
const { Client } = pkg;
import fs from 'node:fs';
import path from 'node:path';

const loadEnv = (file) => {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index > 0) process.env[line.slice(0, index)] = line.slice(index + 1);
  }
};

loadEnv('.env.local');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is missing.");
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    console.log("Checking DB Tables and Schema...");

    // Check tables list
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("Public Tables:", tablesRes.rows.map(r => r.table_name));

    // Check profiles columns
    const profilesCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'profiles'
    `);
    console.log("Profiles columns:", profilesCols.rows.map(r => `${r.column_name} (${r.data_type})`));

    // Check document_purchases columns
    const purchasesCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'document_purchases'
    `);
    console.log("Document purchases columns:", purchasesCols.rows.map(r => `${r.column_name} (${r.data_type})`));

    // Count records
    const counts = {};
    for (const table of ['profiles', 'documents', 'document_purchases', 'document_events']) {
      try {
        const countRes = await client.query(`SELECT count(*) FROM public.${table}`);
        counts[table] = countRes.rows[0].count;
      } catch (err) {
        counts[table] = `Error: ${err.message}`;
      }
    }
    console.log("Table Record Counts:", counts);

    // Fetch a sample event and verify user profile join
    const sampleEventRes = await client.query(`
      SELECT e.id, e.event_type, e.user_id, p.email as user_email
      FROM public.document_events e
      LEFT JOIN public.profiles p ON p.id = e.user_id
      ORDER BY e.created_at DESC
      LIMIT 3
    `);
    console.log("Sample Events with Joined Emails:", sampleEventRes.rows);

    // Fetch sum of revenue
    const revenueRes = await client.query(`
      SELECT coalesce(sum(amount_coins), 0)::int as revenue
      FROM public.document_purchases
      WHERE created_at >= now() - interval '30 days'
    `);
    console.log("Revenue in last 30 days:", revenueRes.rows[0].revenue);

  } catch (err) {
    console.error("DB check failed:", err);
  } finally {
    await client.end();
  }
}

main();

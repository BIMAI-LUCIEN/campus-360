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

loadEnv('.env.local');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    console.log("Searching for users with 'miguel' in email...");
    
    // Find in app_users
    const appUsers = await client.query(
      "select id, email, better_auth_user_id from public.app_users where email ilike '%miguel%'"
    );
    console.log("Found in public.app_users:", appUsers.rows);

    // Find in user
    const authUsers = await client.query(
      "select id, email from public.\"user\" where email ilike '%miguel%'"
    );
    console.log("Found in public.user:", authUsers.rows);

    // Let's delete all found matching emails
    const emailsToDelete = Array.from(new Set([
      ...appUsers.rows.map(r => r.email),
      ...authUsers.rows.map(r => r.email)
    ]));

    for (const email of emailsToDelete) {
      console.log(`Deleting ${email}...`);
      
      // Delete purchases, transactions, etc. linked to app_users
      const userRow = await client.query(
        "select id from public.app_users where email = $1",
        [email]
      );
      if (userRow.rows[0]) {
        const userId = userRow.rows[0].id;
        await client.query("delete from public.app_wallets where user_id = $1", [userId]);
        await client.query("delete from public.app_document_purchases where buyer_id = $1", [userId]);
        await client.query("delete from public.app_pack_purchases where buyer_id = $1", [userId]);
        await client.query("delete from public.app_wallet_transactions where user_id = $1", [userId]);
        await client.query("delete from public.app_users where id = $1", [userId]);
        console.log(`Deleted from app_users tables: ${email}`);
      }

      // Delete from Better Auth user, session, account, verification
      const authUserRow = await client.query(
        "select id from public.\"user\" where email = $1",
        [email]
      );
      if (authUserRow.rows[0]) {
        const authUserId = authUserRow.rows[0].id;
        await client.query("delete from public.session where \"userId\" = $1", [authUserId]);
        await client.query("delete from public.account where \"userId\" = $1", [authUserId]);
        await client.query("delete from public.verification where identifier = $1", [email]);
        await client.query("delete from public.\"user\" where id = $1", [authUserId]);
        console.log(`Deleted from Better Auth tables: ${email}`);
      }
    }

    console.log("Done!");
  } catch (err) {
    console.error("Error running script:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();

import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.resolve(__dirname, '..', '.env.local');

const loadEnv = (file) => {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index > 0) process.env[line.slice(0, index)] = line.slice(index + 1);
  }
};

loadEnv(envFile);

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const email = 'miguel1142007@gmail.com';
  const client = await pool.connect();
  try {
    console.log(`Verifying email for: ${email}`);
    
    const before = await client.query(
      'select id, email, "emailVerified" from public."user" where email = $1',
      [email]
    );
    console.log("Before:", before.rows);

    if (before.rows.length === 0) {
      console.log("User not found!");
      return;
    }

    await client.query(
      'update public."user" set "emailVerified" = true where email = $1',
      [email]
    );

    const after = await client.query(
      'select id, email, "emailVerified" from public."user" where email = $1',
      [email]
    );
    console.log("After:", after.rows);
    console.log("✅ Email verified successfully!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

run();

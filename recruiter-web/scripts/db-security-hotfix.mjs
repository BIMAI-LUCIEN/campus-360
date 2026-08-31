import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pkg from 'pg';
const { Client } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const loadEnv = (file) => {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index > 0) process.env[line.slice(0, index)] = line.slice(index + 1);
  }
};

loadEnv(path.join(root, '.env.local'));

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing.');
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log('Connecting to database...');
  await client.connect();
  try {
    console.log('Enabling Row Level Security (RLS) on Better Auth tables...');
    
    // Enable RLS on core Better Auth tables
    await client.query('ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE public."session" ENABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE public."account" ENABLE ROW LEVEL SECURITY;');
    await client.query('ALTER TABLE public."verification" ENABLE ROW LEVEL SECURITY;');
    
    // rateLimit table may have case-sensitive name public."rateLimit"
    try {
      await client.query('ALTER TABLE public."rateLimit" ENABLE ROW LEVEL SECURITY;');
      console.log('Enabled RLS on public."rateLimit"');
    } catch (e) {
      console.warn('Could not enable RLS on rateLimit table (checking if lowercase/exists):', e.message);
      await client.query('ALTER TABLE public.ratelimit ENABLE ROW LEVEL SECURITY;');
      console.log('Enabled RLS on public.ratelimit');
    }

    console.log('RLS security hotfix applied successfully.');
  } catch (error) {
    console.error('Error applying RLS security hotfix:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();

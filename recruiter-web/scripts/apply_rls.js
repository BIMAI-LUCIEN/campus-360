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
  console.error('DATABASE_URL is missing in environment variables');
  process.exit(1);
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const sql = `
-- Enable RLS
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_document_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_pack_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_ia_usage_logs ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist
DROP POLICY IF EXISTS "users_select_own" ON public.app_users;
DROP POLICY IF EXISTS "wallets_select_own" ON public.app_wallets;
DROP POLICY IF EXISTS "doc_purchases_own" ON public.app_document_purchases;
DROP POLICY IF EXISTS "pack_purchases_own" ON public.app_pack_purchases;
DROP POLICY IF EXISTS "push_tokens_own" ON public.app_user_push_tokens;
DROP POLICY IF EXISTS "events_insert_authenticated" ON public.document_events;
DROP POLICY IF EXISTS "transactions_own" ON public.app_wallet_transactions;

-- Create policies
CREATE POLICY "users_select_own" ON public.app_users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "wallets_select_own" ON public.app_wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "doc_purchases_own" ON public.app_document_purchases FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "pack_purchases_own" ON public.app_pack_purchases FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "push_tokens_own" ON public.app_user_push_tokens FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "events_insert_authenticated" ON public.document_events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "transactions_own" ON public.app_wallet_transactions FOR SELECT USING (auth.uid() = user_id);
`;

async function run() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database.');
    await client.query(sql);
    console.log('Successfully applied all RLS policies to the database tables!');
  } catch (err) {
    console.error('Failed to apply RLS policies:', err);
  } finally {
    await client.end();
  }
}

run();

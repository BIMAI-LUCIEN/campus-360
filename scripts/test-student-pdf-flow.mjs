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
loadEnv('admin-app/.env.local');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

const email = `etudiant.test.${Date.now()}@gmail.com`;
const password = 'Campus360!';
const documentId = 'pdf-test-idees-cameroun';

const request = async (path, options = {}) => {
  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}${path}`, {
    ...options,
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!response.ok) {
    throw new Error(`${response.status}: ${typeof payload === 'string' ? payload : JSON.stringify(payload)}`);
  }
  return payload;
};

const signUp = async () => {
  if (serviceRoleKey) {
    await request('/auth/v1/admin/users', {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: 'Etudiant Test Campus 3602' },
      }),
    });
    return null;
  }

  try {
    return await request('/auth/v1/signup', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        data: { name: 'Etudiant Test Campus 3602' },
      }),
    });
  } catch (error) {
    if (!String(error.message).includes('already')) throw error;
    return null;
  }
};

const signIn = async () =>
  request('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

await signUp();
const session = await signIn();
const accessToken = session.access_token;

const authHeaders = { Authorization: `Bearer ${accessToken}` };

const documents = await request('/rest/v1/documents?status=eq.published&select=id,title,price_coins', {
  headers: authHeaders,
});

const walletBefore = await request('/rest/v1/wallets?select=balance_coins&limit=1', { headers: authHeaders });

await request('/rest/v1/rpc/topup_wallet', {
  method: 'POST',
  headers: authHeaders,
  body: JSON.stringify({ target_amount: 1000, provider_name: 'Test Mobile Money' }),
});

let purchase;
try {
  purchase = await request('/rest/v1/rpc/purchase_document', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ target_document_id: documentId }),
  });
} catch (error) {
  purchase = { reused: true, message: error.message };
}

const purchased = await request('/rest/v1/document_purchases?select=document_id,amount_coins', {
  headers: authHeaders,
});
const walletAfter = await request('/rest/v1/wallets?select=balance_coins&limit=1', { headers: authHeaders });

console.log(
  JSON.stringify(
    {
      ok: true,
      email,
      model: 'student-pdf-flow',
      documents,
      walletBefore,
      purchase,
      purchased,
      walletAfter,
    },
    null,
    2,
  ),
);

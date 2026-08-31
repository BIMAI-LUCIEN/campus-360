import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { Client } from 'pg';

const loadEnv = (file) => {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index > 0) process.env[line.slice(0, index)] = line.slice(index + 1);
  }
};

const asDate = (value) => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  const date = new Date(typeof value === 'number' && value < 10_000_000_000 ? value * 1000 : value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

loadEnv('.env.local');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing.');
if (!fs.existsSync('campus360-admin.sqlite')) {
  console.log(JSON.stringify({ ok: true, migratedUsers: 0, reason: 'legacy database absent' }));
  process.exit(0);
}

const legacy = new DatabaseSync('campus360-admin.sqlite', { readOnly: true });
const users = legacy.prepare('select * from user').all();
const accounts = legacy.prepare('select * from account').all();
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
try {
  await client.query('begin');
  for (const user of users) {
    await client.query(
      `insert into "user" (
         id, name, email, "emailVerified", image, "createdAt", "updatedAt",
         role, banned, "banReason", "banExpires"
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       on conflict (id) do update set
         name = excluded.name,
         email = excluded.email,
         role = excluded.role,
         "updatedAt" = excluded."updatedAt"`,
      [
        user.id,
        user.name,
        user.email,
        Boolean(user.emailVerified),
        user.image ?? null,
        asDate(user.createdAt),
        asDate(user.updatedAt),
        user.role ?? 'student',
        Boolean(user.banned),
        user.banReason ?? null,
        user.banExpires ? asDate(user.banExpires) : null,
      ],
    );
  }

  for (const account of accounts) {
    await client.query(
      `insert into account (
         id, "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken",
         "accessTokenExpiresAt", "refreshTokenExpiresAt", scope, password, "createdAt", "updatedAt"
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       on conflict (id) do update set password = excluded.password, "updatedAt" = excluded."updatedAt"`,
      [
        account.id,
        account.accountId,
        account.providerId,
        account.userId,
        account.accessToken ?? null,
        account.refreshToken ?? null,
        account.idToken ?? null,
        account.accessTokenExpiresAt ? asDate(account.accessTokenExpiresAt) : null,
        account.refreshTokenExpiresAt ? asDate(account.refreshTokenExpiresAt) : null,
        account.scope ?? null,
        account.password ?? null,
        asDate(account.createdAt),
        asDate(account.updatedAt),
      ],
    );
  }
  await client.query('commit');
  console.log(JSON.stringify({ ok: true, migratedUsers: users.length, migratedAccounts: accounts.length }));
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  await client.end();
  legacy.close();
}


import { Pool, type PoolConfig } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var campusDatabasePool: Pool | undefined;
}

const createPool = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required.');
  }

  // Default to RELAXED TLS verification. Supabase pooler endpoints often
  // present a certificate chain that Node's default verifier rejects
  // (especially in certain regions / shared poolers). Tightening this back
  // to true is fine for production once you've confirmed your pooler's
  // chain validates with `openssl s_client -connect <host>:5432 -starttls postgres`.
  // Set DATABASE_SSL_REJECT_UNAUTHORIZED=true explicitly to enforce strict
  // verification when you want it.
  const rejectUnauthorized =
    (process.env.DATABASE_SSL_REJECT_UNAUTHORIZED ?? 'false').toLowerCase() === 'true';

  const config: PoolConfig = {
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 20_000,
    idleTimeoutMillis: 30_000,
    keepAlive: true,
  };

  // Only attach ssl when we have a non-localhost connection string to avoid
  // pg warnings during local dev. Localhost (`localhost` / `127.0.0.1`) is
  // never SSL-protected anyway.
  const isLocal = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
  if (!isLocal) {
    config.ssl = { rejectUnauthorized };
  }

  return new Pool(config);
};

export const databasePool = globalThis.campusDatabasePool ?? createPool();

databasePool.on('error', (error) => {
  console.error('PostgreSQL idle connection was discarded.', error.message);
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.campusDatabasePool = databasePool;
}

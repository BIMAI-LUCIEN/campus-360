import { Pool, type PoolConfig } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var campusDatabasePool: Pool | undefined;
}

const createPool = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required.');
  }

  // Force the ssl block to be present even when env var is missing — many
  // Supabase pooler connections fail TLS verification with default certs.
  // We default to relaxed (rejectUnauthorized=false) so the app boots; the
  // user can opt into strict via DATABASE_SSL_REJECT_UNAUTHORIZED=true.
  const rejectUnauthorized =
    (process.env.DATABASE_SSL_REJECT_UNAUTHORIZED ?? 'false').toLowerCase() === 'true';

  const config: PoolConfig = {
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 20_000,
    idleTimeoutMillis: 30_000,
    keepAlive: true,
  };

  // Always attach ssl for non-localhost connections — but use relaxed
  // verification by default so Supabase shared pooler certs don't break us.
  // Localhost (`localhost` / `127.0.0.1`) is never SSL-protected anyway.
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

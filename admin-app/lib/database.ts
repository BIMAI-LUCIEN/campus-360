import { Pool, type PoolConfig } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var campusDatabasePool: Pool | undefined;
}

const createPool = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required.');
  }

  // Default to strict TLS verification. Only relax when the user explicitly opts
  // in via DATABASE_SSL_REJECT_UNAUTHORIZED=false (e.g. self-signed certs in
  // local docker dev). NEVER relax in production.
  const rejectUnauthorized =
    (process.env.DATABASE_SSL_REJECT_UNAUTHORIZED ?? 'true').toLowerCase() !== 'false';

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

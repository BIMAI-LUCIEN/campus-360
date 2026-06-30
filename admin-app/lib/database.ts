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

// Lazy pool: Next.js evaluates route modules during "Collecting page data"
// at build time, and Vercel does NOT expose DATABASE_URL during builds.
// Creating the Pool eagerly here would throw and break the build, even
// though the connection is only ever needed at request time. We expose a
// Proxy that resolves to the real Pool on first property access (e.g.
// `databasePool.query(...)`). The existing call sites are unchanged.
let _databasePool: Pool | undefined;
const getDatabasePool = (): Pool => {
  if (!_databasePool) {
    const pool = globalThis.campusDatabasePool ?? createPool();
    pool.on('error', (error) => {
      console.error('PostgreSQL idle connection was discarded.', error.message);
    });
    if (process.env.NODE_ENV !== 'production') {
      globalThis.campusDatabasePool = pool;
    }
    _databasePool = pool;
  }
  return _databasePool;
};

export const databasePool: Pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const pool = getDatabasePool();
    const value = (pool as unknown as Record<PropertyKey, unknown>)[prop];
    return typeof value === 'function' ? (value as Function).bind(pool) : value;
  },
});

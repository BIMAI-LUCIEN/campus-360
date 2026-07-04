import { Pool, type PoolConfig } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var campusDatabasePool: Pool | undefined;
}

const createPool = (): Pool => {
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

// Initialize the pool at module load, but DON'T throw if DATABASE_URL is
// missing. Vercel builds (and local dev without .env) won't have the env
// var set, and we don't want module-load errors to break the build. When
// the env var IS missing, the exported `databasePool` is a throwing
// Proxy that surfaces a clear error on first use, instead of a real
// Pool that better-auth's introspection might break.
//
// Previous version used a forward-Proxy that lazy-created the Pool on
// first property access. better-auth's internals (Symbol keys, `for in`,
// property assignment) didn't behave correctly through the Proxy and
// caused runtime 500s even when env vars were set.
let _databasePool: Pool | null = null;
try {
  _databasePool = globalThis.campusDatabasePool ?? createPool();
  _databasePool.on('error', (error) => {
    console.error('PostgreSQL idle connection was discarded.', error.message);
  });
  if (process.env.NODE_ENV !== 'production' && _databasePool) {
    globalThis.campusDatabasePool = _databasePool;
  }
} catch (err) {
  // DATABASE_URL missing — leave _databasePool null. The throwing Proxy
  // below will surface a clear error if/when the pool is actually used.
  console.warn(
    `[database] Pool not initialized at module load: ${(err as Error).message}`,
  );
}

const notConfiguredPool = new Proxy({} as Pool, {
  get() {
    throw new Error('DATABASE_URL is required.');
  },
});

export const databasePool: Pool = _databasePool ?? notConfiguredPool;
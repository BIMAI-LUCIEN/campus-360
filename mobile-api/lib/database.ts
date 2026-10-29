import { readFileSync } from 'node:fs';
import { Pool, type PoolConfig } from 'pg';

import { resolveDbSsl } from './db-ssl';

declare global {
  // eslint-disable-next-line no-var
  var campusDatabasePool: Pool | undefined;
}

const createPool = (): Pool => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required.');
  }

  const config: PoolConfig = {
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    keepAlive: true,
  };

  // TLS verified in production by default (lib/db-ssl.ts); localhost has no TLS.
  const ssl = resolveDbSsl(process.env, process.env.DATABASE_URL, (path) => readFileSync(path, 'utf8'));
  if (ssl) config.ssl = ssl;

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
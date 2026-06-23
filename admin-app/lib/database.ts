import { Pool } from 'pg';

declare global {
  var campusDatabasePool: Pool | undefined;
}

const createPool = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required.');
  }

  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
    connectionTimeoutMillis: 20_000,
    idleTimeoutMillis: 30_000,
    keepAlive: true,
  });
};

export const databasePool = globalThis.campusDatabasePool ?? createPool();

databasePool.on('error', (error) => {
  console.error('PostgreSQL idle connection was discarded.', error.message);
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.campusDatabasePool = databasePool;
}

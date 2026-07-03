import { Pool, type PoolConfig } from "pg";

// Singleton pool — Vercel serverless will reuse warm instances; this prevents
// the connection-storm problem of creating a new pool per invocation.
declare global {
  // eslint-disable-next-line no-var
  var __landingDbPool: Pool | undefined;
}

function createPool(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("[db] DATABASE_URL not set — auth will be disabled.");
    return null;
  }

  try {
    const rejectUnauthorized =
      (process.env.DATABASE_SSL_REJECT_UNAUTHORIZED ?? "false").toLowerCase() === "true";

    const config: PoolConfig = {
      connectionString: url,
      max: 5,
      connectionTimeoutMillis: 20_000,
      idleTimeoutMillis: 30_000,
      keepAlive: true,
    };

    const isLocal = /localhost|127\.0\.0\.1/.test(url);
    if (!isLocal) {
      config.ssl = { rejectUnauthorized };
    }

    const pool = new Pool(config);
    pool.on("error", (err) => {
      console.error("[db] idle pg connection error:", err.message);
    });
    return pool;
  } catch (err) {
    console.error("[db] Failed to create pool:", err);
    return null;
  }
}

const pool = globalThis.__landingDbPool ?? createPool();
if (pool) {
  globalThis.__landingDbPool = pool;
}

export const databasePool = pool;
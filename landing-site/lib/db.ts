import { Pool, type PoolConfig } from "pg";

// Singleton pool — Vercel serverless will reuse warm instances; this prevents
// the connection-storm problem of creating a new pool per invocation.
declare global {
  // eslint-disable-next-line no-var
  var __landingDbPool: Pool | undefined;
}

function createPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is required for Campus 360 landing auth. Set it in Vercel project settings or .env.local.",
    );
  }
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
  return new Pool(config);
}

export const databasePool: Pool =
  globalThis.__landingDbPool ?? (globalThis.__landingDbPool = createPool());

databasePool.on("error", (err) => {
  // Logged once on idle-connection errors — Vercel will rotate the instance.
  console.error("[db] idle pg connection error:", err.message);
});
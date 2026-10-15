// TLS options for the Postgres pool. In production the server certificate is
// verified by default; DATABASE_SSL_CA_FILE gives the Supabase CA certificate.
// DATABASE_SSL_REJECT_UNAUTHORIZED=false stays an explicit, visible exception.
// This file exists twice, identical: mobile-api/lib/db-ssl.ts and recruiter-web/lib/db-ssl.ts.

type Env = Record<string, string | undefined>;

export type DbSsl = false | { rejectUnauthorized: boolean; ca?: string };

export const resolveDbSsl = (env: Env, connectionString: string, readCa: (path: string) => string): DbSsl => {
  if (/localhost|127\.0\.0\.1/.test(connectionString)) return false;
  const flag = env.DATABASE_SSL_REJECT_UNAUTHORIZED?.trim().toLowerCase();
  const rejectUnauthorized = flag ? flag !== 'false' : env.NODE_ENV === 'production';
  const caFile = env.DATABASE_SSL_CA_FILE?.trim();
  if (caFile) return { rejectUnauthorized, ca: readCa(caFile) };
  return { rejectUnauthorized };
};

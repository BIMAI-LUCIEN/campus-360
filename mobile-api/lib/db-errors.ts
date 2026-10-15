// Single list of "database unreachable" signals, shared by mobileErrorResponse,
// the health check and the stage routes.

const DB_DOWN_MARKERS = [
  'ENOTFOUND',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'tenant/user',
  'DATABASE_URL is required',
  'fetch failed',
  'Connection terminated',
];

export const isDatabaseUnavailable = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  const code = String((error as { code?: unknown }).code ?? '');
  const message = String((error as { message?: unknown }).message ?? '');
  return DB_DOWN_MARKERS.some((marker) => code.includes(marker) || message.includes(marker));
};

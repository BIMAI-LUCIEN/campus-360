// Client IP for rate limiting. X-Forwarded-For is written by the client, so it
// is only trusted behind our own Nginx (TRUST_PROXY=true), and then only its
// LAST entry, the one Nginx appended. Never set TRUST_PROXY outside the VPS.
// No imports: loaded by tests.

type HeaderBag = { get(name: string): string | null };

export const clientIpFrom = (headers: HeaderBag, env: Record<string, string | undefined>): string => {
  if (env.TRUST_PROXY !== 'true') return 'unknown';
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const last = forwarded.split(',').map((part) => part.trim()).filter(Boolean).pop();
    if (last) return last;
  }
  const real = headers.get('x-real-ip')?.trim();
  return real || 'unknown';
};

import crypto from 'node:crypto';

// Short-lived HMAC URLs for stored files. Both hosts (Vercel API and the VPS
// files host) must share the same secret so one can sign what the other serves.

export const SIGNED_URL_TTL_SECONDS = 10 * 60;
const MAX_TTL_SECONDS = 60 * 60;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getSigningKey = (): Buffer => {
  const explicit = process.env.FILES_SIGNING_SECRET?.trim();
  if (explicit) return Buffer.from(explicit, 'utf8');
  // Domain-separated derivation from the shared auth secret, so no new secret is required.
  const authSecret = process.env.BETTER_AUTH_SECRET?.trim();
  if (authSecret) {
    return crypto.createHmac('sha256', authSecret).update('campus360-files-v1').digest();
  }
  throw new Error('FILES_SIGNING_SECRET (ou BETTER_AUTH_SECRET) doit être défini.');
};

const computeSignature = (fileId: string, expiresAt: number): string =>
  crypto.createHmac('sha256', getSigningKey()).update(`${fileId.toLowerCase()}.${expiresAt}`).digest('base64url');

export const DEFAULT_FILES_PUBLIC_URL = 'https://files.campus360b.site';

// In production files are always served by the files host (the VPS), even when
// the URL is signed on Vercel. In development the API serves its own files.
export const getFilesPublicBaseUrl = (requestOrigin?: string): string => {
  const configured = process.env.FILES_PUBLIC_URL?.trim();
  const fallback = process.env.NODE_ENV === 'production' ? DEFAULT_FILES_PUBLIC_URL : requestOrigin;
  const base = configured || fallback || '';
  if (!base) throw new Error('FILES_PUBLIC_URL doit être défini.');
  return base.replace(/\/+$/, '');
};

export const signFileUrl = (
  fileId: string,
  options: { baseUrl: string; ttlSeconds?: number; now?: number },
): { url: string; expiresAt: number } => {
  if (!UUID_RE.test(fileId)) throw new Error('Identifiant de fichier invalide.');
  const ttl = Math.min(Math.max(options.ttlSeconds ?? SIGNED_URL_TTL_SECONDS, 1), MAX_TTL_SECONDS);
  const now = options.now ?? Math.floor(Date.now() / 1000);
  const expiresAt = now + ttl;
  const sig = computeSignature(fileId, expiresAt);
  const url = `${options.baseUrl.replace(/\/+$/, '')}/api/files/${fileId.toLowerCase()}?exp=${expiresAt}&sig=${sig}`;
  return { url, expiresAt };
};

export type SignatureCheck = 'valid' | 'expired' | 'invalid';

export const verifyFileSignature = (
  fileId: string,
  exp: string | null,
  sig: string | null,
  now: number = Math.floor(Date.now() / 1000),
): SignatureCheck => {
  if (!UUID_RE.test(fileId) || !exp || !sig || !/^\d{1,12}$/.test(exp)) return 'invalid';
  const expiresAt = Number(exp);
  const expected = Buffer.from(computeSignature(fileId, expiresAt));
  const received = Buffer.from(sig);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return 'invalid';
  if (expiresAt < now) return 'expired';
  if (expiresAt > now + MAX_TTL_SECONDS) return 'invalid';
  return 'valid';
};

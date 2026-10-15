// Single source of truth for trusted browser origins (CORS, Better Auth,
// middleware). No wildcard: a domain we do not own (shared Vercel or Expo hosts)
// must never be trusted. One-off preview domains go in TRUSTED_EXTRA_ORIGINS.
// No imports: also loaded by the edge middleware and by tests.

type Env = Record<string, string | undefined>;

export const PRODUCTION_WEB_ORIGINS = [
  'https://campus360b.site',
  'https://www.campus360b.site',
  'https://admin.campus360b.site',
  'https://api.campus360b.site',
];

// Native app deep-link schemes (becomes campus360:// with task 23.17).
export const APP_SCHEMES = ['campus-bordes://'];

export const LOCAL_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:8081',
  'http://localhost:8082',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:8081',
];

// Private LAN IPs: a phone on the same Wi-Fi reaches the dev machine by its LAN IP.
const LAN_ORIGIN_PATTERN =
  /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}):\d+$/;
const LOCALHOST_PATTERN = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

// TRUSTED_EXTRA_ORIGINS, plus CORS_ALLOWED_ORIGINS (deprecated, read during the transition).
export const extraOrigins = (env: Env): string[] =>
  [env.TRUSTED_EXTRA_ORIGINS, env.CORS_ALLOWED_ORIGINS]
    .flatMap((value) => (value ?? '').split(','))
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && !value.includes('*'));

export const isTrustedOrigin = (origin: string, env: Env): boolean => {
  if (!origin) return false;
  if (PRODUCTION_WEB_ORIGINS.includes(origin)) return true;
  if (APP_SCHEMES.some((scheme) => origin.startsWith(scheme))) return true;
  if (extraOrigins(env).includes(origin)) return true;
  if (env.NODE_ENV === 'production') return false;
  return origin.startsWith('exp://') || LOCALHOST_PATTERN.test(origin) || LAN_ORIGIN_PATTERN.test(origin);
};

// Exact list for Better Auth `trustedOrigins` (it cannot take a predicate).
export const trustedOriginList = (env: Env): string[] => {
  const list = [...PRODUCTION_WEB_ORIGINS, ...APP_SCHEMES, ...extraOrigins(env)];
  if (env.NODE_ENV !== 'production') list.push(...LOCAL_DEV_ORIGINS, 'exp://');
  return Array.from(new Set(list));
};

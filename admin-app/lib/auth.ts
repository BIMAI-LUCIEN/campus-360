import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { admin } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';

import { databasePool } from './database';
import {
  LOGIN_THROTTLE_LIMITS,
  checkLoginThrottle,
  recordLoginFailure,
  recordLoginSuccess,
} from './login-throttle';
import { sendPasswordResetEmail, sendVerificationEmail } from './mailer';

// ────────────────────────────────────────────────────────────────────────
// Trusted origins — production domains MUST be hardcoded so auth works
// even when env vars point at localhost. The custom domain is the primary
// production entry point.
// ────────────────────────────────────────────────────────────────────────
const PRODUCTION_ORIGINS = [
  'https://admin.campus360b.site',
  'https://admin.campus-bordes.com',
  'https://campus-360-hi97.vercel.app',
  'https://campus-360-two.vercel.app',
  'https://campus-360-bimai-s-projects.vercel.app',
];

const LOCAL_DEV_ORIGINS = [
  'campus-bordes://',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:8082',
  'http://127.0.0.1:8082',
];

const parseOriginList = (raw: string | undefined): string[] =>
  (raw ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry): entry is string => Boolean(entry));

const detectBaseUrl = (): string => {
  const envUrl = process.env.BETTER_AUTH_URL;
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }
  // Default to the custom production domain.
  return 'https://admin.campus360b.site';
};

// Build the trusted origins list. Production origins are ALWAYS trusted
// regardless of env. Local dev origins are added too so developers can test.
const trustedOrigins = [
  ...LOCAL_DEV_ORIGINS,
  ...PRODUCTION_ORIGINS,
  // Env var overrides — only if set to a non-localhost URL.
  process.env.BETTER_AUTH_URL && !process.env.BETTER_AUTH_URL.includes('localhost')
    ? process.env.BETTER_AUTH_URL
    : undefined,
  process.env.EXPO_APP_ORIGIN,
  process.env.TRUSTED_EXTRA_ORIGINS,
]
  .filter(Boolean)
  .flatMap((value) => (typeof value === 'string' && value.includes(',') ? parseOriginList(value) : [value]))
  .filter((value): value is string => typeof value === 'string' && value.length > 0);

const isProd = process.env.NODE_ENV === 'production';
const baseURL = detectBaseUrl();

// ────────────────────────────────────────────────────────────────────────
// Google OAuth — only enable if BOTH client ID and secret look real.
// Better Auth crashes at boot if these are empty strings or placeholder
// values. We omit the socialProviders.google block entirely when config is
// missing so the route still works for email/password.
// ────────────────────────────────────────────────────────────────────────
const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
const googleConfigured =
  googleClientId &&
  googleClientSecret &&
  googleClientId.length > 10 &&
  googleClientSecret.length > 10 &&
  !googleClientId.startsWith('replace') &&
  !googleClientSecret.startsWith('replace');

// BETTER_AUTH_SECRET validation is deferred until the auth instance is
// actually instantiated (see `initAuth` below). Doing it at module load
// would break `next build` on Vercel, where env vars aren't always
// exposed during the build phase. The runtime contract is unchanged:
// missing secret throws in production, dev-only fallback otherwise.

// Cookie hardening. In production we require secure=true so the session cookie
// is only ever sent over HTTPS. SameSite=lax balances protection against CSRF
// against the deep-link flow used by Expo (`campus-bordes://`).
const sessionCookieConfig = {
  expiresIn: 60 * 60 * 24 * 7, // 7 days
  updateAge: 60 * 60 * 24, // refresh the rolling expiration once per day
  cookieCache: {
    enabled: true,
    maxAge: 5 * 60, // 5 min in-memory cache to avoid hammering the DB
  },
  cookie: {
    name: 'better-auth.session_token',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProd,
    path: '/',
  },
};

// Build the Better Auth config. We conditionally add Google so a missing
// Google config doesn't break the whole auth system.
const buildBetterAuthConfig = (): Parameters<typeof betterAuth>[0] => {
  // Resolve and validate BETTER_AUTH_SECRET here so the throw only fires
  // when the auth instance is actually needed — never at module load.
  const authSecret = process.env.BETTER_AUTH_SECRET?.trim();
  if (!authSecret) {
    if (isProd) {
      throw new Error(
        'BETTER_AUTH_SECRET is required in production. Generate one with: openssl rand -hex 32',
      );
    }
    console.warn(
      '[auth] BETTER_AUTH_SECRET not set — using development fallback. Set a strong secret before deploying.',
    );
  }
  const finalSecret = authSecret || 'dev-only-insecure-secret-do-not-use-in-prod-please';

  if (isProd && authSecret === 'replace-with-openssl-rand-base64-32') {
    throw new Error(
      'BETTER_AUTH_SECRET is still the documented placeholder. Rotate it before deploying to production.',
    );
  }

  const config: Parameters<typeof betterAuth>[0] = {
    appName: 'Campus-Bordes',
    database: databasePool,
    baseURL,
    secret: finalSecret,
    trustedOrigins,
    emailAndPassword: {
      enabled: true,
      // DON'T require email verification — it blocks sign-in when SMTP is
      // misconfigured. The mobile flow handles verification separately, and
      // admins can manually verify if needed.
      requireEmailVerification: false,
      autoSignIn: true,
      minPasswordLength: 8,
      sendResetPassword: async ({ user, url }) => {
        try {
          await sendPasswordResetEmail({ email: user.email, name: user.name, url });
        } catch (err) {
          console.error('[auth] sendResetPassword failed:', err);
        }
      },
      resetPasswordTokenExpiresIn: 60 * 30, // 30 minutes
    },
    user: {
      additionalFields: {
        role: {
          type: 'string',
          required: false,
          defaultValue: 'student',
          input: false,
        },
        phone: {
          type: 'string',
          required: false,
        },
        whatsappPhone: {
          type: 'string',
          required: false,
        },
        university: {
          type: 'string',
          required: false,
        },
        faculty: {
          type: 'string',
          required: false,
        },
        level: {
          type: 'string',
          required: false,
        },
      },
    },
    session: sessionCookieConfig,
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProd,
      },
    },
    plugins: [
      expo(),
      admin({
        defaultRole: 'student',
        adminRoles: ['admin'],
      }),
      nextCookies(),
    ],
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      storage: 'database',
    },
    onAPIError: {
      onError: async (error, ctx) => {
        try {
          const path = (ctx as unknown as { path?: string }).path ?? '';
          if (path !== '/sign-in/email' && path !== '/sign-up/email') return;
          const req = (ctx as unknown as { request?: Request }).request;
          if (!req) return;

          const cloned = req.clone();
          let email = '';
          try {
            const text = await cloned.text();
            if (text) {
              const parsed = JSON.parse(text) as { email?: string };
              email = typeof parsed.email === 'string' ? parsed.email : '';
            }
          } catch {
            // Body wasn't JSON; ignore.
          }
          if (email) {
            await recordLoginFailure(req, email);
          }
        } catch (err) {
          console.error('onAPIError handler failed', err);
        }
        // Log to Vercel runtime logs so we can see what's crashing.
        console.error('[auth error]', (error as Error)?.message, (error as Error)?.stack);
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const path = ctx.path;

        // Brute-force throttle on /sign-in/email and /sign-up/email.
        if (path === '/sign-in/email' || path === '/sign-up/email') {
          const body = (ctx.body ?? {}) as { email?: string };
          const email = typeof body.email === 'string' ? body.email : '';
          if (email && ctx.request) {
            const verdict = await checkLoginThrottle(ctx.request, email);
            if (verdict.blocked) {
              return new Response(
                JSON.stringify({
                  error: 'Trop de tentatives. Reessaie plus tard.',
                  retryAfter: verdict.retryAfterSeconds,
                }),
                {
                  status: 429,
                  headers: {
                    'Content-Type': 'application/json',
                    'Retry-After': String(verdict.retryAfterSeconds),
                  },
                },
              );
            }
          }
        }
        return undefined;
      }),
    },
  };

  // Only enable Google social provider if credentials are properly configured.
  // This prevents the entire auth system from crashing if Google env vars are
  // missing or contain placeholder values.
  if (googleConfigured) {
    config.socialProviders = {
      google: {
        clientId: googleClientId!,
        clientSecret: googleClientSecret!,
      },
    };
  } else {
    console.warn(
      '[auth] Google OAuth not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing or invalid). Google sign-in is disabled, but email/password works.',
    );
  }

  return config;
};

// Lazy `auth` instance: Next.js evaluates modules during "Collecting page data"
// at build time. Instantiating Better Auth eagerly requires BETTER_AUTH_SECRET
// (and would connect to the DB through the lazy `databasePool`). Deferring
// instantiation to the first property access (`auth.handler(...)`,
// `auth.api.signInEmail(...)`, etc.) keeps the build green even when those
// env vars aren't exposed during builds on Vercel. The exported `auth` object
// is a Proxy, so all existing call sites (`auth.handler`, `auth.api.*`,
// `auth.options`) keep working without changes.
let _authInstance: ReturnType<typeof betterAuth> | undefined;
const initAuth = (): ReturnType<typeof betterAuth> => {
  if (!_authInstance) {
    _authInstance = betterAuth(buildBetterAuthConfig());
  }
  return _authInstance;
};

type AuthShape = ReturnType<typeof betterAuth>;
export const auth = new Proxy({} as AuthShape, {
  get(_target, prop) {
    const inst = initAuth();
    const value = (inst as unknown as Record<PropertyKey, unknown>)[prop];
    return typeof value === 'function' ? (value as Function).bind(inst) : value;
  },
});

export const AUTH_LIMITS = {
  ...LOGIN_THROTTLE_LIMITS,
  SESSION_MAX_AGE_SECONDS: sessionCookieConfig.expiresIn,
  SESSION_REFRESH_SECONDS: sessionCookieConfig.updateAge,
  PASSWORD_RESET_TTL_SECONDS: 60 * 30,
  MIN_PASSWORD_LENGTH: 8,
} as const;

export const AUTH_CONFIG = {
  baseURL,
  googleEnabled: googleConfigured,
  trustedOrigins,
  isProd,
} as const;
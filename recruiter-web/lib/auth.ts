import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { admin, bearer, emailOTP } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import path from 'node:path';
import fs from 'node:fs';

import { databasePool } from './database';
import { trustedOriginList } from './origins';
import {
  LOGIN_THROTTLE_LIMITS,
  checkLoginThrottle,
  recordLoginFailure,
} from './login-throttle';
import { isEmailDeliveryConfigured, sendOtpEmail, sendPasswordResetEmail } from './mailer';

// ────────────────────────────────────────────────────────────────────────
// Trusted origins — production domains MUST be hardcoded so auth works
// even when env vars point at localhost. The custom domain is the primary
// production entry point.
// ────────────────────────────────────────────────────────────────────────
// LAN IP wildcards (dev only) — a phone on the same Wi-Fi as the dev machine
// hits the host's LAN IP (e.g. http://10.66.47.18:8081) instead of localhost,
// so those origins need to be trusted too. Better Auth supports glob patterns
// here (see trusted-origins.mjs / wildcardMatch).
const LAN_DEV_ORIGINS =
  process.env.NODE_ENV === 'production'
    ? []
    : [
        'http://192.168.*:*',
        'http://10.*:*',
        'http://172.16.*:*',
        'http://172.17.*:*',
        'http://172.18.*:*',
        'http://172.19.*:*',
        'http://172.2*.*:*',
        'http://172.3*.*:*',
      ];

const parseOriginList = (raw: string | undefined): string[] =>
  (raw ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry): entry is string => Boolean(entry));

const detectBaseUrl = (): string => {
  const envUrl = process.env.BETTER_AUTH_URL;
  const isLocalUrl = envUrl && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'));
  // The "ignore localhost, fall back to prod" safety net only makes sense in
  // production (guards against a Vercel deploy where the env var was left
  // pointing at a dev template value). In development this must NOT trigger:
  // a locally-configured baseURL is legitimate there, and silently swapping
  // it for the production domain breaks session/cookie context (the
  // configured baseURL and the actual request host diverge), which makes
  // Better Auth reject otherwise-valid sessions issued by the other service.
  if (envUrl && (process.env.NODE_ENV !== 'production' || !isLocalUrl)) {
    return envUrl;
  }
  // Default to the custom production domain.
  return 'https://admin.campus360b.site';
};

// Trusted origins: exact list from lib/origins.ts (no wildcard on domains we
// do not own), LAN IPs in development, and our own public URL.
const trustedOrigins = [
  ...trustedOriginList(process.env),
  ...LAN_DEV_ORIGINS,
  process.env.BETTER_AUTH_URL && !process.env.BETTER_AUTH_URL.includes('localhost')
    ? process.env.BETTER_AUTH_URL
    : undefined,
  ...parseOriginList(process.env.EXPO_APP_ORIGIN),
].filter((value): value is string => typeof value === 'string' && value.length > 0);

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

  const getAuthDatabase = () => {
    // In production on Vercel with PostgreSQL configured, use databasePool
    if (isProd && process.env.DATABASE_URL) {
      return databasePool;
    }
    // In development or when explicitly requested, use local SQLite database if present
    const sqlitePath = path.resolve(process.cwd(), 'campus360-admin.sqlite');
    if (fs.existsSync(sqlitePath) && process.env.AUTH_FORCE_POSTGRES !== 'true') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { DatabaseSync } = require('node:sqlite');
        return new DatabaseSync(sqlitePath);
      } catch (err) {
        console.warn('[auth] SQLite load failed, falling back to databasePool:', (err as Error).message);
      }
    }
    return databasePool;
  };

  if (isProd && !isEmailDeliveryConfigured()) {
    throw new Error('RESEND_API_KEY est obligatoire en production (vérification des e-mails).');
  }
  const config: Parameters<typeof betterAuth>[0] = {
    appName: 'Campus-Bordes',
    database: getAuthDatabase(),
    baseURL,
    secret: finalSecret,
    trustedOrigins,
    emailVerification: {
      // Sent as a 6-digit OTP (emailOTP.overrideDefaultEmailVerification).
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
    },
    emailAndPassword: {
      enabled: true,
      // Not enforced here: this instance also serves the admin web login, which
      // has no OTP screen. The mobile app enforces the OTP step itself, and
      // mobile-api (production mobile backend) enforces it server-side.
      // Mandatory in production, admins included (decision 10).
      requireEmailVerification: isProd,
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
      bearer(),
      admin({
        defaultRole: 'student',
        adminRoles: ['admin'],
      }),
      emailOTP({
        otpLength: 6,
        expiresIn: 10 * 60,
        allowedAttempts: 5,
        storeOTP: 'hashed',
        overrideDefaultEmailVerification: true,
        disableSignUp: true,
        rateLimit: { window: 60, max: 3 },
        sendVerificationOTP: async ({ email, otp, type }) => {
          try {
            await sendOtpEmail({ email, otp, type });
          } catch (err) {
            console.error('[auth] sendVerificationOTP failed:', err);
          }
        },
      }),
      nextCookies(),
    ],
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      storage: isProd ? 'database' : 'memory',
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

          // Mobile app only: an unverified account must confirm its email with the OTP first.
          // Admin web sign-in (no expo-origin header) keeps its existing behaviour.
          if (path === '/sign-in/email' && ctx.request?.headers.get('expo-origin') && email) {
            const { rows } = await databasePool.query<{ email_verified: boolean }>(
              'select "emailVerified" as email_verified from public."user" where lower(email) = lower($1) limit 1',
              [email],
            );
            if (rows[0] && rows[0].email_verified !== true) {
              return new Response(
                JSON.stringify({
                  message: 'Confirme ton adresse email avec le code reçu.',
                  code: 'EMAIL_NOT_VERIFIED',
                }),
                { status: 403, headers: { 'Content-Type': 'application/json' } },
              );
            }
          }
        }
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

// Initialize Better Auth at module load, but DON'T throw if env vars are
// missing. Vercel builds (and local dev without .env) won't have
// BETTER_AUTH_SECRET / DATABASE_URL set, and we don't want module-load
// errors to break the build. When init fails, the exported `auth` is a
// throwing Proxy that surfaces a clear error on first use.
//
// Previous version used a forward-Proxy that lazy-initialized the auth
// instance on first property access. better-auth's internals (Symbol
// keys, `for in`, property assignment) didn't behave correctly through
// the Proxy and caused runtime 500s even when env vars were set.
let _authInstance: ReturnType<typeof betterAuth> | null = null;
try {
  _authInstance = betterAuth(buildBetterAuthConfig());
} catch (err) {
  // BETTER_AUTH_SECRET / DATABASE_URL missing or invalid — leave the
  // instance null. The throwing Proxy below will surface a clear error
  // if/when auth is actually used.
  console.warn(`[auth] Better Auth not initialized at module load: ${(err as Error).message}`);
}

const notConfiguredAuth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get() {
    throw new Error(
      'Better Auth is not configured (check BETTER_AUTH_SECRET, DATABASE_URL, etc.)',
    );
  },
});

export const auth = (_authInstance ?? notConfiguredAuth) as ReturnType<typeof betterAuth>;

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
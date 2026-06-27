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

// Trusted origins are now an EXPLICIT allowlist read from env. No more
// auto-discovery of every local IPv4 — that previously let any LAN host
// be treated as a trusted origin.
const parseOriginList = (raw: string | undefined): string[] =>
  (raw ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry): entry is string => Boolean(entry));

// Trusted origins — production domains MUST be hardcoded so auth works even
// when env vars point at localhost. The custom domain is the primary
// production entry point.
const PRODUCTION_ORIGINS = [
  'https://admin.campus360b.site',
  'https://admin.campus-bordes.com',
  'https://campus-360-hi97.vercel.app',
  'https://campus-360-two.vercel.app',
  'https://campus-360-bimai-s-projects.vercel.app',
];

// Auto-detect the production baseURL from the custom domain if no env var is
// set or it points at localhost.
const detectBaseUrl = (): string => {
  const envUrl = process.env.BETTER_AUTH_URL;
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }
  // Default to the custom production domain.
  return 'https://admin.campus360b.site';
};

const trustedOrigins = [
  'campus-bordes://',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:8082',
  'http://127.0.0.1:8082',
  // Production origins are ALWAYS trusted (no env required).
  ...PRODUCTION_ORIGINS,
  // Override from env if explicitly set to a non-localhost URL.
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

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error(
    'BETTER_AUTH_SECRET is required. Generate one with: openssl rand -hex 32',
  );
}

// Reject the documented placeholder secret outside dev — protects against a
// forgotten rotation on the way to production.
if (isProd && process.env.BETTER_AUTH_SECRET === 'replace-with-openssl-rand-base64-32') {
  throw new Error(
    'BETTER_AUTH_SECRET is still the documented placeholder. Rotate it before deploying to production.',
  );
}

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

export const auth = betterAuth({
  appName: 'Campus-Bordes',
  database: databasePool,
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    // Block sign-in until the email is verified. The mobile flow handles the
    // post-verify re-login, and Google sign-in skips verification entirely.
    requireEmailVerification: true,
    autoSignIn: false,
    minPasswordLength: 10,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ email: user.email, name: user.name, url });
    },
    resetPasswordTokenExpiresIn: 60 * 30, // 30 minutes
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({ email: user.email, name: user.name, url });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
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
    // 1 MB is plenty for the JSON bodies we accept. Anything larger is
    // almost certainly an attack or a client bug.
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
      // Increment the (email, IP) failure counter for sign-in/sign-up attempts.
      // Better Auth's `after` hook doesn't get the response status, so we use
      // onAPIError to detect failures. We can read the request body via
      // ctx.request which is the inbound HTTP request.
      try {
        const path = (ctx as unknown as { path?: string }).path ?? '';
        if (path !== '/sign-in/email' && path !== '/sign-up/email') return;
        const req = (ctx as unknown as { request?: Request }).request;
        if (!req) return;

        // Re-parse the body — it might already be consumed.
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
      // Don't swallow the error — Better Auth will still surface it to the client.
      console.error('[auth error]', (error as Error)?.message);
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const path = ctx.path;

      // Brute-force throttle on /sign-in/email and /sign-up/email.
      // Better Auth's own rate-limit is generic; we want a tighter, per-(email, IP)
      // counter that survives across the global rate-limit window so attackers
      // can't rotate IPs to slip through.
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
});

export const AUTH_LIMITS = {
  ...LOGIN_THROTTLE_LIMITS,
  SESSION_MAX_AGE_SECONDS: sessionCookieConfig.expiresIn,
  SESSION_REFRESH_SECONDS: sessionCookieConfig.updateAge,
  PASSWORD_RESET_TTL_SECONDS: 60 * 30,
  MIN_PASSWORD_LENGTH: 10,
} as const;
import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';

import { databasePool } from './database';
import { sendPasswordResetEmail, sendVerificationEmail } from './mailer';

// Trusted origins are now an EXPLICIT allowlist read from env. No more
// auto-discovery of every local IPv4 — that previously let any LAN host
// be treated as a trusted origin.
const parseOriginList = (raw: string | undefined): string[] =>
  (raw ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry): entry is string => Boolean(entry));

const trustedOrigins = [
  'campus-360://',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:8082',
  'http://127.0.0.1:8082',
  // Public-facing web origin (set via env in production).
  'https://campus-360-hi97.vercel.app',
  process.env.BETTER_AUTH_URL,
  process.env.EXPO_APP_ORIGIN,
  process.env.TRUSTED_EXTRA_ORIGINS,
]
  .filter(Boolean)
  .flatMap((value) => (typeof value === 'string' && value.includes(',') ? parseOriginList(value) : [value]))
  .filter((value): value is string => typeof value === 'string' && value.length > 0);

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error(
    'BETTER_AUTH_SECRET is required. Generate one with: openssl rand -hex 32',
  );
}

export const auth = betterAuth({
  appName: 'Campus 360',
  database: databasePool,
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ email: user.email, name: user.name, url });
    },
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
});

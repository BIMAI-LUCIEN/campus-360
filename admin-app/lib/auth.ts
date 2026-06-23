import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';

import { databasePool } from './database';
import { sendPasswordResetEmail, sendVerificationEmail } from './mailer';

const trustedOrigins = [
  'campus-bordes://',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:8082',
  'http://127.0.0.1:8082',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://10.48.198.18:8081',
  'http://10.48.198.18:8082',
  'http://10.48.198.18:3001',
  process.env.BETTER_AUTH_URL,
  process.env.EXPO_APP_ORIGIN,
].filter((origin): origin is string => Boolean(origin));

export const auth = betterAuth({
  appName: 'Campus-Bordes',
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

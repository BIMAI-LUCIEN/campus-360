import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { databasePool } from "./db";

const isProd = process.env.NODE_ENV === "production";

const PRODUCTION_ORIGINS = [
  "https://campus360b.site",
  "https://www.campus360b.site",
  "https://campus-360-landing.vercel.app",
  "https://admin.campus360b.site",
];

const LOCAL_DEV_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "campus-bordes://",
];

const parseOriginList = (raw: string | undefined): string[] =>
  (raw ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter((e): e is string => Boolean(e));

const detectBaseUrl = (): string => {
  const envUrl = process.env.BETTER_AUTH_URL;
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl;
  }
  return "https://campus360b.site";
};

const trustedOrigins = [
  ...LOCAL_DEV_ORIGINS,
  ...PRODUCTION_ORIGINS,
  process.env.BETTER_AUTH_URL && !process.env.BETTER_AUTH_URL.includes("localhost")
    ? process.env.BETTER_AUTH_URL
    : undefined,
  process.env.TRUSTED_EXTRA_ORIGINS,
]
  .filter(Boolean)
  .flatMap((v) =>
    typeof v === "string" && v.includes(",") ? parseOriginList(v) : [v],
  )
  .filter((v): v is string => typeof v === "string" && v.length > 0);

// Google OAuth — only enable if both client ID and secret look real.
const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
const googleConfigured =
  !!googleClientId &&
  !!googleClientSecret &&
  googleClientId.length > 10 &&
  googleClientSecret.length > 10 &&
  !googleClientId.startsWith("replace") &&
  !googleClientSecret.startsWith("replace");

// Secret with dev fallback (refuses to start in prod without one).
const authSecret = process.env.BETTER_AUTH_SECRET?.trim();
if (!authSecret) {
  if (isProd) {
    throw new Error(
      "BETTER_AUTH_SECRET is required in production. Run: openssl rand -hex 32",
    );
  }
  console.warn(
    "[auth] BETTER_AUTH_SECRET not set — using dev fallback. Set one before deploying.",
  );
}
const finalSecret = authSecret || "dev-only-insecure-secret-do-not-use-in-prod";

const baseURL = detectBaseUrl();

if (!googleConfigured) {
  console.warn(
    "[auth] Google OAuth not configured — Google sign-in disabled, email/password works.",
  );
}

const config: Parameters<typeof betterAuth>[0] = {
  appName: "Campus 360",
  database: databasePool,
  baseURL,
  secret: finalSecret,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: true,
    minPasswordLength: 8,
    resetPasswordTokenExpiresIn: 60 * 30,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "student",
        input: false,
      },
      university: { type: "string", required: false },
      faculty: { type: "string", required: false },
      level: { type: "string", required: false },
    },
  },
  session: {
  expiresIn: 60 * 60 * 24 * 7,
  updateAge: 60 * 60 * 24,
  cookieCache: { enabled: true, maxAge: 5 * 60 },
},
advanced: {
  defaultCookieAttributes: {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
  },
  // Force a specific session cookie name + perms — useful because the
  // landing-site and admin app are separate Vercel projects and we want
  // the cookie to match if the user ever crosses over.
  cookiePrefix: "campus-landing",
  useSecureCookies: isProd,
},
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    storage: "database",
  },
  plugins: [nextCookies()],
};

// Only attach socialProviders when Google is fully configured.
if (googleConfigured) {
  config.socialProviders = {
    google: {
      clientId: googleClientId!,
      clientSecret: googleClientSecret!,
    },
  };
}

export const auth = betterAuth(config);

export const AUTH_CONFIG = {
  baseURL,
  googleEnabled: googleConfigured,
  trustedOrigins,
  isProd,
} as const;
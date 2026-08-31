import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { databasePool } from "./db";

const isProd = process.env.NODE_ENV === "production";

const PRODUCTION_ORIGINS = [
  "https://campus360b.site",
  "https://www.campus360b.site",
  "https://api.campus360b.site",
  "https://admin.campus360b.site",
  "https://campus-360-landing-ke5ahqi0c-bimai-s-projects.vercel.app",
  "https://campus-360-landing.vercel.app",
  "https://*.vercel.app",
  "https://*.expo.dev",
  "https://*.exp.direct",
  "exp://*",
  "campus-bordes://*",
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
  // Prefer the explicit BETTER_AUTH_URL (custom domain). This MUST match the
  // redirect_uri registered in Google Cloud Console for OAuth to succeed.
  // VERCEL_URL is a per-deployment hash like campus-360-landing-go1egq3bm-...
  // and won't be in the OAuth client's authorized redirect URIs.
  const envUrl = process.env.BETTER_AUTH_URL;
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
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

// Secret with dev fallback
const authSecret = process.env.BETTER_AUTH_SECRET?.trim();
const finalSecret = authSecret || "dev-only-insecure-secret-do-not-use-in-prod";
if (!authSecret && isProd) {
  console.warn("[auth] BETTER_AUTH_SECRET not set — using fallback in production.");
}

const baseURL = detectBaseUrl();

if (!googleConfigured) {
  console.warn("[auth] Google OAuth not configured — email/password only.");
}

// ─── Auth initialisation ─────────────────────────────────────────────────────
// Si la DB n'est pas configurée, betterAuth lève une erreur au build/start.
// On catch pour que la page d'accueil reste accessible même si la DB est down.
// ─────────────────────────────────────────────────────────────────────────────
let auth: ReturnType<typeof betterAuth> | null = null;
let authAvailable = false;

if (databasePool) {
  try {
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

    if (googleConfigured) {
      config.socialProviders = {
        google: {
          clientId: googleClientId!,
          clientSecret: googleClientSecret!,
        },
      };
    }

    auth = betterAuth(config);
    authAvailable = true;
  } catch (err) {
    console.error("[auth] Failed to initialize Better Auth:", err);
  }
} else {
  console.warn("[auth] No database — Better Auth disabled. Set DATABASE_URL to enable auth.");
}

export { auth, authAvailable };

export const AUTH_CONFIG = {
  baseURL,
  googleEnabled: googleConfigured,
  trustedOrigins,
  isProd,
} as const;
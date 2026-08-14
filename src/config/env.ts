// NOTE: `process.env.EXPO_PUBLIC_*` MUST be accessed as a plain member
// expression (no optional chaining). Metro/babel-preset-expo inlines these at
// build time by matching `process.env.EXPO_PUBLIC_NAME` literally; writing
// `process.env?.EXPO_PUBLIC_NAME` defeats the transform, so the value is never
// inlined and the code silently falls back to the defaults below — which is
// what caused release builds to hit `http://localhost:3001` and fail with
// "Network request failed" on device.
declare const process: {
  env: Record<string, string | undefined>;
};

export type PublicEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  aiProxyUrl: string;
  authUrl: string;
  authWebUrl: string;
  adminUrl: string;
};

// Production fallbacks below are intentional. EXPO_PUBLIC_* vars are inlined at
// build/export time; if an export ever runs without them (e.g. an OTA publish
// whose CI env is incomplete), the app must still reach production rather than
// silently degrade to empty config and break the catalog. The Supabase anon key
// is a public client key (already shipped in the bundle by design), so hardcoding
// it as a last-resort default is safe. NEVER put the service_role key here.
const SUPABASE_URL_FALLBACK = 'https://zlzwoqqnkvxndmtnzdsm.supabase.co';
const SUPABASE_ANON_KEY_FALLBACK =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsendvcXFua3Z4bmRtdG56ZHNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MzM0ODYsImV4cCI6MjA5NzMwOTQ4Nn0.gp2SJZUeNCw4SQ8oekW8uMuUWcPoa4Zg3d4bKQgEQyQ';

export const publicEnv: PublicEnv = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || SUPABASE_URL_FALLBACK,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_FALLBACK,
  aiProxyUrl: process.env.EXPO_PUBLIC_AI_PROXY_URL || 'https://api.campus360b.site/api/ai/pdf-chat',
  authUrl: process.env.EXPO_PUBLIC_AUTH_URL || 'https://api.campus360b.site',
  authWebUrl: process.env.EXPO_PUBLIC_AUTH_WEB_URL || 'https://admin.campus360b.site',
  adminUrl: process.env.EXPO_PUBLIC_ADMIN_URL || 'https://admin.campus360b.site',
};

export const isSupabaseConfigured = () =>
  Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);

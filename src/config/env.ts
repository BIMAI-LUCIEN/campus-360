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

export const publicEnv: PublicEnv = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  aiProxyUrl: process.env.EXPO_PUBLIC_AI_PROXY_URL ?? '',
  authUrl: process.env.EXPO_PUBLIC_AUTH_URL ?? 'https://api.campus360b.site',
  authWebUrl: process.env.EXPO_PUBLIC_AUTH_WEB_URL ?? 'https://admin.campus360b.site',
  adminUrl: process.env.EXPO_PUBLIC_ADMIN_URL ?? 'https://admin.campus360b.site',
};

export const isSupabaseConfigured = () =>
  Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);

declare const process: {
  env?: Record<string, string | undefined>;
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
  supabaseUrl: process.env?.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  aiProxyUrl: process.env?.EXPO_PUBLIC_AI_PROXY_URL ?? '',
  authUrl: process.env?.EXPO_PUBLIC_AUTH_URL ?? 'http://localhost:3001',
  authWebUrl: process.env?.EXPO_PUBLIC_AUTH_WEB_URL ?? 'http://localhost:3001',
  adminUrl: process.env?.EXPO_PUBLIC_ADMIN_URL ?? 'https://admin.campus360b.site',
};

export const isSupabaseConfigured = () =>
  Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);

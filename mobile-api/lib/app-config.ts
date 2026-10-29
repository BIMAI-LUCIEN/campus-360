import { databasePool } from './database';

/**
 * Remote app configuration edited from the admin dashboard (table `app_config`).
 * The mobile app reads it at startup through GET /api/mobile/config, and the
 * server enforces the feature switches itself so older builds are covered too.
 * Read failures fall back to safe defaults: the app is never blocked by a
 * missing row or an unreachable database.
 */

export type AppConfig = {
  maintenance: { enabled: boolean; message: string };
  minVersion: { android: string; ios: string; recommended: string; updateUrl: string };
  features: { ai: boolean; payments: boolean; stages: boolean; pdf: boolean; documents: boolean };
  announcement: { enabled: boolean; title: string; message: string; tone: 'info' | 'success' | 'warning'; link: string };
};

export const DEFAULT_APP_CONFIG: AppConfig = {
  maintenance: { enabled: false, message: '' },
  minVersion: { android: '0.0.0', ios: '0.0.0', recommended: '0.0.0', updateUrl: 'https://campus360b.site' },
  features: { ai: true, payments: true, stages: true, pdf: true, documents: true },
  announcement: { enabled: false, title: '', message: '', tone: 'info', link: '' },
};

const KEY_MAP: Record<string, keyof AppConfig> = {
  maintenance: 'maintenance',
  min_version: 'minVersion',
  features: 'features',
  announcement: 'announcement',
};

const CACHE_MS = 30_000;
let cached: { at: number; value: AppConfig } | null = null;

export async function getAppConfig(): Promise<AppConfig> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  const config: AppConfig = structuredClone(DEFAULT_APP_CONFIG);
  try {
    const { rows } = await databasePool.query<{ key: string; value: Record<string, unknown> }>(
      'select key, value from public.app_config',
    );
    for (const row of rows) {
      const field = KEY_MAP[row.key];
      if (field && row.value && typeof row.value === 'object') {
        Object.assign(config[field], row.value);
      }
    }
  } catch (err) {
    console.warn('[app-config] read failed, defaults used:', (err as Error).message);
  }
  cached = { at: Date.now(), value: config };
  return config;
}

export async function isFeatureEnabled(feature: keyof AppConfig['features']): Promise<boolean> {
  const config = await getAppConfig();
  return config.features[feature] !== false;
}

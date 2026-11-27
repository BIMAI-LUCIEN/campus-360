import { publicEnv } from '../../config/env';
import { readJsonFile, writeJsonFile } from '../documents/localJsonStore';
import {
  CV_TEMPLATES,
  getRegisteredCvTemplates,
  registerCvTemplates,
  sanitizeCvTemplateCss,
  type CvTemplateDefinition,
} from './cvHtml';

const CACHE_KEY = 'campus360_cv_templates_cache_v1';
const CACHE_TTL_MS = 15 * 60 * 1000;

type CachedCatalog = {
  fetchedAt: number;
  templates: CvTemplateDefinition[];
};

let memoryCatalog: { fetchedAt: number; templates: CvTemplateDefinition[]; source: 'db' | 'cache' | 'fallback' } | null = null;

const isValidList = (value: unknown): value is CvTemplateDefinition[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof (item as CvTemplateDefinition).id === 'string' &&
      typeof (item as CvTemplateDefinition).label === 'string' &&
      typeof (item as CvTemplateDefinition).layoutFamily === 'string',
  );

/**
 * Fetches active CV designs from PostgreSQL (`GET /api/mobile/cv-templates`),
 * registers them in cvHtml.ts, caches locally for offline resilience, and
 * falls back cleanly to the 15 built-in designs when offline.
 */
export async function fetchCvTemplatesCatalog(options?: {
  forceRefresh?: boolean;
}): Promise<{ templates: CvTemplateDefinition[]; source: 'db' | 'cache' | 'fallback' }> {
  const now = Date.now();
  if (!options?.forceRefresh && memoryCatalog && now - memoryCatalog.fetchedAt < CACHE_TTL_MS) {
    return { templates: memoryCatalog.templates, source: memoryCatalog.source };
  }

  // Hydrate from local cache first so UI/render never waits on slow networks if offline.
  let cached: CvTemplateDefinition[] | null = null;
  try {
    const stored = await readJsonFile<CachedCatalog>(CACHE_KEY);
    if (stored && isValidList(stored.templates)) {
      cached = stored.templates.map((t) => ({ ...t, customCss: sanitizeCvTemplateCss(t.customCss) }));
      registerCvTemplates(cached);
    }
  } catch {
    // Ignore local storage read failures.
  }

  const baseUrl = (publicEnv.authUrl || '').replace(/\/+$/, '');
  if (baseUrl) {
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 8000) : null;
      const res = await fetch(`${baseUrl}/api/mobile/cv-templates`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller?.signal,
      }).finally(() => {
        if (timer) clearTimeout(timer);
      });
      if (res.ok) {
        const json = (await res.json().catch(() => null)) as { templates?: unknown; source?: string } | null;
        if (json && isValidList(json.templates)) {
          const clean = json.templates.map((t) => ({ ...t, customCss: sanitizeCvTemplateCss(t.customCss) }));
          registerCvTemplates(clean);
          const source = json.source === 'db' ? 'db' : 'fallback';
          memoryCatalog = { fetchedAt: now, templates: clean, source };
          void writeJsonFile(CACHE_KEY, { fetchedAt: now, templates: clean }).catch(() => {});
          return { templates: clean, source };
        }
      }
    } catch {
      // Offline or unreachable: keep cache or built-in fallback.
    }
  }

  if (cached) {
    memoryCatalog = { fetchedAt: now, templates: cached, source: 'cache' };
    return { templates: cached, source: 'cache' };
  }

  const fallback = [...CV_TEMPLATES];
  registerCvTemplates(fallback);
  memoryCatalog = { fetchedAt: now, templates: fallback, source: 'fallback' };
  return { templates: fallback, source: 'fallback' };
}

export const getCurrentCvTemplates = (): CvTemplateDefinition[] => getRegisteredCvTemplates();

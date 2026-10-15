import type { StageApplication } from '../../types';

// Pure helpers for the applications kept on the phone. No React Native import, so
// they can be tested with node (mobile-api/tests/stages-app-cache.test.mjs).

// Ids that never came from the server: sample seeds and old offline fallbacks.
export const FAKE_APPLICATION_PREFIXES = ['app-seed-', 'app-local-', 'app-dispatch-', 'app-offline-'] as const;

export const purgeFakeApplications = (list: StageApplication[]): StageApplication[] =>
  list.filter(
    (app) =>
      Boolean(app && app.job) &&
      typeof app.id === 'string' &&
      !FAKE_APPLICATION_PREFIXES.some((prefix) => app.id.startsWith(prefix)),
  );

/**
 * Prunes bulky optional fields (officialCv, generatedCvText, generatedLetterText)
 * so that local persistence remains lean and fits within storage limits.
 */
export function pruneBulkyApplicationFields(app: StageApplication): StageApplication {
  const { officialCv, generatedCvText, generatedLetterText, ...lean } = app;
  return lean as StageApplication;
}

export function getUtf8ByteLength(str: string): number {
  if (typeof Buffer !== 'undefined') {
    return Buffer.byteLength(str, 'utf8');
  }
  let s = str.length;
  for (let i = str.length - 1; i >= 0; i--) {
    const code = str.charCodeAt(i);
    if (code > 0x7f && code <= 0x7ff) s++;
    else if (code > 0x7ff && code <= 0xffff) s += 2;
    if (code >= 0xdc00 && code <= 0xdfff) i--;
  }
  return s;
}

/**
 * Trims applications array so that serialized JSON stays strictly below 1800 bytes,
 * preventing native SecureStore 2048-byte quota exceptions.
 */
export function fitSecureStoreBudget(apps: StageApplication[], maxBytes = 1800): string {
  const list = apps.map(pruneBulkyApplicationFields);
  while (list.length > 0) {
    const raw = JSON.stringify(list);
    if (getUtf8ByteLength(raw) <= maxBytes) {
      return raw;
    }
    list.pop();
  }
  return '[]';
}

// Rules for batch PDF uploads (Module 27), kept pure so they are testable
// without a database or a server.

export const MAX_PER_BATCH = 10;
export const MAX_PER_DAY = 30;
export const EDITABLE_STATUSES = ['pending_review', 'probable_duplicate', 'ready'] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Allowance = { ok: true } | { ok: false; status: 400 | 429; error: string };

// `inBatch` and `inLast24h` count the files already received, not this one.
export const checkBatchAllowance = (
  { inBatch, inLast24h }: { inBatch: number; inLast24h: number | null },
): Allowance => {
  if (inBatch >= MAX_PER_BATCH) return { ok: false, status: 400, error: `${MAX_PER_BATCH} PDF au maximum par envoi.` };
  if (inLast24h !== null && inLast24h >= MAX_PER_DAY) {
    return { ok: false, status: 429, error: `Limite de ${MAX_PER_DAY} PDF par jour atteinte. Réessayez demain.` };
  }
  return { ok: true };
};

export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);

const SHEET_TEXT_FIELDS = { title: 200, subject: 120, school: 160, year: 9, level: 80, summary: 800 } as const;
const KINDS = ['cours', 'ancien_sujet', 'corrige', 'rapport', 'memoire', 'autre'];

// Keeps only the editable fields of the sheet: never the flags, the status or
// anything that decides a publication or a reward.
export const sanitizeSheetPatch = (body: unknown): Record<string, unknown> => {
  if (!body || typeof body !== 'object') return {};
  const input = body as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const [field, max] of Object.entries(SHEET_TEXT_FIELDS)) {
    const value = input[field];
    if (typeof value === 'string') patch[field] = value.trim().slice(0, max);
  }
  if (typeof patch.year === 'string' && patch.year && !/^\d{4}(-\d{4})?$/.test(patch.year)) delete patch.year;
  if (typeof patch.title === 'string' && patch.title.length < 3) delete patch.title;
  if (typeof input.kind === 'string' && KINDS.includes(input.kind)) patch.kind = input.kind;
  if (Array.isArray(input.keywords)) {
    const keywords = input.keywords
      .filter((k): k is string => typeof k === 'string' && k.trim().length > 0)
      .map((k) => k.trim().slice(0, 40))
      .slice(0, 8);
    if (keywords.length) patch.keywords = keywords;
  }
  return patch;
};

export const sanitizeFileName = (name: string): string =>
  name.replace(/[\u0000-\u001f\u007f/\\]/g, '_').slice(0, 200) || 'document.pdf';

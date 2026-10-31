import { z } from 'zod';

import { FileValidationError, validateUpload } from './file-validation';
import {
  classifyDuplicate,
  minhashSignature,
  normalizeText,
  sha256,
  textFingerprint,
  type DedupExisting,
  type DuplicateMeta,
} from './pdf-dedup';

// Analysis chain for one uploaded PDF (Module 27). Pure: storage, database,
// quota and the model are injected, so the order of the checks is testable.
// Order: real PDF → exact duplicate (no AI) → text → text duplicate → quota → AI.

export const PDF_KINDS = ['cours', 'ancien_sujet', 'corrige', 'rapport', 'memoire', 'autre'] as const;

export const PDF_SHEET_SCHEMA = z.object({
  title: z.string().trim().min(3).max(200),
  subject: z.string().trim().max(120).default(''),
  school: z.string().trim().max(160).default(''),
  year: z
    .string()
    .trim()
    .regex(/^(\d{4}(-\d{4})?)?$/)
    .default(''),
  level: z.string().trim().max(80).default(''),
  kind: z.enum(PDF_KINDS).default('autre'),
  summary: z.string().trim().max(800).default(''),
  keywords: z.array(z.string().trim().min(1).max(40)).min(3).max(8),
  is_academic: z.boolean(),
  copyright_flag: z.boolean().default(false),
  personal_data_flag: z.boolean().default(false),
});

export type PdfSheet = z.infer<typeof PDF_SHEET_SCHEMA>;

export type DuplicateQuery = { sha256: string; fingerprint?: string | null; minhash?: number[] | null; meta?: DuplicateMeta };

export type IntakeDeps = {
  extract: (buffer: Buffer) => Promise<{ pages: { page: number; text: string }[]; pageCount: number }>;
  findDuplicates: (query: DuplicateQuery) => Promise<DedupExisting[]>;
  reserveQuota: () => Promise<void>;
  callLlm: (messages: { role: 'system' | 'user'; content: string }[]) => Promise<string | null>;
};

export type IntakeInput = { buffer: Buffer; declaredMime?: string | null; batchSiblings?: DedupExisting[] };

export type IntakeResult = {
  status: 'rejected' | 'duplicate' | 'analyzing' | 'probable_duplicate' | 'ready';
  reason?: string;
  duplicateOf?: { ref: string; kind: 'document' | 'upload'; score?: number };
  sha256: string;
  fingerprint: string | null;
  minhash: number[] | null;
  pageCount: number | null;
  text: string;
  sheet: PdfSheet | null;
  copyrightFlag: boolean;
  personalDataFlag: boolean;
  aiFailed?: boolean;
};

export const AI_PAGES = 5;
export const AI_MAX_CHARS = 12_000;
export const STORED_TEXT_CHARS = 20_000;
const MIN_USEFUL_CHARS = 200;

const ISBN = /\bISBN(?:-1[03])?:?\s*[\d][\d -]{8,16}[\dX]\b/i;
const COPYRIGHT = /©|\bcopyright\b|tous droits réservés/i;
const PERSONAL = /\bmatricule\s*[:n°#]*\s*[A-Z0-9]{5,}/i;

export const detectLocalFlags = (text: string) => ({
  copyright: ISBN.test(text) || COPYRIGHT.test(text),
  personalData: PERSONAL.test(text),
});

const SYSTEM_PROMPT = `Tu catalogues des documents académiques pour des étudiants camerounais (annales de concours, cours, TD, corrigés, rapports, mémoires).
Tu réponds UNIQUEMENT avec un objet JSON valide, sans texte autour.
Clés : title, subject, school (école, université ou concours), year (AAAA ou AAAA-AAAA), level, kind (cours | ancien_sujet | corrige | rapport | memoire | autre), summary (3 phrases au plus), keywords (3 à 8 mots-clés), is_academic (booléen), copyright_flag (vrai si c'est un livre ou un support édité protégé), personal_data_flag (vrai si le document contient des noms d'élèves, des matricules ou des notes nominatives).
Si une information est absente du document, laisse une chaîne vide : n'invente jamais.`;

const parseSheet = (raw: string | null): PdfSheet | null => {
  if (!raw) return null;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = PDF_SHEET_SCHEMA.safeParse(JSON.parse(raw.slice(start, end + 1)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

export const analyzePdf = async (input: IntakeInput, deps: IntakeDeps): Promise<IntakeResult> => {
  // (a) Real PDF. Size and empty files stay errors (413 / 400) for the route.
  let isPdf = false;
  try {
    isPdf = validateUpload(input.buffer, 'source', input.declaredMime).extension === 'pdf';
  } catch (error) {
    if (error instanceof FileValidationError && error.status !== 422) throw error;
  }
  const hash = sha256(input.buffer);
  const base: IntakeResult = {
    status: 'rejected',
    sha256: hash,
    fingerprint: null,
    minhash: null,
    pageCount: null,
    text: '',
    sheet: null,
    copyrightFlag: false,
    personalDataFlag: false,
  };
  if (!isPdf) return { ...base, reason: "Ce fichier n'est pas un vrai PDF." };

  const siblings = input.batchSiblings ?? [];
  const asDuplicate = (verdict: ReturnType<typeof classifyDuplicate>, pool: DedupExisting[], result: IntakeResult): IntakeResult => {
    const match = pool.find((item) => item.ref === verdict.match);
    return { ...result, status: 'duplicate', duplicateOf: match && { ref: match.ref, kind: match.kind, score: verdict.score } };
  };

  // (b) Exact duplicate: no extraction, no quota, no AI.
  const exactPool = [...siblings, ...(await deps.findDuplicates({ sha256: hash }))];
  const exact = classifyDuplicate({ sha256: hash, fingerprint: null, minhash: null }, exactPool);
  if (exact.verdict === 'exact') return asDuplicate(exact, exactPool, base);

  // (c) Text. No OCR in V1 (D27.2): a scan is refused with a clear message.
  let pages: { page: number; text: string }[];
  let pageCount: number;
  try {
    ({ pages, pageCount } = await deps.extract(input.buffer));
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/mot de passe/i.test(message)) return { ...base, reason: 'Ce PDF est protégé par un mot de passe.' };
    if (/aucun texte/i.test(message)) return { ...base, reason: 'PDF scanné sans texte : ajoutez une version texte.' };
    return { ...base, reason: 'Ce PDF est illisible ou endommagé.' };
  }
  const normalized = normalizeText(pages.map((p) => p.text));
  const rawText = pages.map((p) => p.text).join('\n');
  if (normalized.length < MIN_USEFUL_CHARS) {
    return { ...base, pageCount, reason: 'PDF vide ou illisible.' };
  }

  // (d) Text duplicate.
  const fingerprint = textFingerprint(normalized);
  const minhash = minhashSignature(normalized);
  const local = detectLocalFlags(rawText);
  const analyzed: IntakeResult = {
    ...base,
    fingerprint,
    minhash,
    pageCount,
    text: rawText.slice(0, STORED_TEXT_CHARS),
    copyrightFlag: local.copyright,
    personalDataFlag: local.personalData,
  };
  const textPool = [...siblings, ...(await deps.findDuplicates({ sha256: hash, fingerprint, minhash }))];
  const textVerdict = classifyDuplicate({ sha256: hash, fingerprint, minhash }, textPool);
  if (textVerdict.verdict === 'exact' || textVerdict.verdict === 'text_duplicate') {
    return asDuplicate(textVerdict, textPool, analyzed);
  }

  // (e) Quota, then (f) the model on the first pages only.
  await deps.reserveQuota();
  const excerpt = pages
    .slice(0, AI_PAGES)
    .map((p) => `--- Page ${p.page} ---\n${p.text}`)
    .join('\n')
    .slice(0, AI_MAX_CHARS);
  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    { role: 'user' as const, content: `Document (${pageCount} pages) :\n<<<\n${excerpt}\n>>>` },
  ];
  let sheet = parseSheet(await deps.callLlm(messages));
  if (!sheet) sheet = parseSheet(await deps.callLlm(messages));
  if (!sheet) return { ...analyzed, status: 'analyzing', aiFailed: true };

  const withSheet: IntakeResult = {
    ...analyzed,
    sheet,
    copyrightFlag: analyzed.copyrightFlag || sheet.copyright_flag,
    personalDataFlag: analyzed.personalDataFlag || sheet.personal_data_flag,
  };

  // (g) Not academic.
  if (!sheet.is_academic) return { ...withSheet, status: 'rejected', reason: 'Ce document ne semble pas académique.' };

  // (h) Probable duplicate, now with the sheet's metadata.
  const meta = { school: sheet.school, year: sheet.year, subject: sheet.subject };
  const metaPool = [...siblings, ...(await deps.findDuplicates({ sha256: hash, fingerprint, minhash, meta }))];
  const probable = classifyDuplicate({ sha256: hash, fingerprint, minhash, meta }, metaPool);
  if (probable.verdict === 'exact' || probable.verdict === 'text_duplicate') return asDuplicate(probable, metaPool, withSheet);
  if (probable.verdict === 'probable') {
    const match = metaPool.find((item) => item.ref === probable.match);
    return {
      ...withSheet,
      status: 'probable_duplicate',
      duplicateOf: match && { ref: match.ref, kind: match.kind, score: probable.score },
    };
  }
  return { ...withSheet, status: 'ready' };
};

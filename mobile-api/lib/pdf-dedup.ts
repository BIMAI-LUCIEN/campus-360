import { createHash } from 'node:crypto';

// Duplicate detection for uploaded PDFs (Module 27). Pure: decides the fate of
// each file; the unique index on documents.file_sha256 remains the final guard.

export const DUPLICATE_THRESHOLD = 0.9;
export const PROBABLE_THRESHOLD = 0.7;
export const EMBEDDING_PROBABLE_THRESHOLD = 0.95;
const MIN_FINGERPRINT_CHARS = 200;
const MIN_SHINGLES = 20;

export type DuplicateMeta = { school?: string | null; year?: string | null; subject?: string | null };

export type DedupCandidate = {
  sha256: string;
  fingerprint: string | null;
  minhash: number[] | null;
  meta?: DuplicateMeta;
};

export type DedupExisting = DedupCandidate & { ref: string; kind: 'document' | 'upload' };

export type DuplicateVerdict = {
  verdict: 'exact' | 'text_duplicate' | 'probable' | 'unique';
  match?: string;
  score?: number;
};

export const sha256 = (data: Buffer | string): string => createHash('sha256').update(data).digest('hex');

const stripLine = (line: string) =>
  line
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[ﬁ]/g, 'fi')
    .replace(/[ﬂ]/g, 'fl')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// Accepts the whole text or one string per page. With pages, lines repeated on
// more than half of them (running headers and footers) are dropped.
export const normalizeText = (input: string | string[]): string => {
  const pages = Array.isArray(input) ? input : [input];
  const pageLines = pages.map((page) => page.split(/\r?\n/).map(stripLine).filter(Boolean));
  const repeated = new Set<string>();
  if (pages.length >= 3) {
    const counts = new Map<string, number>();
    for (const lines of pageLines) {
      for (const line of new Set(lines)) counts.set(line, (counts.get(line) ?? 0) + 1);
    }
    for (const [line, count] of counts) if (count > pages.length / 2) repeated.add(line);
  }
  return pageLines
    .flat()
    .filter((line) => !/^\d+$/.test(line) && !repeated.has(line))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const textFingerprint = (normalized: string): string | null =>
  normalized.length >= MIN_FINGERPRINT_CHARS ? sha256(normalized) : null;

const hash32 = (value: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

const mix = (x: number, seed: number): number => {
  let h = (x ^ seed) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
};

const seeds = (size: number) => Array.from({ length: size }, (_, i) => mix(i + 1, 0x9e3779b9));

export const minhashSignature = (
  normalized: string,
  { k = 5, size = 128 }: { k?: number; size?: number } = {},
): number[] | null => {
  const words = normalized.split(' ').filter(Boolean);
  const shingles = new Set<number>();
  for (let i = 0; i + k <= words.length; i += 1) shingles.add(hash32(words.slice(i, i + k).join(' ')));
  if (shingles.size < MIN_SHINGLES) return null;
  return seeds(size).map((seed) => {
    let min = 0xffffffff;
    for (const shingle of shingles) {
      const value = mix(shingle, seed);
      if (value < min) min = value;
    }
    // Stored in a Postgres integer[]: keep it within the signed 32-bit range.
    return min | 0;
  });
};

export const similarity = (a: number[], b: number[]): number => {
  if (a.length === 0 || a.length !== b.length) return 0;
  let equal = 0;
  for (let i = 0; i < a.length; i += 1) if (a[i] === b[i]) equal += 1;
  return equal / a.length;
};

export const cosine = (a: number[], b: number[]): number => {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
};

const metaKey = (meta?: DuplicateMeta): string | null => {
  if (!meta) return null;
  const parts = [meta.school, meta.year, meta.subject].map((part) => stripLine(part ?? ''));
  return parts.every(Boolean) ? parts.join('|') : null;
};

export const classifyDuplicate = (candidate: DedupCandidate, existing: DedupExisting[]): DuplicateVerdict => {
  for (const item of existing) {
    if (item.sha256 === candidate.sha256) return { verdict: 'exact', match: item.ref, score: 1 };
  }

  let best: { ref: string; score: number } | null = null;
  for (const item of existing) {
    if (candidate.fingerprint && item.fingerprint === candidate.fingerprint) {
      return { verdict: 'text_duplicate', match: item.ref, score: 1 };
    }
    if (candidate.minhash && item.minhash) {
      const score = similarity(candidate.minhash, item.minhash);
      if (!best || score > best.score) best = { ref: item.ref, score };
    }
  }
  if (best && best.score > DUPLICATE_THRESHOLD) return { verdict: 'text_duplicate', match: best.ref, score: best.score };
  if (best && best.score >= PROBABLE_THRESHOLD) return { verdict: 'probable', match: best.ref, score: best.score };

  const key = metaKey(candidate.meta);
  if (key) {
    const sameMeta = existing.find((item) => metaKey(item.meta) === key);
    if (sameMeta) return { verdict: 'probable', match: sameMeta.ref };
  }
  return { verdict: 'unique' };
};

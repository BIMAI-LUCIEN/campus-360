import { resolveStyle, type DocumentStyle } from './document-style';

// Applying a report template to a student's document (Module 24). Pure rules:
// which sections to add, and the resulting style. Nothing the student wrote is
// changed or removed.

const normalize = (title: string) =>
  title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

// Two titles are the same section when equal after normalisation, or when one
// starts with the other followed by a word break: "Introduction" ≈ "Introduction
// générale", "Chapitre 1" ≈ "Chapitre 1 : Présentation". "Chapitre 1" never
// matches "Chapitre 10" (word break required).
export const sameSection = (a: string, b: string) => {
  const x = normalize(a);
  const y = normalize(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length < y.length ? [x, y] : [y, x];
  return long.startsWith(`${short} `);
};

export type ExistingSection = { title: string; position: number };
export type OutlineEntry = { title: string; system?: boolean };

// Final order of the sections: the existing ones in their order, and every
// template section the document lacks, placed right after the last existing
// section that comes before it in the template.
export const mergeOutline = (
  existing: ExistingSection[],
  outline: OutlineEntry[],
): { order: ({ kind: 'existing'; index: number } | { kind: 'new'; title: string; system: boolean })[]; added: string[] } => {
  const sorted = existing.map((s, index) => ({ ...s, index })).sort((a, b) => a.position - b.position);
  const used = new Set<number>();
  const after = new Map<number, OutlineEntry[]>(); // index of an existing section (-1 = start) → new sections after it
  let anchor = sorted.length && normalize(sorted[0].title) === 'page de garde' ? sorted[0].index : -1;
  for (const entry of outline) {
    const match = sorted.find((s) => !used.has(s.index) && sameSection(s.title, entry.title));
    if (match) {
      used.add(match.index);
      anchor = match.index;
      continue;
    }
    if (normalize(entry.title) === 'page de garde') continue;
    if (!after.has(anchor)) after.set(anchor, []);
    after.get(anchor)?.push(entry);
  }
  const order: ({ kind: 'existing'; index: number } | { kind: 'new'; title: string; system: boolean })[] = [];
  const pushNew = (key: number) => (after.get(key) ?? []).forEach((e) => order.push({ kind: 'new', title: e.title, system: Boolean(e.system) || normalize(e.title) === 'sommaire' }));
  pushNew(-1);
  for (const s of sorted) {
    order.push({ kind: 'existing', index: s.index });
    pushNew(s.index);
  }
  return { order, added: order.filter((o) => o.kind === 'new').map((o) => (o as { title: string }).title) };
};

// The template's style (cover blocks included) with the student's own logos and
// cover lines. Template logos are never given to students (decision 21).
export const styleFromTemplate = (templateStyle: DocumentStyle, current?: unknown): DocumentStyle => {
  const next = resolveStyle(templateStyle);
  const mine = current ? resolveStyle(current) : null;
  next.cover.schoolLogoFileId = mine?.cover.schoolLogoFileId ?? null;
  next.cover.companyLogoFileId = mine?.cover.companyLogoFileId ?? null;
  next.cover.departmentLogoFileId = mine?.cover.departmentLogoFileId ?? null;
  if (mine?.cover.extraLines.length) next.cover.extraLines = mine.cover.extraLines;
  return resolveStyle(next);
};

// Sections of a new document created from a template: its outline, behind a cover.
export const sectionsForNewDocument = (outline: OutlineEntry[]) => {
  const titles = outline.map((o) => o.title);
  return normalize(titles[0] ?? '') === 'page de garde' ? titles : ['Page de garde', ...titles];
};

// The student's CV background (experiences, education, skills, languages,
// hobbies), kept on the account (app_users.cv_background) so every application
// starts from it. Filled by hand in the app or imported from an existing CV:
// the model only restructures what the file says, it never adds facts.

import { z } from 'zod';

import type { LlmMessage } from './llm';

const text = (max: number) => z.string().trim().max(max);
const list = (maxItems: number, max: number) => z.array(text(max)).max(maxItems);

/** Strict shape accepted from the app (PUT). */
export const cvBackgroundSchema = z.object({
  profil: text(700).default(''),
  experiences: z
    .array(z.object({
      poste: text(120),
      entreprise: text(120),
      ville: text(80).default(''),
      periode: text(60).default(''),
      missions: list(8, 220).default([]),
    }))
    .max(10)
    .default([]),
  formations: z
    .array(z.object({
      diplome: text(160),
      etablissement: text(160),
      ville: text(80).default(''),
      periode: text(60).default(''),
    }))
    .max(8)
    .default([]),
  competences: list(30, 100).default([]),
  logiciels: list(30, 60).default([]),
  qualites: list(10, 60).default([]),
  langues: z.array(z.object({ langue: text(40), niveau: text(40).default('') })).max(8).default([]),
  loisirs: list(10, 60).default([]),
});

export type CvBackground = z.infer<typeof cvBackgroundSchema>;

export const emptyCvBackground = (): CvBackground => cvBackgroundSchema.parse({});

// Lenient reading of the model output: wrong types become empty, lists are capped.
const str = (max: number) => z.preprocess((v) => (typeof v === 'string' ? v : ''), z.string()).transform((v) => v.trim().slice(0, max));
const strList = (maxItems: number, max: number) =>
  z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(z.unknown()))
    .transform((items) => items.filter((i): i is string => typeof i === 'string').map((i) => i.trim().slice(0, max)).filter(Boolean).slice(0, maxItems));
const objList = <T extends z.ZodTypeAny>(item: T, maxItems: number) =>
  z.preprocess((v) => (Array.isArray(v) ? v.filter((i) => i && typeof i === 'object') : []), z.array(item)).transform((items) => items.slice(0, maxItems));

const importedSchema = z.object({
  profil: str(700),
  experiences: objList(z.object({
    poste: str(120), entreprise: str(120), ville: str(80), periode: str(60), missions: strList(8, 220),
  }), 10),
  formations: objList(z.object({ diplome: str(160), etablissement: str(160), ville: str(80), periode: str(60) }), 8),
  competences: strList(30, 100),
  logiciels: strList(30, 60),
  qualites: strList(10, 60),
  langues: objList(z.object({ langue: str(40), niveau: str(40) }), 8),
  loisirs: strList(10, 60),
});

export const buildCvImportMessages = (cvText: string): LlmMessage[] => [
  {
    role: 'system',
    content: [
      'Tu lis le CV d’un étudiant et tu en extrais le parcours en JSON, sans markdown ni commentaire.',
      'Règles : recopie seulement ce qui est écrit dans le CV. N’invente ni entreprise, ni date, ni diplôme, ni langue, ni compétence. Une information absente donne une chaîne vide ou un tableau vide.',
      'Ignore l’identité et les coordonnées (nom, e-mail, téléphone, adresse, photo).',
      'Format exact :',
      '{"profil":"","experiences":[{"poste":"","entreprise":"","ville":"","periode":"","missions":[""]}],"formations":[{"diplome":"","etablissement":"","ville":"","periode":""}],"competences":[""],"logiciels":[""],"qualites":[""],"langues":[{"langue":"","niveau":""}],"loisirs":[""]}',
    ].join('\n'),
  },
  { role: 'user', content: `CV :\n${cvText.slice(0, 12000)}` },
];

const jsonObject = (raw: string | null): unknown => {
  if (!raw) return null;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
};

/** Background read from the model's answer, or null when nothing usable came back. */
export const parseCvImport = (raw: string | null): CvBackground | null => {
  const parsed = importedSchema.safeParse(jsonObject(raw));
  if (!parsed.success) return null;
  const data = parsed.data;
  const background = cvBackgroundSchema.parse({
    ...data,
    experiences: data.experiences.filter((e) => e.poste || e.entreprise),
    formations: data.formations.filter((f) => f.diplome || f.etablissement),
    langues: data.langues.filter((l) => l.langue),
  });
  const empty = !background.profil && !background.experiences.length && !background.formations.length && !background.competences.length;
  return empty ? null : background;
};

/** Plain-text version given to the CV-filling model as the student's own facts. */
export const cvBackgroundToText = (b: CvBackground | null | undefined): string => {
  if (!b) return '';
  const lines: string[] = [];
  if (b.profil) lines.push(`Présentation : ${b.profil}`);
  for (const e of b.experiences) {
    lines.push(`Expérience : ${[e.poste, e.entreprise, e.ville, e.periode].filter(Boolean).join(', ')}`);
    for (const m of e.missions) lines.push(`- ${m}`);
  }
  for (const f of b.formations) lines.push(`Formation : ${[f.diplome, f.etablissement, f.ville, f.periode].filter(Boolean).join(', ')}`);
  if (b.competences.length) lines.push(`Compétences : ${b.competences.join(', ')}`);
  if (b.logiciels.length) lines.push(`Logiciels et outils : ${b.logiciels.join(', ')}`);
  if (b.qualites.length) lines.push(`Qualités : ${b.qualites.join(', ')}`);
  if (b.langues.length) lines.push(`Langues : ${b.langues.map((l) => [l.langue, l.niveau].filter(Boolean).join(' ')).join(', ')}`);
  if (b.loisirs.length) lines.push(`Loisirs : ${b.loisirs.join(', ')}`);
  return lines.join('\n');
};

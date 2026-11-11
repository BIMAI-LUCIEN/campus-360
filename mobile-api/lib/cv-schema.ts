// Structured CV as the app sends it (src/types.ts OfficialCvData). Bounded so a
// review or a fill request can never carry an oversized document.

import { z } from 'zod';

const text = (max: number) => z.string().trim().max(max);
const month = z.string().trim().regex(/^\d{4}-\d{2}$/).optional();

const dates = {
  debut: month,
  fin: z.union([z.literal('present'), z.string().trim().regex(/^\d{4}-\d{2}$/)]).optional(),
};

export const officialCvSchema = z.object({
  titrePoste: text(200).default(''),
  photoUrl: z.string().max(3_000_000).optional(),
  profil: text(1500).optional(),
  // `adresse` is the former name of `ville` (older CVs of the library): moved into it.
  detailsPersonnels: z.preprocess((v) => {
    if (!v || typeof v !== 'object') return v;
    const { adresse, ...rest } = v as Record<string, unknown>;
    return { ...rest, ville: rest.ville || adresse || undefined };
  }, z.object({
    nom: text(120).default(''),
    prenom: text(120).default(''),
    nationalite: text(80).optional(),
    age: text(40).optional(),
    email: text(200).default(''),
    telephone: text(60).default(''),
    ville: text(200).optional(),
    // https only, like safeLink in src/features/stages/cvHtml.ts.
    liens: z.array(z.string().trim().max(200).regex(/^https:\/\/[^\s"'<>]+\.[^\s"'<>]+$/i)).max(3).optional(),
    disponibilite: text(200).optional(),
  })),
  experiences: z.array(z.object({
    poste: text(200).default(''),
    entreprise: text(200).default(''),
    ville: text(120).default(''),
    periode: text(120).default(''),
    missions: z.array(text(400)).max(15).default([]),
    ...dates,
  })).max(15).default([]),
  formations: z.array(z.object({
    diplome: text(200).default(''),
    etablissement: text(200).default(''),
    ville: text(120).default(''),
    periode: text(120).default(''),
    ...dates,
  })).max(10).default([]),
  competences: z.object({
    professionnelles: z.array(text(150)).max(40).default([]),
    habilitesRelationnelles: z.array(text(150)).max(20).default([]),
    logiciels: z.array(z.object({ categorie: text(80).optional(), items: z.array(text(80)).max(20).default([]) })).max(10).default([]),
  }),
  langues: z.array(z.object({ langue: text(60).default(''), niveau: text(60).default('') })).max(10).default([]),
  loisirs: z.array(text(100)).max(15).default([]),
  rubriques: z.array(z.object({
    id: text(80),
    kind: z.enum(['activites', 'certificats', 'realisations', 'personnalisee']),
    titre: text(120),
    items: z.array(text(400)).max(15),
  })).max(10).optional(),
  formationEnPremier: z.boolean().optional(),
});

export type OfficialCv = z.infer<typeof officialCvSchema>;

const PRINTED_MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const printedMonth = (value?: string): string => {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? '');
  const m = match ? Number(match[2]) : 0;
  return match && m >= 1 && m <= 12 ? `${PRINTED_MONTHS[m - 1]} ${match[1]}` : '';
};

/** Same rule as cvPeriode in src/features/stages/cvHtml.ts. */
export const printedPeriode = (item: { periode?: string; debut?: string; fin?: string }): string => {
  const start = printedMonth(item.debut);
  const end = item.fin === 'present' ? 'aujourd’hui' : printedMonth(item.fin);
  if (start || end) return [start, end].filter(Boolean).join(' – ');
  return (item.periode ?? '').trim();
};

/** The CV as plain text, in reading order: what a reader or a parser sees. */
export const cvToText = (cv: OfficialCv): string => {
  const p = cv.detailsPersonnels;
  const experience = [
    'Expérience professionnelle',
    ...cv.experiences.map((e) => [
      [e.poste, e.entreprise, e.ville, printedPeriode(e)].filter(Boolean).join(' — '),
      ...e.missions.map((m) => `- ${m}`),
    ].join('\n')),
  ];
  const formation = [
    'Formation',
    ...cv.formations.map((f) => [f.diplome, f.etablissement, f.ville, printedPeriode(f)].filter(Boolean).join(' — ')),
  ];
  const lines = [
    [p.prenom, p.nom].filter(Boolean).join(' '),
    cv.titrePoste,
    [p.email, p.telephone, p.ville, ...(p.liens ?? []), p.nationalite, p.age].filter(Boolean).join(' | '),
    p.disponibilite ? `Disponibilité : ${p.disponibilite}` : '',
    cv.profil ? `Profil\n${cv.profil}` : '',
    ...(cv.formationEnPremier ? [...formation, ...experience] : [...experience, ...formation]),
    'Compétences',
    ...cv.competences.professionnelles.map((s) => `- ${s}`),
    cv.competences.habilitesRelationnelles.length ? `Qualités : ${cv.competences.habilitesRelationnelles.join(', ')}` : '',
    ...cv.competences.logiciels.map((l) => `${l.categorie ? `${l.categorie} : ` : 'Logiciels : '}${l.items.join(', ')}`),
    cv.langues.length ? `Langues : ${cv.langues.map((l) => [l.langue, l.niveau].filter(Boolean).join(' ')).join(', ')}` : '',
    ...(cv.rubriques ?? []).map((r) => [r.titre, ...r.items.filter(Boolean).map((i) => `- ${i}`)].join('\n')),
    cv.loisirs.length ? `Loisirs : ${cv.loisirs.join(', ')}` : '',
  ];
  return lines.filter((line) => line.trim()).join('\n');
};

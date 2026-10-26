// AI filling of the application CV: the model turns the student's profile and
// free notes (experiences, languages, hobbies...) into the structured CV of
// src/features/stages/cvHtml.ts, targeted at one offer. Identity and contact
// never come from the model. Anything the model names that is absent from what
// the student wrote (company, language, hobby) is dropped: no invented facts.

import { z } from 'zod';

import type { LlmMessage } from './llm';

const text = (max: number) => z.string().trim().max(max);

export const cvFillRequestSchema = z.object({
  job: z.object({
    title: text(200).min(2),
    company: text(200).optional(),
    description: text(4000).optional(),
    requirements: z.array(text(200)).max(30).optional(),
  }),
  student: z.object({
    fullName: text(200).optional(),
    university: text(200).optional(),
    major: text(200).optional(),
    educationLevel: text(100).optional(),
    skills: z.array(text(100)).max(40).optional(),
  }),
  notes: text(4000).optional(),
});

export type CvFillRequest = z.infer<typeof cvFillRequestSchema>;

// Lenient reading of the model output: wrong types become empty, lists are capped.
const str = (max: number) => z.preprocess((v) => (typeof v === 'string' ? v : ''), z.string()).transform((v) => v.trim().slice(0, max));
const strList = (maxItems: number, max: number) =>
  z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(z.unknown()))
    .transform((items) => items.filter((i): i is string => typeof i === 'string').map((i) => i.trim().slice(0, max)).filter(Boolean).slice(0, maxItems));
const objList = <T extends z.ZodTypeAny>(item: T, maxItems: number) =>
  z.preprocess((v) => (Array.isArray(v) ? v.filter((i) => i && typeof i === 'object') : []), z.array(item)).transform((items) => items.slice(0, maxItems));

const filledCvSchema = z.object({
  titrePoste: str(120),
  profil: str(700),
  experiences: objList(z.object({
    poste: str(120),
    entreprise: str(120),
    ville: str(80),
    periode: str(60),
    missions: strList(5, 220),
  }), 6),
  formations: objList(z.object({
    diplome: str(160),
    etablissement: str(160),
    ville: str(80),
    periode: str(60),
  }), 5),
  competences: z.preprocess((v) => (v && typeof v === 'object' ? v : {}), z.object({
    professionnelles: strList(10, 100),
    habilitesRelationnelles: strList(6, 60),
    logiciels: objList(z.object({ categorie: str(60), items: strList(8, 60) }), 5),
  })),
  langues: objList(z.object({ langue: str(40), niveau: str(40) }), 6),
  loisirs: strList(6, 60),
});

export type FilledCv = z.infer<typeof filledCvSchema>;

const fold = (value: string): string =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Everything the student wrote: the only allowed source of facts. */
export const cvFillSource = (input: CvFillRequest): string =>
  [input.notes, input.student.university, input.student.major, input.student.educationLevel, ...(input.student.skills ?? [])]
    .filter(Boolean)
    .join('\n');

// True when the value appears in the source, or when at least `share` of its
// significant words (4+ letters) do: the model may reword "lecture" into
// "Lecture de romans", not produce "Anglais" or "Montage vidéo" when the
// student never mentioned them. Skills use 1/2: "Support technique" passes
// with "support aux clients", "Installation de matériel audiovisuel" does not
// with "installation de routeurs".
export const mentioned = (source: string, value: string, share = 0): boolean => {
  const haystack = ` ${fold(source)} `;
  const needle = fold(value);
  if (!needle) return false;
  if (haystack.includes(` ${needle} `)) return true;
  const words = needle.split(' ').filter((word) => word.length >= 4);
  const found = words.filter((word) => haystack.includes(` ${word} `)).length;
  return found > 0 && found >= words.length * share;
};

const SKILL_SHARE = 0.5;

export const buildCvFillMessages = (input: CvFillRequest): LlmMessage[] => {
  const { job, student, notes } = input;
  const system = [
    'Tu rédiges le CV d’un étudiant camerounais qui postule à une offre de stage ou d’emploi.',
    'Tu réponds uniquement par un objet JSON valide, sans markdown ni commentaire.',
    'Règles :',
    '- N’invente rien : aucune entreprise, date, diplôme, établissement, langue, loisir, chiffre ou certification absent des informations de l’étudiant. Une information absente donne une chaîne vide ou un tableau vide.',
    '- Tu peux reformuler, corriger l’orthographe, structurer les notes en expériences et missions, et classer les compétences de la plus utile à la moins utile pour l’offre.',
    '- "titrePoste" : un titre court adapté à l’offre (ex. « Stagiaire assistant comptable »).',
    '- "profil" : 2 à 3 phrases à la première personne, sobres, qui relient le parcours réel de l’étudiant à l’offre, sans lui prêter une compétence ou une qualité qu’il ne cite pas. Pas de formules creuses (« passionné », « dynamique et motivé », « dans un monde en constante évolution »).',
    '- Missions : seulement les tâches que l’étudiant décrit, avec ses mots ou un verbe d’action, une ligne chacune, au plus 4 par expérience. N’en ajoute pas.',
    '- Compétences : seulement celles déclarées par l’étudiant ou décrites dans ses notes, reformulées au besoin. N’ajoute jamais une exigence de l’offre que l’étudiant ne cite pas. Garde toutes ses compétences déclarées.',
    '- "habilitesRelationnelles" : seulement les qualités humaines que l’étudiant cite lui-même, sinon tableau vide.',
    '- Langues : "niveau" seulement s’il est écrit par l’étudiant, sinon chaîne vide.',
    '- "logiciels" : seulement les outils cités par l’étudiant, regroupés par catégorie.',
    'Format exact :',
    '{"titrePoste":"","profil":"","experiences":[{"poste":"","entreprise":"","ville":"","periode":"","missions":[""]}],"formations":[{"diplome":"","etablissement":"","ville":"","periode":""}],"competences":{"professionnelles":[""],"habilitesRelationnelles":[""],"logiciels":[{"categorie":"","items":[""]}]},"langues":[{"langue":"","niveau":""}],"loisirs":[""]}',
  ].join('\n');
  const user = [
    'OFFRE',
    `Poste : ${job.title}`,
    job.company ? `Entreprise : ${job.company}` : '',
    job.requirements?.length ? `Exigences : ${job.requirements.join(', ')}` : '',
    job.description ? `Description : ${job.description.slice(0, 1500)}` : '',
    '',
    'ÉTUDIANT',
    student.educationLevel || student.major ? `Études : ${[student.educationLevel, student.major].filter(Boolean).join(' en ')}` : '',
    student.university ? `Établissement : ${student.university}` : '',
    student.skills?.length ? `Compétences déclarées : ${student.skills.join(', ')}` : '',
    `Notes de l’étudiant (expériences, projets, langues, loisirs…) : ${notes?.trim() || '(aucune)'}`,
  ].filter((line) => line !== '').join('\n');
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
};

// The skills the student declared stay on the CV even when the model dropped
// them; the model's grounded wording comes first (sorted for the offer).
const withDeclaredSkills = (written: string[], declared: string[]): string[] => {
  const missing = declared.filter((skill) => skill && !written.some((w) => mentioned(w, skill)));
  return [...written, ...missing].slice(0, 12);
};

/**
 * Reads the model answer and keeps only what is grounded in the student's
 * input. Returns null when the answer is not a JSON object.
 */
export const parseCvFill = (raw: string | null, input: CvFillRequest): FilledCv | null => {
  if (!raw) return null;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const cv = filledCvSchema.parse(json);
  const source = cvFillSource(input);
  const notes = input.notes ?? '';

  return {
    ...cv,
    // An experience must have a title, a named company must come from the notes,
    // and each mission must reword something the student described.
    experiences: notes
      ? cv.experiences
        .filter((e) => e.poste && (!e.entreprise || mentioned(notes, e.entreprise)))
        .map((e) => ({ ...e, missions: e.missions.filter((mission) => mentioned(notes, mission, SKILL_SHARE)) }))
      : [],
    formations: cv.formations.filter((f) => f.diplome && (!f.etablissement || mentioned(source, f.etablissement))),
    langues: cv.langues
      .filter((l) => l.langue && mentioned(notes, l.langue))
      .map((l) => ({ ...l, niveau: mentioned(notes, l.niveau) ? l.niveau : '' })),
    loisirs: cv.loisirs.filter((l) => mentioned(notes, l)),
    competences: {
      professionnelles: withDeclaredSkills(
        cv.competences.professionnelles.filter((skill) => mentioned(source, skill, SKILL_SHARE)),
        input.student.skills ?? [],
      ),
      habilitesRelationnelles: cv.competences.habilitesRelationnelles.filter((h) => mentioned(source, h, SKILL_SHARE)),
      logiciels: cv.competences.logiciels
        .map((log) => ({ ...log, items: log.items.filter((item) => mentioned(source, item)) }))
        .filter((log) => log.items.length > 0),
    },
  };
};

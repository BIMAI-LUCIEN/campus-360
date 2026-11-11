// The six human judges of the CV jury (the seventh, the ATS, is lib/cv-ats.ts).
// One model call returns every judge; the answer is checked here: a reason that
// quotes words absent from the CV is dropped, an out-of-range note voids the
// judge, and a missing judge voids the whole answer. Nothing the model writes
// ever goes into the CV itself: missing facts become questions for the student.

import { z } from 'zod';

import type { LlmMessage } from './llm';

export const JUDGES = [
  { id: 'recruteur', nom: 'Le recruteur', question: 'En 30 secondes, est-ce que je l’appelle pour un entretien ?', fiche: 'Cherche : titre cohérent avec le poste, dernier poste cohérent, années d’expérience pertinente, trous ou postes très courts, une page pour un junior, fautes, coordonnées complètes. Rejette : titre vague, accroche générique (« dynamique et motivé »), dates incohérentes, trou de plus de 6 mois, faute, poste visé illisible.' },
  { id: 'manager', nom: 'Le manager du poste', question: 'Saura-t-il faire le travail dans mon équipe dès le premier mois ?', fiche: 'Cherche : tâches proches du poste, autonomie réelle (« a fait » plutôt que « a participé »), outils utilisés, périmètre concret (volume, durée, taille d’équipe). Rejette : responsabilités sans réalisations, verbes passifs (« en charge de »), compétences listées jamais vues en action.' },
  { id: 'concurrent', nom: 'Un autre candidat', question: 'Qu’ai-je de plus que lui ?', fiche: 'Pointe chaque réalisation sans chiffre, chaque compétence clé de l’offre absente ou enterrée, les formulations banales. Rejette quand rien n’est mémorable ; retient quand le CV a des résultats précis difficiles à égaler.' },
  { id: 'patron', nom: 'Le patron', question: 'Que va-t-il rapporter ou faire gagner à l’entreprise ?', fiche: 'Ne lit que le haut du CV et les chiffres. Cherche un impact (clients, coûts, délais, qualité) et une progression. Rejette un profil qui décrit son poste au lieu de ce qu’il a apporté, une accroche centrée sur ce que le candidat veut.' },
  { id: 'expert', nom: 'L’expert métier', question: 'Maîtrise-t-il vraiment son métier ?', fiche: 'Cherche la précision (outils et façon de les utiliser), la cohérence entre outils listés et missions, de la profondeur sur au moins un sujet. Rejette les listes d’outils sans hiérarchie, les niveaux autoévalués, les mots à la mode sans preuve, les contradictions.' },
  { id: 'sceptique', nom: 'Le sceptique', question: 'Qu’est-ce qui sonne faux, flou ou invérifiable ?', fiche: 'Cherche dates qui se chevauchent, intitulés gonflés, chiffres invraisemblables, affirmations invérifiables (« expert », « passionné »), diplômes sans établissement ou sans année, niveau annoncé incohérent avec l’expérience. Rejette dès qu’une ligne pourrait se révéler fausse en entretien.' },
] as const;

export type JudgeId = (typeof JUDGES)[number]['id'];
const JUDGE_IDS = JUDGES.map((j) => j.id) as [JudgeId, ...JudgeId[]];

export type JuryOffer = { title: string; company?: string; requirements?: string[]; description?: string };

export const buildCvJuryMessages = (cvText: string, offer: JuryOffer | null): LlmMessage[] => {
  const system = [
    'Tu joues six évaluateurs qui lisent un CV d’étudiant camerounais et cherchent chacun une raison de le rejeter.',
    'Chaque évaluateur juge seul, avec ses propres critères ; ils peuvent se contredire.',
    ...JUDGES.map((j) => `- "${j.id}" (${j.nom}) — ${j.question} ${j.fiche}`),
    'Notation sur 10 : 9-10 je me bats pour ce candidat ; 7-8 retenu ; 5-6 rejeté de justesse ; 3-4 rejeté ; 0-2 rejeté sans hésiter. Ne mets pas 7 pour encourager. Un défaut bloquant plafonne la note à 4.',
    offer ? 'Juge contre l’offre fournie.' : 'Aucune offre : déduis le poste visé du titre et des expériences, écris-le dans "posteVise", et juge contre les attentes habituelles de ce poste pour un étudiant ou jeune diplômé.',
    'Règles absolues :',
    '- Chaque raison cite le CV mot pour mot dans "citation" (un extrait exact, court). Si la raison porte sur un manque, laisse "citation" vide et dis précisément ce qui manque.',
    '- Jamais de raison générique qui irait à n’importe quel CV.',
    '- N’invente aucun fait sur l’étudiant. Une information qui manque (un chiffre, un outil de l’offre, une date) devient une question simple dans "questions", posée à l’étudiant en le tutoyant.',
    '- "potentiel" de chaque juge : la note (entier sur 10) qu’il donnerait si l’étudiant répondait favorablement à toutes les questions qui le concernent ; jamais sous sa note.',
    '- Chaque question indique dans "juges" les évaluateurs dont la note monterait avec la réponse.',
    '- "erreurs" : la liste fusionnée des défauts, sans doublon, chacun avec sa gravité ("bloquant" : fait rejeter à lui seul ; "majeur" : fait perdre face à un autre candidat ; "mineur" : finition), les juges qui l’ont relevé et la correction proposée.',
    'Tu réponds uniquement par un objet JSON valide, sans markdown ni commentaire, au format exact :',
    '{"posteVise":"","juges":[{"id":"recruteur","note":0,"potentiel":0,"raisons":[{"citation":"","raison":""}]}],"erreurs":[{"gravite":"majeur","citation":"","juges":["recruteur"],"correction":""}],"questions":[{"question":"","juges":["recruteur"]}],"criteres":[{"type":"diplome","exigence":"","preuve":""}]}',
    `Les six "id" attendus : ${JUDGE_IDS.join(', ')}. Trois raisons par juge.`,
    offer ? '"criteres" : les critères éliminatoires de l’offre seulement (diplôme ou niveau d’études, années d’expérience, langue avec niveau, permis, disponibilité ou durée, lieu). Pour chacun : "type" (diplome, experience, langue, permis, disponibilite, lieu), "exigence" = l’extrait exact de l’offre qui l’exige, "preuve" = l’extrait exact du CV qui le montre, ou vide si le CV ne le montre pas. Liste vide si l’offre n’exige rien de tel ; 6 au plus.' : 'Aucune offre : "criteres" est une liste vide.',
    'Sois bref : une citation fait au plus 12 mots, une raison au plus 25 mots, une correction au plus 25 mots ; 8 erreurs et 6 questions au plus.',
  ].join('\n');
  const user = [
    offer ? 'OFFRE' : 'OFFRE : aucune',
    offer ? `Poste : ${offer.title}` : '',
    offer?.company ? `Entreprise : ${offer.company}` : '',
    offer?.requirements?.length ? `Exigences : ${offer.requirements.join(', ')}` : '',
    offer?.description ? `Description : ${offer.description.slice(0, 1500)}` : '',
    '',
    'CV',
    cvText,
  ].filter((line, i, all) => line !== '' || (i > 0 && all[i - 1] !== '')).join('\n');
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
};

const str = (max: number) => z.preprocess((v) => (typeof v === 'string' ? v : ''), z.string()).transform((v) => v.trim().slice(0, max));

const rawJurySchema = z.object({
  posteVise: str(160),
  juges: z.array(z.object({
    id: z.string(),
    note: z.unknown(),
    raisons: z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(z.object({ citation: str(300), raison: str(400) }).passthrough())),
  }).passthrough()),
  erreurs: z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(z.object({
    gravite: z.unknown(),
    citation: str(300),
    juges: z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(z.unknown())),
    correction: str(400),
  }).passthrough())),
  questions: z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(z.unknown())),
  criteres: z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(z.unknown())),
});

export const CRITERE_TYPES = ['diplome', 'experience', 'langue', 'permis', 'disponibilite', 'lieu'] as const;
export type CritereType = (typeof CRITERE_TYPES)[number];

/** An eliminating requirement of the offer, and whether the CV shows it. */
export type JuryCritere = { type: CritereType; exigence: string; present: boolean; preuve: string };

export type Gravite = 'bloquant' | 'majeur' | 'mineur';

export type JuryJudge = {
  id: JudgeId;
  nom: string;
  verdict: 'RETENU' | 'REJETÉ';
  note: number;
  /** Estimated note if the student answers the questions; never below `note`, never in the score. */
  potentiel: number;
  raisons: { citation: string; raison: string }[];
};

/** A question, the judges it concerns and the points it may bring (sum of their potential gains). */
export type JuryQuestion = { question: string; juges: JudgeId[]; gain: number };

export type JuryResult = {
  posteVise: string;
  juges: JuryJudge[];
  erreurs: { gravite: Gravite; citation: string; juges: JudgeId[]; correction: string }[];
  /** Sorted by gain, highest first: what the student should answer first. */
  questions: string[];
  questionsDetail: JuryQuestion[];
  /** Eliminating requirements of the offer (empty without an offer). */
  criteres: JuryCritere[];
  /** Reasons removed because their quote is not in the CV. */
  citationsRetirees: number;
};

const fold = (value: string): string =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[«»"“”‘’'`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** True when the quote is in the CV, ignoring case, accents, punctuation and an ellipsis at its ends. */
export const quoteInCv = (cvText: string, citation: string): boolean => {
  const needle = fold(citation.replace(/^(\.\.\.|…)|(\.\.\.|…)$/g, ''));
  return needle.length > 0 && ` ${fold(cvText)} `.includes(` ${needle} `);
};

const GRAVITES: Gravite[] = ['bloquant', 'majeur', 'mineur'];

/** The potential is an estimate: missing or invalid → the note; below the note → the note. */
const potentialOf = (value: unknown, note: number): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 10 ? Math.max(value, note) : note;

/** Reads the model answer. Null when it is not JSON or a judge is missing or invalid. */
export const parseCvJury = (raw: string | null, cvText: string, offerText = ''): JuryResult | null => {
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
  const parsed = rawJurySchema.safeParse(json);
  if (!parsed.success) return null;
  const data = parsed.data;
  let citationsRetirees = 0;

  const grounded = <T extends { citation: string }>(items: T[]): T[] =>
    items.filter((item) => {
      if (!item.citation || quoteInCv(cvText, item.citation)) return true;
      citationsRetirees += 1;
      return false;
    });

  const erreurs = grounded(data.erreurs)
    .filter((e) => GRAVITES.includes(e.gravite as Gravite) && e.correction)
    .map((e) => ({
      gravite: e.gravite as Gravite,
      citation: e.citation,
      juges: e.juges.filter((id): id is JudgeId => JUDGE_IDS.includes(id as JudgeId)),
      correction: e.correction,
    }))
    .sort((a, b) => GRAVITES.indexOf(a.gravite) - GRAVITES.indexOf(b.gravite))
    .slice(0, 15);

  const juges: JuryJudge[] = [];
  for (const def of JUDGES) {
    const found = data.juges.find((j) => j.id === def.id);
    const note = typeof found?.note === 'number' ? found.note : Number.NaN;
    if (!found || !Number.isInteger(note) || note < 0 || note > 10) return null;
    const blocked = erreurs.some((e) => e.gravite === 'bloquant' && e.juges.includes(def.id));
    const finalNote = blocked ? Math.min(note, 4) : note;
    juges.push({
      id: def.id,
      nom: def.nom,
      note: finalNote,
      verdict: finalNote >= 7 ? 'RETENU' : 'REJETÉ',
      potentiel: potentialOf(found.potentiel, finalNote),
      raisons: grounded(found.raisons.filter((r) => r.raison)).slice(0, 3).map(({ citation, raison }) => ({ citation, raison })),
    });
  }

  // Older answers give plain strings; newer ones {question, juges}.
  const gainOf = (ids: JudgeId[]): number => ids.reduce((sum, id) => {
    const j = juges.find((x) => x.id === id);
    return sum + (j ? j.potentiel - j.note : 0);
  }, 0);
  const seenQuestions = new Set<string>();
  const questionsDetail: JuryQuestion[] = [];
  for (const item of data.questions) {
    const rawQuestion = typeof item === 'string' ? item : item && typeof item === 'object' ? (item as Record<string, unknown>).question : null;
    if (typeof rawQuestion !== 'string') continue;
    const question = rawQuestion.trim().slice(0, 300);
    if (!question || seenQuestions.has(question)) continue;
    seenQuestions.add(question);
    const rawIds = item && typeof item === 'object' && Array.isArray((item as Record<string, unknown>).juges) ? (item as { juges: unknown[] }).juges : [];
    const ids = [...new Set(rawIds.filter((id): id is JudgeId => JUDGE_IDS.includes(id as JudgeId)))];
    questionsDetail.push({ question, juges: ids, gain: gainOf(ids) });
    if (questionsDetail.length >= 8) break;
  }
  // Stable sort: equal gains keep the order the jury gave.
  questionsDetail.sort((a, b) => b.gain - a.gain);
  const questions = questionsDetail.map((q) => q.question);

  // A requirement must be quoted from the offer, and its proof from the CV:
  // a proof the CV does not contain counts as missing, never as shown.
  const criteres: JuryCritere[] = [];
  for (const item of data.criteres) {
    if (!offerText || !item || typeof item !== 'object') continue;
    const { type, exigence, preuve } = item as Record<string, unknown>;
    if (!CRITERE_TYPES.includes(type as CritereType) || typeof exigence !== 'string') continue;
    const need = exigence.trim().slice(0, 200);
    if (!quoteInCv(offerText, need)) continue;
    const proof = typeof preuve === 'string' ? preuve.trim().slice(0, 200) : '';
    const present = Boolean(proof) && quoteInCv(cvText, proof);
    if (criteres.some((c) => c.exigence.toLowerCase() === need.toLowerCase())) continue;
    criteres.push({ type: type as CritereType, exigence: need, present, preuve: present ? proof : '' });
    if (criteres.length >= 6) break;
  }

  return { posteVise: data.posteVise, juges, erreurs, questions, questionsDetail, criteres, citationsRetirees };
};

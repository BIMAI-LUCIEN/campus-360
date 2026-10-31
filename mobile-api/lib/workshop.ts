import { z } from 'zod';

import { databasePool } from './database';
import type { LlmMessage } from './llm';
import { MobileApiError } from './mobile-access';
import { EXTERNAL_CV_PRICE, REPORT_PRICE, THESIS_CHAPTER_PRICE, THESIS_FLAT_PRICE } from './pricing';
import { chargeWorkshopOn, refundWorkshopOn, WorkshopFundsError, type WorkshopClient } from './workshop-charge-core';

// AI writing workshop (Ressources > Atelier IA / "Utiliser ce plan"): the plan
// is free; then a report or CV is written in one go and a thesis chapter by
// chapter (flat price or per chapter), optionally following the table of
// contents of a reference report.

export const WORKSHOP_PRICES: Record<'REPORT' | 'THESIS' | 'CV', number> = {
  REPORT: REPORT_PRICE,
  THESIS: THESIS_FLAT_PRICE,
  CV: EXTERNAL_CV_PRICE,
};
export type WorkshopType = keyof typeof WORKSHOP_PRICES;

const WORKSHOP_STEP_PRICES = {
  REPORT: REPORT_PRICE,
  CV: EXTERNAL_CV_PRICE,
  THESIS_FLAT: THESIS_FLAT_PRICE,
  THESIS_CHAPTER: THESIS_CHAPTER_PRICE,
};

const text = (max: number) => z.string().trim().max(max);

export const workshopRequestSchema = z
  .object({
    type: z.enum(['REPORT', 'THESIS', 'CV']),
    // 'plan' is free; a thesis is then written chapter by chapter.
    step: z.enum(['plan', 'full', 'chapter']).default('full'),
    thesisMode: z.enum(['forfait', 'chapitre']).optional(),
    chapterIndex: z.number().int().min(1).max(12).optional(),
    chapterTitle: text(200).optional(),
    topic: text(300).min(3),
    field: text(200).optional(),
    notes: text(3000).optional(),
    outline: z.array(text(200)).max(30).optional(),
    // One id per tap: retrying the same generation is never charged twice.
    generationId: text(200).min(8),
  })
  .refine((input) => !(input.type === 'THESIS' && input.step === 'full'), {
    message: 'Le mémoire se rédige chapitre par chapitre.',
  })
  .refine(
    (input) => input.step !== 'chapter' || (input.type === 'THESIS' && !!input.chapterIndex && !!input.thesisMode),
    { message: 'Chapitre, numéro et mode de paiement requis.' },
  );
export type WorkshopRequest = z.infer<typeof workshopRequestSchema>;

export const workshopPrice = (type: WorkshopType) => WORKSHOP_PRICES[type];

const KIND_LABEL: Record<WorkshopType, string> = {
  REPORT: 'un rapport de stage académique',
  THESIS: "un mémoire de fin d'études (problématique, revue de littérature, méthodologie, résultats attendus)",
  CV: 'un CV professionnel avec une accroche et des compétences clés',
};

const taskLine = (input: WorkshopRequest): string => {
  if (input.step === 'plan') {
    return input.type === 'THESIS'
      ? "Pour un mémoire de fin d'études, propose la problématique puis le plan détaillé (chapitres numérotés, 4 à 7). Ne rédige pas les chapitres."
      : `Pour ${KIND_LABEL[input.type]}, propose uniquement le plan détaillé (parties numérotées). Ne rédige pas le contenu.`;
  }
  if (input.step === 'chapter') {
    const title = input.chapterTitle ? ` « ${input.chapterTitle} »` : '';
    return `Rédige uniquement le chapitre ${input.chapterIndex}${title} d'un mémoire de fin d'études.`;
  }
  return `Rédige ${KIND_LABEL[input.type]}.`;
};

export const buildWorkshopMessages = (input: WorkshopRequest): LlmMessage[] => {
  const outline = input.outline?.length
    ? `\nSuis exactement ce plan${input.step === 'chapter' ? ' (pour situer le chapitre)' : ", tiré d'un rapport de référence (adapte le contenu au sujet)"} :\n${input.outline
        .map((s, i) => `${i + 1}. ${s}`)
        .join('\n')}`
    : '';
  return [
    {
      role: 'system',
      content:
        "Tu es un encadrant académique au Cameroun. Tu rédiges en français clair, sans jargon creux. " +
        "Tu n'inventes ni chiffre, ni entreprise, ni nom de personne : là où une information précise manque, " +
        'écris un repère entre crochets comme [Nom de l’entreprise] pour que l’étudiant le complète. ' +
        'Réponds en Markdown (titres #, ##, listes -), sans préambule.',
    },
    {
      role: 'user',
      content:
        `${taskLine(input)}\nSujet : ${input.topic}\n` +
        (input.field ? `Filière / établissement : ${input.field}\n` : '') +
        (input.notes ? `Consignes de l'étudiant : ${input.notes}\n` : '') +
        outline,
    },
  ];
};

const inTransaction = async <T>(work: (client: WorkshopClient) => Promise<T>): Promise<T> => {
  const client = await databasePool.connect();
  try {
    await client.query('begin');
    const result = await work(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
};

/** Debits a workshop step once (the plan is free). 409 when the balance is too low. */
export const chargeWorkshop = async (userId: string, input: WorkshopRequest) => {
  try {
    return await inTransaction((client) => chargeWorkshopOn(client, userId, input, WORKSHOP_STEP_PRICES));
  } catch (error) {
    if (error instanceof WorkshopFundsError) throw new MobileApiError(error.message, 409);
    throw error;
  }
};

/** Gives the coins back when the AI could not write the document. */
export const refundWorkshop = async (userId: string, input: WorkshopRequest, reference: string) =>
  inTransaction((client) => refundWorkshopOn(client, userId, input, reference));

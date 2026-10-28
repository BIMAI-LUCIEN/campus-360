import { z } from 'zod';

import { databasePool } from './database';
import { isFreeLaunch } from './free-launch';
import type { LlmMessage } from './llm';
import { MobileApiError } from './mobile-access';

// AI writing workshop (Ressources > Atelier IA / "Utiliser ce plan"): drafts a
// report, thesis outline or CV from the student's topic, optionally following
// the table of contents of a reference report.

export const WORKSHOP_PRICES = { REPORT: 2000, THESIS: 5000, CV: 500 } as const;
export type WorkshopType = keyof typeof WORKSHOP_PRICES;

const text = (max: number) => z.string().trim().max(max);

export const workshopRequestSchema = z.object({
  type: z.enum(['REPORT', 'THESIS', 'CV']),
  topic: text(300).min(3),
  field: text(200).optional(),
  notes: text(3000).optional(),
  outline: z.array(text(200)).max(30).optional(),
  // One id per tap: retrying the same generation is never charged twice.
  generationId: text(200).min(8),
});
export type WorkshopRequest = z.infer<typeof workshopRequestSchema>;

export const workshopPrice = (type: WorkshopType, freeLaunch = isFreeLaunch()) =>
  freeLaunch ? 0 : WORKSHOP_PRICES[type];

const KIND_LABEL: Record<WorkshopType, string> = {
  REPORT: 'un rapport de stage académique',
  THESIS: "un projet de mémoire de fin d'études (problématique, revue de littérature, méthodologie, résultats attendus)",
  CV: 'un CV professionnel avec une accroche et des compétences clés',
};

export const buildWorkshopMessages = (input: WorkshopRequest): LlmMessage[] => {
  const outline = input.outline?.length
    ? `\nSuis exactement ce plan, tiré d'un rapport de référence (adapte le contenu au sujet) :\n${input.outline
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
        `Rédige ${KIND_LABEL[input.type]}.\nSujet : ${input.topic}\n` +
        (input.field ? `Filière / établissement : ${input.field}\n` : '') +
        (input.notes ? `Consignes de l'étudiant : ${input.notes}\n` : '') +
        outline,
    },
  ];
};

const reference = (generationId: string) => `workshop:${generationId}`;

/** Debits the workshop price once per generationId. 409 when the balance is too low. */
export const chargeWorkshop = async (userId: string, type: WorkshopType, generationId: string) => {
  const price = workshopPrice(type);
  if (price === 0) return { charged: 0 };
  const client = await databasePool.connect();
  try {
    await client.query('begin');
    const wallet = await client.query<{ balance_coins: number }>(
      'select balance_coins from public.app_wallets where user_id = $1 for update',
      [userId],
    );
    const already = await client.query(
      `select 1 from public.app_wallet_transactions
        where user_id = $1 and reference_id = $2 and type = 'purchase' and status = 'success' limit 1`,
      [userId, reference(generationId)],
    );
    if (already.rows[0]) {
      await client.query('commit');
      return { charged: 0 };
    }
    const balance = Number(wallet.rows[0]?.balance_coins ?? 0);
    if (!wallet.rows[0] || balance < price) {
      throw new MobileApiError(
        `Solde insuffisant : ce document coûte ${price} FCFA, ton solde est de ${balance} FCFA.`,
        409,
      );
    }
    await client.query(
      'update public.app_wallets set balance_coins = balance_coins - $1, updated_at = now() where user_id = $2',
      [price, userId],
    );
    await client.query(
      `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status)
       values ($1, 'purchase', $2, $3, 'success')`,
      [userId, -price, reference(generationId)],
    );
    await client.query('commit');
    return { charged: price };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
};

/** Gives the coins back when the AI could not write the document. */
export const refundWorkshop = async (userId: string, generationId: string) => {
  const client = await databasePool.connect();
  try {
    await client.query('begin');
    const removed = await client.query<{ amount_coins: number }>(
      `update public.app_wallet_transactions
          set status = 'failed', failure_message = 'Rédaction IA échouée : coins rendus.'
        where user_id = $1 and reference_id = $2 and type = 'purchase' and status = 'success'
        returning amount_coins`,
      [userId, reference(generationId)],
    );
    const amount = Math.abs(Number(removed.rows[0]?.amount_coins ?? 0));
    if (amount > 0) {
      await client.query(
        'update public.app_wallets set balance_coins = balance_coins + $1, updated_at = now() where user_id = $2',
        [amount, userId],
      );
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
};

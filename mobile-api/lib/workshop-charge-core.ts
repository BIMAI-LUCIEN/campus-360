// Payment of the writing workshop (contexte.md §19), on a pg client inside the
// caller's transaction. Self-contained (no imports) for tests with a fake client.
//   plan               free (report plan; thesis plan + problem statement)
//   REPORT / CV full   one price per generationId
//   THESIS chapter     flat price once (all chapters), or one price per chapter;
//                      a chapter already covered is never paid again

export type WorkshopClient = { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> };

export type WorkshopStep = {
  type: 'REPORT' | 'THESIS' | 'CV';
  step: 'plan' | 'full' | 'chapter';
  generationId: string;
  thesisMode?: 'forfait' | 'chapitre';
  chapterIndex?: number;
};

export type WorkshopPrices = { REPORT: number; CV: number; THESIS_FLAT: number; THESIS_CHAPTER: number };

export class WorkshopFundsError extends Error {
  constructor(public readonly price: number, public readonly balance: number) {
    super(`Solde insuffisant : ce document coûte ${price} FCFA, ton solde est de ${balance} FCFA.`);
  }
}

export const workshopReference = (input: WorkshopStep): string => {
  const base = `workshop:${input.generationId}`;
  if (input.type !== 'THESIS' || input.step !== 'chapter') return base;
  return input.thesisMode === 'forfait' ? `${base}:forfait` : `${base}:ch${input.chapterIndex}`;
};

export const chargeWorkshopOn = async (
  client: WorkshopClient,
  userId: string,
  input: WorkshopStep,
  prices: WorkshopPrices,
): Promise<{ charged: number; reference: string | null }> => {
  if (input.step === 'plan') return { charged: 0, reference: null };

  const wallet = await client.query('select balance_coins from public.app_wallets where user_id = $1 for update', [userId]);
  const balance = Number(wallet.rows[0]?.balance_coins ?? 0);
  const reference = workshopReference(input);

  let price: number;
  if (input.type === 'THESIS') {
    const thesis = await client.query(
      'select mode, chapters from public.app_thesis_purchases where user_id = $1 and generation_id = $2 for update',
      [userId, input.generationId],
    );
    const row = thesis.rows[0];
    const chapters: number[] = (row?.chapters ?? []).map(Number);
    if (row?.mode === 'forfait' || chapters.includes(Number(input.chapterIndex))) return { charged: 0, reference: null };
    const flat = input.thesisMode === 'forfait';
    price = flat ? prices.THESIS_FLAT : prices.THESIS_CHAPTER;
    if (!wallet.rows[0] || balance < price) throw new WorkshopFundsError(price, balance);
    await client.query(
      `insert into public.app_thesis_purchases (user_id, generation_id, mode, chapters)
       values ($1, $2, $3, $4)
       on conflict (user_id, generation_id) do update
         set mode = excluded.mode, chapters = excluded.chapters, updated_at = now()`,
      [userId, input.generationId, flat ? 'forfait' : 'chapitre', flat ? chapters : [...chapters, Number(input.chapterIndex)]],
    );
  } else {
    const already = await client.query(
      `select 1 from public.app_wallet_transactions
        where user_id = $1 and reference_id = $2 and type = 'purchase' and status = 'success' limit 1`,
      [userId, reference],
    );
    if (already.rows[0]) return { charged: 0, reference: null };
    price = input.type === 'REPORT' ? prices.REPORT : prices.CV;
    if (!wallet.rows[0] || balance < price) throw new WorkshopFundsError(price, balance);
  }

  await client.query(
    'update public.app_wallets set balance_coins = balance_coins - $1, updated_at = now() where user_id = $2',
    [price, userId],
  );
  await client.query(
    `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status)
     values ($1, 'purchase', $2, $3, 'success')`,
    [userId, -price, reference],
  );
  return { charged: price, reference };
};

/** Gives the coins back (and the thesis chapter or flat price) when the AI could not write. */
export const refundWorkshopOn = async (
  client: WorkshopClient,
  userId: string,
  input: WorkshopStep,
  reference: string,
): Promise<void> => {
  const removed = await client.query(
    `update public.app_wallet_transactions
        set status = 'failed', failure_message = 'Rédaction IA échouée : coins rendus.'
      where user_id = $1 and reference_id = $2 and type = 'purchase' and status = 'success'
      returning amount_coins`,
    [userId, reference],
  );
  const amount = Math.abs(Number(removed.rows[0]?.amount_coins ?? 0));
  if (amount <= 0) return;
  await client.query(
    'update public.app_wallets set balance_coins = balance_coins + $1, updated_at = now() where user_id = $2',
    [amount, userId],
  );
  if (input.type !== 'THESIS') return;
  if (input.thesisMode === 'forfait') {
    await client.query(
      `update public.app_thesis_purchases set mode = 'chapitre', updated_at = now() where user_id = $1 and generation_id = $2`,
      [userId, input.generationId],
    );
  } else {
    await client.query(
      `update public.app_thesis_purchases set chapters = array_remove(chapters, $3), updated_at = now()
        where user_id = $1 and generation_id = $2`,
      [userId, input.generationId, Number(input.chapterIndex)],
    );
  }
};

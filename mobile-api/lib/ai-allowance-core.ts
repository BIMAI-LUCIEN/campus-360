// Free AI on PDFs (contexte.md §19): 3 actions a day; a summary, a sheet or a
// quiz is 1 action, a conversation is 1 action every 5 questions. An active
// Revision Pass lifts the limit (the daily 60-call quota still applies).
// Self-contained (no imports) for tests with a fake client.

export type AllowanceClient = { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> };

export type AiActionKind = 'summary' | 'sheet' | 'quiz' | 'question';

export const FREE_ACTIONS = 3;
export const QUESTIONS_PER_ACTION = 5;

export type Allowance = { allowed: boolean; pass: boolean; remaining: number };

// Africa/Douala is UTC+1 all year: the free actions come back at local midnight.
export const allowanceDay = (now: Date): string => new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 10);

export const consumeAllowanceOn = async (
  client: AllowanceClient,
  userId: string,
  kind: AiActionKind,
  now: Date = new Date(),
): Promise<Allowance> => {
  const pass = await client.query(
    `select 1 from public.app_revision_passes where user_id = $1 and starts_at <= $2 and expires_at > $2 limit 1`,
    [userId, now.toISOString()],
  );
  if (pass.rows[0]) return { allowed: true, pass: true, remaining: FREE_ACTIONS };

  const day = allowanceDay(now);
  await client.query(
    `insert into public.app_ai_free_actions (user_id, day) values ($1, $2) on conflict (user_id, day) do nothing`,
    [userId, day],
  );
  const row = await client.query(
    'select actions, questions from public.app_ai_free_actions where user_id = $1 and day = $2 for update',
    [userId, day],
  );
  const actions = Number(row.rows[0]?.actions ?? 0);
  const questions = Number(row.rows[0]?.questions ?? 0);
  // A question opens a new action only when the previous block of 5 is full.
  const opensAction = kind !== 'question' || questions % QUESTIONS_PER_ACTION === 0;
  if (opensAction && actions >= FREE_ACTIONS) return { allowed: false, pass: false, remaining: 0 };

  const nextActions = actions + (opensAction ? 1 : 0);
  await client.query(
    'update public.app_ai_free_actions set actions = $3, questions = $4 where user_id = $1 and day = $2',
    [userId, day, nextActions, questions + (kind === 'question' ? 1 : 0)],
  );
  return { allowed: true, pass: false, remaining: FREE_ACTIONS - nextActions };
};

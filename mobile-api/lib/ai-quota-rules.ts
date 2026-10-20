export const readDailyLimit = (env: Record<string, string | undefined>): number => {
  const raw = env.AI_DAILY_LIMIT;
  if (!raw || raw.trim() === '') {
    return 60;
  }
  const parsed = Number(raw.trim());
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1000) {
    throw new Error('AI_DAILY_LIMIT doit être un entier entre 1 et 1000.');
  }
  return parsed;
};

export const AI_ROUTE_LIMITS = {
  generate: { max: 10, windowMs: 600_000 },
  'generate-full': { max: 5, windowMs: 600_000 },
  'onboard-chat': { max: 30, windowMs: 600_000 },
  'defense-coach': { max: 20, windowMs: 600_000 },
  diagram: { max: 20, windowMs: 600_000 },
  'ai-editor': { max: 60, windowMs: 60_000 },
  'document-chat': { max: 40, windowMs: 600_000 },
  'section-interview-draft': { max: 20, windowMs: 600_000 },
  'ai-pdf-chat': { max: 60, windowMs: 60_000 },
} as const;

export type AiRoute = keyof typeof AI_ROUTE_LIMITS;

export const DAILY_LIMIT_MESSAGE = "Tu as atteint la limite d'utilisation de l'IA pour aujourd'hui. Réessaie demain.";

/**
 * Pure atomic reservation of an AI call slot in app_ia_usage_logs.
 * Inserts a row only if total calls in the last 24h are strictly less than the limit.
 */
export const reserveDailyAiCall = async (
  pool: { query: (sql: string, params: any[]) => Promise<any> },
  userId: string,
  limit: number,
): Promise<boolean> => {
  const query = `with c as (
    select count(*)::int as n
    from public.app_ia_usage_logs
    where user_id = $1 and created_at > now() - interval '1 day'
  )
  insert into public.app_ia_usage_logs (user_id, tokens_used)
  select $1, 0 from c where c.n < $2 returning id`;

  const result = await pool.query(query, [userId, limit]);
  return (result.rows?.length ?? 0) > 0;
};

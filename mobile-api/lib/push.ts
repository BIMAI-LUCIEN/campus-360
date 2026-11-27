import { databasePool } from './database';

/**
 * Push notifications via Expo's push service.
 *
 * Tokens are collected at sign-in by the mobile client and stored in
 * `app_user_push_tokens`. Business actions call `sendPushToUser` to fan a
 * message out to every device the user registered. Delivery is best-effort and
 * never throws — a push failure must never roll back or block the action that
 * triggered it.
 */

export type PushInput = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export type PushDeliveryReport = {
  tokenCount: number;
  delivered: number;
  removedInvalid: number;
  errors: string[];
};

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

export const isExpoToken = (token: string): boolean =>
  token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const buildExpoPushMessages = (tokens: string[], msg: PushInput) =>
  tokens.map((to) => ({
    to,
    sound: 'default',
    priority: 'high' as const,
    title: msg.title,
    body: msg.body,
    data: msg.data ?? {},
    channelId: 'default',
  }));

/**
 * Keeps the notification in the student's inbox (app_notifications, migration 0028): the
 * bell of the app reads it there, so it is never lost when the push cannot be delivered.
 * Returns false when this exact job alert was already recorded (one alert per offer).
 */
async function recordInInbox(userId: string, msg: PushInput): Promise<boolean> {
  const data = msg.data ?? {};
  const type = typeof data.type === 'string' ? data.type : 'info';
  const jobId = typeof data.jobId === 'string' && UUID.test(data.jobId) ? data.jobId : null;
  const result = await databasePool.query(
    `insert into public.app_notifications (user_id, type, title, body, data, job_id)
     values ($1, $2, $3, $4, $5::jsonb, $6)
     on conflict (user_id, job_id) where type = 'job_match' do nothing
     returning id`,
    [userId, type, msg.title.slice(0, 200), msg.body.slice(0, 500), JSON.stringify(data), type === 'job_match' ? jobId : null],
  );
  return (result.rowCount ?? 0) > 0;
}

async function deleteInvalidPushTokens(tokens: string[]): Promise<number> {
  if (!tokens.length) return 0;
  try {
    const res = await databasePool.query(
      'delete from public.app_user_push_tokens where push_token = any($1::text[])',
      [tokens],
    );
    return res.rowCount ?? 0;
  } catch (error) {
    console.warn('[push] failed to purge invalid tokens:', error instanceof Error ? error.message : 'db error');
    return 0;
  }
}

type ExpoTicket = {
  status?: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
};

export async function sendToTokens(
  tokens: string[],
  msg: PushInput,
  deps?: {
    fetchImpl?: typeof fetch;
    removeInvalidTokens?: (invalid: string[]) => Promise<number>;
  },
): Promise<PushDeliveryReport> {
  const validTokens = [...new Set(tokens.filter(isExpoToken))];
  if (!validTokens.length) {
    return { tokenCount: 0, delivered: 0, removedInvalid: 0, errors: [] };
  }

  const fetchImpl = deps?.fetchImpl ?? fetch;
  const removeInvalid = deps?.removeInvalidTokens ?? deleteInvalidPushTokens;

  const chunks: string[][] = [];
  for (let i = 0; i < validTokens.length; i += 100) chunks.push(validTokens.slice(i, i + 100));

  let delivered = 0;
  const invalidTokens: string[] = [];
  const errors: string[] = [];

  for (const chunk of chunks) {
    try {
      const response = await fetchImpl(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildExpoPushMessages(chunk, msg)),
      });

      if (!response.ok) {
        errors.push(`EXPO_HTTP_${response.status}`);
        console.warn('[push] Expo Push API error', { status: response.status, count: chunk.length });
        continue;
      }

      const payload = (await response.json().catch(() => null)) as { data?: ExpoTicket[] } | null;
      const tickets = Array.isArray(payload?.data) ? payload.data : null;
      if (!tickets) {
        delivered += chunk.length;
        continue;
      }

      tickets.forEach((ticket, idx) => {
        if (ticket?.status === 'ok') {
          delivered += 1;
          return;
        }
        const errCode = ticket?.details?.error || ticket?.message || 'EXPO_TICKET_ERROR';
        errors.push(String(errCode).slice(0, 120));
        if (ticket?.details?.error === 'DeviceNotRegistered' && chunk[idx]) {
          invalidTokens.push(chunk[idx]);
        }
      });
    } catch (error) {
      errors.push('EXPO_NETWORK_ERROR');
      console.warn('[push] Expo Push network error:', error instanceof Error ? error.message : 'network');
    }
  }

  const removedInvalid = invalidTokens.length ? await removeInvalid(invalidTokens) : 0;
  if (errors.length) {
    console.warn('[push] delivery issues', {
      tokenCount: validTokens.length,
      delivered,
      removedInvalid,
      errorCodes: [...new Set(errors)].slice(0, 5),
    });
  }

  return { tokenCount: validTokens.length, delivered, removedInvalid, errors: [...new Set(errors)] };
}

export async function sendPushToUser(userId: string, msg: PushInput): Promise<void> {
  try {
    const recorded = await recordInInbox(userId, msg).catch((error) => {
      console.error('[push] inbox insert failed:', error);
      return true;
    });
    if (!recorded) return;
    const { rows } = await databasePool.query<{ push_token: string }>(
      'select push_token from public.app_user_push_tokens where user_id = $1',
      [userId],
    );
    const tokens = rows.map((r) => r.push_token).filter(isExpoToken);
    if (!tokens.length) return;
    await sendToTokens(tokens, msg);
  } catch {
    // Best-effort: swallow so the caller's transaction/response is unaffected.
  }
}

/** Sends a direct test push to all registered devices of the authenticated user and reports exact status. */
export async function sendTestPushToUser(userId: string): Promise<PushDeliveryReport> {
  const { rows } = await databasePool.query<{ push_token: string }>(
    'select push_token from public.app_user_push_tokens where user_id = $1',
    [userId],
  );
  const tokens = rows.map((r) => r.push_token).filter(isExpoToken);
  if (!tokens.length) {
    return { tokenCount: 0, delivered: 0, removedInvalid: 0, errors: [] };
  }
  return sendToTokens(tokens, {
    title: 'Campus 360 — Alerte test réussie',
    body: 'Tes notifications hors de l’app fonctionnent correctement sur ce téléphone.',
    data: { type: 'push_test' },
  });
}

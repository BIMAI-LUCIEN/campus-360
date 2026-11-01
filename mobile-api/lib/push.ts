import { databasePool } from './database';

/**
 * Push notifications via Expo's push service.
 *
 * Tokens are collected at sign-in by the mobile client and stored in
 * `app_user_push_tokens`. This module is the missing sender: business actions
 * (a purchase clearing, a top-up confirming, …) call `sendPushToUser` to fan a
 * message out to every device the user registered. Delivery is best-effort and
 * never throws — a push failure must never roll back or block the action that
 * triggered it.
 */

type PushInput = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

const isExpoToken = (token: string) =>
  token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

async function sendToTokens(tokens: string[], msg: PushInput): Promise<void> {
  // Expo accepts up to 100 messages per request; chunk defensively.
  const chunks: string[][] = [];
  for (let i = 0; i < tokens.length; i += 100) chunks.push(tokens.slice(i, i + 100));

  await Promise.all(
    chunks.map((chunk) =>
      fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          chunk.map((to) => ({
            to,
            sound: 'default',
            title: msg.title,
            body: msg.body,
            data: msg.data ?? {},
            channelId: 'default',
          })),
        ),
      }).catch(() => undefined),
    ),
  );
}

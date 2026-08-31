import { databasePool } from './database';

type PushInput = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

const isExpoToken = (token: string) =>
  token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken');

export async function sendPushToUser(userId: string, msg: PushInput): Promise<void> {
  try {
    const { rows } = await databasePool.query<{ push_token: string }>(
      'select push_token from public.app_user_push_tokens where user_id = $1',
      [userId],
    );
    const tokens = rows.map((r) => r.push_token).filter(isExpoToken);
    if (!tokens.length) return;
    await sendToTokens(tokens, msg);
  } catch {
    // Best-effort: swallow so caller's transaction/response is unaffected.
  }
}

async function sendToTokens(tokens: string[], msg: PushInput): Promise<void> {
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

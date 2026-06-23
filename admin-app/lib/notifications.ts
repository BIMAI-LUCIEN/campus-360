import { databasePool } from './database';

export type PushNotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, any>;
};

/**
 * Sends a push notification to one or more app users by their `public.app_users.id` (UUID).
 * Fetches all active tokens for the specified user(s) and sends them to Expo's Push Service.
 */
export async function sendPushNotification(
  userIds: string | string[],
  payload: PushNotificationPayload
): Promise<{ success: boolean; sentCount: number; errors?: any[] }> {
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  if (ids.length === 0) {
    return { success: true, sentCount: 0 };
  }

  try {
    // 1. Fetch push tokens for these users
    const result = await databasePool.query(
      `select id, push_token, user_id from public.app_user_push_tokens
       where user_id = any($1::uuid[])`,
      [ids]
    );

    const tokens = result.rows;
    if (tokens.length === 0) {
      console.log(`[PushNotification] No push tokens found for users: ${ids.join(', ')}`);
      return { success: true, sentCount: 0 };
    }

    // 2. Prepare the Expo push messages
    const messages = tokens.map((t) => ({
      to: t.push_token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
    }));

    console.log(`[PushNotification] Sending ${messages.length} notifications to Expo...`);

    // 3. Post to Expo's push service
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Expo Push API error: ${response.status} ${errorText}`);
    }

    const resData = await response.json();
    const data = resData.data; // array of receipts

    const errors: any[] = [];
    const tokensToDelete: string[] = [];

    if (Array.isArray(data)) {
      for (let i = 0; i < data.length; i++) {
        const status = data[i];
        if (status.status === 'error') {
          errors.push(status);
          const currentTokenRecord = tokens[i];
          console.warn(`[PushNotification] Error for token ${currentTokenRecord.push_token}:`, status.message);
          
          // If token is inactive or not registered, mark for deletion
          if (status.details?.error === 'DeviceNotRegistered') {
            tokensToDelete.push(currentTokenRecord.push_token);
          }
        }
      }
    }

    // 4. Clean up inactive/unregistered tokens
    if (tokensToDelete.length > 0) {
      console.log(`[PushNotification] Deleting ${tokensToDelete.length} unregistered tokens...`);
      await databasePool.query(
        `delete from public.app_user_push_tokens where push_token = any($1::text[])`,
        [tokensToDelete]
      );
    }

    return {
      success: true,
      sentCount: messages.length - errors.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err: any) {
    console.error('[PushNotification] Failed to send push notification:', err);
    return { success: false, sentCount: 0, errors: [err.message] };
  }
}

import { databasePool } from './database';

/**
 * Mobile app control from the dashboard: remote config (table `app_config`,
 * read by the app through mobile-api GET /api/mobile/config) and push
 * campaigns sent through Expo to the tokens in `app_user_push_tokens`.
 */

export type AppConfigKey = 'maintenance' | 'min_version' | 'features' | 'announcement';

export const APP_CONFIG_DEFAULTS: Record<AppConfigKey, Record<string, unknown>> = {
  maintenance: { enabled: false, message: 'Campus 360 est en maintenance. Revenez dans quelques minutes.' },
  min_version: { android: '0.0.0', ios: '0.0.0', recommended: '0.0.0', updateUrl: 'https://campus360b.site' },
  features: { ai: true, payments: true, stages: true, pdf: true, documents: true },
  announcement: { enabled: false, title: '', message: '', tone: 'info', link: '' },
};

export interface AppConfigEntry {
  key: AppConfigKey;
  value: Record<string, unknown>;
  updatedAt: string | null;
  updatedBy: string | null;
}

export async function getAppConfigEntries(): Promise<{ entries: AppConfigEntry[]; migrated: boolean }> {
  try {
    const { rows } = await databasePool.query<{ key: AppConfigKey; value: Record<string, unknown>; updated_at: Date; updated_by: string | null }>(
      'select key, value, updated_at, updated_by from public.app_config',
    );
    const byKey = new Map(rows.map((r) => [r.key, r]));
    return {
      migrated: true,
      entries: (Object.keys(APP_CONFIG_DEFAULTS) as AppConfigKey[]).map((key) => {
        const row = byKey.get(key);
        return {
          key,
          value: { ...APP_CONFIG_DEFAULTS[key], ...(row?.value ?? {}) },
          updatedAt: row ? new Date(row.updated_at).toISOString() : null,
          updatedBy: row?.updated_by ?? null,
        };
      }),
    };
  } catch (err) {
    console.warn('[app-control] app_config unavailable:', (err as Error).message);
    return {
      migrated: false,
      entries: (Object.keys(APP_CONFIG_DEFAULTS) as AppConfigKey[]).map((key) => ({
        key, value: APP_CONFIG_DEFAULTS[key], updatedAt: null, updatedBy: null,
      })),
    };
  }
}

export async function setAppConfigEntry(key: AppConfigKey, value: Record<string, unknown>, adminEmail: string) {
  await databasePool.query(
    `insert into public.app_config (key, value, updated_at, updated_by) values ($1, $2::jsonb, now(), $3)
     on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by`,
    [key, JSON.stringify(value), adminEmail],
  );
}

/* ── Push campaigns ─────────────────────────────────────────────────────── */

export type PushSegment = {
  audience: 'all' | 'inactive7d' | 'paying' | 'never_paid' | 'university' | 'faculty';
  value?: string;
};

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

const segmentSql = (segment: PushSegment): { where: string; values: unknown[] } => {
  switch (segment.audience) {
    case 'inactive7d':
      return {
        where: `not exists (select 1 from public.session s where s."userId" = u.better_auth_user_id and s."updatedAt" > now() - interval '7 days')`,
        values: [],
      };
    case 'paying':
      return {
        where: `exists (select 1 from public.app_wallet_transactions t where t.user_id = u.id and t.type = 'topup' and t.status = 'success')`,
        values: [],
      };
    case 'never_paid':
      return {
        where: `not exists (select 1 from public.app_wallet_transactions t where t.user_id = u.id and t.type = 'topup' and t.status = 'success')`,
        values: [],
      };
    case 'university':
      return { where: 'u.university ilike $1', values: [`%${segment.value ?? ''}%`] };
    case 'faculty':
      return { where: 'u.faculty ilike $1', values: [`%${segment.value ?? ''}%`] };
    default:
      return { where: 'true', values: [] };
  }
};

const segmentTokensQuery = (segment: PushSegment) => {
  const { where, values } = segmentSql(segment);
  return {
    sql: `select u.id as user_id, p.push_token
            from public.app_users u
            join public.app_user_push_tokens p on p.user_id = u.id
            left join public."user" bu on bu.id = u.better_auth_user_id
           where coalesce(bu.banned, false) = false and ${where}`,
    values,
  };
};

const isExpoToken = (token: string) => token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken');

export async function previewPushAudience(segment: PushSegment): Promise<{ users: number; devices: number }> {
  const { sql, values } = segmentTokensQuery(segment);
  const { rows } = await databasePool.query<{ users: number; devices: number }>(
    `select count(distinct user_id)::int as users, count(*)::int as devices from (${sql}) q`,
    values,
  );
  return { users: Number(rows[0]?.users ?? 0), devices: Number(rows[0]?.devices ?? 0) };
}

export async function sendPushCampaign(input: {
  title: string;
  body: string;
  segment: PushSegment;
  link?: string;
  adminEmail: string;
}): Promise<{ users: number; sent: number; failed: number }> {
  const { sql, values } = segmentTokensQuery(input.segment);
  const { rows } = await databasePool.query<{ user_id: string; push_token: string }>(sql, values);
  const tokens = rows.map((r) => r.push_token).filter(isExpoToken);
  const users = new Set(rows.map((r) => r.user_id)).size;

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < tokens.length; i += 100) {
    const chunk = tokens.slice(i, i + 100);
    try {
      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(
          chunk.map((to) => ({
            to,
            sound: 'default',
            title: input.title,
            body: input.body,
            data: input.link ? { url: input.link } : {},
            channelId: 'default',
          })),
        ),
      });
      const payload = (await response.json().catch(() => null)) as { data?: Array<{ status?: string }> } | null;
      if (!response.ok || !payload?.data) {
        failed += chunk.length;
      } else {
        for (const ticket of payload.data) {
          if (ticket.status === 'ok') sent += 1;
          else failed += 1;
        }
      }
    } catch {
      failed += chunk.length;
    }
  }

  await databasePool.query(
    `insert into public.app_push_campaigns (title, body, segment, target_users, sent_count, failed_count, created_by)
     values ($1, $2, $3::jsonb, $4, $5, $6, $7)`,
    [input.title, input.body, JSON.stringify({ ...input.segment, link: input.link ?? null }), users, sent, failed, input.adminEmail],
  );
  return { users, sent, failed };
}

export interface PushCampaign {
  id: string;
  title: string;
  body: string;
  segment: PushSegment & { link?: string | null };
  targetUsers: number;
  sentCount: number;
  failedCount: number;
  createdBy: string | null;
  createdAt: string;
}

export async function listPushCampaigns(): Promise<PushCampaign[]> {
  try {
    const { rows } = await databasePool.query(
      'select * from public.app_push_campaigns order by created_at desc limit 50',
    );
    return rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      segment: r.segment,
      targetUsers: Number(r.target_users),
      sentCount: Number(r.sent_count),
      failedCount: Number(r.failed_count),
      createdBy: r.created_by,
      createdAt: new Date(r.created_at).toISOString(),
    }));
  } catch {
    return [];
  }
}

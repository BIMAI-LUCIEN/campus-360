import { databasePool } from './database';

/**
 * Student management for the admin dashboard: one row per app user with its
 * activity counters (CV, reports, memoirs, applications, payments), and a 360°
 * detail view. Students are `app_users`; ban state lives in Better Auth's
 * "user" table (joined through better_auth_user_id).
 */

export const MAX_ADJUSTMENT_COINS = 50_000;

export interface AdminStudentRow {
  id: string;
  authUserId: string;
  name: string;
  email: string;
  phone: string | null;
  university: string | null;
  faculty: string | null;
  level: string | null;
  role: string;
  banned: boolean;
  createdAt: string;
  lastActiveAt: string | null;
  balanceCoins: number;
  cvCount: number;
  reportCount: number;
  memoirCount: number;
  letterCount: number;
  applicationCount: number;
  paymentCount: number;
  paidFcfa: number;
  spentCoins: number;
  aiCalls24h: number;
}

export interface AdminStudentTotals {
  students: number;
  active7d: number;
  cvs: number;
  reports: number;
  memoirs: number;
  applications: number;
  paidFcfa: number;
  payments: number;
}

const STUDENT_SELECT = `
  select u.id, u.better_auth_user_id, u.name, u.email, coalesce(u.whatsapp_phone, u.phone) as phone,
         u.university, u.faculty, u.level, u.role, u.created_at,
         coalesce(bu.banned, false) as banned,
         (select max(s."updatedAt") from public.session s where s."userId" = u.better_auth_user_id) as last_active_at,
         coalesce(w.balance_coins, 0) as balance_coins,
         coalesce(d.cv, 0) + coalesce(a.cv_generated, 0) as cv_count,
         coalesce(d.report, 0) as report_count,
         coalesce(d.memoir, 0) as memoir_count,
         coalesce(d.letter, 0) as letter_count,
         coalesce(a.total, 0) as application_count,
         coalesce(t.payments, 0) as payment_count,
         coalesce(t.paid, 0) as paid_fcfa,
         coalesce(t.spent, 0) as spent_coins,
         coalesce(ia.calls, 0) as ai_calls_24h
    from public.app_users u
    left join public."user" bu on bu.id = u.better_auth_user_id
    left join public.app_wallets w on w.user_id = u.id
    left join lateral (
      select count(*) filter (where template_type = 'cv')::int as cv,
             count(*) filter (where template_type = 'stage')::int as report,
             count(*) filter (where template_type = 'memoire')::int as memoir,
             count(*) filter (where template_type = 'lettre_motivation')::int as letter
        from public.app_documents where user_id = u.id
    ) d on true
    left join lateral (
      select count(*)::int as total,
             count(*) filter (where sa.generated_cv_text is not null or sa.cv_file_url is not null)::int as cv_generated
        from public.stage_applications sa
        join public.stage_students st on st.id = sa.student_id
       where st.app_user_id = u.id
    ) a on true
    left join lateral (
      select count(*) filter (where type = 'topup' and status = 'success')::int as payments,
             coalesce(sum(amount_coins) filter (where type = 'topup' and status = 'success'), 0)::int as paid,
             coalesce(-sum(amount_coins) filter (where type = 'purchase' and status = 'success' and amount_coins < 0), 0)::int as spent
        from public.app_wallet_transactions where user_id = u.id
    ) t on true
    left join lateral (
      select count(*)::int as calls from public.app_ia_usage_logs
       where user_id = u.id and created_at > now() - interval '1 day'
    ) ia on true
`;

const toIso = (value: unknown) => (value ? new Date(value as string).toISOString() : null);

const mapStudent = (row: any): AdminStudentRow => ({
  id: row.id,
  authUserId: row.better_auth_user_id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  university: row.university,
  faculty: row.faculty,
  level: row.level,
  role: row.role,
  banned: Boolean(row.banned),
  createdAt: toIso(row.created_at) ?? '',
  lastActiveAt: toIso(row.last_active_at),
  balanceCoins: Number(row.balance_coins),
  cvCount: Number(row.cv_count),
  reportCount: Number(row.report_count),
  memoirCount: Number(row.memoir_count),
  letterCount: Number(row.letter_count),
  applicationCount: Number(row.application_count),
  paymentCount: Number(row.payment_count),
  paidFcfa: Number(row.paid_fcfa),
  spentCoins: Number(row.spent_coins),
  aiCalls24h: Number(row.ai_calls_24h),
});

export type StudentSort = 'recent' | 'active' | 'paid' | 'applications' | 'documents';

const SORTS: Record<StudentSort, string> = {
  recent: 'created_at desc',
  active: 'last_active_at desc nulls last',
  paid: 'paid_fcfa desc, created_at desc',
  applications: 'application_count desc, created_at desc',
  documents: '(cv_count + report_count + memoir_count) desc, created_at desc',
};

export async function listAdminStudents(params: {
  search?: string;
  filter?: 'all' | 'paying' | 'banned' | 'inactive' | 'admins';
  sort?: StudentSort;
}): Promise<{ students: AdminStudentRow[]; totals: AdminStudentTotals }> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (params.search?.trim()) {
    values.push(`%${params.search.trim()}%`);
    conditions.push(`(name ilike $1 or email ilike $1 or coalesce(phone, '') ilike $1 or coalesce(university, '') ilike $1)`);
  }
  switch (params.filter) {
    case 'paying': conditions.push('payment_count > 0'); break;
    case 'banned': conditions.push('banned'); break;
    case 'inactive': conditions.push(`(last_active_at is null or last_active_at < now() - interval '7 days')`); break;
    case 'admins': conditions.push(`role in ('admin', 'super_admin')`); break;
    default: break;
  }
  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
  const order = SORTS[params.sort ?? 'recent'] ?? SORTS.recent;

  const { rows } = await databasePool.query(
    `with s as (${STUDENT_SELECT}) select * from s ${where} order by ${order} limit 1000`,
    values,
  );
  const { rows: totalRows } = await databasePool.query(
    `with s as (${STUDENT_SELECT})
     select count(*)::int as students,
            count(*) filter (where last_active_at > now() - interval '7 days')::int as active7d,
            coalesce(sum(cv_count), 0)::int as cvs,
            coalesce(sum(report_count), 0)::int as reports,
            coalesce(sum(memoir_count), 0)::int as memoirs,
            coalesce(sum(application_count), 0)::int as applications,
            coalesce(sum(paid_fcfa), 0)::int as paid_fcfa,
            coalesce(sum(payment_count), 0)::int as payments
       from s`,
  );
  const t = totalRows[0] ?? {};
  return {
    students: rows.map(mapStudent),
    totals: {
      students: Number(t.students ?? 0),
      active7d: Number(t.active7d ?? 0),
      cvs: Number(t.cvs ?? 0),
      reports: Number(t.reports ?? 0),
      memoirs: Number(t.memoirs ?? 0),
      applications: Number(t.applications ?? 0),
      paidFcfa: Number(t.paid_fcfa ?? 0),
      payments: Number(t.payments ?? 0),
    },
  };
}

export interface AdminStudentDetail {
  student: AdminStudentRow;
  transactions: Array<{ id: string; type: string; packType: string | null; amountCoins: number; status: string; referenceId: string | null; note: string | null; createdAt: string }>;
  applications: Array<{ id: string; jobTitle: string; companyName: string; status: string; appliedAt: string; hasCv: boolean; hasLetter: boolean }>;
  documents: Array<{ id: string; title: string; templateType: string; createdAt: string; updatedAt: string }>;
  pdfPurchases: Array<{ id: string; title: string; amountCoins: number; createdAt: string }>;
  sessions: Array<{ id: string; userAgent: string | null; ipAddress: string | null; updatedAt: string; expiresAt: string }>;
  pushDevices: number;
}

const safeRows = async <T>(sql: string, values: unknown[]): Promise<T[]> => {
  try {
    const { rows } = await databasePool.query(sql, values);
    return rows as T[];
  } catch (err) {
    console.warn('[admin-students] optional query failed:', (err as Error).message);
    return [];
  }
};

export async function getAdminStudent(id: string): Promise<AdminStudentDetail | null> {
  const { rows } = await databasePool.query(`with s as (${STUDENT_SELECT}) select * from s where id = $1`, [id]);
  if (!rows[0]) return null;
  const student = mapStudent(rows[0]);

  const [transactions, applications, documents, pdfPurchases, sessions, devices] = await Promise.all([
    safeRows<any>(
      `select t.id, t.type, t.pack_type, t.amount_coins, t.status, t.reference_id,
              coalesce(to_jsonb(t)->>'note', to_jsonb(t)->>'failure_message') as note, t.created_at
         from public.app_wallet_transactions t where t.user_id = $1 order by t.created_at desc limit 300`,
      [id],
    ),
    safeRows<any>(
      `select sa.id, j.title, c.name as company_name, sa.status, sa.applied_at,
              (sa.generated_cv_text is not null or sa.cv_file_url is not null) as has_cv,
              (sa.generated_letter_text is not null or sa.letter_file_url is not null) as has_letter
         from public.stage_applications sa
         join public.stage_students st on st.id = sa.student_id
         join public.stage_jobs j on j.id = sa.job_id
         join public.stage_companies c on c.id = j.company_id
        where st.app_user_id = $1 order by sa.applied_at desc limit 300`,
      [id],
    ),
    safeRows<any>(
      `select id, title, template_type, created_at, updated_at
         from public.app_documents where user_id = $1 order by updated_at desc limit 300`,
      [id],
    ),
    safeRows<any>(
      `select p.id, coalesce(d.title, 'Document') as title, coalesce(p.amount_coins, 0) as amount_coins, p.created_at
         from public.app_document_purchases p
         left join public.documents d on d.id = p.document_id
        where p.buyer_id = $1 order by p.created_at desc limit 200`,
      [id],
    ),
    safeRows<any>(
      `select id, "userAgent" as user_agent, "ipAddress" as ip_address, "updatedAt" as updated_at, "expiresAt" as expires_at
         from public.session where "userId" = $1 and "expiresAt" > now() order by "updatedAt" desc limit 20`,
      [student.authUserId],
    ),
    safeRows<{ n: number }>('select count(*)::int as n from public.app_user_push_tokens where user_id = $1', [id]),
  ]);

  return {
    student,
    transactions: transactions.map((r) => ({
      id: r.id,
      type: r.type,
      packType: r.pack_type,
      amountCoins: Number(r.amount_coins),
      status: r.status,
      referenceId: r.reference_id,
      note: r.note ?? null,
      createdAt: toIso(r.created_at) ?? '',
    })),
    applications: applications.map((r) => ({
      id: r.id,
      jobTitle: r.title,
      companyName: r.company_name,
      status: r.status,
      appliedAt: toIso(r.applied_at) ?? '',
      hasCv: Boolean(r.has_cv),
      hasLetter: Boolean(r.has_letter),
    })),
    documents: documents.map((r) => ({
      id: r.id,
      title: r.title,
      templateType: r.template_type,
      createdAt: toIso(r.created_at) ?? '',
      updatedAt: toIso(r.updated_at) ?? '',
    })),
    pdfPurchases: pdfPurchases.map((r) => ({
      id: r.id,
      title: r.title,
      amountCoins: Number(r.amount_coins),
      createdAt: toIso(r.created_at) ?? '',
    })),
    sessions: sessions.map((r) => ({
      id: r.id,
      userAgent: r.user_agent,
      ipAddress: r.ip_address,
      updatedAt: toIso(r.updated_at) ?? '',
      expiresAt: toIso(r.expires_at) ?? '',
    })),
    pushDevices: Number(devices[0]?.n ?? 0),
  };
}

/** Credits (positive) or debits (negative) a student's wallet, traced as 'admin_adjustment'. */
export async function adjustStudentWallet(input: {
  userId: string;
  amount: number;
  reason: string;
  adminEmail: string;
}): Promise<{ balance: number }> {
  const client = await databasePool.connect();
  try {
    await client.query('begin');
    await client.query(
      `insert into public.app_wallets (user_id, balance_coins) values ($1, 0) on conflict (user_id) do nothing`,
      [input.userId],
    );
    const { rows } = await client.query<{ balance_coins: number }>(
      `update public.app_wallets set balance_coins = balance_coins + $2, updated_at = now()
        where user_id = $1 and balance_coins + $2 >= 0 returning balance_coins`,
      [input.userId, input.amount],
    );
    if (!rows[0]) throw new Error('Solde insuffisant pour ce débit.');
    await client.query(
      `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status, note)
       values ($1, 'admin_adjustment', $2, $3, 'success', $4)`,
      [
        input.userId,
        input.amount,
        `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        `${input.reason} (par ${input.adminEmail})`.slice(0, 500),
      ],
    );
    await client.query('commit');
    return { balance: Number(rows[0].balance_coins) };
  } catch (err) {
    await client.query('rollback').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function resetStudentAiQuota(userId: string): Promise<number> {
  const { rowCount } = await databasePool.query(
    `delete from public.app_ia_usage_logs where user_id = $1 and created_at > now() - interval '1 day'`,
    [userId],
  );
  return rowCount ?? 0;
}

export async function revokeStudentSessions(authUserId: string): Promise<number> {
  const { rowCount } = await databasePool.query('delete from public.session where "userId" = $1', [authUserId]);
  return rowCount ?? 0;
}

export async function setStudentBan(authUserId: string, banned: boolean, reason?: string): Promise<void> {
  await databasePool.query(
    `update "user" set banned = $2, "banReason" = $3, "updatedAt" = now() where id = $1`,
    [authUserId, banned, banned ? reason || 'Banni par un administrateur' : null],
  );
  if (banned) await revokeStudentSessions(authUserId);
}

export async function setStudentRole(userId: string, authUserId: string, role: 'student' | 'admin' | 'super_admin') {
  await databasePool.query('update public.app_users set role = $2, updated_at = now() where id = $1', [userId, role]);
  await databasePool.query('update "user" set role = $2, "updatedAt" = now() where id = $1', [authUserId, role]);
}

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function studentsToCsv(students: AdminStudentRow[]): string {
  const header = [
    'Nom', 'Email', 'Téléphone', 'Université', 'Filière', 'Niveau', 'Inscrit le', 'Dernière activité',
    'Solde (coins)', 'CV', 'Rapports', 'Mémoires', 'Lettres', 'Candidatures', 'Paiements', 'Payé (FCFA)', 'Dépensé (coins)', 'Banni',
  ];
  const lines = students.map((s) => [
    s.name, s.email, s.phone, s.university, s.faculty, s.level, s.createdAt.slice(0, 10), s.lastActiveAt?.slice(0, 10),
    s.balanceCoins, s.cvCount, s.reportCount, s.memoirCount, s.letterCount, s.applicationCount, s.paymentCount, s.paidFcfa, s.spentCoins,
    s.banned ? 'oui' : 'non',
  ].map(csvCell).join(','));
  return [header.join(','), ...lines].join('\n');
}

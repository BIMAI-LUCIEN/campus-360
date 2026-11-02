import { FOLLOWUP_STATUSES, MAX_REMINDERS, REMINDER_INTERVAL_DAYS } from './application-rules';
import { databasePool } from './database';
import { sendPushToUser } from './push';

// Daily reminder to the students (contexte.md §21): each deadline is claimed once, then every
// student gets one notification that sums up theirs. Android receives it in the bell until
// the push is configured (plan.md 32.7): sendPushToUser always records it in the inbox first.

const MAX_PER_RUN = 500;

export const buildFollowupNotice = (companies: string[]) => {
  if (companies.length === 1) {
    return {
      title: `Des nouvelles de ${companies[0]} ?`,
      body: "Une semaine sans réponse. Dis-nous si l'entreprise t'a répondu, sinon relance-la en un geste.",
    };
  }
  return {
    title: `${companies.length} candidatures sans réponse`,
    body: 'Une semaine sans réponse. Dis-nous où tu en es, sinon relance ces entreprises en un geste.',
  };
};

export type FollowupsResult = { applications: number; students: number };

export const runApplicationFollowups = async (): Promise<FollowupsResult> => {
  const { rows } = await databasePool.query<{ user_id: string | null; company: string | null }>(
    `with claimed as (
       update public.stage_applications set followup_notified_at = now()
        where id in (
          select a.id
            from public.stage_applications a
            join public.stage_jobs j on j.id = a.job_id
           where a.status::text = any($1::text[])
             and a.reminder_count < $2
             and coalesce(a.last_reminded_at, a.applied_at) <= now() - make_interval(days => $3)
             and (a.followup_notified_at is null
                  or a.followup_notified_at < coalesce(a.last_reminded_at, a.applied_at) + make_interval(days => $3))
             and (j.expires_at is null or j.expires_at > now())
           order by a.applied_at
           limit $4
           for update of a skip locked)
       returning student_id, job_id)
     select s.app_user_id::text as user_id, c.name as company
       from claimed
       join public.stage_students s on s.id = claimed.student_id
       join public.stage_jobs j on j.id = claimed.job_id
       join public.stage_companies c on c.id = j.company_id`,
    [FOLLOWUP_STATUSES, MAX_REMINDERS, REMINDER_INTERVAL_DAYS, MAX_PER_RUN],
  );

  const byStudent = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.user_id) continue;
    byStudent.set(row.user_id, [...(byStudent.get(row.user_id) ?? []), row.company || "l'entreprise"]);
  }
  for (const [userId, companies] of byStudent) {
    await sendPushToUser(userId, {
      ...buildFollowupNotice(companies),
      data: { type: 'application_followup', count: companies.length },
    });
  }
  return { applications: rows.length, students: byStudent.size };
};

import { databasePool } from './database';
import { scoreJobForStudent, STRONG_MATCH, type AlertJob } from './job-alert-score';
import { sendPushToUser } from './push';

// New-offer alerts (contexte.md §19, notifications): every published offer not yet
// announced is claimed once, then
//  - each student it fits (score >= STRONG_MATCH) gets « Nouveau stage pour toi » (at most
//    MAX_MATCH_ALERTS per run, the rest summed up in one line);
//  - the other students get one daily summary of the new offers.
// Called after an offer is published (ingest, review) and by the VPS cron for the offers
// published elsewhere (scraping agents, admin portal).

const MAX_JOBS_PER_RUN = 30;
const MAX_STUDENTS = 2000;
const MAX_MATCH_ALERTS = 3;
const DIGEST_EVERY_HOURS = 20;

type ClaimedJob = AlertJob & { id: string; companyName: string; location: string | null };

export type JobAlertsResult = { jobs: number; matchAlerts: number; digests: number };

const claimNewJobs = async (): Promise<ClaimedJob[]> => {
  const { rows } = await databasePool.query<{
    id: string;
    title: string;
    description: string | null;
    requirements: string[] | null;
    location: string | null;
    company_name: string | null;
    industry: string | null;
  }>(
    `with claimed as (
       update public.stage_jobs set alerted_at = now()
        where id in (
          select id from public.stage_jobs
           where status = 'published' and alerted_at is null
             and (expires_at is null or expires_at > now())
           order by created_at
           limit $1
           for update skip locked)
       returning id, title, description, requirements, location, company_id)
     select claimed.id, claimed.title, claimed.description, claimed.requirements, claimed.location,
            c.name as company_name, c.industry
       from claimed
       left join public.stage_companies c on c.id = claimed.company_id`,
    [MAX_JOBS_PER_RUN],
  );
  return rows.map((row) => ({
    id: String(row.id),
    title: row.title,
    description: row.description,
    requirements: row.requirements ?? [],
    location: row.location,
    companyName: row.company_name || "Une entreprise",
    industry: row.industry,
  }));
};

const listStudents = async () => {
  const { rows } = await databasePool.query<{ user_id: string; faculty: string | null; skills: string[] | null }>(
    `select u.id::text as user_id, u.faculty, s.skills
       from public.app_users u
       left join public.stage_students s on s.app_user_id = u.id
      where u.role = 'student'
      limit $1`,
    [MAX_STUDENTS],
  );
  return rows.map((row) => ({ userId: row.user_id, faculty: row.faculty, skills: row.skills ?? [] }));
};

const recentlyDigested = async (): Promise<Set<string>> => {
  const { rows } = await databasePool.query<{ user_id: string }>(
    `select distinct user_id::text as user_id from public.app_notifications
      where type = 'job_digest' and created_at > now() - make_interval(hours => $1)`,
    [DIGEST_EVERY_HOURS],
  );
  return new Set(rows.map((row) => row.user_id));
};

const inBatches = async <T>(items: T[], size: number, run: (item: T) => Promise<void>) => {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(run));
};

export const runJobAlerts = async (): Promise<JobAlertsResult> => {
  const jobs = await claimNewJobs();
  if (!jobs.length) return { jobs: 0, matchAlerts: 0, digests: 0 };
  const students = await listStudents();

  let matchAlerts = 0;
  const matchedStudents = new Set<string>();
  await inBatches(students, 20, async (student) => {
    const matches = jobs
      .map((job) => ({ job, score: scoreJobForStudent(student, job) }))
      .filter((entry) => entry.score >= STRONG_MATCH)
      .sort((a, b) => b.score - a.score);
    if (!matches.length) return;
    matchedStudents.add(student.userId);
    const shown = matches.slice(0, MAX_MATCH_ALERTS);
    const others = matches.length - shown.length;
    for (const [index, { job, score }] of shown.entries()) {
      const more = index === shown.length - 1 && others > 0 ? ` Et ${others} autre${others > 1 ? 's' : ''} pour toi.` : '';
      await sendPushToUser(student.userId, {
        title: score >= 85 ? '🔥 Un stage fait pour toi' : 'Nouveau stage pour toi',
        body: `${job.title} chez ${job.companyName}${job.location ? ` (${job.location})` : ''} · ${score} % de correspondance.${more}`,
        data: { type: 'job_match', jobId: job.id, score },
      });
      matchAlerts += 1;
    }
  });

  const digested = await recentlyDigested();
  const digestTargets = students.filter((s) => !matchedStudents.has(s.userId) && !digested.has(s.userId));
  const titles = jobs.slice(0, 2).map((job) => `${job.title} (${job.companyName})`).join(', ');
  const extra = jobs.length > 2 ? ` et ${jobs.length - 2} autre${jobs.length - 2 > 1 ? 's' : ''}` : '';
  await inBatches(digestTargets, 20, async (student) => {
    await sendPushToUser(student.userId, {
      title: jobs.length > 1 ? `${jobs.length} nouveaux stages publiés` : 'Nouveau stage publié',
      body:
        `${titles}${extra}.` +
        (student.skills.length || student.faculty
          ? ' Regarde-les dans l’app.'
          : ' Ajoute ta filière et tes compétences dans ton profil pour recevoir les offres qui te correspondent.'),
      data: { type: 'job_digest', jobIds: jobs.map((job) => job.id) },
    });
  });

  return { jobs: jobs.length, matchAlerts, digests: digestTargets.length };
};

/** Fire-and-forget after a publication: never delays nor fails the caller. */
export const triggerJobAlerts = () => {
  void runJobAlerts().catch((error) => console.error('[job-alerts] run failed:', error));
};

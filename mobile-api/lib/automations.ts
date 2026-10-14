import { databasePool } from './database';
import { escapeHtml, sendTransactionalEmail } from './mailer';
import { MATCH_ALERT_THRESHOLD, computeMatchScore } from './match-score';
import { sendPushToUser } from './push';

/**
 * V1 automations (validated scope, contexte.md §11.2):
 *  1. Welcome email + push with the 3 best-matching internships at the end of onboarding.
 *  2. "New internship for you" push when an ingested offer matches a student (score >= 70 %).
 *  3. Wallet top-up receipt (push + email) once the payment provider confirmed the payment.
 *  4. Admin alert when a payment or an application dispatch ends in FAILED.
 *
 * Every function is best-effort and never throws: an automation failure must not roll back
 * or block the business action that triggered it.
 */

const MAX_ALERTED_STUDENTS = 500;
const APP_NAME = 'Campus 360';

type JobForMatching = {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  companyName: string;
};

const getUserContact = async (userId: string) => {
  const { rows } = await databasePool.query<{ email: string | null; name: string | null }>(
    'select email, name from public.app_users where id::text = $1 limit 1',
    [userId],
  );
  return rows[0] ?? null;
};

const adminRecipient = () =>
  process.env.ADMIN_ALERT_EMAIL?.trim() ||
  process.env.ADMIN_BOOTSTRAP_EMAIL?.trim() ||
  process.env.ADMIN_ALLOWED_EMAILS?.split(',').map((email) => email.trim()).find(Boolean) ||
  '';

/** 4. Admin alert (payment or dispatch FAILED). */
export const notifyAdmin = async (subject: string, details: Record<string, string | number | null | undefined>) => {
  try {
    const to = adminRecipient();
    if (!to) {
      console.warn(`[automations] No admin recipient configured (ADMIN_ALERT_EMAIL). Alert "${subject}" dropped.`);
      return;
    }
    const entries = Object.entries(details).filter(([, value]) => value !== undefined && value !== null && value !== '');
    const text = entries.map(([key, value]) => `${key} : ${value}`).join('\n');
    const html =
      `<p><strong>${escapeHtml(subject)}</strong></p><ul>` +
      entries.map(([key, value]) => `<li>${escapeHtml(key)} : ${escapeHtml(String(value))}</li>`).join('') +
      `</ul><p style="color:#64748B;font-size:12px">${escapeHtml(new Date().toISOString())}</p>`;
    await sendTransactionalEmail({ to, subject: `[${APP_NAME} admin] ${subject}`, text, html });
  } catch (error) {
    console.error('[automations] notifyAdmin failed:', error);
  }
};

/** 3. Wallet top-up receipt. */
export const sendTopUpReceipt = async (userId: string, amountCoins: number, reference: string) => {
  try {
    const amount = new Intl.NumberFormat('fr-FR').format(amountCoins);
    await sendPushToUser(userId, {
      title: 'Recharge confirmée',
      body: `${amount} coins ont été ajoutés à ton wallet.`,
      data: { type: 'wallet_topup', reference },
    });
    const contact = await getUserContact(userId);
    if (!contact?.email) return;
    const greeting = contact.name ? `Bonjour ${contact.name},` : 'Bonjour,';
    await sendTransactionalEmail({
      to: contact.email,
      subject: `Reçu de recharge ${APP_NAME} : ${amount} coins`,
      text:
        `${greeting}\n\nTa recharge est confirmée.\n\nMontant : ${amount} coins\nRéférence : ${reference}\n` +
        `Date : ${new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Douala' })}\n\nMerci de ta confiance.`,
      html:
        `<p>${escapeHtml(greeting)}</p><p>Ta recharge est confirmée.</p>` +
        `<table style="border-collapse:collapse">` +
        `<tr><td style="padding:4px 12px 4px 0;color:#64748B">Montant</td><td><strong>${escapeHtml(amount)} coins</strong></td></tr>` +
        `<tr><td style="padding:4px 12px 4px 0;color:#64748B">Référence</td><td>${escapeHtml(reference)}</td></tr>` +
        `</table><p>Merci de ta confiance.</p>`,
    });
  } catch (error) {
    console.error('[automations] sendTopUpReceipt failed:', error);
  }
};

const listActiveJobs = async (): Promise<JobForMatching[]> => {
  const { rows } = await databasePool.query<{
    id: string;
    title: string;
    description: string | null;
    requirements: string[] | null;
    company_name: string;
  }>(
    `select j.id, j.title, j.description, j.requirements, c.name as company_name
       from public.stage_jobs j
       join public.stage_companies c on c.id = j.company_id
      where j.expires_at > now() and c.status != 'SUSPENDED'
      order by j.is_sponsored desc, j.created_at desc
      limit 200`,
  );
  return rows.map((row) => ({
    id: String(row.id),
    title: row.title,
    description: row.description ?? '',
    requirements: row.requirements ?? [],
    companyName: row.company_name,
  }));
};

/** 1. Welcome message with the 3 best-matching internships (end of onboarding). */
export const sendWelcomeWithOffers = async (userId: string, skills: readonly string[]) => {
  try {
    const jobs = await listActiveJobs();
    const ranked = jobs
      .map((job) => ({ job, score: computeMatchScore(skills, job.requirements) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    await sendPushToUser(userId, {
      title: `Bienvenue sur ${APP_NAME} !`,
      body: ranked.length
        ? `${ranked.length} stages correspondent déjà à ton profil. Découvre-les.`
        : 'Ton profil est prêt. Les stages qui te correspondent arrivent ici.',
      data: { type: 'welcome', jobIds: ranked.map((entry) => entry.job.id) },
    });

    const contact = await getUserContact(userId);
    if (!contact?.email) return;
    const greeting = contact.name ? `Bienvenue ${contact.name} !` : 'Bienvenue !';
    const offersText = ranked
      .map((entry, index) => `${index + 1}. ${entry.job.title} — ${entry.job.companyName} (${entry.score} % de correspondance)`)
      .join('\n');
    const offersHtml = ranked
      .map(
        (entry) =>
          `<li><strong>${escapeHtml(entry.job.title)}</strong> — ${escapeHtml(entry.job.companyName)} ` +
          `<span style="color:#7C3AED">(${entry.score} % de correspondance)</span></li>`,
      )
      .join('');

    await sendTransactionalEmail({
      to: contact.email,
      subject: `Bienvenue sur ${APP_NAME} : tes premiers stages`,
      text:
        `${greeting}\n\nTon profil est complet.` +
        (ranked.length ? ` Voici les stages qui te correspondent le mieux :\n\n${offersText}\n\n` : '\n\n') +
        `Ouvre l'application pour postuler en un clic.`,
      html:
        `<p>${escapeHtml(greeting)}</p><p>Ton profil est complet.</p>` +
        (ranked.length ? `<p>Voici les stages qui te correspondent le mieux :</p><ol>${offersHtml}</ol>` : '') +
        `<p>Ouvre l'application pour postuler en un clic.</p>`,
    });
  } catch (error) {
    console.error('[automations] sendWelcomeWithOffers failed:', error);
  }
};

/** 2. Push "new internship for you" to students whose skills cover >= 70 % of the requirements. */
export const alertMatchingStudents = async (job: JobForMatching) => {
  try {
    if (job.requirements.length === 0) return 0;
    const { rows } = await databasePool.query<{ app_user_id: string; skills: string[] | null }>(
      `select app_user_id::text as app_user_id, skills
         from public.stage_students
        where app_user_id is not null and coalesce(array_length(skills, 1), 0) > 0
        limit $1`,
      [MAX_ALERTED_STUDENTS],
    );
    const targets = rows
      .map((row) => ({ userId: row.app_user_id, score: computeMatchScore(row.skills ?? [], job.requirements) }))
      .filter((target) => target.score >= MATCH_ALERT_THRESHOLD);

    // Small batches: bounded concurrency on the DB and the Expo push API.
    for (let i = 0; i < targets.length; i += 20) {
      await Promise.all(
        targets.slice(i, i + 20).map((target) =>
          sendPushToUser(target.userId, {
            title: 'Nouveau stage pour toi',
            body: `${job.title} chez ${job.companyName} (${target.score} % de correspondance)`,
            data: { type: 'job_match', jobId: job.id, score: target.score },
          }),
        ),
      );
    }
    return targets.length;
  } catch (error) {
    console.error('[automations] alertMatchingStudents failed:', error);
    return 0;
  }
};

/** Stores the onboarding skills on the stage profile so new-offer alerts can match them. */
export const saveStudentSkills = async (appUserId: string, skills: readonly string[]) => {
  try {
    await databasePool.query(
      'update public.stage_students set skills = $2 where app_user_id::text = $1',
      [appUserId, skills.slice(0, 20)],
    );
  } catch (error) {
    console.error('[automations] saveStudentSkills failed:', error);
  }
};

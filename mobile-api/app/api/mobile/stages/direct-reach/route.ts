import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { databasePool } from '@/lib/database';
import { mobileErrorResponse, requireMobileUser, MobileApiError, withCors } from '@/lib/mobile-access';
import { getStageJob } from '@/lib/stages-db';

export const runtime = 'nodejs';

const directReachSchema = z.object({
  jobId: z.string().trim().uuid(),
  customNotes: z.string().trim().max(1000).optional(),
});

export const OPTIONS = (request: NextRequest) => withCors(new NextResponse(null, { status: 204 }), request);

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response) return access.response;
    const user = access.user;

    const body = await request.json().catch(() => null);
    const parsed = directReachSchema.safeParse(body);
    if (!parsed.success) {
      throw new MobileApiError('Identifiant d offre invalide.', 400);
    }

    const { jobId, customNotes } = parsed.data;

    // 1. Get job and company details (must be published, unexpired, non-suspended)
    const job = await getStageJob(jobId, user.id);
    if (!job) {
      throw new MobileApiError('Offre de stage indisponible.', 404);
    }

    // 2. Ensure or fetch student profile
    const { rows: studentRows } = await databasePool.query<{ id: string }>(
      `select id from public.stage_students where app_user_id = $1 or auth_id = $2 limit 1`,
      [user.id, user.id]
    );

    let studentId: string;
    if (studentRows.length > 0) {
      studentId = studentRows[0].id;
    } else {
      const { rows: newStudent } = await databasePool.query<{ id: string }>(
        `insert into public.stage_students (auth_id, full_name, email, app_user_id)
         values ($1, $2, $3, $4)
         returning id`,
        [user.id, user.name || 'Étudiant Campus 360', user.email, user.id]
      );
      studentId = newStudent[0].id;
    }

    // 3. Insert or update stage_applications
    await databasePool.query(
      `insert into public.stage_applications (student_id, job_id, status, applied_at, notes)
       values ($1, $2, 'PENDING', now(), $3)
       on conflict (student_id, job_id) do update set
         applied_at = now(),
         notes = excluded.notes`,
      [studentId, jobId, customNotes || 'Candidature acheminée par Direct Reach']
    );

    // 4. Generate direct dispatch links
    const studentName = user.name || 'Candidat Campus 360';
    const emailSubject = encodeURIComponent(`Candidature Stage : ${job.title} — ${studentName}`);
    const emailBody = encodeURIComponent(
      `Madame, Monsieur le Responsable RH de ${job.company.name},\n\n` +
      `Je vous soumets ma candidature pour le poste de « ${job.title} » à ${job.location || 'Douala / Yaoundé'}.\n` +
      `Mon profil académique et mes compétences sont vérifiés sur Campus 360.\n\n` +
      `Bien cordialement,\n${studentName}\nEmail : ${user.email}`
    );

    const mailtoUrl = job.company.contactEmail
      ? `mailto:${job.company.contactEmail}?subject=${emailSubject}&body=${emailBody}`
      : null;

    let whatsappUrl: string | null = null;
    if (job.company.contactWhatsapp) {
      let cleanPhone = job.company.contactWhatsapp.replace(/[^0-9+]/g, '');
      if (cleanPhone.startsWith('00237')) cleanPhone = cleanPhone.slice(2);
      if (cleanPhone.startsWith('+')) cleanPhone = cleanPhone.slice(1);
      if (cleanPhone.startsWith('6') && cleanPhone.length === 9) cleanPhone = '237' + cleanPhone;

      const wpText = encodeURIComponent(
        `Bonjour ${job.company.name} 👋\n\n` +
        `Je suis ${studentName}. Je postule à votre offre de stage : *${job.title}* (${job.location || 'Cameroun'}).\n` +
        `Mon profil vérifié est disponible sur Campus 360.\n` +
        `Disponible pour échanger ! Merci.`
      );
      whatsappUrl = `https://wa.me/${cleanPhone}?text=${wpText}`;
    }

    return withCors(
      NextResponse.json({
        success: true,
        jobId,
        companyName: job.company.name,
        mailtoUrl,
        whatsappUrl,
      }),
      request
    );
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}

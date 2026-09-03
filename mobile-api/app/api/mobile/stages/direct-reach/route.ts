import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { databasePool } from '@/lib/database';
import { mobileErrorResponse, requireMobileUser, MobileApiError } from '@/lib/mobile-access';

export const runtime = 'nodejs';

const directReachSchema = z.object({
  jobId: z.string().trim().uuid(),
  customNotes: z.string().trim().max(1000).optional(),
});

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

    // 1. Get job and company details
    const { rows: jobRows } = await databasePool.query<{
      job_id: string;
      title: string;
      location: string;
      company_name: string;
      contact_email: string;
      contact_whatsapp: string | null;
    }>(
      `select j.id as job_id, j.title, j.location, c.name as company_name, c.contact_email, c.contact_whatsapp
       from public.stage_jobs j
       join public.stage_companies c on j.company_id = c.id
       where j.id = $1`,
      [jobId]
    );

    if (!jobRows.length) {
      throw new MobileApiError('Offre introuvable.', 404);
    }
    const job = jobRows[0];

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
      `Madame, Monsieur le Responsable RH de ${job.company_name},\n\n` +
      `Je vous soumets ma candidature pour le poste de « ${job.title} » à ${job.location}.\n` +
      `Mon profil académique et mes compétences sont vérifiés sur Campus 360.\n\n` +
      `Bien cordialement,\n${studentName}\nEmail : ${user.email}`
    );

    const mailtoUrl = `mailto:${job.contact_email}?subject=${emailSubject}&body=${emailBody}`;

    let whatsappUrl: string | null = null;
    if (job.contact_whatsapp) {
      let cleanPhone = job.contact_whatsapp.replace(/[^0-9+]/g, '');
      if (cleanPhone.startsWith('00237')) cleanPhone = cleanPhone.slice(2);
      if (cleanPhone.startsWith('+')) cleanPhone = cleanPhone.slice(1);
      if (cleanPhone.startsWith('6') && cleanPhone.length === 9) cleanPhone = '237' + cleanPhone;

      const wpText = encodeURIComponent(
        `Bonjour ${job.company_name} 👋\n\n` +
        `Je suis ${studentName}. Je postule à votre offre de stage : *${job.title}* (${job.location}).\n` +
        `Mon profil vérifié est disponible sur Campus 360.\n` +
        `Disponible pour échanger ! Merci.`
      );
      whatsappUrl = `https://wa.me/${cleanPhone}?text=${wpText}`;
    }

    return NextResponse.json({
      success: true,
      job: {
        title: job.title,
        company: job.company_name,
        location: job.location,
      },
      channels: {
        mailtoUrl,
        whatsappUrl,
        contactEmail: job.contact_email,
        contactWhatsapp: job.contact_whatsapp,
      },
      message: 'Candidature enregistrée et liens d acheminement générés avec succès.',
    });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}

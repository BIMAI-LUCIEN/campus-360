import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  ensureStageStudent,
  listStudentApplications,
  reserveStudentApplicationReminder,
  updateStudentApplicationNotes,
  updateStudentApplicationStatus,
  StageStatus,
} from '@/lib/stages-db';
import { mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { stageErrorStatus } from '@/lib/stages-errors';
import { canStudentSetStatus } from '@/lib/application-rules';
import { databasePool } from '@/lib/database';

// One change per call: a status the student reports, their private notes, or a
// follow-up an older APK has just opened in WhatsApp (see applications/remind).
const updateSchema = z
  .object({
    applicationId: z.string().uuid(),
    status: z.enum(['WITHDRAWN', 'REVIEWING', 'INTERVIEW', 'ACCEPTED', 'REJECTED']).optional(),
    notes: z.string().max(5_000).optional(),
    reminded: z.literal(true).optional(),
  })
  .strict()
  .refine((input) => [input.status, input.notes, input.reminded].filter((v) => v !== undefined).length === 1, {
    message: 'Une seule modification à la fois.',
  });

export const OPTIONS = (request: NextRequest) => withCors(new NextResponse(null, { status: 204 }), request);

export async function GET(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response) return withCors(access.response, request);
    const studentId = await ensureStageStudent(access.user!);
    const applications = await listStudentApplications(studentId);
    return withCors(NextResponse.json({ success: true, applications }), request);
  } catch (error) {
    console.warn('[applications route] GET applications failed:', error);
    return withCors(
      NextResponse.json({ error: 'Candidatures indisponibles pour le moment.' }, { status: stageErrorStatus(error) }),
      request,
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const access = await requireMobileUser(request, { readBudgetPerMinute: 30 });
    if (access.response) return withCors(access.response, request);
    const input = updateSchema.parse(await request.json());
    const studentId = await ensureStageStudent(access.user!);

    const currentRes = await databasePool.query<{ status: string }>(
      'select status from public.stage_applications where id = $1 and student_id = $2',
      [input.applicationId, studentId],
    );
    if (!currentRes.rows[0]) {
      return withCors(NextResponse.json({ error: 'Candidature introuvable.' }, { status: 404 }), request);
    }

    if (input.notes !== undefined) {
      await updateStudentApplicationNotes(studentId, input.applicationId, input.notes.trim());
      return withCors(NextResponse.json({ success: true, notes: input.notes.trim() }), request);
    }
    if (input.reminded) {
      // Older APKs still report a WhatsApp reminder here: same rule and same cap as a sent one.
      const reserved = await reserveStudentApplicationReminder(studentId, input.applicationId);
      if (!reserved) {
        return withCors(
          NextResponse.json({ error: "Aucune relance n'est possible pour cette candidature pour le moment." }, { status: 409 }),
          request,
        );
      }
      return withCors(NextResponse.json({ success: true, lastRemindedAt: reserved.lastRemindedAt }), request);
    }

    const currentStatus = currentRes.rows[0].status;
    if (!input.status || !canStudentSetStatus(currentStatus, input.status)) {
      return withCors(
        NextResponse.json({ error: 'Ce changement de statut n’est pas possible pour cette candidature.' }, { status: 400 }),
        request,
      );
    }

    const application = await updateStudentApplicationStatus(studentId, input.applicationId, input.status as StageStatus);
    if (!application) {
      return withCors(NextResponse.json({ error: 'Candidature introuvable.' }, { status: 404 }), request);
    }
    return withCors(NextResponse.json({ success: true, application }), request);
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}

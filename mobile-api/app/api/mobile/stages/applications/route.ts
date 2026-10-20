import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ensureStageStudent, listStudentApplications, updateStudentApplicationStatus, StageStatus } from '@/lib/stages-db';
import { mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { stageErrorStatus } from '@/lib/stages-errors';
import { canStudentSetStatus } from '@/lib/application-rules';
import { databasePool } from '@/lib/database';

const updateSchema = z
  .object({
    applicationId: z.string().uuid(),
    status: z.enum(['WITHDRAWN', 'PENDING', 'REVIEWING', 'INTERVIEW', 'ACCEPTED', 'REJECTED']),
  })
  .strict();

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

    const currentStatus = currentRes.rows[0].status;
    if (!canStudentSetStatus(currentStatus, input.status)) {
      return withCors(
        NextResponse.json(
          { error: "Seule l'entreprise ou un administrateur peut changer ce statut." },
          { status: 400 },
        ),
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

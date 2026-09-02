import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { ensureStageStudent, listStudentApplications, updateStudentApplicationStatus } from '@/lib/stages-db';
import { mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';

const updateSchema = z.object({
  applicationId: z.string().uuid(),
  status: z.enum(['PENDING', 'REVIEWING', 'INTERVIEW', 'ACCEPTED', 'REJECTED']),
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
    return mobileErrorResponse(error, request);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const access = await requireMobileUser(request, { readBudgetPerMinute: 30 });
    if (access.response) return withCors(access.response, request);
    const input = updateSchema.parse(await request.json());
    const studentId = await ensureStageStudent(access.user!);
    const application = await updateStudentApplicationStatus(studentId, input.applicationId, input.status);
    if (!application) {
      return withCors(NextResponse.json({ error: 'Candidature introuvable.' }, { status: 404 }), request);
    }
    return withCors(NextResponse.json({ success: true, application }), request);
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}

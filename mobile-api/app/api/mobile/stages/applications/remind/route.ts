import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { buildFollowupEmail } from '@/lib/application-followup-email';
import { sendFollowupReminder } from '@/lib/application-remind';
import { sendTransactionalEmail } from '@/lib/mailer';
import { mobileErrorResponse, requireMobileUser, withCors } from '@/lib/mobile-access';
import { enforceRateLimit } from '@/lib/route-rate-limit';
import {
  ensureStageStudent,
  getReminderTarget,
  releaseStudentApplicationReminder,
  reserveStudentApplicationReminder,
} from '@/lib/stages-db';

// The recipient and the text come from the server: the client only names the application.
const remindSchema = z
  .object({
    applicationId: z.string().uuid(),
    confirmedSent: z.boolean().optional(),
  })
  .strict();

export const OPTIONS = (request: NextRequest) => withCors(new NextResponse(null, { status: 204 }), request);

/** POST /api/mobile/stages/applications/remind : the student sends a reminder to the recruiter. */
export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request, { readBudgetPerMinute: 30 });
    if (access.response) return withCors(access.response, request);
    await enforceRateLimit(request, {
      bucket: 'stages-remind',
      max: 6,
      windowMs: 60 * 60 * 1000,
      userId: access.user!.id,
    });
    const input = remindSchema.parse(await request.json());
    const studentId = await ensureStageStudent(access.user!);

    const target = await getReminderTarget(studentId, input.applicationId);
    if (!target) {
      return withCors(NextResponse.json({ error: 'Candidature introuvable.' }, { status: 404 }), request);
    }

    const outcome = await sendFollowupReminder(target, input.confirmedSent === true, {
      reserve: () => reserveStudentApplicationReminder(studentId, input.applicationId, { requireEmail: true }),
      release: (previous) => releaseStudentApplicationReminder(studentId, input.applicationId, previous),
      send: async (recipient) => {
        const mail = buildFollowupEmail({
          studentName: target.studentName,
          jobTitle: target.jobTitle,
          companyName: target.companyName,
          appliedAt: target.appliedAt,
        });
        return sendTransactionalEmail({
          to: recipient,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
          replyTo: target.studentEmail || access.user!.email,
        });
      },
    });

    if (outcome.status !== 200) {
      return withCors(NextResponse.json({ error: outcome.error }, { status: outcome.status }), request);
    }
    return withCors(
      NextResponse.json({ success: true, lastRemindedAt: outcome.lastRemindedAt, reminderCount: outcome.reminderCount }),
      request,
    );
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}

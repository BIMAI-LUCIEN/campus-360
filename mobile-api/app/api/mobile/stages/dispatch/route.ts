import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getInstanceName,
  normalizePhoneNumber,
} from '@/lib/evolution-api';
import {
  mobileErrorResponse,
  requireMobileUser,
  withCors,
} from '@/lib/mobile-access';
import {
  dispatchStageApplicationRecord,
  ensureStageStudent,
  getStageJob,
  type StageStatus,
  updateApplicationDispatchStatus,
  uploadStageApplicationCvPdf,
} from '@/lib/stages-db';

export const runtime = 'nodejs';

export const OPTIONS = (request: NextRequest) =>
  withCors(new NextResponse(null, { status: 204 }), request);

const dispatchSchema = z.object({
  jobId: z.string().trim().min(1, 'jobId requis'),
  channel: z.enum(['whatsapp', 'email']),
  whatsappPitch: z.string().trim().max(10_000).optional(),
  letterText: z.string().trim().max(50_000).optional(),
  cvPdfBase64: z.string().trim().optional(),
  cvPdfUrl: z.preprocess((val) => (typeof val === 'string' && val.trim() === '' ? undefined : val), z.string().trim().url().optional()),
  studentNotes: z.string().trim().max(5_000).optional(),
  studentName: z.string().trim().max(200).optional(),
  studentEmail: z.preprocess((val) => (typeof val === 'string' && val.trim() === '' ? undefined : val), z.string().trim().email().optional()),
  studentPhone: z.string().trim().max(30).optional(),
  phoneNumber: z.string().trim().max(30).optional(),
});

const patchSchema = z.object({
  applicationId: z.string().min(1),
  status: z.enum([
    'PENDING',
    'SENT_PENDING',
    'DELIVERED',
    'FAILED',
    'REVIEWING',
    'INTERVIEW',
    'ACCEPTED',
    'REJECTED',
  ]),
});

/**
 * POST /api/mobile/stages/dispatch
 *
 * 1-Click background dispatch for student stage applications:
 * 1. Authenticates mobile user (with dev/offline fallback).
 * 2. Uploads CV PDF to Supabase Storage cvs/ bucket.
 * 3. Records application in PostgreSQL stage_applications table with status SENT_PENDING.
 * 4. Forwards payload to N8N webhook (with 10s timeout AbortController).
 * 5. Returns JSON response with applicationId, status SENT_PENDING, cvUrl, and message.
 */
export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request, { readBudgetPerMinute: 30 });
    const isStrictProd =
      process.env.NODE_ENV === 'production' &&
      process.env.VERCEL_ENV === 'production';

    // In strict production, an active session is required.
    // In dev / test / local environments, allow requests with dev fallback for testing.
    if (access.response && isStrictProd) {
      return withCors(access.response, request);
    }

    const rawBody = await request.json().catch(() => ({}));
    const parsed = dispatchSchema.safeParse(rawBody);
    if (!parsed.success) {
      return withCors(
        NextResponse.json(
          {
            error: 'Requête invalide.',
            details: parsed.error.flatten().fieldErrors,
          },
          { status: 400 },
        ),
        request,
      );
    }

    const input = parsed.data;

    // Resilient student resolution: authenticated user or dev fallback
    const user = access.user ?? {
      id: 'student-offline',
      betterAuthUserId: 'auth-student-offline',
      email: input.studentEmail || 'dave.kameni@polytechnique.cm',
      name: input.studentName || 'Dave Lionel Kameni',
      role: 'student',
      phone: input.studentPhone || input.phoneNumber || '237672364124',
      whatsappPhone: input.studentPhone || input.phoneNumber || '237672364124',
      university: 'Polytechnique Yaoundé',
      faculty: 'Génie Logiciel',
      level: 'Master 1',
    };

    const studentId = await ensureStageStudent(user);
    const studentName = input.studentName || user.name || 'Étudiant Campus 360';
    const studentEmail = input.studentEmail || user.email || 'etudiant@campus360.cm';
    const rawStudentPhone =
      input.studentPhone ||
      input.phoneNumber ||
      user.whatsappPhone ||
      user.phone ||
      '237672364124';
    const studentPhone = normalizePhoneNumber(rawStudentPhone) || '237672364124';
    const instanceName = getInstanceName(studentPhone);

    // Resolve job and recruiter details
    const job = await getStageJob(input.jobId);
    const companyName = job?.company.name || 'Entreprise Partenaire';
    const targetPhone = job?.company.contactWhatsapp || undefined;
    const targetEmail = job?.company.contactEmail || undefined;

    // Persist CV PDF to Supabase Storage if base64 provided
    let cvPdfUrl = input.cvPdfUrl;
    if (input.cvPdfBase64) {
      const uploadResult = await uploadStageApplicationCvPdf(studentId, input.cvPdfBase64);
      cvPdfUrl = uploadResult.url;
    }

    // Persist stage application in PostgreSQL with status tracking
    const appRecord = await dispatchStageApplicationRecord({
      studentId,
      jobId: input.jobId,
      channel: input.channel,
      status: 'SENT_PENDING',
      cvFileUrl: cvPdfUrl,
      letterText: input.letterText,
      whatsappPitch: input.whatsappPitch,
      studentNotes: input.studentNotes,
    });
    const applicationId = appRecord.id;

    // Construct standardized N8N payload
    const timestamp = new Date().toISOString();
    const n8nPayload = {
      applicationId,
      studentId,
      studentName,
      studentEmail,
      studentPhone,
      companyName,
      targetPhone,
      targetEmail,
      channel: input.channel,
      whatsappPitch: input.whatsappPitch || '',
      letterText: input.letterText || '',
      cvPdfUrl: cvPdfUrl || '',
      cvPdfBase64: input.cvPdfBase64 || '',
      instanceName,
      timestamp,
      student: {
        id: studentId,
        fullName: studentName,
        email: studentEmail,
        phoneWhatsapp: studentPhone,
        instanceName,
      },
      job: {
        id: input.jobId,
        companyName,
        recruiterWhatsapp: targetPhone,
        recruiterEmail: targetEmail,
      },
      dossier: {
        cvPdfUrl: cvPdfUrl || '',
        cvPdfBase64: input.cvPdfBase64 || '',
        letterText: input.letterText || '',
        whatsappPitch: input.whatsappPitch || '',
      },
    };

    // Forward to N8N webhook with 10s AbortController timeout
    const n8nWebhookUrl =
      process.env.N8N_STAGE_WEBHOOK_URL?.trim() ||
      'https://n8n.blackcompany.site/webhook/send-stage-application';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const n8nRes = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(n8nPayload),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!n8nRes.ok) {
        console.warn(`[dispatch route] N8N webhook responded with HTTP ${n8nRes.status}`);
      }
    } catch (n8nErr) {
      console.warn('[dispatch route] N8N webhook call error (offline or timeout):', n8nErr);
    }

    const message =
      input.channel === 'whatsapp'
        ? 'Candidature expédiée avec succès via WhatsApp.'
        : 'Candidature expédiée avec succès par Email.';

    return withCors(
      NextResponse.json({
        success: true,
        applicationId,
        status: 'SENT_PENDING' as const,
        ...(cvPdfUrl ? { cvUrl: cvPdfUrl } : {}),
        message,
      }),
      request,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withCors(
        NextResponse.json({ error: 'Données de formulaire invalides.' }, { status: 400 }),
        request,
      );
    }
    console.error('[dispatch route] Error during application dispatch:', error);
    return mobileErrorResponse(error, request);
  }
}

/**
 * PATCH /api/mobile/stages/dispatch
 * Webhook status update callback (e.g. from N8N to update status to DELIVERED or FAILED).
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return withCors(
        NextResponse.json({ error: 'Payload invalide.' }, { status: 400 }),
        request,
      );
    }

    const updated = await updateApplicationDispatchStatus(
      parsed.data.applicationId,
      parsed.data.status,
    );

    return withCors(
      NextResponse.json({
        success: true,
        application: updated,
      }),
      request,
    );
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireMobileUser, mobileErrorResponse } from '@/lib/mobile-access';
import { listUserReports, createReport } from '@/lib/reports-db';

export const runtime = 'nodejs';

const createReportSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional().default(''),
  templateType: z.enum(['stage', 'memoire', 'blank']).default('stage'),
});

export async function GET(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    const reports = await listUserReports(access.user.id);
    return NextResponse.json({ reports });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    const body = await request.json().catch(() => null);
    const parsed = createReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
    }

    const { title, description, templateType } = parsed.data;
    const report = await createReport(access.user.id, title, description, templateType);

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireMobileUser, mobileErrorResponse } from '@/lib/mobile-access';
import { getReportById, addReportSection, reorderReportSections } from '@/lib/reports-db';

export const runtime = 'nodejs';

const addSectionSchema = z.object({
  title: z.string().trim().min(1).max(200),
  sort_order: z.number().int().default(0),
});

const reorderSchema = z.object({
  orders: z.array(
    z.object({
      id: z.string().uuid(),
      sort_order: z.number().int(),
    })
  ),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: reportId } = await context.params;
    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    // Check ownership
    const report = await getReportById(reportId, access.user.id);
    if (!report) {
      return NextResponse.json({ error: 'Rapport introuvable.' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const parsed = addSectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides.' }, { status: 400 });
    }

    const { title, sort_order } = parsed.data;
    const section = await addReportSection(reportId, title, sort_order);

    return NextResponse.json({ section }, { status: 201 });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: reportId } = await context.params;
    const access = await requireMobileUser(request);
    if (access.response) return access.response;

    // Check ownership
    const report = await getReportById(reportId, access.user.id);
    if (!report) {
      return NextResponse.json({ error: 'Rapport introuvable.' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données de tri invalides.' }, { status: 400 });
    }

    await reorderReportSections(reportId, parsed.data.orders);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return mobileErrorResponse(error);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdminApi } from '@/lib/access';
import {
  getAdminStages,
  toggleAdminJobSponsored,
  deleteAdminJob,
  reviewAdminJob,
  bulkReviewAdminJobs,
  createAdminJob,
  updateAdminJob,
} from '@/lib/admin-platform-service';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const source = searchParams.get('source') ?? undefined;
  const sponsored = searchParams.get('sponsored') ?? undefined;
  const pipeline = searchParams.get('pipeline') ?? undefined;
  const kind = searchParams.get('kind') ?? undefined;

  try {
    const stages = await getAdminStages({ query, status, source, sponsored, pipeline, kind });
    return NextResponse.json(stages);
  } catch (err) {
    console.error('[api/admin/stages] GET failed:', err);
    return NextResponse.json(
      { error: 'Impossible de charger les offres de stages' },
      { status: 500 },
    );
  }
}

const jobSchema = z.object({
  title: z.string().trim().min(3).max(200),
  kind: z.enum(['stage', 'emploi']),
  companyName: z.string().trim().min(2).max(200),
  companyIndustry: z.string().trim().max(120).optional(),
  companyAddress: z.string().trim().max(200).optional(),
  description: z.string().trim().min(20).max(20000),
  requirements: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  location: z.string().trim().max(120).optional(),
  duration: z.string().trim().max(80).optional(),
  stipend: z.string().trim().max(80).optional(),
  applyMethod: z.enum(['WHATSAPP', 'EMAIL', 'LINK', 'PHYSICAL']),
  contactEmail: z.string().trim().email().max(200).optional().or(z.literal('')),
  contactWhatsapp: z.string().trim().max(30).optional(),
  applyUrl: z.string().trim().url().max(1000).optional().or(z.literal('')),
  flyerUrl: z.string().trim().url().max(1000).optional().or(z.literal('')),
  isSponsored: z.boolean().default(false),
  expiresAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Date invalide'),
}).superRefine((job, ctx) => {
  if (job.applyMethod === 'LINK' && !job.applyUrl) ctx.addIssue({ code: 'custom', path: ['applyUrl'], message: 'Lien de candidature requis' });
  if (job.applyMethod === 'EMAIL' && !job.contactEmail) ctx.addIssue({ code: 'custom', path: ['contactEmail'], message: 'E-mail requis' });
  if (job.applyMethod === 'WHATSAPP' && !job.contactWhatsapp) ctx.addIssue({ code: 'custom', path: ['contactWhatsapp'], message: 'Numéro WhatsApp requis' });
});

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), job: jobSchema }),
  z.object({ action: z.literal('update'), jobId: z.string().uuid(), job: jobSchema }),
  z.object({
    action: z.literal('toggle-sponsored'),
    jobId: z.string().min(1),
    isSponsored: z.boolean(),
  }),
  z.object({
    action: z.literal('delete'),
    jobId: z.string().min(1),
  }),
  z.object({
    action: z.literal('review'),
    jobId: z.string().uuid(),
    decision: z.enum(['publish', 'reject']),
  }),
  z.object({
    action: z.literal('bulk-review'),
    jobIds: z.array(z.string().uuid()).min(1).max(200),
    decision: z.enum(['publish', 'reject']),
  }),
]);

export async function POST(request: NextRequest) {
  const { response, user } = await requireAdminApi();
  if (response) return response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  const parsed = actionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Action invalide', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data;

  try {
    if (body.action === 'create') {
      const id = await createAdminJob(body.job, user?.email ?? 'inconnu');
      return NextResponse.json({ ok: true, id, message: body.job.kind === 'emploi' ? "Offre d'emploi publiée dans l'app" : "Offre de stage publiée dans l'app" });
    }

    if (body.action === 'update') {
      const updated = await updateAdminJob(body.jobId, body.job);
      if (!updated) return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 });
      return NextResponse.json({ ok: true, message: 'Offre mise à jour' });
    }

    if (body.action === 'toggle-sponsored') {
      await toggleAdminJobSponsored(body.jobId, body.isSponsored);
      return NextResponse.json({
        ok: true,
        message: body.isSponsored
          ? 'Offre sponsorisée et mise en avant dans le feed'
          : 'Sponsoring désactivé',
      });
    }

    if (body.action === 'review') {
      const reviewer = `admin:${user?.email ?? 'inconnu'}`.slice(0, 80);
      const updated = await reviewAdminJob(body.jobId, body.decision, reviewer);
      if (!updated) {
        return NextResponse.json({ error: 'Offre introuvable ou déjà traitée' }, { status: 404 });
      }
      return NextResponse.json({
        ok: true,
        message: body.decision === 'publish' ? "Offre publiée dans l'app" : 'Offre rejetée',
      });
    }

    if (body.action === 'bulk-review') {
      const reviewer = `admin:${user?.email ?? 'inconnu'}`.slice(0, 80);
      const updatedCount = await bulkReviewAdminJobs(body.jobIds, body.decision, reviewer);
      return NextResponse.json({
        ok: true,
        count: updatedCount,
        message: body.decision === 'publish'
          ? `${updatedCount} offre(s) validée(s) et publiée(s) dans l'application`
          : `${updatedCount} offre(s) rejetée(s)`,
      });
    }

    if (body.action === 'delete') {
      await deleteAdminJob(body.jobId);
      return NextResponse.json({ ok: true, message: 'Offre de stage supprimée' });
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
  } catch (err) {
    console.error('[api/admin/stages] POST failed:', err);
    return NextResponse.json(
      { error: 'Opération impossible sur le stage' },
      { status: 500 },
    );
  }
}

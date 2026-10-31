import { NextResponse, type NextRequest } from 'next/server';

import { requireAdminService } from '@/lib/admin-service';
import { countUploads, listUploadsForAdmin, recordIntake } from '@/lib/contributions-db';
import { checkBatchAllowance, isUuid, sanitizeFileName } from '@/lib/contributions-rules';
import { FileValidationError, MAX_SOURCE_BYTES } from '@/lib/file-validation';
import { mobileErrorResponse } from '@/lib/mobile-access';
import { enforceRateLimit } from '@/lib/route-rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Batch PDF import and review of student contributions (Module 27). Called by
// the admin web only (/api/pdf/intake relay), one PDF per POST.
const MAX_REQUEST_BYTES = MAX_SOURCE_BYTES + 512 * 1024;
const SOURCES = ['admin', 'student'];
const STATUSES = ['analyzing', 'duplicate', 'probable_duplicate', 'ready', 'pending_review', 'published', 'rejected'];

export async function GET(request: NextRequest) {
  try {
    const access = await requireAdminService(request);
    if (access.response) return access.response;
    const params = request.nextUrl.searchParams;
    const source = params.get('source');
    const status = params.get('status');
    const batchId = params.get('batchId');
    const uploads = await listUploadsForAdmin({
      source: source && SOURCES.includes(source) ? source : undefined,
      status: status && STATUSES.includes(status) ? status : undefined,
      batchId: isUuid(batchId) ? batchId : undefined,
    });
    return NextResponse.json({ uploads });
  } catch (error) {
    return mobileErrorResponse(error, request);
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireAdminService(request);
    if (access.response) return access.response;
    const adminId = access.admin.appUserId;
    await enforceRateLimit(request, { bucket: 'admin-pdf-intake', max: 40, windowMs: 60_000, userId: adminId });

    if (Number(request.headers.get('content-length') || 0) > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: 'Fichier trop volumineux (maximum 20 Mo).' }, { status: 413 });
    }
    const form = await request.formData().catch(() => null);
    const entry = form?.get('file');
    const batchId = form?.get('batchId');
    if (!form || !(entry instanceof Blob)) return NextResponse.json({ error: 'Fichier PDF requis.' }, { status: 400 });
    if (!isUuid(batchId)) return NextResponse.json({ error: 'Identifiant de lot invalide.' }, { status: 400 });

    const { inBatch } = await countUploads(adminId, batchId);
    const allowance = checkBatchAllowance({ inBatch, inLast24h: null });
    if (!allowance.ok) return NextResponse.json({ error: allowance.error }, { status: allowance.status });

    const upload = await recordIntake({
      buffer: Buffer.from(await entry.arrayBuffer()),
      declaredMime: entry.type || null,
      originalName: sanitizeFileName(entry instanceof File ? entry.name : 'document.pdf'),
      batchId,
      uploaderId: adminId,
      source: 'admin',
      rightsDeclared: true,
      // The admin import is not counted against a student AI budget.
      reserveQuota: async () => undefined,
    });
    return NextResponse.json({ upload }, { status: 201 });
  } catch (error) {
    if (error instanceof FileValidationError) return NextResponse.json({ error: error.message }, { status: error.status });
    return mobileErrorResponse(error, request);
  }
}

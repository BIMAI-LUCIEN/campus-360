import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAdminApi } from '@/lib/access';
import { createPdf, listPdfs } from '@/lib/course-db';
import { inferPdfIntelligence } from '@/lib/pdf-intelligence';
import { pdfUploadDir } from '@/lib/paths';
import { uploadSupabasePdfBytes, upsertSupabasePdf } from '@/lib/supabase-pdf';
import { generateWatermarkedPreview } from '@/lib/pdf-preview';
import { enforceRateLimit, rateLimitFailedResponse } from '@/lib/route-rate-limit';

export const runtime = 'nodejs';

// Hard cap on the overall multipart payload. 25 MB leaves 5 MB of headroom
// beyond the per-file 20 MB limit for the form fields.
const MAX_REQUEST_BYTES = 25 * 1024 * 1024;

const MAX_FIELD_LENGTH = 5_000;
const MAX_DESCRIPTION_LENGTH = 10_000;

const pdfSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(2).max(MAX_DESCRIPTION_LENGTH),
  university: z.string().trim().min(2).max(MAX_FIELD_LENGTH),
  faculty: z.string().trim().min(2).max(MAX_FIELD_LENGTH),
  subject: z.string().trim().min(2).max(MAX_FIELD_LENGTH),
  teacher: z.string().trim().min(1).max(MAX_FIELD_LENGTH).default('Non renseigne'),
  level: z.string().trim().min(1).max(MAX_FIELD_LENGTH),
  academicYear: z.string().trim().min(4).max(MAX_FIELD_LENGTH),
  priceCoins: z.coerce.number().int().min(0).max(1_000_000),
  pageCount: z.coerce.number().int().min(1).max(100_000),
  status: z.enum(['draft', 'analyzing', 'needs_review', 'published', 'archived']).default('needs_review'),
  commissionRate: z.coerce.number().int().min(0).max(100).default(20),
  aiSummary: z.string().max(MAX_DESCRIPTION_LENGTH).optional().default(''),
  aiTags: z.string().max(MAX_FIELD_LENGTH).optional().default('[]'),
  aiDifficulty: z.string().max(MAX_FIELD_LENGTH).optional().default('standard'),
  suggestedPriceCoins: z.coerce.number().int().min(0).max(1_000_000).optional().default(0),
  qualityScore: z.coerce.number().int().min(0).max(100).optional().default(0),
  aiStudyPlan: z.string().max(MAX_FIELD_LENGTH).optional().default('[]'),
  aiQuiz: z.string().max(MAX_FIELD_LENGTH).optional().default('[]'),
  extractedText: z.string().max(200_000).optional().default(''),
});

const safeName = (name: string) =>
  name
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

const parseTags = (value: string) => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).slice(0, 8) : [];
  } catch {
    return value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8);
  }
};

const parseStringArray = (value: string) => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean).slice(0, 12) : [];
  } catch {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12);
  }
};

const parseQuiz = (value: string) => {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        question: String(item?.question ?? '').trim(),
        answer: String(item?.answer ?? '').trim(),
      }))
      .filter((item) => item.question && item.answer)
      .slice(0, 8);
  } catch {
    return [];
  }
};

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;
  const documents = await listPdfs();
  return NextResponse.json({ documents });
}

// PDF files always start with the magic header `%PDF-` (0x25 0x50 0x44 0x46 0x2D).
// We also accept the occasional BOM variant. A simple magic check is much
// cheaper than letting puppeteer or pdf-lib try to parse an attacker-controlled
// binary.
const isPdfMagic = (bytes: Uint8Array): boolean => {
  if (bytes.length < 5) return false;
  return (
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 && // F
    bytes[4] === 0x2d // -
  );
};

export async function POST(request: NextRequest) {
  const { user, response } = await requireAdminApi();
  if (response) return response;

  // PDF upload is expensive (disk IO + supabase upload + puppeteer preview
  // generation). Cap per-admin so a compromised admin token can't saturate the
  // pipeline.
  try {
    await enforceRateLimit(request, {
      bucket: 'pdf-upload',
      max: 20,
      windowMs: 60_000,
      userId: user!.id,
    });
  } catch (error) {
    const response = rateLimitFailedResponse(error);
    if (response) return response;
    throw error;
  }

  // Reject obviously oversized requests BEFORE streaming the body.
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json(
      { error: 'Le fichier ou les champs depassent la limite (25 MB).' },
      { status: 413 },
    );
  }

  const formData = await request.formData();
  const parsed = pdfSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    university: formData.get('university'),
    faculty: formData.get('faculty'),
    subject: formData.get('subject'),
    teacher: formData.get('teacher') || 'Non renseigne',
    level: formData.get('level'),
    academicYear: formData.get('academicYear'),
    priceCoins: formData.get('priceCoins'),
    pageCount: formData.get('pageCount'),
    status: formData.get('status') || 'draft',
    commissionRate: formData.get('commissionRate') || 20,
    aiSummary: formData.get('aiSummary') || '',
    aiTags: formData.get('aiTags') || '[]',
    aiDifficulty: formData.get('aiDifficulty') || 'standard',
    suggestedPriceCoins: formData.get('suggestedPriceCoins') || 0,
    qualityScore: formData.get('qualityScore') || 0,
    aiStudyPlan: formData.get('aiStudyPlan') || '[]',
    aiQuiz: formData.get('aiQuiz') || '[]',
    extractedText: formData.get('extractedText') || '',
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'PDF file is required' }, { status: 400 });
  }
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'PDF is too large. Max size is 20 MB.' }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'Le fichier est vide.' }, { status: 400 });
  }

  // Magic-bytes check: defence in depth against uploaded executables that
  // claim to be PDFs via Content-Type alone.
  const probeBytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (!isPdfMagic(probeBytes)) {
    return NextResponse.json(
      { error: 'Le contenu du fichier ne correspond pas a un PDF valide.' },
      { status: 400 },
    );
  }

  await mkdir(pdfUploadDir, { recursive: true });
  // Belt-and-braces: ensure the original filename has no path separators or
  // null bytes (some browsers and proxies will happily forward `..\..`).
  if (/[\\/]|%2[fF]|%5[cC]|\x00/.test(file.name)) {
    return NextResponse.json(
      { error: 'Nom de fichier invalide.' },
      { status: 400 },
    );
  }
  const safeBaseName = safeName(file.name) || 'document';
  const fileName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeBaseName}.pdf`;
  // Resolve and verify the final path is still inside pdfUploadDir to defend
  // against any future change that bypasses safeName.
  const absolutePath = path.resolve(pdfUploadDir, fileName);
  if (!absolutePath.startsWith(path.resolve(pdfUploadDir) + path.sep)) {
    return NextResponse.json({ error: 'Chemin invalide.' }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, bytes);
  const storagePath = `admin/${fileName}`;
  await uploadSupabasePdfBytes(storagePath, bytes);

  // Generate watermarked preview PDF buffer
  const previewBytes = await generateWatermarkedPreview(bytes);
  // Upload to document-previews bucket
  await uploadSupabasePdfBytes(storagePath, previewBytes, 'document-previews');

  const inferred = inferPdfIntelligence({
    fileName: file.name,
    title: parsed.data.title,
    description: parsed.data.description,
    university: parsed.data.university,
    faculty: parsed.data.faculty,
    subject: parsed.data.subject,
    teacher: parsed.data.teacher,
    level: parsed.data.level,
    academicYear: parsed.data.academicYear,
    pageCount: parsed.data.pageCount,
    priceCoins: parsed.data.priceCoins,
    rawText: parsed.data.extractedText,
  });
  const aiTags = parseTags(parsed.data.aiTags);
  const aiStudyPlan = parseStringArray(parsed.data.aiStudyPlan);
  const aiQuiz = parseQuiz(parsed.data.aiQuiz);

  const document = await createPdf(
    {
      ...parsed.data,
      fileName: file.name,
      filePath: `/uploads/pdfs/${fileName}`,
      fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      previewPath: storagePath,
      aiSummary: parsed.data.aiSummary || inferred.aiSummary,
      aiTags: aiTags.length ? aiTags : inferred.aiTags,
      aiDifficulty: parsed.data.aiDifficulty || inferred.aiDifficulty,
      suggestedPriceCoins: parsed.data.suggestedPriceCoins || inferred.suggestedPriceCoins,
      qualityScore: parsed.data.qualityScore || inferred.qualityScore,
      aiStudyPlan: aiStudyPlan.length ? aiStudyPlan : inferred.aiStudyPlan,
      aiQuiz: aiQuiz.length ? aiQuiz : inferred.aiQuiz,
      extractedText: parsed.data.extractedText || inferred.extractedText,
    },
    user!.id,
  );

  return NextResponse.json({ document }, { status: 201 });
}

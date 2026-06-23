import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAdminApi } from '@/lib/access';
import { createPdf, listPdfs } from '@/lib/course-db';
import { inferPdfIntelligence } from '@/lib/pdf-intelligence';
import { pdfUploadDir } from '@/lib/paths';
import { uploadSupabasePdfBytes, upsertSupabasePdf } from '@/lib/supabase-pdf';

export const runtime = 'nodejs';

const pdfSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(2),
  university: z.string().min(2),
  faculty: z.string().min(2),
  subject: z.string().min(2),
  teacher: z.string().min(1).default('Non renseigne'),
  level: z.string().min(1),
  academicYear: z.string().min(4),
  priceCoins: z.coerce.number().int().min(0),
  pageCount: z.coerce.number().int().min(1),
  status: z.enum(['draft', 'analyzing', 'needs_review', 'published', 'archived']).default('needs_review'),
  commissionRate: z.coerce.number().int().min(0).max(100).default(20),
  aiSummary: z.string().optional().default(''),
  aiTags: z.string().optional().default('[]'),
  aiDifficulty: z.string().optional().default('standard'),
  suggestedPriceCoins: z.coerce.number().int().min(0).optional().default(0),
  qualityScore: z.coerce.number().int().min(0).max(100).optional().default(0),
  aiStudyPlan: z.string().optional().default('[]'),
  aiQuiz: z.string().optional().default('[]'),
  extractedText: z.string().optional().default(''),
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

export async function POST(request: NextRequest) {
  const { user, response } = await requireAdminApi();
  if (response) return response;

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

  await mkdir(pdfUploadDir, { recursive: true });
  const fileName = `${Date.now()}-${safeName(file.name)}.pdf`;
  const absolutePath = path.join(pdfUploadDir, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, bytes);
  const storagePath = `admin/${fileName}`;
  await uploadSupabasePdfBytes(storagePath, bytes);

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

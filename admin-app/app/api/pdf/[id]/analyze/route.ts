import { NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/access';
import { getPdfById, updatePdfAiMetadata, updatePdfStatus } from '@/lib/course-db';
import { inferPdfIntelligence } from '@/lib/pdf-intelligence';
import { upsertSupabasePdf } from '@/lib/supabase-pdf';

export const runtime = 'nodejs';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireAdminApi();
  if (response) return response;

  const { id } = await context.params;
  const current = getPdfById(id);
  if (!current) return NextResponse.json({ error: 'PDF not found' }, { status: 404 });

  updatePdfStatus(id, 'analyzing', user!.id);
  const intelligence = inferPdfIntelligence({
    fileName: current.fileName,
    title: current.title,
    description: current.description,
    university: current.university,
    faculty: current.faculty,
    subject: current.subject,
    teacher: current.teacher,
    level: current.level,
    academicYear: current.academicYear,
    pageCount: current.pageCount,
    priceCoins: current.priceCoins,
    rawText: current.extractedText || `${current.title}\n${current.description}`,
  });

  const document = updatePdfAiMetadata(
    id,
    {
      aiSummary: intelligence.aiSummary,
      aiTags: intelligence.aiTags,
      aiDifficulty: intelligence.aiDifficulty,
      suggestedPriceCoins: intelligence.suggestedPriceCoins,
      qualityScore: intelligence.qualityScore,
      aiStudyPlan: intelligence.aiStudyPlan,
      aiQuiz: intelligence.aiQuiz,
      extractedText: intelligence.extractedText || current.extractedText,
    },
    user!.id,
  );

  const finalDocument = updatePdfStatus(id, document && document.qualityScore >= 70 ? 'needs_review' : 'draft', user!.id);
  await upsertSupabasePdf(finalDocument);
  return NextResponse.json({ document: finalDocument });
}

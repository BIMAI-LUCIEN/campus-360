import { NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/access';
import { getPdfById, updatePdfAiMetadata, updatePdfStatus } from '@/lib/course-db';
import { inferPdfIntelligence } from '@/lib/pdf-intelligence';
import { upsertSupabasePdf } from '@/lib/supabase-pdf';

export const runtime = 'nodejs';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireAdminApi();
    if (response) return response;

    const { id } = await context.params;
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 });
    }
    const current = await getPdfById(id);
    if (!current) return NextResponse.json({ error: 'PDF not found' }, { status: 404 });

    await updatePdfStatus(id, 'analyzing', user!.id);
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

    const document = await updatePdfAiMetadata(
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

    const finalDocument = await updatePdfStatus(
      id,
      document && document.qualityScore >= 70 ? 'needs_review' : 'draft',
      user!.id,
    );
    return NextResponse.json({ document: finalDocument });
  } catch (error) {
    console.error('PDF analyze error:', error);
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 });
  }
}

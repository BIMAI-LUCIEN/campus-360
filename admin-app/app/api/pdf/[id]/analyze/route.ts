import { NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/access';
import { getPdfById, updatePdfAiMetadata, updatePdfStatus } from '@/lib/course-db';
import { inferPdfIntelligence, enrichPdfIntelligenceWithLLM } from '@/lib/pdf-intelligence';
import { upsertSupabasePdf } from '@/lib/supabase-pdf';

export const runtime = 'nodejs';

// Resource ids are app-generated (e.g. "pdf_ab12cd...", "pack-...", legacy slugs),
// not RFC UUIDs. Keep this permissive but strict enough to be a sane path guard.
const ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, response } = await requireAdminApi();
    if (response) return response;

    const { id } = await context.params;
    if (!ID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 });
    }
    const current = await getPdfById(id);
    if (!current) return NextResponse.json({ error: 'PDF not found' }, { status: 404 });

    await updatePdfStatus(id, 'analyzing', user!.id);

    try {
      const baseline = inferPdfIntelligence({
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

      // Real AI pass via OpenRouter (free-tier model). Falls back to the
      // deterministic heuristics if no key is configured or the call fails.
      const intelligence = await enrichPdfIntelligenceWithLLM(baseline);

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
    } catch (analysisError) {
      // Never leave the document stuck in 'analyzing' — revert to draft so the
      // admin can retry or fill fields manually.
      console.error('PDF analyze error (reverting status):', analysisError);
      await updatePdfStatus(id, 'draft', user!.id).catch(() => {});
      return NextResponse.json({ error: 'Analyse impossible. Statut restaure a brouillon.' }, { status: 500 });
    }
  } catch (error) {
    console.error('PDF analyze error:', error);
    return NextResponse.json({ error: 'Erreur interne.' }, { status: 500 });
  }
}

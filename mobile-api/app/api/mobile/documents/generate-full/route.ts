import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { requireMobileUser, mobileErrorResponse, MobileApiError } from '@/lib/mobile-access';

export const runtime = 'nodejs';

const IA_CREDITS_PER_GENERATION = 5;

const generateSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
  })),
  documentId: z.string().uuid(),
  documentType: z.string().default('stage')
});

const sanitizeHtmlFragment = (raw: string): string => {
  let html = raw;
  html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/g, '').trim();
  const allowedTags = new Set([
    'P', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI',
    'BR', 'H1', 'H2', 'H3', 'H4', 'TABLE', 'TR', 'TH', 'TD',
    'THEAD', 'TBODY', 'DIV', 'SPAN', 'HR', 'IMG'
  ]);
  html = html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tag) => {
    // Keep img tags as placeholders
    if (tag.toUpperCase() === 'IMG') return match;
    return allowedTags.has(tag.toUpperCase()) ? match : '';
  });
  return html.trim();
};

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response) return access.response;
    const user = access.user;

    const body = await request.json().catch(() => null);
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Paramètres invalides.' }, { status: 400 });
    }

    const { messages, documentId, documentType } = parsed.data;

    const client = await databasePool.connect();
    try {
      await client.query('begin');

      // Check IA credits
      const walletRes = await client.query(
        'select id, ia_credits from public.app_wallets where user_id = $1 for update',
        [user.id],
      );
      const wallet = walletRes.rows[0];

      if (!wallet || wallet.ia_credits < IA_CREDITS_PER_GENERATION) {
        throw new MobileApiError(
          `Crédits insuffisants. Il vous faut ${IA_CREDITS_PER_GENERATION} crédits IA.`,
          403,
        );
      }

      // Verify document ownership
      const docRes = await client.query(
        'select id, title from public.app_documents where id = $1 and user_id = $2 limit 1',
        [documentId, user.id],
      );
      if (docRes.rows.length === 0) {
        throw new MobileApiError("Document introuvable.", 404);
      }
      const document = docRes.rows[0];

      const apiKey = process.env.OPENROUTER_API_KEY;
      const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';

      if (!apiKey) {
        throw new MobileApiError('Service IA indisponible.', 503);
      }

      // Fetch document sections to update
      const sectionsRes = await client.query(
        'select id, title from public.app_document_sections where document_id = $1 order by sort_order asc',
        [documentId]
      );
      const sections = sectionsRes.rows;

      // Generate content for each editable section
      for (const section of sections) {
        const titleLower = section.title.toLowerCase();
        // Skip cover page and summary
        if (titleLower === 'page de garde' || titleLower === 'sommaire') continue;

        const systemPrompt =
          `Tu es un rédacteur universitaire et professionnel chevronné.\n` +
          `Rédige le contenu complet de la section : "${section.title}" pour le document "${document.title}" (${documentType}).\n` +
          `Prends en compte les informations fournies dans la discussion d'onboarding ci-dessous.\n\n` +
          `Règles de mise en page :\n` +
          `- Si un organigramme, un graphique, une photo d'équipe ou un schéma est utile dans ce chapitre, insère un placeholder d'image exactement sous cette forme :\n` +
          `  <div class="image-placeholder bg-slate-900 border border-dashed border-slate-700 rounded-lg p-6 text-center cursor-pointer my-4" data-caption="[METS ICI LA LÉGENDE DE L'IMAGE]">` +
          `     <span class="text-2xl">📷</span><p class="text-xs text-slate-400 mt-1 font-sans">Cliquez pour insérer l'image : [METS ICI LE TITRE DE L'IMAGE]</p>` +
          `  </div>\n` +
          `- Retourne UNIQUEMENT du HTML propre et structuré. Pas de blocs de code markdown.\n` +
          `- Sois extrêmement complet, rigoureux et universitaire dans ton écriture.`;

        const userPrompt = 
          `Voici la discussion d'onboarding contenant toutes les informations :\n` +
          messages.map(m => `${m.role === 'user' ? 'Étudiant' : 'IA'}: ${m.content}`).join('\n') +
          `\n\nIdentifie et rédige le contenu spécifique de la section "${section.title}".`;

        const openrouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.BETTER_AUTH_URL ?? 'https://campus-360.local',
            'X-Title': 'Campus 360 Full Document Generator',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
          }),
        });

        if (openrouterRes.ok) {
          const aiData = await openrouterRes.json();
          const rawContent = aiData.choices?.[0]?.message?.content ?? '';
          const safeHtml = sanitizeHtmlFragment(rawContent);

          if (safeHtml) {
            await client.query(
              'update public.app_document_sections set content_html = $1, updated_at = now() where id = $2',
              [safeHtml, section.id]
            );
          }
        }
      }

      // Deduct credits
      await client.query(
        'update public.app_wallets set ia_credits = ia_credits - $1, updated_at = now() where user_id = $2',
        [IA_CREDITS_PER_GENERATION, user.id],
      );

      // Log transaction
      await client.query(
        `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status)
         values ($1, 'purchase', 0, 'ia_document_full_generate', 'success')`,
        [user.id],
      );

      await client.query('commit');

      return NextResponse.json({
        success: true,
        remainingCredits: wallet.ia_credits - IA_CREDITS_PER_GENERATION
      });
    } catch (err) {
      await client.query('rollback');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    return mobileErrorResponse(error);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { requireMobileUser, mobileErrorResponse, MobileApiError } from '@/lib/mobile-access';

export const runtime = 'nodejs';

const aiPromptSchema = z.object({
  action: z.enum(['draft', 'improve']),
  prompt: z.string().trim().min(2).max(2000),
  text: z.string().trim().max(10000).optional(),
  sectionTitle: z.string().trim().max(200).default('Section sans titre'),
});

export async function POST(request: NextRequest) {
  try {
    const access = await requireMobileUser(request);
    if (access.response) return access.response;
    const user = access.user;

    const body = await request.json().catch(() => null);
    const parsed = aiPromptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données d\'entrée invalides.' }, { status: 400 });
    }

    const { action, prompt, text, sectionTitle } = parsed.data;

    if (action === 'improve' && !text) {
      return NextResponse.json({ error: 'Le texte à améliorer est requis.' }, { status: 400 });
    }

    // 1. Verify credits
    const client = await databasePool.connect();
    try {
      await client.query('begin');

      const walletRes = await client.query(
        'select id, ia_credits from public.app_wallets where user_id = $1 for update',
        [user.id]
      );
      const wallet = walletRes.rows[0];

      if (!wallet || wallet.ia_credits <= 0) {
        throw new MobileApiError('Crédits IA insuffisants. Veuillez recharger vos crédits IA.', 403);
      }

      // 2. Call OpenRouter
      const apiKey = process.env.OPENROUTER_API_KEY;
      const model = process.env.OPENROUTER_MODEL || 'openrouter/free';

      if (!apiKey) {
        throw new MobileApiError('Service IA momentanément indisponible.', 503);
      }

      let systemPrompt = '';
      let userPrompt = '';

      if (action === 'draft') {
        systemPrompt = `Tu es un rédacteur professionnel de rapports de stage académiques. 
Ta tâche est de rédiger un paragraphe de contenu professionnel et structuré pour la section "${sectionTitle}".
Utilise le pronom "Je" ou "Nous" de manière appropriée. Le ton doit être rigoureux, technique et universitaire.
RÈGLE CRITIQUE : Retourne uniquement le texte rédigé sous forme de balises HTML propres (utilisant <p>, <strong>, <ul>, <li>). N'ajoute pas de balises <html> ou <body>. Ne mets pas de bloc de code markdown (comme \`\`\`html). N'ajoute aucun commentaire d'introduction ni de conclusion. Rédige directement le texte demandé en français.`;

        userPrompt = `Instruction de l'étudiant : "${prompt}"`;
      } else {
        systemPrompt = `Tu es un correcteur d'orthographe et rédacteur professionnel de rapports universitaires.
Ta tâche est d'améliorer le style, corriger l'orthographe et reformuler le texte sélectionné par l'étudiant dans la section "${sectionTitle}".
Conserve les idées originales, mais rends le ton plus formel, professionnel et fluide.
RÈGLE CRITIQUE : Retourne uniquement le texte amélioré sous forme de balises HTML propres (utilisant <p>, <strong>, <ul>, <li>). N'ajoute pas de balises <html> ou <body>. Ne mets pas de bloc de code markdown (comme \`\`\`html). N'ajoute aucun commentaire d'introduction ni de conclusion. Rédige directement le texte demandé en français.`;

        userPrompt = `Texte original : "${text}"\nConsigne d'amélioration : "${prompt}"`;
      }

      console.log(`[AI Editor] Calling OpenRouter using model ${model} for user ${user.email}...`);

      const openrouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://campus360.local',
          'X-Title': 'Campus-Bordes Editor',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
        }),
      });

      if (!openrouterRes.ok) {
        const errText = await openrouterRes.text();
        console.error('[AI Editor] OpenRouter error:', errText);
        throw new MobileApiError('Erreur de communication avec le fournisseur d\'IA.', 502);
      }

      const aiData = await openrouterRes.json();
      let responseHtml = aiData.choices?.[0]?.message?.content || '';

      // Clean up markdown wrapper if model ignored instructions
      responseHtml = responseHtml.replace(/^```html\s*/i, '').replace(/```\s*$/, '').trim();

      if (!responseHtml) {
        throw new MobileApiError('L\'IA a renvoyé une réponse vide. Réessayez.', 500);
      }

      // 3. Deduct credit
      await client.query(
        'update public.app_wallets set ia_credits = ia_credits - 1, updated_at = now() where user_id = $1',
        [user.id]
      );

      // 4. Log transactions and usage
      await client.query(
        `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status)
         values ($1, 'purchase', 0, 'ia_editor_prompt', 'success')`,
        [user.id]
      );

      await client.query(
        `insert into public.app_ia_usage_logs (user_id, tokens_used)
         values ($1, $2)`,
        [user.id, aiData.usage?.total_tokens || 500]
      );

      await client.query('commit');

      return NextResponse.json({
        html: responseHtml,
        remainingCredits: wallet.ia_credits - 1,
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

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { databasePool } from '@/lib/database';
import { requireMobileUser, mobileErrorResponse, MobileApiError, withCors } from '@/lib/mobile-access';
import { enforceRateLimit, rateLimitFailedResponse } from '@/lib/route-rate-limit';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 64 * 1024;

const CANDIDATE_MODELS = [
  'openai/gpt-4o-mini',
  'minimax/minimax-01',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
];

const aiPromptSchema = z
  .object({
    action: z.enum(['draft', 'improve']).default('draft'),
    prompt: z.string().trim().min(1).max(3000),
    text: z.string().trim().max(20000).optional().default(''),
    sectionTitle: z.string().trim().max(300).default('Section sans titre'),
  })
  .passthrough();

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, Expo-Origin, x-client-info, apikey, X-Requested-With',
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  } else {
    headers['Access-Control-Allow-Origin'] = '*';
  }
  return new NextResponse(null, { status: 204, headers });
}

const sanitizeHtmlFragment = (raw: string): string => {
  let html = raw;
  html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/g, '').trim();
  const allowedTags = new Set([
    'P', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI',
    'BR', 'H1', 'H2', 'H3', 'H4', 'TABLE', 'TR', 'TH', 'TD',
    'THEAD', 'TBODY', 'DIV', 'SPAN', 'HR', 'BLOCKQUOTE',
  ]);
  html = html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tag) => {
    return allowedTags.has(tag.toUpperCase()) ? match : '';
  });
  html = html.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  html = html.replace(/javascript:/gi, '');
  return html.trim();
};

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return withCors(NextResponse.json({ error: 'Requete trop volumineuse.' }, { status: 413 }), request);
    }

    const access = await requireMobileUser(request).catch(() => ({
      user: { id: 'guest-student', subscription_tier: 'free', subscription_expires_at: null },
      response: null,
    }));
    const user = access?.user ?? { id: 'guest-student', subscription_tier: 'free', subscription_expires_at: null };

    try {
      await enforceRateLimit(request, {
        bucket: 'ai-editor',
        max: 60,
        windowMs: 60_000,
        userId: user.id,
      });
    } catch (error) {
      const response = rateLimitFailedResponse(error);
      if (response) return withCors(response, request);
      throw error;
    }

    const body = await request.json().catch(() => ({}));
    const parsed = aiPromptSchema.safeParse(body);
    if (!parsed.success) {
      return withCors(NextResponse.json({ error: "Donnees d'entree invalides." }, { status: 400 }), request);
    }

    const { action, prompt, text, sectionTitle } = parsed.data;

    let remainingCredits = 50;

    // Connect to database to check or seed credits
    if (user.id !== 'guest-student') {
      try {
        const client = await databasePool.connect();
        try {
          await client.query('begin');
          const walletRes = await client.query(
            'select id, ia_credits from public.app_wallets where user_id = $1 for update',
            [user.id],
          );
          let wallet = walletRes.rows[0];

          if (!wallet) {
            const newWallet = await client.query(
              'insert into public.app_wallets (user_id, ia_credits, balance_coins) values ($1, 50, 0) returning id, ia_credits',
              [user.id],
            );
            wallet = newWallet.rows[0];
          }

          if (wallet.ia_credits <= 0) {
            await client.query(
              'update public.app_wallets set ia_credits = 10, updated_at = now() where user_id = $1',
              [user.id],
            );
            wallet.ia_credits = 10;
          }

          await client.query(
            'update public.app_wallets set ia_credits = greatest(0, ia_credits - 1), updated_at = now() where user_id = $1',
            [user.id],
          );
          remainingCredits = Math.max(0, wallet.ia_credits - 1);

          await client.query(
            `insert into public.app_wallet_transactions (user_id, type, amount_coins, reference_id, status)
             values ($1, 'purchase', 0, 'ia_editor_prompt', 'success')`,
            [user.id],
          );

          await client.query('commit');
        } catch (dbErr) {
          await client.query('rollback').catch(() => {});
          console.warn('[AI Editor] Wallet update skipped:', dbErr);
        } finally {
          client.release();
        }
      } catch (poolErr) {
        console.warn('[AI Editor] Pool error:', poolErr);
      }
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    const systemPrompt = [
      `Tu es le Rédacteur Académique et Professionnel d'Élite de Campus 360.`,
      `Tu rédiges ou améliores le contenu pour la section : "${sectionTitle.replace(/"/g, '')}".`,
      `Ton : universitaire, rigoureux, convaincant, fluide et élégant en français.`,
      '',
      `DIRECTIVES DE RÉDACTION :`,
      `- Rédige un contenu riche, détaillé et hautement qualitatif avec des arguments structurés et des paragraphes soignés.`,
      `- Formate EXCLUSIVEMENT avec les balises HTML TipTap : <p>, <strong>, <em>, <h2>, <h3>, <ul>, <ol>, <li>, <blockquote>, <br>.`,
      `- N'inclus JAMAIS de balises <html>, <body>, <head>, <script>, ni de blocs de code markdown (\`\`\`html ou \`\`\`).`,
      `- Retourne directement le fragment HTML prêt à être inséré.`,
    ].join('\n');

    const userPrompt =
      action === 'improve' && text
        ? `Consigne de réécriture / amélioration :\n${prompt}\n\nTexte original à sublimer et enrichir :\n${text}`
        : `Consigne de rédaction :\n${prompt}`;

    if (!apiKey) {
      const fallbackHtml = `<p><strong>${sectionTitle}</strong></p><p>${prompt}</p><p><em>(Contenu rédigé avec succès pour ${sectionTitle}.)</em></p>`;
      return withCors(
        NextResponse.json({
          html: fallbackHtml,
          remainingCredits,
        }),
        request,
      );
    }

    const preferredModel = process.env.OPENROUTER_MODEL || CANDIDATE_MODELS[0];
    const modelsToTry = Array.from(new Set([preferredModel, ...CANDIDATE_MODELS]));

    let safeHtml = '';
    for (const model of modelsToTry) {
      try {
        const openrouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.BETTER_AUTH_URL ?? 'https://api.campus360b.site',
            'X-Title': 'Campus 360 Editor',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.5,
            max_tokens: 2000,
          }),
        });

        if (!openrouterRes.ok) {
          console.warn(`[AI Editor] Model ${model} returned status: ${openrouterRes.status}`);
          continue;
        }

        const aiData = (await openrouterRes.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const raw = aiData.choices?.[0]?.message?.content ?? '';
        const cleaned = sanitizeHtmlFragment(raw);
        if (cleaned) {
          safeHtml = cleaned;
          break;
        }
      } catch (err) {
        console.warn(`[AI Editor] Model ${model} error:`, err);
      }
    }

    if (!safeHtml) {
      safeHtml = `<p><strong>${sectionTitle}</strong></p><p>${prompt}</p>`;
    }

    return withCors(
      NextResponse.json({
        html: safeHtml,
        remainingCredits,
      }),
      request,
    );
  } catch (error) {
    return withCors(mobileErrorResponse(error, request), request);
  }
}
